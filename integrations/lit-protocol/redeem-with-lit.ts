/**
 * Argos LTS × Lit Protocol — Redemption Client
 *
 * Executes the Lit Action redemption gate and submits the signed tx to Unichain.
 *
 * USAGE:
 *   # Check eligibility only (no tx submitted)
 *   npx ts-node redeem-with-lit.ts --currency 0xA0b86... --amount 1000000000000000000 --check-only
 *
 *   # Execute redemption
 *   npx ts-node redeem-with-lit.ts --currency 0xA0b86... --amount 1000000000000000000
 *
 * ENVIRONMENT (see .env.example):
 *   ARGOS_HOOK_ADDRESS   — ArgosLTSHook deployed on Unichain Sepolia
 *   UNICHAIN_RPC_URL     — Unichain Sepolia RPC
 *   USER_PRIVATE_KEY     — Your wallet private key (never sent to Lit; used for auth)
 *   LIT_ACTION_CID       — IPFS CID of lit-action.js after pinning to IPFS
 */

import * as dotenv from "dotenv";
dotenv.config();

import { LitNodeClient } from "@lit-protocol/lit-node-client";
import { LitNetwork, LIT_ABILITY } from "@lit-protocol/constants";
import {
  createSiweMessage,
  generateAuthSig,
  LitActionResource,
  LitPKPResource,
} from "@lit-protocol/auth-helpers";
import { ethers } from "ethers";

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const ARGOS_HOOK_ADDRESS = process.env.ARGOS_HOOK_ADDRESS || "";
const UNICHAIN_RPC_URL = process.env.UNICHAIN_RPC_URL || "https://sepolia.unichain.org";
const USER_PRIVATE_KEY = process.env.USER_PRIVATE_KEY || "";
const LIT_ACTION_CID = process.env.LIT_ACTION_CID || "QmArgosLTSRedemptionGateV2"; // pin lit-action.js to IPFS
const UNICHAIN_CHAIN_ID = 1301;

// Parse CLI flags
const args = process.argv.slice(2);
const CHECK_ONLY = args.includes("--check-only");
const currencyIdx = args.indexOf("--currency");
const amountIdx = args.indexOf("--amount");

if (currencyIdx === -1 || amountIdx === -1) {
  console.error("Usage: ts-node redeem-with-lit.ts --currency <address> --amount <wei>");
  process.exit(1);
}

const CURRENCY = args[currencyIdx + 1];
const AMOUNT = args[amountIdx + 1];

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=== Argos LTS × Lit Protocol Redemption Gate ===");
  console.log("Hook:    ", ARGOS_HOOK_ADDRESS);
  console.log("Currency:", CURRENCY);
  console.log("Amount:  ", AMOUNT, "wei");
  console.log("");

  const wallet = new ethers.Wallet(USER_PRIVATE_KEY);
  const provider = new ethers.JsonRpcProvider(UNICHAIN_RPC_URL);
  const userAddress = wallet.address;

  // ── Quick on-chain pre-check ─────────────────────────────────────────────
  const argosAbi = [
    "function toxicExpiry(address) external view returns (uint256)",
    "function parkedClaims(address, uint256) external view returns (uint256)",
  ];
  const argosHook = new ethers.Contract(ARGOS_HOOK_ADDRESS, argosAbi, provider);

  const expiry: bigint = await argosHook.toxicExpiry(userAddress);
  const now = BigInt(Math.floor(Date.now() / 1000));
  const currencyId = BigInt(CURRENCY);
  const parked: bigint = await argosHook.parkedClaims(userAddress, currencyId);

  console.log("On-chain state:");
  console.log("  toxicExpiry:   ", expiry.toString(), expiry > now ? `🔴 ACTIVE (${Number(expiry - now)}s remaining)` : "✅ EXPIRED");
  console.log("  parkedClaims:  ", parked.toString(), "wei");
  console.log("");

  if (expiry > now) {
    console.error(
      `❌ Cannot redeem — toxic window still active.\n` +
      `   Expires in ${Number(expiry - now)} seconds (at Unix ${expiry}).\n` +
      `   Your ${parked.toString()} wei is safe in PoolManager.\n` +
      `   Wait for the 5-minute window (${new Date(Number(expiry) * 1000).toISOString()}) and retry.`
    );
    process.exit(1);
  }

  if (parked < BigInt(AMOUNT)) {
    console.error(
      `❌ Insufficient parked claims. Have ${parked} wei, requested ${AMOUNT} wei.`
    );
    process.exit(1);
  }

  console.log("✅ Pre-check passed. Connecting to Lit Network...");

  if (CHECK_ONLY) {
    console.log("✅ Eligibility check complete (--check-only mode). No tx submitted.");
    return;
  }

  // ── Connect to Lit Network ────────────────────────────────────────────────
  const litClient = new LitNodeClient({
    litNetwork: LitNetwork.DatilDev, // development Lit network
    debug: false,
  });
  await litClient.connect();

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const latestBlock = await provider.getBlock("latest");
    const sessionSigs = await litClient.getSessionSigs({
      chain: "unichain",
      expiration: new Date(Date.now() + 1000 * 60 * 15).toISOString(), // 15 min
      resourceAbilityRequests: [
        {
          resource: new LitActionResource(LIT_ACTION_CID),
          ability: LIT_ABILITY.LitActionExecution,
        },
      ],
      authNeededCallback: async ({ uri, expiration, resourceAbilityRequests }) => {
        const message = await createSiweMessage({
          uri,
          expiration,
          resources: resourceAbilityRequests,
          walletAddress: userAddress,
          nonce: await litClient.getLatestBlockhash(),
          litNodeClient: litClient,
        });
        return generateAuthSig({ signer: wallet, toSign: message });
      },
    });

    // ── Execute Lit Action ─────────────────────────────────────────────────
    console.log("Executing Lit Action (threshold check + signing)...");
    const response = await litClient.executeJs({
      ipfsId: LIT_ACTION_CID,
      sessionSigs,
      jsParams: {
        userAddress,
        currency: CURRENCY,
        amount: AMOUNT,
        argosHookAddress: ARGOS_HOOK_ADDRESS,
        unichainRpcUrl: UNICHAIN_RPC_URL,
        toAddress: ARGOS_HOOK_ADDRESS,
        publicKey: "", // PKP public key — populated by Lit Protocol at runtime
      },
    });

    const result = JSON.parse(response.response as string);

    if (!result.success) {
      console.error("❌ Lit Action rejected redemption:", result.error);
      process.exit(1);
    }

    console.log("✅ Lit Network signed the redemption transaction.");
    console.log("   Signed tx:", result.signedTx.slice(0, 40) + "...");

    // ── Submit to Unichain ─────────────────────────────────────────────────
    console.log("Submitting tx to Unichain Sepolia...");
    const txResponse = await provider.broadcastTransaction(result.signedTx);

    console.log("✅ Redeemed! Transaction hash:", txResponse.hash);
    console.log(
      `   View on Blockscout: https://unichain-sepolia.blockscout.com/tx/${txResponse.hash}`
    );

    const receipt = await txResponse.wait();
    console.log("✅ Transaction confirmed in block:", receipt?.blockNumber);

  } finally {
    await litClient.disconnect();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
