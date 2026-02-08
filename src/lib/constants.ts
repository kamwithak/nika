// Solana chain IDs used by bridge providers
export const SOLANA_CHAIN_ID_RELAY = 792703809;
export const SOLANA_CHAIN_ID_DEBRIDGE = 7565164;

// EVM destination chains
export const EVM_CHAINS = {
  ethereum: {
    chainId: 1,
    name: 'Ethereum',
    explorerUrl: 'https://etherscan.io',
  },
  arbitrum: {
    chainId: 42161,
    name: 'Arbitrum',
    explorerUrl: 'https://arbiscan.io',
  },
  base: {
    chainId: 8453,
    name: 'Base',
    explorerUrl: 'https://basescan.org',
  },
} as const;

export const SUPPORTED_DEST_CHAIN_IDS = [1, 42161, 8453] as const;
export type DestChainId = (typeof SUPPORTED_DEST_CHAIN_IDS)[number];

export function getChainByChainId(chainId: number) {
  return Object.values(EVM_CHAINS).find((c) => c.chainId === chainId);
}

// Well-known Solana token mints
export const SOL_NATIVE_MINT = 'So11111111111111111111111111111111111111112';
export const USDC_MINT_DEFAULT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// Solana transaction cost estimates (in lamports)
export const SOLANA_BASE_TX_FEE = 5000; // 0.000005 SOL
export const SOLANA_PRIORITY_FEE_ESTIMATE = 50000; // priority fee estimate
export const SOLANA_ATA_RENT = 2039280; // rent for a token account

// deBridge fixed fee per order on Solana
export const DEBRIDGE_FIXED_FEE_LAMPORTS = 15_000_000; // 0.015 SOL

// Well-known EVM token addresses (per chain)
export const EVM_TOKENS: Record<
  number,
  Array<{ address: string; symbol: string; name: string; decimals: number; icon?: string }>
> = {
  // Ethereum
  1: [
    { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Ether', decimals: 18 },
    { address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', symbol: 'USDT', name: 'Tether', decimals: 6 },
    { address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  ],
  // Arbitrum
  42161: [
    { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Ether', decimals: 18 },
    { address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', symbol: 'USDT', name: 'Tether', decimals: 6 },
    { address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  ],
  // Base
  8453: [
    { address: '0x0000000000000000000000000000000000000000', symbol: 'ETH', name: 'Ether', decimals: 18 },
    { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', name: 'USD Coin', decimals: 6 },
    { address: '0x4200000000000000000000000000000000000006', symbol: 'WETH', name: 'Wrapped Ether', decimals: 18 },
  ],
};

// Well-known Solana tokens for the source selector
export const SOLANA_TOKENS = [
  { mint: SOL_NATIVE_MINT, symbol: 'SOL', name: 'Solana', decimals: 9 },
  { mint: USDC_MINT_DEFAULT, symbol: 'USDC', name: 'USD Coin', decimals: 6 },
  { mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', symbol: 'USDT', name: 'Tether', decimals: 6 },
];

// SOL price cache TTL
export const SOL_PRICE_CACHE_TTL_MS = 10_000;

// Quote expiry
export const QUOTE_EXPIRY_MS = 30_000;

// Status polling interval
export const STATUS_POLL_INTERVAL_MS = 5_000;

// Quote refresh interval
export const QUOTE_REFRESH_INTERVAL_MS = 15_000;
