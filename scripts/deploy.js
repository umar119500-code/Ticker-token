// Manual deployment only:  npx hardhat run scripts/deploy.js --network <localhost|bscTestnet>
// Never run automatically. Prints only public information (addresses, tx hash) — never secrets.
const hre = require("hardhat");

const ALLOWED_CHAINS = new Set([31337n, 97n]); // local Hardhat + BNB Smart Chain Testnet

async function main() {
  const { ethers, network } = hre;
  const { chainId } = await ethers.provider.getNetwork();
  if (!ALLOWED_CHAINS.has(chainId)) {
    throw new Error(`Refusing to deploy: chain ${chainId} is not local (31337) or BSC Testnet (97).`);
  }

  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    const hint = process.env.DEPLOYER_PRIVATE_KEY ? "is malformed (expected 0x followed by 64 hex characters)" : "is not set";
    throw new Error(`No deployer account: DEPLOYER_PRIVATE_KEY ${hint}. See .env.example.`);
  }
  const deployer = signers[0];
  const holder = process.env.INITIAL_HOLDER || deployer.address;
  if (!ethers.isAddress(holder)) throw new Error("INITIAL_HOLDER is not a valid address.");

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Network:        ${network.name} (chainId ${chainId})`);
  console.log(`Deployer:       ${deployer.address}`);
  console.log(`Deployer bal:   ${ethers.formatEther(balance)} native`);
  console.log(`Initial holder: ${holder}`);
  if (balance === 0n) throw new Error("Deployer has no gas balance on this network.");

  const token = await ethers.deployContract("TickerToken", [holder]);
  const tx = token.deploymentTransaction();
  console.log(`Deploy tx:      ${tx.hash}`);
  await token.waitForDeployment();
  const receipt = await tx.wait(chainId === 97n ? 2 : 1);

  const address = await token.getAddress();
  console.log(`Token address:  ${address}`);
  console.log(`Block:          ${receipt.blockNumber}`);
  console.log(`Total supply:   ${ethers.formatUnits(await token.totalSupply(), 18)} ${await token.symbol()}`);
  console.log(`Holder balance: ${ethers.formatUnits(await token.balanceOf(holder), 18)}`);
  console.log("\nNext (manual): verify with");
  console.log(`  npx hardhat verify --network ${network.name} ${address} ${holder}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
