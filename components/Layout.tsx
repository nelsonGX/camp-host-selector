'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FiHome, FiUser, FiSettings, FiBarChart2, FiUsers } from 'react-icons/fi';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const pathname = usePathname();

  // 檢查是否為管理員登入頁面
  const isAdminLogin = pathname === '/admin/login';

  const navigationItems = [
    { path: '/', label: '首頁', icon: FiHome },
    { path: '/student/login', label: '學員登入', icon: FiUser },
    { path: '/admin/login', label: '管理員', icon: FiSettings },
  ];

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    if (path === '/admin/login') {
      return pathname.startsWith('/admin');
    }
    return pathname.startsWith(path);
  };

  // 如果是管理員登入頁面，只顯示內容不顯示導航和頁尾
  if (isAdminLogin) {
    return <>{children}</>;
  }

  return (
    <div className="h-full flex flex-col">
      {/* 導航欄 */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <FiBarChart2 className="h-8 w-8 text-red-600" />
                <span className="text-xl font-bold text-gray-900">
                  講師排程平台
                </span>
              </Link>
            </div>

            {/* 導航項目 */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      className={`${
                        isActive(item.path)
                          ? 'bg-red-100 text-red-700'
                          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      } px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 transition-colors duration-200`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 手機版選單按鈕 */}
            <div className="md:hidden">
              <button
                type="button"
                className="bg-gray-800 inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
              >
                <FiUsers className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* 手機版導航選單 */}
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`${
                    isActive(item.path)
                      ? 'bg-red-100 text-red-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  } block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2 transition-colors duration-200`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* 主要內容區域 */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* 頁尾 */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              © 2024 講師排程與人員分配平台. All rights reserved.
            </p>
            <div className="flex items-center space-x-4">
              <a 
                href="/api/health" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                系統狀態
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;