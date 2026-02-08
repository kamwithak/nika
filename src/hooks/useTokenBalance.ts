'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getConnection } from '@/lib/solana/connection';
import { getTokenBalance, getTokenProgramForMint } from '@/lib/solana/token';

interface UseTokenBalanceResult {
  balance: bigint;
  balanceFormatted: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and format token balance for a given mint address
 */
export function useTokenBalance(
  mintAddress: string | null,
  decimals: number = 6
): UseTokenBalanceResult {
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !mintAddress) {
      setBalance(0n);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const connection = getConnection();
      const mint = new PublicKey(mintAddress);
      const programId = await getTokenProgramForMint(connection, mint);
      const fetchedBalance = await getTokenBalance(connection, publicKey, mint, programId);
      setBalance(fetchedBalance);
    } catch (err) {
      console.error('Error fetching token balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance(0n);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, mintAddress]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const balanceFormatted = formatBalance(balance, decimals);

  return {
    balance,
    balanceFormatted,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}

/**
 * Format balance from raw amount to human-readable string
 */
function formatBalance(balance: bigint, decimals: number): string {
  if (balance === 0n) {
    return '0';
  }

  const divisor = BigInt(10 ** decimals);
  const whole = balance / divisor;
  const fraction = balance % divisor;

  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionStr = fraction.toString().padStart(decimals, '0');
  const trimmedFraction = fractionStr.replace(/0+$/, '');
  
  return `${whole}.${trimmedFraction}`;
}
