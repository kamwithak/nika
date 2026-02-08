import { NextRequest, NextResponse } from 'next/server';
import { pollSwapStatus } from '@/lib/swap/status';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Swap ID is required' },
        { status: 400 }
      );
    }

    const result = await pollSwapStatus(id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Status poll error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to check status',
      },
      { status: 500 }
    );
  }
}
