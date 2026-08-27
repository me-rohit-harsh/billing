'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingCart, Package, Users, Receipt } from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'POS Console', icon: ShoppingCart },
    { href: '/products', label: 'Products Catalog', icon: Package },
    { href: '/invoices', label: 'Invoices History', icon: Receipt },
    { href: '/customers', label: 'Customers Directory', icon: Users },
  ];

  return (
    <aside className="w-full md:w-64 bg-white border-r border-slate-200 text-slate-700 flex flex-col justify-between p-4 shrink-0 min-h-screen shadow-sm">
      <div>
        <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md">
            B
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-none text-base">BillingPro</h1>
            <span className="text-[11px] font-bold text-blue-600">Offline POS</span>
          </div>
        </div>

        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" /> {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium text-center">
        ⚡ System Status: <span className="text-emerald-600 font-bold">Offline Ready</span>
      </div>
    </aside>
  );
}
