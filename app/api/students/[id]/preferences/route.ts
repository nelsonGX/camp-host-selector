import { NextRequest, NextResponse } from 'next/server';
import { prisma, getSystemConfig } from '@/lib/prisma';

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

    // Validate preferences array
    if (preferences.length > 4) {
      return NextResponse.json({ error: 'Maximum 4 preferences allowed' }, { status: 400 });
    }

    // Get available lecturers from settings to validate preferences
    const config = await getSystemConfig();
    const availableLecturers = config.lecturers;

    // Validate that lecturers config is an array
    if (!Array.isArray(availableLecturers)) {
      return NextResponse.json({ error: 'Invalid lecturers configuration' }, { status: 500 });
    }

    // Validate that all preferences are valid lecturers
    for (const pref of preferences) {
      if (!availableLecturers.includes(pref)) {
        return NextResponse.json({ error: `Invalid lecturer: ${pref}` }, { status: 400 });
      }
    }

    // Check if student exists
    const student = await prisma.student.findUnique({
      where: { studentId: id }
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Update preferences
    const updatedStudent = await prisma.student.update({
      where: { studentId: id },
      data: { preferences: JSON.stringify(preferences) }
    });

    return NextResponse.json({
      student_id: updatedStudent.studentId,
      name: updatedStudent.name,
      preferences: JSON.parse(updatedStudent.preferences || '[]'),
      is_submitted: updatedStudent.isSubmitted,
      updated_at: updatedStudent.updatedAt,
      message: 'Preferences updated successfully'
    });

  } catch (error) {
    console.error('Error updating student preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}