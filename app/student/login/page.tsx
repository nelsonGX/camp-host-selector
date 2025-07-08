'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiLogIn, FiLoader, FiChevronDown, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { studentAPI, handleAPIError } from '../../../lib/api';
import { studentData } from '../../../lib/student_data';

interface FormData {
  name: string;
  teamNumber: string;
}

interface FormErrors {
  name?: string;
  teamNumber?: string;
}

const StudentLogin = () => {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    teamNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const studentNames = Object.keys(studentData);
  const filteredNames = studentNames.filter(name => 
    name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // 清除錯誤
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };
  
  const handleNameSelect = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      teamNumber: ''
    }));
    setSearchTerm(name);
    setIsDropdownOpen(false);
    
    // 清除錯誤
    if (errors.name) {
      setErrors(prev => ({
        ...prev,
        name: ''
      }));
    }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setIsDropdownOpen(true);
    
    // 如果輸入完全匹配某個名字，自動選中
    const exactMatch = studentNames.find(name => name === value);
    if (exactMatch) {
      setFormData(prev => ({
        ...prev,
        name: exactMatch,
        teamNumber: ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        name: '',
        teamNumber: ''
      }));
    }
  };
  
  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '請選擇姓名';
    }
    
    if (!formData.teamNumber.trim()) {
      newErrors.teamNumber = '請選擇隊號';
    } else if (formData.name && studentData[formData.name] !== formData.teamNumber) {
      newErrors.teamNumber = '隊號與姓名不符';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
          router.push('/student/result');
        } else {
          router.push('/student/preferences');
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
            請選擇您的姓名和隊號以開始填寫志願序
          </p>
        </div>

        {/* 登入表單 */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* 姓名選擇 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                中文姓名 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative" ref={dropdownRef}>
                <div className="relative">
                  <input
                    ref={inputRef}
                    id="name"
                    type="text"
                    required
                    className={`input pr-10 ${errors.name ? 'input-error' : ''}`}
                    placeholder="請搜尋或選擇您的姓名"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    onFocus={() => setIsDropdownOpen(true)}
                    disabled={loading}
                  />
                  <FiSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
                
                {/* 下拉選單 */}
                {isDropdownOpen && filteredNames.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredNames.map(name => (
                      <div
                        key={name}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                        onClick={() => handleNameSelect(name)}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
                
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                )}
              </div>
            </div>

            {/* 隊號選擇 */}
            <div>
              <label htmlFor="teamNumber" className="block text-sm font-medium text-gray-700">
                隊號 <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 relative">
                <select
                  id="teamNumber"
                  name="teamNumber"
                  required
                  className={`input pr-10 ${errors.teamNumber ? 'input-error' : ''}`}
                  value={formData.teamNumber}
                  onChange={handleChange}
                  disabled={loading || !formData.name}
                >
                  <option value="">請選擇隊號</option>
                  {formData.name && (
                    <option value={studentData[formData.name]}>第 {studentData[formData.name]} 隊</option>
                  )}
                </select>
                <FiChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                {errors.teamNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.teamNumber}</p>
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
                      請確保選擇的姓名和隊號正確無誤。
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