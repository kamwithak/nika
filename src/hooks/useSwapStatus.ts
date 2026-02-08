'use client';

import { useState, useEffect, useRef } from 'react';
import { STATUS_POLL_INTERVAL_MS } from '@/lib/constants';
import type { SwapStatus } from '@/lib/providers/types';

interface UseSwapStatusReturn {
  status: SwapStatus | null;
  destTxHash: string | null;
  isPolling: boolean;
}

const TERMINAL_STATUSES: SwapStatus[] = ['completed', 'failed', 'refunded'];

export function useSwapStatus(swapId: string | null): UseSwapStatusReturn {
  const [status, setStatus] = useState<SwapStatus | null>(null);
  const [destTxHash, setDestTxHash] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!swapId) {
      setStatus(null);
      setDestTxHash(null);
      setIsPolling(false);
      return;
    }

    setIsPolling(true);

    const poll = async () => {
      try {
        const response = await fetch(`/api/swap/${swapId}/status`);
        if (!response.ok) return;

        const data = await response.json();
        setStatus(data.status);
        if (data.destTxHash) setDestTxHash(data.destTxHash);

        // Stop polling on terminal status
        if (TERMINAL_STATUSES.includes(data.status)) {
          setIsPolling(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch {
        // Continue polling on error
      }
    };

    // Poll immediately
    poll();

    // Then at intervals
    intervalRef.current = setInterval(poll, STATUS_POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [swapId]);

  return { status, destTxHash, isPolling };
}
