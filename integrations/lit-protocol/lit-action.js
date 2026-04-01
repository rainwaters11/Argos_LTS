/**
 * Argos LTS — Lit Protocol Redemption Gate Action
 *
 * This Lit Action runs inside the Lit Protocol TEE (Trusted Execution Environment)
 * and acts as a decentralized gatekeeper for ERC-6909 parked claim redemptions.
 *
 * HOW IT WORKS:
 *   1. Receives the user's address, target currency, and amount from the client.
 *   2. Reads `toxicExpiry(userAddress)` from the ArgosLTSHook contract on Unichain.
 *   3. If the toxic window is still active → throws (PKP refuses to sign).
 *   4. If the window has elapsed → signs the `redeemParkedClaim(currency, amount)` calldata.
 *
 * The Lit Action is signed and published to IPFS. Its CID is the immutable identifier
 * used by the client (redeem-with-lit.ts) to execute it via the Lit Node network.
 *
 * INPUTS (passed as jsParams from the client):
 *   - userAddress      {string}  — The user's Ethereum address
 *   - currency         {string}  — ERC-20 token address of the parked currency
 *   - amount           {string}  — Amount in wei (as decimal string)
 *   - argosHookAddress {string}  — ArgosLTSHook contract address on Unichain
 *   - unichainRpcUrl   {string}  — Unichain Sepolia or mainnet RPC URL
 *   - toAddress        {string}  — Hook address to send the tx to (same as argosHookAddress)
 *
 * OUTPUTS:
 *   - Lit PKP signature over the `redeemParkedClaim(currency, amount)` tx
 *   - Reverts (throws) if the user is still within their toxic window
 */

// Lit Actions have access to a minimal ethers-compatible environment
const go = async () => {
  // ── Read toxic expiry from on-chain ────────────────────────────────────────
  const provider = new ethers.providers.JsonRpcProvider(unichainRpcUrl);

  // ABI for the two functions we need
  const argosAbi = [
    "function toxicExpiry(address) external view returns (uint256)",
    "function parkedClaims(address, uint256) external view returns (uint256)",
    "function redeemParkedClaim(address currency, uint256 amount) external",
  ];

  const argosHook = new ethers.Contract(argosHookAddress, argosAbi, provider);

  // Check current block timestamp
  const latestBlock = await provider.getBlock("latest");
  const now = latestBlock.timestamp;

  // Check if address is still within toxic window
  const expiry = await argosHook.toxicExpiry(userAddress);
  const expiryNum = expiry.toNumber();

  if (expiryNum > now) {
    const secondsRemaining = expiryNum - now;
    throw new Error(
      `Toxic window still active. Cannot redeem for ${secondsRemaining} more second(s). ` +
      `Window expires at Unix timestamp ${expiryNum}. ` +
      `This is the Argos LTS penalty period — your tokens are safe and will be ` +
      `fully redeemable once the 5-minute window elapses.`
    );
  }

  // ── Verify the user actually has a parked claim ────────────────────────────
  // Compute currencyId from token address (packed into uint256)
  const currencyId = ethers.BigNumber.from(currency);
  const parkedAmount = await argosHook.parkedClaims(userAddress, currencyId);

  if (parkedAmount.lt(ethers.BigNumber.from(amount))) {
    throw new Error(
      `Insufficient parked claim. Have ${parkedAmount.toString()} wei, requested ${amount} wei.`
    );
  }

  // ── Sign the redemption transaction ───────────────────────────────────────
  // Encode redeemParkedClaim(currency, amount) calldata
  const iface = new ethers.utils.Interface(argosAbi);
  const calldata = iface.encodeFunctionData("redeemParkedClaim", [currency, amount]);

  // Get the nonce for the user's address (via PKP address)
  const nonce = await provider.getTransactionCount(Lit.Actions.pubkeyToAddress(publicKey));

  // Get current gas price on Unichain
  const feeData = await provider.getFeeData();
  const maxFeePerGas = feeData.maxFeePerGas || ethers.utils.parseUnits("1", "gwei");
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas || ethers.utils.parseUnits("0.1", "gwei");

  // Build EIP-1559 transaction
  const tx = {
    to: toAddress,
    data: calldata,
    value: 0,
    nonce: nonce,
    chainId: 1301, // Unichain Sepolia
    gasLimit: 200000,
    maxFeePerGas: maxFeePerGas,
    maxPriorityFeePerGas: maxPriorityFeePerGas,
    type: 2,
  };

  // Serialize the tx for signing
  const serialized = ethers.utils.serializeTransaction(tx);
  const txHash = ethers.utils.keccak256(serialized);

  // Request PKP signature from Lit Network nodes (threshold signing)
  const sigShare = await Lit.Actions.signEcdsa({
    toSign: ethers.utils.arrayify(txHash),
    publicKey: publicKey,
    sigName: "argosLTSRedemption",
  });

  // Return the response to the client
  Lit.Actions.setResponse({
    response: JSON.stringify({
      success: true,
      txHash: txHash,
      tx: tx,
      signedTx: ethers.utils.serializeTransaction(tx, sigShare),
      userAddress: userAddress,
      currency: currency,
      amount: amount,
      parkedAmount: parkedAmount.toString(),
      toxicWindowElapsed: true,
    }),
  });
};

go().catch((error) => {
  Lit.Actions.setResponse({
    response: JSON.stringify({
      success: false,
      error: error.message,
    }),
  });
});
