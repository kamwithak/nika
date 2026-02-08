import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RelayProvider } from '@/lib/providers/relay';
import type { QuoteRequest } from '@/lib/providers/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock config
vi.mock('@/lib/config', () => ({
  getConfig: () => ({
    relayApiUrl: 'https://api.relay.link',
  }),
}));

// Mock Solana connection
vi.mock('@/lib/solana/connection', () => ({
  getConnection: () => ({
    getAddressLookupTable: vi.fn().mockResolvedValue({ value: null }),
    getLatestBlockhash: vi.fn().mockResolvedValue({
      // Use a valid base58-encoded blockhash (32 bytes = ~44 base58 chars)
      blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
      lastValidBlockHeight: 1000000,
    }),
  }),
}));

describe('RelayProvider', () => {
  let provider: RelayProvider;

  beforeEach(() => {
    provider = new RelayProvider();
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
          steps: [
            {
              id: 'step-1',
              action: 'deposit',
              description: 'Deposit',
              kind: 'transaction',
              items: [
                {
                  status: 'incomplete',
                  data: { data: 'base64txdata' },
                  check: {
                    endpoint: '/intents/status/v2?requestId=test-req-id',
                    method: 'GET',
                  },
                },
              ],
            },
          ],
          fees: {
            relayer: { amount: '5000000', amountUsd: '0.75' },
            relayerGas: { amount: '3000000', amountUsd: '0.45' },
            relayerService: { amount: '2000000', amountUsd: '0.30' },
          },
          details: {
            currencyIn: {
              amount: '1000000000',
              amountUsd: '150.00',
            },
            currencyOut: {
              amount: '150000000',
              amountUsd: '150.00',
              minimumAmount: '149000000',
            },
            rate: '0.15',
            timeEstimate: 30,
          },
        }),
      });

      const quote = await provider.getQuote(mockRequest);

      expect(quote.provider).toBe('relay');
      expect(quote.inputAmount).toBe(1_000_000_000n);
      expect(quote.estimatedOutputAmount).toBe(150_000_000n);
      expect(quote.minOutputAmount).toBe(149_000_000n);
      expect(quote.providerFeeNative).toBe(5_000_000n);
      expect(quote.estimatedTimeSeconds).toBe(30);
      expect(quote.expiresAt).toBeGreaterThan(Date.now());
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      });

      await expect(provider.getQuote(mockRequest)).rejects.toThrow(
        'Relay quote failed (400)'
      );
    });
  });

  describe('createTransaction', () => {
    it('extracts orderId from check endpoint', async () => {
      // This test just validates orderId extraction logic
      // Full transaction building is integration-tested
      const quote = {
        provider: 'relay' as const,
        inputAmount: 1_000_000_000n,
        estimatedOutputAmount: 150_000_000n,
        minOutputAmount: 149_000_000n,
        providerFeeNative: 5_000_000n,
        providerFeeUsd: 0.75,
        estimatedTimeSeconds: 30,
        expiresAt: Date.now() + 30_000,
        providerData: {
          steps: [
            {
              id: 'step-1',
              action: 'deposit',
              description: 'Deposit',
              kind: 'transaction',
              items: [
                {
                  status: 'incomplete',
                  data: {
                    instructions: [
                      {
                        keys: [
                          {
                            pubkey: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
                            isSigner: true,
                            isWritable: true,
                          },
                        ],
                        programId: '11111111111111111111111111111111',
                        data: '00',
                      },
                    ],
                    addressLookupTableAddresses: [],
                  },
                  check: {
                    endpoint:
                      '/intents/status/v2?requestId=abc-123&chainId=1',
                    method: 'GET',
                  },
                },
              ],
            },
          ],
          fees: {},
          details: {},
        },
      };

      const result = await provider.createTransaction(quote);

      // Verify orderId was extracted from check endpoint
      expect(result.orderId).toBe('abc-123');
      // Verify transaction was serialized
      expect(result.serializedTransaction).toBeDefined();
      expect(typeof result.serializedTransaction).toBe('string');
      expect(result.serializedTransaction.length).toBeGreaterThan(0);
    });
  });

  describe('getStatus', () => {
    it('maps success status to completed', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'success',
          txHash: '0xabc123',
        }),
      });

      const result = await provider.getStatus('test-id');

      expect(result.status).toBe('completed');
      expect(result.destTxHash).toBe('0xabc123');
    });

    it('maps pending status to bridging', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'pending',
        }),
      });

      const result = await provider.getStatus('test-id');
      expect(result.status).toBe('bridging');
    });

    it('returns bridging on API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      });

      const result = await provider.getStatus('test-id');
      expect(result.status).toBe('bridging');
    });
  });
});
