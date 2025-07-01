const jwt = require('jsonwebtoken');
const { ADMIN_CONFIG } = require('../config/auth');

// 存儲活躍的管理員 sessions（生產環境應使用 Redis）
const activeSessions = new Map();

/**
 * 管理員認證中間件
 * 檢查請求是否包含有效的管理員 token
 */
function requireAdminAuth(req, res, next) {
  try {
    // 從 headers 中獲取 token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '需要管理員認證',
        code: 'ADMIN_AUTH_REQUIRED'
      });
    }

    const token = authHeader.substring(7); // 移除 "Bearer " 前綴

    // 驗證 JWT token
    const decoded = jwt.verify(token, ADMIN_CONFIG.jwtSecret);
    
    // 檢查是否為管理員 token
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: '權限不足',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    // 檢查 session 是否仍然有效
    const sessionId = decoded.sessionId;
    if (!activeSessions.has(sessionId)) {
      return res.status(401).json({
        success: false,
        message: 'Session 已過期，請重新登入',
        code: 'SESSION_EXPIRED'
      });
    }

    // 更新 session 最後訪問時間
    const session = activeSessions.get(sessionId);
    session.lastAccess = Date.now();
    activeSessions.set(sessionId, session);

    // 將管理員資訊添加到 request 對象
    req.admin = {
      sessionId: sessionId,
      loginTime: session.loginTime,
      lastAccess: session.lastAccess
    };

    next();

  } catch (error) {
    console.error('管理員認證錯誤:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '無效的認證 token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token 已過期，請重新登入',
        code: 'TOKEN_EXPIRED'
      });
    }

    return res.status(500).json({
      success: false,
      message: '認證服務錯誤'
    });
  }
}

/**
 * 創建管理員 session
 */
function createAdminSession(sessionId) {
  const session = {
    sessionId,
    loginTime: Date.now(),
    lastAccess: Date.now()
  };
  
  activeSessions.set(sessionId, session);
  
  // 設定 session 清理定時器
  setTimeout(() => {
    if (activeSessions.has(sessionId)) {
      const currentSession = activeSessions.get(sessionId);
      const isExpired = Date.now() - currentSession.lastAccess > ADMIN_CONFIG.sessionTimeout;
      if (isExpired) {
        activeSessions.delete(sessionId);
        console.log(`管理員 session ${sessionId} 已自動清理`);
      }
    }
  }, ADMIN_CONFIG.sessionTimeout);

  return session;
}

/**
 * 清除管理員 session
 */
function clearAdminSession(sessionId) {
  return activeSessions.delete(sessionId);
}

/**
 * 獲取活躍的 session 數量
 */
function getActiveSessionCount() {
  return activeSessions.size;
}

/**
 * 清理過期的 sessions
 */
function cleanupExpiredSessions() {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [sessionId, session] of activeSessions.entries()) {
    if (now - session.lastAccess > ADMIN_CONFIG.sessionTimeout) {
      activeSessions.delete(sessionId);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`清理了 ${cleanedCount} 個過期的管理員 sessions`);
  }
}

// 定期清理過期的 sessions（每小時執行一次）
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

module.exports = {
  requireAdminAuth,
  createAdminSession,
  clearAdminSession,
  getActiveSessionCount,
  cleanupExpiredSessions
}; 