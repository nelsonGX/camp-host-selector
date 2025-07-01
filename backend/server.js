const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const db = require('./config/database');
const studentRoutes = require('./routes/students');
const adminRoutes = require('./routes/admin');
const allocationRoutes = require('./routes/allocation');
const authRoutes = require('./routes/auth');
const { requireAdminAuth } = require('./middleware/adminAuth');

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中間件
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-domain.com'] 
    : ['http://localhost:3000']
}));

// 限制請求頻率
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 100 // 每 15 分鐘最多 100 個請求
});
app.use(limiter);

// 解析 JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 初始化資料庫
db.initialize();

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/allocation', allocationRoutes);

// 健康檢查端點
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: '伺服器內部錯誤',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 處理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '找不到請求的資源'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 伺服器運行於 http://localhost:${PORT}`);
  console.log(`🔍 API 文檔：http://localhost:${PORT}/api/health`);
});

module.exports = app; 