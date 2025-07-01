'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiUser, FiSettings, FiClock, FiUsers, FiBarChart2, FiCheckCircle } from 'react-icons/fi';
import { studentAPI } from '../lib/api';

export default function Home() {
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 获取系统配置
  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const response = await studentAPI.getSystemInfo();
        if (response.success) {
          setSystemInfo(response.data);
        }
      } catch (error) {
        console.error('獲取系統資訊失敗:', error);
        // 使用默认值作为备用
        setSystemInfo({
          lecturers: ['飛飛', '豆泥', '吳政賢', '趙式隆'],
          time_slots: [
            { name: '第一時段', time: '15:55–16:45' },
            { name: '第二時段', time: '16:50–17:30' }
          ],
          max_capacity: 13
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSystemInfo();
  }, []);

  // 加载状态
  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  const lecturers = systemInfo?.lecturers || [];
  const timeSlots = systemInfo?.time_slots || [];
  const maxCapacity = systemInfo?.max_capacity || 13;

  const features = [
    {
      icon: FiUsers,
      title: '智能分配演算法',
      description: `根據學員志願序自動分配，確保每時段每講師最多 ${maxCapacity} 人`
    },
    {
      icon: FiClock,
      title: '雙時段安排',
      description: '兩個時段自動安排不同講師，確保學習體驗的多樣性'
    },
    {
      icon: FiBarChart2,
      title: '即時統計資料',
      description: '提供詳細的分配統計和視覺化圖表'
    },
    {
      icon: FiCheckCircle,
      title: '簡便操作',
      description: '直觀的使用者介面，簡化志願序填寫和管理流程'
    }
  ];

  return (
    <div className="min-h-full">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-red-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              講師排程與
              <span className="text-red-600 block">人員分配平台</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              智能分配演算法，讓學員輸入志願序，自動安排最佳的講師時段配置。
              每位學員將在兩個時段聽取不同講師的分享。
            </p>
            <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Link
                href="/student/login"
                className="btn btn-primary text-lg px-8 py-3"
              >
                <FiUser className="h-5 w-5 mr-2" />
                學員入口
              </Link>
              <Link
                href="/admin/login"
                className="btn btn-outline text-lg px-8 py-3"
              >
                <FiSettings className="h-5 w-5 mr-2" />
                管理員入口
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              系統特色
            </h2>
            <p className="text-lg text-gray-600 mb-16">
              提供完整的講師排程解決方案
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="text-center p-6 rounded-lg hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Info Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* 講師資訊 */}
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <FiUsers className="h-6 w-6 mr-3 text-red-600" />
                講師陣容
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {lecturers.map((lecturer: string, index: number) => (
                  <div
                    key={index}
                    className="bg-red-50 rounded-lg p-4 text-center"
                  >
                    <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-red-800 font-semibold">
                        {lecturer.charAt(0)}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900">{lecturer}</h4>
                  </div>
                ))}
              </div>
            </div>

            {/* 時段資訊 */}
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <FiClock className="h-6 w-6 mr-3 text-red-600" />
                時段安排
              </h3>
              <div className="space-y-4">
                {timeSlots.map((slot: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <h4 className="font-semibold text-gray-900">{slot.name}</h4>
                      <p className="text-sm text-gray-600">每位講師最多 {maxCapacity} 人</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-red-600">{slot.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <FiCheckCircle className="h-4 w-4 inline mr-2" />
                  系統會自動確保每位學員在兩個時段聽取不同講師的分享
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-red-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            準備開始了嗎？
          </h2>
          <p className="text-xl text-red-100 mb-8">
            選擇您的角色，開始使用講師排程系統
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              href="/student/login"
              className="bg-white text-red-600 hover:bg-gray-50 px-8 py-3 rounded-md text-lg font-medium transition-colors duration-200 flex items-center justify-center"
            >
              <FiUser className="h-5 w-5 mr-2" />
              我是學員
            </Link>
            <Link
              href="/admin/login"
              className="bg-red-700 text-white hover:bg-red-800 px-8 py-3 rounded-md text-lg font-medium transition-colors duration-200 flex items-center justify-center"
            >
              <FiSettings className="h-5 w-5 mr-2" />
              我是管理員
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
