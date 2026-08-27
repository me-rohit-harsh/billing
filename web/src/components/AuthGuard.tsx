'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, token, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [isCollapsed, setIsCollapsed] = React.useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('billing_sidebar_collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('billing_sidebar_collapsed', String(next));
      return next;
    });
  };

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    if (!isLoading) {
      if (!token && !isLoginPage) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else if (token && isLoginPage) {
        router.push('/');
      }
    }
  }, [token, isLoading, isLoginPage, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Verifying session...</p>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!token) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col md:flex-row bg-slate-50 overflow-hidden">
      <Sidebar isCollapsed={isCollapsed} />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header isCollapsed={isCollapsed} onToggleCollapse={handleToggleCollapse} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
