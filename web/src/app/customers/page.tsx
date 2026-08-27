'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users, Phone, Mail, MapPin } from 'lucide-react';
import { api, Customer } from '@/lib/api';
import { FormModal } from '@/components/shared/FormModal';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { TableFilter } from '@/components/shared/TableFilter';
import { useToast } from '@/context/ToastContext';

export default function CustomersPage() {
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
      const res = await api.get('/customers');
      setCustomers(res.data || []);
    } catch {
      setCustomers([]);
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
          <p className="text-slate-500 text-sm font-medium">Manage customer contacts and registered hardware buyer profiles</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="h-11 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      <TableFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
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
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
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
