import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@solana/wallet-adapter-react-ui'],
  serverExternalPackages: ['@prisma/client'],
};

export default nextConfig;
