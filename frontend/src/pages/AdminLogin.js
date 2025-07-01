import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLock, FiLogIn, FiLoader, FiShield, FiEye, FiEyeOff } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { authAPI, handleAPIError } from '../services/api';

const AdminLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});

  // 檢查是否已經登入
  useEffect(() => {
    const checkExistingAuth = async () => {
      const adminToken = localStorage.getItem('admin_token');
      if (adminToken) {
        try {
          await authAPI.verifyAdmin();
          // 如果驗證成功，重導到管理員儀表板
          navigate('/admin/dashboard');
        } catch (error) {
          // 如果驗證失敗，清除本地資料
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_session');
        }
      }
    };

    checkExistingAuth();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 清除錯誤
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.password.trim()) {
      newErrors.password = '請輸入管理員密碼';
    } else if (formData.password.length < 5) {
      newErrors.password = '密碼長度不足';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const response = await authAPI.adminLogin(formData.password);
      
      if (response.success) {
        // 儲存認證資訊到 localStorage
        localStorage.setItem('admin_token', response.data.token);
        localStorage.setItem('admin_session', JSON.stringify({
          sessionId: response.data.sessionId,
          loginTime: response.data.loginTime,
          expiresIn: response.data.expiresIn
        }));
        
        toast.success('登入成功！歡迎使用管理員系統');
        
        // 重導到管理員儀表板
        navigate('/admin/dashboard');
      }
    } catch (error) {
      if (error.code === 'INVALID_PASSWORD') {
        setErrors({ password: '密碼錯誤，請重新輸入' });
      } else {
        toast.error(handleAPIError(error, '登入失敗'));
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 標題區域 */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center shadow-lg">
            <FiShield className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white">
            管理員登入
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            請輸入管理員密碼以訪問系統管理功能
          </p>
        </div>

        {/* 登入表單 */}
        <div className="mt-8 bg-white rounded-lg shadow-2xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* 密碼輸入 */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                管理員密碼 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className={`appearance-none relative block w-full px-3 py-2 pr-10 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:z-10 sm:text-sm`}
                  placeholder="請輸入管理員密碼"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={togglePasswordVisibility}
                  disabled={loading}
                >
                  {showPassword ? (
                    <FiEyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <FiEye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>

            {/* 提交按鈕 */}
            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                  <FiLock className="h-4 w-4 text-red-500 group-hover:text-red-400" />
                </span>
                {loading ? (
                  <>
                    <FiLoader className="h-4 w-4 mr-2 animate-spin" />
                    登入中...
                  </>
                ) : (
                  <>
                    <FiLogIn className="h-4 w-4 mr-2" />
                    管理員登入
                  </>
                )}
              </button>
            </div>

            {/* 安全提示 */}
            <div className="mt-6">
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FiShield className="h-5 w-5 text-amber-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-amber-800">
                      安全提醒
                    </h3>
                    <div className="mt-2 text-sm text-amber-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>此為管理員專用登入頁面</li>
                        <li>Session 將在 24 小時後自動過期</li>
                        <li>請勿在公共電腦上保持登入狀態</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 返回首頁 */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                ← 返回首頁
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin; 