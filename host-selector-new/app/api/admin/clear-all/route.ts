import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidAdminRequest } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization');
    const adminSession = await isValidAdminRequest(authHeader);
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get counts before clearing
    const studentCount = await prisma.student.count();
    const allocationCount = await prisma.allocation.count();
    const historyCount = await prisma.allocationHistory.count();

    // Clear all data tables but preserve settings in a transaction
    await prisma.$transaction(async (tx) => {
      // Clear all data tables but preserve settings
      await tx.allocation.deleteMany({});
      await tx.student.deleteMany({});
      await tx.allocationHistory.deleteMany({});
    });

    return NextResponse.json({
      message: 'All data cleared successfully',
      cleared: {
        students: studentCount,
        allocations: allocationCount,
        allocation_history: historyCount
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error clearing all data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}