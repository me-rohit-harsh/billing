'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, PanelLeftClose, PanelLeftOpen, LogOut, User as UserIcon, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Header({ isCollapsed, onToggleCollapse }: HeaderProps) {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<string>('');
  const { user, logout } = useAuth();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        }) +
          ' • ' +
          now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return 'POS Counter Billing';
      case '/products':
        return 'Products Catalog';
      case '/categories':
        return 'Product Categories';
      case '/inventory':
        return 'Inventory Audit';
      case '/invoices':
        return 'Invoices & Receipts';
      case '/customers':
        return 'Customers Directory';
      case '/settings':
        return 'Store Settings';
      case '/settings/backup':
        return 'Cloud Backup & Sync';
      default:
        return 'BuildPro Hardware POS';
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Collapse Toggle Button & Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleCollapse}
          className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>

        <h2 className="font-extrabold text-slate-900 text-lg tracking-tight">{getPageTitle()}</h2>
      </div>

      {/* Right: Clock, Settings & User Profile */}
      <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
        <div className="hidden md:flex items-center gap-1.5 text-slate-500 font-mono text-[11px] bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentTime || 'Loading...'}</span>
        </div>


        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <UserIcon className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-slate-800">{user.name || user.username}</span>
            </div>
            <button
              onClick={logout}
              className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-rose-50 text-slate-600 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
