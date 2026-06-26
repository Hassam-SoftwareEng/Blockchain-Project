// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title TrustChain — Blockchain Tenancy Registry
/// @author RoomEase TrustChain
/// @notice Stores, issues, and verifies tenancy agreements on Ethereum
/// @dev Deploy on Ganache (Chain ID 1337) or Sepolia testnet

contract TrustChain {

    // ═══════════════════════════════════════════
    //  STRUCTS
    // ═══════════════════════════════════════════

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

    // ═══════════════════════════════════════════
    //  STATE VARIABLES
    // ═══════════════════════════════════════════

    address public owner;

    mapping(string  => Agreement)     private agreements;
    mapping(address => LandlordInfo)  private landlords;

    string[]  private agreementIds;
    address[] private landlordList;

    uint256 public totalAgreements;
    uint256 public totalLandlords;

    // ═══════════════════════════════════════════
    //  EVENTS
    // ═══════════════════════════════════════════

    event LandlordRegistered(
        address indexed landlord,
        string  name,
        uint256 timestamp
    );

    event LandlordRemoved(
        address indexed landlord,
        uint256 timestamp
    );

    event AgreementIssued(
        string  indexed agreementId,
        string  tenantName,
        string  propertyId,
        address indexed issuedBy,
        uint256 timestamp
    );

    event AgreementRevoked(
        string  indexed agreementId,
        address revokedBy,
        uint256 timestamp
    );

    event AgreementDeleted(
        string  indexed agreementId,
        address deletedBy,
        uint256 timestamp
    );

    // ═══════════════════════════════════════════
    //  MODIFIERS
    // ═══════════════════════════════════════════

    modifier onlyOwner() {
        require(msg.sender == owner, "TrustChain: caller is not the owner");
        _;
    }

    modifier onlyAuthorized() {
        require(
            msg.sender == owner || landlords[msg.sender].isRegistered,
            "TrustChain: caller is not authorized (must be owner or registered landlord)"
        );
        _;
    }

    modifier agreementExists(string calldata _agreementId) {
        require(
            agreements[_agreementId].exists,
            "TrustChain: agreement does not exist"
        );
        _;
    }

    // ═══════════════════════════════════════════
    //  CONSTRUCTOR
    // ═══════════════════════════════════════════

    constructor() {
        owner = msg.sender;
    }

    // ═══════════════════════════════════════════
    //  LANDLORD MANAGEMENT  (Owner only)
    // ═══════════════════════════════════════════

    /// @notice Register a new landlord wallet
    /// @param _landlord  Ethereum address of the landlord
    /// @param _name      Full legal name
    /// @param _company   Company or agency name (can be empty)
    /// @param _location  City / region (can be empty)
    function registerLandlord(
        address _landlord,
        string calldata _name,
        string calldata _company,
        string calldata _location
    ) external onlyOwner {
        require(_landlord != address(0),        "TrustChain: zero address");
        require(bytes(_name).length > 0,        "TrustChain: name required");
        require(!landlords[_landlord].isRegistered, "TrustChain: already registered");

        landlords[_landlord] = LandlordInfo({
            name:         _name,
            company:      _company,
            location:     _location,
            isRegistered: true,
            registeredAt: block.timestamp
        });

        landlordList.push(_landlord);
        totalLandlords++;

        emit LandlordRegistered(_landlord, _name, block.timestamp);
    }

    /// @notice Remove a registered landlord
    /// @param _landlord  Address to deregister
    function removeLandlord(address _landlord) external onlyOwner {
        require(landlords[_landlord].isRegistered, "TrustChain: not registered");

        landlords[_landlord].isRegistered = false;

        // Remove from landlordList array
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

    // ═══════════════════════════════════════════
    //  AGREEMENT MANAGEMENT  (Owner OR Landlord)
    // ═══════════════════════════════════════════

    /// @notice Issue a new tenancy agreement on-chain
    /// @param _agreementId  Unique ID (e.g. AGR-001) — must not already exist
    /// @param _tenantName   Full name of tenant
    /// @param _tenantCNIC   Pakistani CNIC number
    /// @param _propertyId   Property reference code
    /// @param _monthlyRent  Monthly rent in PKR (whole number)
    /// @param _leaseStart   Unix timestamp of lease start date
    /// @param _leaseEnd     Unix timestamp of lease end date
    function issueAgreement(
        string  calldata _agreementId,
        string  calldata _tenantName,
        string  calldata _tenantCNIC,
        string  calldata _propertyId,
        uint256          _monthlyRent,
        uint256          _leaseStart,
        uint256          _leaseEnd
    ) external onlyAuthorized {
        require(bytes(_agreementId).length > 0, "TrustChain: agreementId required");
        require(!agreements[_agreementId].exists, "TrustChain: agreementId already used");
        require(bytes(_tenantName).length > 0,  "TrustChain: tenantName required");
        require(bytes(_tenantCNIC).length > 0,  "TrustChain: tenantCNIC required");
        require(bytes(_propertyId).length > 0,  "TrustChain: propertyId required");
        require(_monthlyRent > 0,               "TrustChain: rent must be > 0");
        require(_leaseEnd > _leaseStart,        "TrustChain: leaseEnd must be after leaseStart");

        agreements[_agreementId] = Agreement({
            agreementId: _agreementId,
            tenantName:  _tenantName,
            tenantCNIC:  _tenantCNIC,
            propertyId:  _propertyId,
            monthlyRent: _monthlyRent,
            leaseStart:  _leaseStart,
            leaseEnd:    _leaseEnd,
            issuedBy:    msg.sender,
            issuedAt:    block.timestamp,
            isValid:     true,
            exists:      true
        });

        agreementIds.push(_agreementId);
        totalAgreements++;

        emit AgreementIssued(
            _agreementId,
            _tenantName,
            _propertyId,
            msg.sender,
            block.timestamp
        );
    }

    /// @notice Mark an agreement as revoked (record kept, status set to invalid)
    /// @param _agreementId  The agreement to revoke
    function revokeAgreement(string calldata _agreementId)
        external
        onlyAuthorized
        agreementExists(_agreementId)
    {
        require(agreements[_agreementId].isValid, "TrustChain: already revoked");

        agreements[_agreementId].isValid = false;
        emit AgreementRevoked(_agreementId, msg.sender, block.timestamp);
    }

    /// @notice Permanently delete an agreement (owner only)
    /// @param _agreementId  The agreement to delete
    function deleteAgreement(string calldata _agreementId)
        external
        onlyOwner
        agreementExists(_agreementId)
    {
        delete agreements[_agreementId];

        // Remove from agreementIds array
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

    // ═══════════════════════════════════════════
    //  READ FUNCTIONS  (Public / Anyone)
    // ═══════════════════════════════════════════

    /// @notice Verify and retrieve full details of any agreement
    /// @param _agreementId  Agreement to look up
    /// @return Agreement struct with all fields
    function verifyAgreement(string calldata _agreementId)
        external
        view
        returns (Agreement memory)
    {
        require(agreements[_agreementId].exists, "TrustChain: not found");
        return agreements[_agreementId];
    }

    /// @notice Get all agreement IDs stored on-chain
    /// @return Array of all agreement ID strings
    function getAllAgreementIds() external view returns (string[] memory) {
        return agreementIds;
    }

    /// @notice Get all registered landlord addresses
    /// @return Array of landlord Ethereum addresses
    function getAllLandlords() external view returns (address[] memory) {
        return landlordList;
    }

    /// @notice Get info about a specific landlord
    /// @param _landlord  Wallet address to query
    /// @return LandlordInfo struct
    function getLandlordInfo(address _landlord)
        external
        view
        returns (LandlordInfo memory)
    {
        return landlords[_landlord];
    }

    /// @notice Check if an address is a registered landlord
    /// @param _addr  Address to check
    /// @return true if registered
    function isRegisteredLandlord(address _addr) external view returns (bool) {
        return landlords[_addr].isRegistered;
    }

    /// @notice Transfer contract ownership to a new address
    /// @param _newOwner  New owner's Ethereum address
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "TrustChain: zero address");
        owner = _newOwner;
    }
}
