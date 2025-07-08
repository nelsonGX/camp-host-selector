'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiClock, FiCheckCircle, FiLoader, FiLogOut, FiRefreshCw, FiInfo } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { allocationAPI, studentAPI, handleAPIError } from '../../../lib/api';

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
    // 從 localStorage 獲取學員UUID並透過API獲取學員資料
    const studentUuid = localStorage.getItem('student_uuid');
    if (studentUuid) {
      fetchStudentData(studentUuid);
    } else {
      // 沒有學員UUID，重定向到登入頁面
      router.push('/student/login');
      return;
    }

    // 獲取分配結果
    fetchAllocationResult();
  }, [router]);

  const fetchStudentData = async (studentId: string) => {
    try {
      const response = await studentAPI.getStudent(studentId);
      setStudentData(response);
      
      // 如果未提交，重定向到志願序頁面
      if (!response.is_submitted) {
        router.push('/student/preferences');
        return;
      }
    } catch (error) {
      toast.error(handleAPIError(error, '無法獲取學員資料'));
      // 清除無效的UUID並重定向到登入頁面
      localStorage.removeItem('student_uuid');
      router.push('/student/login');
    }
  };

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
    localStorage.removeItem('student_uuid');
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
      `}</style>
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

            <div className="pt-8">
              <Link href={"/student/preferences"} className="rounded-2xl p-4 bg-zinc-300 border">編輯順序...</Link>
            </div>
          </div>
        </div>

        {/* 分配結果 */}
        {myAllocation ? (
          <div className="bg-white shadow rounded-lg">
            <div className="p-6">
              <div className="space-y-4">
                {/* 第一時段 */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">第一時段</h3>
                      <p className="text-sm text-gray-600">{myAllocation.time_slot_1.time}</p>
                    </div>
                    <p className="text-xl font-bold text-blue-700">{myAllocation.time_slot_1.lecturer}</p>
                  </div>
                </div>

                {/* 第二時段 */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">第二時段</h3>
                      <p className="text-sm text-gray-600">{myAllocation.time_slot_2.time}</p>
                    </div>
                    <p className="text-xl font-bold text-green-700">{myAllocation.time_slot_2.lecturer}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg">
            <div className="p-6 text-center">
              <p className="text-gray-600">分配結果尚未生成，請稍後再查看</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default StudentResult;