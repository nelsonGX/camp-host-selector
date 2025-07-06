import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, createAdminSession } from '../../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          message: '請輸入密碼',
          code: 'MISSING_PASSWORD'
        },
        { status: 400 }
      );
    }

    if (!verifyPassword(password)) {
      return NextResponse.json(
        { 
          success: false, 
          message: '密碼錯誤',
          code: 'INVALID_PASSWORD'
        },
        { status: 401 }
      );
    }

    const { token, sessionId } = await createAdminSession();

    return NextResponse.json({
      success: true,
      message: '登入成功',
      data: {
        token,
        session_id: sessionId,
        user: {
          id: 'admin',
          role: 'admin'
        }
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: '系統錯誤，請稍後再試',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}