'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Boxes, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw, Plus, Download, History, Search } from 'lucide-react';
import { api, Product } from '@/lib/api';
import { FormModal } from '@/components/shared/FormModal';
import { TableFilter } from '@/components/shared/TableFilter';
import { Pagination } from '@/components/shared/Pagination';
import { CustomDropdown } from '@/components/shared/CustomDropdown';
import { useToast } from '@/context/ToastContext';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { exportToCSV } from '@/lib/exportUtils';

interface StockLog {
  _id: string;
  productId: string;
  productName: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  createdAt: string;
}

function InventoryContent() {
  const searchParams = useSearchParams();
  const filterParam = searchParams ? searchParams.get('filter') : null;
  const adjustParam = searchParams ? searchParams.get('adjustProduct') || searchParams.get('adjust') : null;

  const { toast } = useToast();
  const { settings } = useStoreSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('view_mode_inventory');
        if (saved === 'table' || saved === 'grid') return saved;
      } catch {
        // Ignore
      }
    }
    return 'table';
  });

  const handleViewModeChange = (mode: 'table' | 'grid') => {
    setViewMode(mode);
    try {
      localStorage.setItem('view_mode_inventory', mode);
    } catch {
      // Ignore
    }
  };

  // Adjustment Modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT' | 'ADJUSTMENT'>('IN');
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('Restock / Purchase');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  useEffect(() => {
    if (filterParam === 'low_stock') {
      setOnlyLowStock(true);
    }
  }, [filterParam]);

  useEffect(() => {
    if (adjustParam && products.length > 0) {
      const prod = products.find((p) => p._id === adjustParam);
      if (prod) {
        setSelectedProduct(prod);
        setIsAdjustModalOpen(true);
      }
    }
  }, [adjustParam, products]);

  useEffect(() => {
    fetchInventoryData();
  }, [settings.defaultLowStockThreshold]);

  const fetchInventoryData = async () => {
    try {
      const [prodRes, lowRes, logsRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/low-stock'),
        api.get('/products/stock-logs'),
      ]);
      const allProducts: Product[] = prodRes.data || [];
      setProducts(allProducts);

      const defaultThreshold = settings.defaultLowStockThreshold ?? 10;
      const lowStockList = allProducts.filter((p) => {
        const threshold = p.minStockAlert && p.minStockAlert > 0 ? p.minStockAlert : defaultThreshold;
        return p.stock <= threshold;
      });
      setLowStockProducts(lowStockList);
      setStockLogs(logsRes.data || []);
    } catch (err) {
      console.error('Inventory fetch error', err);
    }
  };

  const handleExportInventoryStock = () => {
    if (filteredProducts.length === 0) {
      toast.error('No inventory products to export.');
      return;
    }
    const defaultThreshold = settings.defaultLowStockThreshold ?? 10;
    const fields = [
      { key: 'name', label: 'Product Name' },
      { key: 'sku', label: 'SKU' },
      { key: 'category', label: 'Category' },
      { key: 'stock', label: 'Stock On Hand' },
      { key: 'unit', label: 'Unit' },
      { key: 'price', label: 'Selling Price (₹)' },
      {
        key: 'stockStatus',
        label: 'Stock Status',
        transform: (_: any, p: Product) => {
          const threshold = p.minStockAlert && p.minStockAlert > 0 ? p.minStockAlert : defaultThreshold;
          return p.stock <= threshold ? `Low Stock Warning (<= ${threshold})` : 'In Stock';
        },
      },
    ];
    const dateStr = new Date().toISOString().slice(0, 10);
    const success = exportToCSV(`inventory_stock_${dateStr}`, filteredProducts, fields);
    if (success) {
      toast.success(`Exported ${filteredProducts.length} inventory item(s) to CSV!`);
    }
  };

  const handleExportStockLogs = () => {
    if (stockLogs.length === 0) {
      toast.error('No stock movement logs to export.');
      return;
    }
    const fields = [
      { key: 'createdAt', label: 'Timestamp', transform: (val: string) => new Date(val).toLocaleString() },
      { key: 'productName', label: 'Product Name' },
      { key: 'type', label: 'Movement Type' },
      { key: 'quantity', label: 'Quantity' },
      { key: 'reason', label: 'Reason / Reference' },
    ];
    const dateStr = new Date().toISOString().slice(0, 10);
    const success = exportToCSV(`stock_movement_logs_${dateStr}`, stockLogs, fields);
    if (success) {
      toast.success(`Exported ${stockLogs.length} stock log(s) to CSV!`);
    }
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    try {
      await api.post(`/products/${selectedProduct._id}/adjust-stock`, {
        type: adjustType,
        quantity: adjustQty,
        reason: adjustReason,
      });
      toast.success(`Stock for '${selectedProduct.name}' adjusted successfully!`);
      setIsAdjustModalOpen(false);
      setSelectedProduct(null);
      setAdjustQty(0);
      fetchInventoryData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Stock adjustment failed';
      toast.error(msg);
    }
  };

  const [activeTab, setActiveTab] = useState<'directory' | 'logs'>('directory');
  const [logsCurrentPage, setLogsCurrentPage] = useState(1);
  const [logsItemsPerPage, setLogsItemsPerPage] = useState(10);
  const [logsSearchQuery, setLogsSearchQuery] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, onlyLowStock]);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (onlyLowStock) {
      const threshold = p.minStockAlert && p.minStockAlert > 0 ? p.minStockAlert : (settings.defaultLowStockThreshold ?? 10);
      return p.stock <= threshold;
    }

    return true;
  });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;

  const filteredLogs = stockLogs.filter(
    (log) =>
      log.productName.toLowerCase().includes(logsSearchQuery.toLowerCase()) ||
      (log.reason && log.reason.toLowerCase().includes(logsSearchQuery.toLowerCase())) ||
      log.type.toLowerCase().includes(logsSearchQuery.toLowerCase())
  );

  const paginatedLogs = filteredLogs.slice(
    (logsCurrentPage - 1) * logsItemsPerPage,
    logsCurrentPage * logsItemsPerPage
  );
  const logsTotalPages = Math.ceil(filteredLogs.length / logsItemsPerPage) || 1;

  const productOptions = [
    { _id: '', name: 'All Products in Catalog' },
    ...products.map((p) => ({ _id: p.name, name: p.name })),
  ];

  const handleViewProductLogs = (productName: string) => {
    setLogsSearchQuery(productName);
    setLogsCurrentPage(1);
    setActiveTab('logs');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Boxes className="w-7 h-7 text-amber-600" /> Inventory & Stock Management
          </h2>
          <p className="text-slate-500 text-sm font-medium">
            Monitor real-time stock levels, low stock alerts, and audit logs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchInventoryData()}
            className="h-10 px-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Refresh Inventory"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
          <button
            onClick={handleExportInventoryStock}
            className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Export Stock CSV"
          >
            <Download className="w-4 h-4 text-amber-600" /> Export Stock
          </button>
        </div>
      </div>
      
      {/* Page View Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={`h-11 px-5 rounded-2xl font-extrabold text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'directory'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Boxes className="w-4 h-4" /> Product Stock Directory ({products.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`h-11 px-5 rounded-2xl font-extrabold text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'logs'
              ? 'bg-amber-600 text-white shadow-md'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" /> Recent Stock Movement Logs ({stockLogs.length})
        </button>
      </div>

      {activeTab === 'directory' ? (
        <>
          {onlyLowStock && (
            <div className="flex items-center justify-between bg-rose-50 border border-rose-200 p-4 rounded-2xl animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                <span className="bg-rose-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">Dashboard Filter</span>
                <span>Showing <strong>Low Stock Alert Items Only</strong> ({filteredProducts.length} item(s) found)</span>
              </div>
              <button
                type="button"
                onClick={() => setOnlyLowStock(false)}
                className="text-xs font-extrabold text-rose-700 hover:text-slate-900 underline cursor-pointer"
              >
                Show All Inventory Items
              </button>
            </div>
          )}

          {/* Summary Alert Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-400 uppercase">Total Items Tracked</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{products.length} Products</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-bold text-amber-700 uppercase flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Low Stock Alerts
              </div>
              <div className="text-2xl font-black text-amber-900 mt-1">{lowStockProducts.length} Items Low</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="text-xs font-bold text-slate-400 uppercase">Total Unit Inventory</div>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {products.reduce((acc, p) => acc + (p.stock || 0), 0)} Units
              </div>
            </div>
          </div>

          {/* Low Stock Alert Table */}
          {lowStockProducts.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-amber-900 text-base flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" /> Critical Low Stock Items
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {lowStockProducts.map((item) => (
                  <div key={item._id} className="bg-white border border-amber-200 rounded-xl p-3 flex items-center justify-between shadow-sm">
                    <div>
                      <h5 className="font-bold text-slate-800 text-sm">{item.name}</h5>
                      <span className="text-xs text-amber-700 font-bold">
                        Stock: {item.stock} {item.unit} (Alert at ≤5)
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedProduct(item);
                        setAdjustType('IN');
                        setAdjustReason('Restock');
                        setIsAdjustModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-all cursor-pointer"
                    >
                      Restock
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <TableFilter
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={handleViewModeChange}
            onExport={handleExportInventoryStock}
            exportLabel="Export Stock"
            placeholder="Filter stock inventory by product name or SKU..."
          />

          {/* Main Stock Table vs Card Grid */}
          {viewMode === 'table' ? (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-lg">Product Stock Directory</h3>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase">
                    <th className="p-4">Product</th>
                    <th className="p-4">SKU / Barcode</th>
                    <th className="p-4">Current Stock</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Adjust Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                  {paginatedProducts.map((prod) => (
                    <tr key={prod._id} className="hover:bg-slate-50/80">
                      <td className="p-4 font-bold text-slate-900">{prod.name}</td>
                      <td className="p-4 font-mono text-xs text-slate-500">{prod.sku || prod.barcode || 'N/A'}</td>
                      <td className="p-4 font-extrabold text-slate-900">{prod.stock} {prod.unit}</td>
                      <td className="p-4">
                        {(() => {
                          const threshold = prod.minStockAlert && prod.minStockAlert > 0 ? prod.minStockAlert : (settings.defaultLowStockThreshold ?? 10);
                          const isLow = prod.stock <= threshold;
                          return isLow ? (
                            <span className="px-2.5 py-1 bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg inline-flex items-center gap-1" title={`Low Stock Warning (Threshold: ${threshold})`}>
                              Low Stock Alert <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">
                              In Stock
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleViewProductLogs(prod.name)}
                            className="inline-flex items-center justify-center w-8 h-8 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                            title={`View stock movement audit logs for ${prod.name}`}
                          >
                            <History className="w-4 h-4 text-amber-600" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProduct(prod);
                              setIsAdjustModalOpen(true);
                            }}
                            className="h-8 px-3 border border-slate-200 rounded-lg text-xs font-bold text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                          >
                            + / - Adjust
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Inventory Card Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedProducts.map((prod) => {
                const threshold = prod.minStockAlert && prod.minStockAlert > 0 ? prod.minStockAlert : (settings.defaultLowStockThreshold ?? 10);
                const isLow = prod.stock <= threshold;

                return (
                  <div key={prod._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-400 font-mono">SKU: {prod.sku || 'N/A'}</span>
                        {isLow ? (
                          <span className="px-2.5 py-1 bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg inline-flex items-center gap-1" title={`Low Stock Warning (Threshold: ${threshold})`}>
                            Low Stock Alert <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg">In Stock</span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-slate-900 text-base">{prod.name}</h3>
                      <span className="text-xs text-slate-500 font-medium block mt-1">Category: {prod.category || 'General'}</span>

                      <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-500 font-bold uppercase">Stock On Hand</span>
                        <span className="text-lg font-black text-slate-900">{prod.stock} {prod.unit}</span>
                      </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProduct(prod);
                          setIsAdjustModalOpen(true);
                        }}
                        className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
                      >
                        + / - Adjust
                      </button>
                      <button
                        type="button"
                        onClick={() => handleViewProductLogs(prod.name)}
                        className="py-2 px-3 border border-slate-200 rounded-xl font-bold text-xs text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-center gap-1 cursor-pointer"
                        title={`View movement logs for ${prod.name}`}
                      >
                        <History className="w-3.5 h-3.5 text-amber-600" /> Logs
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Directory Pagination Bar */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={(page) => setCurrentPage(page)}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={(items) => {
              setItemsPerPage(items);
              setCurrentPage(1);
            }}
            totalItems={filteredProducts.length}
          />
        </>
      ) : (
        /* Tab 2: Dedicated Recent Stock Movement Logs Page View */
        <div className="space-y-4">
          {logsSearchQuery && (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3.5 rounded-2xl animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <span className="bg-amber-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase">Product Audit Filter</span>
                <span>Filtered movement logs for: <strong>"{logsSearchQuery}"</strong> ({filteredLogs.length} record(s) found)</span>
              </div>
              <button
                type="button"
                onClick={() => setLogsSearchQuery('')}
                className="text-xs font-extrabold text-amber-700 hover:text-slate-900 underline cursor-pointer"
              >
                Clear Filter (Show All Logs)
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={logsSearchQuery}
                onChange={(e) => {
                  setLogsSearchQuery(e.target.value);
                  setLogsCurrentPage(1);
                }}
                placeholder="Search audit logs by product name, reason, or movement type..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="w-64">
              <CustomDropdown
                options={productOptions}
                value={logsSearchQuery}
                onChange={(val) => {
                  setLogsSearchQuery(val);
                  setLogsCurrentPage(1);
                }}
                placeholder="Filter by Product..."
              />
            </div>

            <button
              onClick={handleExportStockLogs}
              className="h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-all flex items-center gap-2 cursor-pointer"
              title="Export Stock Logs CSV"
            >
              <Download className="w-4 h-4 text-amber-600" /> Export Logs CSV
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase">
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Product Name</th>
                  <th className="p-4">Movement Type</th>
                  <th className="p-4">Quantity</th>
                  <th className="p-4">Reason / Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                      No stock movement logs found matching search.
                    </td>
                  </tr>
                ) : (
                  paginatedLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50/80">
                      <td className="p-4 text-xs font-medium text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-slate-900">{log.productName}</td>
                      <td className="p-4">
                        {log.type === 'IN' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                            <ArrowDownRight className="w-3.5 h-3.5" /> Stock In
                          </span>
                        )}
                        {log.type === 'OUT' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-1 rounded-lg">
                            <ArrowUpRight className="w-3.5 h-3.5" /> Stock Out
                          </span>
                        )}
                        {log.type === 'ADJUSTMENT' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg">
                            Set Fixed
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-extrabold text-slate-900">{log.quantity}</td>
                      <td className="p-4 text-xs font-medium text-slate-600">{log.reason || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Audit Logs Pagination Bar */}
          <Pagination
            currentPage={logsCurrentPage}
            totalPages={logsTotalPages}
            onPageChange={(page) => setLogsCurrentPage(page)}
            itemsPerPage={logsItemsPerPage}
            onItemsPerPageChange={(items) => {
              setLogsItemsPerPage(items);
              setLogsCurrentPage(1);
            }}
            totalItems={filteredLogs.length}
          />
        </div>
      )}

      {/* Adjust Stock FormModal */}
      <FormModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title={`Adjust Stock Level`}
        description={selectedProduct ? `Update inventory units for "${selectedProduct.name}"` : 'Adjust stock levels and log inventory changes'}
        icon={<Boxes className="w-5 h-5 text-amber-700" />}
        onSubmit={handleStockAdjustment}
        submitLabel="Save Adjustment"
        variant="amber"
        maxWidth="md"
      >
        <div>
          <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
            Adjustment Type
          </label>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setAdjustType('IN')}
              className={`flex-1 h-11 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                adjustType === 'IN'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ArrowDownRight className="w-4 h-4" /> + Stock In (Add)
            </button>
            <button
              type="button"
              onClick={() => setAdjustType('OUT')}
              className={`flex-1 h-11 rounded-xl text-xs font-extrabold border transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs ${
                adjustType === 'OUT'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-rose-600/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" /> - Stock Out (Remove)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
            Quantity (Units)
          </label>
          <input
            type="number"
            required
            min="1"
            value={adjustQty}
            onChange={(e) => setAdjustQty(Number(e.target.value))}
            placeholder="e.g. 10"
            className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
            Reason / Audit Notes
          </label>
          <input
            type="text"
            required
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder="e.g. New Supplier Shipment / Damaged Stock"
            className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
          />
        </div>
      </FormModal>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-bold">Loading inventory manager...</div>}>
      <InventoryContent />
    </Suspense>
  );
}
