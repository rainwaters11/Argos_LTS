# 🛡️ Argos: The Reactive Sentry

**Multi-Signal Reactive Protection for Unichain Liquidity**

Argos is a Uniswap v4 hook built for specialized markets on Unichain. It protects Liquid Staking Token (LST) pools and exact-input swappers during unsafe conditions by combining local execution guardrails with cross-chain risk signaling.

## 🏆 Hackathon Tracks & Sponsor Integrations

Argos is designed for the UHI8 **Specialized Markets / Asset-Class Specific Liquidity** theme and showcases both chain-native execution and cross-chain protection.

### 🦄 Unichain: High-Speed Execution

Argos is deployed on **Unichain Sepolia**. It is designed around Unichain’s **200ms Flashblock preconfirmations**, enabling fast response to unsafe market conditions and low-latency user feedback.

### ⚡ Reactive Network: Cross-Chain Risk Signaling

Argos uses a Reactive-compatible monitoring and callback architecture to watch origin-chain risk signals and map them into Unichain-side market protection updates through a destination-side adapter.

---

## ⚙️ How It Works: Cross-Chain Protection Flow

Argos operates on a push-based risk model, bridging **Ethereum Sepolia** event signals to **Unichain Sepolia** execution.

1. **The Trigger (Ethereum Sepolia):** A simulated whale dump of mLST threatens market safety.
2. **The Sentry (Reactive Architecture):** `ReactiveSentry` detects the origin-chain `Transfer` event and prepares a cross-chain callback payload.
3. **The Relay (Unichain Sepolia):** `ArgosRiskAdapter` receives the callback path and securely maps it into `Argos.applyRiskUpdate(...)` for the live Uniswap v4 pool.
4. **The Protection (Argos Hook):** The next unsafe swap can be restricted, blocked, or parked via the hook’s `beforeSwap` / `beforeSwapReturnDelta` protection logic.

For unsafe exact-input conditions, Argos can return a non-zero `BeforeSwapDelta`, mint ERC-6909 claims through `PoolManager`, and preserve user intent on-chain for later fulfillment.

---

## 📦 Deployment Artifacts

All contracts are deployed on **Unichain Sepolia** (Chain ID `1301`).

## 🎥 Demo Video

[Link to your 2-minute Loom or YouTube demo]

### Contracts

| Contract | Address |
|---|---|
| Argos hook | [`0xCd6606e077b271316d09De8521ADBE72f8eB4088`](https://sepolia.uniscan.xyz/address/0xCd6606e077b271316d09De8521ADBE72f8eB4088) |
| ArgosRiskAdapter | [`0x82EC3A310dF509A3bDe959DefBfeaa444Bb06a1B`](https://sepolia.uniscan.xyz/address/0x82EC3A310dF509A3bDe959DefBfeaa444Bb06a1B) |
| Mock LST (mLST) | [`0x1b46779584a8BFaE6F77418F6c3024FBA9e7B92a`](https://sepolia.uniscan.xyz/address/0x1b46779584a8BFaE6F77418F6c3024FBA9e7B92a) |
| Mock WETH (mWETH) | [`0xA740013D461B6EEE7E774CAd7f5d049919AC801B`](https://sepolia.uniscan.xyz/address/0xA740013D461B6EEE7E774CAd7f5d049919AC801B) |

**Hook permissions:** `BEFORE_SWAP_FLAG | BEFORE_SWAP_RETURNS_DELTA_FLAG` (bitmask `136`)

### Demo Pool

| Parameter | Value |
|---|---|
| Pool ID | `0xc729b4764ab9a33ec1992c9e506f4f3e3ab9ec29e89833a57eba92e41eebf21e` |
| currency0 | `0x1b46779584a8BFaE6F77418F6c3024FBA9e7B92a` (mLST) |
| currency1 | `0xA740013D461B6EEE7E774CAd7f5d049919AC801B` (mWETH) |
| fee | `3000` (0.30%) |
| tickSpacing | `60` |
| Starting price | `1:1` (`sqrtPriceX96 = 2^96`) |
| Initial liquidity | `10,000 mLST + 10,000 mWETH`, ticks `-45,000 → +45,000` |
| Risk state | `Safe`, enabled |

### Deployment & Setup Transactions

| Action | Tx Hash | Block |
|---|---|---|
| Deploy mWETH | [`0xdf6453bf...`](https://sepolia.uniscan.xyz/tx/0xdf6453bf2070583431f7af9c9bdd50ac0876b57fa7ecb578706f07346639843f) | `46739812` |
| Deploy mLST | [`0x8b36c4bf...`](https://sepolia.uniscan.xyz/tx/0x8b36c4bff34da03d785cc13b455725a9d6cacf9d0e32515dd9a37d54ca21f1aa) | `46739812` |
| Pool init + seed liquidity (multicall) | [`0x0bd0058b...`](https://sepolia.uniscan.xyz/tx/0x0bd0058b1bb3efb72d37aa61dc36bc336e8dcc3087dc1c8aa517e32ace084c4f) | `46739974` |
| `configureMarket` (enabled, Safe) | [`0x69497627...`](https://sepolia.uniscan.xyz/tx/0x6949762f3b06c8fab1212c41f40ea06165c5db5855c473083b48240703926ac5) | `46740065` |
| `setRiskController` → adapter | [`0x41892685...`](https://sepolia.uniscan.xyz/tx/0x41892685f69ccca6d1c3cf7d1a850eceb48c63e1f302f2a5897e5097c8a86611) | `46740098` |
| `setApprovedPool` → demo pool | [`0xbe710d77...`](https://sepolia.uniscan.xyz/tx/0xbe710d77dcf721e8aa3ff4bde73b6eca88f3c03014565c208c1208ea81bbf428) | `46740098` |

### End-to-End Protection Demo

The live demo proves the destination-side protection path with a **simulated Reactive callback delivery** on Unichain Sepolia.

| Action | Tx Hash | Block |
|---|---|---|
| `applyReactiveRiskSignal` → `Blocked` | [`0xa2aef720...`](https://sepolia.uniscan.xyz/tx/0xa2aef720ddb32b7eba77ff1a27515aecb4b03b32a37c4adae690319df9d0c5fc) | `46741627` |
| `applyRiskUpdate` → `Safe` reset | [`0x6735114c...`](https://sepolia.uniscan.xyz/tx/0x6735114cf9f5fb887c21d8302e5be721832ae78d77ebe9a76bcab8d6e3c3a1e4) | `46741627` |

### Verified State

```text
Argos.riskController()                  → 0x82EC3A310dF509A3bDe959DefBfeaa444Bb06a1B
ArgosRiskAdapter.approvedPools(poolId)  → true
Argos.getMarketConfig(poolKey)          → (enabled=true, riskState=Safe, maxAbsAmount=0)
🔐 Security & Architecture

Argos follows a narrow-scope, security-first hook design.

Minimal Permissions: only beforeSwap and beforeSwapReturnDelta

Exact-Output Protection: exact-output parking is rejected

Single Active Park Per Sender/Pool: duplicate parked intents are blocked

Wrapped Revert Coverage: tests assert real wrapped revert behavior through the v4 execution path

Reactive-Compatible Adapter Path: destination-side callback handling is separated from hook core logic

Test Suite: update this line to your current total passing test count

Argos is built on OpenZeppelin’s Uniswap Hooks BaseHook, which validates hook permissions against the deployed address, and the hooks library includes support for asynchronous swaps and ERC-6909-based custom accounting patterns.

💻 Local Quickstart
forge install
forge test -vvv
forge script script/SimulateReactiveDemo.s.sol -vvvv


*Built for the Uniswap Hook Incubator (UHI8).*