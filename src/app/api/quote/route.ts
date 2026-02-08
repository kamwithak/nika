import { NextRequest, NextResponse } from 'next/server';
import { getComparisonQuotes } from '@/lib/providers';
import { calculateFee } from '@/lib/fees/calculator';
import { SUPPORTED_DEST_CHAIN_IDS } from '@/lib/constants';
import type { QuoteRequest } from '@/lib/providers/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      inputToken,
      inputAmount,
      destChainId,
      outputToken,
      userWallet,
      recipientAddress,
    } = body;

    // Validate required fields
    if (
      !inputToken ||
      !inputAmount ||
      !destChainId ||
      !outputToken ||
      !userWallet ||
      !recipientAddress
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate destChainId
    if (
      !SUPPORTED_DEST_CHAIN_IDS.includes(destChainId as typeof SUPPORTED_DEST_CHAIN_IDS[number])
    ) {
      return NextResponse.json(
        { error: `Unsupported destination chain: ${destChainId}` },
        { status: 400 }
      );
    }

    const request: QuoteRequest = {
      inputToken,
      inputAmount: BigInt(inputAmount),
      destChainId,
      outputToken,
      userWallet,
      recipientAddress,
    };

    // Get quotes from both providers
    const comparison = await getComparisonQuotes(request);

    // Calculate fees for each quote
    const quotesWithFees = await Promise.all(
      comparison.quotes.map(async (quote) => {
        const fee = await calculateFee(
          quote,
          userWallet,
          inputToken,
          BigInt(inputAmount)
        );

        return {
          provider: quote.provider,
          estimatedOutput: quote.estimatedOutputAmount.toString(),
          minOutput: quote.minOutputAmount.toString(),
          estimatedTimeSeconds: quote.estimatedTimeSeconds,
          providerFeeNative: quote.providerFeeNative.toString(),
          fee: {
            totalFee: fee.totalFee.toString(),
            feeToken: fee.feeToken,
            feeMint: fee.feeMint,
            components: {
              solanaGas: fee.components.solanaGasCost.toString(),
              solanaRent: fee.components.solanaRentCost.toString(),
              providerFee: fee.components.providerFee.toString(),
              markup: fee.components.percentageMarkup.toString(),
              buffer: fee.components.fixedBuffer.toString(),
            },
            solPriceUsdc: fee.solPriceUsdc,
          },
          isBest: false, // Will be set below
          // Serialize providerData for the client to send back in /api/swap
          providerData: Buffer.from(
            JSON.stringify(quote.providerData)
          ).toString('base64'),
          expiresAt: quote.expiresAt,
          estimatedOutputAmount: quote.estimatedOutputAmount,
        };
      })
    );

    // Determine the best quote: highest estimated output
    // (The output is what the user receives, fees are already separate)
    const bestQuote = quotesWithFees.reduce((best, current) =>
      current.estimatedOutputAmount > best.estimatedOutputAmount ? current : best
    );
    bestQuote.isBest = true;

    // Remove the temporary field used for comparison
    const finalQuotes = quotesWithFees.map(({ estimatedOutputAmount: _, ...quote }) => quote);

    return NextResponse.json({ quotes: finalQuotes });
  } catch (error) {
    console.error('Quote error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch quotes',
      },
      { status: 500 }
    );
  }
}
