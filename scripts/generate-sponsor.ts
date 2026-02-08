import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

const keypair = Keypair.generate();
const secretKey = bs58.encode(keypair.secretKey);

console.log('\n=== Sponsor Keypair Generated ===');
console.log('Public Key:', keypair.publicKey.toBase58());
console.log('\nPrivate Key (add this to .env as SPONSOR_PRIVATE_KEY):');
console.log(secretKey);
console.log('\nIMPORTANT: Fund this wallet with SOL/USDC to cover gas sponsorship costs!');
console.log('=====================================\n');
