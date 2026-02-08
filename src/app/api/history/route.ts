import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const wallet = req.nextUrl.searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'wallet query parameter is required' },
        { status: 400 }
      );
    }

    const swaps = await prisma.swapHistory.findMany({
      where: { walletAddress: wallet },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ swaps });
  } catch (error) {
    console.error('History error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch swap history' },
      { status: 500 }
    );
  }
}
