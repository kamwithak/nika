'use client';

import { useState, useRef, useEffect } from 'react';
import { TokenIcon } from '../shared/TokenIcon';
import styles from './TokenSelector.module.css';

export interface TokenOption {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance?: string;
  icon?: string;
}

interface TokenSelectorProps {
  tokens: TokenOption[];
  selectedToken: TokenOption | null;
  onSelect: (token: TokenOption) => void;
  label: string;
  disabled?: boolean;
}

export function TokenSelector({
  tokens,
  selectedToken,
  onSelect,
  label,
  disabled,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = tokens.filter(
    (t) =>
      t.symbol.toLowerCase().includes(search.toLowerCase()) ||
      t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className={styles.container}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`${styles.trigger} ${disabled ? styles.triggerDisabled : ''}`}
      >
        {selectedToken ? (
          <>
            <div className={styles.tokenInfo}>
              <TokenIcon 
                symbol={selectedToken.symbol} 
                src={selectedToken.icon}
                size={24}
              />
              <span className={styles.tokenSymbol}>{selectedToken.symbol}</span>
            </div>
            {selectedToken.balance && (
              <span className={styles.tokenBalance}>{selectedToken.balance}</span>
            )}
          </>
        ) : (
          <span className={styles.placeholder}>{label}</span>
        )}
        <span className={styles.chevron}>&#9662;</span>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <input
            type="text"
            placeholder="Search token..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className={styles.searchInput}
          />
          {filtered.map((token) => (
            <div
              key={token.address}
              onClick={() => { onSelect(token); setIsOpen(false); setSearch(''); }}
              className={styles.option}
            >
              <div className={styles.optionLeft}>
                <TokenIcon 
                  symbol={token.symbol} 
                  src={token.icon}
                  size={32}
                />
                <div className={styles.optionText}>
                  <span className={styles.tokenSymbol}>{token.symbol}</span>
                  <span className={styles.optionName}>{token.name}</span>
                </div>
              </div>
              {token.balance && (
                <span className={styles.tokenBalance}>{token.balance}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
