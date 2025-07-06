import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidAdminRequest } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization');
    const adminSession = await isValidAdminRequest(authHeader);
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { studentId: id }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Reset student preferences and submission status, and remove allocations in a transaction
    const updatedStudent = await prisma.$transaction(async (tx) => {
      // Remove any existing allocations for this student
      await tx.allocation.deleteMany({
        where: { studentId: id }
      });

      // Reset student preferences and submission status
      return await tx.student.update({
        where: { studentId: id },
        data: {
          preferences: '[]',
          isSubmitted: false,
          submittedAt: null,
          updatedAt: new Date()
        }
      });
    });

    return NextResponse.json({
      student_id: updatedStudent.studentId,
      name: updatedStudent.name,
      preferences: JSON.parse(updatedStudent.preferences || '[]'),
      is_submitted: updatedStudent.isSubmitted,
      submitted_at: updatedStudent.submittedAt,
      updated_at: updatedStudent.updatedAt,
      message: 'Student preferences reset successfully'
    });

  } catch (error) {
    console.error('Error resetting student preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}