'use client';

import { useSwapStatus } from '@/hooks/useSwapStatus';
import { getChainByChainId } from '@/lib/constants';
import styles from './StatusTracker.module.css';

interface StatusTrackerProps {
  swapId: string;
  destChainId: number;
}

const STEPS = [
  { key: 'fee_paid', label: 'Fee Paid' },
  { key: 'tx_submitted', label: 'Transaction Submitted' },
  { key: 'bridging', label: 'Bridging' },
  { key: 'completed', label: 'Completed' },
] as const;

function getStepIndex(status: string | null): number {
  switch (status) {
    case 'fee_paid': return 0;
    case 'tx_submitted': return 1;
    case 'bridging': return 2;
    case 'completed': return 3;
    default: return -1;
  }
}

export function StatusTracker({ swapId, destChainId }: StatusTrackerProps) {
  const { status, destTxHash, isPolling } = useSwapStatus(swapId);
  const currentStep = getStepIndex(status);
  const chain = getChainByChainId(destChainId);

  if (status === 'failed' || status === 'refunded') {
    return (
      <div className={styles.container}>
        <span className={styles.title}>Swap Status</span>
        <div className={styles.errorBanner}>
          {status === 'failed' ? 'Swap failed. Please try again.' : 'Swap was refunded.'}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <span className={styles.title}>Swap Status {isPolling && '...'}</span>
      <div className={styles.steps}>
        {STEPS.map((step, i) => {
          const isComplete = i <= currentStep;
          const isActive = i === currentStep + 1;
          return (
            <div key={step.key} className={styles.step}>
              <div className={`${styles.stepDot} ${isComplete ? styles.stepDotComplete : isActive ? styles.stepDotActive : styles.stepDotPending}`}>
                {isComplete ? '\u2713' : i + 1}
              </div>
              <span className={`${styles.stepLabel} ${isComplete ? styles.stepLabelComplete : isActive ? styles.stepLabelActive : ''}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      {destTxHash && chain && (
        <a href={`${chain.explorerUrl}/tx/${destTxHash}`} target="_blank" rel="noopener noreferrer" className={styles.explorerLink}>
          View on {chain.name} Explorer
        </a>
      )}
    </div>
  );
}
