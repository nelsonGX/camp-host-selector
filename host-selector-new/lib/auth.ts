import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'camp-select-admin-jwt-secret-key-2024';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'fdn!wyz6XAM@xqv1mxq';

interface AdminSession {
  sessionId: string;
  userId: string;
  role: string;
  createdAt: Date;
  lastAccess: Date;
  expiresAt: Date;
}

// Database session cleanup every hour
setInterval(async () => {
  const now = new Date();
  try {
    await prisma.adminSession.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
  }
}, 60 * 60 * 1000);

export function verifyPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export async function createAdminSession(): Promise<{ token: string; sessionId: string }> {
  const sessionId = uuidv4();
  const userId = 'admin';
  const role = 'admin';
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  // Store session in database
  await prisma.adminSession.create({
    data: {
      sessionId,
      userId,
      role,
      createdAt: now,
      lastAccess: now,
      expiresAt
    }
  });

  const token = jwt.sign(
    {
      sessionId,
      userId,
      role,
      iat: Math.floor(now.getTime() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000)
    },
    JWT_SECRET
  );

  return { token, sessionId };
}

export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {sessionId: string};
    const session = await prisma.adminSession.findUnique({
      where: {
        sessionId: decoded.sessionId
      }
    });
    
    if (!session) {
      return null;
    }

    const now = new Date();
    if (session.expiresAt < now) {
      await prisma.adminSession.delete({
        where: {
          sessionId: decoded.sessionId
        }
      });
      return null;
    }

    // Update last access time
    await prisma.adminSession.update({
      where: {
        sessionId: decoded.sessionId
      },
      data: {
        lastAccess: now
      }
    });
    
    return {
      sessionId: session.sessionId,
      userId: session.userId,
      role: session.role,
      createdAt: session.createdAt,
      lastAccess: now,
      expiresAt: session.expiresAt
    };
  } catch {
    return null;
  }
}

export async function destroySession(sessionId: string): Promise<boolean> {
  try {
    await prisma.adminSession.delete({
      where: {
        sessionId
      }
    });
    return true;
  } catch {
    return false;
  }
}

export async function getSessionInfo(sessionId: string): Promise<AdminSession | null> {
  const session = await prisma.adminSession.findUnique({
    where: {
      sessionId
    }
  });
  
  if (!session) {
    return null;
  }

  const now = new Date();
  if (session.expiresAt < now) {
    await prisma.adminSession.delete({
      where: {
        sessionId
      }
    });
    return null;
  }

  return {
    sessionId: session.sessionId,
    userId: session.userId,
    role: session.role,
    createdAt: session.createdAt,
    lastAccess: session.lastAccess,
    expiresAt: session.expiresAt
  };
}

export async function isValidAdminRequest(authHeader: string | null): Promise<AdminSession | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return await verifyAdminToken(token);
}