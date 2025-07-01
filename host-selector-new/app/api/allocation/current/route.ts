import { NextRequest, NextResponse } from 'next/server';
import { prisma, getSystemConfig } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Get current allocations with student information
    const allocations = await prisma.allocation.findMany({
      include: {
        student: true
      },
      orderBy: [
        { timeSlot: 'asc' },
        { lecturer: 'asc' },
        { student: { name: 'asc' } }
      ]
    });

    if (allocations.length === 0) {
      return NextResponse.json({
        allocation: [],
        message: 'No current allocation found',
        has_allocation: false
      });
    }

    // Get system configuration for context
    const config = await getSystemConfig();
    const lecturers = config.lecturers;
    const timeSlots = config.time_slots;
    const maxCapacity = config.max_capacity_per_lecturer;

    // Format allocation data
    const formattedAllocation = allocations.map(alloc => ({
      student_id: alloc.studentId,
      student_name: alloc.student.name || 'Unknown Student',
      time_slot: alloc.timeSlot,
      lecturer: alloc.lecturer,
      created_at: alloc.createdAt
    }));

    // Calculate summary statistics
    const stats = {
      total_allocations: allocations.length,
      allocated_students: new Set(allocations.map(a => a.studentId)).size,
      lecturer_distribution: {} as { [key: string]: { slot1: number; slot2: number; total: number } },
      time_slot_distribution: {} as { [key: number]: number }
    };

    // Initialize lecturer distribution
    lecturers.forEach((lecturer: string) => {
      stats.lecturer_distribution[lecturer] = { slot1: 0, slot2: 0, total: 0 };
    });

    // Initialize time slot distribution
    timeSlots.forEach((slot: any) => {
      stats.time_slot_distribution[slot.id] = 0;
    });

    // Calculate distributions
    allocations.forEach(alloc => {
      // Lecturer distribution
      if (stats.lecturer_distribution[alloc.lecturer]) {
        if (alloc.timeSlot === 1) {
          stats.lecturer_distribution[alloc.lecturer].slot1++;
        } else if (alloc.timeSlot === 2) {
          stats.lecturer_distribution[alloc.lecturer].slot2++;
        }
        stats.lecturer_distribution[alloc.lecturer].total++;
      }

      // Time slot distribution
      if (stats.time_slot_distribution[alloc.timeSlot] !== undefined) {
        stats.time_slot_distribution[alloc.timeSlot]++;
      }
    });

    // Get the most recent allocation history entry for additional context
    const latestHistory = await prisma.allocationHistory.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    const response = {
      allocation: formattedAllocation,
      stats,
      system_config: {
        lecturers,
        time_slots: timeSlots,
        max_capacity_per_lecturer: maxCapacity
      },
      has_allocation: true,
      allocation_created_at: allocations[0]?.createdAt || null,
      last_generation_stats: latestHistory ? JSON.parse(latestHistory.stats) : null,
      last_generation_time: latestHistory?.createdAt || null
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching current allocation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}