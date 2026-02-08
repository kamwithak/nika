import {
  PublicKey,
  TransactionMessage,
  TransactionInstruction,
  VersionedTransaction,
  AddressLookupTableAccount,
} from '@solana/web3.js';
import { getConfig } from '../config';
import { getConnection } from '../solana/connection';
import { SOLANA_CHAIN_ID_RELAY, QUOTE_EXPIRY_MS, SOL_NATIVE_MINT } from '../constants';
import type {
  BridgeProvider,
  BridgeProviderName,
  Quote,
  QuoteRequest,
  StatusResult,
  SwapStatus,
  TransactionResult,
} from './types';

// Relay uses a special address for native SOL
const RELAY_NATIVE_SOL = '11111111111111111111111111111111';

function toRelayCurrency(mint: string): string {
  if (mint === SOL_NATIVE_MINT) {
    return RELAY_NATIVE_SOL;
  }
  return mint;
}

interface RelayInstructionKey {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

interface RelayInstruction {
  keys: RelayInstructionKey[];
  programId: string;
  data: string; // hex-encoded instruction data
}

interface RelaySolanaData {
  instructions: RelayInstruction[];
  addressLookupTableAddresses?: string[];
}

interface RelayStep {
  id: string;
  action: string;
  description: string;
  kind: string;
  requestId?: string;
  items: Array<{
    status: string;
    data: RelaySolanaData | { [key: string]: unknown };
    check: {
      endpoint: string;
      method: string;
    };
  }>;
}

interface RelayQuoteResponse {
  steps: RelayStep[];
  fees: {
    relayer: { amount: string; amountUsd: string };
    relayerGas: { amount: string; amountUsd: string };
    relayerService: { amount: string; amountUsd: string };
    app?: { amount: string; amountUsd: string };
  };
  details: {
    currencyIn: { amount: string; amountUsd: string };
    currencyOut: { amount: string; amountUsd: string; minimumAmount?: string };
    rate: string;
    timeEstimate: number;
  };
}

export class RelayProvider implements BridgeProvider {
  name: BridgeProviderName = 'relay';

  async getQuote(request: QuoteRequest): Promise<Quote> {
    const config = getConfig();

    const body = {
      user: request.userWallet,
      originChainId: SOLANA_CHAIN_ID_RELAY,
      destinationChainId: request.destChainId,
      originCurrency: toRelayCurrency(request.inputToken),
      destinationCurrency: request.outputToken,
      recipient: request.recipientAddress,
      amount: request.inputAmount.toString(),
      tradeType: 'EXACT_INPUT',
    };

    const response = await fetch(`${config.relayApiUrl}/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Relay quote failed (${response.status}): ${errorText}`);
    }

    const data: RelayQuoteResponse = await response.json();

    const estimatedOutput = BigInt(data.details.currencyOut.amount);
    const minOutput = data.details.currencyOut.minimumAmount
      ? BigInt(data.details.currencyOut.minimumAmount)
      : estimatedOutput;

    const relayerFeeNative = BigInt(data.fees.relayer.amount || '0');
    const relayerFeeUsd = parseFloat(data.fees.relayer.amountUsd || '0');

    return {
      provider: 'relay',
      inputAmount: request.inputAmount,
      estimatedOutputAmount: estimatedOutput,
      minOutputAmount: minOutput,
      providerFeeNative: relayerFeeNative,
      providerFeeUsd: relayerFeeUsd,
      estimatedTimeSeconds: data.details.timeEstimate || 30,
      providerData: data,
      expiresAt: Date.now() + QUOTE_EXPIRY_MS,
    };
  }

  async createTransaction(quote: Quote): Promise<TransactionResult> {
    const data = quote.providerData as RelayQuoteResponse;

    // Find the deposit/transaction step
    const txStep = data.steps.find(
      (s) => s.kind === 'transaction' || s.kind === 'signature'
    );

    if (!txStep || txStep.items.length === 0) {
      throw new Error('Relay: no transaction step found in quote response');
    }

    const item = txStep.items[0];
    const solanaData = item.data as RelaySolanaData;

    if (!solanaData?.instructions || solanaData.instructions.length === 0) {
      throw new Error('Relay: no instructions found in step item');
    }

    // Extract requestId from the check endpoint or the step itself
    const checkUrl = item.check?.endpoint || '';
    const requestIdMatch = checkUrl.match(/requestId=([^&]+)/);
    const orderId = requestIdMatch
      ? requestIdMatch[1]
      : txStep.requestId || `relay-${Date.now()}`;

    // Build VersionedTransaction from instructions + address lookup tables
    const connection = getConnection();

    // Convert Relay instructions to Solana TransactionInstructions
    const instructions: TransactionInstruction[] = solanaData.instructions.map(
      (ix) => new TransactionInstruction({
        keys: ix.keys.map((k) => ({
          pubkey: new PublicKey(k.pubkey),
          isSigner: k.isSigner,
          isWritable: k.isWritable,
        })),
        programId: new PublicKey(ix.programId),
        data: Buffer.from(ix.data, 'hex'),
      })
    );

    // Resolve address lookup tables
    const altAddresses = solanaData.addressLookupTableAddresses || [];
    const lookupTables: AddressLookupTableAccount[] = [];
    for (const altAddress of altAddresses) {
      const altAccount = await connection.getAddressLookupTable(
        new PublicKey(altAddress)
      );
      if (altAccount.value) {
        lookupTables.push(altAccount.value);
      }
    }

    // Find the user (first signer that isn't the program)
    const userKey = instructions[0]?.keys.find((k) => k.isSigner)?.pubkey;
    if (!userKey) {
      throw new Error('Relay: could not determine user key from instructions');
    }

    const { blockhash } = await connection.getLatestBlockhash('confirmed');

    const messageV0 = new TransactionMessage({
      payerKey: userKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message(lookupTables);

    const transaction = new VersionedTransaction(messageV0);
    const serialized = Buffer.from(transaction.serialize()).toString('base64');

    return {
      serializedTransaction: serialized,
      orderId,
    };
  }

  async getStatus(orderId: string): Promise<StatusResult> {
    const config = getConfig();

    const response = await fetch(
      `${config.relayApiUrl}/intents/status/v2?requestId=${orderId}`
    );

    if (!response.ok) {
      return { status: 'bridging' }; // Treat errors as still in progress
    }

    const data = await response.json();
    const relayStatus = (data.status || '').toLowerCase();

    let status: SwapStatus;
    switch (relayStatus) {
      case 'success':
      case 'completed':
        status = 'completed';
        break;
      case 'failure':
      case 'failed':
        status = 'failed';
        break;
      case 'refund':
      case 'refunded':
        status = 'refunded';
        break;
      case 'pending':
      case 'waiting':
      case 'submitted':
      default:
        status = 'bridging';
        break;
    }

    return {
      status,
      destTxHash: data.txHash || data.destinationTxHash,
    };
  }
}
