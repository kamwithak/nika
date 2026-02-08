import { Connection } from '@solana/web3.js';

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    // Server-side: use SOLANA_RPC_URL, fallback to public for client
    const endpoint = 
      process.env.SOLANA_RPC_URL || 
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 
      'https://api.mainnet-beta.solana.com';
    
    connection = new Connection(endpoint, {
      commitment: 'confirmed',
    });
  }
  return connection;
}
