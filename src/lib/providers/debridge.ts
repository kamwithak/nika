import { getConfig } from '../config';
import {
  SOLANA_CHAIN_ID_DEBRIDGE,
  DEBRIDGE_FIXED_FEE_LAMPORTS,
  QUOTE_EXPIRY_MS,
} from '../constants';
import type {
  BridgeProvider,
  BridgeProviderName,
  Quote,
  QuoteRequest,
  StatusResult,
  SwapStatus,
  TransactionResult,
} from './types';

interface DeBridgeEstimation {
  srcChainTokenIn: {
    address: string;
    amount: string;
    decimals: number;
    symbol: string;
  };
  srcChainTokenOut: {
    address: string;
    amount: string;
    decimals: number;
    symbol: string;
  };
  dstChainTokenOut: {
    address: string;
    amount: string;
    recommendedAmount: string;
    decimals: number;
    symbol: string;
    minAmount?: string;
  };
  costsDetails: Array<{
    chain: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: string;
    type: string;
  }>;
}

interface DeBridgeCreateTxResponse {
  estimation: DeBridgeEstimation;
  tx: {
    data: string; // hex-encoded VersionedTransaction for Solana
    to: string;
    value: string;
  };
  orderId: string;
  fixFee: string;
  userPoints?: number;
  integratorPoints?: number;
}

interface DeBridgeOrderStatus {
  orderId: string;
  status: string;
  fulfilledDstEventMetadata?: {
    transactionHash?: string;
  };
}

export class DeBridgeProvider implements BridgeProvider {
  name: BridgeProviderName = 'debridge';

  async getQuote(request: QuoteRequest): Promise<Quote> {
    const config = getConfig();

    const params = new URLSearchParams({
      srcChainId: SOLANA_CHAIN_ID_DEBRIDGE.toString(),
      srcChainTokenIn: request.inputToken,
      srcChainTokenInAmount: request.inputAmount.toString(),
      dstChainId: request.destChainId.toString(),
      dstChainTokenOut: request.outputToken,
      dstChainTokenOutAmount: 'auto',
      dstChainTokenOutRecipient: request.recipientAddress,
      srcChainOrderAuthorityAddress: request.userWallet,
      dstChainOrderAuthorityAddress: request.recipientAddress,
      prependOperatingExpenses: 'true',
    });

    const url = `${config.debridgeApiUrl}/dln/order/create-tx?${params.toString()}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `deBridge quote failed (${response.status}): ${errorText}`
      );
    }

    const data: DeBridgeCreateTxResponse = await response.json();

    const estimatedOutput = BigInt(
      data.estimation.dstChainTokenOut.recommendedAmount ||
        data.estimation.dstChainTokenOut.amount
    );

    const minOutput = data.estimation.dstChainTokenOut.minAmount
      ? BigInt(data.estimation.dstChainTokenOut.minAmount)
      : estimatedOutput;

    // deBridge fixed fee on Solana: 0.015 SOL + variable bps
    const fixedFee = BigInt(DEBRIDGE_FIXED_FEE_LAMPORTS);
    // Estimate variable fees from cost details
    let variableFee = 0n;
    for (const cost of data.estimation.costsDetails || []) {
      if (cost.type === 'DlnProtocolFee' || cost.type === 'EstimatedOperatingExpenses') {
        variableFee += BigInt(cost.amountIn || '0');
      }
    }

    return {
      provider: 'debridge',
      inputAmount: request.inputAmount,
      estimatedOutputAmount: estimatedOutput,
      minOutputAmount: minOutput,
      providerFeeNative: fixedFee + variableFee,
      providerFeeUsd: 0, // deBridge doesn't easily expose USD fee in this response
      estimatedTimeSeconds: 15, // deBridge is typically fast (~10-30s)
      providerData: data,
      expiresAt: Date.now() + QUOTE_EXPIRY_MS,
    };
  }

  async createTransaction(quote: Quote): Promise<TransactionResult> {
    const data = quote.providerData as DeBridgeCreateTxResponse;

    if (!data.tx?.data) {
      throw new Error('deBridge: no transaction data in response');
    }

    // deBridge returns hex-encoded serialized VersionedTransaction
    // The data has a 0x prefix that needs to be stripped when deserializing
    return {
      serializedTransaction: data.tx.data,
      orderId: data.orderId,
    };
  }

  async getStatus(orderId: string): Promise<StatusResult> {
    const config = getConfig();

    const response = await fetch(
      `${config.debridgeStatsApiUrl}/api/Orders/${orderId}`
    );

    if (!response.ok) {
      return { status: 'bridging' };
    }

    const data: DeBridgeOrderStatus = await response.json();
    const dbStatus = (data.status || '').toLowerCase();

    let status: SwapStatus;
    switch (dbStatus) {
      case 'claimedunlock':
      case 'sentunlock':
      case 'fulfilled':
        status = 'completed';
        break;
      case 'sentordercancel':
      case 'claimedordercancel':
        status = 'refunded';
        break;
      case 'cancelled':
        status = 'failed';
        break;
      case 'created':
      default:
        status = 'bridging';
        break;
    }

    return {
      status,
      destTxHash: data.fulfilledDstEventMetadata?.transactionHash,
    };
  }
}
