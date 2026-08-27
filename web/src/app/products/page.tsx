'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Trash2, Package, Edit, History, ArrowDownRight, ArrowUpRight, FolderPlus, Tags } from 'lucide-react';
import { api, Product } from '@/lib/api';
import { FormModal } from '@/components/shared/FormModal';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { TableFilter } from '@/components/shared/TableFilter';
import { CustomDropdown } from '@/components/shared/CustomDropdown';

interface StockLog {
  _id: string;
  productId: string;
  productName: string;
  type: 'IN' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  createdAt: string;
}

interface CategoryItem {
  _id: string;
  name: string;
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialCategoryParam = searchParams ? searchParams.get('category') || '' : '';

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategoryParam);
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    if (initialCategoryParam) {
      setSelectedCategory(initialCategoryParam);
    }
  }, [initialCategoryParam]);
  
  // Product Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Category Manager Modal state
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');

  // Delete Confirm Modal State
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{ type: 'PRODUCT' | 'CATEGORY'; id: string; name: string } | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

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
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data || []);
    } catch {
      setCategories([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data || []);
    } catch {
      setProducts([]);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) return;

    try {
      setCategoryError(null);
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, { name: categoryNameInput.trim() });
      } else {
        await api.post('/categories', { name: categoryNameInput.trim() });
      }
      await fetchCategories();
      setIsCategoryFormOpen(false);
      setCategoryNameInput('');
      setEditingCategory(null);
    } catch (err: any) {
      setCategoryError(err?.response?.data?.message || 'Failed to save category');
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirmTarget) return;
    setCategoryError(null);

    try {
      if (deleteConfirmTarget.type === 'PRODUCT') {
        await api.delete(`/products/${deleteConfirmTarget.id}`);
        await fetchProducts();
      } else if (deleteConfirmTarget.type === 'CATEGORY') {
        // Pre-check mapped products count
        const count = products.filter((p) => p.category === deleteConfirmTarget.name).length;
        if (count > 0) {
          setCategoryError(`Cannot delete "${deleteConfirmTarget.name}" category because ${count} product(s) are currently assigned to it.`);
          setDeleteConfirmTarget(null);
          return;
        }

        await api.delete(`/categories/${deleteConfirmTarget.id}`);
        await fetchCategories();
      }
    } catch (err: any) {
      setCategoryError(err?.response?.data?.message || 'Delete failed');
    } finally {
      setDeleteConfirmTarget(null);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      price: 0,
      costPrice: 0,
      stock: 10,
      category: categories.length > 0 ? categories[0].name : 'General',
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
        const stockDiff = formData.stock - editingProduct.stock;
        
        // 1. Update product details
        const { stock, ...productPayload } = formData;
        await api.put(`/products/${editingProduct._id}`, { ...productPayload, imageUrl: finalImageUrl });
        
        // 2. If stock quantity changed, call adjust-stock endpoint
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

      await fetchProducts();
      setIsProductModalOpen(false);
    } catch (err) {
      console.error('Product save failed', err);
    }
  };

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const categoryOptions = categories.map((cat) => ({
    _id: cat.name,
    name: cat.name,
  }));

  const filteredProducts = products
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())))
    .filter((p) => !selectedCategory || p.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Products Catalog</h2>
          <p className="text-slate-500 text-sm font-medium">Manage product details, stock levels, and audit history</p>
        </div>

        <button
          onClick={openCreateModal}
          className="h-11 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      <TableFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        placeholder="Filter products by name or category..."
      />

      {viewMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase">
                <th className="p-4">Product</th>
                <th className="p-4">Category</th>
                <th className="p-4">Price</th>
                <th className="p-4">Tax Rate</th>
                <th className="p-4">Stock</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
              {filteredProducts.map((prod) => (
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
                      <span className="text-xs text-slate-400 font-normal">SKU: {prod.sku || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                      {prod.category || 'General'}
                    </span>
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
                      <History className="w-4 h-4 text-amber-600" />
                    </button>
                    <button
                      onClick={() => openEditModal(prod)}
                      className="inline-flex items-center justify-center w-8 h-8 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                      title="Edit Product & Stock"
                    >
                      <Edit className="w-4 h-4 text-slate-700" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmTarget({ type: 'PRODUCT', id: prod._id, name: prod.name })}
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
      ) : (
        /* Cards View Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((prod) => (
            <div key={prod._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                    {prod.imageUrl ? (
                      <img src={`http://localhost:5000${prod.imageUrl}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400" />
                    )}
                  </div>
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold truncate">
                    {prod.category || 'General'}
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base leading-snug group-hover:text-amber-700 transition-colors">
                  {prod.name}
                </h3>
                <span className="text-xs text-slate-400 block mt-0.5 font-mono">SKU: {prod.sku || 'N/A'}</span>

                <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Price</span>
                    <span className="text-lg font-black text-slate-900">₹{prod.price}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Stock</span>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                      prod.stock <= 5 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {prod.stock} {prod.unit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => openHistoryModal(prod)}
                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-amber-600" /> Audit Logs
                </button>
                <button
                  onClick={() => openEditModal(prod)}
                  className="p-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                  title="Edit Product"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirmTarget({ type: 'PRODUCT', id: prod._id, name: prod.name })}
                  className="p-2 border border-slate-200 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Delete Product"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

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
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Product Category</label>
          <CustomDropdown
            options={categoryOptions}
            value={formData.category}
            onChange={(val) => setFormData({ ...formData, category: val })}
            placeholder="Select Category"
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
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Total Target Stock Qty</label>
            <input
              type="number"
              required
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500 bg-amber-50/50"
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
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Unit (e.g. pcs, kg, box)</label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Product Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-amber-50 file:text-amber-800 hover:file:bg-amber-100"
          />
        </div>
      </FormModal>

      {/* Category Manager List Modal */}
      {isCategoryManagerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => setIsCategoryManagerOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Tags className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base tracking-tight">Product Categories Manager</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryManagerOpen(false)}
                className="text-slate-400 hover:text-white rounded-lg p-1 transition-colors font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {categoryError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center justify-between">
                  <span>{categoryError}</span>
                  <button type="button" onClick={() => setCategoryError(null)} className="font-bold text-rose-500 hover:text-rose-700 ml-2">✕</button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Categories ({categories.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryError(null);
                    setEditingCategory(null);
                    setCategoryNameInput('');
                    setIsCategoryFormOpen(true);
                  }}
                  className="h-9 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add Category
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {categories.length === 0 ? (
                  <p className="text-center py-6 text-slate-400 font-medium text-xs">No categories found. Click Add Category to create one.</p>
                ) : (
                  categories.map((cat) => {
                    const mappedCount = products.filter((p) => p.category === cat.name).length;
                    return (
                      <div key={cat._id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div>
                          <span className="font-bold text-slate-800 text-sm block">{cat.name}</span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            {mappedCount > 0 ? `${mappedCount} product(s) mapped` : '0 products mapped'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryError(null);
                              setEditingCategory(cat);
                              setCategoryNameInput(cat.name);
                              setIsCategoryFormOpen(true);
                            }}
                            className="inline-flex items-center justify-center w-8 h-8 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                            title="Rename Category"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCategoryError(null);
                              if (mappedCount > 0) {
                                setCategoryError(`Cannot delete category "${cat.name}" because ${mappedCount} product(s) are assigned to it.`);
                              } else {
                                setDeleteConfirmTarget({ type: 'CATEGORY', id: cat._id, name: cat.name });
                              }
                            }}
                            className={`inline-flex items-center justify-center w-8 h-8 border rounded-lg transition-colors cursor-pointer ${
                              mappedCount > 0
                                ? 'border-slate-200 text-slate-400 bg-slate-100 hover:bg-slate-200'
                                : 'border-slate-200 text-rose-600 hover:bg-rose-50'
                            }`}
                            title={mappedCount > 0 ? `Cannot delete: ${mappedCount} product(s) mapped` : 'Delete Category'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Category FormModal */}
      <FormModal
        isOpen={isCategoryFormOpen}
        onClose={() => setIsCategoryFormOpen(false)}
        title={editingCategory ? `Rename Category: ${editingCategory.name}` : 'Add Product Category'}
        onSubmit={handleSaveCategory}
        submitLabel={editingCategory ? 'Update Category' : 'Create Category'}
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Category Name</label>
          <input
            type="text"
            required
            value={categoryNameInput}
            onChange={(e) => setCategoryNameInput(e.target.value)}
            placeholder="e.g. Hand Tools, Safety Gear"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </FormModal>

      {/* Destructive ConfirmModal for Deleting Products & Categories */}
      <ConfirmModal
        isOpen={!!deleteConfirmTarget}
        onClose={() => setDeleteConfirmTarget(null)}
        onConfirm={handleDeleteConfirmed}
        title={`Delete ${deleteConfirmTarget?.type === 'PRODUCT' ? 'Product' : 'Category'}`}
        message={`Are you sure you want to delete "${deleteConfirmTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive={true}
      />

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
                <History className="w-5 h-5 text-amber-600" /> Stock History: {selectedProductName}
              </h3>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors font-bold text-base cursor-pointer"
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

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 font-medium">Loading catalog...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
