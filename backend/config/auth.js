const crypto = require('crypto');

// 管理員配置
const ADMIN_CONFIG = {
  // 管理員密碼（生產環境應使用環境變量）
  password: process.env.ADMIN_PASSWORD || 'fdn!wyz6XAM@xqv1mxq',
  
  // JWT 密鑰（生產環境應使用環境變量）
  jwtSecret: process.env.JWT_SECRET || 'camp-select-admin-jwt-secret-key-2024',
  
  // Token 過期時間
  tokenExpiry: '24h',
  
  // Session 配置
  sessionTimeout: 24 * 60 * 60 * 1000 // 24小時
};

// 驗證管理員密碼
function verifyAdminPassword(inputPassword) {
  return inputPassword === ADMIN_CONFIG.password;
}

// 生成安全的 session ID
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  ADMIN_CONFIG,
  verifyAdminPassword,
  generateSessionId
}; 