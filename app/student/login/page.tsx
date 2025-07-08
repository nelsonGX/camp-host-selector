'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiChevronDown, FiSearch } from 'react-icons/fi';
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
  
  const studentNames = Object.keys(studentData).sort(() => Math.random() - 0.5);
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
        formData.name.trim(),
        formData.teamNumber.trim()
      );
      
      if (response.success) {
        // 只儲存學員UUID到 localStorage
        localStorage.setItem('student_uuid', response.data.student_id);
        
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
          <h2 className="text-2xl font-bold text-gray-900">
            學員登入
          </h2>
        </div>

        {/* 登入表單 */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* 姓名選擇 */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                姓名
              </label>
              <div className="mt-1 relative" ref={dropdownRef}>
                <div className="relative">
                  <input
                    ref={inputRef}
                    id="name"
                    type="text"
                    required
                    className={`input pr-10 transition-all duration-200 ease-in-out ${errors.name ? 'input-error' : ''}`}
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
                隊號
              </label>
              <div className="mt-1 relative">
                <select
                  id="teamNumber"
                  name="teamNumber"
                  required
                  className={`input pr-10 ${errors.teamNumber ? 'input-error' : ''}`}
                  value={formData.teamNumber}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">請選擇隊號</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(team => (
                    <option key={team} value={team}>第 {team} 隊</option>
                  ))}
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
              className="w-full py-3 px-4 text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 hover:shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  登入中...
                </span>
              ) : '登入'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default StudentLogin;