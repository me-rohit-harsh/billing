'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Package, Users, Receipt, Boxes } from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
}

export function Sidebar({ isCollapsed }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'POS Console', icon: ShoppingCart },
    { href: '/products', label: 'Products Catalog', icon: Package },
    { href: '/inventory', label: 'Inventory Manager', icon: Boxes },
    { href: '/invoices', label: 'Invoices History', icon: Receipt },
    { href: '/customers', label: 'Customers Directory', icon: Users },
  ];

  return (
    <aside
      className={`bg-white border-r border-slate-200 text-slate-700 flex flex-col justify-between p-3 shrink-0 md:sticky md:top-0 md:h-screen shadow-sm z-30 transition-all duration-300 ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div>
        {/* Header Branding */}
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} py-3 mb-6 border-b border-slate-100`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center text-white font-black text-xl shadow-md shrink-0">
              🛠️
            </div>
            {!isCollapsed && (
              <div className="animate-in fade-in duration-200">
                <h1 className="font-bold text-slate-900 leading-none text-base">BuildPro</h1>
                <span className="text-[11px] font-bold text-amber-600">Hardware & POS</span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? item.label : undefined}
                className={`flex items-center gap-3 ${
                  isCollapsed ? 'justify-center px-0 py-3' : 'px-4 py-3'
                } rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Status */}
      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium text-center">
        {isCollapsed ? (
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" title="Offline Ready" />
        ) : (
          <span>
            ⚡ System Status: <span className="text-emerald-600 font-bold">Offline Ready</span>
          </span>
        )}
      </div>
    </aside>
  );
}
