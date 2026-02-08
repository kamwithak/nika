import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import { getConfig } from '../config';
import { getConnection } from './connection';

let sponsorKeypair: Keypair | null = null;

export function getSponsorKeypair(): Keypair {
  if (!sponsorKeypair) {
    const secretKey = bs58.decode(getConfig().sponsorPrivateKey);
    if (secretKey.length !== 64) {
      throw new Error(
        `Invalid sponsor private key: expected 64 bytes, got ${secretKey.length}`
      );
    }
    sponsorKeypair = Keypair.fromSecretKey(secretKey);
  }
  return sponsorKeypair;
}

export function getSponsorPublicKey(): PublicKey {
  return getSponsorKeypair().publicKey;
}

export async function getSponsorBalance(): Promise<bigint> {
  const connection = getConnection();
  const balance = await connection.getBalance(getSponsorPublicKey());
  return BigInt(balance);
}

/**
 * Validates that the sponsor has enough SOL to cover estimated costs.
 * Throws if insufficient. Includes a 2x safety margin.
 */
export async function validateSponsorSolvency(
  estimatedCostLamports: bigint
): Promise<void> {
  const balance = await getSponsorBalance();
  const requiredBalance = estimatedCostLamports * 2n; // 2x safety margin

  if (balance < requiredBalance) {
    const balanceSol = Number(balance) / LAMPORTS_PER_SOL;
    const requiredSol = Number(requiredBalance) / LAMPORTS_PER_SOL;
    throw new Error(
      `Sponsor wallet insufficient balance: ${balanceSol.toFixed(4)} SOL, need ${requiredSol.toFixed(4)} SOL`
    );
  }
}
