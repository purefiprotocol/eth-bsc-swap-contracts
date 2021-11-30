// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0;

import "openzeppelin-solidity/contracts/GSN/Context.sol";
import "openzeppelin-solidity/contracts/access/Ownable.sol";
import "../interfaces/IBotProtector2.sol";

contract PureFiBotProtection2 is Context, Ownable, IBotProtector2{

    address public tokenProtected;//erc20 token protected by this contract

    // --==[ PROTECTION ]==--
    mapping(address => bool) private botWhitelist;
    mapping(address => bool) private botBlacklist;
    bool private botProtectionIsActive = false;
    bool private sandwichProtectionIsActive = false;
    bool private ganacheDebugMode = false;

    mapping(address => bool) private isPairAddress;

    mapping(address => PairDataStruct) pairData;

    BPTransfer[] private movementTransfers;

    struct PairDataStruct{
        mapping(address => uint256) inFlow;
        mapping(address => uint256) outFlow;
    }

    struct BPTransfer{
        address from;
        address to;
        uint256 amount;
        address sender;
    }

    event SB(address sandwich, uint256 amount);
    event TraceBotProtection(address from, address to, uint256 amount, address sender);

    modifier onlyProtectedToken() {
        require(tokenProtected == _msgSender(), "PureFiBotProtection: only protected token can call this function");
        _;
    }

    constructor(address _operator, address _tokenProtected) public {
        transferOwnership(_operator);
        tokenProtected = _tokenProtected;
        isPairAddress[0xDD0630c5dD1afBe60820AbF066d59441c16b92B9] = true; //UFI/WBNB on Pancake V2
    }

    function setPairAddress(address _address, bool _flag) external onlyOwner{
        isPairAddress[_address] = _flag;
    }

    function setBotProtectionIsActive(bool _flag) external onlyOwner{
        botProtectionIsActive = _flag;
    }

    function setSandwichProtectionIsActive(bool _flag) external onlyOwner{
        sandwichProtectionIsActive = _flag;
    }

    function setGanacheDebugMode(bool _flag) external onlyOwner{
        ganacheDebugMode = _flag;
    }

    function setTokenProtected(address _tokenContract) external onlyOwner{
        require(tokenProtected != _tokenContract, "PureFiBotProtection: tokenProtected is the same");
        tokenProtected = _tokenContract;
    }


    function whitelistAddress(address account, bool isWhitelisted) external onlyOwner {
        botWhitelist[account] = isWhitelisted;
    }

    function whitelistAddresses(address[] calldata accounts) external onlyOwner {
        for(uint256 i = 0; i < accounts.length; i++) {
            if(botWhitelist[accounts[i]] == false) {
                botWhitelist[accounts[i]] = true;
            }
        }
    }

    function blacklistAddress(address account, bool isBlacklisted) external onlyOwner {
        botBlacklist[account] = isBlacklisted;
    }

    function blacklistAddresses(address[] calldata accounts) external onlyOwner {
        for(uint256 i = 0; i < accounts.length; i++) {
            if(botBlacklist[accounts[i]] == false) {
                botBlacklist[accounts[i]] = true;
            }
        }
    }

    function getTransferDataLength() public view returns (uint256){
        return movementTransfers.length;
    }

    function getTransferData(uint256 i) public view returns (address, address, uint256, address){
        // return (address(0), address(0), movementTransfers.length, address(0));
        return (movementTransfers[i].from, movementTransfers[i].to, movementTransfers[i].amount, movementTransfers[i].sender);
    }



    function isPotentialBotTransfer(address _from, address _to, uint256 _amount, address _msgsender) external override onlyProtectedToken returns (bool){
        
        if (!botProtectionIsActive) return false;
        emit TraceBotProtection(_from, _to, _amount, _msgsender);
        if (botWhitelist[_from] || botWhitelist[_to]) return false; 
        if (botBlacklist[_from] || botBlacklist[_to]) return true;  
        //here sandwich bot protection goes
        if(isPairAddress[_from] || isPairAddress[_to] || isPairAddress[_msgsender] || isSwapRouter(_msgsender) ){
            if(isPairAddress[_from]){//inflow
                pairData[_from].inFlow[_to] = block.number;
            }
            else if(isPairAddress[_to]){//outflow
                if( pairData[_to].inFlow[_from] == block.number || //Inflow transaction detected in the same block
                    ganacheDebugMode && pairData[_to].inFlow[_from] >= block.number-2){//Inflow transaction detected in the same block - TEST ganache
                    emit SB(_from, _amount);
                    if(sandwichProtectionIsActive) {
                        return true;//ban outflow transaction
                    }
                } 
            }
        }
        if(ganacheDebugMode)
            movementTransfers.push(BPTransfer(_from, _to, _amount, _msgsender));
        return false; //allow by default
    }

    function isSwapRouter(address _address) private pure returns(bool){
        return _address == 0x10ED43C718714eb63d5aA57B78B54704E256024E;//Pancake router V2

    }
}