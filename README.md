# PureFi ETH BSC Swap Contracts (forked)

## Ethereum Mainnet

1. ETHSwapAgentImpl: [0x0c7aC08bD7a2F747Af7F9f939954b3798c17C230](https://etherscan.io/address/0x0c7aC08bD7a2F747Af7F9f939954b3798c17C230)

## Binance Smart Chain

1. BSCSwapAgentImpl: [0xC4617166e3af9c90055eDF469a9F08215CF80b1D](https://bscscan.com/address/0xC4617166e3af9c90055eDF469a9F08215CF80b1D)

## Code changes

1. Added bot protection to BEP20 token
1. Introduced a separate Operator role for Swap contracts so that the Owner is only responsible for key admin settings.
1. Updated compiler version to 0.6.12
## Security Report

[here](SecurityAssessment.pdf)

## Overview
ETH BSC Swap Contracts are responsible for registering swap pairs and swapping assets between ETH and BSC.

![](./assets/eth-bsc-swap.png)

### Register swap pair

1. Users register swap pair for erc20 token on ETH via ETHSwapAgent(`createSwapPair`) if the token is not registered.
2. Swap service will monitor the `SwapPairRegister` event and create swap pair on BSC: 
    
    1. create a BEP20 token on BSC
    2. record the relation between erc20 token and bep20 token.

### Swap from ETH to BSC

Once the swap pair is registered, users can swap tokens from ETH to BSC.

1. Users call `swapBSC2ETH` via ETHSwapAgent and specify erc20 token address, amount, and swap fee.
2. Swap service will monitor the `SwapStarted` event and call `fillETH2BSCSwap` via BSCSwapAgent to mint corresponding bep20 tokens to the same address that initiates the swap.

### Swap from BSC to ETH

Once the swap pair is registered, users can swap tokens from BSC to ETH.

1. Users call `swapBSC2ETH` via BSCSwapAgent and specify the bep20 token address, amount, and swap fee. Bep20 tokens will be burned.
2. Swap service will monitor the `SwapStarted` event and call `fillBSC2ETHSwap` via BSCSwapAgent to transfer corresponding erc20 tokens to the same address that initiates the swap.

## Generate contracts from templates

```javascript
npm run generate
```

## Test

Generate test contracts from templates:
```javascript
npm run generate-test
```

Run tests:

```javascript
npm run truffle:test
```

Run coverage:

```javascript
npm run coverage
```
