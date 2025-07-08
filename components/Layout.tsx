'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const pathname = usePathname();

  // 檢查是否為管理員登入頁面
  const isAdminLogin = pathname === '/admin/login';


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