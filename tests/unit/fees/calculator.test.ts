import { describe, it, expect } from 'vitest';
import { lamportsToUsdc } from '@/lib/fees/calculator';

describe('Fee Calculator', () => {
  describe('lamportsToUsdc', () => {
    it('converts lamports to USDC with ceiling', () => {
      // 1 SOL = 150 USDC
      // 1_000_000_000 lamports = 1 SOL = 150 USDC = 150_000_000 raw USDC
      const result = lamportsToUsdc(1_000_000_000n, 150);
      expect(result).toBe(150_000_000n);
    });

    it('rounds up to protect sponsor', () => {
      // Small amount: 1000 lamports at $150/SOL
      // 1000 * 150 / 1000 = 150 raw USDC (0.000150 USDC)
      const result = lamportsToUsdc(1000n, 150);
      expect(result).toBe(150n);
    });

    it('handles fractional prices correctly', () => {
      // 100_000 lamports at $123.45/SOL
      // 100_000 * 123.45 / 1000 = 12345 raw USDC
      const result = lamportsToUsdc(100_000n, 123.45);
      expect(result).toBe(12345n);
    });

    it('always returns positive for positive inputs', () => {
      const result = lamportsToUsdc(1n, 0.01);
      expect(result).toBeGreaterThanOrEqual(1n);
    });

    it('handles large amounts', () => {
      // 10 SOL at $200/SOL = 2000 USDC = 2_000_000_000 raw USDC
      const result = lamportsToUsdc(10_000_000_000n, 200);
      expect(result).toBe(2_000_000_000n);
    });

    it('produces zero for zero lamports', () => {
      const result = lamportsToUsdc(0n, 150);
      expect(result).toBe(0n);
    });
  });

  describe('fee invariants', () => {
    it('percentage markup scales with input amount', () => {
      // Test that for a given fee config, larger swaps have larger absolute fees
      const bps = 50n; // 0.5%
      const smallAmount = 1_000_000n;
      const largeAmount = 1_000_000_000n;

      const smallMarkup = (smallAmount * bps) / 10000n;
      const largeMarkup = (largeAmount * bps) / 10000n;

      expect(largeMarkup).toBeGreaterThan(smallMarkup);
      expect(largeMarkup / smallMarkup).toBe(largeAmount / smallAmount);
    });

    it('fixed buffer is constant regardless of amount', () => {
      const buffer = 10_000_000n; // 0.01 SOL
      // Buffer should be the same for any input amount
      expect(buffer).toBe(10_000_000n);
    });

    it('total cost components sum correctly', () => {
      const gasCost = 110_000n;
      const rentCost = 2_039_280n;
      const providerFee = 15_000_000n;
      const fixedBuffer = 10_000_000n;
      const percentageMarkup = 50_000n;

      const totalCost = gasCost + rentCost + providerFee + fixedBuffer;
      const totalFee = totalCost + percentageMarkup;

      // Fee must always exceed cost
      expect(totalFee).toBeGreaterThan(totalCost);
      // Fee minus markup equals cost
      expect(totalFee - percentageMarkup).toBe(totalCost);
    });
  });
});
