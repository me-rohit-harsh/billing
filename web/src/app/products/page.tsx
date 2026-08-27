'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { api, Product } from '@/lib/api';
import { FormModal } from '@/components/shared/FormModal';

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: 0,
    stock: 10,
    category: 'General',
    taxRate: 18,
    unit: 'pcs',
    imageUrl: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch {
      setProducts([
        { _id: '1', name: 'Sample Item A', price: 100, taxRate: 18, stock: 50, unit: 'pcs', category: 'General' },
        { _id: '2', name: 'Sample Item B', price: 250, taxRate: 12, stock: 20, unit: 'pcs', category: 'Electronics' },
      ]);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalImageUrl = newProduct.imageUrl;

    if (imageFile) {
      const formData = new FormData();
      formData.append('file', imageFile);
      try {
        const uploadRes = await api.post('/products/upload-image', formData);
        finalImageUrl = uploadRes.data.imageUrl;
      } catch (err) {
        console.error('Image upload failed', err);
      }
    }

    try {
      await api.post('/products', { ...newProduct, imageUrl: finalImageUrl });
      fetchProducts();
      setIsProductModalOpen(false);
      setNewProduct({ name: '', price: 0, stock: 10, category: 'General', taxRate: 18, unit: 'pcs', imageUrl: '' });
      setImageFile(null);
    } catch (err) {
      console.error('Product save failed', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Products Catalog</h2>
          <p className="text-slate-500 text-sm font-medium">Manage product inventory, pricing, and tax rates</p>
        </div>
        <button
          onClick={() => setIsProductModalOpen(true)}
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
                  <span className="font-bold text-slate-900">{prod.name}</span>
                </td>
                <td className="p-4">₹{prod.price}</td>
                <td className="p-4">{prod.taxRate}%</td>
                <td className="p-4">{prod.stock} {prod.unit}</td>
                <td className="p-4 text-right">
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

      <FormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="Add New Product"
        onSubmit={handleCreateProduct}
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Product Name</label>
          <input
            type="text"
            required
            value={newProduct.name}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Price (₹)</label>
            <input
              type="number"
              required
              min="0"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Initial Stock Qty</label>
            <input
              type="number"
              required
              min="0"
              value={newProduct.stock}
              onChange={(e) => setNewProduct({ ...newProduct, stock: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Tax Rate (%)</label>
            <input
              type="number"
              value={newProduct.taxRate}
              onChange={(e) => setNewProduct({ ...newProduct, taxRate: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Unit (e.g. pcs, kg)</label>
            <input
              type="text"
              value={newProduct.unit}
              onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
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
    </div>
  );
}
