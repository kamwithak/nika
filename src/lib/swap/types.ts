import type { BridgeProviderName, Quote, SwapStatus } from '../providers/types';

export interface SwapRequest {
  userWallet: string;
  inputToken: string;
  inputTokenSymbol: string;
  inputAmount: string; // BigInt as string (from client JSON)
  destChainId: number;
  destChain: string;
  outputToken: string;
  outputTokenSymbol: string;
  recipientAddress: string;
  selectedProvider: BridgeProviderName;
  /** Base64-encoded providerData from the quote response */
  providerData: string;
  /** The quoted fee amount (string) */
  quotedFee: string;
  /** The fee token */
  feeToken: 'USDC' | 'SOL';
}

export interface SwapResult {
  swapId: string;
  /** Base64 partially-signed fee payment transaction */
  feePaymentTx: string;
  /** Base64 partially-signed bridge transaction */
  bridgeTx: string;
  bridgeOrderId: string;
  status: SwapStatus;
}
