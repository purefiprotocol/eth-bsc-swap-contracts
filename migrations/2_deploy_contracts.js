const BEP20TokenImplementation = artifacts.require("BEP20TokenImplementation");
const BSCSwapAgentImpl = artifacts.require("BSCSwapAgentImpl");
const BSCSwapAgentUpgradeableProxy = artifacts.require("BSCSwapAgentUpgradeableProxy");

const ETHSwapAgentImpl = artifacts.require("ETHSwapAgentImpl");
const ETHSwapAgentUpgradeableProxy = artifacts.require("ETHSwapAgentUpgradeableProxy");
const PureFiBotProtection = artifacts.require("PureFiBotProtection");
const BridgeProxyAdmin = artifacts.require("BridgeProxyAdmin");
const web3 = require("web3");
const BN = web3.utils.BN;
const { time } = require('@openzeppelin/test-helpers');

function toBN(number) {
    return web3.utils.toBN(number);
}

const decimals = toBN(10).pow(toBN(18));

function printEvents(txResult, strdata) {
    console.log(strdata, " events:", txResult.logs.length);
    for (var i = 0; i < txResult.logs.length; i++) {
        let argsLength = Object.keys(txResult.logs[i].args).length;
        console.log("Event ", txResult.logs[i].event, "  length:", argsLength);
        for (var j = 0; j < argsLength; j++) {
            if (!(typeof txResult.logs[i].args[j] === 'undefined') && txResult.logs[i].args[j].toString().length > 0)
                console.log(">", i, ">", j, " ", txResult.logs[i].args[j].toString());
        }
    }
}

module.exports = async function (deployer, network, accounts) {
    
    let deployerAddress = accounts[0];
    let bridgeOwner = accounts[1];
    console.log("Deployer: ", deployerAddress);
    console.log("BrideOwner: ", bridgeOwner);

    if(network.startsWith('bsc') || network.startsWith('test')){
        console.log("Starting BSC flow");
        let pureFiAdmin = '0xcE14bda2d2BceC5247C97B65DBE6e6E570c4Bb6D';
        let registerTx;
        let pureFiTokenAddressETH;
        let swapTx;
        let toAddress;
        let swapAmount;
        if(network == 'test' || network == 'bsctest' || network == 'bsctest-fork'){
             registerTx = '0x0973d37e767d8847203096eb26a6870c26119c9a5de3fd96194e300bbc620790';
             pureFiTokenAddressETH = '0x9aD4f3D6D1eF640660dd0Fc63020698d7F6EB4eb';
             swapTx = '0xeb4465c82c4104f76157b16332a82225a1e3fafeb8372c9c38ab57586b9f40d3';
             toAddress = '0xcE14bda2d2BceC5247C97B65DBE6e6E570c4Bb6D';
             swapAmount = '10000000000000000000000000';
        } else if(network == 'bsc' || network == 'bsc-fork'){
             registerTx = '0x4a6391afc6b079abfa787e3ee316c9cdcd9ecaa7ca2edde2062b6c90e392bca4';
             pureFiTokenAddressETH = '0xcDa4e840411C00a614aD9205CAEC807c7458a0E3';
             swapTx = '0x75a638b1bf35448118761d63a38604e968be5c7d27d2e248135b17b54d37a935';
             toAddress = '0xcE14bda2d2BceC5247C97B65DBE6e6E570c4Bb6D';
             swapAmount = '10000000000000000000000000';
        }

        if(registerTx.length==0){
            throw new Error("registerTx not defined");
        }
        if(pureFiTokenAddressETH.length==0){
            throw new Error("registerTx not defined");
        }
        if(swapTx.length==0){
            throw new Error("registerTx not defined");
        }
        if(toAddress.length==0){
            throw new Error("registerTx not defined");
        }
        if(swapAmount.length==0){
            throw new Error("registerTx not defined");
        }

        let botProtector;
        await deployer.deploy(PureFiBotProtection, deployerAddress, pureFiTokenAddressETH)
        .then(function(){
            console.log("PureFiBotProtection instance: ", PureFiBotProtection.address);
            return PureFiBotProtection.at(PureFiBotProtection.address);
        }).then(function (instance){
            botProtector = instance; 
        });
        // PureFiBotProtection instance:  0x4C6F30007c1772cea09aa8bFd8ef94174378a659

        //deploy master admin
        let proxyAdmin;
        await BridgeProxyAdmin.new().then(instance => proxyAdmin = instance);
        console.log("BridgeProxyAdmin: ",proxyAdmin.address);
        // BridgeProxyAdmin:  0x52A671b6bbaf3a1510dc6c33d59766E8fa5f2746

        //deploy BinanceSmartChain bridge
        let bscSwapAgentMasterCopy;
        await BSCSwapAgentImpl.new().then(instance => bscSwapAgentMasterCopy = instance);
        // 0x6bfee5286ac2f59ae8cc618c341712b0c62fa052

        let bscBEP20MasterCopy;
        await BEP20TokenImplementation.new().then(instance => bscBEP20MasterCopy = instance);
        // 0x21eb8c8695a37ac50f323df3df3b33df542519a9

        let bscSwapAgent;
        await BSCSwapAgentUpgradeableProxy.new(bscSwapAgentMasterCopy.address,proxyAdmin.address,web3.utils.hexToBytes('0x')).
            then(function(instance){
                return BSCSwapAgentImpl.at(instance.address);
            }).then(instance => bscSwapAgent = instance);
        console.log("bscSwapAgent instance: ", bscSwapAgent.address);
        // bscSwapAgent instance:  0xC4617166e3af9c90055eDF469a9F08215CF80b1D

        let swapFee = decimals.mul(toBN(20)).div(toBN(400));//$20 in BNB
        console.log ("BSC->ETH swap fee",swapFee.toString());
        // BSC->ETH swap fee 50000000000000000
        
        await bscSwapAgent.initialize.sendTransaction(bscBEP20MasterCopy.address, swapFee, bridgeOwner, proxyAdmin.address, {from:deployerAddress});

        //restister swap token
        let name = "PureFi Token";
        let symbol = "UFI";
        let decimals18 = toBN("18");
        let createSwapPairTx = await bscSwapAgent.createSwapPair.sendTransaction(registerTx, pureFiTokenAddressETH, name, symbol, decimals18, botProtector.address, {from:bridgeOwner});
        printEvents(createSwapPairTx, "createSwapPair");

        let newTokenAddress = createSwapPairTx.logs[0].args[1];
        console.log("BSC PureFi token Address: ",newTokenAddress);
        // BSC PureFi token Address:  0xe2a59D5E33c6540E18aAA46BF98917aC3158Db0D
        
        await botProtector.setTokenProtected.sendTransaction(newTokenAddress, {from:deployerAddress});
        //change admin to pureFi admin
        await botProtector.transferOwnership.sendTransaction(pureFiAdmin, {from:deployerAddress});
        //fill swap
        let fillTx = await bscSwapAgent.fillETH2BSCSwap.sendTransaction(swapTx, pureFiTokenAddressETH, toAddress, toBN(swapAmount), {from:bridgeOwner})
        printEvents(fillTx, "fillTx");  

    }else{
        console.log("Starting ETH flow");
        //deploy master admin
        let proxyAdmin;
        await BridgeProxyAdmin.new().then(instance => proxyAdmin = instance);
        console.log("BridgeProxyAdmin: ",proxyAdmin.address);

        //deploy Ethereum bridge
        let ethSwapAgentMasterCopy;
        await ETHSwapAgentImpl.new().then(instance => ethSwapAgentMasterCopy = instance);

        let ethSwapAgent;
        await ETHSwapAgentUpgradeableProxy.new(ethSwapAgentMasterCopy.address,proxyAdmin.address,web3.utils.hexToBytes('0x')).
            then(function(instance){
                return ETHSwapAgentImpl.at(instance.address);
            }).then(instance => ethSwapAgent = instance);
        console.log("ethSwapAgent instance: ", ethSwapAgent.address);

        let swapFee = decimals.mul(toBN(20)).div(toBN(2000));//$20 in ETH
        console.log ("ETH->BSC swap fee",swapFee.toString());

        await ethSwapAgent.initialize.sendTransaction(swapFee, bridgeOwner, {from:deployerAddress});
    }
    
};