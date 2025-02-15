import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import hre, { ethers } from "hardhat";

describe("Multisig Contract", () => {
    async function deployMultisigFixture() {
        const signers = await hre.ethers.getSigners();

        // Ensure exactly 20 signers are used
        if (signers.length < 20) {
            throw new Error("Not enough signers. Ensure at least 20 signers are available.");
        }

        const ownersArray = signers.slice(0, 20).map(signer => signer.address);
        const requiredSignatures = 3; // Minimum required signatures

        // Deploy the contract
        const multisigFactory = await hre.ethers.getContractFactory("Multisig");
        const multisigContract = await multisigFactory.deploy(ownersArray, requiredSignatures);

        return { signers, multisigContract };
    }

    describe("Deployment", () => {
        it("Should deploy Multisig contract with correct owners and required signatures", async () => {
            const { multisigContract, signers } = await loadFixture(deployMultisigFixture);

            const runner = multisigContract.runner as HardhatEthersSigner;
            expect(runner.address).to.equal(signers[0].address);

            expect(await multisigContract.numToSign()).to.equal(3);

            // Ensure all 20 addresses are owners
            for (let i = 0; i < 20; i++) {
                expect(await multisigContract.isOwner(signers[i].address)).to.be.true;
            }

            // Ensure an arbitrary address is NOT an owner
            expect(await multisigContract.isOwner(ethers.ZeroAddress)).to.be.false;
        });
    });

    describe("Funding and Transactions", () => {
        it("Should allow an owner to fund", async () => {
            const { multisigContract, signers } = await loadFixture(deployMultisigFixture);
            const owner = signers[0];

            await expect(multisigContract.connect(owner).fund(ethers.parseEther("1")))
                .to.emit(multisigContract, "FundDonated")
                .withArgs(owner.address, ethers.parseEther("1"));

            const txn = await multisigContract.signatory(0);
            expect(txn.amount).to.equal(ethers.parseEther("1"));
            expect(txn.executed).to.be.false;
            expect(txn.signatureCount).to.equal(0);
        });

        it("Should allow owners to sign transactions", async () => {
            const { multisigContract, signers } = await loadFixture(deployMultisigFixture);
            const [owner, address1] = signers;

            await multisigContract.connect(owner).fund(ethers.parseEther("1"));

            await multisigContract.connect(owner).signTransaction(0);
            await multisigContract.connect(address1).signTransaction(0);

            expect(await multisigContract.ownerSigned(0, owner.address)).to.be.true;
            expect(await multisigContract.ownerSigned(0, address1.address)).to.be.true;
        });

        // it("Should prevent non-owners from signing", async () => {
        //     const { multisigContract, signers } = await loadFixture(deployMultisigFixture);
        //     const nonOwner = signers[19]; // Assuming 20th signer is a non-participating address

        //     await expect(multisigContract.connect(nonOwner).signTransaction(0))
        //         .to.be.revertedWithCustomError(multisigContract, "Unauthorised");
        // });

        it("Should execute a transaction when required signatures are met", async () => {
            const { multisigContract, signers } = await loadFixture(deployMultisigFixture);
            const [owner, address1, address2] = signers;

            await multisigContract.connect(owner).fund(ethers.parseEther("1"));
            await multisigContract.connect(owner).signTransaction(0);
            await multisigContract.connect(address1).signTransaction(0);

            await expect(multisigContract.connect(address2).signTransaction(0))
                .to.emit(multisigContract, "FundTransferedSuccessfully");

            const txn = await multisigContract.signatory(0);
            expect(txn.executed).to.be.true;
        });

        it("Should revert if a transaction is already executed", async () => {
            const { multisigContract, signers } = await loadFixture(deployMultisigFixture);
            const [owner, address1, address2] = signers;

            await multisigContract.connect(owner).fund(ethers.parseEther("1"));
            await multisigContract.connect(owner).signTransaction(0);
            await multisigContract.connect(address1).signTransaction(0);
            await multisigContract.connect(address2).signTransaction(0);

            await expect(multisigContract.connect(owner).signTransaction(0))
                .to.be.revertedWithCustomError(multisigContract, "MemberAlreadySigned");
        });

        it("Should not allow duplicate signatures", async () => {
            const { multisigContract, signers } = await loadFixture(deployMultisigFixture);
            const owner = signers[0];

            await multisigContract.connect(owner).fund(ethers.parseEther("1"));
            await multisigContract.connect(owner).signTransaction(0);

            await expect(multisigContract.connect(owner).signTransaction(0))
                .to.be.revertedWithCustomError(multisigContract, "MemberAlreadySigned");
        });

        it("Should not execute a transaction if signatures are insufficient", async () => {
            const { multisigContract, signers } = await loadFixture(deployMultisigFixture);
            const [owner, address1] = signers;

            await multisigContract.connect(owner).fund(ethers.parseEther("1"));
            await multisigContract.connect(owner).signTransaction(0);
            await multisigContract.connect(address1).signTransaction(0);

            const txn = await multisigContract.signatory(0);
            expect(txn.executed).to.be.false;

            // Do not call pullFund directly, expect it to revert through signTransaction
            await expect(multisigContract.connect(owner).signTransaction(0))
                .to.be.revertedWithCustomError(multisigContract, "MemberAlreadySigned");
        });
    });
});
