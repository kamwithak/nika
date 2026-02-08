import { NextRequest, NextResponse } from 'next/server';
import { executeSwap } from '@/lib/swap/executor';
import { SUPPORTED_DEST_CHAIN_IDS } from '@/lib/constants';
import type { SwapRequest } from '@/lib/swap/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      userWallet,
      inputToken,
      inputTokenSymbol,
      inputAmount,
      destChainId,
      destChain,
      outputToken,
      outputTokenSymbol,
      recipientAddress,
      selectedProvider,
      providerData,
      quotedFee,
      feeToken,
    } = body;

    // Validate required fields
    if (
      !userWallet ||
      !inputToken ||
      !inputAmount ||
      !destChainId ||
      !outputToken ||
      !recipientAddress ||
      !selectedProvider ||
      !providerData ||
      !quotedFee ||
      !feeToken
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate provider
    if (!['relay', 'debridge'].includes(selectedProvider)) {
      return NextResponse.json(
        { error: `Unsupported provider: ${selectedProvider}` },
        { status: 400 }
      );
    }

    // Validate destination chain
    if (
      !SUPPORTED_DEST_CHAIN_IDS.includes(destChainId as typeof SUPPORTED_DEST_CHAIN_IDS[number])
    ) {
      return NextResponse.json(
        { error: `Unsupported destination chain: ${destChainId}` },
        { status: 400 }
      );
    }

    const request: SwapRequest = {
      userWallet,
      inputToken,
      inputTokenSymbol: inputTokenSymbol || 'UNKNOWN',
      inputAmount,
      destChainId,
      destChain: destChain || `chain-${destChainId}`,
      outputToken,
      outputTokenSymbol: outputTokenSymbol || 'UNKNOWN',
      recipientAddress,
      selectedProvider,
      providerData,
      quotedFee,
      feeToken,
    };

    const result = await executeSwap(request);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Swap error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to execute swap',
      },
      { status: 500 }
    );
  }
}
