import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { authAPI } from './services/api';

// 頁面組件
import StudentLogin from './pages/StudentLogin';
import StudentPreferences from './pages/StudentPreferences';
import StudentResult from './pages/StudentResult';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AllocationResults from './pages/AllocationResults';
import SystemConfig from './pages/SystemConfig';
import Home from './pages/Home';

// 佈局組件
import Layout from './components/Layout';

// 樣式
import './index.css';

// 受保護的管理員路由組件
const ProtectedAdminRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const adminToken = localStorage.getItem('admin_token');
      
      if (!adminToken) {
        setIsAuthenticated(false);
        setIsChecking(false);
        return;
      }

      try {
        await authAPI.verifyAdmin();
        setIsAuthenticated(true);
      } catch (error) {
        console.log('認證驗證失敗:', error);
        // 清除無效的認證資訊
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_session');
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, []);

  if (isChecking) {
    // 認證檢查中的載入畫面
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">驗證管理員權限中...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <div className="App h-full">
        <Layout>
          <Routes>
            {/* 首頁 */}
            <Route path="/" element={<Home />} />
            
            {/* 學員路由 */}
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/student/preferences" element={<StudentPreferences />} />
            <Route path="/student/result" element={<StudentResult />} />
            
            {/* 管理員路由 */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={
              <ProtectedAdminRoute>
                <Navigate to="/admin/dashboard" replace />
              </ProtectedAdminRoute>
            } />
            <Route path="/admin/dashboard" element={
              <ProtectedAdminRoute>
                <AdminDashboard />
              </ProtectedAdminRoute>
            } />
            <Route path="/admin/results" element={
              <ProtectedAdminRoute>
                <AllocationResults />
              </ProtectedAdminRoute>
            } />
            <Route path="/admin/config" element={
              <ProtectedAdminRoute>
                <SystemConfig />
              </ProtectedAdminRoute>
            } />
            
            {/* 重定向 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
        
        {/* Toast 通知 */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              style: {
                background: '#22c55e',
              },
            },
            error: {
              duration: 5000,
              style: {
                background: '#ef4444',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App; 