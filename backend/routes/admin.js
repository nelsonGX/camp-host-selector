const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { requireAdminAuth } = require('../middleware/adminAuth');
const fs = require('fs');
const path = require('path');

const router = express.Router();

/**
 * 獲取所有學員志願列表
 * GET /api/admin/students
 */
router.get('/students', requireAdminAuth, async (req, res) => {
  try {
    const students = await db.query(`
      SELECT 
        student_id,
        name,
        preferences,
        is_submitted,
        submitted_at,
        created_at,
        updated_at
      FROM students 
      ORDER BY 
        is_submitted DESC, 
        submitted_at DESC, 
        created_at ASC
    `);

    const formattedStudents = students.map(student => ({
      student_id: student.student_id,
      name: student.name,
      preferences: student.preferences ? JSON.parse(student.preferences) : [],
      is_submitted: Boolean(student.is_submitted),
      submitted_at: student.submitted_at,
      created_at: student.created_at,
      updated_at: student.updated_at
    }));

    // 統計資料
    const stats = {
      total: students.length,
      submitted: students.filter(s => s.is_submitted).length,
      pending: students.filter(s => !s.is_submitted).length
    };

    res.json({
      success: true,
      data: {
        students: formattedStudents,
        stats
      }
    });

  } catch (error) {
    console.error('獲取學員列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

/**
 * 重置單個學員的志願序
 * POST /api/admin/students/:student_id/reset
 */
router.post('/students/:student_id/reset', requireAdminAuth, async (req, res) => {
  try {
    const { student_id } = req.params;

    // 檢查學員是否存在
    const student = await db.get(
      'SELECT * FROM students WHERE student_id = ?',
      [student_id]
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: '找不到該學員'
      });
    }

    // 重置志願序
    await db.run(
      'UPDATE students SET preferences = ?, is_submitted = ?, submitted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?',
      ['[]', false, student_id]
    );

    // 同時清除該學員的分配結果
    await db.run(
      'DELETE FROM allocations WHERE student_id = ?',
      [student_id]
    );

    res.json({
      success: true,
      message: `學員 ${student.name} (${student_id}) 的志願序已重置`
    });

  } catch (error) {
    console.error('重置學員志願序錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

/**
 * 清除所有資料
 * POST /api/admin/clear-all
 */
router.post('/clear-all', requireAdminAuth, async (req, res) => {
  try {
    // 先清除分配結果（子表）
    await db.run('DELETE FROM allocations');
    
    // 清除分配歷史
    await db.run('DELETE FROM allocation_history');
    
    // 最後清除學員資料（父表）
    await db.run('DELETE FROM students');

    res.json({
      success: true,
      message: '所有資料已清除'
    });

  } catch (error) {
    console.error('清除資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

/**
 * 重置所有學員的志願序
 * POST /api/admin/reset-all-preferences
 */
router.post('/reset-all-preferences', requireAdminAuth, async (req, res) => {
  try {
    // 重置所有學員的志願序和提交狀態
    const result = await db.run(`
      UPDATE students 
      SET 
        preferences = '[]', 
        is_submitted = false, 
        submitted_at = NULL,
        updated_at = CURRENT_TIMESTAMP
    `);

    // 清除所有分配結果
    await db.run('DELETE FROM allocations');

    res.json({
      success: true,
      message: `已重置 ${result.changes} 位學員的志願序`,
      affected_rows: result.changes
    });

  } catch (error) {
    console.error('重置所有志願序錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

/**
 * 獲取系統統計資料
 * GET /api/admin/stats
 */
router.get('/stats', requireAdminAuth, async (req, res) => {
  try {
    // 學員統計
    const totalStudents = await db.get('SELECT COUNT(*) as count FROM students');
    const submittedStudents = await db.get('SELECT COUNT(*) as count FROM students WHERE is_submitted = true');
    
    // 分配統計
    const allocatedStudents = await db.get('SELECT COUNT(*) as count FROM allocations GROUP BY student_id');
    const uniqueAllocatedCount = await db.get('SELECT COUNT(DISTINCT student_id) as count FROM allocations');

    // 講師容量統計
    const lecturerStats = {};
    const timeSlots = db.getTimeSlots() || [];
    const lecturers = db.getLecturers() || [];
    
    for (const timeSlot of timeSlots) {
      lecturerStats[timeSlot.id] = {};
      for (const lecturer of lecturers) {
        const count = await db.get(
          'SELECT COUNT(*) as count FROM allocations WHERE time_slot = ? AND lecturer = ?',
          [timeSlot.id, lecturer]
        );
        lecturerStats[timeSlot.id][lecturer] = count.count;
      }
    }

    // 最近分配歷史
    const recentAllocation = await db.get(
      'SELECT * FROM allocation_history ORDER BY created_at DESC LIMIT 1'
    );

    res.json({
      success: true,
      data: {
        students: {
          total: totalStudents.count,
          submitted: submittedStudents.count,
          pending: totalStudents.count - submittedStudents.count,
          allocated: uniqueAllocatedCount.count || 0
        },
        lecturer_capacity: lecturerStats,
        last_allocation: recentAllocation ? {
          created_at: recentAllocation.created_at,
          stats: JSON.parse(recentAllocation.stats)
        } : null
      }
    });

  } catch (error) {
    console.error('獲取統計資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

/**
 * 更新系統設定
 * PUT /api/admin/settings
 */
router.put('/settings', [
  requireAdminAuth,
  body('max_capacity_per_lecturer')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('每位講師最大容量應在 1-50 之間')
], async (req, res) => {
  try {
    // 驗證輸入
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '設定資料有誤',
        errors: errors.array()
      });
    }

    const { max_capacity_per_lecturer } = req.body;

    // 更新設定
    if (max_capacity_per_lecturer !== undefined) {
      await db.updateSetting('max_capacity_per_lecturer', max_capacity_per_lecturer.toString());
    }

    res.json({
      success: true,
      message: '設定更新成功'
    });

  } catch (error) {
    console.error('更新設定錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

/**
 * 獲取分配歷史
 * GET /api/admin/allocation-history
 */
router.get('/allocation-history', requireAdminAuth, async (req, res) => {
  try {
    const { limit = 10, offset = 0 } = req.query;

    const history = await db.query(
      'SELECT * FROM allocation_history ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [parseInt(limit), parseInt(offset)]
    );

    const formattedHistory = history.map(record => ({
      id: record.id,
      stats: JSON.parse(record.stats),
      created_at: record.created_at
    }));

    const total = await db.get('SELECT COUNT(*) as count FROM allocation_history');

    res.json({
      success: true,
      data: {
        history: formattedHistory,
        pagination: {
          total: total.count,
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
      }
    });

  } catch (error) {
    console.error('獲取分配歷史錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

/**
 * 獲取系統配置
 * GET /api/admin/config
 */
router.get('/config', requireAdminAuth, async (req, res) => {
  try {
    // 獲取最新的配置
    const systemConfig = db.getSystemConfig();
    
    res.json({
      success: true,
      data: systemConfig
    });
  } catch (error) {
    console.error('獲取系統配置錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

/**
 * 重新載入系統配置
 * POST /api/admin/config/reload
 */
router.post('/config/reload', requireAdminAuth, async (req, res) => {
  try {
    // 強制重新載入配置
    const newConfig = db.reloadConfig();
    
    // 同步更新資料庫中的設定
    await db.updateSetting('lecturers', JSON.stringify(newConfig.lecturers));
    await db.updateSetting('time_slots', JSON.stringify(newConfig.time_slots));
    await db.updateSetting('max_capacity_per_lecturer', newConfig.settings.max_capacity_per_lecturer.toString());
    
    res.json({
      success: true,
      message: '系統配置已重新載入',
      data: newConfig
    });
  } catch (error) {
    console.error('重新載入系統配置錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

/**
 * 更新系統配置
 * PUT /api/admin/config
 */
router.put('/config', [
  requireAdminAuth,
  body('lecturers')
    .isArray({ min: 1 })
    .withMessage('講師列表不能為空'),
  body('time_slots')
    .isArray({ min: 1 })
    .withMessage('時段列表不能為空'),
  body('settings.max_capacity_per_lecturer')
    .isInt({ min: 1 })
    .withMessage('每位講師最大容量必須大於0')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: '輸入資料有誤',
        errors: errors.array()
      });
    }

    const newConfig = req.body;
    
    // 備份現有配置
    const configPath = path.join(__dirname, '../config/system.json');
    const backupPath = path.join(__dirname, '../config/system.backup.json');
    if (fs.existsSync(configPath)) {
      fs.copyFileSync(configPath, backupPath);
    }
    
    // 使用配置管理器保存配置
    const success = db.saveConfig(newConfig);
    
    if (success) {
      // 立即重新載入配置到全局
      db.reloadConfig();
      
      // 同步更新資料庫中的設定
      await db.updateSetting('lecturers', JSON.stringify(newConfig.lecturers));
      await db.updateSetting('time_slots', JSON.stringify(newConfig.time_slots));
      await db.updateSetting('max_capacity_per_lecturer', newConfig.settings.max_capacity_per_lecturer.toString());
      
      res.json({
        success: true,
        message: '系統配置更新成功並已立即生效',
        data: newConfig
      });
    } else {
      res.status(500).json({
        success: false,
        message: '配置保存失敗'
      });
    }
  } catch (error) {
    console.error('更新系統配置錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

module.exports = router; 