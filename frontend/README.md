# Argos LTS — Demo Frontend

React + Vite demo UI for the Argos LTS Uniswap v4 hook.

## What this does

Demonstrates the full ERC-6909 parking and Lit-gated redemption flow against the live deployed contract on Unichain Sepolia:

- **Contract:** `0x4cD1d072fc30C5038c8F4163a2F3848f135fC088`
- **Network:** Unichain Sepolia (Chain ID 1301)
- **Verified:** [Blockscout ↗](https://unichain-sepolia.blockscout.com/address/0x4cD1d072fc30C5038c8F4163a2F3848f135fC088?tab=contract)

## Running locally

```bash
npm install
npm run dev
# Open http://localhost:5173
```

## See also

- [Root README](../README.md) — full project documentation, deployment info, and hackathon changelog
- [Lit Protocol integration](../integrations/lit-protocol/) — redemption gate source code
