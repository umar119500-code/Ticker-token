# Ticker Token Lab — PRD

## Original request (2026-06)
Delete the previous AI Wedding Studio project (done; recoverable via Emergent Rollback; its live deployment left running for the user to unpublish) and build a minimal, secure Hardhat project for a fixed-supply BEP-20-compatible token on BNB Smart Chain: name Ticker, symbol TICK (ASCII), 1,000,000,000 supply, 18 decimals, minted once in the constructor, no owner mint / tax / blacklist / hidden fees / upgradeability. Local tests first; BSC Testnet (chain 97) deployment documented as a separate manual step. Secrets only from env; no automatic deploy, no mainnet, no payments, no website, no trading/presale features.

## Architecture
- Hardhat 2.29.1 + hardhat-toolbox 5.0.0 (ethers v6, chai, hardhat-verify 2.1.3, coverage), OpenZeppelin Contracts 5.6.1, solc 0.8.24 (optimizer 200, evm paris), dotenv 16.4.7 — all pinned exactly.
- `contracts/TickerToken.sol` (ERC20 + constructor mint to initialHolder, ZeroInitialHolder error)
- `test/TickerToken.test.js` (22 tests), `scripts/deploy.js` (chain allow-list 31337/97), `scripts/check.js` (read-only bytecode/supply/balance), `.env.example`, `.gitignore` (.env ignored, .env.example kept), README.
- No frontend/backend; supervisor services frontend/backend are stopped.

## Status (2026-06)
- compile OK; 22/22 tests passing; coverage 100%; local `hardhat node` deploy + check OK (exact bytecode match); bscTestnet deploy without key refuses correctly. Nothing deployed to any public network.
- 2026-06 re-verification: compile/test (22/22)/coverage 100% re-run; runtime deps 0 advisories, 55 dev-tooling advisories (fix needs Hardhat 3, not applied); no secrets; chainId 97 confirmed. Report + manual checklist in /app/AUDIT_REPORT.md. No code changes.


## Backlog
- P1: user-run testnet deploy + verification; independent review before mainnet.
- P2: CI (GitHub Actions) running compile/test; slither static analysis; multisig holder guidance.
