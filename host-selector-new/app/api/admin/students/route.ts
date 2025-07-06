import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidAdminRequest } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization');
    const adminSession = await isValidAdminRequest(authHeader);
    
    if (!adminSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all students
    const students = await prisma.student.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    // Calculate statistics
    const stats = {
      total_students: students.length,
      submitted_students: students.filter(s => s.isSubmitted).length,
      pending_students: students.filter(s => !s.isSubmitted).length,
      students_with_preferences: students.filter(s => {
        const prefs = s.preferences ? JSON.parse(s.preferences) : [];
        return prefs.length > 0;
      }).length
    };

    // Format student data
    const formattedStudents = students.map(student => ({
      student_id: student.studentId,
      name: student.name,
      preferences: student.preferences ? JSON.parse(student.preferences) : [],
      is_submitted: student.isSubmitted,
      submitted_at: student.submittedAt,
      created_at: student.createdAt,
      updated_at: student.updatedAt,
      preference_count: student.preferences ? JSON.parse(student.preferences).length : 0
    }));

    return NextResponse.json({
      students: formattedStudents,
      stats
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}