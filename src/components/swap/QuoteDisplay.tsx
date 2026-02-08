'use client';

import { TokenIcon } from '../shared/TokenIcon';
import { Tooltip } from '../shared/Tooltip';
import styles from './QuoteDisplay.module.css';
import type { QuoteResult } from '@/hooks/useQuote';

interface QuoteDisplayProps {
  quotes: QuoteResult[];
  selectedProvider: string | null;
  onSelect: (quote: QuoteResult) => void;
  isLoading: boolean;
  outputTokenSymbol: string;
  outputTokenDecimals: number;
  outputTokenIcon?: string;
  destChainId: number | null;
}

function formatTokenAmount(amount: string, decimals: number): string {
  const raw = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const whole = raw / divisor;
  const frac = raw % divisor;
  const fracStr = frac.toString().padStart(decimals, '0').slice(0, 4);
  // Avoid toLocaleString() to prevent hydration issues
  return `${whole.toString()}.${fracStr}`;
}

function formatFee(amount: string, token: string): string {
  const decimals = token === 'USDC' ? 6 : 9;
  const raw = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const whole = Number(raw) / Number(divisor);
  return `${whole.toFixed(token === 'USDC' ? 4 : 6)} ${token}`;
}

export function QuoteDisplay({ quotes, selectedProvider, onSelect, isLoading, outputTokenSymbol, outputTokenDecimals, outputTokenIcon, destChainId }: QuoteDisplayProps) {
  if (isLoading) {
    return <div className={styles.loadingContainer}>Fetching quotes...</div>;
  }

  if (quotes.length === 0) return null;

  const getChainName = (chainId: number | null): string => {
    if (!chainId) return 'destination';
    const names: Record<number, string> = { 1: 'Ethereum', 42161: 'Arbitrum', 8453: 'Base' };
    return names[chainId] || 'destination';
  };

  // Sort quotes to put the best one on top
  const sortedQuotes = [...quotes].sort((a, b) => {
    if (a.isBest && !b.isBest) return -1;
    if (!a.isBest && b.isBest) return 1;
    return 0;
  });

  return (
    <div className={styles.container}>
      <div className={styles.labelRow}>
        <span className={styles.label}>Routes</span>
        <div className={styles.sponsoredBadge}>
          <span className={styles.sponsoredIcon}>✓</span>
          <span>Gas Sponsored on {getChainName(destChainId)}</span>
        </div>
      </div>
      {sortedQuotes.map((quote) => (
        <div
          key={quote.provider}
          onClick={() => onSelect(quote)}
          className={`${styles.quoteCard} ${selectedProvider === quote.provider ? styles.quoteCardSelected : ''}`}
        >
          <div className={styles.quoteHeader}>
            <span className={styles.providerName}>{quote.provider}</span>
            {quote.isBest && (
              <Tooltip text={`Highest output: You receive the most ${outputTokenSymbol} with this route`}>
                <span className={styles.bestBadge}>
                  Best
                  <span className={styles.bestBadgeIcon}>★</span>
                </span>
              </Tooltip>
            )}
          </div>
          <div className={styles.outputAmountContainer}>
            <TokenIcon 
              symbol={outputTokenSymbol}
              src={outputTokenIcon}
              size={20}
            />
            <span className={styles.outputAmount}>
              {formatTokenAmount(quote.estimatedOutput, outputTokenDecimals)} {outputTokenSymbol}
            </span>
          </div>
          <div className={styles.details}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Total Fee</span>
              <span className={styles.detailValue}>{formatFee(quote.fee.totalFee, quote.fee.feeToken)}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Time</span>
              <span className={styles.detailValue}>~{quote.estimatedTimeSeconds}s</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Min Output</span>
              <span className={styles.detailValue}>{formatTokenAmount(quote.minOutput, outputTokenDecimals)} {outputTokenSymbol}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
