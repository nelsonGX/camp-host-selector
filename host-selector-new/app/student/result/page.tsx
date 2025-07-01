'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiUser, FiClock, FiCheckCircle, FiLoader, FiLogOut, FiRefreshCw, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { allocationAPI, handleAPIError } from '../../../lib/api';

interface StudentData {
  student_id: string;
  name: string;
  is_submitted: boolean;
  preferences?: string[];
  submitted_at?: string;
}

interface TimeSlotAllocation {
  lecturer: string;
  time: string;
}

interface StudentAllocation {
  student_id: string;
  name: string;
  time_slot_1: TimeSlotAllocation;
  time_slot_2: TimeSlotAllocation;
}

interface AllocationData {
  allocation: StudentAllocation[];
  last_updated?: string;
}

const StudentResult = () => {
  const router = useRouter();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [allocationResult, setAllocationResult] = useState<AllocationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 從 localStorage 獲取學員資料
    const storedData = localStorage.getItem('student_data');
    if (storedData) {
      const data: StudentData = JSON.parse(storedData);
      setStudentData(data);
      
      // 如果未提交，重定向到志願序頁面
      if (!data.is_submitted) {
        router.push('/student/preferences');
        return;
      }
    } else {
      // 沒有學員資料，重定向到登入頁面
      router.push('/student/login');
      return;
    }

    // 獲取分配結果
    fetchAllocationResult();
  }, [router]);

  const fetchAllocationResult = async () => {
    setLoading(true);
    try {
      const response = await allocationAPI.getCurrentAllocation();
      if (response.success) {
        setAllocationResult(response.data);
      }
    } catch (error) {
      toast.error(handleAPIError(error, '獲取分配結果失敗'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('student_data');
    router.push('/student/login');
  };

  const getStudentAllocation = (): StudentAllocation | null => {
    if (!allocationResult || !studentData) return null;
    
    return allocationResult.allocation.find(
      item => item.student_id === studentData.student_id
    ) || null;
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="h-8 w-8 animate-spin text-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">載入分配結果中...</p>
        </div>
      </div>
    );
  }

  const myAllocation = getStudentAllocation();

  return (
    <div className="min-h-full bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* 頁面標題 */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-10 w-10 bg-success-100 rounded-full flex items-center justify-center">
                  <FiCheckCircle className="h-5 w-5 text-success-600" />
                </div>
                <div className="ml-4">
                  <h1 className="text-2xl font-bold text-gray-900">分配結果</h1>
                  <p className="text-sm text-gray-600">
                    學員：{studentData?.name} ({studentData?.student_id})
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={fetchAllocationResult}
                  className="btn btn-outline"
                >
                  <FiRefreshCw className="h-4 w-4 mr-2" />
                  重新整理
                </button>
                <button
                  onClick={handleLogout}
                  className="btn btn-outline"
                >
                  <FiLogOut className="h-4 w-4 mr-2" />
                  登出
                </button>
              </div>
            </div>
          </div>

          {/* 提交狀態 */}
          <div className="px-6 py-4 bg-success-50">
            <div className="flex items-center">
              <FiCheckCircle className="h-5 w-5 text-success-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-success-800">
                  志願序已成功提交
                </p>
                <p className="text-sm text-success-700">
                  提交時間：{formatDate(studentData?.submitted_at)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 我的志願序 */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">我的志願序</h2>
          </div>
          <div className="p-6">
            {studentData?.preferences && studentData.preferences.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {studentData.preferences.map((lecturer, index) => (
                  <div
                    key={index}
                    className={`
                      p-4 rounded-lg border-2 text-center
                      ${index === 0 ? 'border-yellow-300 bg-yellow-50' : 
                        index === 1 ? 'border-gray-300 bg-gray-50' :
                        index === 2 ? 'border-orange-300 bg-orange-50' :
                        'border-red-300 bg-red-50'}
                    `}
                  >
                    <div className={`
                      w-8 h-8 mx-auto rounded-full flex items-center justify-center font-bold text-white mb-2
                      ${index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-500' :
                        index === 2 ? 'bg-orange-500' :
                        'bg-red-500'}
                    `}>
                      {index + 1}
                    </div>
                    <h3 className="font-semibold text-gray-900">{lecturer}</h3>
                    <p className="text-sm text-gray-600">
                      第{['一', '二', '三', '四'][index]}志願
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center">無志願序資料</p>
            )}
          </div>
        </div>

        {/* 分配結果 */}
        {myAllocation ? (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">您的時段分配</h2>
              <p className="text-sm text-gray-600">
                系統已為您分配以下時段和講師
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 第一時段 */}
                <div className="bg-primary-50 rounded-lg p-6 border border-primary-200">
                  <div className="flex items-center mb-4">
                    <FiClock className="h-5 w-5 text-primary-600 mr-2" />
                    <h3 className="text-lg font-semibold text-primary-900">第一時段</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-primary-700">
                      時間：{myAllocation.time_slot_1.time}
                    </p>
                    <div className="bg-white rounded-md p-4 border border-primary-200">
                      <p className="text-sm text-gray-600 mb-1">講師</p>
                      <p className="text-xl font-bold text-primary-900">
                        {myAllocation.time_slot_1.lecturer}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 第二時段 */}
                <div className="bg-success-50 rounded-lg p-6 border border-success-200">
                  <div className="flex items-center mb-4">
                    <FiClock className="h-5 w-5 text-success-600 mr-2" />
                    <h3 className="text-lg font-semibold text-success-900">第二時段</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-success-700">
                      時間：{myAllocation.time_slot_2.time}
                    </p>
                    <div className="bg-white rounded-md p-4 border border-success-200">
                      <p className="text-sm text-gray-600 mb-1">講師</p>
                      <p className="text-xl font-bold text-success-900">
                        {myAllocation.time_slot_2.lecturer}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 分配說明 */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex">
                  <FiInfo className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-blue-800">分配說明</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      系統已根據您的志願序和其他學員的偏好，
                      為您安排了兩個不同講師的時段。請按時參加！
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">分配狀態</h2>
            </div>
            <div className="p-6">
              <div className="text-center py-12">
                {allocationResult ? (
                  <div>
                    <FiClock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      分配結果尚未生成
                    </h3>
                    <p className="text-gray-600 mb-4">
                      管理員尚未開始分配，請稍後再查看結果
                    </p>
                  </div>
                ) : (
                  <div>
                    <FiLoader className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      載入中...
                    </h3>
                    <p className="text-gray-600">
                      正在檢查分配結果
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 操作區域 */}
        <div className="mt-8 text-center">
          <Link
            href="/student/login"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
          >
            返回登入頁面
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StudentResult;