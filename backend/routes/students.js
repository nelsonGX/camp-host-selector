const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');

const router = express.Router();

/**
 * 學員登入/註冊（只需要姓名）
 * POST /api/students/login
 */
router.post('/login', [
  body('name')
    .notEmpty()
    .withMessage('姓名不能為空')
    .isLength({ min: 1, max: 100 })
    .withMessage('姓名長度應在 1-100 字元之間')
    .matches(/^[\u4e00-\u9fa5]+$/)
    .withMessage('請輸入正確的中文姓名')
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

    const { name } = req.body;

    // 檢查是否已存在同名學員
    const existingStudent = await db.get(
      'SELECT * FROM students WHERE name = ?',
      [name]
    );

    if (existingStudent) {
      // 已存在，返回現有資料
      const preferences = existingStudent.preferences ? 
        JSON.parse(existingStudent.preferences) : null;

      return res.json({
        success: true,
        message: '登入成功',
        data: {
          student_id: existingStudent.student_id,
          name: existingStudent.name,
          preferences,
          is_submitted: Boolean(existingStudent.is_submitted),
          submitted_at: existingStudent.submitted_at
        }
      });
    } else {
      // 生成唯一的學員ID（姓名 + 時間戳後4位）
      const timestamp = Date.now().toString().slice(-4);
      const student_id = `${name}_${timestamp}`;

      // 新建學員記錄
      await db.run(
        'INSERT INTO students (student_id, name, preferences, is_submitted) VALUES (?, ?, ?, ?)',
        [student_id, name, '[]', false]
      );

      return res.status(201).json({
        success: true,
        message: '註冊成功',
        data: {
          student_id,
          name,
          preferences: [],
          is_submitted: false,
          submitted_at: null
        }
      });
    }

  } catch (error) {
    console.error('學員登入錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

/**
 * 獲取學員資料
 * GET /api/students/:student_id
 */
router.get('/:student_id', async (req, res) => {
  try {
    const { student_id } = req.params;

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

    const preferences = student.preferences ? 
      JSON.parse(student.preferences) : [];

    res.json({
      success: true,
      data: {
        student_id: student.student_id,
        name: student.name,
        preferences,
        is_submitted: Boolean(student.is_submitted),
        submitted_at: student.submitted_at
      }
    });

  } catch (error) {
    console.error('獲取學員資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

/**
 * 更新志願序
 * PUT /api/students/:student_id/preferences
 */
router.put('/:student_id/preferences', async (req, res) => {
  try {
    // 獲取最新的講師列表
    const currentLecturers = db.LECTURERS;
    
    // 動態驗證
    const { student_id } = req.params;
    const { preferences } = req.body;

    // 基本驗證
    if (!Array.isArray(preferences) || preferences.length !== currentLecturers.length) {
      return res.status(400).json({
        success: false,
        message: `志願序必須包含 ${currentLecturers.length} 位講師`
      });
    }

    // 驗證講師是否有效
    for (const lecturer of preferences) {
      if (!currentLecturers.includes(lecturer)) {
        return res.status(400).json({
          success: false,
          message: `講師必須是以下其中之一：${currentLecturers.join('、')}`
        });
      }
    }

    // 檢查志願序是否包含所有講師且無重複
    const uniquePreferences = [...new Set(preferences)];
    if (uniquePreferences.length !== currentLecturers.length || 
        !currentLecturers.every(lecturer => preferences.includes(lecturer))) {
      return res.status(400).json({
        success: false,
        message: `志願序必須包含所有 ${currentLecturers.length} 位講師且不能重複`
      });
    }

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

    // 檢查是否已提交
    if (student.is_submitted) {
      return res.status(400).json({
        success: false,
        message: '志願序已提交，無法修改'
      });
    }

    // 更新志願序
    await db.run(
      'UPDATE students SET preferences = ?, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?',
      [JSON.stringify(preferences), student_id]
    );

    res.json({
      success: true,
      message: '志願序更新成功',
      data: {
        student_id,
        preferences
      }
    });

  } catch (error) {
    console.error('更新志願序錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

/**
 * 提交志願序
 * POST /api/students/:student_id/submit
 */
router.post('/:student_id/submit', async (req, res) => {
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

    // 檢查是否已提交
    if (student.is_submitted) {
      return res.status(400).json({
        success: false,
        message: '志願序已提交'
      });
    }

    // 檢查志願序是否完整
    const preferences = student.preferences ? JSON.parse(student.preferences) : [];
    const currentLecturers = db.LECTURERS;
    if (preferences.length !== currentLecturers.length) {
      return res.status(400).json({
        success: false,
        message: `請先完成志願序填寫（需要 ${currentLecturers.length} 位講師）`
      });
    }

    // 標記為已提交
    await db.run(
      'UPDATE students SET is_submitted = ?, submitted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE student_id = ?',
      [true, student_id]
    );

    res.json({
      success: true,
      message: '志願序提交成功',
      data: {
        student_id,
        submitted_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('提交志願序錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

/**
 * 獲取講師列表和時段資訊
 * GET /api/students/info/system
 */
router.get('/info/system', async (req, res) => {
  try {
    // 直接從配置文件獲取最新配置
    const lecturers = db.getLecturers() || [];
    const timeSlots = db.getTimeSlots() || [];
    const settings = db.getSystemSettings() || {};

    res.json({
      success: true,
      data: {
        lecturers,
        time_slots: timeSlots,
        max_capacity: settings.max_capacity_per_lecturer || 13
      }
    });

  } catch (error) {
    console.error('獲取系統資訊錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

module.exports = router; 