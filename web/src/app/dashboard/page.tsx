'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  AlertTriangle,
  ArrowUpRight,
  Download,
  ShoppingCart,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Activity,
  Boxes,
  Database,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { api, Invoice, Product, Customer } from '@/lib/api';
import { CustomDropdown } from '@/components/shared/CustomDropdown';
import { useToast } from '@/context/ToastContext';

// Color Palette for Charts
const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EC4899', '#06B6D4'];

interface DashboardData {
  kpi: {
    totalRevenue: number;
    totalInvoices: number;
    totalTax: number;
    averageOrderValue: number;
    totalProductsCount: number;
    totalStockUnits: number;
    lowStockCount: number;
    totalStockValuation: number;
    totalCustomersCount: number;
    totalBalanceDue: number;
  };
  paymentModeBreakdown: Array<{ mode: string; count: number; amount: number; color: string }>;
  categoryBreakdown: Array<{ name: string; revenue: number; itemsSold: number }>;
  topProducts: Array<{ id: string; name: string; category: string; qty: number; revenue: number }>;
  lowStockProducts: Array<{ _id: string; name: string; stock: number; unit: string; price: number }>;
  recentInvoices: Invoice[];
  trendData: Array<{ date: string; revenue: number; orders: number; tax: number }>;
}

export default function DashboardPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<string>('30d');
  const [chartView, setChartView] = useState<'revenue' | 'orders' | 'both'>('both');

  const [serverStats, setServerStats] = useState<DashboardData | null>(null);
  const [rawInvoices, setRawInvoices] = useState<Invoice[]>([]);
  const [rawProducts, setRawProducts] = useState<Product[]>([]);
  const [rawCustomers, setRawCustomers] = useState<Customer[]>([]);

  const timeRangeOptions = [
    { _id: 'today', name: 'Today' },
    { _id: '7d', name: 'Last 7 Days' },
    { _id: '30d', name: 'Last 30 Days' },
    { _id: 'this_month', name: 'This Month' },
    { _id: 'this_year', name: 'This Year' },
    { _id: 'all', name: 'All Time' },
  ];

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // Try backend dashboard analytics API first
      const statsRes = await api.get(`/dashboard/stats?range=${timeRange}`).catch(() => null);
      if (statsRes && statsRes.data) {
        setServerStats(statsRes.data);
      }

      // Also fetch raw models as client backup
      const [invRes, prodRes, custRes] = await Promise.all([
        api.get('/invoices').catch(() => ({ data: [] })),
        api.get('/products').catch(() => ({ data: [] })),
        api.get('/customers').catch(() => ({ data: [] })),
      ]);

      setRawInvoices(invRes.data || []);
      setRawProducts(prodRes.data || []);
      setRawCustomers(custRes.data || []);
    } catch {
      toast.error('Failed to load real-time analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange]);

  // Compute 100% real analytics data from server or raw models (NO FALLBACK/MOCK DATA)
  const dashboardStats: DashboardData = useMemo(() => {
    if (serverStats) {
      return serverStats;
    }

    // Filter invoices by selected date range
    const now = new Date();
    let startDate: Date | null = null;
    if (timeRange === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeRange === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === '30d') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeRange === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeRange === 'this_year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    const filteredInvoices = rawInvoices.filter((inv) => {
      if (!startDate) return true;
      const invDate = inv.createdAt ? new Date(inv.createdAt) : new Date();
      return invDate >= startDate;
    });

    const products = rawProducts;
    const customers = rawCustomers;

    const totalRevenue = filteredInvoices.reduce((acc, inv) => acc + (inv.grandTotal || 0), 0);
    const totalInvoices = filteredInvoices.length;
    const totalTax = filteredInvoices.reduce((acc, inv) => acc + (inv.taxTotal || 0), 0);
    const averageOrderValue = totalInvoices > 0 ? Math.round(totalRevenue / totalInvoices) : 0;

    const totalProductsCount = products.length;
    const totalStockUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
    const lowStockList = products.filter((p) => (p.stock || 0) < 10);
    const totalStockValuation = products.reduce((acc, p) => acc + (p.stock || 0) * (p.price || 0), 0);

    const totalCustomersCount = customers.length;
    const totalBalanceDue = customers.reduce((acc, c) => acc + (c.balanceDue || 0), 0);

    // Payment mode calculation
    const modeCounts = { CASH: 0, UPI: 0, CARD: 0, CREDIT: 0 };
    const modeAmounts = { CASH: 0, UPI: 0, CARD: 0, CREDIT: 0 };
    filteredInvoices.forEach((inv) => {
      const m = (inv.paymentMode || 'CASH') as keyof typeof modeCounts;
      if (modeCounts[m] !== undefined) {
        modeCounts[m] += 1;
        modeAmounts[m] += inv.grandTotal || 0;
      }
    });

    // Category breakdown map
    const catMap: Record<string, { revenue: number; itemsSold: number }> = {};
    filteredInvoices.forEach((inv) => {
      inv.items?.forEach((item) => {
        const prod = products.find((p) => p._id === item.productId || p.name === item.name);
        const cat = prod?.category || 'General';
        if (!catMap[cat]) catMap[cat] = { revenue: 0, itemsSold: 0 };
        const rev = item.subtotal || item.price * item.qty;
        catMap[cat].revenue += rev;
        catMap[cat].itemsSold += item.qty;
      });
    });

    const categoryBreakdown = Object.entries(catMap).map(([name, val]) => ({
      name,
      revenue: val.revenue,
      itemsSold: val.itemsSold,
    }));

    // Top selling products calculation
    const prodSalesMap: Record<string, { id: string; name: string; category: string; qty: number; revenue: number }> = {};
    filteredInvoices.forEach((inv) => {
      inv.items?.forEach((item) => {
        const pKey = item.productId || item.name;
        if (!prodSalesMap[pKey]) {
          const matchedP = products.find((p) => p._id === item.productId || p.name === item.name);
          prodSalesMap[pKey] = {
            id: pKey,
            name: item.name,
            category: matchedP?.category || 'General',
            qty: 0,
            revenue: 0,
          };
        }
        prodSalesMap[pKey].qty += item.qty;
        prodSalesMap[pKey].revenue += item.subtotal || item.price * item.qty;
      });
    });

    const topProductsList = Object.values(prodSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Trend timeline calculations
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trendBuckets: Record<string, { revenue: number; orders: number; tax: number }> = {};

    const daysCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 7;
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = daysCount <= 7 ? dayNames[d.getDay()] : `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
      trendBuckets[label] = { revenue: 0, orders: 0, tax: 0 };
    }

    filteredInvoices.forEach((inv) => {
      const date = inv.createdAt ? new Date(inv.createdAt) : new Date();
      const label = daysCount <= 7 ? dayNames[date.getDay()] : `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
      if (trendBuckets[label]) {
        trendBuckets[label].revenue += inv.grandTotal || 0;
        trendBuckets[label].orders += 1;
        trendBuckets[label].tax += inv.taxTotal || 0;
      }
    });

    const trendData = Object.entries(trendBuckets).map(([date, val]) => ({
      date,
      revenue: val.revenue,
      orders: val.orders,
      tax: val.tax,
    }));

    return {
      kpi: {
        totalRevenue,
        totalInvoices,
        totalTax,
        averageOrderValue,
        totalProductsCount,
        totalStockUnits,
        lowStockCount: lowStockList.length,
        totalStockValuation,
        totalCustomersCount,
        totalBalanceDue,
      },
      paymentModeBreakdown: [
        { mode: 'Cash', count: modeCounts.CASH, amount: modeAmounts.CASH, color: '#10B981' },
        { mode: 'UPI / Online', count: modeCounts.UPI, amount: modeAmounts.UPI, color: '#3B82F6' },
        { mode: 'Card', count: modeCounts.CARD, amount: modeAmounts.CARD, color: '#8B5CF6' },
        { mode: 'Store Credit', count: modeCounts.CREDIT, amount: modeAmounts.CREDIT, color: '#F59E0B' },
      ],
      categoryBreakdown,
      topProducts: topProductsList,
      lowStockProducts: lowStockList.slice(0, 5),
      recentInvoices: filteredInvoices.slice(0, 5),
      trendData,
    };
  }, [serverStats, rawInvoices, rawProducts, rawCustomers, timeRange]);

  const exportReport = () => {
    const reportText = `BUILDPRO HARDWARE POS - REAL BUSINESS ANALYTICS REPORT
Generated: ${new Date().toLocaleString()}
Time Range Filter: ${timeRangeOptions.find((t) => t._id === timeRange)?.name}

=== KEY PERFORMANCE INDICATORS ===
Total Sales Revenue: ₹${dashboardStats.kpi.totalRevenue.toLocaleString()}
Total Invoices / Orders: ${dashboardStats.kpi.totalInvoices}
Average Order Value: ₹${dashboardStats.kpi.averageOrderValue.toLocaleString()}
Net GST Tax Output: ₹${dashboardStats.kpi.totalTax.toLocaleString()}

=== INVENTORY & CATALOG ===
Total Products Count: ${dashboardStats.kpi.totalProductsCount}
Total Units in Stock: ${dashboardStats.kpi.totalStockUnits}
Total Stock Valuation: ₹${dashboardStats.kpi.totalStockValuation.toLocaleString()}
Low Stock Warning Items: ${dashboardStats.kpi.lowStockCount}

=== PAYMENT MODES ===
${dashboardStats.paymentModeBreakdown.map((m) => `${m.mode}: ${m.count} orders (₹${m.amount.toLocaleString()})`).join('\n')}

=== TOP SELLING PRODUCTS ===
${dashboardStats.topProducts.length > 0 ? dashboardStats.topProducts.map((p, i) => `${i + 1}. ${p.name} - ${p.qty} sold (₹${p.revenue.toLocaleString()})`).join('\n') : 'No sales recorded for this period.'}
`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `BuildPro_Real_Analytics_${timeRange}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Real analytics report downloaded successfully!');
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex-1 min-w-0">
          
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 tracking-tight">Executive Sales & Store Dashboard</h1>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">
            Real-time business performance, interactive revenue graphs, inventory health, and payment breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
          {/* Custom Dropdown Filter */}
          <div className="w-40 sm:w-44 shrink-0">
            <CustomDropdown
              options={timeRangeOptions}
              value={timeRange}
              onChange={(val) => setTimeRange(val)}
              compact
              height="44px"
              placeholder="Time Period"
            />
          </div>

          <button
            onClick={exportReport}
            className="h-11 px-3.5 sm:px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-xs shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4 text-blue-600" />
            <span>Export Report</span>
          </button>

          <Link
            href="/"
            className="h-11 px-4 sm:px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 shrink-0 whitespace-nowrap"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>POS Console</span>
          </Link>
        </div>
      </div>

      {/* KPI Metric Summary Cards (Card Form Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Sales Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-xs">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-slate-900">
              ₹{dashboardStats.kpi.totalRevenue.toLocaleString()}
            </h2>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-slate-400 font-medium">Selected Date Range</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full w-[85%]" />
          </div>
        </div>

        {/* Card 2: Invoices & AOV */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Orders Count</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-slate-900">{dashboardStats.kpi.totalInvoices} Invoices</h2>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-slate-600 font-semibold">
                Avg Order: <strong className="text-slate-900">₹{dashboardStats.kpi.averageOrderValue.toLocaleString()}</strong>
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full w-[70%]" />
          </div>
        </div>

        {/* Card 3: Inventory Valuation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory Assets</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-xs">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-slate-900">
              ₹{dashboardStats.kpi.totalStockValuation.toLocaleString()}
            </h2>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-slate-500 font-medium">
                {dashboardStats.kpi.totalStockUnits} units ({dashboardStats.kpi.totalProductsCount} SKUs)
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full w-[90%]" />
          </div>
        </div>

        {/* Card 4: Low Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Alerts</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-slate-900">
              {dashboardStats.kpi.lowStockCount} Items Low
            </h2>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-0.5 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                Reorder Required
              </span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-rose-500 h-full rounded-full w-[35%]" />
          </div>
        </div>

        {/* Card 5: GST Tax Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">GST Tax Output</span>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h2 className="text-2xl font-black text-slate-900">
              ₹{dashboardStats.kpi.totalTax.toLocaleString()}
            </h2>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-xs text-slate-500 font-medium">Recorded Tax Output</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full w-[75%]" />
          </div>
        </div>
      </div>

      {/* Main Interactive Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graph 1: Revenue & Orders Timeline Area Chart (Spans 2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-amber-600" /> Sales & Revenue Growth Trend
                </h3>
                <p className="text-xs font-medium text-slate-500">
                  Real revenue timeline generated from database invoices
                </p>
              </div>

              {/* Chart Mode Toggle */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setChartView('revenue')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    chartView === 'revenue' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Revenue (₹)
                </button>
                <button
                  onClick={() => setChartView('orders')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    chartView === 'orders' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Orders Count
                </button>
                <button
                  onClick={() => setChartView('both')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    chartView === 'both' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Combined
                </button>
              </div>
            </div>

            {/* Recharts Area Chart Container */}
            <div className="h-72 w-full mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dashboardStats.trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D97706" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      borderColor: '#334155',
                      borderRadius: '12px',
                      color: '#FFF',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                    }}
                    formatter={(val: any) => [`₹${val?.toLocaleString()}`, 'Value']}
                  />
                  <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '13px', fontWeight: 600 }} />
                  {(chartView === 'revenue' || chartView === 'both') && (
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue (₹)"
                      stroke="#D97706"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  )}
                  {(chartView === 'orders' || chartView === 'both') && (
                    <Area
                      type="monotone"
                      dataKey="orders"
                      name="Orders Count"
                      stroke="#3B82F6"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorOrders)"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Filter Period: <strong>{timeRangeOptions.find((t) => t._id === timeRange)?.name}</strong></span>
            <span>Total Invoices: <strong>{dashboardStats.kpi.totalInvoices}</strong></span>
          </div>
        </div>

        {/* Graph 2: Payment Method Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 pb-1">
              <PieIcon className="w-5 h-5 text-indigo-600" /> Payment Methods Share
            </h3>
            <p className="text-xs font-medium text-slate-500">Distribution across Cash, UPI, Card, and Store Credit</p>

            <div className="h-60 w-full mt-4 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dashboardStats.paymentModeBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="amount"
                  >
                    {dashboardStats.paymentModeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      borderRadius: '12px',
                      color: '#FFF',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}
                    formatter={(val: any) => [`₹${val?.toLocaleString()}`, 'Amount']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xs font-semibold text-slate-400">Filtered Total</span>
                <span className="text-base font-black text-slate-900">
                  ₹{dashboardStats.kpi.totalRevenue.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Mode Legend Table */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            {dashboardStats.paymentModeBreakdown.map((mode) => (
              <div key={mode.mode} className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: mode.color }} />
                  <span className="text-slate-700">{mode.mode}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">{mode.count} txns</span>
                  <span className="text-slate-900 font-bold">₹{mode.amount.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Revenue Bar Chart & Top Products Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Revenue Distribution Bar Chart (Spans 2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" /> Category Revenue Breakdown
              </h3>
              <p className="text-xs font-medium text-slate-500">
                Revenue generated per product category from actual sales
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              {dashboardStats.categoryBreakdown.length} Categories
            </span>
          </div>

          <div className="h-64 w-full mt-6">
            {dashboardStats.categoryBreakdown.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-medium">
                No category sales recorded for the selected date range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboardStats.categoryBreakdown} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1E293B',
                      borderRadius: '12px',
                      color: '#FFF',
                      fontSize: '13px',
                      fontWeight: 'bold',
                    }}
                    formatter={(val: any) => [`₹${val?.toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]} barSize={40}>
                    {dashboardStats.categoryBreakdown.map((_, index) => (
                      <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top 5 Best Selling Products Leaderboard Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" /> Top Selling Hardware
              </h3>
              <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full">
                Real Rankings
              </span>
            </div>

            <div className="space-y-4 mt-4">
              {dashboardStats.topProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 font-medium">
                  No sales recorded for the selected period.
                </div>
              ) : (
                dashboardStats.topProducts.map((prod, idx) => {
                  const maxRev = dashboardStats.topProducts[0]?.revenue || 1;
                  const pct = Math.round((prod.revenue / maxRev) * 100);
                  return (
                    <div key={prod.id || idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 truncate" title={prod.name}>
                            {prod.name}
                          </span>
                        </div>
                        <span className="font-black text-slate-900 shrink-0 ml-2">₹{prod.revenue.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Category: {prod.category}</span>
                        <span className="font-semibold text-slate-600">{prod.qty} sold</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-600 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <Link
            href="/products"
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center justify-center gap-1"
          >
            <span>View Full Product Inventory</span>
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Data Cards Grid: Low Stock Alert Feed + Recent Invoices Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card Form: Low Stock Warning Feed */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" /> Low Stock Alerts
            </h3>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full">
              Real-time Stock
            </span>
          </div>

          <div className="space-y-3.5 mt-4">
            {dashboardStats.lowStockProducts.length === 0 ? (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>All product stock levels are healthy!</span>
              </div>
            ) : (
              dashboardStats.lowStockProducts.map((p) => (
                <div key={p._id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-xs text-slate-800 line-clamp-1">{p.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        {p.stock} {p.unit} remaining
                      </span>
                      <span className="text-[11px] text-slate-400">Unit Price: ₹{p.price}</span>
                    </div>
                  </div>
                  <Link
                    href="/inventory"
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-xs shrink-0 transition-colors"
                  >
                    Restock
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card Form: Recent Transactions Feed (Spans 2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" /> Recent Invoice Activity
              </h3>
              <p className="text-xs font-medium text-slate-500">Filtered for: {timeRangeOptions.find((t) => t._id === timeRange)?.name}</p>
            </div>
            <Link
              href="/invoices"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View All Invoices</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="overflow-x-auto mt-4">
            {dashboardStats.recentInvoices.length === 0 ? (
              <div className="py-12 text-center text-xs font-semibold text-slate-400">
                No invoices recorded for the selected time range.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[11px] font-extrabold uppercase text-slate-400 tracking-wider">
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Payment</th>
                    <th className="py-2.5 px-3 text-right">Grand Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                  {dashboardStats.recentInvoices.map((inv, idx) => (
                    <tr key={inv._id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {inv.invoiceNumber || `INV-${String(idx + 1).padStart(5, '0')}`}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{inv.customerName || 'Walk-in Customer'}</div>
                        <div className="text-[11px] text-slate-400">{inv.customerPhone || 'Direct POS'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-black uppercase ${
                            inv.paymentMode === 'CASH'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.paymentMode === 'UPI'
                              ? 'bg-blue-100 text-blue-800'
                              : inv.paymentMode === 'CARD'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {inv.paymentMode || 'CASH'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 text-sm">
                        ₹{(inv.grandTotal || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
