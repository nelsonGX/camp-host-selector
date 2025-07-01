const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const AllocationAlgorithm = require('../utils/allocationAlgorithm');
const { requireAdminAuth } = require('../middleware/adminAuth');

const router = express.Router();

/**
 * 生成分配結果
 * POST /api/allocation/generate
 */
router.post('/generate', requireAdminAuth, async (req, res) => {
  try {
    // 獲取所有學員（包含未提交志願序的）
    const students = await db.query(`
      SELECT 
        student_id,
        name,
        preferences,
        is_submitted
      FROM students 
      ORDER BY is_submitted DESC, name ASC
    `);

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: '沒有學員資料'
      });
    }

    // 解析學員資料（包含有志願序和沒有志願序的）
    const studentsWithPreferences = students.map(student => {
      let preferences = [];
      try {
        preferences = student.preferences ? JSON.parse(student.preferences) : [];
      } catch (error) {
        console.log(`學員 ${student.name} 志願序解析失敗，將進行隨機分配`);
        preferences = [];
      }
      
      return {
        student_id: student.student_id,
        name: student.name,
        preferences: preferences,
        is_submitted: Boolean(student.is_submitted)
      };
    });

    // 獲取最大容量設定
    const maxCapacitySetting = await db.getSetting('max_capacity_per_lecturer');
    const maxCapacity = maxCapacitySetting ? parseInt(maxCapacitySetting) : 13;

    // 執行分配演算法
    console.log(`開始為 ${studentsWithPreferences.length} 位學員執行分配...`);
    const algorithm = new AllocationAlgorithm(maxCapacity);
    const allocationResult = algorithm.allocate(studentsWithPreferences);

    if (!allocationResult.success) {
      return res.status(500).json({
        success: false,
        message: '分配演算法執行失敗',
        error: allocationResult.error
      });
    }

    // 清除舊的分配結果
    await db.run('DELETE FROM allocations');

    // 儲存新的分配結果到資料庫
    for (const student of allocationResult.allocation) {
      // 插入第一時段分配
      await db.run(
        'INSERT INTO allocations (student_id, time_slot, lecturer) VALUES (?, ?, ?)',
        [student.student_id, 1, student.time_slot_1.lecturer]
      );

      // 插入第二時段分配
      await db.run(
        'INSERT INTO allocations (student_id, time_slot, lecturer) VALUES (?, ?, ?)',
        [student.student_id, 2, student.time_slot_2.lecturer]
      );
    }

    // 儲存分配歷史
    await db.run(
      'INSERT INTO allocation_history (allocation_data, stats) VALUES (?, ?)',
      [
        JSON.stringify(allocationResult.allocation),
        JSON.stringify(allocationResult.stats)
      ]
    );

    console.log(`✅ 分配完成！成功分配 ${allocationResult.allocation.length} 位學員`);

    res.json({
      success: true,
      message: `分配完成！成功分配 ${allocationResult.allocation.length} 位學員`,
      data: allocationResult
    });

  } catch (error) {
    console.error('生成分配錯誤:', error);
    res.status(500).json({
      success: false,
      message: '生成分配時發生錯誤',
      error: error.message
    });
  }
});

/**
 * 獲取當前分配結果
 * GET /api/allocation/current
 */
router.get('/current', async (req, res) => {
  try {
    // 獲取所有分配結果
    const allocations = await db.query(`
      SELECT 
        a.student_id,
        s.name,
        a.time_slot,
        a.lecturer,
        a.created_at
      FROM allocations a
      JOIN students s ON a.student_id = s.student_id
      ORDER BY s.name, a.time_slot
    `);

    if (allocations.length === 0) {
      return res.json({
        success: true,
        message: '尚未生成分配結果',
        data: {
          allocation: [],
          stats: null,
          last_updated: null
        }
      });
    }

    // 重新組織資料格式
    const studentAllocations = new Map();
    const timeSlots = db.getTimeSlots() || [];
    
    for (const allocation of allocations) {
      if (!studentAllocations.has(allocation.student_id)) {
        studentAllocations.set(allocation.student_id, {
          student_id: allocation.student_id,
          name: allocation.name,
          time_slot_1: { time: timeSlots[0]?.time || '未設定', lecturer: null },
          time_slot_2: { time: timeSlots[1]?.time || '未設定', lecturer: null }
        });
      }

      const student = studentAllocations.get(allocation.student_id);
      if (allocation.time_slot === 1) {
        student.time_slot_1.lecturer = allocation.lecturer;
      } else if (allocation.time_slot === 2) {
        student.time_slot_2.lecturer = allocation.lecturer;
      }
    }

    const formattedAllocation = Array.from(studentAllocations.values());

    // 生成統計資料
    const stats = await generateCurrentStats();

    // 獲取最後更新時間
    const lastUpdated = allocations.length > 0 ? 
      Math.max(...allocations.map(a => new Date(a.created_at).getTime())) : null;

    res.json({
      success: true,
      data: {
        allocation: formattedAllocation,
        stats,
        last_updated: lastUpdated ? new Date(lastUpdated).toISOString() : null
      }
    });

  } catch (error) {
    console.error('獲取分配結果錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取分配結果時發生錯誤'
    });
  }
});

/**
 * 匯出分配結果為 CSV
 * GET /api/allocation/export/csv
 */
router.get('/export/csv', requireAdminAuth, async (req, res) => {
  try {
    // 獲取分配結果
    const allocations = await db.query(`
      SELECT 
        a.student_id,
        s.name,
        a.time_slot,
        a.lecturer
      FROM allocations a
      JOIN students s ON a.student_id = s.student_id
      ORDER BY s.name, a.time_slot
    `);

    if (allocations.length === 0) {
      return res.status(404).json({
        success: false,
        message: '沒有分配結果可匯出'
      });
    }

    // 重新組織資料
    const studentAllocations = new Map();
    
    for (const allocation of allocations) {
      if (!studentAllocations.has(allocation.student_id)) {
        studentAllocations.set(allocation.student_id, {
          student_id: allocation.student_id,
          name: allocation.name,
          time_slot_1_lecturer: '',
          time_slot_2_lecturer: ''
        });
      }

      const student = studentAllocations.get(allocation.student_id);
      if (allocation.time_slot === 1) {
        student.time_slot_1_lecturer = allocation.lecturer;
      } else if (allocation.time_slot === 2) {
        student.time_slot_2_lecturer = allocation.lecturer;
      }
    }

    // 生成 CSV 內容
    const csvHeader = '學號,姓名,第一時段(15:55-16:45),第二時段(16:50-17:30)\n';
    const csvRows = Array.from(studentAllocations.values()).map(student =>
      `${student.student_id},${student.name},${student.time_slot_1_lecturer},${student.time_slot_2_lecturer}`
    ).join('\n');

    const csvContent = csvHeader + csvRows;

    // 設定檔案下載標頭
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `講師分配結果_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    
    // 添加 BOM 並發送內容
    res.send('\uFEFF' + csvContent);

  } catch (error) {
    console.error('匯出 CSV 錯誤:', error);
    res.status(500).json({
      success: false,
      message: '匯出 CSV 時發生錯誤'
    });
  }
});

/**
 * 獲取講師詳細分配名單
 * GET /api/allocation/lecturers/:lecturer_name
 */
router.get('/lecturers/:lecturer_name', async (req, res) => {
  try {
    const { lecturer_name } = req.params;

    // 驗證講師名稱
    const lecturers = db.getLecturers() || [];
    if (!lecturers.includes(lecturer_name)) {
      return res.status(400).json({
        success: false,
        message: '講師名稱無效'
      });
    }

    // 獲取該講師的分配名單
    const allocations = await db.query(`
      SELECT 
        a.student_id,
        s.name,
        a.time_slot,
        a.created_at
      FROM allocations a
      JOIN students s ON a.student_id = s.student_id
      WHERE a.lecturer = ?
      ORDER BY a.time_slot, s.name
    `, [lecturer_name]);

    // 按時段分組
    const timeSlotAllocations = {
      1: allocations.filter(a => a.time_slot === 1),
      2: allocations.filter(a => a.time_slot === 2)
    };

    const result = {
      lecturer: lecturer_name,
      time_slots: {}
    };

    const timeSlots = db.getTimeSlots() || [];
    for (const timeSlot of timeSlots) {
      const students = timeSlotAllocations[timeSlot.id] || [];
      result.time_slots[timeSlot.id] = {
        name: timeSlot.name,
        time: timeSlot.time,
        student_count: students.length,
        max_capacity: 13,
        students: students.map(s => ({
          student_id: s.student_id,
          name: s.name
        }))
      };
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('獲取講師分配名單錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取講師分配名單時發生錯誤'
    });
  }
});

/**
 * 生成當前統計資料
 */
async function generateCurrentStats() {
  try {
    const stats = {
      time_slots: {}
    };

    const timeSlots = db.getTimeSlots() || [];
    const lecturers = db.getLecturers() || [];

    for (const timeSlot of timeSlots) {
      stats.time_slots[timeSlot.id] = {
        name: timeSlot.name,
        time: timeSlot.time,
        lecturers: {}
      };

      for (const lecturer of lecturers) {
        const count = await db.get(
          'SELECT COUNT(*) as count FROM allocations WHERE time_slot = ? AND lecturer = ?',
          [timeSlot.id, lecturer]
        );

        const students = await db.query(`
          SELECT s.student_id, s.name
          FROM allocations a
          JOIN students s ON a.student_id = s.student_id
          WHERE a.time_slot = ? AND a.lecturer = ?
          ORDER BY s.name
        `, [timeSlot.id, lecturer]);

        stats.time_slots[timeSlot.id].lecturers[lecturer] = {
          current_count: count.count,
          max_capacity: 13,
          utilization_rate: ((count.count / 13) * 100).toFixed(1),
          students: students
        };
      }
    }

    return stats;

  } catch (error) {
    console.error('生成統計資料錯誤:', error);
    return null;
  }
}

module.exports = router; 