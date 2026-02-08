import 'dotenv/config';

import { getSponsorPublicKey, getSponsorBalance } from '../src/lib/solana/sponsor';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

async function showSponsorInfo() {
  try {
    const publicKey = getSponsorPublicKey();
    const balance = await getSponsorBalance();
    const balanceSol = Number(balance) / LAMPORTS_PER_SOL;

    console.log('\n=== Sponsor Wallet Info ===');
    console.log('Address:', publicKey.toBase58());
    console.log('Current Balance:', balanceSol.toFixed(4), 'SOL');
    console.log('\n💡 Fund this address with SOL and/or USDC to sponsor gas fees for users');
    console.log('===========================\n');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    console.log('\n⚠️  Make sure SPONSOR_PRIVATE_KEY is set in your .env file');
    console.log('   Run: npm run generate:sponsor\n');
  }
}

showSponsorInfo();
