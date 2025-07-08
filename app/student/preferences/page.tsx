'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiUser, FiArrowUp, FiArrowDown, FiSave, FiSend, FiLoader, FiLogOut, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { studentAPI, handleAPIError } from '../../../lib/api';

interface StudentData {
  student_id: string;
  name: string;
  is_submitted: boolean;
  preferences?: string[];
  submitted_at?: string;
}

interface SystemInfo {
  lecturers: string[];
  time_slots: Array<{
    id: number;
    name: string;
    time: string;
  }>;
  max_capacity: number;
}

const StudentPreferences = () => {
  const router = useRouter();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const fetchSystemInfo = useCallback(async () => {
    try {
      const response = await studentAPI.getSystemInfo();
      if (response.success) {
        setSystemInfo(response.data);
        
        // 如果還沒有志願序，初始化為講師列表
        if (preferences.length === 0) {
          setPreferences(response.data.lecturers);
        }
      }
    } catch (error) {
      toast.error(handleAPIError(error, '獲取系統資訊失敗'));
    }
  }, [preferences.length]);

  // 從 localStorage 獲取學員UUID並透過API獲取學員資料
  useEffect(() => {
    const studentUuid = localStorage.getItem('student_uuid');
    if (studentUuid) {
      fetchStudentData(studentUuid);
    } else {
      // 沒有學員UUID，重定向到登入頁面
      router.push('/student/login');
      return;
    }

    // 獲取系統資訊
    fetchSystemInfo();
  }, [router, fetchSystemInfo]);

  const fetchStudentData = async (studentId: string) => {
    try {
      const response = await studentAPI.getStudent(studentId);
      setStudentData(response);
      
      // 如果已提交，重定向到結果頁面
      if (response.is_submitted) {
        router.push('/student/result');
        return;
      }
      
      // 設定已儲存的志願序
      if (response.preferences && response.preferences.length > 0) {
        setPreferences(response.preferences);
      }
    } catch (error) {
      toast.error(handleAPIError(error, '無法獲取學員資料'));
      // 清除無效的UUID並重定向到登入頁面
      localStorage.removeItem('student_uuid');
      router.push('/student/login');
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newPreferences = [...preferences];
    [newPreferences[index], newPreferences[index - 1]] = [newPreferences[index - 1], newPreferences[index]];
    setPreferences(newPreferences);
  };

  const moveDown = (index: number) => {
    if (index === preferences.length - 1) return;
    const newPreferences = [...preferences];
    [newPreferences[index], newPreferences[index + 1]] = [newPreferences[index + 1], newPreferences[index]];
    setPreferences(newPreferences);
  };


  const handleSubmit = async () => {
    if (!studentData) return;

    setLoading(true);
    try {
      // 先儲存志願序
      await studentAPI.updatePreferences(
        studentData.student_id,
        preferences
      );

      // 然後提交
      const response = await studentAPI.submitPreferences(studentData.student_id);
      
      if (response.success) {
        toast.success('志願序提交成功！');
        
        // 重定向到結果頁面
        router.push('/student/result');
      }
    } catch (error) {
      toast.error(handleAPIError(error, '提交失敗'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('student_uuid');
    router.push('/student/login');
  };

  if (!studentData || !systemInfo) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <FiLoader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes bounceIn {
          0%, 20%, 40%, 60%, 80% {
            animation-timing-function: cubic-bezier(0.215, 0.610, 0.355, 1.000);
          }
          0% {
            opacity: 0;
            transform: scale3d(.3, .3, .3);
          }
          20% {
            transform: scale3d(1.1, 1.1, 1.1);
          }
          40% {
            transform: scale3d(.9, .9, .9);
          }
          60% {
            opacity: 1;
            transform: scale3d(1.03, 1.03, 1.03);
          }
          80% {
            transform: scale3d(.97, .97, .97);
          }
          100% {
            opacity: 1;
            transform: scale3d(1, 1, 1);
          }
        }
      `}</style>
      <div className="max-w-3xl mx-auto">
        {/* 頁面標題 */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">選擇講師順序</h1>
              <p className="text-sm text-gray-600">{studentData.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              登出
            </button>
          </div>
        </div>

        {/* 志願序列表 */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="space-y-3">
              {preferences.map((lecturer, index) => (
                <div
                  key={lecturer}
                  className="flex items-center justify-between p-4 border rounded-lg transition-all duration-300 ease-in-out transform hover:shadow-md hover:scale-[1.02] hover:border-blue-300"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: 'fadeInUp 0.5s ease-out forwards'
                  }}
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm transition-all duration-300 ease-in-out">
                      {index + 1}
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900 transition-colors duration-200">
                        {lecturer}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out hover:scale-110 active:scale-95"
                    >
                      <FiArrowUp className="h-4 w-4 transition-transform duration-200" />
                    </button>
                    <button
                      onClick={() => moveDown(index)}
                      disabled={index === preferences.length - 1}
                      className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out hover:scale-110 active:scale-95"
                    >
                      <FiArrowDown className="h-4 w-4 transition-transform duration-200" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>


        {/* 操作按鈕 */}
        <div className="mt-8 text-center">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-8 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ease-in-out transform hover:scale-105 active:scale-95 hover:shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                提交中...
              </span>
            ) : '提交志願序'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default StudentPreferences;