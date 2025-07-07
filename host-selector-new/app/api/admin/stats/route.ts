import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidAdminRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization');
    const adminSession = isValidAdminRequest(authHeader);
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get system configuration
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ['lecturers', 'time_slots', 'max_capacity_per_lecturer']
        }
      }
    });
    
    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);
    
    const lecturers = settingsMap.lecturers ? JSON.parse(settingsMap.lecturers) : [];
    const timeSlots = settingsMap.time_slots ? JSON.parse(settingsMap.time_slots) : [];
    const maxCapacity = settingsMap.max_capacity_per_lecturer ? parseInt(settingsMap.max_capacity_per_lecturer) : 13;

    // Get all students
    const students = await prisma.student.findMany();
    
    // Get current allocations
    const allocations = await prisma.allocation.findMany();
    
    // Calculate student statistics
    const studentStats = {
      total_students: students.length,
      submitted_students: students.filter(s => s.isSubmitted).length,
      pending_students: students.filter(s => !s.isSubmitted).length,
      students_with_preferences: students.filter(s => {
        const prefs = s.preferences ? JSON.parse(s.preferences) : [];
        return prefs.length > 0;
      }).length
    };

    // Calculate allocation statistics
    const allocationStats = {
      total_allocations: allocations.length,
      allocated_students: new Set(allocations.map(a => a.studentId)).size,
      unallocated_students: students.length - new Set(allocations.map(a => a.studentId)).size
    };

    // Calculate lecturer distribution
    const lecturerDistribution: { [key: string]: { slot1: number; slot2: number; total: number } } = {};
    lecturers.forEach((lecturer: string) => {
      lecturerDistribution[lecturer] = { slot1: 0, slot2: 0, total: 0 };
    });

    allocations.forEach(allocation => {
      if (lecturerDistribution[allocation.lecturer]) {
        if (allocation.timeSlot === 1) {
          lecturerDistribution[allocation.lecturer].slot1++;
        } else if (allocation.timeSlot === 2) {
          lecturerDistribution[allocation.lecturer].slot2++;
        }
        lecturerDistribution[allocation.lecturer].total++;
      }
    });

    // Calculate capacity utilization
    const capacityUtilization: { [key: string]: { slot1: number; slot2: number } } = {};
    lecturers.forEach((lecturer: string) => {
      const slot1Count = lecturerDistribution[lecturer]?.slot1 || 0;
      const slot2Count = lecturerDistribution[lecturer]?.slot2 || 0;
      capacityUtilization[lecturer] = {
        slot1: Math.round((slot1Count / maxCapacity) * 100),
        slot2: Math.round((slot2Count / maxCapacity) * 100)
      };
    });

    // Calculate preference satisfaction (only for allocated students)
    const preferenceSatisfaction = {
      first_choice: 0,
      second_choice: 0,
      third_choice: 0,
      fourth_choice: 0,
      no_preference_satisfied: 0
    };

    // Group allocations by student
    const studentAllocations: { [key: string]: typeof allocations } = {};
    allocations.forEach(allocation => {
      if (!studentAllocations[allocation.studentId]) {
        studentAllocations[allocation.studentId] = [];
      }
      studentAllocations[allocation.studentId].push(allocation);
    });

    // Check preference satisfaction for each allocated student
    Object.keys(studentAllocations).forEach(studentId => {
      const student = students.find(s => s.studentId === studentId);
      if (student) {
        const preferences = student.preferences ? JSON.parse(student.preferences) : [];
        const studentAllocs = studentAllocations[studentId];
        
        let bestRank = null;
        for (const alloc of studentAllocs) {
          const rank = preferences.indexOf(alloc.lecturer);
          if (rank !== -1) {
            if (bestRank === null || rank < bestRank) {
              bestRank = rank;
            }
          }
        }

        if (bestRank !== null) {
          switch (bestRank) {
            case 0: preferenceSatisfaction.first_choice++; break;
            case 1: preferenceSatisfaction.second_choice++; break;
            case 2: preferenceSatisfaction.third_choice++; break;
            case 3: preferenceSatisfaction.fourth_choice++; break;
          }
        } else {
          preferenceSatisfaction.no_preference_satisfied++;
        }
      }
    });

    // Get allocation history count
    const historyCount = await prisma.allocationHistory.count();

    return NextResponse.json({
      success: true,
      data: {
        students: {
          total: studentStats.total_students,
          submitted: studentStats.submitted_students,
          pending: studentStats.pending_students,
          allocated: allocationStats.allocated_students
        },
        system_info: {
          lecturers,
          time_slots: timeSlots,
          max_capacity_per_lecturer: maxCapacity,
          total_capacity: maxCapacity * lecturers.length * timeSlots.length
        },
        student_stats: studentStats,
        allocation_stats: allocationStats,
        lecturer_distribution: lecturerDistribution,
        capacity_utilization: capacityUtilization,
        preference_satisfaction: preferenceSatisfaction,
        allocation_history_count: historyCount,
        last_updated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching system statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}