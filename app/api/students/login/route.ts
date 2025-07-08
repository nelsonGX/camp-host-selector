import { NextRequest, NextResponse } from 'next/server';
import { prisma, initializeDefaultSettings } from '../../../../lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: '請輸入姓名' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    
    // Validate Chinese name (basic validation)
    const chineseNameRegex = /^[\u4e00-\u9fa5\u3400-\u4dbf\u20000-\u2a6df\u2a700-\u2b73f\u2b740-\u2b81f\u2b820-\u2ceaf\uf900-\ufaff\u3040-\u309f\u30a0-\u30ff\u2e80-\u2eff\u31c0-\u31ef\u2f00-\u2fdf\u2ff0-\u2fff\u3000-\u303f\u3200-\u32ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+$/;
    
    if (!chineseNameRegex.test(trimmedName)) {
      return NextResponse.json(
        { success: false, message: '請輸入有效的中文姓名' },
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