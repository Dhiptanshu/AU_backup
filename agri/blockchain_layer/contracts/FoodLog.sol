// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract FoodLog {
    event BatchVerified(string batchId, string farmerName, string crop, uint256 quantity);
    function verifyBatch(string memory _batchId, string memory _farmerName, string memory _crop, uint256 _quantity) public {
        emit BatchVerified(_batchId, _farmerName, _crop, _quantity);
    }
}
