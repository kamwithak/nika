import { describe, it, expect } from 'vitest';
import {
  calculateAmountAfterTransferFee,
  calculateGrossAmountForDesiredNet,
  hasDust,
} from '@/lib/solana/token';

describe('Token-2022 transfer fee calculations', () => {
  describe('calculateAmountAfterTransferFee', () => {
    it('returns full amount when fee is 0 bps', () => {
      const result = calculateAmountAfterTransferFee(1_000_000n, 0, 0n);
      expect(result.netAmount).toBe(1_000_000n);
      expect(result.feeAmount).toBe(0n);
    });

    it('calculates correctly for 100 bps (1%)', () => {
      const result = calculateAmountAfterTransferFee(1_000_000n, 100, 1_000_000n);
      // fee = ceil(1_000_000 * 100 / 10000) = 10_000
      expect(result.feeAmount).toBe(10_000n);
      expect(result.netAmount).toBe(990_000n);
    });

    it('calculates correctly for 50 bps (0.5%)', () => {
      const result = calculateAmountAfterTransferFee(10_000_000n, 50, 10_000_000n);
      // fee = ceil(10_000_000 * 50 / 10000) = 50_000
      expect(result.feeAmount).toBe(50_000n);
      expect(result.netAmount).toBe(9_950_000n);
    });

    it('caps fee at maximumFee', () => {
      const result = calculateAmountAfterTransferFee(100_000_000n, 500, 100_000n);
      // raw fee = ceil(100_000_000 * 500 / 10000) = 5_000_000
      // capped at maximumFee = 100_000
      expect(result.feeAmount).toBe(100_000n);
      expect(result.netAmount).toBe(99_900_000n);
    });

    it('handles small amounts correctly (ceiling division)', () => {
      const result = calculateAmountAfterTransferFee(100n, 100, 1_000_000n);
      // fee = ceil(100 * 100 / 10000) = ceil(1) = 1
      expect(result.feeAmount).toBe(1n);
      expect(result.netAmount).toBe(99n);
    });

    it('handles 1 token amount', () => {
      const result = calculateAmountAfterTransferFee(1n, 100, 1_000_000n);
      // fee = ceil(1 * 100 / 10000) = ceil(0.01) = 1
      expect(result.feeAmount).toBe(1n);
      expect(result.netAmount).toBe(0n);
    });
  });

  describe('calculateGrossAmountForDesiredNet', () => {
    it('returns exact amount when fee is 0', () => {
      const gross = calculateGrossAmountForDesiredNet(1_000_000n, 0, 0n);
      expect(gross).toBe(1_000_000n);
    });

    it('calculates correct gross for 100 bps', () => {
      const desired = 990_000n;
      const gross = calculateGrossAmountForDesiredNet(desired, 100, 1_000_000n);
      // gross should be ~1_000_000 so that after 1% fee, net = 990_000
      const { netAmount } = calculateAmountAfterTransferFee(gross, 100, 1_000_000n);
      expect(netAmount).toBeGreaterThanOrEqual(desired);
      // Gross should not be more than 1% above desired (with ceiling rounding)
      expect(gross).toBeLessThanOrEqual(desired + desired / 99n + 2n);
    });

    it('handles maximumFee cap correctly', () => {
      const desired = 99_900_000n;
      const gross = calculateGrossAmountForDesiredNet(desired, 500, 100_000n);
      // When max fee caps at 100_000, gross = desired + maximumFee
      expect(gross).toBe(desired + 100_000n);
    });

    it('inverse is consistent with forward calculation', () => {
      // For various amounts and fee configs, verify roundtrip
      const testCases = [
        { desired: 5_000_000n, bps: 200, maxFee: 10_000_000n },
        { desired: 1_000n, bps: 50, maxFee: 100_000n },
        { desired: 100_000_000n, bps: 300, maxFee: 50_000n },
      ];

      for (const { desired, bps, maxFee } of testCases) {
        const gross = calculateGrossAmountForDesiredNet(desired, bps, maxFee);
        const { netAmount } = calculateAmountAfterTransferFee(gross, bps, maxFee);
        // Net should be >= desired (we round up gross to ensure this)
        expect(netAmount).toBeGreaterThanOrEqual(desired);
      }
    });
  });

  describe('hasDust', () => {
    it('returns false when fee is 0', () => {
      expect(hasDust(1_000_000n, 500_000n, 0)).toBe(false);
    });

    it('returns false when transferring full balance', () => {
      expect(hasDust(1_000_000n, 1_000_000n, 100)).toBe(false);
    });

    it('returns true when remainder is tiny', () => {
      expect(hasDust(1_000_000n, 999_500n, 100)).toBe(true);
    });

    it('returns false when remainder is substantial', () => {
      expect(hasDust(1_000_000n, 500_000n, 100)).toBe(false);
    });
  });
});
