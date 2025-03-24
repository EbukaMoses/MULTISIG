// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

contract Multisig {
    address[] public owners;
    mapping(address => bool) public isOwner;
    uint256 public numToSign;
    mapping(uint256 => mapping(address => bool)) public ownerSigned;

    struct Signatory {
        address signer;
        uint256 amount;
        bool executed;
        uint256 signatureCount;
    }

    Signatory[] public signatory;

    constructor(address[2] memory _isOwner, uint256 _numToSign) {
        if (_isOwner.length == 0) revert NotAnOwner();
        if (_numToSign == 0 || _numToSign > _isOwner.length)
            revert InvalidNumOfSigners();

        for (uint i = 0; i < _isOwner.length; i++) {
            isOwner[_isOwner[i]] = true;
        }
        owners = _isOwner;
        numToSign = _numToSign;
    }

    // Error Handling
    error Unauthorised();
    error NotAnOwner();
    error InvalidNumOfSigners();
    error MemberAlreadySigned();
    error NotEnoughSignatories();
    error FundAlreadyWithdrew();
    error InvalidTxnIndex();

    // Events
    event FundDonated(address indexed sender, uint256 value);
    event FundTransferedSuccessfully();

    modifier onlyOwner() {
        if (!isOwner[msg.sender]) revert Unauthorised();
        _;
    }

    function fund(uint256 _amount) public onlyOwner {
        signatory.push(
            Signatory({
                signer: msg.sender,
                amount: _amount,
                executed: false,
                signatureCount: 0
            })
        );

        emit FundDonated(msg.sender, _amount);
    }

    function signTransaction(uint256 txnIndex) public onlyOwner {
        Signatory storage txn = signatory[txnIndex];
        if (txnIndex >= signatory.length) revert InvalidTxnIndex();

        if (ownerSigned[txnIndex][msg.sender]) revert MemberAlreadySigned();

        if (txn.executed) revert FundAlreadyWithdrew();
        ownerSigned[txnIndex][msg.sender] = true;
        txn.signatureCount++;

        if (txn.signatureCount >= numToSign) {
            pullFund(txnIndex);
        }
    }

    function pullFund(uint256 txnIndex) internal {
        Signatory storage txn = signatory[txnIndex];

        if (txn.signatureCount < numToSign) revert NotEnoughSignatories();
        if (txn.executed) revert FundAlreadyWithdrew();

        txn.executed = true;

        emit FundTransferedSuccessfully();
    }
}
