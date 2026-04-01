# Argos LTS × Lit Protocol — Decentralized Redemption Gate

This integration uses [Lit Protocol](https://developer.litprotocol.com/) as a **decentralized access control layer** for the ERC-6909 parking redemption flow.

## Why Lit Protocol?

When ArgosLTSHook parks a swap (toxic flag detected), the user's input tokens are safely held as ERC-6909 claims in Uniswap V4's PoolManager. The user can call `redeemParkedClaim()` at any time on-chain.

**The problem:** A smart attacker could attempt an immediate redemption even while still flagged — using a freshly sandwiched swap to park, then immediately redeeming to escape the LP damage they caused.

**The Lit solution:** A Lit Action (serverless JS running on Lit's TEE network) reads the on-chain `toxicExpiry[user]` before countersigning the redemption transaction. If the user is still within their 5-minute toxic window, the Lit PKP **refuses to sign**. Once the window expires, the Lit Action signs the tx automatically.

```
User wants to redeem parked claim
          │
          ▼
  Lit Action reads toxicExpiry[user] from Unichain
          │
    ┌─────┴──────────────────────────────────┐
    │ block.timestamp < toxicExpiry[user]?    │
    └─────┬──────────────────────────────────┘
          │ YES: "Penalty window active"       │ NO: Sign redeemParkedClaim()
          │    tx refused                      │    return signed tx to user
          ▼                                    ▼
   User waits / appeals              User submits to Unichain
```

## Setup

```bash
cd integrations/lit-protocol
npm install
```

## Configuration

```bash
cp .env.example .env
# Fill in:
#   ARGOS_HOOK_ADDRESS    — ArgosLTSHook on Unichain Sepolia
#   UNICHAIN_RPC_URL      — Unichain Sepolia RPC
#   USER_PRIVATE_KEY      — Your wallet private key
#   LIT_CAPACITY_CREDIT   — Optional: capacity credit NFT token ID
```

## Usage

```bash
# Check if you're eligible to redeem right now
npx ts-node redeem-with-lit.ts --currency 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 --amount 1000000000000000000 --check-only

# Execute the redemption via Lit Protocol
npx ts-node redeem-with-lit.ts --currency 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 --amount 1000000000000000000
```

## How It Works

1. **`lit-action.js`** — The Lit Action code stored on IPFS. This runs inside Lit's TEE network ({Threshold Signatures from distributed key shares}). It:
   - Receives the redemption intent (user address, currency, amount)
   - Calls `toxicExpiry(user)` view function on Unichain
   - If `expiry <= block.timestamp`: signs the `redeemParkedClaim(currency, amount)` calldata
   - If `expiry > block.timestamp`: throws an error with `window_elapsed_in = expiry - now`

2. **`redeem-with-lit.ts`** — TypeScript client that:
   - Connects to Lit's Chronicle Yellowstone network
   - Executes the Lit Action with the user's parameters
   - Submits the returned signed transaction to Unichain

## Sponsor Bounty Alignment (PLGenesis)

This integration was built for the **PLGenesis Frontiers of Collaboration Hackathon** to satisfy the integration depth requirement for the Crypto track:

- **Decentralized enforcement**: No single server decides redemption eligibility — Lit's distributed TSS network does.
- **Privacy-preserving checks**: The user's private key never leaves their browser; Lit signs on their behalf using threshold cryptography.
- **Composable**: Any frontend can invoke the same Lit Action CID to verify eligibility before showing the "Redeem" button.

Lit Action IPFS CID: `QmArgosLTSRedemptionGateV2` *(update after deployment)*
