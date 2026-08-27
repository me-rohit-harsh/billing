'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Clock, PanelLeftClose, PanelLeftOpen, LogOut, User as UserIcon, Bell, AlertTriangle, ExternalLink, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { api, Product } from '@/lib/api';

interface HeaderProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function Header({ isCollapsed, onToggleCollapse }: HeaderProps) {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<string>('');
  const { user, logout } = useAuth();
  const { settings } = useStoreSettings();

  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

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

  useEffect(() => {
    fetchLowStock();
    const interval = setInterval(fetchLowStock, 20000);
    return () => clearInterval(interval);
  }, [settings.defaultLowStockThreshold]);

  const fetchLowStock = async () => {
    try {
      const res = await api.get('/products');
      const all: Product[] = res.data || [];
      const defaultThreshold = settings.defaultLowStockThreshold ?? 10;
      const low = all.filter((p) => {
        const threshold = p.minStockAlert && p.minStockAlert > 0 ? p.minStockAlert : defaultThreshold;
        return p.stock <= threshold;
      });
      setLowStockProducts(low);
    } catch {
      setLowStockProducts([]);
    }
  };

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

      {/* Right: Clock, Low Stock Notification Bell & User Profile */}
      <div className="flex items-center gap-3 text-xs font-semibold text-slate-600">
        <div className="hidden md:flex items-center gap-1.5 text-slate-500 font-mono text-[11px] bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentTime || 'Loading...'}</span>
        </div>

        {/* Sleek System Notification Panel */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-all cursor-pointer"
            title="System Notifications & Low Stock Alerts"
          >
            <Bell className="w-4 h-4 text-amber-600" />
            {lowStockProducts.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                {lowStockProducts.length}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-80 sm:w-[420px] bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {/* Notification Header */}
              <div className="px-5 py-4 bg-white border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Notifications</h3>
                  {lowStockProducts.length > 0 && (
                    <span className="bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-black px-2 py-0.5 rounded-full">
                      {lowStockProducts.length} Unresolved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-slate-400 hover:text-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
                    title="Close Panel"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notification Feed Body */}
              <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 custom-scrollbar bg-white">
                {lowStockProducts.length === 0 ? (
                  <div className="text-center py-10 px-4 text-slate-400 space-y-1">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-100">
                      <Bell className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-slate-800 text-xs">All Notifications Clear</p>
                    <p className="text-[11px] text-slate-400">All store inventory levels are currently above alert thresholds.</p>
                  </div>
                ) : (
                  lowStockProducts.map((prod) => {
                    const threshold = prod.minStockAlert && prod.minStockAlert > 0 ? prod.minStockAlert : (settings.defaultLowStockThreshold ?? 10);
                    return (
                      <div
                        key={prod._id}
                        className="p-4 hover:bg-slate-50/90 transition-colors flex items-start justify-between gap-3 group"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Indicator Dot & Icon */}
                          <div className="flex items-center gap-2 shrink-0 mt-0.5">
                            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                          </div>

                          {/* Message Content */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs truncate">{prod.name}</span>
                            </div>
                            <p className="text-[11px] font-medium text-slate-500 mt-0.5 leading-snug">
                              Low stock warning: <strong className="text-rose-600 font-bold">{prod.stock} {prod.unit || 'pcs'}</strong> remaining (Threshold: {threshold} {prod.unit || 'pcs'}).
                            </p>
                            <span className="text-[10px] text-slate-400 font-mono block mt-1">
                              Category: {prod.category || 'General'}
                            </span>
                          </div>
                        </div>

                        {/* Direct Action Link */}
                        <Link
                          href={`/inventory?adjustProduct=${prod._id}`}
                          onClick={() => setIsNotifOpen(false)}
                          className="h-7 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white border border-amber-200 hover:border-amber-600 font-bold text-[11px] transition-all flex items-center gap-1 cursor-pointer shrink-0 mt-0.5 shadow-2xs"
                        >
                          Restock <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Notification Footer Bar */}
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <Link
                  href="/inventory?filter=low_stock"
                  onClick={() => setIsNotifOpen(false)}
                  className="text-xs font-bold text-slate-600 hover:text-amber-700 transition-colors inline-flex items-center gap-1"
                >
                  View All Notifications in Inventory Audit →
                </Link>
              </div>
            </div>
          )}
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
