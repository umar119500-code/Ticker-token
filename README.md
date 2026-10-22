# Ticker Token Lab

A minimal Hardhat project for **Ticker (TICK)**, a fixed-supply BEP-20/ERC-20 token for BNB Smart Chain.
It is meant for local development and **BNB Smart Chain Testnet (chain ID 97)** only.

> ⚠️ **Not audited. Not deployed.** Nothing in this repo deploys automatically. You must get an
> independent security review before any mainnet use (see [Security](#security-limitations)).

| Property | Value |
|---|---|
| Name | `Ticker` |
| Symbol | `TICK` (ASCII; the 🎫 emoji is not used because wallets and explorers handle it inconsistently) |
| Decimals | `18` |
| Total supply | `1,000,000,000 × 10^18` base units, minted **once** in the constructor to `initialHolder` |
| Privileges | **None.** No owner, mint, burn, pause, blacklist, fees/tax or proxy/upgrade |
| Base | OpenZeppelin Contracts `5.6.1` `ERC20` (unmodified) |
| Compiler | solc `0.8.24`, optimizer on (200 runs), `evmVersion: paris` |

## Layout
```
contracts/TickerToken.sol     the token (≈15 lines on top of OpenZeppelin ERC20)
test/TickerToken.test.js      22 unit tests
scripts/deploy.js             MANUAL deploy (only allows chain 31337 or 97)
scripts/check.js              read-only post-deploy checks: bytecode, supply, balance
hardhat.config.js             networks: hardhat, localhost, bscTestnet (97). No mainnet entry
.env.example                  variable names only; copy to .env (git-ignored)
```

Versions are pinned exactly in `package.json` (hardhat `2.29.1`, hardhat-toolbox `5.0.0`,
@openzeppelin/contracts `5.6.1`, dotenv `16.4.7`). Requires Node **18.18–22.x** (tested on Node 20.20.2, npm 10.8.2).
Commit `package-lock.json` too, if your git setup allows it, so `npm ci` installs the exact same dependency tree.

---

## Milestone 1: compile and test locally (no network, no keys)
```bash
npm install          # or: npm ci  (when package-lock.json is present)
npx hardhat compile
npx hardhat test
npx hardhat coverage # optional
```

**Actual results from this environment (Node 20.20.2):**
- `npx hardhat compile` → `Compiled 6 Solidity files successfully (evm target: paris).`
- `npx hardhat test` → **22 passing**, 0 failing
- `npx hardhat coverage` → `TickerToken.sol` 100% statements / branches / functions / lines
- `npm audit --omit=dev` → 0 vulnerabilities in the runtime dependency (@openzeppelin/contracts).
  `npm audit` reports advisories in **dev-only** tooling (Hardhat's transitive deps). These don't ship
  on-chain. Re-check them before relying on the tooling for anything sensitive.

The tests cover: name, symbol (ASCII), decimals, exact total supply, full initial allocation, the mint
event, allocation to a non-deployer, the zero-holder revert, transfers (events, no fee, insufficient balance,
zero address, zero value), allowances (approve, transferFrom, over-allowance revert, infinite allowance, reset),
**no public mint** (ABI is exactly the ERC-20 set plus `TOTAL_SUPPLY`; a raw `mint(address,uint256)` call reverts),
no owner/pause/fee/upgrade functions, and rejection of plain native-coin transfers.

### Optional: local deployment dry run
```bash
npx hardhat node                                # terminal 1: local chain 31337 with test accounts
npx hardhat run scripts/deploy.js --network localhost             # terminal 2
TOKEN_ADDRESS=<printed address> HOLDER_ADDRESS=<holder> \
  npx hardhat run scripts/check.js --network localhost
```
This was run here: the deployment succeeded on the local chain only, and `check.js` reported an exact
bytecode match, a supply of 1,000,000,000 and the full holder balance.

---

## Milestone 2: BSC Testnet deployment (manual, separate step)
Do this only when you choose to. Nothing here runs by itself.

1. **Create a brand-new testnet-only wallet.** Never use a wallet that holds real funds. Never paste a
   seed phrase or private key into chats, issues, CI logs or code.
2. Get free **testnet** tBNB from the official BNB Chain faucet (https://www.bnbchain.org/en/testnet-faucet).
   No purchase is needed.
3. `cp .env.example .env`, then on your own machine set `DEPLOYER_PRIVATE_KEY=0x…` (64 hex characters). You can
   also set `INITIAL_HOLDER` and `BSC_TESTNET_RPC_URL`. `.env` is git-ignored. The config only loads the key
   if it is well-formed and never prints it.
4. Re-run the tests: `npx hardhat test`.
5. Deploy:
   ```bash
   npx hardhat run scripts/deploy.js --network bscTestnet
   ```
   The script refuses any chain other than 31337 or 97 and stops if the deployer has no tBNB. It prints the
   tx hash, token address, supply and holder balance. Without a key it stops with
   `No deployer account…` (checked here).
6. Write down the token address and the tx hash. Confirm them on https://testnet.bscscan.com.

## Verification guide (testnet)
**A. Source verification on the explorer**
- **Hardhat (Etherscan v2 API):** set `ETHERSCAN_API_KEY` (an etherscan.io key works across chains through the
  v2 API; check that your plan covers BNB Chain testnet), then:
  ```bash
  npx hardhat verify --network bscTestnet <TOKEN_ADDRESS> <INITIAL_HOLDER>
  ```
  The constructor argument must be the exact `initialHolder` you deployed with. Sourcify verification
  is also enabled and runs alongside it.
- **Manual (explorer UI):** testnet.bscscan.com → contract → *Verify & Publish* → *Solidity (Standard JSON
  Input)*. Upload the `input` object from `artifacts/build-info/*.json`, choose compiler `v0.8.24`, and paste the
  ABI-encoded constructor argument (the 32-byte, left-padded holder address).

**B. Confirm what is on-chain** (read-only, no key needed):
```bash
TOKEN_ADDRESS=0x… HOLDER_ADDRESS=0x… npx hardhat run scripts/check.js --network bscTestnet
```
- *Bytecode:* compares the on-chain runtime code with your local `artifacts/…/TickerToken.json`
  `deployedBytecode`, both exactly and with the trailing CBOR metadata removed. A metadata-only difference means a
  different source path or compiler setting. Treat any other difference as **not your contract**.
- *Supply:* `totalSupply()` must equal `1000000000` TICK (`1e27` base units).
- *Holder:* `balanceOf(holder)` should equal the full supply until the holder makes any transfer.
- Cross-check on the explorer: *Contract* tab shows "verified", *Read Contract* → `totalSupply`, `decimals`,
  `balanceOf`, *Holders* tab shows the initial holder.

---

## Security limitations
- **No audit.** Inheriting OpenZeppelin `ERC20` reduces risk, but this repo, its configuration and its
  deployment process have not been independently reviewed. **An independent review is required
  before any mainnet deployment.** Mainnet (chain 56) is deliberately missing from `hardhat.config.js`, and
  `deploy.js` blocks it.
- **Standard ERC-20 approve race.** Changing a non-zero allowance to another non-zero value can be
  front-run. Wallets and dApps should reset to 0 first, or use the exact allowance they need.
- **Immutable by design.** There's no way to fix bugs, recover tokens sent to the token contract, pause,
  or change metadata. A mistake would mean deploying a new contract.
- **Concentration.** The whole supply goes to one address. How you hold and move it (e.g. a multisig) is up
  to you and isn't covered here.
- **Key handling.** Anyone holding `DEPLOYER_PRIVATE_KEY` controls the deployer and, by default, the full
  supply. Use a throwaway testnet key and keep `.env` off shared machines and out of CI logs.
- **Tooling.** Dev dependencies have open `npm audit` advisories. Public RPC endpoints can be rate-limited or
  untrustworthy, so use your own RPC for anything important.
- **Not financial infrastructure.** This repo has no liquidity, listings, presale, trading or price features,
  and shouldn't get them without legal and security review.
