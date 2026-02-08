# Token Icons Feature

## Overview

The Nika Finance app now displays token and chain icons throughout the UI, providing a more visual and user-friendly experience.

## Components Added

### 1. TokenIcon Component (`src/components/shared/TokenIcon.tsx`)
- Displays token icons with automatic fallback to text-based badges
- Uses CoinGecko CDN for common tokens (SOL, USDC, USDT, ETH, WETH, BTC, WBTC)
- Shows loading animation while images load
- Falls back to colored badges with token symbol initials if image fails

### 2. ChainIcon Component (`src/components/shared/ChainIcon.tsx`)
- Displays blockchain network icons
- Supports Ethereum, Arbitrum, and Base chains
- Similar fallback behavior to TokenIcon

## Where Icons Appear

1. **Token Selector** - Shows icons next to token symbols in both:
   - The selector button (when a token is selected)
   - The dropdown list of available tokens

2. **Quote Display** - Shows output token icon next to estimated amounts

3. **Chain Selector** - Shows chain icons next to chain names (Ethereum, Arbitrum, Base)

4. **Swap History Table** - Shows:
   - Input token icons
   - Output token icons
   - Chain route with both SOL and destination chain icons

## Icon Sources

### Token Icons
The app uses **Trust Wallet's open-source asset repository** on GitHub:
```
https://raw.githubusercontent.com/trustwallet/assets/master/...
```

Supported tokens with CDN icons:
- SOL (Solana)
- USDC (USD Coin)
- USDT (Tether)
- ETH (Ethereum)
- WETH (Wrapped Ether)
- BTC (Bitcoin)
- WBTC (Wrapped Bitcoin)

### Chain Icons
Chain icons also use Trust Wallet's repository and GitHub avatars:
- **Ethereum**: Trust Wallet assets
- **Arbitrum**: Trust Wallet assets  
- **Base**: GitHub avatar (official Base account)

### Custom Icons
You can add custom icons by:
1. Placing SVG/PNG files in `public/tokens/` or `public/chains/`
2. Updating the `icon` field in `src/lib/constants.ts`

Example:
```typescript
export const SOLANA_TOKENS = [
  { 
    mint: SOL_NATIVE_MINT, 
    symbol: 'SOL', 
    name: 'Solana', 
    decimals: 9, 
    icon: '/tokens/sol.svg'  // Custom icon path
  },
  // ...
];
```

## Fallback Behavior

The icon components are resilient and handle errors gracefully:

1. **Loading State**: Shows a shimmer animation while loading
2. **Error State**: If the image fails to load, displays:
   - Token: Gradient badge with symbol initials (e.g., "SOL", "USD")
   - Chain: Gradient badge with first letter of chain name

## Styling

All icon components use CSS Modules for scoped styling:
- `TokenIcon.module.css` - Token icon styles
- `ChainIcon.module.css` - Chain icon styles

Icons are circular with proper sizing and transitions for a polished look.

## Future Enhancements

Potential improvements:
1. Add more token icons for additional supported tokens
2. Support custom token lists with user-provided icons
3. Add dark/light mode variants
4. Cache icons locally for better performance
5. Support SVG icons for better quality at any size
