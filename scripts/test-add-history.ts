// Test script to add a sample swap to history
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addTestSwap() {
  try {
    const swap = await prisma.swapHistory.create({
      data: {
        walletAddress: 'DeYmwP58u9y2R79NpGc16xrUk9R3FziuGxhE7GtbYjSF',
        inputToken: 'So11111111111111111111111111111111111111112',
        inputTokenSymbol: 'SOL',
        inputAmount: '100000000', // 0.1 SOL
        outputToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        outputTokenSymbol: 'USDC',
        outputAmount: '8500000', // 8.5 USDC
        sourceChain: 'solana',
        destChain: 'base',
        destChainId: 8453,
        provider: 'debridge',
        sponsorFeePaid: '47000000',
        feeToken: 'SOL',
        txHash: '5Qz..test..hash',
        bridgeOrderId: 'test-order-123',
        status: 'completed',
      },
    });
    
    console.log('✓ Test swap added to history:');
    console.log('  ID:', swap.id);
    console.log('  From:', swap.inputTokenSymbol);
    console.log('  To:', swap.outputTokenSymbol);
    console.log('  Chain:', swap.destChain);
    console.log('  Status:', swap.status);
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

addTestSwap();
