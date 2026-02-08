export type BridgeProviderName = 'relay' | 'debridge';

export type SwapStatus =
  | 'pending'
  | 'fee_paid'
  | 'tx_submitted'
  | 'bridging'
  | 'completed'
  | 'failed'
  | 'refunded';

export interface QuoteRequest {
  /** Solana mint address of the input token */
  inputToken: string;
  /** Amount in the token's smallest unit (lamports for SOL, etc.) */
  inputAmount: bigint;
  /** EVM chain ID for the destination */
  destChainId: number;
  /** EVM token address on the destination chain */
  outputToken: string;
  /** User's Solana wallet address */
  userWallet: string;
  /** EVM recipient address */
  recipientAddress: string;
}

export interface Quote {
  provider: BridgeProviderName;
  inputAmount: bigint;
  estimatedOutputAmount: bigint;
  /** Minimum output after slippage */
  minOutputAmount: bigint;
  /** Provider-specific fees in lamports */
  providerFeeNative: bigint;
  /** Provider-specific fees in USD (6 decimals) */
  providerFeeUsd: number;
  /** Estimated time to completion in seconds */
  estimatedTimeSeconds: number;
  /** Opaque provider-specific data needed for createTransaction */
  providerData: unknown;
  /** When this quote expires (Date.now() + ~30s) */
  expiresAt: number;
}

export interface TransactionResult {
  /** Serialized Solana VersionedTransaction (base64) */
  serializedTransaction: string;
  /** Provider's order ID for tracking */
  orderId: string;
}

export interface StatusResult {
  status: SwapStatus;
  /** Destination chain tx hash if available */
  destTxHash?: string;
}

export interface BridgeProvider {
  name: BridgeProviderName;
  getQuote(request: QuoteRequest): Promise<Quote>;
  createTransaction(quote: Quote): Promise<TransactionResult>;
  getStatus(orderId: string): Promise<StatusResult>;
}
