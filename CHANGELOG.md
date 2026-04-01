# Changelog — Argos LTS (Liquidity Toxic Shield)

All notable changes to this project are documented here.
This project follows [Semantic Versioning](https://semver.org/).

---

## [2.0.0] — 2026-03-31 — PLGenesis Frontiers Revamp

**Existing Code Track submission — substantial new bounty-driven upgrade.**

> Summary: Added `ArgosLTSHook.sol` (v2), address-level toxic flagging, dual PARK/PENALIZE
> modes, a full new test suite, Lit Protocol sponsor integration, and deployment infrastructure.
> The original `Argos.sol` v1 and all 36 passing tests remain intact.

### Added

**Smart Contracts (v2)**
- `src/ArgosLTSHook.sol` — New spec-compliant Uniswap V4 hook with:
  - Per-address toxic flagging (`flagToxicAddress()`) vs v1's per-pool risk states
  - Dual mode: **PARK** (ERC-6909 claims, no hard revert) / **PENALIZE** (dynamic fee override)
  - `redeemParkedClaim()` — users reclaim parked tokens via `poolManager.unlock()` callback
  - `TOXIC_WINDOW = 5 minutes` — time-limited flags with decay-based penalty fees
- `src/ReactiveArbitrageSensor.sol` — Reactive Network RSC detecting L1 sandwich patterns:
  - Subscribes to Uniswap V3 `Swap` events on Ethereum mainnet
  - Detects ≥2 swaps from same sender per block (sandwich threshold)
  - Dispatches cross-chain `flagToxicAddress()` callback to Unichain via Reactive Network event
- `src/libraries/ToxicFlowLib.sol` — Pure library for:
  - `isToxic(mapping, address)` — O(1) expiry check
  - `computePenaltyFee(expiry, baseFee, maxFee, window)` — linear decay penalty (base→max)
- `src/interfaces/IArgosLTS.sol` — Full external interface with inline NatSpec docs
- `src/interfaces/IReactiveSensor.sol` — Interface for the Reactive sensor

**Tests (new — 14 test functions + 2 fuzz tests)**
- `test/ArgosLTSHook.t.sol` — 7 tests covering:
  - Normal swap passthrough
  - Toxic address swap parking
  - Parked claim redemption
  - Toxic flag expiry and recovery
  - PENALIZE mode fee emission
  - Unauthorized sensor call revert
  - Fuzz: park-and-redeem roundtrip (`uint128 amount`)
- `test/ERC6909Parking.t.sol` — 4 edge case tests:
  - Zero-amount park reverts
  - Over-redemption reverts with `InsufficientParked`
  - Multiple parks accumulate correctly
  - Different currencies tracked independently
- `test/ToxicFlowDetection.t.sol` — 13 tests:
  - `ToxicFlowLib.isToxic()` — 5 cases (not flagged, active, exact expiry, past, independence)
  - `ToxicFlowLib.computePenaltyFee()` — 5 cases + 1 fuzz (expired, exact, fresh, halfway, range)
  - `ReactiveArbitrageSensor.react()` — 5 cases (deploy, single swap, double swap callback, non-Swap ignored, different blocks, zero sender)

**Deployment Scripts**
- `script/Deploy.s.sol` — CREATE2 salt mining + deployment with configurable env vars
- `script/DeployUnichain.s.sol` — Unichain Sepolia–specific (chain ID 1301, known PoolManager)

**Sponsor Integration: Lit Protocol** (`integrations/lit-protocol/`)
- `lit-action.js` — Serverless Lit Action (IPFS) that:
  - Reads `toxicExpiry(user)` from Unichain on-chain
  - Enforces the 5-minute penalty window *before* signing the redemption tx
  - Threshold-signs `redeemParkedClaim(currency, amount)` via Lit PKP when eligible
- `redeem-with-lit.ts` — TypeScript CLI client for executing the Lit-gated redemption
- `integrations/lit-protocol/README.md` — Architecture and usage documentation
- `integrations/lit-protocol/package.json` — NPM dependencies (`@lit-protocol/lit-node-client`, `ethers v6`)

### Changed

- `README.md` — Complete rewrite:
  - Leading "front-running the front-runner" narrative (validated by judges)
  - v1 → v2 migration guide
  - Lit Protocol sponsor integration section (visible, demo-linked)
  - Architecture diagram with timing advantage illustration
  - Deploy and test quickstart for judges
- `.github/workflows/ci.yml` — Updated to include push trigger + new test files

### Unchanged (intentional)

- `src/Argos.sol` — v1 hook preserved intact; all 36 existing tests still pass
- `src/ReactiveSentry.sol` — v1 Reactive subscriber preserved
- `src/ArgosRiskAdapter.sol` — v1 adapter preserved
- `test/Argos.t.sol` — existing 36 tests unmodified
- `test/ReactiveE2E.t.sol` — existing E2E tests unmodified

### Why This Constitutes a Substantial Upgrade

Per PLGenesis Existing Code track rules, this submission includes:

| Requirement | Evidence |
|---|---|
| New open-source code published | 8 new Solidity files under MIT |
| Working source code (resolved judge complaint) | All contracts compilable via `forge build` |
| Comprehensive test suite | 14+ new tests, all passing |
| Clear changelog | This document |
| Sponsor bounty integration (visible in repo + demo) | `integrations/lit-protocol/` |
| New public functionality vs original | v2 hook with dual mode + address-level flagging |

---

## [1.0.0] — 2025-12-01 — Initial Submission

**Original PLGenesis submission.**

### Added
- `src/Argos.sol` — Uniswap V4 hook with pool-level risk states and ERC-6909 parking
- `src/ReactiveSentry.sol` — Reactive Network subscriber watching L1 Transfer events
- `src/ArgosRiskAdapter.sol` — Cross-chain callback bridge for risk state updates
- `test/Argos.t.sol` — 36 passing tests covering core hook functionality
- `test/ReactiveE2E.t.sol` — End-to-end Reactive pipeline simulation

### Known Issues (resolved in v2)
- Judge feedback: "Couldn't find smart contracts' source code" → source now fully published
- Pool-level (not address-level) toxic flagging (coarser granularity than v2)
