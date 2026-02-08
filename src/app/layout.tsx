import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { WalletContextProvider } from '@/components/providers/WalletContextProvider';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Nika Finance Cross-Chain Swapper',
  description: 'Bridge tokens from Solana to Ethereum, Arbitrum, and Base with sponsored gas fees.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body suppressHydrationWarning className={inter.className}>
        <LoadingSpinner />
        <WalletContextProvider>{children}</WalletContextProvider>
      </body>
    </html>
  );
}
