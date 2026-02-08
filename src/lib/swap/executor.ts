import { PublicKey } from '@solana/web3.js';
import { prisma } from '../db';
import { getConnection } from '../solana/connection';
import { getSponsorKeypair, validateSponsorSolvency } from '../solana/sponsor';
import {
  buildFeePaymentTransaction,
  prepareBridgeTransaction,
} from '../solana/transaction';
import { getProvider } from '../providers';
import { calculateFee } from '../fees/calculator';
import { getChainByChainId, USDC_MINT_DEFAULT, SOL_NATIVE_MINT } from '../constants';
import type { SwapRequest, SwapResult } from './types';
import type { Quote } from '../providers/types';

/**
 * Execute a sponsored swap. This:
 * 1. Validates the quote and sponsor solvency
 * 2. Creates a DB record
 * 3. Builds the fee payment transaction (partially signed by sponsor)
 * 4. Creates the bridge transaction via the provider
 * 5. Returns both transactions for the client to complete signing
 */
export async function executeSwap(request: SwapRequest): Promise<SwapResult> {
  const connection = getConnection();
  const sponsor = getSponsorKeypair();
  const provider = getProvider(request.selectedProvider);

  // Decode providerData
  const providerData = JSON.parse(
    Buffer.from(request.providerData, 'base64').toString('utf-8')
  );

  // Reconstruct quote for provider
  const inputAmount = BigInt(request.inputAmount);
  const quote: Quote = {
    provider: request.selectedProvider,
    inputAmount,
    estimatedOutputAmount: 0n, // Not needed for createTransaction
    minOutputAmount: 0n,
    providerFeeNative: 0n,
    providerFeeUsd: 0,
    estimatedTimeSeconds: 0,
    providerData,
    expiresAt: Date.now() + 30_000,
  };

  // Re-calculate fee server-side for safety
  const fee = await calculateFee(
    quote,
    request.userWallet,
    request.inputToken,
    inputAmount
  );

  // Drift protection: if recalculated fee is more than 10% higher than quoted, reject
  const quotedFee = BigInt(request.quotedFee);
  if (fee.totalFee > (quotedFee * 110n) / 100n) {
    throw new Error(
      'Fee has increased significantly since quote. Please request a new quote.'
    );
  }

  // Validate sponsor solvency
  const estimatedCostLamports =
    fee.components.solanaGasCost +
    fee.components.solanaRentCost +
    fee.components.providerFee +
    fee.components.fixedBuffer;
  await validateSponsorSolvency(estimatedCostLamports);

  // Determine chain name
  const chainInfo = getChainByChainId(request.destChainId);
  const destChainName = chainInfo?.name.toLowerCase() || `chain-${request.destChainId}`;

  // Create database record
  const swapRecord = await prisma.swapHistory.create({
    data: {
      walletAddress: request.userWallet,
      inputToken: request.inputToken,
      inputTokenSymbol: request.inputTokenSymbol,
      inputAmount: request.inputAmount,
      outputToken: request.outputToken,
      outputTokenSymbol: request.outputTokenSymbol,
      destChain: destChainName,
      destChainId: request.destChainId,
      provider: request.selectedProvider,
      sponsorFeePaid: fee.totalFee.toString(),
      feeToken: fee.feeToken,
      status: 'pending',
    },
  });

  try {
    // Build fee payment transaction
    const feeMint = new PublicKey(fee.feeMint);
    const feeMintDecimals = fee.feeToken === 'USDC' ? 6 : 9;

    const feePaymentTx = await buildFeePaymentTransaction({
      userWallet: new PublicKey(request.userWallet),
      sponsorPublicKey: sponsor.publicKey,
      feeAmount: fee.totalFee,
      feeToken: fee.feeToken,
      feeMint,
      feeMintDecimals,
      connection,
    });

    // Sponsor signs the fee payment tx (as fee payer)
    feePaymentTx.sign([sponsor]);

    // Create bridge transaction via provider
    const bridgeResult = await provider.createTransaction(quote);

    // Prepare bridge transaction (deserialize, update blockhash)
    const encoding =
      request.selectedProvider === 'debridge' ? 'hex' : 'base64';
    const bridgeTx = await prepareBridgeTransaction(
      bridgeResult.serializedTransaction,
      connection,
      encoding as 'base64' | 'hex'
    );

    // Update record with bridge order ID
    await prisma.swapHistory.update({
      where: { id: swapRecord.id },
      data: {
        bridgeOrderId: bridgeResult.orderId,
        status: 'fee_paid',
      },
    });

    return {
      swapId: swapRecord.id,
      feePaymentTx: Buffer.from(feePaymentTx.serialize()).toString('base64'),
      bridgeTx: Buffer.from(bridgeTx.serialize()).toString('base64'),
      bridgeOrderId: bridgeResult.orderId,
      status: 'fee_paid',
    };
  } catch (error) {
    await prisma.swapHistory.update({
      where: { id: swapRecord.id },
      data: {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
}
