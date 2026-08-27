'use client';

import React, { useState, useEffect } from 'react';
import { Printer, Receipt, FileText, Download } from 'lucide-react';
import { api, Invoice, Customer } from '@/lib/api';
import { TableFilter } from '@/components/shared/TableFilter';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { useToast } from '@/context/ToastContext';
import { exportToCSV } from '@/lib/exportUtils';

export default function InvoicesPage() {
  const { settings } = useStoreSettings();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [activeReceipt, setActiveReceipt] = useState<Invoice | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  useEffect(() => {
    fetchInvoicesAndCustomers();
    try {
      const params = new URLSearchParams(window.location.search);
      const search = params.get('customer') || params.get('search');
      if (search) {
        setSelectedCustomer(search);
      }
    } catch {
      // Ignore URL parse errors
    }
  }, []);

  const fetchInvoicesAndCustomers = async () => {
    try {
      const [invRes, custRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/customers'),
      ]);
      setInvoices(invRes.data || []);
      setCustomers(custRes.data || []);
    } catch {
      setInvoices([]);
      setCustomers([]);
    }
  };

  const handleExportInvoices = () => {
    if (filteredInvoices.length === 0) {
      toast.error('No invoices available to export.');
      return;
    }

    const fields = [
      { key: 'invoiceNumber', label: 'Invoice Number' },
      { key: 'createdAt', label: 'Date/Time', transform: (val: string) => val ? new Date(val).toLocaleString() : '' },
      { key: 'customerName', label: 'Customer Name', transform: (val: string) => val || 'Walk-in Customer' },
      { key: 'itemsCount', label: 'Items Count', transform: (_: any, inv: Invoice) => inv.items?.length || 0 },
      { key: 'subtotal', label: 'Subtotal (₹)' },
      { key: 'taxTotal', label: 'Tax Total (₹)' },
      { key: 'discountTotal', label: 'Discount Total (₹)' },
      { key: 'grandTotal', label: 'Grand Total (₹)' },
      { key: 'paymentMode', label: 'Payment Mode' },
    ];

    const dateStr = new Date().toISOString().slice(0, 10);
    const success = exportToCSV(`sales_invoices_${dateStr}`, filteredInvoices, fields);
    if (success) {
      toast.success(`Exported ${filteredInvoices.length} sales invoice(s) to CSV!`);
    }
  };

  const customerDropdownOptions = [
    { _id: 'Walk-in Customer (Guest)', name: 'Walk-in Customer (Guest)' },
    ...customers.map((c) => ({ _id: c.name, name: c.name })),
  ];

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.customerName && inv.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inv.paymentMode && inv.paymentMode.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCustomer =
      !selectedCustomer ||
      (inv.customerName && inv.customerName.toLowerCase() === selectedCustomer.toLowerCase()) ||
      (!inv.customerName && selectedCustomer === 'Walk-in Customer (Guest)');

    return matchesSearch && matchesCustomer;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-800">Sales Invoices & Billing History</h2>
          <p className="text-slate-500 text-sm font-medium">Search past sales, print thermal receipts, and audit customer invoices</p>
        </div>
        <button
          onClick={handleExportInvoices}
          className="h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          title="Export Invoices CSV"
        >
          <Download className="w-4 h-4 text-amber-600" /> Export CSV
        </button>
      </div>

      <TableFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={customerDropdownOptions}
        selectedCategory={selectedCustomer}
        onCategorySelect={(val) => setSelectedCustomer(typeof val === 'string' ? val : (Array.isArray(val) ? val[0] || '' : ''))}
        categoryPlaceholder="All Customers"
        multiSelect={false}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onExport={handleExportInvoices}
        exportLabel="Export Invoices"
        placeholder="Search by invoice number, customer, or payment mode..."
      />

      {viewMode === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase">
                <th className="p-4">Invoice #</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Payment Mode</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-700">
              {filteredInvoices.map((inv) => (
                <tr key={inv._id || inv.invoiceNumber} className="hover:bg-slate-50/80">
                  <td className="p-4 font-bold text-amber-700">{inv.invoiceNumber}</td>
                  <td className="p-4 font-medium">{inv.customerName || 'Walk-in Customer'}</td>
                  <td className="p-4 font-black text-slate-900">₹{inv.grandTotal}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold rounded-lg">
                      {inv.paymentMode}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setActiveReceipt(inv)}
                      className="inline-flex items-center justify-center w-8 h-8 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
                      title="Print Receipt"
                    >
                      <Printer className="w-4 h-4 text-amber-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Invoice Cards View Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvoices.map((inv) => (
            <div key={inv._id || inv.invoiceNumber} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                    {inv.invoiceNumber}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-md">
                    {inv.paymentMode}
                  </span>
                </div>

                <h3 className="font-extrabold text-slate-900 text-base">{inv.customerName || 'Walk-in Guest'}</h3>
                <span className="text-xs text-slate-400 block mt-0.5 font-medium">{inv.items?.length || 0} line item(s)</span>

                <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-bold uppercase">Grand Total</span>
                  <span className="text-lg font-black text-slate-900">₹{inv.grandTotal}</span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100">
                <button
                  onClick={() => setActiveReceipt(inv)}
                  className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> View & Print Receipt Slip
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div id="printable-receipt" className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 font-mono text-slate-900 border border-slate-200">
            <div className="text-center border-b border-dashed border-slate-300 pb-3 space-y-0.5">
              <h2 className="font-extrabold text-lg uppercase">🛠️ {settings.storeName || 'BUILDPRO HARDWARE STORE'}</h2>
              {settings.tagline && <p className="text-[11px] font-medium">{settings.tagline}</p>}
              {settings.address && <p className="text-[10px] text-slate-600">{settings.address}</p>}
              {(settings.gstin || settings.phone) && (
                <p className="text-[10px] font-bold">
                  {settings.gstin ? `GSTIN: ${settings.gstin}` : ''} {settings.gstin && settings.phone ? '|' : ''} {settings.phone ? `Ph: ${settings.phone}` : ''}
                </p>
              )}
              <div className="border-t border-dashed border-slate-300 my-1.5" />
              <p className="text-xs font-bold text-slate-500 uppercase">POS Sales Receipt - Invoice #{activeReceipt.invoiceNumber}</p>
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
            {/* Dynamic Footer Notes */}
            <div className="border-t border-dashed border-slate-300 pt-2 text-center text-[10px] space-y-0.5">
              {settings.thankYouNote && <p className="font-bold">{settings.thankYouNote}</p>}
              {settings.returnPolicy && <p className="text-slate-600">{settings.returnPolicy}</p>}
              {settings.footerNote && <p className="font-bold pt-0.5">{settings.footerNote}</p>}
            </div>
            <div className="flex gap-2 pt-2 no-print">
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
