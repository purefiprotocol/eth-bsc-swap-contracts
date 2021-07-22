// SPDX-License-Identifier: MIT

pragma solidity >=0.6.0;

interface IBotProtectedV1Token {
    /**
     * @dev Called immediately after the liquidity is added.
     */
    function prepareBotProtection(uint256 firewallBlockLength, uint256 firewallTimeLength) external;
}