import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Validate that student has at least some preferences
    const preferences = student.preferences ? JSON.parse(student.preferences) : [];
    if (preferences.length === 0) {
      return NextResponse.json({ error: 'Cannot submit without any preferences' }, { status: 400 });
    }

    // Submit preferences
    const updatedStudent = await prisma.student.update({
      where: { studentId: id },
      data: { 
        isSubmitted: true,
        submittedAt: new Date()
      }
    });

    console.log('Student preferences submitted:', {
      studentId: updatedStudent.studentId,
      name: updatedStudent.name,
      preferences: updatedStudent.preferences,
      isSubmitted: updatedStudent.isSubmitted,
      submittedAt: updatedStudent.submittedAt
    });

    return NextResponse.json({
      student_id: updatedStudent.studentId,
      name: updatedStudent.name,
      preferences: JSON.parse(updatedStudent.preferences || '[]'),
      is_submitted: updatedStudent.isSubmitted,
      submitted_at: updatedStudent.submittedAt,
      message: 'Preferences submitted successfully'
    });

  } catch (error) {
    console.error('Error submitting student preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}