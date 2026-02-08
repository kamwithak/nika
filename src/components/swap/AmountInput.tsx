'use client';

import styles from './AmountInput.module.css';

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  onMax?: () => void;
  onFractionClick?: (fraction: number) => void;
  maxBalance?: string;
  tokenSymbol?: string;
  disabled?: boolean;
  showFractionButtons?: boolean;
}

export function AmountInput({ 
  value, 
  onChange, 
  onMax, 
  onFractionClick,
  maxBalance, 
  tokenSymbol, 
  disabled,
  showFractionButtons = true 
}: AmountInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (/^\d*\.?\d*$/.test(raw)) {
      onChange(raw);
    }
  };

  const hasFractionButtons = showFractionButtons && onFractionClick;

  return (
    <div className={styles.container}>
      <div className={styles.inputRow}>
        <input
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={styles.input}
        />
        {onMax && (
          <button type="button" onClick={onMax} disabled={disabled} className={styles.maxButton}>
            MAX
          </button>
        )}
      </div>
      
      {maxBalance && (
        <div className={styles.balanceRow}>
          <span className={styles.balanceText}>
            Balance: {maxBalance} {tokenSymbol || ''}
          </span>
        </div>
      )}

      {hasFractionButtons && (
        <div className={styles.fractionButtons}>
          <button
            type="button"
            onClick={() => onFractionClick(0.25)}
            disabled={disabled || !maxBalance || parseFloat(maxBalance) === 0}
            className={styles.fractionButton}
          >
            25%
          </button>
          <button
            type="button"
            onClick={() => onFractionClick(0.5)}
            disabled={disabled || !maxBalance || parseFloat(maxBalance) === 0}
            className={styles.fractionButton}
          >
            50%
          </button>
          <button
            type="button"
            onClick={() => onFractionClick(0.75)}
            disabled={disabled || !maxBalance || parseFloat(maxBalance) === 0}
            className={styles.fractionButton}
          >
            75%
          </button>
          <button
            type="button"
            onClick={() => onFractionClick(1.0)}
            disabled={disabled || !maxBalance || parseFloat(maxBalance) === 0}
            className={styles.fractionButton}
          >
            MAX
          </button>
        </div>
      )}
    </div>
  );
}
