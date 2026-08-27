'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Package, Edit, History, ArrowDownRight, ArrowUpRight, Boxes } from 'lucide-react';
import { api, Product } from '@/lib/api';
import { FormModal } from '@/components/shared/FormModal';

interface StockLog {
  _id: string;
  productId: string;
  productName: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  createdAt: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  
  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    costPrice: 0,
    stock: 10,
    category: 'General',
    taxRate: 18,
    unit: 'pcs',
    imageUrl: '',
    sku: '',
    barcode: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Stock History Modal State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedProductLogs, setSelectedProductLogs] = useState<StockLog[]>([]);
  const [selectedProductName, setSelectedProductName] = useState<string>('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch {
      setProducts([]);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      price: 0,
      costPrice: 0,
      stock: 10,
      category: 'General',
      taxRate: 18,
      unit: 'pcs',
      imageUrl: '',
      sku: '',
      barcode: '',
    });
    setImageFile(null);
    setIsProductModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      costPrice: (product as any).costPrice || 0,
      stock: product.stock,
      category: product.category || 'General',
      taxRate: product.taxRate || 0,
      unit: product.unit || 'pcs',
      imageUrl: product.imageUrl || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
    });
    setImageFile(null);
    setIsProductModalOpen(true);
  };

  const openHistoryModal = async (product: Product) => {
    setSelectedProductName(product.name);
    try {
      const res = await api.get('/products/stock-logs');
      const filteredLogs = res.data.filter((log: StockLog) => log.productId === product._id);
      setSelectedProductLogs(filteredLogs);
    } catch {
      setSelectedProductLogs([]);
    }
    setIsHistoryModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalImageUrl = formData.imageUrl;

    if (imageFile) {
      const uploadData = new FormData();
      uploadData.append('file', imageFile);
      try {
        const uploadRes = await api.post('/products/upload-image', uploadData);
        finalImageUrl = uploadRes.data.imageUrl;
      } catch (err) {
        console.error('Image upload failed', err);
      }
    }

    try {
      if (editingProduct) {
        // If stock changed during edit, log stock adjustment automatically
        const stockDiff = formData.stock - editingProduct.stock;
        await api.put(`/products/${editingProduct._id}`, { ...formData, imageUrl: finalImageUrl });
        
        if (stockDiff !== 0) {
          await api.post(`/products/${editingProduct._id}/adjust-stock`, {
            type: stockDiff > 0 ? 'IN' : 'OUT',
            quantity: Math.abs(stockDiff),
            reason: `Manual Stock Edit in Product Manager`,
          });
        }
      } else {
        await api.post('/products', { ...formData, imageUrl: finalImageUrl });
      }

      fetchProducts();
      setIsProductModalOpen(false);
    } catch (err) {
      console.error('Product save failed', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Products Catalog</h2>
          <p className="text-slate-500 text-sm font-medium">Manage product details, edit stock levels, and view audit history</p>
        </div>
        <button
          onClick={openCreateModal}
          className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase">
              <th className="p-4">Product</th>
              <th className="p-4">Price</th>
              <th className="p-4">Tax Rate</th>
              <th className="p-4">Stock</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
            {products.map((prod) => (
              <tr key={prod._id} className="hover:bg-slate-50/80">
                <td className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                    {prod.imageUrl ? (
                      <img src={`http://localhost:5000${prod.imageUrl}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">{prod.name}</span>
                    <span className="text-xs text-slate-400 font-normal">{prod.category || 'General'}</span>
                  </div>
                </td>
                <td className="p-4 font-bold text-slate-900">₹{prod.price}</td>
                <td className="p-4">{prod.taxRate}%</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    prod.stock <= 5 ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {prod.stock} {prod.unit}
                  </span>
                </td>
                <td className="p-4 text-right flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => openHistoryModal(prod)}
                    className="inline-flex items-center justify-center w-8 h-8 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                    title="View Stock History"
                  >
                    <History className="w-4 h-4 text-blue-600" />
                  </button>
                  <button
                    onClick={() => openEditModal(prod)}
                    className="inline-flex items-center justify-center w-8 h-8 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                    title="Edit Product & Stock"
                  >
                    <Edit className="w-4 h-4 text-slate-700" />
                  </button>
                  <button
                    onClick={async () => {
                      await api.delete(`/products/${prod._id}`);
                      fetchProducts();
                    }}
                    className="inline-flex items-center justify-center w-8 h-8 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                    title="Delete Product"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Product Modal */}
      <FormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product'}
        onSubmit={handleSaveProduct}
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Product Name</label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Selling Price (₹)</label>
            <input
              type="number"
              required
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Stock Inventory Qty</label>
            <input
              type="number"
              required
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500 bg-blue-50/50"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tax Rate (%)</label>
            <input
              type="number"
              value={formData.taxRate}
              onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Unit (e.g. pcs, kg)</label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Product Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>
      </FormModal>

      {/* Stock History Audit Modal */}
      {isHistoryModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={() => setIsHistoryModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                <History className="w-5 h-5 text-blue-600" /> Stock History: {selectedProductName}
              </h3>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors font-bold text-base"
              >
                ✕
              </button>
            </div>
            <div className="p-6 max-h-[380px] overflow-y-auto space-y-3">
              {selectedProductLogs.length === 0 ? (
                <p className="text-center py-8 text-slate-400 font-medium text-sm">
                  No stock logs found for this product yet.
                </p>
              ) : (
                selectedProductLogs.map((log) => (
                  <div key={log._id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        {log.type === 'IN' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                            <ArrowDownRight className="w-3.5 h-3.5" /> +{log.quantity} Stock In
                          </span>
                        )}
                        {log.type === 'OUT' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                            <ArrowUpRight className="w-3.5 h-3.5" /> -{log.quantity} Stock Out
                          </span>
                        )}
                        {log.type === 'ADJUSTMENT' && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                            Set to {log.quantity}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 block mt-1">{log.reason || 'Movement'}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      {new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
