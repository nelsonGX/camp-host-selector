import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'camp-select-admin-jwt-secret-key-2024';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345678';

interface AdminSession {
  sessionId: string;
  userId: string;
  role: string;
  createdAt: Date;
  lastAccess: Date;
  expiresAt: Date;
}

// In-memory session storage (consider using Redis for production)
const sessions = new Map<string, AdminSession>();

// Session cleanup every hour
setInterval(() => {
  const now = new Date();
  for (const [sessionId, session] of sessions.entries()) {
    if (session.expiresAt < now) {
      sessions.delete(sessionId);
    }
  }
}, 60 * 60 * 1000);

export function verifyPassword(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

export function createAdminSession(): { token: string; sessionId: string } {
  const sessionId = uuidv4();
  const userId = 'admin';
  const role = 'admin';
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

  const session: AdminSession = {
    sessionId,
    userId,
    role,
    createdAt: now,
    lastAccess: now,
    expiresAt
  };

  sessions.set(sessionId, session);

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

export function verifyAdminToken(token: string): AdminSession | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {sessionId: string};
    const session = sessions.get(decoded.sessionId);
    
    if (!session) {
      return null;
    }

    const now = new Date();
    if (session.expiresAt < now) {
      sessions.delete(decoded.sessionId);
      return null;
    }

    // Update last access time
    session.lastAccess = now;
    
    return session;
  } catch {
    return null;
  }
}

export function destroySession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

export function getSessionInfo(sessionId: string): AdminSession | null {
  const session = sessions.get(sessionId);
  if (!session) {
    return null;
  }

  const now = new Date();
  if (session.expiresAt < now) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

export function isValidAdminRequest(authHeader: string | null): AdminSession | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  return verifyAdminToken(token);
}