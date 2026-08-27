'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Tags, Plus, Edit, Trash2, Package, ArrowRight, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import { api, Product } from '@/lib/api';
import { FormModal } from '@/components/shared/FormModal';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { useToast } from '@/context/ToastContext';
import { exportToCSV } from '@/lib/exportUtils';

interface CategoryItem {
  _id: string;
  name: string;
}

export default function CategoriesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Delete Confirm Modal State
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<CategoryItem | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get('/categories'),
        api.get('/products'),
      ]);
      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
    } catch (err) {
      console.error('Failed to load category data', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCategories = () => {
    if (categories.length === 0) {
      toast.error('No categories available to export.');
      return;
    }

    const exportData = categories.map((cat) => ({
      id: cat._id,
      name: cat.name,
      mappedProductsCount: products.filter((p) => p.category === cat.name).length,
    }));

    const fields = [
      { key: 'id', label: 'Category ID' },
      { key: 'name', label: 'Category Name' },
      { key: 'mappedProductsCount', label: 'Assigned Products Count' },
    ];

    const dateStr = new Date().toISOString().slice(0, 10);
    const success = exportToCSV(`product_categories_${dateStr}`, exportData, fields);
    if (success) {
      toast.success(`Exported ${categories.length} category item(s) to CSV!`);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryNameInput.trim()) {
      toast.error('Category name cannot be empty');
      return;
    }

    setCategoryError(null);
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory._id}`, { name: categoryNameInput.trim() });
        toast.success(`Category '${categoryNameInput.trim()}' updated successfully!`);
      } else {
        await api.post('/categories', { name: categoryNameInput.trim() });
        toast.success(`Category '${categoryNameInput.trim()}' created successfully!`);
      }
      await fetchData();
      setIsCategoryFormOpen(false);
      setCategoryNameInput('');
      setEditingCategory(null);
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Failed to save category';
      setCategoryError(errMsg);
      toast.error(errMsg);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteConfirmTarget) return;
    setCategoryError(null);

    const mappedCount = products.filter((p) => p.category === deleteConfirmTarget.name).length;
    if (mappedCount > 0) {
      const msg = `Cannot delete category "${deleteConfirmTarget.name}" because ${mappedCount} product(s) are assigned to it.`;
      setCategoryError(msg);
      toast.error(msg);
      setDeleteConfirmTarget(null);
      return;
    }

    try {
      await api.delete(`/categories/${deleteConfirmTarget._id}`);
      toast.success(`Category deleted successfully`);
      await fetchData();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Delete failed';
      setCategoryError(errMsg);
      toast.error(errMsg);
    } finally {
      setDeleteConfirmTarget(null);
    }
  };

  const openCreateModal = () => {
    setCategoryError(null);
    setEditingCategory(null);
    setCategoryNameInput('');
    setIsCategoryFormOpen(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setCategoryError(null);
    setEditingCategory(cat);
    setCategoryNameInput(cat.name);
    setIsCategoryFormOpen(true);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-amber-600/20 shrink-0">
            <Tags className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Product Categories Manager</h1>
            <p className="text-slate-500 text-sm font-medium mt-0.5">
              Organize your hardware items, view product counts, and filter catalog
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCategories}
            className="h-12 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            title="Export Categories CSV"
          >
            <Download className="w-4 h-4 text-amber-600" /> Export CSV
          </button>
          <button
            onClick={openCreateModal}
            className="h-12 px-6 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add New Category
          </button>
        </div>
      </div>

      {categoryError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold rounded-2xl flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{categoryError}</span>
          </div>
          <button
            type="button"
            onClick={() => setCategoryError(null)}
            className="font-bold text-rose-500 hover:text-rose-700 px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Categories Grid */}
      {isLoading ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200">
          <div className="w-10 h-10 border-4 border-amber-600/30 border-t-amber-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 font-medium text-sm">Loading categories...</p>
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 space-y-3">
          <Tags className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-lg">No Categories Found</h3>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            Click "Add New Category" to create product groupings for your store.
          </p>
          <button
            onClick={openCreateModal}
            className="h-10 px-5 bg-amber-600 text-white rounded-xl font-bold text-xs shadow-md"
          >
            Add Category
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((cat) => {
            const mappedProducts = products.filter((p) => p.category === cat.name);
            const mappedCount = mappedProducts.length;

            return (
              <div
                key={cat._id}
                className="bg-white border border-slate-200 hover:border-amber-400 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 font-extrabold">
                      <Package className="w-6 h-6" />
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(cat)}
                        className="w-9 h-9 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Rename Category"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryError(null);
                          if (mappedCount > 0) {
                            setCategoryError(`Cannot delete category "${cat.name}" because ${mappedCount} product(s) are assigned to it.`);
                          } else {
                            setDeleteConfirmTarget(cat);
                          }
                        }}
                        className={`w-9 h-9 border rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                          mappedCount > 0
                            ? 'border-slate-200 text-slate-300 bg-slate-50'
                            : 'border-slate-200 text-rose-600 hover:bg-rose-50'
                        }`}
                        title={mappedCount > 0 ? `Cannot delete: ${mappedCount} product(s) mapped` : 'Delete Category'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-amber-700 transition-colors truncate">
                    {cat.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-3 py-1 bg-amber-100/80 text-amber-800 rounded-full font-bold text-xs">
                      {mappedCount} {mappedCount === 1 ? 'Product' : 'Products'} Assigned
                    </span>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100">
                  <Link
                    href={`/products?category=${encodeURIComponent(cat.name)}`}
                    className="w-full h-11 bg-slate-50 hover:bg-amber-600 text-slate-700 hover:text-white border border-slate-200 hover:border-amber-600 rounded-xl font-bold text-xs transition-all flex items-center justify-between px-4 group/btn cursor-pointer"
                  >
                    <span>View Products in {cat.name}</span>
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Category FormModal */}
      <FormModal
        isOpen={isCategoryFormOpen}
        onClose={() => setIsCategoryFormOpen(false)}
        title={editingCategory ? `Rename Category: ${editingCategory.name}` : 'Add New Category'}
        onSubmit={handleSaveCategory}
        submitLabel={editingCategory ? 'Update Category' : 'Create Category'}
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
            Category Name
          </label>
          <input
            type="text"
            required
            value={categoryNameInput}
            onChange={(e) => setCategoryNameInput(e.target.value)}
            placeholder="e.g. Hand Tools, Safety Gear, Plumbing"
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </FormModal>

      {/* Delete ConfirmModal */}
      <ConfirmModal
        isOpen={!!deleteConfirmTarget}
        onClose={() => setDeleteConfirmTarget(null)}
        onConfirm={handleDeleteConfirmed}
        title="Delete Category"
        message={`Are you sure you want to delete category "${deleteConfirmTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Category"
        isDestructive={true}
      />
    </div>
  );
}
