'use client';

import { useState } from 'react';
import styles from './ChainIcon.module.css';

interface ChainIconProps {
  name: string;
  src?: string;
  size?: number;
  className?: string;
}

/**
 * ChainIcon component that displays a chain's icon with fallback
 */
export function ChainIcon({ name, src, size = 24, className = '' }: ChainIconProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Fallback to generic icon URL
  const iconSrc = src || getDefaultChainIconUrl(name);

  if (!iconSrc || imageError) {
    // Fallback: show first letter of chain name
    return (
      <div 
        className={`${styles.fallback} ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.5 }}
      >
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`} style={{ width: size, height: size }}>
      {!imageLoaded && (
        <div className={styles.loading} style={{ width: size, height: size }} />
      )}
      <img
        src={iconSrc}
        alt={`${name} icon`}
        width={size}
        height={size}
        className={`${styles.icon} ${imageLoaded ? styles.iconLoaded : ''}`}
        onError={() => setImageError(true)}
        onLoad={() => setImageLoaded(true)}
      />
    </div>
  );
}

/**
 * Get default chain icon URL
 */
function getDefaultChainIconUrl(name: string): string | null {
  const normalizedName = name.toLowerCase();
  
  // Map chain names to icon sources using reliable CDN URLs
  const chainIconMap: Record<string, string> = {
    'ethereum': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    'arbitrum': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
    'base': 'https://avatars.githubusercontent.com/u/108554348?s=200&v=4',
  };

  return chainIconMap[normalizedName] || null;
}
