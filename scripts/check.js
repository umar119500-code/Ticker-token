// Read-only post-deployment checks (no transactions, no keys needed):
//   TOKEN_ADDRESS=0x... HOLDER_ADDRESS=0x... npx hardhat run scripts/check.js --network bscTestnet
// Confirms on-chain runtime bytecode == locally compiled artifact, metadata, supply and holder balance.
const hre = require("hardhat");

// Runtime bytecode ends with CBOR metadata (whose length is the last 2 bytes); compare code without it.
function stripMetadata(hex) {
  const code = hex.toLowerCase().replace(/^0x/, "");
  const metaLen = parseInt(code.slice(-4), 16);
  return code.slice(0, code.length - (metaLen + 2) * 2);
}

async function main() {
  const { ethers, artifacts } = hre;
  const address = process.env.TOKEN_ADDRESS;
  if (!address || !ethers.isAddress(address)) throw new Error("Set TOKEN_ADDRESS to the deployed token address.");

  const onchain = await ethers.provider.getCode(address);
  if (onchain === "0x") throw new Error(`No contract code at ${address} on this network.`);
  const local = (await artifacts.readArtifact("TickerToken")).deployedBytecode;

  const exact = onchain.toLowerCase() === local.toLowerCase();
  const sameCode = stripMetadata(onchain) === stripMetadata(local);
  console.log(`Bytecode exact match (incl. metadata): ${exact}`);
  console.log(`Bytecode match (excluding metadata):   ${sameCode}`);

  const token = await ethers.getContractAt("TickerToken", address);
  const [name, symbol, decimals, supply] = await Promise.all([token.name(), token.symbol(), token.decimals(), token.totalSupply()]);
  const expected = ethers.parseUnits("1000000000", 18);
  console.log(`name/symbol/decimals: ${name} / ${symbol} / ${decimals}`);
  console.log(`totalSupply: ${ethers.formatUnits(supply, 18)} (expected 1000000000) → ${supply === expected ? "OK" : "MISMATCH"}`);

  if (process.env.HOLDER_ADDRESS) {
    const bal = await token.balanceOf(process.env.HOLDER_ADDRESS);
    console.log(`balanceOf(${process.env.HOLDER_ADDRESS}): ${ethers.formatUnits(bal, 18)}`);
  }
  if (!sameCode || supply !== expected) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err.message || err);
  process.exitCode = 1;
});
