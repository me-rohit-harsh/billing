'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Trash2, Package, Edit, History, ArrowDownRight, ArrowUpRight, FolderPlus, Tags, Download, ShieldAlert, AlertTriangle, X } from 'lucide-react';
import { api, Product, getImageUrl } from '@/lib/api';
import { FormModal } from '@/components/shared/FormModal';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { TableFilter } from '@/components/shared/TableFilter';
import { CustomDropdown } from '@/components/shared/CustomDropdown';
import { Pagination } from '@/components/shared/Pagination';
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

interface CategoryItem {
  _id: string;
  name: string;
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialCategoryParam = searchParams ? searchParams.get('category') || '' : '';
  const { toast } = useToast();
  const { settings } = useStoreSettings();

  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    initialCategoryParam ? [initialCategoryParam] : []
  );
  const [categories, setCategories] = useState<CategoryItem[]>([]);

  useEffect(() => {
    if (initialCategoryParam) {
      setSelectedCategories([initialCategoryParam]);
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
    minStockAlert: 0,
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

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const editId = params.get('editProduct') || params.get('edit');
      if (editId && products.length > 0) {
        const prod = products.find((p) => p._id === editId);
        if (prod) {
          openEditModal(prod);
        }
      }
    } catch {
      // Ignore
    }
  }, [products]);

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
    if (!categoryNameInput.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    try {
      setCategoryError(null);
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, { name: categoryNameInput.trim() });
        toast.success(`Category '${categoryNameInput.trim()}' updated!`);
      } else {
        await api.post('/categories', { name: categoryNameInput.trim() });
        toast.success(`Category '${categoryNameInput.trim()}' created!`);
      }
      await fetchCategories();
      setIsCategoryFormOpen(false);
      setCategoryNameInput('');
      setEditingCategory(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to save category';
      setCategoryError(msg);
      toast.error(msg);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirmTarget) return;
    setCategoryError(null);

    try {
      if (deleteConfirmTarget.type === 'PRODUCT') {
        await api.delete(`/products/${deleteConfirmTarget.id}`);
        toast.success(`Product '${deleteConfirmTarget.name}' deleted`);
        await fetchProducts();
      } else if (deleteConfirmTarget.type === 'CATEGORY') {
        // Pre-check mapped products count
        const count = products.filter((p) => p.category === deleteConfirmTarget.name).length;
        if (count > 0) {
          const msg = `Cannot delete "${deleteConfirmTarget.name}" category because ${count} product(s) are currently assigned to it.`;
          setCategoryError(msg);
          toast.error(msg);
          setDeleteConfirmTarget(null);
          return;
        }

        await api.delete(`/categories/${deleteConfirmTarget.id}`);
        toast.success(`Category '${deleteConfirmTarget.name}' deleted`);
        await fetchCategories();
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Delete failed';
      setCategoryError(msg);
      toast.error(msg);
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
      minStockAlert: 0,
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
      minStockAlert: product.minStockAlert || 0,
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
        toast.success(`Product '${formData.name}' updated successfully!`);
      } else {
        await api.post('/products', { ...formData, imageUrl: finalImageUrl });
        toast.success(`Product '${formData.name}' created successfully!`);
      }

      await fetchProducts();
      setIsProductModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Product save failed';
      toast.error(msg);
    }
  };

  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('view_mode_products');
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
      localStorage.setItem('view_mode_products', mode);
    } catch {
      // Ignore
    }
  };

  const categoryOptions = categories.map((cat) => ({
    _id: cat.name,
    name: cat.name,
  }));

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategories]);

  const filteredProducts = products
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())))
    .filter((p) => {
      if (!selectedCategories || selectedCategories.length === 0) return true;
      return (
        Boolean(p.category && selectedCategories.includes(p.category)) ||
        categories.some((c) => selectedCategories.includes(c._id) && c.name === p.category)
      );
    });

  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;

  const handleExportProducts = () => {
    if (filteredProducts.length === 0) {
      toast.error('No products available to export.');
      return;
    }
    const fields = [
      { key: 'name', label: 'Product Name' },
      { key: 'sku', label: 'SKU' },
      { key: 'barcode', label: 'Barcode' },
      { key: 'category', label: 'Category' },
      { key: 'price', label: 'Selling Price (₹)' },
      { key: 'costPrice', label: 'Cost Price (₹)' },
      { key: 'stock', label: 'Stock Level' },
      { key: 'unit', label: 'Unit' },
      { key: 'taxRate', label: 'Tax Rate (%)' },
    ];
    const dateStr = new Date().toISOString().slice(0, 10);
    const success = exportToCSV(`products_catalog_${dateStr}`, filteredProducts, fields);
    if (success) {
      toast.success(`Exported ${filteredProducts.length} product(s) to CSV!`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Products Catalog</h2>
          <p className="text-slate-500 text-sm font-medium">Manage product details, stock levels, and audit history</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportProducts}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            title="Export Products CSV"
          >
            <Download className="w-4 h-4 text-amber-600" /> Export CSV
          </button>
          <button
            onClick={openCreateModal}
            className="h-11 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      <TableFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={categories}
        selectedCategory={selectedCategories}
        onCategorySelect={(val) => {
          if (Array.isArray(val)) {
            setSelectedCategories(val);
          } else {
            setSelectedCategories(val ? [val] : []);
          }
        }}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onExport={handleExportProducts}
        exportLabel="Export Products"
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
              {paginatedProducts.map((prod) => (
                <tr key={prod._id} className="hover:bg-slate-50/80">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center shrink-0">
                      {prod.imageUrl ? (
                        <img src={getImageUrl(prod.imageUrl)} alt="" className="w-full h-full object-cover" />
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
                    {(() => {
                      const threshold = prod.minStockAlert && prod.minStockAlert > 0 ? prod.minStockAlert : (settings.defaultLowStockThreshold ?? 10);
                      const isLow = prod.stock <= threshold;
                      return (
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            isLow ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-800'
                          }`}
                          title={isLow ? `Low Stock Warning! (Stock: ${prod.stock} <= Threshold: ${threshold})` : `Stock Level: ${prod.stock}`}
                        >
                          {prod.stock} {prod.unit} {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline ml-1" />}
                        </span>
                      );
                    })()}
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
          {paginatedProducts.map((prod) => {
            const threshold = prod.minStockAlert && prod.minStockAlert > 0 ? prod.minStockAlert : (settings.defaultLowStockThreshold ?? 10);
            const isLow = prod.stock <= threshold;

            return (
              <div key={prod._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-slate-200">
                      {prod.imageUrl ? (
                        <img src={getImageUrl(prod.imageUrl)} alt="" className="w-full h-full object-cover" />
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
                      <span
                        className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                          isLow ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-800'
                        }`}
                        title={isLow ? `Low Stock Warning! (Stock: ${prod.stock} <= Threshold: ${threshold})` : `Stock Level: ${prod.stock}`}
                      >
                        {prod.stock} {prod.unit} {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 inline ml-1" />}
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
            );
          })}
        </div>
      )}

      {/* Backend Pagination Bar */}
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

      {/* Create / Edit Product Modal */}
      <FormModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? `Edit Product: ${editingProduct.name}` : 'Add New Product'}
        description={
          editingProduct
            ? 'Update pricing, category, stock thresholds, and item details'
            : 'Enter item details, pricing, initial stock level, and category'
        }
        icon={<Package className="w-5 h-5 text-amber-700" />}
        onSubmit={handleSaveProduct}
        submitLabel={editingProduct ? 'Update Product' : 'Create Product'}
        variant="amber"
        maxWidth="lg"
      >
        <div>
          <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
            Product Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Heavy Duty Cordless Drill 18V"
            className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
            Product Category
          </label>
          <CustomDropdown
            options={categoryOptions}
            value={formData.category}
            onChange={(val) => setFormData({ ...formData, category: val })}
            placeholder="Select Category"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
              Selling Price (₹)
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
              Total Target Stock Qty
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
              className="w-full h-11 px-4 bg-amber-50/40 border border-amber-200/80 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
              Tax Rate (%)
            </label>
            <input
              type="number"
              value={formData.taxRate}
              onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
              className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
              Unit (e.g. pcs, kg, box)
            </label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="e.g. pcs"
              className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider flex items-center justify-between">
            <span>Low Stock Warning Threshold (pcs)</span>
            <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider">Custom override</span>
          </label>
          <input
            type="number"
            min="0"
            placeholder={`Default (${settings.defaultLowStockThreshold ?? 10} pcs from Store Settings)`}
            value={formData.minStockAlert || ''}
            onChange={(e) => setFormData({ ...formData, minStockAlert: Number(e.target.value) })}
            className="w-full h-11 px-4 bg-amber-50/30 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
          />
          <p className="text-xs text-slate-400 mt-1 font-medium">
            Leave blank to use store default ({settings.defaultLowStockThreshold ?? 10} pcs).
          </p>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">
            Product Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="w-full text-xs text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-extrabold file:bg-amber-100/80 file:text-amber-800 hover:file:bg-amber-200/80 cursor-pointer"
          />
        </div>
      </FormModal>

      {/* Category Manager List Modal */}
      {isCategoryManagerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setIsCategoryManagerOpen(false)}
        >
          <div
            className="w-full max-w-md bg-slate-200/50 p-2 sm:p-2.5 rounded-[28px] sm:rounded-[32px] border border-white/80 ring-1 ring-slate-900/10 shadow-2xl transition-all duration-200 animate-in zoom-in-95 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full bg-white rounded-[22px] sm:rounded-[26px] overflow-hidden border border-slate-200/80 shadow-xs flex flex-col">
              <div className="p-5 sm:p-6 pb-4 bg-slate-50/70 border-b border-slate-100/90 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100/90 text-amber-700 border border-amber-200/80 flex items-center justify-center shrink-0 shadow-2xs">
                    <Tags className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Categories Manager</h3>
                    <p className="text-xs font-semibold text-slate-500">Manage catalog categories & mappings</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCategoryManagerOpen(false)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center shrink-0 cursor-pointer ml-2"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 sm:p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {categoryError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl flex items-center justify-between">
                    <span>{categoryError}</span>
                    <button type="button" onClick={() => setCategoryError(null)} className="font-bold text-rose-500 hover:text-rose-700 ml-2 p-0.5"><X className="w-4 h-4" /></button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">Active Categories ({categories.length})</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryError(null);
                      setEditingCategory(null);
                      setCategoryNameInput('');
                      setIsCategoryFormOpen(true);
                    }}
                    className="h-9 px-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-extrabold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Category
                  </button>
                </div>

                <div className="space-y-2 pr-1">
                  {categories.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 font-semibold text-xs">No categories found. Click Add Category to create one.</p>
                  ) : (
                    categories.map((cat) => {
                      const mappedCount = products.filter((p) => p.category === cat.name).length;
                      return (
                        <div key={cat._id} className="flex items-center justify-between bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 hover:border-amber-300 transition-colors">
                          <div>
                            <span className="font-extrabold text-slate-900 text-sm block">{cat.name}</span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {mappedCount > 0 ? `${mappedCount} product(s) mapped` : '0 products mapped'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setCategoryError(null);
                                setEditingCategory(cat);
                                setCategoryNameInput(cat.name);
                                setIsCategoryFormOpen(true);
                              }}
                              className="inline-flex items-center justify-center w-8 h-8 border border-slate-200 rounded-lg text-slate-600 hover:bg-white hover:border-amber-300 transition-colors shadow-2xs cursor-pointer"
                              title="Rename Category"
                            >
                              <Edit className="w-3.5 h-3.5 text-amber-600" />
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
                              className={`inline-flex items-center justify-center w-8 h-8 border rounded-lg transition-colors shadow-2xs cursor-pointer ${
                                mappedCount > 0
                                  ? 'border-slate-200 text-slate-300 bg-slate-50 cursor-not-allowed'
                                  : 'border-slate-200 text-slate-600 hover:bg-white hover:border-rose-300'
                              }`}
                              title={mappedCount > 0 ? `Cannot delete: ${mappedCount} product(s) mapped` : 'Delete Category'}
                            >
                              <Trash2 className={`w-3.5 h-3.5 ${mappedCount > 0 ? 'text-slate-300' : 'text-rose-600'}`} />
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
        </div>
      )}

      {/* Add / Edit Category FormModal */}
      <FormModal
        isOpen={isCategoryFormOpen}
        onClose={() => setIsCategoryFormOpen(false)}
        title={editingCategory ? `Rename Category` : 'Add Product Category'}
        description={editingCategory ? `Rename category "${editingCategory.name}"` : 'Add a new category to assign catalog products'}
        icon={<Tags className="w-5 h-5 text-amber-700" />}
        onSubmit={handleSaveCategory}
        submitLabel={editingCategory ? 'Update Category' : 'Create Category'}
        variant="amber"
      >
        <div>
          <label className="block text-xs font-extrabold text-slate-700 mb-1.5 uppercase tracking-wider">Category Name</label>
          <input
            type="text"
            required
            value={categoryNameInput}
            onChange={(e) => setCategoryNameInput(e.target.value)}
            placeholder="e.g. Hand Tools, Safety Gear"
            className="w-full h-11 px-4 bg-slate-50/50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 focus:bg-white transition-all"
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
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 transition-colors font-bold text-base cursor-pointer flex items-center justify-center"
              >
                <X className="w-5 h-5" />
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
