'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { QUOTE_REFRESH_INTERVAL_MS } from '@/lib/constants';

export interface QuoteParams {
  inputToken: string;
  inputAmount: string;
  destChainId: number;
  outputToken: string;
  userWallet: string;
  recipientAddress: string;
}

export interface QuoteResult {
  provider: string;
  estimatedOutput: string;
  minOutput: string;
  estimatedTimeSeconds: number;
  providerFeeNative: string;
  fee: {
    totalFee: string;
    feeToken: 'USDC' | 'SOL';
    feeMint: string;
    components: {
      solanaGas: string;
      solanaRent: string;
      providerFee: string;
      markup: string;
      buffer: string;
    };
    solPriceUsdc: number;
  };
  isBest: boolean;
  providerData: string;
  expiresAt: number;
}

interface UseQuoteReturn {
  quotes: QuoteResult[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useQuote(params: QuoteParams | null): UseQuoteReturn {
  const [quotes, setQuotes] = useState<QuoteResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchQuotes = useCallback(async () => {
    if (!params || !params.inputAmount || params.inputAmount === '0') {
      setQuotes([]);
      return;
    }

    // Abort previous request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch quotes');
      }

      const data = await response.json();
      setQuotes(data.quotes || []);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : 'Quote fetch failed');
      setQuotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [params]);

  // Fetch on params change
  useEffect(() => {
    fetchQuotes();

    // Auto-refresh
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (params) {
      intervalRef.current = setInterval(fetchQuotes, QUOTE_REFRESH_INTERVAL_MS);
    }

    return () => {
      abortRef.current?.abort();
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchQuotes, params]);

  return { quotes, isLoading, error, refetch: fetchQuotes };
}
