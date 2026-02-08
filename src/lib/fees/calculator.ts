import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getConnection } from '../solana/connection';
import { getSponsorPublicKey } from '../solana/sponsor';
import { getOrCreateATAInstruction, getTokenBalance } from '../solana/token';
import {
  SOLANA_BASE_TX_FEE,
  SOLANA_PRIORITY_FEE_ESTIMATE,
  SOLANA_ATA_RENT,
  USDC_MINT_DEFAULT,
  SOL_NATIVE_MINT,
  SOL_PRICE_CACHE_TTL_MS,
} from '../constants';
import { getConfig } from '../config';
import type { Quote } from '../providers/types';
import type { FeeBreakdown } from './types';

// SOL price cache
let cachedSolPrice: { price: number; fetchedAt: number } | null = null;

/**
 * Fetch current SOL/USDC price from Jupiter price API.
 * Cached for SOL_PRICE_CACHE_TTL_MS.
 */
export async function fetchSolPrice(): Promise<number> {
  if (
    cachedSolPrice &&
    Date.now() - cachedSolPrice.fetchedAt < SOL_PRICE_CACHE_TTL_MS
  ) {
    return cachedSolPrice.price;
  }

  try {
    const response = await fetch(
      'https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112'
    );
    const data = await response.json();
    const solData = data.data?.['So11111111111111111111111111111111111111112'];
    const price = parseFloat(solData?.price || '0');

    if (price > 0) {
      cachedSolPrice = { price, fetchedAt: Date.now() };
      return price;
    }
  } catch (err) {
    console.error('Failed to fetch SOL price:', err);
  }

  // Fallback: use a conservative price if API fails
  // This errs on the side of charging more (protecting sponsor)
  if (cachedSolPrice) return cachedSolPrice.price;
  return 100; // Conservative fallback
}

/**
 * Convert lamports to USDC (6 decimals).
 * Uses ceiling to protect the sponsor.
 */
export function lamportsToUsdc(
  lamports: bigint,
  solPriceUsdc: number
): bigint {
  // 1 SOL = 1e9 lamports, USDC has 6 decimals
  // usdc_raw = lamports * solPriceUsdc / 1e9 * 1e6 = lamports * solPriceUsdc / 1e3
  // Use ceiling division to protect sponsor
  const numerator = Number(lamports) * solPriceUsdc;
  return BigInt(Math.ceil(numerator / 1000));
}

/**
 * Calculate the fee a user must pay to cover all sponsored costs.
 * The invariant is: totalFee >= totalEstimatedCost.
 */
export async function calculateFee(
  quote: Quote,
  userWallet: string,
  inputToken: string,
  inputAmount: bigint
): Promise<FeeBreakdown> {
  const config = getConfig();
  const connection = getConnection();
  const sponsor = getSponsorPublicKey();

  // 1. Estimate Solana gas costs (2 transactions: fee payment + bridge)
  const solanaGasCost =
    2n * (BigInt(SOLANA_BASE_TX_FEE) + BigInt(SOLANA_PRIORITY_FEE_ESTIMATE));

  // 2. Estimate rent costs (check if sponsor ATAs need creation)
  let solanaRentCost = 0n;
  const usdcMint = new PublicKey(config.usdcMint);
  const sponsorUsdcAta = await getOrCreateATAInstruction(
    connection,
    sponsor,
    usdcMint,
    sponsor,
    TOKEN_PROGRAM_ID
  );
  if (sponsorUsdcAta.instruction) {
    solanaRentCost += BigInt(SOLANA_ATA_RENT);
  }

  // 3. Provider fee
  const providerFee = quote.providerFeeNative;

  // 4. Percentage markup on input amount
  const percentageMarkup =
    (inputAmount * BigInt(config.feePercentageBps)) / 10000n;

  // 5. Fixed safety buffer
  const fixedBuffer = BigInt(config.feeFixedBufferLamports);

  // 6. Total cost in lamports
  const totalCostLamports =
    solanaGasCost + solanaRentCost + providerFee + fixedBuffer;

  // 7. Total fee = cost recovery + percentage markup
  const totalFeeLamports = totalCostLamports + percentageMarkup;

  // 8. Determine fee token (prefer USDC)
  const solPriceUsdc = await fetchSolPrice();

  const userUsdcBalance = await getTokenBalance(
    connection,
    new PublicKey(userWallet),
    usdcMint,
    TOKEN_PROGRAM_ID
  );

  const totalFeeUsdc = lamportsToUsdc(totalFeeLamports, solPriceUsdc);

  let feeToken: 'USDC' | 'SOL';
  let totalFee: bigint;
  let feeMint: string;

  if (userUsdcBalance >= totalFeeUsdc) {
    feeToken = 'USDC';
    totalFee = totalFeeUsdc;
    feeMint = USDC_MINT_DEFAULT;
  } else {
    feeToken = 'SOL';
    totalFee = totalFeeLamports;
    feeMint = SOL_NATIVE_MINT;
  }

  return {
    totalFee,
    feeToken,
    feeMint,
    components: {
      solanaGasCost,
      solanaRentCost,
      providerFee,
      percentageMarkup,
      fixedBuffer,
    },
    solPriceUsdc,
  };
}
