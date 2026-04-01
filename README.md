# 🛡️ Argos LTS — Liquidity Toxic Shield

### *Front-running the front-runner. Protecting LPs before toxic flow ever lands.*

> **A Uniswap v4 hook on Unichain that detects toxic MEV arbitrage on Ethereum L1, intercepts the attack on Unichain before it executes, and parks risky swaps as ERC-6909 claims instead of reverting — with Lit Protocol gating trustless redemption.**

**Argos LTS** is an on-chain liquidity protection layer for Uniswap v4 pools on Unichain. It watches Ethereum Mainnet for sandwich attack patterns using the Reactive Network, flags attacker addresses before their Unichain swap lands, and silently intercepts their trade — converting it into a redeemable ERC-6909 claim rather than throwing a hard revert. LPs are shielded from toxic arbitrage drain. Users preserve their transaction value. And Lit Protocol ensures the redemption gate is decentralized, auditable, and trustless.

Built for DeFi protocols and LP operators who want MEV protection without sacrificing user experience.

[![CI](https://github.com/rainwaters11/argos/actions/workflows/ci.yml/badge.svg)](https://github.com/rainwaters11/argos/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.26-blue)](https://docs.soliditylang.org/)
[![Foundry](https://img.shields.io/badge/Built%20with-Foundry-black)](https://book.getfoundry.sh/)
[![Unichain Sepolia](https://img.shields.io/badge/Network-Unichain%20Sepolia-blueviolet)](https://unichain-sepolia.blockscout.com/address/0x4cD1d072fc30C5038c8F4163a2F3848f135fC088)

**Track:** Crypto — Onchain Economies / Consumer DeFi  
**Sponsor Integration:** Lit Protocol  
**Hackathon:** [PLGenesis Frontiers of Collaboration](https://plgenesis.devfolio.co/) — **Existing Code track**

---

## Why It Matters

- 🔴 **LPs are bleeding** — toxic MEV arbitrage drains value from every pool, every block
- ❌ **Hard reverts punish users** — cancelling a swap with `revert` wastes gas and destroys UX
- 🅿️ **Parking preserves value** — Argos intercepts risky swaps and holds tokens as ERC-6909 claims, safe on-chain, redeemable any time
- 🔐 **Lit Protocol makes redemption trustless** — no centralized server decides when you can redeem; a Lit Action running in a TEE reads on-chain state and countersigns the tx

---

## 🎬 Demo

📹 **[Watch the 3-minute walkthrough →](https://youtu.be/mhyES8E9KaM)**  
*Shows the full flow from toxic detection to Lit-gated redemption.*

The demo walks through:
1. Reactive Network detecting a sandwich pattern on L1 (block N)
2. `flagToxicAddress()` arriving on Unichain within the same block window
3. Arb's Unichain swap intercepted → tokens parked as an ERC-6909 claim (no revert)
4. Lit Protocol TEE enforcing the 5-minute toxic window
5. User successfully redeeming parked tokens after the window expires

---

## 🚀 Live Deployment

### ArgosLTSHook v2 — Unichain Sepolia (Chain ID 1301)

| Item | Value |
|---|---|
| **Network** | Unichain Sepolia (Chain ID 1301) |
| **ArgosLTSHook** | [`0x4cD1d072fc30C5038c8F4163a2F3848f135fC088`](https://unichain-sepolia.blockscout.com/address/0x4cD1d072fc30C5038c8F4163a2F3848f135fC088) |
| **Verified Contract** | [View on Blockscout ↗](https://unichain-sepolia.blockscout.com/address/0x4cD1d072fc30C5038c8F4163a2F3848f135fC088?tab=contract) |
| **Deploy Tx** | [`0xfdbf678c...d1d1721`](https://unichain-sepolia.blockscout.com/tx/0xfdbf678cf219a95fb4ff9975478f09fad4d2be15140604cd37fce21b8d1d1721) |
| **Deploy Block** | `48162660` |
| **Parking Enabled Tx** | [`0x940512...336f7`](https://unichain-sepolia.blockscout.com/tx/0x940512568e4145592cac5187ef790923bdcfea5ff53e7cf5dce6865f991336f7) |
| **Parking Enabled Block** | `48165069` |
| **Hook Flags** | `BEFORE_SWAP_FLAG \| BEFORE_SWAP_RETURNS_DELTA_FLAG` (`0x88`) |
| **PoolManager** | `0x00B036B58a818B1BC34d502D3fE730Db729e62AC` |

### Argos v1 (Original Submission — Preserved)

| Contract | Address |
|---|---|
| `Argos.sol` (v1 hook) | [`0xCd6606e077b271316d09De8521ADBE72f8eB4088`](https://unichain-sepolia.blockscout.com/address/0xCd6606e077b271316d09De8521ADBE72f8eB4088) |
| `ArgosRiskAdapter` | [`0x82EC3A310dF509A3bDe959DefBfeaa444Bb06a1B`](https://unichain-sepolia.blockscout.com/address/0x82EC3A310dF509A3bDe959DefBfeaa444Bb06a1B) |

---

## 🔧 How It Works

### 1 — Detection (Reactive Network)

`ReactiveArbitrageSensor` is a Reactive Smart Contract (RSC) that subscribes to Uniswap V3 `Swap` events on Ethereum Mainnet. When the same address sends **≥2 swaps in a single L1 block** (sandwich pattern), it dispatches a cross-chain callback to Unichain:

```
flagToxicAddress(arbAddress) → ArgosLTSHook on Unichain (chain ID 1301)
```

Unichain's 250ms Flashblock preconfirmations give us **~48 Unichain blocks** of advance warning before the arb's Unichain swap arrives — enough time to flag them first.

```
Ethereum L1      ████▓▓░░░░░░  12s per block
                 ┌─────────────────────────────────────────┐
Reactive Network │ detects sandwich pattern from L1 events  │── cross-chain callback
                 └─────────────────────────────────────────┘
                                        │
Unichain         ░░░░░░░░  250ms per block
                 │← ~48 blocks advance warning →│
                 ↓
         ArgosLTSHook.flagToxicAddress(arb) ← arrives BEFORE arb's swap
```

### 2 — Protection (Dual Hook Modes)

Once flagged, the next swap from that address on a protected pool triggers one of two responses:

**🅿️ PARK Mode** *(default — better UX)*  
The swap is intercepted without reverting. Input tokens are minted as an ERC-6909 claim in Uniswap V4's PoolManager. The user's transaction settles cleanly, tokens are safe on-chain, and they can redeem anytime via `redeemParkedClaim()`.

**💸 PENALIZE Mode** *(for dynamic-fee pools)*  
The swap executes, but the fee is overridden to 10%, routing the surplus to LPs as direct MEV compensation. The fee decays linearly back to 0.30% as the 5-minute toxic window expires.

### 3 — Redemption (Lit Protocol)

Parked claims are redeemable on-chain — but the recommended path uses a **Lit Action** running inside a TEE:

1. Reads `toxicExpiry(user)` from Unichain via on-chain RPC call inside the Lit node
2. Enforces the 5-minute toxic window — no early redemptions
3. Threshold-signs `redeemParkedClaim(currency, amount)` via Lit PKP if conditions pass
4. Submits the signed tx to Unichain — user never touches a private key for this step

---

## 🔐 Sponsor Integration: Lit Protocol

| | |
|---|---|
| **Sponsor** | Lit Protocol |
| **Integration files** | [`integrations/lit-protocol/`](./integrations/lit-protocol/) |
| **What Lit does** | Gates redemption of parked ERC-6909 claims by verifying on-chain conditions before releasing funds |
| **Why it matters** | No centralized server owns the gate — the Lit Action is published to IPFS and runs in a distributed TEE across Lit nodes |

**Integration depth:**
- `lit-action.js` — IPFS-hosted serverless action: reads `toxicExpiry(user)` on-chain, enforces the 5-minute window, threshold-signs the redemption tx via Lit PKP
- `redeem-with-lit.ts` — TypeScript CLI client (`@lit-protocol/lit-node-client`, `ethers v6`) with `--check-only` eligibility mode
- Inline fallback logic embedded in the action handler for demo reliability
- Tested end-to-end: check-only mode confirms eligibility; full mode broadcasts signed tx to Unichain

This directly enables the "fair redemption" story: a wrongly-flagged user has a transparent, auditable, decentralized path to reclaim their tokens — provably enforced by Lit's TSS network, not a dev's server.

---

## 📋 Hackathon Changelog

> **Required for Existing Code submissions.** The following changes were built during the PLGenesis hackathon event.

### v1 → v2 at a Glance

| Feature | v1 (Original) | v2 (PLGenesis — This Submission) |
|---|---|---|
| Toxic flagging granularity | Pool-level risk states | **Address-level** (`flagToxicAddress()`) |
| Bad swap handling | Hard revert | **ERC-6909 PARK mode** (no revert, tokens safe) |
| LP compensation | None | **PENALIZE mode** — 10% fee override with linear decay |
| Redemption gate | On-chain only | **Lit Protocol TEE** — decentralized, verifiable |
| Cross-chain detection | L1 Transfer events | **Sandwich pattern** — ≥2 swaps/block per sender |
| Test coverage | 36 tests | **63 tests** (+27 new, including fuzz) |
| Source code verified | ❌ | **✅ Blockscout verified** |
| Deployment scripts | None | **CREATE2 + Unichain Sepolia scripts** |
| Frontend | None | **React + Vite demo UI** |
| Sponsor integration | None | **Lit Protocol** (`integrations/lit-protocol/`) |

### v2.0.0 — PLGenesis Revamp (2026-03-31)

**Smart Contracts**
- [x] Deployed `ArgosLTSHook.sol` v2 to Unichain Sepolia (`0x4cD1d072fc30C5038c8F4163a2F3848f135fC088`)
- [x] Verified contract source code on Blockscout (resolves original judge feedback: "Couldn't find smart contracts' source code")
- [x] Implemented address-level toxic flagging (`flagToxicAddress()`) — more granular than v1's pool-level states
- [x] Implemented ERC-6909 **PARK mode** — swaps intercepted without hard revert, tokens held as claims
- [x] Implemented **PENALIZE mode** — dynamic fee override (base → 10%) with linear decay for dynamic-fee pools
- [x] Built `redeemParkedClaim()` with CEI-safe `poolManager.unlock()` callback pattern
- [x] Added `ReactiveArbitrageSensor.sol` — Reactive Network RSC detecting L1 sandwich patterns (≥2 swaps/block)
- [x] Extracted `ToxicFlowLib.sol` — pure library for `isToxic()` and `computePenaltyFee()` with linear decay
- [x] Added `IArgosLTS.sol` and `IReactiveSensor.sol` — fully NatSpec-documented interfaces
- [x] Enabled PARK mode on-chain via owner call (Tx: `0x940512...336f7`, Block: 48165069)

**Testing**
- [x] Added `test/ArgosLTSHook.t.sol` — 7 tests: passthrough, parking, redemption, expiry, PENALIZE, unauthorized sensor, fuzz roundtrip
- [x] Added `test/ERC6909Parking.t.sol` — 4 edge case tests: zero-amount, over-redemption, accumulation, multi-currency
- [x] Added `test/ToxicFlowDetection.t.sol` — 13 tests: library unit tests + sensor callback tests + fuzz
- [x] All 63 tests passing (`forge test -v`)

**Sponsor Integration**
- [x] Built `integrations/lit-protocol/lit-action.js` — IPFS-hosted Lit Action with on-chain state check and PKP signing
- [x] Built `integrations/lit-protocol/redeem-with-lit.ts` — TypeScript CLI client for Lit-gated redemption
- [x] Added inline Lit action fallback for demo reliability
- [x] Added `integrations/lit-protocol/README.md` — full architecture and usage docs

**Deployment & Infrastructure**
- [x] Added `script/Deploy.s.sol` — CREATE2 salt mining + multi-env deployment script
- [x] Added `script/DeployUnichain.s.sol` — Unichain Sepolia–specific deployment (chain ID 1301)
- [x] Added deployment metadata: tx hash, block numbers, deployer address, PoolManager address

**Frontend**
- [x] Built React + Vite demo frontend (`frontend/`) pointing to the live deployed hook
- [x] Frontend displays live contract address, deployment metadata, and redemption flow UX

**Documentation**
- [x] Rewrote `README.md` with full judge-oriented structure
- [x] Added `CHANGELOG.md` as explicit v1→v2 migration record
- [x] Added deployment table with Blockscout verified links and tx hashes

### v1.0.0 — Original Submission (2025-12-01)

- Original `Argos.sol` v1 hook (pool-level risk states, preserved intact)
- `ReactiveSentry.sol` and `ArgosRiskAdapter.sol` — v1 Reactive pipeline
- 36 passing tests in `test/Argos.t.sol`

See [CHANGELOG.md](./CHANGELOG.md) for the complete version history with diff-level detail.

---

## 📁 Repo Structure

```
Argos_LTS/
├── src/
│   ├── ArgosLTSHook.sol             # v2 hook — PLGenesis submission ★
│   ├── ReactiveArbitrageSensor.sol  # Reactive RSC: L1 sandwich detection ★
│   ├── Argos.sol                    # v1 hook (stable, preserved)
│   ├── ReactiveSentry.sol           # v1 Reactive subscriber
│   ├── ArgosRiskAdapter.sol         # v1 callback bridge
│   ├── interfaces/
│   │   ├── IArgosLTS.sol            # ★ New
│   │   └── IReactiveSensor.sol      # ★ New
│   └── libraries/
│       └── ToxicFlowLib.sol         # Pure detection + penalty math ★
├── test/
│   ├── ArgosLTSHook.t.sol           # v2 tests: 7 cases ★
│   ├── ERC6909Parking.t.sol         # ERC-6909 edge cases: 4 tests ★
│   ├── ToxicFlowDetection.t.sol     # Library + sensor: 13 tests ★
│   ├── Argos.t.sol                  # v1 tests: 36 passing (unchanged)
│   └── ReactiveE2E.t.sol            # v1 E2E (unchanged)
├── script/
│   ├── Deploy.s.sol                 # Generic deployment ★
│   └── DeployUnichain.s.sol         # Unichain Sepolia deployment ★
├── integrations/
│   └── lit-protocol/                # Sponsor bounty integration ★
│       ├── lit-action.js            # IPFS Lit Action — PKP signing gate
│       ├── redeem-with-lit.ts       # TypeScript CLI client
│       ├── README.md
│       └── package.json
├── frontend/                        # React + Vite demo UI ★
├── demo-video/                      # Demo recording assets
├── CHANGELOG.md                     # Full v1→v2 migration record ★
└── foundry.toml

★ = added during PLGenesis hackathon
```

---

## ⚡ Running Locally

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Node.js ≥ 18 (for Lit Protocol integration and frontend)

### Smart Contracts

```bash
git clone https://github.com/rainwaters11/argos
cd argos/Argos_LTS

forge install
forge build

# Run all 63 tests
forge test -v

# Run specific suites
forge test --match-path "test/ArgosLTSHook.t.sol" -v
forge test --match-path "test/ERC6909Parking.t.sol" -v
forge test --match-path "test/ToxicFlowDetection.t.sol" -v
```

**Expected output:**
```
Ran 36 tests for test/Argos.t.sol              ✅ 36 passed
Ran 7  tests for test/ArgosLTSHook.t.sol       ✅ 7  passed
Ran 4  tests for test/ERC6909Parking.t.sol     ✅ 4  passed
Ran 13 tests for test/ToxicFlowDetection.t.sol ✅ 13 passed
Ran 3  tests for test/ReactiveE2E.t.sol        ✅ 3  passed
─────────────────────────────────────────────────────────
Total: 63 tests, all passed
```

### Frontend Demo UI

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

### Lit Protocol Redemption Gate

```bash
cd integrations/lit-protocol
npm install

# Check redemption eligibility (read-only)
npx ts-node redeem-with-lit.ts \
  --currency 0xYourToken \
  --amount 1000000000000000000 \
  --check-only

# Execute Lit-gated redemption (signs via PKP if eligible)
npx ts-node redeem-with-lit.ts \
  --currency 0xYourToken \
  --amount 1000000000000000000
```

### Deploy to Unichain Sepolia

```bash
export UNICHAIN_SEPOLIA_RPC="https://sepolia.unichain.org"
export PRIVATE_KEY="0x..."
export OWNER="0x..."

forge script script/DeployUnichain.s.sol \
  --rpc-url $UNICHAIN_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

---

## 🔒 Security Notes

| Property | Implementation |
|---|---|
| Minimal permissions | Only `beforeSwap` + `beforeSwapReturnDelta` — no liquidity hooks |
| CEI pattern | `parkedClaims` decremented *before* `poolManager.unlock()` in `redeemParkedClaim()` |
| Exact-output rejection | PARK mode only supports exact-input swaps; exact-output reverts `UnsupportedParkMode` |
| Sensor authorization | `flagToxicAddress()` reverts `Unauthorized()` for any caller other than `reactiveSensor` |
| Int128 bounds | `amountIn` validated against `int128` bounds before `toBeforeSwapDelta()` |
| Dynamic fee guard | PENALIZE mode fee override only activates on pools initialized with `DYNAMIC_FEE_FLAG` |

---

## 📝 Notes

- The demo uses a **manual trigger** for the Lit redemption flow (for reliability). In production, the full reactive path runs automatically: L1 event → Reactive RSC → cross-chain callback → `flagToxicAddress()` on Unichain.
- The contract is **live and verified** on Unichain Sepolia — all code is inspectable on Blockscout.
- The original v1 contracts and all 36 tests are **preserved intact** — this is a purely additive upgrade.

---

*Built for [PLGenesis Frontiers of Collaboration Hackathon](https://plgenesis.devfolio.co/) — Crypto track.*  
*Existing Code track — substantial bounty-driven upgrade with source, 63 tests, and Lit Protocol sponsor integration.*