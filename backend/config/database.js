const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 資料庫檔案路徑
const DB_PATH = path.join(__dirname, '../data/camp_select.db');

// 配置管理器
class ConfigManager {
  constructor() {
    this.configPath = path.join(__dirname, 'system.json');
    this.defaultConfig = {
      lecturers: ['飛飛', '豆泥', '吳政賢', '趙式隆'],
      time_slots: [
        { id: 1, name: '第一時段', time: '15:55-16:45' },
        { id: 2, name: '第二時段', time: '16:50-17:30' }
      ],
      settings: {
        max_capacity_per_lecturer: 13,
        allow_same_lecturer_both_slots: false,
        system_name: '講師選課系統',
        description: '學員可選擇喜好的講師與時段'
      }
    };
    this._config = null;
    this.lastModified = null;
  }

  // 加載配置
  loadConfig() {
    try {
      const stats = fs.statSync(this.configPath);
      const currentModified = stats.mtime.getTime();
      
      // 如果文件沒有修改且已有配置，直接返回快取的配置
      if (this._config && this.lastModified === currentModified) {
        return this._config;
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      this._config = JSON.parse(configData);
      this.lastModified = currentModified;
      
      console.log('✅ 系統配置已重新載入');
      return this._config;
    } catch (error) {
      console.warn('無法載入系統配置文件，使用預設配置:', error.message);
      this._config = { ...this.defaultConfig };
      return this._config;
    }
  }

  // 強制重新載入配置
  reloadConfig() {
    this._config = null;
    this.lastModified = null;
    return this.loadConfig();
  }

  // 獲取當前配置
  getConfig() {
    return this.loadConfig();
  }

  // 獲取講師列表
  getLecturers() {
    return this.loadConfig().lecturers;
  }

  // 獲取時段列表
  getTimeSlots() {
    return this.loadConfig().time_slots;
  }

  // 獲取系統設定
  getSettings() {
    return this.loadConfig().settings;
  }

  // 保存配置
  saveConfig(newConfig) {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(newConfig, null, 2), 'utf8');
      this._config = newConfig;
      this.lastModified = fs.statSync(this.configPath).mtime.getTime();
      console.log('✅ 系統配置已保存');
      return true;
    } catch (error) {
      console.error('保存配置失敗:', error);
      return false;
    }
  }
}

// 創建全局配置管理器實例
const configManager = new ConfigManager();

// 建立資料庫連線
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('資料庫連線失敗:', err.message);
  } else {
    console.log('✅ SQLite 資料庫連線成功');
  }
});

// 動態獲取配置的 getter 函數
const getLecturers = () => configManager.getLecturers();
const getTimeSlots = () => configManager.getTimeSlots();
const getSystemSettings = () => configManager.getSettings();
const getSystemConfig = () => configManager.getConfig();

// 初始化資料庫表格
function initialize() {
  return new Promise((resolve, reject) => {
    // 啟用外鍵約束
    db.run('PRAGMA foreign_keys = ON');

    // 建立學員表
    const createStudentsTable = `
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        preferences TEXT NOT NULL, -- JSON 格式儲存志願序
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_submitted BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 建立分配結果表
    const createAllocationsTable = `
      CREATE TABLE IF NOT EXISTS allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id TEXT NOT NULL,
        time_slot INTEGER NOT NULL, -- 1 或 2
        lecturer TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(student_id),
        UNIQUE(student_id, time_slot)
      )
    `;

    // 建立系統設定表
    const createSettingsTable = `
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 建立分配歷史表
    const createAllocationHistoryTable = `
      CREATE TABLE IF NOT EXISTS allocation_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        allocation_data TEXT NOT NULL, -- JSON 格式
        stats TEXT NOT NULL, -- JSON 格式統計資料
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // 依序建立表格
    db.serialize(() => {
      db.run(createStudentsTable);
      db.run(createAllocationsTable);
      db.run(createSettingsTable);
      db.run(createAllocationHistoryTable);

      // 插入預設設定
      const currentConfig = configManager.getConfig();
      const insertDefaultSettings = `
        INSERT OR IGNORE INTO settings (key, value) VALUES 
        ('max_capacity_per_lecturer', '${currentConfig.settings.max_capacity_per_lecturer}'),
        ('lecturers', '${JSON.stringify(currentConfig.lecturers)}'),
        ('time_slots', '${JSON.stringify(currentConfig.time_slots)}'),
        ('system_status', 'active')
      `;
      
      db.run(insertDefaultSettings, (err) => {
        if (err) {
          console.error('插入預設設定失敗:', err.message);
          reject(err);
        } else {
          console.log('✅ 資料庫表格初始化完成');
          resolve();
        }
      });
    });
  });
}

// 取得設定值
function getSetting(key) {
  return new Promise((resolve, reject) => {
    db.get('SELECT value FROM settings WHERE key = ?', [key], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row ? row.value : null);
      }
    });
  });
}

// 更新設定值
function updateSetting(key, value) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [key, value],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      }
    );
  });
}

// 執行查詢（SELECT）
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// 執行單筆查詢
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// 執行更新/插入（INSERT, UPDATE, DELETE）
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({
          lastID: this.lastID,
          changes: this.changes
        });
      }
    });
  });
}

// 關閉資料庫連線
function close() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        console.log('資料庫連線已關閉');
        resolve();
      }
    });
  });
}

// 首先定义基本的 module.exports
const moduleExports = {
  db,
  initialize,
  getSetting,
  updateSetting,
  query,
  get,
  run,
  close,
  // 配置管理功能
  configManager,
  reloadConfig: () => configManager.reloadConfig(),
  saveConfig: (newConfig) => configManager.saveConfig(newConfig),
  getLecturers,
  getTimeSlots,
  getSystemSettings,
  getSystemConfig
};

// 然后添加动态属性
Object.defineProperty(moduleExports, 'LECTURERS', {
  get: getLecturers,
  enumerable: true
});

Object.defineProperty(moduleExports, 'TIME_SLOTS', {
  get: getTimeSlots,
  enumerable: true
});

Object.defineProperty(moduleExports, 'SYSTEM_SETTINGS', {
  get: getSystemSettings,
  enumerable: true
});

Object.defineProperty(moduleExports, 'systemConfig', {
  get: getSystemConfig,
  enumerable: true
});

module.exports = moduleExports; 