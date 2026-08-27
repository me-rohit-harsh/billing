'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Store, Wifi, Clock, PanelLeftClose, PanelLeftOpen, LogOut, User as UserIcon } from 'lucide-react';
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
          now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = () => {
    switch (pathname) {
      case '/':
        return { title: 'Hardware Counter & Quick POS', badge: 'Counter Billing' };
      case '/products':
        return { title: 'Tools & Hardware Catalog', badge: 'Inventory' };
      case '/inventory':
        return { title: 'Stock & Building Supplies Audit', badge: 'Stock Audit' };
      case '/invoices':
        return { title: 'Sales Invoices & Receipts', badge: 'Billing History' };
      case '/customers':
        return { title: 'Contractors & Customers Directory', badge: 'Contractors' };
      default:
        return { title: 'BuildPro Hardware POS', badge: 'Hardware' };
    }
  };

  const { title, badge } = getPageTitle();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      {/* Left: Collapse Toggle Button & Page Context */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleCollapse}
          className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors cursor-pointer shrink-0"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
        </button>

        <h2 className="font-extrabold text-slate-900 text-lg tracking-tight">{title}</h2>
        <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-xs border border-amber-200">
          {badge}
        </span>
      </div>

      {/* Right: Store Status, User Info & Logout */}
      <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Store className="w-4 h-4 text-amber-600" />
          <span className="font-bold text-slate-800">Hardware Main Outlet</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 font-mono">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>{currentTime || 'Loading...'}</span>
        </div>

        <div className="hidden lg:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold">
          <Wifi className="w-3.5 h-3.5" />
          <span>Offline Mode</span>
        </div>

        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
              <UserIcon className="w-4 h-4 text-blue-600" />
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
