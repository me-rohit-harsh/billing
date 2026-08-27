'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';
import { api, Customer } from '@/lib/api';
import { FormModal } from '@/components/shared/FormModal';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '', address: '' });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch {
      setCustomers([]);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/customers', newCustomer);
      fetchCustomers();
      setIsModalOpen(false);
      setNewCustomer({ name: '', phone: '', email: '', address: '' });
    } catch (err) {
      console.error('Customer save failed', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Customers Directory</h2>
          <p className="text-slate-500 text-sm font-medium">Manage customer accounts and ledger balances</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

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
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                  No customers registered yet. Click &quot;Add Customer&quot; to add one.
                </td>
              </tr>
            ) : (
              customers.map((cust) => (
                <tr key={cust._id} className="hover:bg-slate-50/80">
                  <td className="p-4 font-bold text-slate-900 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                      {cust.name.slice(0, 2).toUpperCase()}
                    </div>
                    {cust.name}
                  </td>
                  <td className="p-4">{cust.phone || '-'}</td>
                  <td className="p-4">{cust.email || '-'}</td>
                  <td className="p-4">{cust.address || '-'}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={async () => {
                        await api.delete(`/customers/${cust._id}`);
                        fetchCustomers();
                      }}
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

      <FormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Customer"
        onSubmit={handleCreateCustomer}
      >
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name</label>
          <input
            type="text"
            required
            value={newCustomer.name}
            onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
          <input
            type="text"
            value={newCustomer.phone}
            onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
          <input
            type="email"
            value={newCustomer.email}
            onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-blue-500"
          />
        </div>
      </FormModal>
    </div>
  );
}
