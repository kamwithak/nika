import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { SOL_NATIVE_MINT, SOLANA_PRIORITY_FEE_ESTIMATE } from '../constants';
import { getTokenProgramForMint, getOrCreateATAInstruction } from './token';

export interface FeePaymentParams {
  userWallet: PublicKey;
  sponsorPublicKey: PublicKey;
  feeAmount: bigint;
  feeToken: 'USDC' | 'SOL';
  feeMint: PublicKey;
  feeMintDecimals: number;
  connection: Connection;
}

/**
 * Build a transaction where the user transfers the sponsor fee to the sponsor wallet.
 * The sponsor is the fee payer (pays gas), user signs the transfer.
 * Returns a VersionedTransaction ready for both signatures.
 */
export async function buildFeePaymentTransaction(
  params: FeePaymentParams
): Promise<VersionedTransaction> {
  const {
    userWallet,
    sponsorPublicKey,
    feeAmount,
    feeToken,
    feeMint,
    feeMintDecimals,
    connection,
  } = params;

  const instructions: TransactionInstruction[] = [];

  // Add priority fee
  instructions.push(
    ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: SOLANA_PRIORITY_FEE_ESTIMATE,
    })
  );

  if (feeToken === 'SOL') {
    // SOL transfer from user to sponsor
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: userWallet,
        toPubkey: sponsorPublicKey,
        lamports: feeAmount,
      })
    );
  } else {
    // USDC (SPL token) transfer from user to sponsor
    const programId = await getTokenProgramForMint(connection, feeMint);

    const userAta = getAssociatedTokenAddressSync(
      feeMint,
      userWallet,
      true,
      programId
    );

    // Ensure sponsor's ATA exists
    const sponsorAta = await getOrCreateATAInstruction(
      connection,
      sponsorPublicKey, // sponsor pays to create their own ATA if needed
      feeMint,
      sponsorPublicKey,
      programId
    );

    if (sponsorAta.instruction) {
      instructions.push(sponsorAta.instruction);
    }

    instructions.push(
      createTransferCheckedInstruction(
        userAta,
        feeMint,
        sponsorAta.address,
        userWallet, // user is the authority
        feeAmount,
        feeMintDecimals,
        [],
        programId
      )
    );
  }

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');

  const messageV0 = new TransactionMessage({
    payerKey: sponsorPublicKey, // Sponsor pays gas
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const transaction = new VersionedTransaction(messageV0);

  return transaction;
}

/**
 * Deserialize a bridge provider's transaction, update the blockhash,
 * and return it ready for signing.
 */
export async function prepareBridgeTransaction(
  serializedTx: string,
  connection: Connection,
  encoding: 'base64' | 'hex' = 'base64'
): Promise<VersionedTransaction> {
  let buffer: Uint8Array;

  if (encoding === 'hex') {
    // deBridge returns hex-encoded tx (with optional 0x prefix)
    const hex = serializedTx.startsWith('0x')
      ? serializedTx.slice(2)
      : serializedTx;
    buffer = Buffer.from(hex, 'hex');
  } else {
    buffer = Buffer.from(serializedTx, 'base64');
  }

  const transaction = VersionedTransaction.deserialize(buffer);

  // Update blockhash to a fresh one
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  transaction.message.recentBlockhash = blockhash;

  return transaction;
}

/**
 * Sign a transaction with the given signers and submit it to the network.
 * Returns the transaction signature.
 * Includes retry logic with confirmation waiting.
 */
export async function signAndSubmitTransaction(
  transaction: VersionedTransaction,
  signers: Keypair[],
  connection: Connection
): Promise<string> {
  transaction.sign(signers);

  const rawTransaction = transaction.serialize();

  const signature = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
    maxRetries: 3,
  });

  // Wait for confirmation
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');

  await connection.confirmTransaction(
    {
      signature,
      blockhash,
      lastValidBlockHeight,
    },
    'confirmed'
  );

  return signature;
}
