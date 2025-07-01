const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { verifyAdminPassword, generateSessionId, ADMIN_CONFIG } = require('../config/auth');
const { createAdminSession, clearAdminSession, requireAdminAuth, getActiveSessionCount } = require('../middleware/adminAuth');

const router = express.Router();

/**
 * 管理員登入
 * POST /api/auth/admin/login
 */
router.post('/admin/login', [
  body('password')
    .notEmpty()
    .withMessage('密碼不能為空')
    .isLength({ min: 1 })
    .withMessage('請輸入密碼')
], async (req, res) => {
  try {
    // 驗證輸入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '輸入資料有誤',
        errors: errors.array()
      });
    }

    const { password } = req.body;

    // 驗證管理員密碼
    if (!verifyAdminPassword(password)) {
      // 記錄失敗的登入嘗試
      console.log(`管理員登入失敗 - IP: ${req.ip}, 時間: ${new Date().toISOString()}`);
      
      return res.status(401).json({
        success: false,
        message: '密碼錯誤',
        code: 'INVALID_PASSWORD'
      });
    }

    // 生成 session ID
    const sessionId = generateSessionId();

    // 創建 session
    const session = createAdminSession(sessionId);

    // 生成 JWT token
    const token = jwt.sign(
      {
        role: 'admin',
        sessionId: sessionId,
        loginTime: session.loginTime
      },
      ADMIN_CONFIG.jwtSecret,
      {
        expiresIn: ADMIN_CONFIG.tokenExpiry
      }
    );

    // 記錄成功的登入
    console.log(`✅ 管理員登入成功 - IP: ${req.ip}, Session: ${sessionId}, 時間: ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: '登入成功',
      data: {
        token,
        sessionId,
        loginTime: session.loginTime,
        expiresIn: ADMIN_CONFIG.tokenExpiry
      }
    });

  } catch (error) {
    console.error('管理員登入錯誤:', error);
    res.status(500).json({
      success: false,
      message: '登入服務錯誤'
    });
  }
});

/**
 * 管理員登出
 * POST /api/auth/admin/logout
 */
router.post('/admin/logout', requireAdminAuth, async (req, res) => {
  try {
    const { sessionId } = req.admin;

    // 清除 session
    const cleared = clearAdminSession(sessionId);

    console.log(`🚪 管理員登出 - Session: ${sessionId}, 時間: ${new Date().toISOString()}`);

    res.json({
      success: true,
      message: '登出成功',
      data: {
        sessionCleared: cleared
      }
    });

  } catch (error) {
    console.error('管理員登出錯誤:', error);
    res.status(500).json({
      success: false,
      message: '登出服務錯誤'
    });
  }
});

/**
 * 驗證管理員認證狀態
 * GET /api/auth/admin/verify
 */
router.get('/admin/verify', requireAdminAuth, async (req, res) => {
  try {
    const { sessionId, loginTime, lastAccess } = req.admin;

    res.json({
      success: true,
      message: '認證有效',
      data: {
        sessionId,
        loginTime,
        lastAccess,
        isAuthenticated: true
      }
    });

  } catch (error) {
    console.error('驗證管理員認證錯誤:', error);
    res.status(500).json({
      success: false,
      message: '驗證服務錯誤'
    });
  }
});

/**
 * 獲取系統認證狀態
 * GET /api/auth/admin/status
 */
router.get('/admin/status', requireAdminAuth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        activeSessionCount: getActiveSessionCount(),
        tokenExpiry: ADMIN_CONFIG.tokenExpiry,
        sessionTimeout: ADMIN_CONFIG.sessionTimeout
      }
    });

  } catch (error) {
    console.error('獲取認證狀態錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取狀態錯誤'
    });
  }
});

module.exports = router; 