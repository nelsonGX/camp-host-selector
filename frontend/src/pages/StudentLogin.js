import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiLogIn, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { studentAPI, handleAPIError } from '../services/api';

const StudentLogin = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

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
    
    if (!formData.name.trim()) {
      newErrors.name = '請輸入姓名';
    } else if (formData.name.trim().length < 1 || formData.name.trim().length > 100) {
      newErrors.name = '姓名長度應在 1-100 字元之間';
    } else if (!/^[\u4e00-\u9fa5]+$/.test(formData.name.trim())) {
      newErrors.name = '請輸入正確的中文姓名';
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
      const response = await studentAPI.login(
        formData.name.trim()
      );
      
      if (response.success) {
        // 儲存學員資訊到 localStorage
        localStorage.setItem('student_data', JSON.stringify(response.data));
        
        toast.success(response.message);
        
        // 根據學員狀態導向不同頁面
        if (response.data.is_submitted) {
          navigate('/student/result');
        } else {
          navigate('/student/preferences');
        }
      }
    } catch (error) {
      toast.error(handleAPIError(error, '登入失敗'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 標題 */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
            <FiUser className="h-6 w-6 text-primary-600" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            學員登入
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            請輸入您的中文姓名以開始填寫志願序
          </p>
        </div>

        {/* 登入表單 */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* 姓名輸入 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                中文姓名 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className={`input ${errors.name ? 'input-error' : ''}`}
                  placeholder="請輸入您的中文姓名"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={loading}
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>
            </div>
          </div>

          {/* 提交按鈕 */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {loading ? (
                <>
                  <FiLoader className="h-4 w-4 mr-2 animate-spin" />
                  登入中...
                </>
              ) : (
                <>
                  <FiLogIn className="h-4 w-4 mr-2" />
                  登入
                </>
              )}
            </button>
          </div>

          {/* 說明文字 */}
          <div className="mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiUser className="h-5 w-5 text-blue-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    新用戶說明
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>
                      如果是首次使用，系統會自動為您建立帳戶。
                      請確保輸入的中文姓名正確無誤。
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentLogin; 