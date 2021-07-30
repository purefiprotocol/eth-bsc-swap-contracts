pragma solidity >=0.6.4;

import "./IBotProtactableToken.sol";

interface IProxyInitialize is IBotProtactableToken{
    function initialize(string calldata name, string calldata symbol, uint8 decimals, uint256 amount, bool mintable, address owner) external;
}