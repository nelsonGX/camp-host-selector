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
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default Layout;