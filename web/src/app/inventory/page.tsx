'use client';

import React, { useState, useEffect } from 'react';
import { Boxes, AlertTriangle, ArrowUpRight, ArrowDownRight, RefreshCw, Plus, Download } from 'lucide-react';
import { api, Product } from '@/lib/api';
import { FormModal } from '@/components/shared/FormModal';
import { TableFilter } from '@/components/shared/TableFilter';
import { useToast } from '@/context/ToastContext';
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

export default function InventoryPage() {
  const { toast } = useToast();
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

  useEffect(() => {
    fetchInventoryData();
  }, []);

  const fetchInventoryData = async () => {
    try {
      const [prodRes, lowRes, logsRes] = await Promise.all([
        api.get('/products'),
        api.get('/products/low-stock'),
        api.get('/products/stock-logs'),
      ]);
      setProducts(prodRes.data || []);
      setLowStockProducts(lowRes.data || []);
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
    const fields = [
      { key: 'name', label: 'Product Name' },
      { key: 'sku', label: 'SKU' },
      { key: 'category', label: 'Category' },
      { key: 'stock', label: 'Stock On Hand' },
      { key: 'unit', label: 'Unit' },
      { key: 'price', label: 'Selling Price (₹)' },
      { key: 'stockStatus', label: 'Stock Status', transform: (_: any, p: Product) => (p.stock <= 5 ? 'Low Stock Alert' : 'In Stock') },
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

  const filteredProducts = products.filter(
    (p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
            onClick={handleExportInventoryStock}
            className="h-10 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Export Stock CSV"
          >
            <Download className="w-4 h-4 text-amber-600" /> Export Stock
          </button>
         
        </div>
      </div>

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

      {/* Search & View Mode Switcher */}
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
              {filteredProducts.map((prod) => (
                <tr key={prod._id} className="hover:bg-slate-50/80">
                  <td className="p-4 font-bold text-slate-900">{prod.name}</td>
                  <td className="p-4 font-mono text-xs text-slate-500">{prod.sku || prod.barcode || 'N/A'}</td>
                  <td className="p-4 font-extrabold text-slate-900">{prod.stock} {prod.unit}</td>
                  <td className="p-4">
                    {prod.stock <= 5 ? (
                      <span className="px-2.5 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg">Low Stock</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">In Stock</span>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedProduct(prod);
                        setIsAdjustModalOpen(true);
                      }}
                      className="h-8 px-3 border border-slate-200 rounded-lg text-xs font-bold text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                    >
                      + / - Adjust
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Inventory Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((prod) => (
            <div key={prod._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-400 font-mono">SKU: {prod.sku || 'N/A'}</span>
                  {prod.stock <= 5 ? (
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-700 text-xs font-bold rounded-lg">Low Stock</span>
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

              <div className="pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedProduct(prod);
                    setIsAdjustModalOpen(true);
                  }}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  + / - Adjust Stock Quantity
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-lg">Recent Stock Movement Logs</h3>
          <button
            onClick={handleExportStockLogs}
            className="h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            title="Export Stock Logs CSV"
          >
            <Download className="w-3.5 h-3.5 text-amber-600" /> Export Logs CSV
          </button>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase">
              <th className="p-4">Timestamp</th>
              <th className="p-4">Product</th>
              <th className="p-4">Movement</th>
              <th className="p-4">Qty</th>
              <th className="p-4">Reason / Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
            {stockLogs.map((log) => (
              <tr key={log._id} className="hover:bg-slate-50/80">
                <td className="p-4 text-xs font-medium text-slate-500">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="p-4 font-bold text-slate-900">{log.productName}</td>
                <td className="p-4">
                  {log.type === 'IN' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      <ArrowDownRight className="w-3.5 h-3.5" /> Stock In
                    </span>
                  )}
                  {log.type === 'OUT' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                      <ArrowUpRight className="w-3.5 h-3.5" /> Stock Out
                    </span>
                  )}
                  {log.type === 'ADJUSTMENT' && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                      Set Fixed
                    </span>
                  )}
                </td>
                <td className="p-4 font-extrabold text-slate-900">{log.quantity}</td>
                <td className="p-4 text-xs font-medium text-slate-600">{log.reason || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Adjust Stock FormModal */}
      <FormModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        title={`Adjust Stock - ${selectedProduct?.name}`}
        onSubmit={handleStockAdjustment}
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Adjustment Type</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAdjustType('IN')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                adjustType === 'IN' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              + Stock In (Add)
            </button>
            <button
              type="button"
              onClick={() => setAdjustType('OUT')}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                adjustType === 'OUT' ? 'bg-rose-600 text-white border-rose-600' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              - Stock Out (Remove)
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
          <input
            type="number"
            required
            min="1"
            value={adjustQty}
            onChange={(e) => setAdjustQty(Number(e.target.value))}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Reason / Notes</label>
          <input
            type="text"
            required
            value={adjustReason}
            onChange={(e) => setAdjustReason(e.target.value)}
            placeholder="e.g. Supplier Shipment / Damaged Stock"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
          />
        </div>
      </FormModal>
    </div>
  );
}
