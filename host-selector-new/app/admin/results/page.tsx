'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FiBarChart2, FiUsers, FiClock, FiDownload, FiRefreshCw, 
  FiArrowLeft, FiLoader, FiCheckCircle, FiAlertCircle 
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { allocationAPI, handleAPIError, downloadFile } from '../../../lib/api';

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

interface LecturerData {
  current_count: number;
  max_capacity: number;
  utilization_rate: string;
  students?: Array<{
    name: string;
    student_id: string;
  }>;
}

interface TimeSlot {
  name: string;
  time: string;
  lecturers: Record<string, LecturerData>;
}

interface AllocationStats {
  time_slots: Record<string, TimeSlot>;
}

interface AllocationData {
  allocation: StudentAllocation[];
  stats?: AllocationStats;
  last_updated?: string;
}

interface LecturerStats {
  timeSlot1: { count: number; students: any[] };
  timeSlot2: { count: number; students: any[] };
  total: number;
}

const AllocationResults = () => {
  const [allocationData, setAllocationData] = useState<AllocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState('overview');

  useEffect(() => {
    fetchAllocationResults();
  }, []);

  const fetchAllocationResults = async () => {
    setLoading(true);
    try {
      const response = await allocationAPI.getCurrentAllocation();
      if (response.success) {
        setAllocationData(response.data);
      }
    } catch (error) {
      toast.error(handleAPIError(error, '獲取分配結果失敗'));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const response = await allocationAPI.exportCSV();
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      downloadFile(response.data, `講師分配結果_${timestamp}.csv`);
      toast.success('CSV 文件已下載');
    } catch (error) {
      toast.error(handleAPIError(error, '匯出失敗'));
    } finally {
      setExportLoading(false);
    }
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

  const getLecturerStats = (): Record<string, LecturerStats> => {
    if (!allocationData?.stats?.time_slots) return {};
    
    const lecturerStats: Record<string, LecturerStats> = {};
    Object.values(allocationData.stats.time_slots).forEach(timeSlot => {
      Object.entries(timeSlot.lecturers).forEach(([lecturer, data]) => {
        if (!lecturerStats[lecturer]) {
          lecturerStats[lecturer] = {
            timeSlot1: { count: 0, students: [] },
            timeSlot2: { count: 0, students: [] },
            total: 0
          };
        }
      });
    });

    // 填入數據
    if (allocationData.stats.time_slots[1]) {
      Object.entries(allocationData.stats.time_slots[1].lecturers).forEach(([lecturer, data]) => {
        lecturerStats[lecturer].timeSlot1 = {
          count: data.current_count,
          students: data.students || []
        };
      });
    }

    if (allocationData.stats.time_slots[2]) {
      Object.entries(allocationData.stats.time_slots[2].lecturers).forEach(([lecturer, data]) => {
        lecturerStats[lecturer].timeSlot2 = {
          count: data.current_count,
          students: data.students || []
        };
      });
    }

    // 計算總數
    Object.keys(lecturerStats).forEach(lecturer => {
      lecturerStats[lecturer].total = 
        lecturerStats[lecturer].timeSlot1.count + 
        lecturerStats[lecturer].timeSlot2.count;
    });

    return lecturerStats;
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

  if (!allocationData || allocationData.allocation.length === 0) {
    return (
      <div className="min-h-full bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <Link href="/admin/dashboard" className="btn btn-outline">
              <FiArrowLeft className="h-4 w-4 mr-2" />
              返回管理員儀表板
            </Link>
          </div>
          
          <div className="text-center py-12">
            <FiBarChart2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              尚未生成分配結果
            </h3>
            <p className="text-gray-600 mb-4">
              請先在管理員儀表板生成分配結果
            </p>
            <Link href="/admin/dashboard" className="btn btn-primary">
              前往管理員儀表板
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const lecturerStats = getLecturerStats();

  return (
    <div className="min-h-full bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* 頁面標題 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/admin/dashboard" className="btn btn-outline mr-4">
                <FiArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">分配結果管理</h1>
                <p className="text-gray-600">
                  查看和管理講師分配結果
                  {allocationData.last_updated && (
                    <span className="ml-2 text-sm">
                      最後更新：{formatDate(allocationData.last_updated)}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchAllocationResults}
                className="btn btn-outline"
                disabled={loading}
              >
                <FiRefreshCw className="h-4 w-4 mr-2" />
                重新整理
              </button>
              <button
                onClick={handleExport}
                disabled={exportLoading}
                className="btn btn-primary"
              >
                {exportLoading ? (
                  <>
                    <FiLoader className="h-4 w-4 mr-2 animate-spin" />
                    匯出中...
                  </>
                ) : (
                  <>
                    <FiDownload className="h-4 w-4 mr-2" />
                    匯出 CSV
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 分頁選單 */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              總覽統計
            </button>
            <button
              onClick={() => setSelectedTab('detailed')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'detailed'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              詳細分配
            </button>
            <button
              onClick={() => setSelectedTab('students')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'students'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              學員名單
            </button>
          </nav>
        </div>

        {/* 總覽統計 */}
        {selectedTab === 'overview' && (
          <div className="space-y-8">
            {/* 整體統計 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FiUsers className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">已分配學員</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {allocationData.allocation.length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FiCheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">分配成功率</p>
                    <p className="text-2xl font-bold text-gray-900">100%</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <FiBarChart2 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">講師數量</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Object.keys(lecturerStats).length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 講師統計 */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">講師容量統計</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {Object.entries(lecturerStats).map(([lecturer, stats]) => (
                    <div key={lecturer} className="border rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">{lecturer}</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">第一時段</span>
                          <span className="font-medium">
                            {stats.timeSlot1.count}/13
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(stats.timeSlot1.count / 13) * 100}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">第二時段</span>
                          <span className="font-medium">
                            {stats.timeSlot2.count}/13
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${(stats.timeSlot2.count / 13) * 100}%` }}
                          ></div>
                        </div>
                        <div className="pt-2 border-t border-gray-200">
                          <div className="flex justify-between text-sm font-medium">
                            <span>總計</span>
                            <span>{stats.total}/26</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 詳細分配 */}
        {selectedTab === 'detailed' && allocationData.stats && (
          <div className="space-y-8">
            {Object.entries(allocationData.stats.time_slots).map(([timeSlotId, timeSlot]) => (
              <div key={timeSlotId} className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center">
                    <FiClock className="h-5 w-5 text-primary-600 mr-2" />
                    <h2 className="text-lg font-medium text-gray-900">
                      {timeSlot.name} ({timeSlot.time})
                    </h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Object.entries(timeSlot.lecturers).map(([lecturer, data]) => (
                      <div key={lecturer} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-gray-900">{lecturer}</h3>
                          <span className={`badge ${
                            data.current_count === data.max_capacity ? 'badge-danger' :
                            data.current_count > data.max_capacity * 0.8 ? 'badge-warning' :
                            'badge-success'
                          }`}>
                            {data.current_count}/{data.max_capacity}
                          </span>
                        </div>
                        <div className="mb-3">
                          <div className="flex justify-between text-sm mb-1">
                            <span>容量使用率</span>
                            <span>{data.utilization_rate}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                parseFloat(data.utilization_rate) === 100 ? 'bg-red-600' :
                                parseFloat(data.utilization_rate) > 80 ? 'bg-yellow-600' :
                                'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(parseFloat(data.utilization_rate), 100)}%` }}
                            ></div>
                          </div>
                        </div>
                        {data.students && data.students.length > 0 && (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">學員名單：</p>
                            <div className="space-y-1 max-h-32 overflow-y-auto">
                              {data.students.map((student, index) => (
                                <div key={index} className="text-xs bg-gray-50 px-2 py-1 rounded">
                                  {student.name} ({student.student_id})
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 學員名單 */}
        {selectedTab === 'students' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">學員分配名單</h2>
              <p className="text-sm text-gray-600">
                共 {allocationData.allocation.length} 位學員已完成分配
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      學員資訊
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      第一時段
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      第二時段
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allocationData.allocation.map((student) => (
                    <tr key={student.student_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {student.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.student_id}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {student.time_slot_1.lecturer}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.time_slot_1.time}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {student.time_slot_2.lecturer}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.time_slot_2.time}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllocationResults;