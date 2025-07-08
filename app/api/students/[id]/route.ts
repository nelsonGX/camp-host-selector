import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { studentId: id }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Parse preferences JSON
    const preferences = student.preferences ? JSON.parse(student.preferences) : [];

    return NextResponse.json({
      student_id: student.studentId,
      name: student.name,
      preferences,
      is_submitted: student.isSubmitted,
      submitted_at: student.submittedAt,
      created_at: student.createdAt,
      updated_at: student.updatedAt
    });

  } catch (error) {
    console.error('Error fetching student:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Student ID is required' }, { status: 400 });
    }

    const { preferences } = body;

    if (!Array.isArray(preferences)) {
      return NextResponse.json({ error: 'Preferences must be an array' }, { status: 400 });
    }

    // Check if student exists and update preferences
    const updatedStudent = await prisma.student.update({
      where: { studentId: id },
      data: {
        preferences: JSON.stringify(preferences)
      }
    });

    return NextResponse.json({
      student_id: updatedStudent.studentId,
      name: updatedStudent.name,
      preferences: JSON.parse(updatedStudent.preferences || '[]'),
      is_submitted: updatedStudent.isSubmitted,
      submitted_at: updatedStudent.submittedAt,
      created_at: updatedStudent.createdAt,
      updated_at: updatedStudent.updatedAt
    });

  } catch (error) {
    console.error('Error updating student preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    if (student.isSubmitted) {
      return NextResponse.json({ error: 'Preferences already submitted' }, { status: 400 });
    }

    // Submit preferences
    const updatedStudent = await prisma.student.update({
      where: { studentId: id },
      data: {
        isSubmitted: true,
        submittedAt: new Date()
      }
    });

    return NextResponse.json({
      student_id: updatedStudent.studentId,
      name: updatedStudent.name,
      preferences: JSON.parse(updatedStudent.preferences || '[]'),
      is_submitted: updatedStudent.isSubmitted,
      submitted_at: updatedStudent.submittedAt,
      created_at: updatedStudent.createdAt,
      updated_at: updatedStudent.updatedAt
    });

  } catch (error) {
    console.error('Error submitting student preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}