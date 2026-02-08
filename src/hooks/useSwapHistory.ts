'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export interface SwapHistoryItem {
  id: string;
  walletAddress: string;
  inputToken: string;
  inputTokenSymbol: string;
  inputAmount: string;
  outputToken: string;
  outputTokenSymbol: string;
  outputAmount: string | null;
  sourceChain: string;
  destChain: string;
  destChainId: number;
  provider: string;
  sponsorFeePaid: string;
  feeToken: string;
  txHash: string | null;
  bridgeOrderId: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface UseSwapHistoryReturn {
  history: SwapHistoryItem[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSwapHistory(): UseSwapHistoryReturn {
  const { publicKey } = useWallet();
  const [history, setHistory] = useState<SwapHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!publicKey) {
      setHistory([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/history?wallet=${publicKey.toBase58()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      setHistory(data.swaps || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, isLoading, error, refetch: fetchHistory };
}
