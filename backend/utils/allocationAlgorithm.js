const { LECTURERS, TIME_SLOTS } = require('../config/database');

/**
 * 講師分配演算法
 * 目標：根據學員志願序，在兩個時段分配不同講師，且每位講師每時段最多 13 人
 */
class AllocationAlgorithm {
  constructor(maxCapacityPerLecturer = 13) {
    this.maxCapacity = maxCapacityPerLecturer;
    this.lecturers = LECTURERS;
    this.timeSlots = TIME_SLOTS;
  }

  /**
   * 主要分配函數
   * @param {Array} students - 學員資料 [{student_id, name, preferences: [lecturer1, lecturer2, lecturer3, lecturer4]}]
   * @returns {Object} 分配結果和統計資料
   */
  allocate(students) {
    try {
      // 初始化資料結構
      const allocation = new Map(); // student_id -> {timeSlot1: lecturer, timeSlot2: lecturer}
      const capacity = this.initializeCapacity();
      const unallocatedStudents = [];
      
      console.log(`開始分配 ${students.length} 位學員...`);

      // 為每位學員分配兩個時段的講師
      for (const student of students) {
        const result = this.allocateStudent(student, allocation, capacity);
        if (!result.success) {
          unallocatedStudents.push({
            student,
            reason: result.reason
          });
        }
      }

      // 生成統計資料
      const stats = this.generateStats(allocation, capacity, unallocatedStudents);
      
      // 生成最終結果
      const finalAllocation = this.formatAllocation(allocation);

      console.log(`分配完成！成功分配 ${finalAllocation.length} 位學員`);
      if (unallocatedStudents.length > 0) {
        console.log(`⚠️  未能分配 ${unallocatedStudents.length} 位學員`);
      }

      return {
        success: true,
        allocation: finalAllocation,
        stats,
        unallocated: unallocatedStudents,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('分配演算法錯誤:', error);
      return {
        success: false,
        error: error.message,
        allocation: [],
        stats: null,
        unallocated: [],
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * 初始化容量追蹤
   * @returns {Object} 容量追蹤物件
   */
  initializeCapacity() {
    const capacity = {};
    for (const timeSlot of this.timeSlots) {
      capacity[timeSlot.id] = {};
      for (const lecturer of this.lecturers) {
        capacity[timeSlot.id][lecturer] = {
          current: 0,
          max: this.maxCapacity,
          students: []
        };
      }
    }
    return capacity;
  }

  /**
   * 為單一學員分配兩個時段的講師
   * @param {Object} student - 學員資料
   * @param {Map} allocation - 已分配結果
   * @param {Object} capacity - 容量追蹤
   * @returns {Object} 分配結果
   */
  allocateStudent(student, allocation, capacity) {
    const { student_id, name, preferences } = student;
    
    // 如果沒有志願序或志願序不完整，進行隨機分配
    if (!preferences || preferences.length !== 4) {
      console.log(`學員 ${name} 沒有完整志願序，進行隨機分配...`);
      return this.allocateStudentRandomly(student, allocation, capacity);
    }

    // 嘗試所有可能的組合（第一時段和第二時段選擇不同講師）
    const possibleCombinations = this.generateCombinations(preferences);
    
    for (const combination of possibleCombinations) {
      const { timeSlot1Lecturer, timeSlot2Lecturer } = combination;
      
      // 檢查兩個時段是否都有容量
      if (this.canAllocate(1, timeSlot1Lecturer, capacity) && 
          this.canAllocate(2, timeSlot2Lecturer, capacity)) {
        
        // 執行分配
        this.performAllocation(student_id, name, timeSlot1Lecturer, timeSlot2Lecturer, allocation, capacity);
        
        return {
          success: true,
          timeSlot1: timeSlot1Lecturer,
          timeSlot2: timeSlot2Lecturer
        };
      }
    }

    // 如果按志願序分配失敗，嘗試隨機分配
    console.log(`學員 ${name} 志願序分配失敗，嘗試隨機分配...`);
    return this.allocateStudentRandomly(student, allocation, capacity);
  }

  /**
   * 隨機分配學員到兩個時段
   * @param {Object} student - 學員資料
   * @param {Map} allocation - 已分配結果
   * @param {Object} capacity - 容量追蹤
   * @returns {Object} 分配結果
   */
  allocateStudentRandomly(student, allocation, capacity) {
    const { student_id, name } = student;
    
    // 打亂講師順序來實現隨機分配
    const shuffledLecturers = [...this.lecturers].sort(() => Math.random() - 0.5);
    
    // 嘗試所有可能的隨機組合
    for (const lecturer1 of shuffledLecturers) {
      for (const lecturer2 of shuffledLecturers) {
        if (lecturer1 !== lecturer2) { // 確保兩個時段是不同講師
          // 檢查兩個時段是否都有容量
          if (this.canAllocate(1, lecturer1, capacity) && 
              this.canAllocate(2, lecturer2, capacity)) {
            
            // 執行分配
            this.performAllocation(student_id, name, lecturer1, lecturer2, allocation, capacity);
            
            console.log(`✅ 學員 ${name} 隨機分配成功：${lecturer1} -> ${lecturer2}`);
            
            return {
              success: true,
              timeSlot1: lecturer1,
              timeSlot2: lecturer2,
              isRandom: true
            };
          }
        }
      }
    }

    return {
      success: false,
      reason: '所有講師組合都已額滿，無法分配'
    };
  }

  /**
   * 根據志願序生成所有可能的分配組合
   * 優先考慮志願序較高的組合
   * @param {Array} preferences - 志願序 [講師1, 講師2, 講師3, 講師4]
   * @returns {Array} 排序後的組合列表
   */
  generateCombinations(preferences) {
    const combinations = [];
    
    // 生成所有可能的組合（第一時段和第二時段不能是同一位講師）
    for (let i = 0; i < preferences.length; i++) {
      for (let j = 0; j < preferences.length; j++) {
        if (i !== j) { // 確保兩個時段是不同講師
          combinations.push({
            timeSlot1Lecturer: preferences[i],
            timeSlot2Lecturer: preferences[j],
            priority: i + j // 總志願序分數，越小越優先
          });
        }
      }
    }
    
    // 依優先度排序（志願序分數越小越優先）
    combinations.sort((a, b) => a.priority - b.priority);
    
    return combinations;
  }

  /**
   * 檢查是否可以分配到指定時段和講師
   * @param {number} timeSlot - 時段 ID
   * @param {string} lecturer - 講師名稱
   * @param {Object} capacity - 容量追蹤
   * @returns {boolean} 是否可分配
   */
  canAllocate(timeSlot, lecturer, capacity) {
    return capacity[timeSlot][lecturer].current < capacity[timeSlot][lecturer].max;
  }

  /**
   * 執行實際分配
   * @param {string} studentId - 學員 ID
   * @param {string} studentName - 學員姓名
   * @param {string} timeSlot1Lecturer - 第一時段講師
   * @param {string} timeSlot2Lecturer - 第二時段講師
   * @param {Map} allocation - 分配結果
   * @param {Object} capacity - 容量追蹤
   */
  performAllocation(studentId, studentName, timeSlot1Lecturer, timeSlot2Lecturer, allocation, capacity) {
    // 記錄分配結果
    allocation.set(studentId, {
      student_id: studentId,
      name: studentName,
      timeSlot1: timeSlot1Lecturer,
      timeSlot2: timeSlot2Lecturer
    });

    // 更新容量
    capacity[1][timeSlot1Lecturer].current++;
    capacity[1][timeSlot1Lecturer].students.push({ student_id: studentId, name: studentName });
    
    capacity[2][timeSlot2Lecturer].current++;
    capacity[2][timeSlot2Lecturer].students.push({ student_id: studentId, name: studentName });
  }

  /**
   * 生成統計資料
   * @param {Map} allocation - 分配結果
   * @param {Object} capacity - 容量追蹤
   * @param {Array} unallocated - 未分配學員
   * @returns {Object} 統計資料
   */
  generateStats(allocation, capacity, unallocated) {
    const stats = {
      total_students: allocation.size + unallocated.length,
      allocated_students: allocation.size,
      unallocated_students: unallocated.length,
      allocation_rate: allocation.size / (allocation.size + unallocated.length) * 100,
      time_slots: {}
    };

    // 為每個時段生成統計
    for (const timeSlot of this.timeSlots) {
      stats.time_slots[timeSlot.id] = {
        name: timeSlot.name,
        time: timeSlot.time,
        lecturers: {}
      };

      for (const lecturer of this.lecturers) {
        const lecturerData = capacity[timeSlot.id][lecturer];
        stats.time_slots[timeSlot.id].lecturers[lecturer] = {
          current_count: lecturerData.current,
          max_capacity: lecturerData.max,
          utilization_rate: (lecturerData.current / lecturerData.max * 100).toFixed(1),
          students: lecturerData.students
        };
      }
    }

    return stats;
  }

  /**
   * 格式化分配結果為陣列格式
   * @param {Map} allocation - 分配結果 Map
   * @returns {Array} 格式化的分配結果
   */
  formatAllocation(allocation) {
    return Array.from(allocation.values()).map(student => ({
      student_id: student.student_id,
      name: student.name,
      time_slot_1: {
        time: this.timeSlots[0].time,
        lecturer: student.timeSlot1
      },
      time_slot_2: {
        time: this.timeSlots[1].time,
        lecturer: student.timeSlot2
      }
    }));
  }

  /**
   * 驗證分配結果
   * @param {Array} allocation - 分配結果
   * @returns {Object} 驗證結果
   */
  validateAllocation(allocation) {
    const errors = [];
    const lecturerCounts = this.initializeCapacity();

    // 檢查每位學員的分配
    for (const student of allocation) {
      // 檢查是否兩個時段分配到不同講師
      if (student.time_slot_1.lecturer === student.time_slot_2.lecturer) {
        errors.push(`學員 ${student.name} (${student.student_id}) 兩個時段分配到同一位講師`);
      }

      // 計算講師人數
      lecturerCounts[1][student.time_slot_1.lecturer].current++;
      lecturerCounts[2][student.time_slot_2.lecturer].current++;
    }

    // 檢查容量限制
    for (const timeSlotId of [1, 2]) {
      for (const lecturer of this.lecturers) {
        const count = lecturerCounts[timeSlotId][lecturer].current;
        if (count > this.maxCapacity) {
          errors.push(`時段 ${timeSlotId} 講師 ${lecturer} 超過容量限制：${count}/${this.maxCapacity}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = AllocationAlgorithm; 