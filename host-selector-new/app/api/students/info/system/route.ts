import { NextResponse } from 'next/server';
import { getSystemConfig } from '../../../../../lib/prisma';

export async function GET() {
  try {
    const config = await getSystemConfig();

    return NextResponse.json({
      success: true,
      data: {
        lecturers: config.lecturers,
        time_slots: config.time_slots,
        max_capacity: config.max_capacity_per_lecturer
      }
    });

  } catch (error) {
    console.error('Get system info error:', error);
    return NextResponse.json(
      { success: false, message: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}