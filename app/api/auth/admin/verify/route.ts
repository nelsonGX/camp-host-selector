import { NextRequest, NextResponse } from 'next/server';
import { isValidAdminRequest } from '../../../../../lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const session = isValidAdminRequest(authHeader);

    if (!session) {
      return NextResponse.json(
        { 
          success: false, 
          message: '認證失敗',
          code: 'ADMIN_AUTH_REQUIRED'
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '認證成功',
      data: {
        user: {
          id: session.userId,
          role: session.role
        },
        session: {
          id: session.sessionId,
          created_at: session.createdAt,
          last_access: session.lastAccess,
          expires_at: session.expiresAt
        }
      }
    });

  } catch (error) {
    console.error('Admin verify error:', error);
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