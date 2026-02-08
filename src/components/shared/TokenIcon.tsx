'use client';

import { useState } from 'react';
import styles from './TokenIcon.module.css';

interface TokenIconProps {
  symbol: string;
  src?: string;
  size?: number;
  className?: string;
}

/**
 * TokenIcon component that displays a token's icon with fallback to symbol text
 */
export function TokenIcon({ symbol, src, size = 24, className = '' }: TokenIconProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Fallback to generic icon URL from CoinGecko or similar CDN
  const iconSrc = src || getDefaultTokenIconUrl(symbol);

  if (!iconSrc || imageError) {
    // Fallback: show first 2-3 letters of symbol
    return (
      <div 
        className={`${styles.fallback} ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {symbol.slice(0, 3)}
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
        alt={`${symbol} icon`}
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
 * Get default token icon URL from public CDN
 */
function getDefaultTokenIconUrl(symbol: string): string | null {
  const normalizedSymbol = symbol.toUpperCase();
  
  // Map common symbols to reliable CDN URLs using Trust Wallet assets
  const symbolToIconUrl: Record<string, string> = {
    'SOL': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png',
    'USDC': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48/logo.png',
    'USDT': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xdAC17F958D2ee523a2206206994597C13D831ec7/logo.png',
    'ETH': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    'WETH': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2/logo.png',
    'BTC': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/bitcoin/info/logo.png',
    'WBTC': 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599/logo.png',
  };

  return symbolToIconUrl[normalizedSymbol] || null;
}
