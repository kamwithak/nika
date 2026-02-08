'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSwapHistory } from '@/hooks/useSwapHistory';
import { getChainByChainId } from '@/lib/constants';
import { TokenIcon } from '../shared/TokenIcon';
import { ChainIcon } from '../shared/ChainIcon';
import styles from './SwapHistory.module.css';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  // Use ISO string slicing to avoid client/server timezone differences
  const isoDate = d.toISOString();
  const date = isoDate.split('T')[0];
  const time = isoDate.split('T')[1].slice(0, 5);
  return `${date} ${time}`;
}

function getStatusClass(status: string): string {
  switch (status) {
    case 'completed': return styles.statusCompleted;
    case 'failed':
    case 'refunded': return styles.statusFailed;
    default: return styles.statusPending;
  }
}

function SwapHistoryContent() {
  const { history, isLoading, error } = useSwapHistory();

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <Image 
              src="/nika/nika.svg" 
              alt="Nika Finance" 
              width={48} 
              height={48}
              className={styles.logoIcon}
            />
            <div className={styles.logoText}>
              <span className={styles.logo}>NIKA FINANCE</span>
              <span className={styles.subtitle}>Swap History</span>
            </div>
          </div>
          <Link href="/" className={styles.backLink}>
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className={styles.backIcon}
            >
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span>Back to Swapper</span>
          </Link>
        </div>
        <div className={styles.emptyState}>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <Image 
              src="/nika/nika.svg" 
              alt="Nika Finance" 
              width={48} 
              height={48}
              className={styles.logoIcon}
            />
            <div className={styles.logoText}>
              <span className={styles.logo}>NIKA FINANCE</span>
              <span className={styles.subtitle}>Swap History</span>
            </div>
          </div>
          <Link href="/" className={styles.backLink}>
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className={styles.backIcon}
            >
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span>Back to Swapper</span>
          </Link>
        </div>
        <div className={styles.emptyState}>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logoContainer}>
          <Image 
            src="/nika/nika.svg" 
            alt="Nika Finance" 
            width={48} 
            height={48}
            className={styles.logoIcon}
          />
          <div className={styles.logoText}>
            <span className={styles.logo}>NIKA FINANCE</span>
            <span className={styles.subtitle}>Swap History</span>
          </div>
        </div>
        <Link href="/" className={styles.backLink}>
          <svg 
            width="14" 
            height="14" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={styles.backIcon}
          >
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span>Back to Swapper</span>
        </Link>
      </div>
      {history.length === 0 ? (
        <div className={styles.emptyState}>No swaps yet. Connect your wallet and make your first swap!</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Date</th>
              <th className={styles.th}>From</th>
              <th className={styles.th}>To</th>
              <th className={styles.th}>Route</th>
              <th className={styles.th}>Provider</th>
              <th className={styles.th}>Fee</th>
              <th className={styles.th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {history.map((swap) => {
              const chain = getChainByChainId(swap.destChainId);
              return (
                <tr key={swap.id}>
                  <td className={styles.td}>{formatDate(swap.createdAt)}</td>
                  <td className={styles.td}>
                    <div className={styles.tokenCell}>
                      <TokenIcon symbol={swap.inputTokenSymbol} size={20} />
                      <span>{swap.inputTokenSymbol}</span>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.tokenCell}>
                      <TokenIcon symbol={swap.outputTokenSymbol} size={20} />
                      <span>{swap.outputTokenSymbol}</span>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.routeCell}>
                      <TokenIcon symbol="SOL" size={16} />
                      <span>→</span>
                      {chain && <ChainIcon name={chain.name} size={16} />}
                      <span>{chain?.name || swap.destChain}</span>
                    </div>
                  </td>
                  <td className={styles.td}><span className={styles.providerName}>{swap.provider}</span></td>
                  <td className={styles.td}>{swap.feeToken}</td>
                  <td className={styles.td}>
                    <span className={`${styles.statusBadge} ${getStatusClass(swap.status)}`}>{swap.status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function SwapHistory() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <Image 
              src="/nika/nika.svg" 
              alt="Nika Finance" 
              width={48} 
              height={48}
              className={styles.logoIcon}
            />
            <div className={styles.logoText}>
              <span className={styles.logo}>NIKA FINANCE</span>
              <span className={styles.subtitle}>Swap History</span>
            </div>
          </div>
          <Link href="/" className={styles.backLink}>
            <svg 
              width="14" 
              height="14" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className={styles.backIcon}
            >
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            <span>Back to Swapper</span>
          </Link>
        </div>
        <div className={styles.emptyState}>Loading...</div>
      </div>
    );
  }

  return <SwapHistoryContent />;
}
