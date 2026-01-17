const hre = require("hardhat");

async function main() {
  // 1. Get the Contract Factory
  const FoodLog = await hre.ethers.getContractFactory("FoodLog");
  
  // 2. Trigger the deployment
  const foodLog = await FoodLog.deploy();

  // 3. Wait for it to finish (Ethers v5 Syntax)
  await foodLog.deployed();

  // 4. Print the address (Ethers v5 Syntax)
  console.log("FoodLog Contract deployed to:", foodLog.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
