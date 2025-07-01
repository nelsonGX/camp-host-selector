import { NextRequest, NextResponse } from 'next/server';
import { prisma, getSystemConfig } from '@/lib/prisma';
import { isValidAdminRequest } from '@/lib/auth';
import { AllocationAlgorithm } from '@/lib/allocationAlgorithm';

export async function POST(request: NextRequest) {
  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization');
    const adminSession = isValidAdminRequest(authHeader);
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get system configuration
    const config = await getSystemConfig();
    const lecturers = config.lecturers;
    const maxCapacity = config.max_capacity_per_lecturer;

    // Get all submitted students
    const students = await prisma.student.findMany({
      where: { isSubmitted: true }
    });
    
    if (students.length === 0) {
      return NextResponse.json({ error: 'No submitted students found' }, { status: 400 });
    }

    // Format students for allocation algorithm
    const formattedStudents = students.map(student => ({
      studentId: student.studentId,
      name: student.name,
      preferences: student.preferences ? JSON.parse(student.preferences) : []
    }));

    // Run allocation algorithm
    const algorithm = new AllocationAlgorithm(lecturers, maxCapacity);
    const { allocation, stats } = algorithm.allocate(formattedStudents);

    // Clear existing allocations
    await prisma.allocation.deleteMany();

    // Insert new allocations
    for (const alloc of allocation) {
      await prisma.allocation.create({
        data: {
          studentId: alloc.studentId,
          timeSlot: alloc.timeSlot,
          lecturer: alloc.lecturer
        }
      });
    }

    // Save allocation history
    await prisma.allocationHistory.create({
      data: {
        allocationData: JSON.stringify(allocation),
        stats: JSON.stringify(stats)
      }
    });

    // Format allocation results for response
    const formattedAllocation = allocation.map(alloc => ({
      student_id: alloc.studentId,
      student_name: students.find(s => s.studentId === alloc.studentId)?.name || '',
      time_slot: alloc.timeSlot,
      lecturer: alloc.lecturer
    }));

    return NextResponse.json({
      allocation: formattedAllocation,
      stats,
      message: 'Allocation generated successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating allocation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}