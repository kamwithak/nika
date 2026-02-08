'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './LoadingSpinner.module.css';

export function LoadingSpinner() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide spinner after initial load
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.spinnerContainer}>
        <div className={styles.spinner}>
          <div className={styles.ring}></div>
          <div className={styles.ring}></div>
          <div className={styles.ring}></div>
        </div>
        <div className={styles.logo}>
          <Image 
            src="/nika/nika.svg" 
            alt="Nika" 
            width={45} 
            height={45}
            priority
          />
        </div>
      </div>
    </div>
  );
}
