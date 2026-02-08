import { USDC_MINT_DEFAULT } from './constants';

export interface AppConfig {
  solanaRpcUrl: string;
  sponsorPrivateKey: string;
  feePercentageBps: number;
  feeFixedBufferLamports: number;
  feeFixedBufferUsdc: number;
  relayApiUrl: string;
  debridgeApiUrl: string;
  debridgeStatsApiUrl: string;
  usdcMint: string;
  databaseUrl: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

let _config: AppConfig | null = null;

export function getConfig(): AppConfig {
  if (_config) return _config;

  _config = {
    solanaRpcUrl: requireEnv('SOLANA_RPC_URL'),
    sponsorPrivateKey: requireEnv('SPONSOR_PRIVATE_KEY'),
    feePercentageBps: parseInt(optionalEnv('FEE_PERCENTAGE_BPS', '50'), 10),
    feeFixedBufferLamports: parseInt(optionalEnv('FEE_FIXED_BUFFER_LAMPORTS', '10000000'), 10),
    feeFixedBufferUsdc: parseInt(optionalEnv('FEE_FIXED_BUFFER_USDC', '50000'), 10),
    relayApiUrl: optionalEnv('RELAY_API_URL', 'https://api.relay.link'),
    debridgeApiUrl: optionalEnv('DEBRIDGE_API_URL', 'https://dln.debridge.finance/v1.0'),
    debridgeStatsApiUrl: optionalEnv('DEBRIDGE_STATS_API_URL', 'https://stats-api.dln.trade'),
    usdcMint: optionalEnv('USDC_MINT', USDC_MINT_DEFAULT),
    databaseUrl: requireEnv('DATABASE_URL'),
  };

  return _config;
}
