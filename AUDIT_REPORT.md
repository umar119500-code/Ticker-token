# Ticker Token Lab — Verification Report

> This is an automated **self-review and test report**, not a professional third-party security audit.
> Nothing was deployed and no funds were used. Neither testnet nor mainnet was touched (the only network call was a read-only `eth_chainId` RPC query).

Date: June 2026 · Environment: Node v20.20.2, Hardhat 2.29.1, solc 0.8.24 (optimizer 200 runs, evm `paris`), OpenZeppelin Contracts 5.6.1

---

## 1. Commands run and results

| # | Command | Result |
|---|---------|--------|
| 1 | `rm -rf artifacts cache && npx hardhat compile` | ✅ `Compiled 6 Solidity files successfully (evm target: paris).` 0 warnings, 0 errors |
| 2 | `npx hardhat test` | ✅ **22 passing, 0 failing, 0 pending** (433 ms) |
| 3 | `npx hardhat coverage` | ✅ 22 passing; `TickerToken.sol` **100 % statements / 100 % branches / 100 % functions / 100 % lines** |
| 4 | `npm audit --omit=dev` (runtime deps) | ✅ `found 0 vulnerabilities` |
| 5 | `npm audit` (incl. dev tooling) | ⚠️ 55 advisories (19 low, 12 moderate, 24 high, 0 critical). All are in **dev-only tooling**, see §6 |
| 6 | `npm audit fix` (non-breaking) | No changes possible; lockfile unchanged. Remaining fixes require `--force` (Hardhat 3, a breaking change). Not applied |
| 7 | `npm ls --depth=0` | ✅ No missing/invalid/conflicting packages |
| 8 | `npx hardhat compile --force && npx hardhat test` (after step 6) | ✅ 22 passing |
| 9 | `curl … eth_chainId` → `https://data-seed-prebsc-1-s1.bnbchain.org:8545` | ✅ `{"result":"0x61"}` = chain ID **97** (read-only, no key used) |

### Test list (all passed in the actual run)
- metadata: name `Ticker` · ASCII symbol `TICK` · 18 decimals
- supply: total = 1,000,000,000 × 10^18 · full supply to initial holder · single mint `Transfer` from `0x0` at deploy · can allocate to non-deployer · rejects zero-address holder
- transfers: moves tokens + event · no fee (recipient gets full amount, supply unchanged) · insufficient balance reverts · transfer to `0x0` reverts · zero-value transfer allowed
- allowances: approve + event · transferFrom spends allowance · over-allowance reverts · max-uint allowance not decreased · reset to 0
- no privileged functions: ABI has no mint/burn/owner/pause/fee/blacklist/upgrade · ABI equals the standard ERC-20 set + `TOTAL_SUPPLY` · raw `mint(address,uint256)` call reverts, supply unchanged · plain BNB transfer reverts

**Compilation errors fixed:** none needed. **Failing tests fixed:** none needed. **Dependency conflicts fixed:** none found.

---

## 2. Token configuration — verified in source (`contracts/TickerToken.sol`)

| Property | Expected | Source location | On-chain value (local test) |
|----------|----------|-----------------|------------------------------|
| Name | Ticker | line 15 `ERC20("Ticker", "TICK")` | `Ticker` ✅ |
| Symbol | TICK | line 15 | `TICK` ✅ |
| Decimals | 18 | inherited OZ `ERC20.decimals()` default | `18` ✅ |
| Total supply | 1,000,000,000 × 10^18 | line 11 `TOTAL_SUPPLY = 1_000_000_000 * 10 ** 18` | `1000000000000000000000000000` ✅ |
| Minted once | constructor only | line 17 `_mint(initialHolder, TOTAL_SUPPLY)` (only `_mint` call in the file) | single `Transfer(0x0 → holder)` ✅ |

---

## 3. Privileged / hidden-behaviour scan

Searched `contracts/TickerToken.sol` for `mint|burn|fee|tax|blacklist|pause|owner|onlyOwner|upgrade|proxy|delegatecall|selfdestruct|AccessControl`:
- Matches only on lines 7–9 (NatSpec comment) and line 17 (the constructor `_mint`). No code-level matches otherwise.

Inheritance: `TickerToken is ERC20` (line 10) only. OZ `ERC20.sol` v5.6.1 inherits `Context, IERC20, IERC20Metadata, IERC20Errors` (line 29) — no `Ownable`, `AccessControl`, `Pausable`, `ERC20Burnable`, or upgradeable/proxy base.
- OZ `_mint` (ERC20.sol line 214), `_burn` (line 229), `_update` (line 176) are `internal`; `TickerToken` does not override `_update` and never calls `_burn`.

| Check | Result |
|-------|--------|
| Public/external mint | ❌ none (ABI test + raw-selector test) |
| Burn | ❌ none |
| Transfer fee / tax | ❌ none (no `_update` override; fee test passes) |
| Blacklist / whitelist | ❌ none |
| Pause | ❌ none |
| Owner / admin roles | ❌ none (no `owner()`; no privileged functions at all) |
| Upgradeability / proxy / `delegatecall` / `selfdestruct` | ❌ none |
| `receive` / `fallback` | ❌ none (BNB sent to the contract reverts) |

---

## 4. Secrets and Git hygiene

| Check | Result |
|-------|--------|
| 64-hex private keys in project files (excl. `node_modules`, build output) | none found |
| Mnemonic / seed phrase / hardcoded API key | none (only a warning sentence in `README.md` line 73) |
| Git history (`git log --all -p`) | no keys; only the README placeholder `DEPLOYER_PRIVATE_KEY=0x…` |
| `.env` ignored | ✅ `.gitignore` line 2 `.env`, line 3 `.env.*`, line 4 `!.env.example` (confirmed by `git check-ignore`) |
| `.env` present / tracked | not present, not tracked |
| Credentials source | `hardhat.config.js` reads `DEPLOYER_PRIVATE_KEY`, `BSC_TESTNET_RPC_URL`, `ETHERSCAN_API_KEY` from `process.env` via `dotenv` only |
| Key printed in logs | ✅ never. `deploy.js` prints only network, addresses, balance, tx hash, block, supply. On a missing/malformed key it prints just "is not set" / "is malformed" |
| Malformed key | ignored (regex `^0x[0-9a-fA-F]{64}$`, config line 7) → `accounts: []` |

---

## 5. Network configuration (`hardhat.config.js`)

| Network | chainId | URL |
|---------|---------|-----|
| `hardhat` | 31337 | in-process |
| `localhost` | 31337 | `http://127.0.0.1:8545` |
| `bscTestnet` | **97** ✅ (line 23) | `BSC_TESTNET_RPC_URL` or the public BNB Chain endpoint `https://data-seed-prebsc-1-s1.bnbchain.org:8545` (live check returned `0x61` = 97) |
| BSC mainnet (56) | **not configured** (on purpose) | — |

`scripts/deploy.js` line 5 also refuses any chain other than 31337 and 97.

---

## 6. Outstanding issues and limitations

**Outstanding errors:** none. Compile, tests and coverage all pass.

**Dependency advisories (dev tooling only):** `npm audit` flags 55 advisories in transitive dependencies of `hardhat@2.29.1` / `@nomicfoundation/hardhat-toolbox@5.0.0` (e.g. `undici`, `ws`, `tmp`/`solc`, `adm-zip`, `lodash`, `serialize-javascript`, `braces`, `elliptic`, `cookie`, `uuid`). None ship in the deployed bytecode. The deployed contract depends only on `@openzeppelin/contracts@5.6.1`, which has 0 advisories. To clear them you would have to migrate to Hardhat 3, a breaking change that I haven't made. Until then, only run the tooling on a trusted machine and network.

**Security limitations:**
1. This is not a professional audit. Before any mainnet use, get an independent review.
2. All 1,000,000,000 TICK go to a single `initialHolder` address. Whoever controls that key controls the entire supply. Consider a multisig as the holder.
3. Standard ERC-20 `approve` race condition (an inherent property of ERC-20): change an allowance via 0 first or use exact amounts.
4. Tokens sent to the token contract address (or any wrong address) are unrecoverable. There is no rescue function, by design.
5. The supply is immutable. There is no burn, mint, pause or upgrade, so bugs or mistakes can't be fixed after deployment. You would have to redeploy.
6. The default public RPC is third-party infrastructure with possible rate limits. You can use your own `BSC_TESTNET_RPC_URL`.
7. Explorer verification depends on an external Etherscan v2 / BscScan service and an API key you obtain yourself.

---

## 7. Files

Created in this session: `AUDIT_REPORT.md` (this file).
Modified in this session: none. Existing source, tests, scripts, config and lockfile are unchanged.
Generated locally (git-ignored): `artifacts/`, `cache/`, `coverage/`, `coverage.json`.

Project files inspected: `contracts/TickerToken.sol`, `test/TickerToken.test.js`, `scripts/deploy.js`, `scripts/check.js`, `hardhat.config.js`, `package.json`, `package-lock.json`, `.gitignore`, `.env.example`, `README.md`.
Missing files: none for the requested scope.

---

## 8. Manual BNB Smart Chain Testnet deployment checklist

### ✅ Completed (local, no funds)
- [x] Contract compiles with no errors or warnings
- [x] 22/22 unit tests pass; 100 % coverage
- [x] Name / symbol / decimals / supply verified
- [x] No mint, fee, blacklist, pause, owner or upgrade logic
- [x] No secrets in the repo or git history; `.env` is git-ignored
- [x] `bscTestnet` uses chain ID 97; the public RPC answers `0x61`
- [x] Deploy script refuses chains other than 31337 and 97

### ⏳ Pending: you do these yourself, on your own machine (needs your explicit decision)
1. **Wallet setup:** create a brand-new testnet-only wallet that has never held real funds. Never reuse a mainnet wallet. Never paste its key or seed phrase into chat, issues, or CI.
2. **Network in wallet:** BNB Smart Chain Testnet, chain ID **97**, symbol tBNB, explorer `https://testnet.bscscan.com`.
3. **Get test BNB:** request tBNB from the official BNB Chain testnet faucet (`https://www.bnbchain.org/en/testnet-faucet`). Testnet BNB has no monetary value, so don't buy it.
4. **Environment:** `cp .env.example .env`, then set `DEPLOYER_PRIVATE_KEY=0x<64 hex>`. Optional: `INITIAL_HOLDER`, `BSC_TESTNET_RPC_URL`, `ETHERSCAN_API_KEY`. Run `git status` to confirm `.env` is not listed.
5. **Pre-flight:** `npm ci && npx hardhat compile && npx hardhat test`. All tests must pass.
6. **Optional local dry-run:** `npx hardhat node` in one terminal, then `npm run deploy:local` in another.
7. **Deploy (testnet):** `npm run deploy:testnet`. Confirm the printed chainId is 97 and the deployer address is your testnet wallet.
8. **Record:** save the token address, deploy tx hash, block number, deployer and initial holder addresses.
9. **Explorer check:** open the tx and the contract on `https://testnet.bscscan.com`.
10. **Source verification:** `npx hardhat verify --network bscTestnet <TOKEN_ADDRESS> <INITIAL_HOLDER>`.
11. **Post-deployment checks:** `TOKEN_ADDRESS=0x… HOLDER_ADDRESS=0x… npm run check:testnet`. Expect a bytecode match, `Ticker / TICK / 18`, and supply `1000000000 → OK`.
12. **Functional check:** add the token to your wallet, send a small amount to a second testnet address, and confirm the full amount arrives with no fee.
13. **Clean up:** keep `.env` local, or delete it after use.

### 🚫 Out of scope without your separate explicit approval
Mainnet (chain 56) deployment, buying gas, adding liquidity, listing, or publishing anything.
