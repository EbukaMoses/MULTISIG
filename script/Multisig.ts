import { ethers } from "hardhat";

async function deployMultisig() {
    console.log("\n======== Deploying Multisig Contract ========");

    const signer = await ethers.provider.getSigner();

    // Get signers for board members (fill remaining slots with ZeroAddress)
    const signers = await ethers.getSigners();
    const boardMembers = signers
        .slice(0, 20)
        .map(signer => signer.address)
        .concat(Array(20 - signers.length).fill(ethers.ZeroAddress)); // Fill empty slots

    const requiredSignatures = 3; // Set required number of signers

    // Deploy Multisig contract
    const _multiSigContract = await ethers.deployContract("Multisig", [boardMembers, requiredSignatures]);
    await _multiSigContract.waitForDeployment();

    console.log(`\nMULTISIG CONTRACT DEPLOYED AT: ${_multiSigContract.target}`);
    return _multiSigContract;
}

async function main() {
    console.log("\n====== Starting deployment process ======");

    await deployMultisig();
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
