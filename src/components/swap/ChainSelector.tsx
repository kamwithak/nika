'use client';

import { EVM_CHAINS } from '@/lib/constants';
import { ChainIcon } from '../shared/ChainIcon';
import styles from './ChainSelector.module.css';

interface ChainSelectorProps {
  selectedChainId: number | null;
  onSelect: (chainId: number) => void;
  disabled?: boolean;
}

const chains = Object.values(EVM_CHAINS);

export function ChainSelector({ selectedChainId, onSelect, disabled }: ChainSelectorProps) {
  return (
    <div className={styles.container}>
      {chains.map((chain) => (
        <button
          key={chain.chainId}
          type="button"
          onClick={() => !disabled && onSelect(chain.chainId)}
          className={`${styles.chip} ${selectedChainId === chain.chainId ? styles.chipSelected : ''} ${disabled ? styles.chipDisabled : ''}`}
        >
          <ChainIcon name={chain.name} size={20} />
          <span>{chain.name}</span>
        </button>
      ))}
    </div>
  );
}
