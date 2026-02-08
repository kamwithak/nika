'use client';

import { useState, useCallback } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';
import type { QuoteResult } from './useQuote';

export type SwapState =
  | 'idle'
  | 'preparing'
  | 'signing_fee'
  | 'submitting_fee'
  | 'signing_bridge'
  | 'submitting_bridge'
  | 'tracking'
  | 'completed'
  | 'error';

interface SwapParams {
  inputToken: string;
  inputTokenSymbol: string;
  inputAmount: string;
  destChainId: number;
  destChain: string;
  outputToken: string;
  outputTokenSymbol: string;
  recipientAddress: string;
  selectedQuote: QuoteResult;
}

interface UseSwapReturn {
  state: SwapState;
  swapId: string | null;
  bridgeOrderId: string | null;
  txSignature: string | null;
  error: string | null;
  execute: (params: SwapParams) => Promise<void>;
  reset: () => void;
}

export function useSwap(): UseSwapReturn {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  const [state, setState] = useState<SwapState>('idle');
  const [swapId, setSwapId] = useState<string | null>(null);
  const [bridgeOrderId, setBridgeOrderId] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(
    async (params: SwapParams) => {
      if (!publicKey || !signTransaction) {
        setError('Wallet not connected');
        setState('error');
        return;
      }

      setState('preparing');
      setError(null);
      setSwapId(null);
      setBridgeOrderId(null);
      setTxSignature(null);

      try {
        // Step 1: Call /api/swap to get partially-signed transactions
        const response = await fetch('/api/swap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userWallet: publicKey.toBase58(),
            inputToken: params.inputToken,
            inputTokenSymbol: params.inputTokenSymbol,
            inputAmount: params.inputAmount,
            destChainId: params.destChainId,
            destChain: params.destChain,
            outputToken: params.outputToken,
            outputTokenSymbol: params.outputTokenSymbol,
            recipientAddress: params.recipientAddress,
            selectedProvider: params.selectedQuote.provider,
            providerData: params.selectedQuote.providerData,
            quotedFee: params.selectedQuote.fee.totalFee,
            feeToken: params.selectedQuote.fee.feeToken,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Swap preparation failed');
        }

        const result = await response.json();
        setSwapId(result.swapId);
        setBridgeOrderId(result.bridgeOrderId);

        // Step 2: Sign fee payment transaction
        setState('signing_fee');
        const feeTx = VersionedTransaction.deserialize(
          Buffer.from(result.feePaymentTx, 'base64')
        );
        const signedFeeTx = await signTransaction(feeTx);

        // Step 3: Submit fee payment transaction
        setState('submitting_fee');
        const feeSignature = await connection.sendRawTransaction(
          signedFeeTx.serialize(),
          { skipPreflight: false, preflightCommitment: 'confirmed' }
        );

        const { blockhash, lastValidBlockHeight } =
          await connection.getLatestBlockhash('confirmed');
        await connection.confirmTransaction(
          { signature: feeSignature, blockhash, lastValidBlockHeight },
          'confirmed'
        );

        // Step 4: Sign bridge transaction
        setState('signing_bridge');
        const bridgeTx = VersionedTransaction.deserialize(
          Buffer.from(result.bridgeTx, 'base64')
        );
        const signedBridgeTx = await signTransaction(bridgeTx);

        // Step 5: Submit bridge transaction
        setState('submitting_bridge');
        const bridgeSignature = await connection.sendRawTransaction(
          signedBridgeTx.serialize(),
          { skipPreflight: false, preflightCommitment: 'confirmed' }
        );

        setTxSignature(bridgeSignature);

        await connection.confirmTransaction(
          {
            signature: bridgeSignature,
            blockhash: (await connection.getLatestBlockhash('confirmed'))
              .blockhash,
            lastValidBlockHeight: (
              await connection.getLatestBlockhash('confirmed')
            ).lastValidBlockHeight,
          },
          'confirmed'
        );

        // Step 6: Track status
        setState('tracking');
      } catch (err) {
        console.error('Swap error:', err);
        setError(err instanceof Error ? err.message : 'Swap failed');
        setState('error');
      }
    },
    [publicKey, signTransaction, connection]
  );

  const reset = useCallback(() => {
    setState('idle');
    setSwapId(null);
    setBridgeOrderId(null);
    setTxSignature(null);
    setError(null);
  }, []);

  return { state, swapId, bridgeOrderId, txSignature, error, execute, reset };
}
