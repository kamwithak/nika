'use client';

import { useState, type ReactNode } from 'react';
import styles from './Tooltip.module.css';

interface TooltipProps {
  text: string;
  children: ReactNode;
}

export function Tooltip({ text, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className={styles.container}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      tabIndex={0}
      role="tooltip"
      aria-label={text}
    >
      {children}
      {isVisible && (
        <div className={styles.tooltip}>
          <div className={styles.tooltipText}>{text}</div>
          <div className={styles.tooltipArrow} />
        </div>
      )}
    </div>
  );
}
