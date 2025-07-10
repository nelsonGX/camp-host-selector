import { NextRequest, NextResponse } from 'next/server';
import { prisma, initializeDefaultSettings } from '../../../../lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { studentData } from '../../../../lib/student_data';

export async function POST(request: NextRequest) {
  try {
    const { name, teamNumber } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: '請輸入姓名' },
        { status: 400 }
      );
    }

    if (!teamNumber || typeof teamNumber !== 'string' || teamNumber.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: '請選擇隊號' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const trimmedTeamNumber = teamNumber.trim();

    // Verify name and team number match
    if (!(trimmedName in studentData) || studentData[trimmedName as keyof typeof studentData].toString() !== trimmedTeamNumber) {
      return NextResponse.json(
        { success: false, message: '姓名與隊號不符' },
        { status: 400 }
      );
    }

    // Initialize default settings if needed
    await initializeDefaultSettings();

    // Check if student already exists
    const existingStudent = await prisma.student.findUnique({
      where: { name: trimmedName }
    });

    if (existingStudent) {
      return NextResponse.json({
        success: true,
        message: '登入成功',
        data: {
          student_id: existingStudent.studentId,
          name: existingStudent.name,
          preferences: JSON.parse(existingStudent.preferences || '[]'),
          is_submitted: existingStudent.isSubmitted,
          created_at: existingStudent.createdAt
        }
      });
    }

    // Create new student
    const studentId = uuidv4();

    const newStudent = await prisma.student.create({
      data: {
        studentId,
        name: trimmedName,
        preferences: '[]'
      }
    });

    return NextResponse.json({
      success: true,
      message: '註冊成功',
      data: {
        student_id: newStudent.studentId,
        name: newStudent.name,
        preferences: [],
        is_submitted: newStudent.isSubmitted,
        created_at: newStudent.createdAt
      }
    });

  } catch (error) {
    console.error('Student login error:', error);
    return NextResponse.json(
      { success: false, message: '系統錯誤，請稍後再試' },
      { status: 500 }
    );
  }
}