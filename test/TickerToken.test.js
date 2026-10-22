const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const SUPPLY = ethers.parseUnits("1000000000", 18);

async function deployFixture() {
  const [holder, alice, bob, spender] = await ethers.getSigners();
  const token = await ethers.deployContract("TickerToken", [holder.address]);
  await token.waitForDeployment();
  return { token, holder, alice, bob, spender };
}

describe("TickerToken", function () {
  describe("metadata", function () {
    it("has name Ticker", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.name()).to.equal("Ticker");
    });

    it("has ASCII symbol TICK", async function () {
      const { token } = await loadFixture(deployFixture);
      const symbol = await token.symbol();
      expect(symbol).to.equal("TICK");
      expect(/^[\x20-\x7E]+$/.test(symbol)).to.equal(true);
    });

    it("has 18 decimals", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.decimals()).to.equal(18n);
    });
  });

  describe("supply", function () {
    it("total supply is exactly 1,000,000,000 * 10^18", async function () {
      const { token } = await loadFixture(deployFixture);
      expect(await token.totalSupply()).to.equal(SUPPLY);
      expect(await token.TOTAL_SUPPLY()).to.equal(SUPPLY);
    });

    it("allocates the whole supply to the initial holder", async function () {
      const { token, holder, alice } = await loadFixture(deployFixture);
      expect(await token.balanceOf(holder.address)).to.equal(SUPPLY);
      expect(await token.balanceOf(alice.address)).to.equal(0n);
    });

    it("emits a single mint Transfer from the zero address at deployment", async function () {
      const [holder] = await ethers.getSigners();
      const factory = await ethers.getContractFactory("TickerToken");
      const token = await factory.deploy(holder.address);
      await expect(token.deploymentTransaction())
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, holder.address, SUPPLY);
    });

    it("can allocate to an address other than the deployer", async function () {
      const [, alice] = await ethers.getSigners();
      const token = await ethers.deployContract("TickerToken", [alice.address]);
      expect(await token.balanceOf(alice.address)).to.equal(SUPPLY);
    });

    it("rejects the zero address as initial holder", async function () {
      const factory = await ethers.getContractFactory("TickerToken");
      await expect(factory.deploy(ethers.ZeroAddress)).to.be.revertedWithCustomError(factory, "ZeroInitialHolder");
    });
  });

  describe("transfers", function () {
    it("moves tokens and emits Transfer", async function () {
      const { token, holder, alice } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1500", 18);
      await expect(token.transfer(alice.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(holder.address, alice.address, amount);
      expect(await token.balanceOf(alice.address)).to.equal(amount);
      expect(await token.balanceOf(holder.address)).to.equal(SUPPLY - amount);
    });

    it("charges no fee: recipient receives the full amount and supply is unchanged", async function () {
      const { token, alice, bob } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("1000", 18);
      await token.transfer(alice.address, amount);
      await token.connect(alice).transfer(bob.address, amount);
      expect(await token.balanceOf(bob.address)).to.equal(amount);
      expect(await token.balanceOf(alice.address)).to.equal(0n);
      expect(await token.totalSupply()).to.equal(SUPPLY);
    });

    it("reverts when the sender's balance is insufficient", async function () {
      const { token, alice, bob } = await loadFixture(deployFixture);
      await expect(token.connect(alice).transfer(bob.address, 1n))
        .to.be.revertedWithCustomError(token, "ERC20InsufficientBalance")
        .withArgs(alice.address, 0n, 1n);
    });

    it("reverts on transfer to the zero address", async function () {
      const { token } = await loadFixture(deployFixture);
      await expect(token.transfer(ethers.ZeroAddress, 1n))
        .to.be.revertedWithCustomError(token, "ERC20InvalidReceiver")
        .withArgs(ethers.ZeroAddress);
    });

    it("allows zero-value transfers", async function () {
      const { token, alice } = await loadFixture(deployFixture);
      await expect(token.transfer(alice.address, 0n)).to.not.be.reverted;
    });
  });

  describe("allowances", function () {
    it("approve sets allowance and emits Approval", async function () {
      const { token, holder, spender } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("250", 18);
      await expect(token.approve(spender.address, amount))
        .to.emit(token, "Approval")
        .withArgs(holder.address, spender.address, amount);
      expect(await token.allowance(holder.address, spender.address)).to.equal(amount);
    });

    it("transferFrom spends allowance and moves tokens", async function () {
      const { token, holder, spender, bob } = await loadFixture(deployFixture);
      const amount = ethers.parseUnits("250", 18);
      await token.approve(spender.address, amount);
      await token.connect(spender).transferFrom(holder.address, bob.address, ethers.parseUnits("100", 18));
      expect(await token.balanceOf(bob.address)).to.equal(ethers.parseUnits("100", 18));
      expect(await token.allowance(holder.address, spender.address)).to.equal(ethers.parseUnits("150", 18));
    });

    it("transferFrom above allowance reverts", async function () {
      const { token, holder, spender, bob } = await loadFixture(deployFixture);
      await token.approve(spender.address, 10n);
      await expect(token.connect(spender).transferFrom(holder.address, bob.address, 11n))
        .to.be.revertedWithCustomError(token, "ERC20InsufficientAllowance")
        .withArgs(spender.address, 10n, 11n);
    });

    it("an infinite (max uint256) allowance is not decreased", async function () {
      const { token, holder, spender, bob } = await loadFixture(deployFixture);
      await token.approve(spender.address, ethers.MaxUint256);
      await token.connect(spender).transferFrom(holder.address, bob.address, 5n);
      expect(await token.allowance(holder.address, spender.address)).to.equal(ethers.MaxUint256);
    });

    it("approve can reset an allowance to zero", async function () {
      const { token, holder, spender } = await loadFixture(deployFixture);
      await token.approve(spender.address, 99n);
      await token.approve(spender.address, 0n);
      expect(await token.allowance(holder.address, spender.address)).to.equal(0n);
    });
  });

  describe("no privileged or supply-changing functions", function () {
    const forbidden = [
      "mint", "burn", "burnFrom", "owner", "transferOwnership", "renounceOwnership",
      "pause", "unpause", "blacklist", "setFee", "setTax", "upgradeTo", "upgradeToAndCall",
    ];

    it("ABI exposes no mint/burn/owner/pause/fee/blacklist/upgrade function", async function () {
      const { token } = await loadFixture(deployFixture);
      const names = token.interface.fragments.filter((f) => f.type === "function").map((f) => f.name);
      for (const name of forbidden) expect(names, `unexpected function ${name}`).to.not.include(name);
    });

    it("ABI functions are exactly the standard ERC-20 set plus TOTAL_SUPPLY", async function () {
      const { token } = await loadFixture(deployFixture);
      const names = token.interface.fragments.filter((f) => f.type === "function").map((f) => f.name).sort();
      expect(names).to.deep.equal(
        ["TOTAL_SUPPLY", "allowance", "approve", "balanceOf", "decimals", "name", "symbol", "totalSupply", "transfer", "transferFrom"].sort()
      );
    });

    it("a raw call with the mint(address,uint256) selector reverts and supply is unchanged", async function () {
      const { token, holder, alice } = await loadFixture(deployFixture);
      const iface = new ethers.Interface(["function mint(address to, uint256 amount)"]);
      const data = iface.encodeFunctionData("mint", [alice.address, 1n]);
      await expect(holder.sendTransaction({ to: await token.getAddress(), data })).to.be.reverted;
      expect(await token.totalSupply()).to.equal(SUPPLY);
    });

    it("rejects plain BNB/ETH transfers (no receive/fallback)", async function () {
      const { token, holder } = await loadFixture(deployFixture);
      await expect(holder.sendTransaction({ to: await token.getAddress(), value: 1n })).to.be.reverted;
    });
  });
});
