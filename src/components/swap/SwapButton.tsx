'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useState, useEffect } from 'react';
import styles from './SwapButton.module.css';
import type { SwapState } from '@/hooks/useSwap';

interface SwapButtonProps {
  swapState: SwapState;
  hasAmount: boolean;
  hasQuote: boolean;
  inputTokenSymbol: string;
  outputTokenSymbol: string;
  onSwap: () => void;
  disabled?: boolean;
}

const STATE_LABELS: Record<SwapState, string> = {
  idle: '',
  preparing: 'Preparing...',
  signing_fee: 'Sign fee payment in wallet...',
  submitting_fee: 'Submitting fee payment...',
  signing_bridge: 'Sign bridge transaction in wallet...',
  submitting_bridge: 'Submitting bridge transaction...',
  tracking: 'Swap submitted!',
  completed: 'Swap completed!',
  error: 'Swap failed',
};

export function SwapButton({ swapState, hasAmount, hasQuote, inputTokenSymbol, outputTokenSymbol, onSwap, disabled }: SwapButtonProps) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isProcessing = ['preparing', 'signing_fee', 'submitting_fee', 'signing_bridge', 'submitting_bridge'].includes(swapState);

  // Prevent hydration mismatch by showing a neutral state until mounted
  if (!mounted) {
    return (
      <button type="button" disabled className={`${styles.button} ${styles.buttonDisabled}`}>
        Loading...
      </button>
    );
  }

  if (!connected) {
    return (
      <button type="button" onClick={() => setVisible(true)} className={styles.button}>
        Connect Wallet
      </button>
    );
  }

  if (!hasAmount) {
    return (
      <button type="button" disabled className={`${styles.button} ${styles.buttonDisabled}`}>
        Enter Amount
      </button>
    );
  }

  if (!hasQuote) {
    return (
      <button type="button" disabled className={`${styles.button} ${styles.buttonDisabled}`}>
        Select a Route
      </button>
    );
  }

  if (isProcessing) {
    return (
      <button type="button" disabled className={`${styles.button} ${styles.buttonProcessing}`}>
        {STATE_LABELS[swapState]}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSwap}
      disabled={disabled || isProcessing}
      className={`${styles.button} ${(disabled || isProcessing) ? styles.buttonDisabled : ''}`}
    >
      Swap {inputTokenSymbol} for {outputTokenSymbol}
    </button>
  );
}
