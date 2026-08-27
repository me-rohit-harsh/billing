'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Store, Wifi, Clock, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface HeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Header({ isCollapsed, onToggleCollapse }: HeaderProps) {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<string>('');

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
        return { title: 'POS Console & Quick Billing', badge: 'Billing' };
      case '/products':
        return { title: 'Products Catalog', badge: 'Catalog' };
      case '/inventory':
        return { title: 'Inventory & Stock Audit', badge: 'Stock' };
      case '/invoices':
        return { title: 'Invoices History & Receipts', badge: 'Invoices' };
      case '/customers':
        return { title: 'Customers Directory', badge: 'Directory' };
      default:
        return { title: 'Billing Manager', badge: 'App' };
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
        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold text-xs border border-blue-100">
          {badge}
        </span>
      </div>

      {/* Right: Store Status & Clock */}
      <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
        <div className="hidden sm:flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Store className="w-4 h-4 text-blue-600" />
          <span className="font-bold text-slate-800">Main Store</span>
        </div>

        <div className="hidden md:flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 font-mono">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>{currentTime || 'Loading...'}</span>
        </div>

        <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-200 font-bold">
          <Wifi className="w-3.5 h-3.5" />
          <span>Offline Mode</span>
        </div>
      </div>
    </header>
  );
}
