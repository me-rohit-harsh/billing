'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Printer, Package, Plus, Minus } from 'lucide-react';
import { api, Product, Customer, Invoice } from '@/lib/api';
import { TableFilter } from '@/components/shared/TableFilter';

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<(Product & { qty: number })[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT'>('CASH');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
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

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch {
      setCustomers([]);
    }
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const exists = prev.find((item) => item._id === product._id);
      if (exists) {
        return prev.map((item) =>
          item._id === product._id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateCartQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => item._id !== id));
    } else {
      setCart((prev) =>
        prev.map((item) => (item._id === id ? { ...item, qty } : item))
      );
    }
  };

  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const cartTaxTotal = cart.reduce((acc, item) => acc + (item.price * item.qty * (item.taxRate || 0)) / 100, 0);
  const cartGrandTotal = Math.max(0, cartSubtotal + cartTaxTotal - discount);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const selectedCust = customers.find((c) => c._id === selectedCustomerId);

    const invoicePayload: Invoice = {
      customerName: selectedCust ? selectedCust.name : 'Walk-in Customer',
      customerPhone: selectedCust ? selectedCust.phone : '',
      items: cart.map((item) => ({
        productId: item._id,
        name: item.name,
        price: item.price,
        qty: item.qty,
        taxRate: item.taxRate || 0,
        taxAmount: (item.price * item.qty * (item.taxRate || 0)) / 100,
        subtotal: item.price * item.qty,
      })),
      subtotal: cartSubtotal,
      taxTotal: cartTaxTotal,
      discount: discount,
      grandTotal: cartGrandTotal,
      paymentMode: paymentMode,
      paymentStatus: 'PAID',
    };

    try {
      const res = await api.post('/invoices', invoicePayload);
      setActiveReceipt(res.data);
      setCart([]);
      setDiscount(0);
    } catch {
      setActiveReceipt({ ...invoicePayload, invoiceNumber: `INV-${Date.now().toString().slice(-5)}` });
      setCart([]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Products Grid */}
      <div className="lg:col-span-2 space-y-4">
        <TableFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Search products by name..."
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {products
            .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .map((product) => {
              const cartItem = cart.find((item) => item._id === product._id);
              const qtyInCart = cartItem ? cartItem.qty : 0;

              return (
                <div
                  key={product._id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="aspect-square bg-slate-100 rounded-xl mb-3 overflow-hidden flex items-center justify-center relative">
                      {product.imageUrl ? (
                        <img
                          src={`http://localhost:5000${product.imageUrl}`}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <Package className="w-8 h-8 text-slate-400" />
                      )}
                      {qtyInCart > 0 && (
                        <span className="absolute top-2 right-2 bg-blue-600 text-white text-xs font-black px-2 py-0.5 rounded-full shadow">
                          {qtyInCart} in cart
                        </span>
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm truncate">{product.name}</h4>
                      <div className="flex items-center justify-between mt-1 mb-3">
                        <span className="text-blue-600 font-extrabold text-base">₹{product.price}</span>
                        <span className="text-xs font-semibold text-slate-400">Stock: {product.stock}</span>
                      </div>
                    </div>
                  </div>

                  {/* Direct Add to Cart / Quantity Stepper */}
                  {qtyInCart === 0 ? (
                    <button
                      onClick={() => addToCart(product)}
                      className="w-full h-10 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 border border-blue-200 hover:border-blue-600"
                    >
                      <Plus className="w-4 h-4" /> Add to Cart
                    </button>
                  ) : (
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl p-1">
                      <button
                        onClick={() => updateCartQty(product._id, qtyInCart - 1)}
                        className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center font-black text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-black text-sm text-blue-700">{qtyInCart}</span>
                      <button
                        onClick={() => updateCartQty(product._id, qtyInCart + 1)}
                        className="w-8 h-8 rounded-lg bg-blue-600 text-white shadow-sm flex items-center justify-center font-black hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Cart & Billing Checkout Pane */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
        <div>
          <h2 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
            <span>Current Cart</span>
            <span className="text-xs font-bold px-2.5 py-1 bg-blue-100 text-blue-600 rounded-full">
              {cart.reduce((a, b) => a + b.qty, 0)} Items
            </span>
          </h2>

          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <p className="text-center py-10 text-slate-400 font-medium text-sm">
                Cart is empty. Click products to add.
              </p>
            ) : (
              cart.map((item) => (
                <div key={item._id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl">
                  <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-slate-800 text-sm truncate">{item.name}</h5>
                    <span className="text-xs text-slate-500 font-semibold">₹{item.price} each</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateCartQty(item._id, item.qty - 1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200"
                    >
                      -
                    </button>
                    <span className="font-bold text-sm min-w-[20px] text-center">{item.qty}</span>
                    <button
                      onClick={() => updateCartQty(item._id, item.qty + 1)}
                      className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center font-bold text-slate-600 hover:bg-slate-200"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Checkout Calculation */}
        <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
          <div className="flex justify-between text-sm text-slate-600 font-medium">
            <span>Subtotal</span>
            <span>₹{cartSubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600 font-medium">
            <span>GST Tax</span>
            <span>₹{cartTaxTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm font-black text-slate-900 text-lg border-t border-slate-100 pt-2">
            <span>Grand Total</span>
            <span className="text-blue-600">₹{cartGrandTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-2 mt-2"
          >
            <Printer className="w-5 h-5" /> Generate & Print Bill
          </button>
        </div>
      </div>

      {/* Invoice Receipt Printable Modal */}
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
