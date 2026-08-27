'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Users, Phone, Mail, MapPin, Download, ShoppingBag, Receipt } from 'lucide-react';
import { api, Customer, Invoice } from '@/lib/api';
import { FormModal } from '@/components/shared/FormModal';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { TableFilter } from '@/components/shared/TableFilter';
import { useToast } from '@/context/ToastContext';
import { exportToCSV } from '@/lib/exportUtils';

export default function CustomersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const [custRes, invRes] = await Promise.all([
        api.get('/customers'),
        api.get('/invoices'),
      ]);
      const customerList: Customer[] = custRes.data || [];
      const invoiceList: Invoice[] = invRes.data || [];

      const enhanced = customerList.map((cust) => {
        const custInvoices = invoiceList.filter(
          (inv) =>
            (inv.customerName && inv.customerName.trim().toLowerCase() === cust.name.trim().toLowerCase()) ||
            (inv.customerPhone && cust.phone && inv.customerPhone.trim() === cust.phone.trim())
        );
        const ordersCount = custInvoices.length;
        const totalSpent = custInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
        return {
          ...cust,
          ordersCount,
          totalSpent,
        };
      });

      setCustomers(enhanced);
    } catch {
      setCustomers([]);
    }
  };

  const handleExportCustomers = () => {
    if (filteredCustomers.length === 0) {
      toast.error('No customer profiles available to export.');
      return;
    }

    const fields = [
      { key: 'name', label: 'Customer Name' },
      { key: 'phone', label: 'Phone Number' },
      { key: 'email', label: 'Email Address' },
      { key: 'address', label: 'Address / Site Location' },
      { key: 'ordersCount', label: 'Total Orders' },
      { key: 'totalSpent', label: 'Total Spent (₹)' },
      { key: 'balanceDue', label: 'Balance Due (₹)' },
    ];

    const dateStr = new Date().toISOString().slice(0, 10);
    const success = exportToCSV(`customers_directory_${dateStr}`, filteredCustomers, fields);
    if (success) {
      toast.success(`Exported ${filteredCustomers.length} customer(s) to CSV!`);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/customers', newCustomer);
      toast.success(`Customer '${newCustomer.name}' created successfully!`);
      fetchCustomers();
      setIsModalOpen(false);
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Customer save failed';
      toast.error(msg);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteConfirmTarget) return;
    try {
      await api.delete(`/customers/${deleteConfirmTarget._id}`);
      toast.success(`Customer deleted successfully`);
      fetchCustomers();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete customer failed';
      toast.error(msg);
    } finally {
      setDeleteConfirmTarget(null);
    }
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.phone && c.phone.includes(searchQuery)) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Contractors & Customers Directory</h2>
          <p className="text-slate-500 text-sm font-medium">Manage customer contacts, order histories, and registered buyer profiles</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCustomers}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            title="Export Customers CSV"
          >
            <Download className="w-4 h-4 text-amber-600" /> Export CSV
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="h-11 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Customer
          </button>
        </div>
      </div>

      <TableFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onExport={handleExportCustomers}
        exportLabel="Export Customers"
        placeholder="Filter customers by name, phone, or email..."
      />

      {viewMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase">
                <th className="p-4">Customer Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Email</th>
                <th className="p-4">Address</th>
                <th className="p-4 text-center">Total Orders</th>
                <th className="p-4 text-right">Total Spent</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                    No customers found matching search filter.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust._id} className="hover:bg-slate-50/80">
                    <td className="p-4 font-bold text-slate-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                        {cust.name.slice(0, 2).toUpperCase()}
                      </div>
                      {cust.name}
                    </td>
                    <td className="p-4 font-medium">{cust.phone || '-'}</td>
                    <td className="p-4 font-medium">{cust.email || '-'}</td>
                    <td className="p-4 font-medium text-slate-600">{cust.address || '-'}</td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => router.push(`/invoices?customer=${encodeURIComponent(cust.name)}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition-all cursor-pointer shadow-2xs hover:scale-105"
                        title={`Filter sales invoices for ${cust.name}`}
                      >
                        {cust.ordersCount || 0} {cust.ordersCount === 1 ? 'Order' : 'Orders'}
                      </button>
                    </td>
                    <td className="p-4 text-right font-black text-slate-900">
                      ₹{(cust.totalSpent || 0).toFixed(2)}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setDeleteConfirmTarget(cust)}
                        className="inline-flex items-center justify-center w-8 h-8 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                        title="Delete Customer"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Customer Cards Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => (
            <div key={cust._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-extrabold text-sm border border-amber-200">
                    {cust.name.slice(0, 2).toUpperCase()}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmTarget(cust)}
                    className="p-1.5 border border-slate-200 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base">{cust.name}</h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600 font-medium">
                  {cust.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{cust.phone}</span>
                    </div>
                  )}
                  {cust.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{cust.email}</span>
                    </div>
                  )}
                  {cust.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{cust.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Count & Total Spent Summary */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => router.push(`/invoices?customer=${encodeURIComponent(cust.name)}`)}
                  className="font-extrabold text-amber-800 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-full border border-amber-300 flex items-center gap-1.5 transition-all cursor-pointer hover:scale-105"
                  title={`Filter sales invoices for ${cust.name}`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-amber-600" />
                  {cust.ordersCount || 0} {cust.ordersCount === 1 ? 'Order' : 'Orders'}
                </button>
                <span className="font-black text-slate-900 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                  ₹{(cust.totalSpent || 0).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Customer / Contractor"
        onSubmit={handleCreateCustomer}
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name</label>
          <input
            type="text"
            required
            value={newCustomer.name}
            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
          <input
            type="text"
            value={newCustomer.phone}
            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
          <input
            type="email"
            value={newCustomer.email}
            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Address / Site Location</label>
          <input
            type="text"
            value={newCustomer.address}
            onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-amber-500"
          />
        </div>
      </FormModal>

      <ConfirmModal
        isOpen={!!deleteConfirmTarget}
        onClose={() => setDeleteConfirmTarget(null)}
        onConfirm={handleDeleteCustomer}
        title="Delete Customer Profile"
        message={`Are you sure you want to delete customer "${deleteConfirmTarget?.name}"?`}
        confirmLabel="Delete Customer"
        isDestructive={true}
      />
    </div>
  );
}
