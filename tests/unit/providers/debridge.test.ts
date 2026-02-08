import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeBridgeProvider } from '@/lib/providers/debridge';
import type { QuoteRequest } from '@/lib/providers/types';

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock('@/lib/config', () => ({
  getConfig: () => ({
    debridgeApiUrl: 'https://dln.debridge.finance/v1.0',
    debridgeStatsApiUrl: 'https://stats-api.dln.trade',
  }),
}));

describe('DeBridgeProvider', () => {
  let provider: DeBridgeProvider;

  beforeEach(() => {
    provider = new DeBridgeProvider();
    mockFetch.mockReset();
  });

  const mockRequest: QuoteRequest = {
    inputToken: 'So11111111111111111111111111111111111111112',
    inputAmount: 1_000_000_000n,
    destChainId: 1,
    outputToken: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    userWallet: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    recipientAddress: '0x1234567890abcdef1234567890abcdef12345678',
  };

  describe('getQuote', () => {
    it('returns a valid quote on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          estimation: {
            srcChainTokenIn: {
              address: 'So11111111111111111111111111111111111111112',
              amount: '1000000000',
              decimals: 9,
              symbol: 'SOL',
            },
            srcChainTokenOut: {
              address: 'So11111111111111111111111111111111111111112',
              amount: '985000000',
              decimals: 9,
              symbol: 'SOL',
            },
            dstChainTokenOut: {
              address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
              amount: '148500000',
              recommendedAmount: '149000000',
              decimals: 6,
              symbol: 'USDC',
            },
            costsDetails: [
              {
                chain: 'solana',
                tokenIn: 'SOL',
                tokenOut: 'SOL',
                amountIn: '15000000',
                amountOut: '15000000',
                type: 'DlnProtocolFee',
              },
            ],
          },
          tx: {
            data: '0xabcdef1234',
            to: 'DlnProgram...',
            value: '0',
          },
          orderId: '0xorder123',
          fixFee: '15000000',
        }),
      });

      const quote = await provider.getQuote(mockRequest);

      expect(quote.provider).toBe('debridge');
      expect(quote.inputAmount).toBe(1_000_000_000n);
      expect(quote.estimatedOutputAmount).toBe(149_000_000n);
      expect(quote.providerFeeNative).toBe(15_000_000n + 15_000_000n); // fixed + variable
      expect(quote.estimatedTimeSeconds).toBe(15);
      expect(quote.expiresAt).toBeGreaterThan(Date.now());
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(provider.getQuote(mockRequest)).rejects.toThrow(
        'deBridge quote failed (500)'
      );
    });

    it('uses correct Solana chain ID (7565164)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          estimation: {
            srcChainTokenIn: { amount: '1000000000', decimals: 9, symbol: 'SOL', address: '' },
            srcChainTokenOut: { amount: '985000000', decimals: 9, symbol: 'SOL', address: '' },
            dstChainTokenOut: { amount: '149000000', recommendedAmount: '149000000', decimals: 6, symbol: 'USDC', address: '' },
            costsDetails: [],
          },
          tx: { data: '0xabc', to: '', value: '0' },
          orderId: '0xorder123',
          fixFee: '15000000',
        }),
      });

      await provider.getQuote(mockRequest);

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('srcChainId=7565164');
    });
  });

  describe('createTransaction', () => {
    it('extracts hex-encoded tx data and orderId', async () => {
      const quote = {
        provider: 'debridge' as const,
        inputAmount: 1_000_000_000n,
        estimatedOutputAmount: 149_000_000n,
        minOutputAmount: 149_000_000n,
        providerFeeNative: 30_000_000n,
        providerFeeUsd: 0,
        estimatedTimeSeconds: 15,
        expiresAt: Date.now() + 30_000,
        providerData: {
          tx: { data: '0xdeadbeef', to: '', value: '0' },
          orderId: '0xorder456',
        },
      };

      const result = await provider.createTransaction(quote);

      expect(result.serializedTransaction).toBe('0xdeadbeef');
      expect(result.orderId).toBe('0xorder456');
    });
  });

  describe('getStatus', () => {
    it('maps Fulfilled to completed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orderId: '0xorder123',
          status: 'Fulfilled',
          fulfilledDstEventMetadata: {
            transactionHash: '0xtxhash123',
          },
        }),
      });

      const result = await provider.getStatus('0xorder123');

      expect(result.status).toBe('completed');
      expect(result.destTxHash).toBe('0xtxhash123');
    });

    it('maps ClaimedUnlock to completed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orderId: '0xorder123',
          status: 'ClaimedUnlock',
        }),
      });

      const result = await provider.getStatus('0xorder123');
      expect(result.status).toBe('completed');
    });

    it('maps Created to bridging', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orderId: '0xorder123',
          status: 'Created',
        }),
      });

      const result = await provider.getStatus('0xorder123');
      expect(result.status).toBe('bridging');
    });

    it('maps Cancelled to failed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orderId: '0xorder123',
          status: 'Cancelled',
        }),
      });

      const result = await provider.getStatus('0xorder123');
      expect(result.status).toBe('failed');
    });

    it('returns bridging on API error', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const result = await provider.getStatus('0xorder123');
      expect(result.status).toBe('bridging');
    });
  });
});
