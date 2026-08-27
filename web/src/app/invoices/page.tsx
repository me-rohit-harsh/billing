'use client';

import React, { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import { api, Invoice } from '@/lib/api';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeReceipt, setActiveReceipt] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/invoices');
      setInvoices(res.data);
    } catch {
      setInvoices([]);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-slate-800">Invoice History</h2>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase">
              <th className="p-4">Invoice #</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Amount</th>
              <th className="p-4">Payment</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
            {invoices.map((inv) => (
              <tr key={inv._id || inv.invoiceNumber} className="hover:bg-slate-50/80">
                <td className="p-4 font-bold text-blue-600">{inv.invoiceNumber}</td>
                <td className="p-4">{inv.customerName || 'Walk-in Customer'}</td>
                <td className="p-4 font-bold text-slate-900">₹{inv.grandTotal}</td>
                <td className="p-4">
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-lg">
                    {inv.paymentMode}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => setActiveReceipt(inv)}
                    className="inline-flex items-center justify-center w-8 h-8 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                    title="Print Receipt"
                  >
                    <Printer className="w-4 h-4 text-blue-600" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 font-mono text-slate-900 border border-slate-200">
            <div className="text-center border-b border-dashed border-slate-300 pb-3">
              <h2 className="font-extrabold text-xl">BILLING PRO STORE</h2>
              <p className="text-xs text-slate-500">Offline Receipt</p>
              <p className="text-xs text-slate-500">Invoice: {activeReceipt.invoiceNumber}</p>
            </div>
            <div className="space-y-2 text-xs">
              {activeReceipt.items.map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.name} (x{item.qty})</span>
                  <span>₹{item.subtotal}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-slate-300 pt-3 text-xs space-y-1">
              <div className="flex justify-between font-bold">
                <span>Total Amount:</span>
                <span>₹{activeReceipt.grandTotal}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Payment Mode:</span>
                <span>{activeReceipt.paymentMode}</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 h-10 rounded-xl bg-blue-600 text-white font-bold text-xs"
              >
                Print
              </button>
              <button
                onClick={() => setActiveReceipt(null)}
                className="px-4 h-10 rounded-xl border border-slate-200 font-bold text-xs text-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
