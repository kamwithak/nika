'use client';

import { useMemo, useState, useEffect, type ReactNode } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';

import '@solana/wallet-adapter-react-ui/styles.css';

export function WalletContextProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    'https://api.mainnet-beta.solana.com';

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch by only rendering wallet UI on client
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
