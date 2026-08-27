'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Printer, Package, Plus, Minus, UserCheck } from 'lucide-react';
import { api, Product, Customer, Invoice } from '@/lib/api';
import { TableFilter } from '@/components/shared/TableFilter';
import { CustomDropdown } from '@/components/shared/CustomDropdown';
import { useStoreSettings } from '@/context/StoreSettingsContext';

export default function POSPage() {
  const { settings } = useStoreSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<(Product & { qty: number })[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // Optional Walk-in / Direct Customer details
  const [custName, setCustName] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');

  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT'>('CASH');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const [activeReceipt, setActiveReceipt] = useState<Invoice | null>(null);

  // Load cart from localStorage on initial render
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('pos_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch {
      // Ignore JSON parse errors
    } finally {
      setIsCartLoaded(true);
    }
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    if (isCartLoaded) {
      localStorage.setItem('pos_cart', JSON.stringify(cart));
    }
  }, [cart, isCartLoaded]);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      if (res.data && res.data.length > 0) {
        setCategories(res.data);
      } else {
        setCategories([
          { _id: 'Power Tools', name: 'Power Tools' },
          { _id: 'Fasteners', name: 'Fasteners' },
          { _id: 'Plumbing', name: 'Plumbing' },
          { _id: 'Electrical', name: 'Electrical' },
          { _id: 'Paints', name: 'Paints' },
        ]);
      }
    } catch {
      setCategories([
        { _id: 'Power Tools', name: 'Power Tools' },
        { _id: 'Fasteners', name: 'Fasteners' },
        { _id: 'Plumbing', name: 'Plumbing' },
        { _id: 'Electrical', name: 'Electrical' },
        { _id: 'Paints', name: 'Paints' },
      ]);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch {
      setProducts([
        { _id: '1', name: 'DeWalt 20V Max Cordless Drill Kit', price: 4999, taxRate: 18, stock: 15, unit: 'pcs', category: 'Power Tools' },
        { _id: '2', name: 'Bosch Professional Angle Grinder 750W', price: 3200, taxRate: 18, stock: 10, unit: 'pcs', category: 'Power Tools' },
        { _id: '3', name: 'Stainless Steel Screws 4x40mm (Box of 100)', price: 250, taxRate: 12, stock: 120, unit: 'box', category: 'Fasteners' },
        { _id: '4', name: 'Heavy Duty PVC Conduit Pipe 25mm (3m)', price: 180, taxRate: 18, stock: 85, unit: 'm', category: 'Plumbing' },
        { _id: '5', name: 'Finolex FlameGuard Copper Wire 1.5 sqmm (90m)', price: 1450, taxRate: 18, stock: 24, unit: 'roll', category: 'Electrical' },
        { _id: '6', name: 'Asian Paints Royale Luxury Emulsion (4L)', price: 2200, taxRate: 18, stock: 18, unit: 'pack', category: 'Paints' },
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
  
  const calculatedDiscount = discountType === 'PERCENT'
    ? ((cartSubtotal + cartTaxTotal) * (discountValue || 0)) / 100
    : (discountValue || 0);

  const cartGrandTotal = Math.max(0, cartSubtotal + cartTaxTotal - calculatedDiscount);

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    const selectedCust = customers.find((c) => c._id === selectedCustomerId);

    const finalCustomerName = selectedCust ? selectedCust.name : (custName.trim() || 'Walk-in Customer');
    const finalCustomerPhone = selectedCust ? (selectedCust.phone || '') : custPhone.trim();

    const invoicePayload: Invoice = {
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
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
      discount: calculatedDiscount,
      grandTotal: cartGrandTotal,
      paymentMode: paymentMode,
      paymentStatus: 'PAID',
    };

    try {
      const res = await api.post('/invoices', invoicePayload);
      setActiveReceipt(res.data);
      setCart([]);
      setDiscountValue(0);
      setCustName('');
      setCustPhone('');
      setSelectedCustomerId('');
    } catch {
      setActiveReceipt({ ...invoicePayload, invoiceNumber: `INV-${Date.now().toString().slice(-5)}` });
      setCart([]);
      setDiscountValue(0);
      setCustName('');
      setCustPhone('');
      setSelectedCustomerId('');
    }
  };

  const customerOptions = [
    { _id: '', name: 'Walk-in Customer (Guest)' },
    ...customers.map((c) => ({ _id: c._id, name: `${c.name} ${c.phone ? `(${c.phone})` : ''}` })),
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Products Grid */}
      <div className="lg:col-span-2 space-y-4">
        <TableFilter
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categories={categories}
          selectedCategory={selectedCategory}
          onCategorySelect={setSelectedCategory}
          placeholder="Search products by name or category..."
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {products
            .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())))
            .filter((p) => !selectedCategory || p.category === selectedCategory)
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

          {/* Optional Customer Selection / Details Section */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 mb-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <UserCheck className="w-4 h-4 text-blue-600" /> Customer Details <span className="text-slate-400 font-normal">(Optional)</span>
            </div>

            <CustomDropdown
              options={customerOptions}
              value={selectedCustomerId}
              onChange={(val) => {
                setSelectedCustomerId(val);
                const selected = customers.find((c) => c._id === val);
                if (selected) {
                  setCustName(selected.name);
                  setCustPhone(selected.phone || '');
                }
              }}
              placeholder="Select Existing Customer"
              compact
            />

            {!selectedCustomerId && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Customer Name (Optional)"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Mobile No (Optional)"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>

          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
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

        {/* Checkout Calculation & Discount */}
        <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
          <div className="flex justify-between text-sm text-slate-600 font-medium">
            <span>Subtotal</span>
            <span>₹{cartSubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-600 font-medium">
            <span>GST Tax</span>
            <span>₹{cartTaxTotal.toFixed(2)}</span>
          </div>

          {/* Discount Input Section */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Apply Discount</span>
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setDiscountType('FIXED')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    discountType === 'FIXED' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  ₹ Flat
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('PERCENT')}
                  className={`px-2 py-0.5 rounded-md transition-colors ${
                    discountType === 'PERCENT' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  % Percentage
                </button>
              </div>
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-500 pointer-events-none">
                {discountType === 'FIXED' ? '₹' : '%'}
              </span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={discountType === 'FIXED' ? 'Discount Amount (₹)' : 'Discount Percentage (%)'}
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {calculatedDiscount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
              <span>Discount {discountType === 'PERCENT' ? `(${discountValue}%)` : ''}</span>
              <span>-₹{calculatedDiscount.toFixed(2)}</span>
            </div>
          )}

          {/* Payment Mode Selector */}
          <div className="pt-1">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Payment Method</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['CASH', 'UPI', 'CARD', 'CREDIT'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-1.5 text-xs font-extrabold rounded-lg border transition-all ${
                    paymentMode === mode
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between text-sm font-black text-slate-900 text-lg border-t border-slate-100 pt-2">
            <span>Grand Total</span>
            <span className="text-amber-600">₹{cartGrandTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full h-12 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-base shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
          >
            <Printer className="w-5 h-5" /> Generate & Print Bill
          </button>
        </div>
      </div>

      {/* Invoice Receipt Printable Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 font-mono text-slate-900 border border-slate-200 my-auto">
            
            {/* Real POS Receipt Slip Content */}
            <div id="printable-receipt" className="space-y-3 bg-white text-black p-1 text-xs">
              
              {/* Store Header */}
              <div className="text-center space-y-1">
                <div className="font-extrabold text-base tracking-tight uppercase border-b border-black pb-1">
                  🛠️ {settings.storeName || 'BUILDPRO HARDWARE STORE'}
                </div>
                {settings.tagline && (
                  <p className="text-[11px] font-medium leading-tight">
                    {settings.tagline}
                  </p>
                )}
                {settings.address && (
                  <p className="text-[10px]">{settings.address}</p>
                )}
                {(settings.gstin || settings.phone) && (
                  <p className="text-[10px] font-bold">
                    {settings.gstin ? `GSTIN: ${settings.gstin}` : ''} {settings.gstin && settings.phone ? '|' : ''} {settings.phone ? `Ph: ${settings.phone}` : ''}
                  </p>
                )}
                <div className="border-t border-dashed border-black my-1" />
                <p className="text-[11px] font-bold tracking-widest uppercase">*** TAX INVOICE / BILL SLIP ***</p>
              </div>

              {/* Receipt Details */}
              <div className="border-t border-dashed border-black pt-1.5 space-y-0.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="font-bold">Invoice No:</span>
                  <span>{activeReceipt.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Date & Time:</span>
                  <span>{activeReceipt.createdAt ? new Date(activeReceipt.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }) : new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">Customer:</span>
                  <span className="font-bold truncate max-w-[150px] text-right">{activeReceipt.customerName || 'Walk-in Guest'}</span>
                </div>
                {activeReceipt.customerPhone && (
                  <div className="flex justify-between">
                    <span className="font-bold">Mobile:</span>
                    <span>{activeReceipt.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-bold">Counter/Billed By:</span>
                  <span>POS Terminal 01</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border-t border-dashed border-black pt-1.5">
                <div className="grid grid-cols-12 font-bold text-[10px] uppercase border-b border-black pb-1 mb-1">
                  <span className="col-span-6">Item Description</span>
                  <span className="col-span-2 text-center">Qty</span>
                  <span className="col-span-4 text-right">Amount (₹)</span>
                </div>

                <div className="space-y-1.5 py-1">
                  {activeReceipt.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 text-[11px] leading-tight">
                      <div className="col-span-6 pr-1">
                        <div className="font-bold truncate">{item.name}</div>
                        <div className="text-[9px] text-slate-700">@ ₹{item.price} ({item.taxRate || 0}% GST)</div>
                      </div>
                      <div className="col-span-2 text-center font-bold">{item.qty}</div>
                      <div className="col-span-4 text-right font-bold">₹{item.subtotal.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Calculations */}
              <div className="border-t border-dashed border-black pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Items Subtotal:</span>
                  <span>₹{activeReceipt.subtotal?.toFixed(2)}</span>
                </div>
                
                {/* GST Tax Breakdown */}
                {activeReceipt.taxTotal > 0 && (
                  <>
                    <div className="flex justify-between text-[10px]">
                      <span>CGST (Half Tax):</span>
                      <span>₹{(activeReceipt.taxTotal / 2).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span>SGST (Half Tax):</span>
                      <span>₹{(activeReceipt.taxTotal / 2).toFixed(2)}</span>
                    </div>
                  </>
                )}

                {activeReceipt.discount > 0 && (
                  <div className="flex justify-between font-bold">
                    <span>Discount Offered:</span>
                    <span>-₹{activeReceipt.discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="border-t-2 border-b-2 border-black py-1 flex justify-between font-black text-sm my-1">
                  <span>NET PAYABLE:</span>
                  <span>₹{activeReceipt.grandTotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-bold pt-0.5">
                  <span>Payment Mode:</span>
                  <span className="uppercase">{activeReceipt.paymentMode || 'CASH'}</span>
                </div>
                <div className="flex justify-between font-bold text-[10px] text-emerald-800">
                  <span>Payment Status:</span>
                  <span>PAID / VERIFIED</span>
                </div>
              </div>

              {/* Slip Footer Notes */}
              <div className="border-t border-dashed border-black pt-2 text-center text-[10px] space-y-1">
                {settings.thankYouNote && <p className="font-bold">{settings.thankYouNote}</p>}
                {settings.returnPolicy && <p>{settings.returnPolicy}</p>}
                {settings.footerNote && <p className="font-bold text-[9px] pt-1">{settings.footerNote}</p>}
              </div>

            </div>

            {/* Modal Buttons (Hidden in print) */}
            <div className="flex gap-2 pt-2 font-sans no-print">
              <button
                onClick={() => window.print()}
                className="flex-1 h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Thermal Slip
              </button>
              <button
                onClick={() => setActiveReceipt(null)}
                className="px-4 h-11 rounded-xl border border-slate-200 hover:bg-slate-100 font-bold text-xs text-slate-600 cursor-pointer"
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
