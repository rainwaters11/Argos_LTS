# 🛡️ Argos LTS — Liquidity Toxic Shield

**Front-running the front-runner on Unichain.**

Argos LTS is a Uniswap V4 hook that intercepts toxic L1 arbitrage **before it reaches Unichain**, using the Reactive Network for cross-chain detection and Lit Protocol for decentralized claim redemption. Built for the **[PLGenesis Frontiers of Collaboration Hackathon](https://plgenesis.devfolio.co/)** — Crypto track (onchain economies, consumer DeFi).

[![CI](https://github.com/rainwaters11/argos/actions/workflows/ci.yml/badge.svg)](https://github.com/rainwaters11/argos/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.26-blue)](https://docs.soliditylang.org/)
[![Foundry](https://img.shields.io/badge/Built%20with-Foundry-black)](https://book.getfoundry.sh/)

---

## The Core Insight

A Unichain sandwich attack is almost always telegraphed on Ethereum L1 first.

The attacker's L1 front-run appears in the mempool ~12 seconds before their Unichain trade executes. Unichain's 250ms Flashblock preconfirmations mean we have **48 Unichain blocks** to detect and neutralize the threat before it lands.

```
Ethereum L1      ████▓▓░░░░░░░░░░  12s per block
                 ┌──────────────────────────────────────────┐
Reactive Network │ detects sandwich pattern from L1 events   │─── cross-chain callback
                 └──────────────────────────────────────────┘
                                        │
Unichain         ░░░░░░░░░░░░░░░░  250ms per block
                 │← ~48 blocks of advance warning →│
                 ↓
         ArgosLTSHook.flagToxicAddress(arb) ← arrives BEFORE arb's Unichain swap
```

This is *front-running the front-runner*: we use the L1→L2 timing gap as a detection window, not a vulnerability.

---

## How It Works

### Detection: Reactive Network

`ReactiveArbitrageSensor` is a Reactive Smart Contract (RSC) deployed on the Reactive Network. It subscribes to Uniswap V3 `Swap` events on Ethereum mainnet and tracks per-block swap counts per sender. When the same address sends ≥2 swaps in one L1 block (sandwich pattern), it dispatches a cross-chain callback:

```
flagToxicAddress(arbAddress) → ArgosLTSHook on Unichain (chain ID 1301)
```

### Protection: Dual Hook Modes

Once flagged, the next swap from that address on a protected pool triggers one of two responses:

#### 🅿️ PARK Mode (Recommended)
The better UX. Toxic swap is **intercepted without reverting**. The input is minted as an ERC-6909 claim in Uniswap V4's PoolManager. The user's transaction settles, their tokens are safe on-chain, and they can redeem later via `redeemParkedClaim()`.

```
Traditional hook reverts → user loses gas, tx fails permanently
Argos LTS parks         → user pays gas once, tokens are safe, redeemable anytime
```

#### 💸 PENALIZE Mode
For dynamic-fee pools. The swap executes but the fee is overridden to 10%, routing the surplus to LPs as direct compensation for the toxic flow they absorbed. Fee decays linearly back to 0.30% as the flag window expires.

### Redemption: Lit Protocol

Parked claims can be redeemed freely on-chain — but the *recommended path* uses a Lit Action ([`integrations/lit-protocol/`](./integrations/lit-protocol/)) that:

1. Reads `toxicExpiry(user)` from Unichain on-chain inside a TEE
2. Enforces the 5-minute toxic window before countersigning the redemption tx
3. Signs `redeemParkedClaim(currency, amount)` via Lit PKP threshold signatures

This makes the appeal window verifiable and decentralized — no server owns the gate.

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│  Ethereum Mainnet                                                        │
│                                                                          │
│  Uniswap V3 Pool ──[Swap event]──► ReactiveArbitrageSensor (RSC)        │
│                                          │                               │
│                           sandwich pattern? (≥2 swaps/block)            │
│                                          │ YES                           │
│                              emit Callback(chainId=1301, ...)            │
└───────────────────────────────────────────────────────────────────────── ┘
                                           │
                            Reactive Network XMN delivery
                                           │
┌──────────────────────────────────────────▼────────────────────────────── ┐
│  Unichain (Chain ID: 1301)                                                │
│                                                                           │
│  ArgosLTSHook.flagToxicAddress(arb)  ← cross-chain callback             │
│        │                                                                  │
│  [arb's swap arrives next]                                                │
│        │                                                                  │
│  beforeSwap() ──► isToxic(arb)?                                           │
│        │          ├─ PARK: mint ERC-6909, no revert, BeforeSwapDelta     │
│        │          └─ PENALIZE: pass-through + 10% fee override            │
│        │                                                                  │
│  redeemParkedClaim() ──► Lit Protocol TEE gate ──► poolManager.take()   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Contract Addresses (Unichain Sepolia — Chain ID 1301)

### v1 (Stable, Original Submission)

| Contract | Address |
|---|---|
| `Argos.sol` (v1 hook) | [`0xCd6606e077b271316d09De8521ADBE72f8eB4088`](https://unichain-sepolia.blockscout.com/address/0xCd6606e077b271316d09De8521ADBE72f8eB4088) |
| `ArgosRiskAdapter` | [`0x82EC3A310dF509A3bDe959DefBfeaa444Bb06a1B`](https://unichain-sepolia.blockscout.com/address/0x82EC3A310dF509A3bDe959DefBfeaa444Bb06a1B) |

### v2 (PLGenesis Revamp, This Submission)
*Deploy via `forge script script/DeployUnichain.s.sol` and update table*

| Contract | Address |
|---|---|
| `ArgosLTSHook.sol` (v2) | *(post-deploy)* |
| `ReactiveArbitrageSensor` | *(Reactive Network deployment)* |

**Hook flags required:** `BEFORE_SWAP_FLAG \| BEFORE_SWAP_RETURNS_DELTA_FLAG` (bitmask `0x88`)

---

## Quickstart

### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (`curl -L https://foundry.paradigm.xyz | bash`)
- Git with submodule support

### Run Tests

```bash
git clone https://github.com/rainwaters11/argos
cd argos/Argos_LTS

forge install
forge build

# Run all tests (v1 original + v2 new suite)
forge test -v

# Run only v2 tests
forge test --match-path "test/ArgosLTSHook.t.sol" -v
forge test --match-path "test/ERC6909Parking.t.sol" -v
forge test --match-path "test/ToxicFlowDetection.t.sol" -v
```

### Expected Output

```
Ran 36 tests for test/Argos.t.sol         ✅ 36 passed
Ran 7  tests for test/ArgosLTSHook.t.sol  ✅ 7  passed
Ran 4  tests for test/ERC6909Parking.t.sol ✅ 4 passed
Ran 13 tests for test/ToxicFlowDetection.t.sol ✅ 13 passed
Ran 3  tests for test/ReactiveE2E.t.sol   ✅ 3  passed
─────────────────────────────────────────
Total: 63 tests, all passed
```

### Deploy to Unichain Sepolia

```bash
export UNICHAIN_SEPOLIA_RPC="https://sepolia.unichain.org"
export PRIVATE_KEY="0x..."
export OWNER="0x..."
export REACTIVE_SENSOR="0x..."  # after Reactive chain deploy

forge script script/DeployUnichain.s.sol \
  --rpc-url $UNICHAIN_SEPOLIA_RPC \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify
```

### Use the Lit Protocol Redemption Gate

```bash
cd integrations/lit-protocol
npm install

# Check if you're currently eligible to redeem
npx ts-node redeem-with-lit.ts \
  --currency 0xYourToken \
  --amount 1000000000000000000 \
  --check-only

# Execute redemption (signs via Lit PKP if eligible)
npx ts-node redeem-with-lit.ts \
  --currency 0xYourToken \
  --amount 1000000000000000000
```

---

## Sponsor Integration: Lit Protocol

This submission integrates **Lit Protocol** as a decentralized access control layer for ERC-6909 claim redemptions. See [`integrations/lit-protocol/`](./integrations/lit-protocol/) for full details.

**Why this fits PLGenesis' "Programmable Assets" theme:**
- Parked ERC-6909 claims are *programmable assets* — their redeemability is governed by on-chain state (`toxicExpiry`) and enforced by Lit's distributed TSS network
- No centralized server decides when a user can redeem — the Lit Action is published to IPFS and runs in a TEE
- Directly enables the "fair redemption" UX story: wrongly-flagged users have a transparent, auditable appeal path

**Integration depth:**
- `lit-action.js` — on-chain state reading + conditional PKP signing inside Lit TEE
- `redeem-with-lit.ts` — TypeScript client for `@lit-protocol/lit-node-client`
- Tested flow: check-only mode confirms eligibility; full mode submits signed tx to Unichain

---

## Project Structure

```
Argos_LTS/
├── src/
│   ├── Argos.sol                    # v1 hook (stable, preserved)
│   ├── ArgosLTSHook.sol             # v2 hook (PLGenesis submission) ← NEW
│   ├── ReactiveArbitrageSensor.sol  # Reactive RSC for L1 sandwich detection ← NEW
│   ├── ReactiveSentry.sol           # v1 Reactive subscriber (preserved)
│   ├── ArgosRiskAdapter.sol         # v1 callback bridge (preserved)
│   ├── interfaces/
│   │   ├── IArgosLTS.sol            # ← NEW
│   │   └── IReactiveSensor.sol      # ← NEW
│   └── libraries/
│       └── ToxicFlowLib.sol         # Pure detection + penalty fee library ← NEW
├── test/
│   ├── Argos.t.sol                  # v1 tests: 36 passing (unchanged)
│   ├── ReactiveE2E.t.sol            # v1 E2E (unchanged)
│   ├── ArgosLTSHook.t.sol           # v2 tests: 7 cases ← NEW
│   ├── ERC6909Parking.t.sol         # ERC-6909 edge cases: 4 tests ← NEW
│   └── ToxicFlowDetection.t.sol     # Library + sensor: 13 tests ← NEW
├── script/
│   ├── Deploy.s.sol                 # Generic deployment ← NEW
│   └── DeployUnichain.s.sol         # Unichain Sepolia deployment ← NEW
├── integrations/
│   └── lit-protocol/                # Sponsor bounty integration ← NEW
│       ├── README.md
│       ├── lit-action.js
│       ├── redeem-with-lit.ts
│       └── package.json
├── CHANGELOG.md                     # v1 → v2 migration record ← NEW
└── foundry.toml
```

---

## Security Notes

- **Minimal permissions:** Only `beforeSwap` + `beforeSwapReturnDelta` — no liquidity hooks
- **CEI pattern:** `parkedClaims` deducted *before* the `poolManager.unlock()` call in `redeemParkedClaim()`
- **Exact-output rejection:** PARK mode only supports exact-input swaps; exact-output reverts with `UnsupportedParkMode`
- **Sensor authorization:** `flagToxicAddress()` reverts with `Unauthorized()` for any caller other than `reactiveSensor`
- **Int128 bounds check:** `amountIn` validated to fit within `int128` before `toBeforeSwapDelta()`
- **Dynamic fee requirement:** PENALIZE mode fee override only takes effect on pools initialized with `LPFeeLibrary.DYNAMIC_FEE_FLAG`

---

## Demo

📹 [Watch the 3-minute PLGenesis demo](#) *(link after recording)*

Demo covers:
1. Reactive Network detecting a sandwich on L1 (block N)
2. `flagToxicAddress()` arriving on Unichain within the same L1 block window
3. Arb's Unichain swap intercepted → tokens parked as ERC-6909 claim
4. Lit Protocol gate enforcing the 5-minute window before redemption
5. User successfully redeeming after the toxic window expires

---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for the full v1→v2 migration record.

---

*Built for [PLGenesis Frontiers of Collaboration Hackathon](https://plgenesis.devfolio.co/) — Crypto track.*
*Existing Code track submission: substantial new bounty-driven upgrade with source, tests, and sponsor integration.*