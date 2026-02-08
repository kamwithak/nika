import {
  Connection,
  PublicKey,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  getMint,
  getTransferFeeConfig,
  Mint,
  TransferFeeConfig,
} from '@solana/spl-token';
import { SOL_NATIVE_MINT } from '../constants';

/**
 * Determine which token program owns a given mint.
 * Returns TOKEN_2022_PROGRAM_ID if Token-2022, TOKEN_PROGRAM_ID otherwise.
 */
export async function getTokenProgramForMint(
  connection: Connection,
  mintAddress: PublicKey
): Promise<PublicKey> {
  // Native SOL is not a real mint
  if (mintAddress.equals(new PublicKey(SOL_NATIVE_MINT))) {
    return TOKEN_PROGRAM_ID;
  }

  const accountInfo = await connection.getAccountInfo(mintAddress);
  if (!accountInfo) {
    throw new Error(`Mint account not found: ${mintAddress.toBase58()}`);
  }

  if (accountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
    return TOKEN_2022_PROGRAM_ID;
  }

  return TOKEN_PROGRAM_ID;
}

/**
 * Check if a mint is a Token-2022 token.
 */
export async function isToken2022(
  connection: Connection,
  mintAddress: PublicKey
): Promise<boolean> {
  const programId = await getTokenProgramForMint(connection, mintAddress);
  return programId.equals(TOKEN_2022_PROGRAM_ID);
}

export interface TransferFeeInfo {
  feeBasisPoints: number;
  maximumFee: bigint;
}

/**
 * Get the transfer fee configuration for a Token-2022 mint.
 * Returns null if the mint has no transfer fee extension or is standard SPL.
 */
export async function getTransferFeeInfo(
  connection: Connection,
  mintAddress: PublicKey
): Promise<TransferFeeInfo | null> {
  const programId = await getTokenProgramForMint(connection, mintAddress);

  if (programId.equals(TOKEN_PROGRAM_ID)) {
    return null; // Standard SPL tokens have no transfer fees
  }

  const mintData: Mint = await getMint(
    connection,
    mintAddress,
    'confirmed',
    TOKEN_2022_PROGRAM_ID
  );

  const feeConfig: TransferFeeConfig | null = getTransferFeeConfig(mintData);

  if (!feeConfig) {
    return null; // Token-2022 but no transfer fee extension
  }

  // Use the newer fee config if epoch has passed, otherwise current
  const currentEpoch = (await connection.getEpochInfo()).epoch;
  const activeFee =
    BigInt(currentEpoch) >= feeConfig.newerTransferFee.epoch
      ? feeConfig.newerTransferFee
      : feeConfig.olderTransferFee;

  return {
    feeBasisPoints: activeFee.transferFeeBasisPoints,
    maximumFee: activeFee.maximumFee,
  };
}

/**
 * Calculate the net amount received after transfer fee is withheld.
 */
export function calculateAmountAfterTransferFee(
  amount: bigint,
  feeBasisPoints: number,
  maximumFee: bigint
): { netAmount: bigint; feeAmount: bigint } {
  if (feeBasisPoints === 0) {
    return { netAmount: amount, feeAmount: 0n };
  }

  // fee = ceil(amount * bps / 10000), capped at maximumFee
  const rawFee = (amount * BigInt(feeBasisPoints) + 9999n) / 10000n;
  const feeAmount = rawFee > maximumFee ? maximumFee : rawFee;
  const netAmount = amount - feeAmount;

  return { netAmount, feeAmount };
}

/**
 * Calculate the gross amount that must be sent so that the net received
 * (after transfer fee) equals the desired amount.
 *
 * This is the inverse of calculateAmountAfterTransferFee.
 */
export function calculateGrossAmountForDesiredNet(
  desiredNet: bigint,
  feeBasisPoints: number,
  maximumFee: bigint
): bigint {
  if (feeBasisPoints === 0) {
    return desiredNet;
  }

  // gross = ceil(desiredNet * 10000 / (10000 - bps))
  const denominator = 10000n - BigInt(feeBasisPoints);
  const gross = (desiredNet * 10000n + denominator - 1n) / denominator;

  // Verify: if the fee at this gross exceeds maximumFee, then the actual
  // gross is just desiredNet + maximumFee
  const { feeAmount } = calculateAmountAfterTransferFee(
    gross,
    feeBasisPoints,
    maximumFee
  );
  if (feeAmount >= maximumFee) {
    return desiredNet + maximumFee;
  }

  return gross;
}

/**
 * Detect whether a Token-2022 transfer would leave dust that prevents
 * account closure.
 */
export function hasDust(
  balance: bigint,
  transferAmount: bigint,
  feeBasisPoints: number
): boolean {
  if (feeBasisPoints === 0) return false;
  if (transferAmount >= balance) return false; // sending all, no remnant from amount perspective

  // After sending transferAmount, the fee is withheld from the transferred amount
  // The remaining balance is: balance - transferAmount
  // Dust from withheld fees accumulates in the recipient, not sender
  // But if the user sends their full balance, the account may have withheld fees stuck
  const remainder = balance - transferAmount;
  return remainder > 0n && remainder < 1000n; // <1000 lamports considered dust
}

/**
 * Check if an Associated Token Account exists for a given owner/mint pair.
 * Returns the ATA address and an instruction to create it (null if it exists).
 */
export async function getOrCreateATAInstruction(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey,
  programId: PublicKey = TOKEN_PROGRAM_ID
): Promise<{
  address: PublicKey;
  instruction: TransactionInstruction | null;
}> {
  const ata = getAssociatedTokenAddressSync(mint, owner, true, programId);

  const accountInfo = await connection.getAccountInfo(ata);

  if (accountInfo) {
    return { address: ata, instruction: null };
  }

  const instruction = createAssociatedTokenAccountInstruction(
    payer,
    ata,
    owner,
    mint,
    programId
  );

  return { address: ata, instruction };
}

/**
 * Get the user's token balance for a given mint.
 * Returns 0 if the account doesn't exist.
 */
export async function getTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey,
  programId: PublicKey = TOKEN_PROGRAM_ID
): Promise<bigint> {
  // Native SOL
  if (mint.equals(new PublicKey(SOL_NATIVE_MINT))) {
    const balance = await connection.getBalance(owner);
    return BigInt(balance);
  }

  const ata = getAssociatedTokenAddressSync(mint, owner, true, programId);

  try {
    const accountInfo = await connection.getTokenAccountBalance(ata);
    return BigInt(accountInfo.value.amount);
  } catch {
    return 0n; // Account doesn't exist
  }
}
