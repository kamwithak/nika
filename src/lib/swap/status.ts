import { prisma } from '../db';
import { getProvider } from '../providers';
import type { SwapStatus, StatusResult } from '../providers/types';

/**
 * Poll the bridge provider for the current swap status.
 * Updates the database if the status has changed.
 */
export async function pollSwapStatus(swapId: string): Promise<StatusResult> {
  const swap = await prisma.swapHistory.findUnique({
    where: { id: swapId },
  });

  if (!swap) {
    throw new Error(`Swap not found: ${swapId}`);
  }

  // If already terminal, return cached status
  const terminalStatuses: SwapStatus[] = ['completed', 'failed', 'refunded'];
  if (terminalStatuses.includes(swap.status as SwapStatus)) {
    return { status: swap.status as SwapStatus };
  }

  // If no bridge order ID yet, return current status
  if (!swap.bridgeOrderId) {
    return { status: swap.status as SwapStatus };
  }

  const provider = getProvider(swap.provider);
  const result = await provider.getStatus(swap.bridgeOrderId);

  // Update database if status changed
  if (result.status !== swap.status) {
    await prisma.swapHistory.update({
      where: { id: swapId },
      data: {
        status: result.status,
      },
    });
  }

  return result;
}
