export interface FeeBreakdown {
  /** Total fee the user must pay */
  totalFee: bigint;
  /** Token in which the fee is denominated */
  feeToken: 'USDC' | 'SOL';
  /** Mint address of the fee token */
  feeMint: string;
  /** Breakdown components (all in lamports) */
  components: {
    solanaGasCost: bigint;
    solanaRentCost: bigint;
    providerFee: bigint;
    percentageMarkup: bigint;
    fixedBuffer: bigint;
  };
  /** SOL/USDC price used for conversion (1 SOL = X USDC) */
  solPriceUsdc: number;
}
