import { NextResponse } from 'next/server';
import { prisma, getSystemConfig } from '@/lib/prisma';

export async function GET() {
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
        success: true,
        data: {
          allocation: [],
          stats: null,
          has_allocation: false,
          message: 'No current allocation found'
        }
      });
    }

    // Get system configuration for context
    const config = await getSystemConfig();
    const lecturers = config.lecturers;
    const timeSlots = config.time_slots;
    const maxCapacity = config.max_capacity_per_lecturer;

    // Group allocations by student to create the expected format
    const studentAllocations: Record<string, any> = {};
    allocations.forEach(alloc => {
      if (!studentAllocations[alloc.studentId]) {
        studentAllocations[alloc.studentId] = {
          student_id: alloc.studentId,
          name: alloc.student.name || 'Unknown Student',
          time_slot_1: { lecturer: '', time: '' },
          time_slot_2: { lecturer: '', time: '' }
        };
      }
      
      const timeSlotData = timeSlots.find((slot: {id: number, time: string}) => slot.id === alloc.timeSlot);
      if (alloc.timeSlot === 1) {
        studentAllocations[alloc.studentId].time_slot_1 = {
          lecturer: alloc.lecturer,
          time: timeSlotData?.time || `時段 ${alloc.timeSlot}`
        };
      } else if (alloc.timeSlot === 2) {
        studentAllocations[alloc.studentId].time_slot_2 = {
          lecturer: alloc.lecturer,
          time: timeSlotData?.time || `時段 ${alloc.timeSlot}`
        };
      }
    });
    
    const formattedAllocation = Object.values(studentAllocations);

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
    timeSlots.forEach((slot: {id: number}) => {
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

    // Create detailed time slot stats for frontend
    const timeSlotStats: Record<string, any> = {};
    
    timeSlots.forEach((slot: {id: number, name: string, time: string}) => {
      timeSlotStats[slot.id] = {
        name: slot.name,
        time: slot.time,
        lecturers: {} as Record<string, any>
      };
      
      // Initialize lecturer data for this time slot
      lecturers.forEach((lecturer: string) => {
        const slotAllocations = allocations.filter(a => a.timeSlot === slot.id && a.lecturer === lecturer);
        timeSlotStats[slot.id].lecturers[lecturer] = {
          current_count: slotAllocations.length,
          max_capacity: maxCapacity,
          utilization_rate: ((slotAllocations.length / maxCapacity) * 100).toFixed(1),
          students: slotAllocations.map(a => ({
            name: a.student.name,
            student_id: a.studentId
          }))
        };
      });
    });

    const response = {
      success: true,
      data: {
        allocation: formattedAllocation,
        stats: {
          time_slots: timeSlotStats,
          total_allocations: allocations.length,
          allocated_students: new Set(allocations.map(a => a.studentId)).size,
          lecturer_distribution: stats.lecturer_distribution,
          time_slot_distribution: stats.time_slot_distribution
        },
        system_config: {
          lecturers,
          time_slots: timeSlots,
          max_capacity_per_lecturer: maxCapacity
        },
        has_allocation: true,
        last_updated: allocations[0]?.createdAt || null,
        allocation_created_at: allocations[0]?.createdAt || null,
        last_generation_stats: latestHistory ? JSON.parse(latestHistory.stats) : null,
        last_generation_time: latestHistory?.createdAt || null
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching current allocation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}