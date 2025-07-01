import axios from 'axios';

// 創建 axios 實例
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 請求攔截器
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
    
    // 只對管理員API和需要認證的分配API添加認證 token
    // 學員API和獲取分配結果API不需要認證
    const isAdminAPI = config.url?.includes('/admin/') || config.url?.includes('/auth/admin/');
    const isProtectedAllocationAPI = config.url?.includes('/allocation/generate') || 
                                     config.url?.includes('/allocation/export');
    
    if (isAdminAPI || isProtectedAllocationAPI) {
      const adminToken = localStorage.getItem('admin_token');
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
    }
    
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// 響應攔截器
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    // 處理網路錯誤
    if (!error.response) {
      return Promise.reject({
        message: '網路連線錯誤，請檢查網路狀態',
        type: 'NETWORK_ERROR'
      });
    }
    
    // 處理認證錯誤
    const { status, data } = error.response;
    if (status === 401 && (data?.code === 'ADMIN_AUTH_REQUIRED' || data?.code === 'TOKEN_EXPIRED' || data?.code === 'SESSION_EXPIRED')) {
      // 清除本地認證資訊
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_session');
      
      // 重導到登入頁面
      if (window.location.pathname.startsWith('/admin')) {
        window.location.href = '/admin/login';
      }
    }
    
    // 處理 HTTP 錯誤
    const errorMessage = data?.message || '請求失敗';
    
    return Promise.reject({
      message: errorMessage,
      status,
      type: 'HTTP_ERROR',
      code: data?.code,
      data
    });
  }
);

// 學員相關 API
export const studentAPI = {
  // 學員登入/註冊（只需要姓名）
  async login(name) {
    const response = await api.post('/students/login', {
      name: name.trim()
    });
    return response.data;
  },

  // 獲取學員資料
  async getStudent(studentId) {
    const response = await api.get(`/students/${studentId}`);
    return response.data;
  },

  // 更新志願序
  async updatePreferences(studentId, preferences) {
    const response = await api.put(`/students/${studentId}/preferences`, {
      preferences
    });
    return response.data;
  },

  // 提交志願序
  async submitPreferences(studentId) {
    const response = await api.post(`/students/${studentId}/submit`);
    return response.data;
  },

  // 獲取系統資訊
  async getSystemInfo() {
    const response = await api.get('/students/info/system');
    return response.data;
  }
};

// 管理員認證相關 API
export const authAPI = {
  // 管理員登入
  async adminLogin(password) {
    const response = await api.post('/auth/admin/login', {
      password: password
    });
    return response.data;
  },

  // 管理員登出
  async adminLogout() {
    const response = await api.post('/auth/admin/logout');
    return response.data;
  },

  // 驗證管理員認證狀態
  async verifyAdmin() {
    const response = await api.get('/auth/admin/verify');
    return response.data;
  },

  // 獲取認證狀態
  async getAuthStatus() {
    const response = await api.get('/auth/admin/status');
    return response.data;
  }
};

// 管理員相關 API
export const adminAPI = {
  // 獲取所有學員志願列表
  async getStudents() {
    const response = await api.get('/admin/students');
    return response.data;
  },

  // 重置單個學員志願序
  async resetStudent(studentId) {
    const response = await api.post(`/admin/students/${studentId}/reset`);
    return response.data;
  },

  // 清除所有資料
  async clearAll() {
    const response = await api.post('/admin/clear-all');
    return response.data;
  },

  // 重置所有學員志願序
  async resetAllPreferences() {
    const response = await api.post('/admin/reset-all-preferences');
    return response.data;
  },

  // 獲取統計資料
  async getStats() {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // 更新系統設定
  async updateSettings(settings) {
    const response = await api.put('/admin/settings', settings);
    return response.data;
  },

  // 獲取分配歷史
  async getAllocationHistory(limit = 10, offset = 0) {
    const response = await api.get('/admin/allocation-history', {
      params: { limit, offset }
    });
    return response.data;
  },

  // 獲取系統配置
  async getConfig() {
    const response = await api.get('/admin/config');
    return response.data;
  },

  // 更新系統配置
  async updateConfig(config) {
    const response = await api.put('/admin/config', config);
    return response.data;
  },

  // 重新載入系統配置
  async reloadConfig() {
    const response = await api.post('/admin/config/reload');
    return response.data;
  }
};

// 分配相關 API
export const allocationAPI = {
  // 生成分配結果
  async generateAllocation() {
    const response = await api.post('/allocation/generate');
    return response.data;
  },

  // 獲取當前分配結果
  async getCurrentAllocation() {
    const response = await api.get('/allocation/current');
    return response.data;
  },

  // 匯出 CSV
  async exportCSV() {
    const response = await api.get('/allocation/export/csv', {
      responseType: 'blob'
    });
    return response;
  },

  // 獲取講師詳細分配名單
  async getLecturerAllocation(lecturerName) {
    const response = await api.get(`/allocation/lecturers/${encodeURIComponent(lecturerName)}`);
    return response.data;
  }
};

// 通用 API 函數
export const commonAPI = {
  // 健康檢查
  async healthCheck() {
    const response = await api.get('/health');
    return response.data;
  }
};

// 錯誤處理輔助函數
export const handleAPIError = (error, defaultMessage = '操作失敗') => {
  console.error('API Error:', error);
  
  if (error?.type === 'NETWORK_ERROR') {
    return '網路連線錯誤，請檢查網路狀態';
  }
  
  return error?.message || defaultMessage;
};

// 匯出下載輔助函數
export const downloadFile = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default api; 