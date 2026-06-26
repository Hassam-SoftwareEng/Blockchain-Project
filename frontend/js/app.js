// ═══════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════
let CONTRACT_ADDRESS = '';
const EXPECTED_CHAIN_ID = 1337;
const GANACHE_RPC = 'http://127.0.0.1:7545';

const ABI = [
  "function verifyAgreement(string calldata _agreementId) view returns (tuple(string agreementId,string tenantName,string tenantCNIC,string propertyId,uint256 monthlyRent,uint256 leaseStart,uint256 leaseEnd,address issuedBy,uint256 issuedAt,bool isValid,bool exists))",
  "function getAllAgreementIds() view returns (string[])",
  "function getAllLandlords() view returns (address[])",
  "function getLandlordInfo(address _landlord) view returns (tuple(string name,string company,string location,bool isRegistered,uint256 registeredAt))",
  "function isRegisteredLandlord(address _addr) view returns (bool)",
  "function totalAgreements() view returns (uint256)",
  "function totalLandlords() view returns (uint256)",
  "function owner() view returns (address)",
  "function registerLandlord(address _landlord, string calldata _name, string calldata _company, string calldata _location)",
  "function removeLandlord(address _landlord)",
  "function issueAgreement(string calldata _agreementId, string calldata _tenantName, string calldata _tenantCNIC, string calldata _propertyId, uint256 _monthlyRent, uint256 _leaseStart, uint256 _leaseEnd)",
  "function revokeAgreement(string calldata _agreementId)",
  "function deleteAgreement(string calldata _agreementId)",
  "function transferOwnership(address _newOwner)",
  "event LandlordRegistered(address indexed landlord, string name, uint256 timestamp)",
  "event LandlordRemoved(address indexed landlord, uint256 timestamp)",
  "event AgreementIssued(string indexed agreementId, string tenantName, string propertyId, address indexed issuedBy, uint256 timestamp)",
  "event AgreementRevoked(string indexed agreementId, address revokedBy, uint256 timestamp)",
  "event AgreementDeleted(string indexed agreementId, address deletedBy, uint256 timestamp)",
];

// ── State ──
let provider = null, signer = null, contract = null;
let userAddr = null, userRole = 'viewer';
let filterStatus = 'all', sessionTxns = [], cachedAgreements = [];

// ── Helpers ──
const shortAddr = a => a.slice(0,6)+'…'+a.slice(-4);
const tsToDate  = ts => ts === 0n ? '—' : new Date(Number(ts)*1000).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});

let toastTimer;
function toast(type, msg){
  const t = document.getElementById('toast');
  t.className = type;
  t.innerHTML = type==='ld'
    ? `<div class="spin"></div><span>${msg}</span>`
    : msg;
  clearTimeout(toastTimer);
  if(type !== 'ld') toastTimer = setTimeout(()=>{ t.className='hide'; }, 5500);
}

function pushTx(hash, description){
  const t = new Date().toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'});
  sessionTxns.unshift({hash, description, t});
  renderTx();
}

function renderTx(){
  const el = document.getElementById('txLog');
  const cnt = document.getElementById('txCount');
  cnt.textContent = sessionTxns.length + ' TX' + (sessionTxns.length!==1?'s':'');
  if(!sessionTxns.length){
    el.innerHTML='<div class="empty"><div class="empty-icon">⛓</div><p>No transactions yet this session</p></div>';
    return;
  }
  el.innerHTML = sessionTxns.slice(0,10).map(tx=>`
    <div class="txrow">
      <div class="txd"></div>
      <div style="flex:1">
        <div class="txh"><a href="https://etherscan.io/tx/${tx.hash}" target="_blank" rel="noopener">${tx.hash.slice(0,18)}…${tx.hash.slice(-6)}</a></div>
        <div class="txdc">${tx.description}</div>
      </div>
      <div class="txt">${tx.t}</div>
    </div>`).join('');
}

// ── Nav ──
function go(id, btn){
  document.querySelectorAll('.pg').forEach(x=>x.classList.remove('on'));
  document.querySelectorAll('.nl').forEach(x=>x.classList.remove('on'));
  document.getElementById('pg-'+id).classList.add('on');
  if(btn) btn.classList.add('on');
  if(id==='all')      loadAllAgreements();
  if(id==='admin'){   loadLandlords(); refreshStats(); }
}

// ── Wallet ──
async function connectWallet(){
  if(!window.ethereum){
    toast('er','❌ MetaMask not found — install from <a href="https://metamask.io" target="_blank">metamask.io</a>');
    return;
  }
  try {
    toast('ld','Connecting to MetaMask…');
    await window.ethereum.request({ method:'eth_requestAccounts' });
    provider = new ethers.BrowserProvider(window.ethereum);
    signer   = await provider.getSigner();
    userAddr = await signer.getAddress();

    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    document.getElementById('netBanner').style.display = (chainId !== EXPECTED_CHAIN_ID) ? 'block' : 'none';

    document.getElementById('wDot').classList.add('on');
    document.getElementById('wAddr').textContent = shortAddr(userAddr);

    if(CONTRACT_ADDRESS) initContract();
    await detectRole();

    const netLabel = chainId===1337        ? '🟢 Live on Ganache Local'
                   : chainId===11155111    ? '🟢 Live on Sepolia Testnet'
                   : `🟡 Chain ID: ${chainId}`;
    document.getElementById('chainDot').style.background = 'var(--green2)';
    document.getElementById('chainLbl').textContent = netLabel;
    document.getElementById('chainLbl').style.color = 'var(--green2)';

    toast('ok',`✅ Connected: ${shortAddr(userAddr)}`);

    window.ethereum.on('accountsChanged', ()=>location.reload());
    window.ethereum.on('chainChanged',    ()=>location.reload());
  } catch(e){
    console.error(e);
    toast('er','❌ '+(e?.message||'Connection failed or rejected'));
  }
}

function setContractAddress(){
  const v = document.getElementById('cfgAddr').value.trim();
  if(!v || !v.startsWith('0x')){
    toast('er','❌ Invalid address — must start with 0x'); return;
  }
  CONTRACT_ADDRESS = v;
  if(provider && signer) initContract();
  document.getElementById('cfgBanner').style.display = 'none';
  toast('ok','✅ Contract address set — loading data…');
  loadLandlords(); refreshStats();
  detectRole();
}

function initContract(){
  if(!CONTRACT_ADDRESS || !signer) return;
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
}

async function detectRole(){
  const roleEl = document.getElementById('wRole');
  if(!contract){ roleEl.textContent='🦊'; roleEl.className='wr viewer'; return; }
  try {
    const ownerAddr = await contract.owner();
    if(userAddr.toLowerCase() === ownerAddr.toLowerCase()){
      userRole = 'owner';
      roleEl.className='wr admin'; roleEl.textContent='ADMIN';
    } else {
      const isLL = await contract.isRegisteredLandlord(userAddr);
      if(isLL){
        userRole = 'landlord';
        roleEl.className='wr landlord'; roleEl.textContent='LANDLORD';
      } else {
        userRole = 'viewer';
        roleEl.className='wr viewer'; roleEl.textContent='VIEWER';
      }
    }
  } catch(e){ console.error('Role detect:', e); }
}

// ── Stats ──
async function refreshStats(){
  if(!contract) return;
  try {
    const [total, landlordCount] = await Promise.all([
      contract.totalAgreements(),
      contract.totalLandlords()
    ]);
    document.getElementById('s1').textContent = landlordCount.toString();
    document.getElementById('s2').textContent = total.toString();

    // Get valid/revoked counts from agreements
    if(Number(total) > 0){
      const ids = await contract.getAllAgreementIds();
      const ags = await Promise.all(ids.map(id => contract.verifyAgreement(id)));
      const valid   = ags.filter(a => a.isValid).length;
      const revoked = ags.length - valid;
      document.getElementById('s3').textContent = valid;
      document.getElementById('s4').textContent = revoked;
      if(revoked > 0){
        document.getElementById('s4trend').textContent = revoked + ' need attention';
        document.getElementById('s4trend').style.color = 'var(--red)';
      }
    } else {
      document.getElementById('s3').textContent = '0';
      document.getElementById('s4').textContent = '0';
    }
  } catch(e){ console.error('Stats:', e); }
}

// ── Landlords ──
async function loadLandlords(){
  if(!contract){
    document.getElementById('llList').innerHTML='<div class="empty"><div class="empty-icon">🏠</div><p>Set contract address first</p></div>';
    return;
  }
  document.getElementById('llList').innerHTML=`<div style="color:var(--gray);padding:12px 0;display:flex;align-items:center;gap:8px"><div class="spin"></div>Loading from blockchain…</div>`;
  try {
    const addrs     = await contract.getAllLandlords();
    const ownerAddr = await contract.owner();
    const infos     = await Promise.all(addrs.map(a => contract.getLandlordInfo(a)));

    let html = renderLLRow(ownerAddr, {name:'Admin (Contract Owner)',company:'RoomEase System',location:'—',isRegistered:true,registeredAt:0n}, true);
    addrs.forEach((addr,i) => { html += renderLLRow(addr, infos[i], false); });

    document.getElementById('llList').innerHTML = html ||
      '<div class="empty"><div class="empty-icon">🏠</div><p>No landlords registered yet</p></div>';
  } catch(e){
    console.error(e);
    document.getElementById('llList').innerHTML='<div style="color:var(--red);padding:12px 0;font-size:12.5px">❌ Error loading — check contract address and network</div>';
  }
}

function renderLLRow(addr, info, isOwner){
  const date = info.registeredAt===0n ? 'System Admin'
    : new Date(Number(info.registeredAt)*1000).toLocaleString('en-PK',{dateStyle:'medium',timeStyle:'short'});
  return `
    <div style="display:flex;align-items:center;gap:12px;padding:11px 13px;background:var(--sur);border:1px solid var(--bdr2);border-radius:8px;margin-bottom:7px;transition:border-color .2s" onmouseover="this.style.borderColor='#30363D'" onmouseout="this.style.borderColor='#21262D'">
      <span style="font-size:18px">${isOwner?'👑':'🟢'}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600">${info.name}</div>
        <div style="font-family:var(--mono);font-size:10.5px;color:var(--gray);margin-top:1px">${addr}${info.company ? ' · '+info.company : ''}${info.location && info.location!=='—' ? ' · '+info.location : ''}</div>
      </div>
      <div style="font-size:10.5px;color:var(--gray2);flex-shrink:0">${date}</div>
      <span class="bdg ${isOwner?'bb2':'bv'}">${isOwner?'ADMIN':'REGISTERED'}</span>
      ${!isOwner ? `<button class="btn br bsm" onclick="removeLL('${addr}')" style="padding:5px 10px;font-size:11px;flex-shrink:0">✕ Remove</button>` : ''}
    </div>`;
}

async function doRegLL(){
  const addr = document.getElementById('llA').value.trim();
  const name = document.getElementById('llN').value.trim();
  const co   = document.getElementById('llC').value.trim() || '';
  const loc  = document.getElementById('llL').value.trim() || '';
  if(!addr || !name){ toast('er','❌ Wallet address and name are required'); return; }
  if(!addr.startsWith('0x')){ toast('er','❌ Invalid Ethereum address — must start with 0x'); return; }
  if(!contract){ toast('er','❌ Connect wallet and set contract address first'); return; }

  const btn = document.getElementById('regLLBtn');
  btn.innerHTML='<div class="spin"></div> Registering…'; btn.disabled=true;
  try {
    toast('ld','Sending transaction — confirm in MetaMask…');
    const tx = await contract.registerLandlord(addr, name, co, loc);
    toast('ld',`⛏ Mining block… TX: ${shortAddr(tx.hash)}`);
    await tx.wait();
    pushTx(tx.hash, `LandlordRegistered — ${name} (${shortAddr(addr)})`);
    ['llA','llN','llC','llL'].forEach(id=>document.getElementById(id).value='');
    await loadLandlords(); await refreshStats();
    toast('ok',`✅ ${name} registered on-chain! TX: ${shortAddr(tx.hash)}`);
  } catch(e){
    console.error(e);
    toast('er','❌ '+(e?.reason||e?.message||'Transaction failed'));
  } finally {
    btn.innerHTML='Register Landlord on Blockchain'; btn.disabled=false;
  }
}

async function removeLL(addr){
  if(!confirm(`Remove landlord ${addr} from blockchain?\nThis cannot be undone.`)) return;
  if(!contract){ toast('er','❌ Connect wallet first'); return; }
  try {
    toast('ld','Sending transaction — confirm in MetaMask…');
    const tx = await contract.removeLandlord(addr);
    toast('ld','⛏ Mining…');
    await tx.wait();
    pushTx(tx.hash, `LandlordRemoved — ${shortAddr(addr)}`);
    await loadLandlords(); await refreshStats();
    toast('ok','✅ Landlord removed. TX: '+shortAddr(tx.hash));
  } catch(e){
    toast('er','❌ '+(e?.reason||e?.message||'Transaction failed'));
  }
}

// ── All Agreements ──
async function loadAllAgreements(){
  if(!contract){
    document.getElementById('agList').innerHTML='<div class="empty"><div class="empty-icon">🔗</div><p>Connect wallet & set contract address to load</p></div>';
    return;
  }
  document.getElementById('agList').innerHTML=`<div style="color:var(--gray);padding:20px;text-align:center;display:flex;align-items:center;justify-content:center;gap:10px"><div class="spin"></div>Fetching from blockchain…</div>`;
  try {
    const ids = await contract.getAllAgreementIds();
    if(!ids.length){
      cachedAgreements=[];
      document.getElementById('agCnt').textContent='0 Total';
      document.getElementById('agList').innerHTML='<div class="empty"><div class="empty-icon">📋</div><p>No agreements issued yet</p></div>';
      return;
    }
    const ags = await Promise.all(ids.map(id => contract.verifyAgreement(id)));
    cachedAgreements = ags.map(a=>({
      id:     a.agreementId,
      tenant: a.tenantName,
      cnic:   a.tenantCNIC,
      prop:   a.propertyId,
      rent:   Number(a.monthlyRent).toLocaleString('en-PK'),
      start:  tsToDate(a.leaseStart),
      end:    tsToDate(a.leaseEnd),
      ll:     a.issuedBy,
      llShort:shortAddr(a.issuedBy),
      status: a.isValid ? 'valid' : 'revoked',
      issued: tsToDate(a.issuedAt),
    }));
    document.getElementById('agCnt').textContent = cachedAgreements.length+' Total';
    document.getElementById('s3').textContent = cachedAgreements.filter(a=>a.status==='valid').length;
    document.getElementById('s4').textContent = cachedAgreements.filter(a=>a.status==='revoked').length;
    renderAg('');
  } catch(e){
    console.error(e);
    document.getElementById('agList').innerHTML='<div style="color:var(--red);padding:20px;text-align:center">❌ Error loading — check contract address & network</div>';
  }
}

function renderAg(q){
  let list = [...cachedAgreements];
  if(filterStatus==='valid')   list=list.filter(a=>a.status==='valid');
  if(filterStatus==='revoked') list=list.filter(a=>a.status==='revoked');
  if(q) list=list.filter(a=>
    a.tenant.toLowerCase().includes(q)||
    a.id.toLowerCase().includes(q)||
    a.prop.toLowerCase().includes(q)||
    a.cnic.toLowerCase().includes(q)
  );
  if(!list.length){
    document.getElementById('agList').innerHTML='<div class="empty"><div class="empty-icon">📋</div><p>No agreements match the current filter</p></div>';
    return;
  }
  document.getElementById('agList').innerHTML = list.map(a=>`
    <div class="cc">
      <div class="ct">
        <div>
          <div class="cn">${a.tenant}</div>
          <div class="ci">${a.id} · CNIC: ${a.cnic}</div>
        </div>
        <span class="bdg ${a.status==='valid'?'bv':'brv'}">${a.status==='valid'?'✓ VALID':'✗ REVOKED'}</span>
      </div>
      <div class="cm">
        <div><span>Property</span><strong>${a.prop}</strong></div>
        <div><span>Rent / mo</span><strong>PKR ${a.rent}</strong></div>
        <div><span>Issued By</span><strong style="font-family:var(--mono);font-size:11px" title="${a.ll}">${a.llShort}</strong></div>
        <div><span>Lease Start</span><strong>${a.start}</strong></div>
        <div><span>Lease End</span><strong>${a.end}</strong></div>
        <div><span>Issued At</span><strong>${a.issued}</strong></div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${a.status==='valid' ? `<button class="btn br bsm" onclick="revokeAg('${a.id}')">✕ Revoke</button>` : '<span class="bdg brv" style="font-size:10px;padding:4px 10px">Revoked</span>'}
        <button class="btn bsm bghost" onclick="deleteAg('${a.id}')">🗑 Delete</button>
        <button class="btn bsm bghost" onclick="quickVerify('${a.id}')">🔍 Verify</button>
      </div>
    </div>`).join('');
}

function filterAg(q){ renderAg(q.toLowerCase()); }
function fStatus(s,btn){
  filterStatus=s;
  document.querySelectorAll('.fp').forEach(x=>x.classList.remove('on'));
  btn.classList.add('on');
  const q = document.getElementById('agSearch');
  renderAg(q ? q.value.toLowerCase() : '');
}

function quickVerify(id){
  go('verify', document.querySelectorAll('.nl')[1]);
  document.getElementById('vId').value = id;
  setTimeout(doVerify, 100);
}

// ── Issue Agreement ──
async function doIssue(){
  const agId = document.getElementById('agId').value.trim();
  const t    = document.getElementById('agT').value.trim();
  const c    = document.getElementById('agC').value.trim();
  const p    = document.getElementById('agP').value.trim();
  const r    = document.getElementById('agR').value.trim();
  const s    = document.getElementById('agS').value;
  const e    = document.getElementById('agE').value;

  if(!agId||!t||!c||!p||!r||!s||!e){ toast('er','❌ All fields are required'); return; }
  if(!contract){ toast('er','❌ Connect wallet & set contract address first'); return; }

  const startTs = Math.floor(new Date(s).getTime()/1000);
  const endTs   = Math.floor(new Date(e).getTime()/1000);
  if(endTs <= startTs){ toast('er','❌ Lease end must be after lease start'); return; }

  const btn = document.getElementById('issBtn');
  btn.innerHTML='<div class="spin"></div> Issuing…'; btn.disabled=true;
  try {
    toast('ld','Sending transaction — confirm in MetaMask…');
    const tx = await contract.issueAgreement(agId, t, c, p, BigInt(r), BigInt(startTs), BigInt(endTs));
    toast('ld',`⛏ Mining block… TX: ${shortAddr(tx.hash)}`);
    await tx.wait();
    pushTx(tx.hash, `AgreementIssued — ${t} → ${p} (${agId})`);
    ['agId','agT','agC','agP','agR','agS','agE'].forEach(id=>document.getElementById(id).value='');
    await refreshStats();
    toast('ok',`✅ ${agId} issued on blockchain! TX: ${shortAddr(tx.hash)}`);
  } catch(e){
    console.error(e);
    toast('er','❌ '+(e?.reason||e?.message||'Transaction failed'));
  } finally {
    btn.innerHTML='Issue Agreement on Blockchain'; btn.disabled=false;
  }
}

// ── Revoke / Delete ──
async function revokeAg(id){
  if(!confirm(`Revoke Agreement "${id}"?\nThis marks it as invalid on-chain but keeps the record.`)) return;
  if(!contract){ toast('er','❌ Connect wallet first'); return; }
  try {
    toast('ld','Sending revoke transaction — confirm in MetaMask…');
    const tx = await contract.revokeAgreement(id);
    toast('ld','⛏ Mining…');
    await tx.wait();
    pushTx(tx.hash, `AgreementRevoked — ${id}`);
    await loadAllAgreements();
    toast('ok',`✅ ${id} revoked on-chain. TX: ${shortAddr(tx.hash)}`);
  } catch(e){
    toast('er','❌ '+(e?.reason||e?.message||'Transaction failed'));
  }
}

async function deleteAg(id){
  if(!confirm(`Permanently delete Agreement "${id}" from blockchain?\n\n⚠️ This action cannot be undone.`)) return;
  if(!contract){ toast('er','❌ Connect wallet first'); return; }
  try {
    toast('ld','Sending delete transaction — confirm in MetaMask…');
    const tx = await contract.deleteAgreement(id);
    toast('ld','⛏ Mining…');
    await tx.wait();
    pushTx(tx.hash, `AgreementDeleted — ${id}`);
    await loadAllAgreements(); await refreshStats();
    toast('ok',`✅ ${id} deleted. TX: ${shortAddr(tx.hash)}`);
  } catch(e){
    toast('er','❌ '+(e?.reason||e?.message||'Transaction failed'));
  }
}

// ── Verify ──
async function doVerify(){
  const id = document.getElementById('vId').value.trim();
  const el = document.getElementById('vRes');
  if(!id){ toast('er','❌ Enter an Agreement ID'); return; }

  if(!contract){
    if(!CONTRACT_ADDRESS){
      el.innerHTML='<div class="vr er">❌ Connect wallet or set contract address first via the Admin tab</div>';
      return;
    }
    try {
      const ro = new ethers.JsonRpcProvider(GANACHE_RPC);
      await verifyAndRender(new ethers.Contract(CONTRACT_ADDRESS, ABI, ro), id, el);
    } catch(e){
      el.innerHTML=`<div class="vr er">❌ Could not connect to Ganache at <code>${GANACHE_RPC}</code><br><span style="color:var(--gray);font-size:11px">Make sure Ganache is running and you are connected to the right network</span></div>`;
    }
    return;
  }
  await verifyAndRender(contract, id, el);
}

async function verifyAndRender(con, id, el){
  toast('ld','Querying blockchain…');
  try {
    const a = await con.verifyAgreement(id);
    document.getElementById('toast').className='hide';
    el.innerHTML=`
      <div class="vr ok">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <span style="font-size:13px;font-weight:700;color:var(--green2)">✓ Agreement Found On-Chain</span>
          <span class="bdg ${a.isValid?'bv':'brv'}">${a.isValid?'✓ VALID':'✗ REVOKED'}</span>
        </div>
        <div class="vrow"><span>Agreement ID</span><strong>${a.agreementId}</strong></div>
        <div class="vrow"><span>Tenant Name</span><strong style="font-family:var(--sans)">${a.tenantName}</strong></div>
        <div class="vrow"><span>CNIC</span><strong>${a.tenantCNIC}</strong></div>
        <div class="vrow"><span>Property ID</span><strong>${a.propertyId}</strong></div>
        <div class="vrow"><span>Monthly Rent</span><strong style="font-family:var(--sans)">PKR ${Number(a.monthlyRent).toLocaleString('en-PK')}</strong></div>
        <div class="vrow"><span>Lease Period</span><strong style="font-family:var(--sans)">${tsToDate(a.leaseStart)} → ${tsToDate(a.leaseEnd)}</strong></div>
        <div class="vrow"><span>Issued By (Wallet)</span><strong style="font-size:10px">${a.issuedBy}</strong></div>
        <div class="vrow"><span>Issued At</span><strong style="font-family:var(--sans)">${tsToDate(a.issuedAt)}</strong></div>
        <div class="vrow"><span>Status</span><strong class="${a.isValid?'tg':'tr'}">${a.isValid?'✓ Valid — Agreement is active':'✗ Revoked — Agreement has been invalidated'}</strong></div>
      </div>`;
  } catch(e){
    document.getElementById('toast').className='hide';
    el.innerHTML=`<div class="vr er">❌ Agreement "<strong>${id}</strong>" not found on-chain<br><span style="font-size:11.5px;color:var(--gray)">The ID may be incorrect, or the agreement was deleted from the contract</span></div>`;
  }
}

// ── Contract Source ──
const CONTRACT_SRC = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TrustChain — Blockchain Tenancy Registry
/// @notice Stores, issues, and verifies tenancy agreements on Ethereum

contract TrustChain {

    struct Agreement {
        string  agreementId;
        string  tenantName;
        string  tenantCNIC;
        string  propertyId;
        uint256 monthlyRent;
        uint256 leaseStart;
        uint256 leaseEnd;
        address issuedBy;
        uint256 issuedAt;
        bool    isValid;
        bool    exists;
    }

    struct LandlordInfo {
        string  name;
        string  company;
        string  location;
        bool    isRegistered;
        uint256 registeredAt;
    }

    address public owner;

    mapping(string  => Agreement)    private agreements;
    mapping(address => LandlordInfo) private landlords;

    string[]  private agreementIds;
    address[] private landlordList;

    uint256 public totalAgreements;
    uint256 public totalLandlords;

    event LandlordRegistered(address indexed landlord, string name, uint256 timestamp);
    event LandlordRemoved(address indexed landlord, uint256 timestamp);
    event AgreementIssued(string indexed agreementId, string tenantName, string propertyId, address indexed issuedBy, uint256 timestamp);
    event AgreementRevoked(string indexed agreementId, address revokedBy, uint256 timestamp);
    event AgreementDeleted(string indexed agreementId, address deletedBy, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "TrustChain: caller is not the owner");
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == owner || landlords[msg.sender].isRegistered,
            "TrustChain: not authorized"
        );
        _;
    }

    modifier agreementExists(string calldata _agreementId) {
        require(agreements[_agreementId].exists, "TrustChain: agreement does not exist");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function registerLandlord(address _landlord, string calldata _name,
        string calldata _company, string calldata _location) external onlyOwner {
        require(_landlord != address(0), "TrustChain: zero address");
        require(bytes(_name).length > 0, "TrustChain: name required");
        require(!landlords[_landlord].isRegistered, "TrustChain: already registered");
        landlords[_landlord] = LandlordInfo(_name, _company, _location, true, block.timestamp);
        landlordList.push(_landlord);
        totalLandlords++;
        emit LandlordRegistered(_landlord, _name, block.timestamp);
    }

    function removeLandlord(address _landlord) external onlyOwner {
        require(landlords[_landlord].isRegistered, "TrustChain: not registered");
        landlords[_landlord].isRegistered = false;
        for (uint256 i = 0; i < landlordList.length; i++) {
            if (landlordList[i] == _landlord) {
                landlordList[i] = landlordList[landlordList.length - 1];
                landlordList.pop();
                break;
            }
        }
        totalLandlords--;
        emit LandlordRemoved(_landlord, block.timestamp);
    }

    function issueAgreement(string calldata _agreementId, string calldata _tenantName,
        string calldata _tenantCNIC, string calldata _propertyId,
        uint256 _monthlyRent, uint256 _leaseStart, uint256 _leaseEnd)
        external onlyAuthorized {
        require(bytes(_agreementId).length > 0, "TrustChain: id required");
        require(!agreements[_agreementId].exists, "TrustChain: id already used");
        require(bytes(_tenantName).length > 0, "TrustChain: name required");
        require(_monthlyRent > 0, "TrustChain: rent must be > 0");
        require(_leaseEnd > _leaseStart, "TrustChain: invalid dates");
        agreements[_agreementId] = Agreement(_agreementId, _tenantName, _tenantCNIC,
            _propertyId, _monthlyRent, _leaseStart, _leaseEnd,
            msg.sender, block.timestamp, true, true);
        agreementIds.push(_agreementId);
        totalAgreements++;
        emit AgreementIssued(_agreementId, _tenantName, _propertyId, msg.sender, block.timestamp);
    }

    function revokeAgreement(string calldata _agreementId)
        external onlyAuthorized agreementExists(_agreementId) {
        require(agreements[_agreementId].isValid, "TrustChain: already revoked");
        agreements[_agreementId].isValid = false;
        emit AgreementRevoked(_agreementId, msg.sender, block.timestamp);
    }

    function deleteAgreement(string calldata _agreementId)
        external onlyOwner agreementExists(_agreementId) {
        delete agreements[_agreementId];
        for (uint256 i = 0; i < agreementIds.length; i++) {
            if (keccak256(bytes(agreementIds[i])) == keccak256(bytes(_agreementId))) {
                agreementIds[i] = agreementIds[agreementIds.length - 1];
                agreementIds.pop();
                break;
            }
        }
        totalAgreements--;
        emit AgreementDeleted(_agreementId, msg.sender, block.timestamp);
    }

    function verifyAgreement(string calldata _agreementId)
        external view returns (Agreement memory) {
        require(agreements[_agreementId].exists, "TrustChain: not found");
        return agreements[_agreementId];
    }

    function getAllAgreementIds() external view returns (string[] memory) { return agreementIds; }
    function getAllLandlords() external view returns (address[] memory) { return landlordList; }
    function getLandlordInfo(address _landlord) external view returns (LandlordInfo memory) { return landlords[_landlord]; }
    function isRegisteredLandlord(address _addr) external view returns (bool) { return landlords[_addr].isRegistered; }

    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "TrustChain: zero address");
        owner = _newOwner;
    }
}`;

function copyContract(){
  navigator.clipboard.writeText(CONTRACT_SRC).then(()=>{
    toast('ok','✅ Contract code copied to clipboard!');
  }).catch(()=>{
    toast('er','❌ Copy failed — please select and copy manually');
  });
}

// Populate the contract source textarea
window.addEventListener('DOMContentLoaded', ()=>{
  const ta = document.getElementById('contractSource');
  if(ta) ta.value = CONTRACT_SRC;
  renderTx();
});

// ── Auto-connect if already authorized ──
if(window.ethereum){
  window.ethereum.request({method:'eth_accounts'}).then(accounts=>{
    if(accounts.length) connectWallet();
  });
}
