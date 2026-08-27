'use client';

import React, { useState, useEffect } from 'react';
import { ShoppingCart, Printer, Package, Plus, Minus, UserCheck, Download, Maximize2, X, Trash2, Eye } from 'lucide-react';
import { api, Product, Customer, Invoice } from '@/lib/api';
import { TableFilter } from '@/components/shared/TableFilter';
import { CustomDropdown } from '@/components/shared/CustomDropdown';
import { useStoreSettings } from '@/context/StoreSettingsContext';
import { useToast } from '@/context/ToastContext';
import { exportToCSV } from '@/lib/exportUtils';

export default function POSPage() {
  const { settings } = useStoreSettings();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<(Product & { qty: number })[]>([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);

  // Optional Walk-in / Direct Customer details
  const [custName, setCustName] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');

  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'UPI' | 'CARD' | 'CREDIT'>('CASH');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categories, setCategories] = useState<{ _id: string; name: string }[]>([]);
  const [activeReceipt, setActiveReceipt] = useState<Invoice | null>(null);

  // POS Product Grid Columns Customization (3 / 4 / 5) with localStorage memory
  const [gridCols, setGridCols] = useState<number>(3);

  useEffect(() => {
    try {
      const savedCols = localStorage.getItem('pos_grid_cols');
      if (savedCols) {
        const parsed = parseInt(savedCols, 10);
        if ([3, 4, 5].includes(parsed)) {
          setGridCols(parsed);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleGridColsChange = (cols: number) => {
    setGridCols(cols);
    try {
      localStorage.setItem('pos_grid_cols', String(cols));
    } catch {
      // Ignore storage errors
    }
  };

  const filteredProducts = products
    .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())))
    .filter((p) => {
      if (!selectedCategories || selectedCategories.length === 0) return true;
      return (
        Boolean(p.category && selectedCategories.includes(p.category)) ||
        categories.some((c) => selectedCategories.includes(c._id) && c.name === p.category)
      );
    });

  const handleExportPOS = () => {
    if (cart.length > 0) {
      const fields = [
        { key: 'name', label: 'Item Name' },
        { key: 'category', label: 'Category' },
        { key: 'price', label: 'Unit Price (₹)' },
        { key: 'qty', label: 'Quantity' },
        { key: 'taxRate', label: 'Tax Rate (%)' },
        { key: 'itemTotal', label: 'Line Total (₹)', transform: (_: any, item: any) => item.price * item.qty },
      ];
      const dateStr = new Date().toISOString().slice(0, 10);
      const success = exportToCSV(`pos_cart_items_${dateStr}`, cart, fields);
      if (success) {
        toast.success(`Exported ${cart.length} cart item(s) to CSV!`);
      }
    } else if (filteredProducts.length > 0) {
      const fields = [
        { key: 'name', label: 'Product Name' },
        { key: 'category', label: 'Category' },
        { key: 'price', label: 'Price (₹)' },
        { key: 'stock', label: 'Stock On Hand' },
        { key: 'unit', label: 'Unit' },
      ];
      const dateStr = new Date().toISOString().slice(0, 10);
      const success = exportToCSV(`pos_quick_catalog_${dateStr}`, filteredProducts, fields);
      if (success) {
        toast.success(`Exported ${filteredProducts.length} POS catalog product(s) to CSV!`);
      }
    } else {
      toast.error('No POS items available to export.');
    }
  };

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
      toast.success(`Invoice #${res.data.invoiceNumber || ''} generated successfully!`);
      setCart([]);
      setDiscountValue(0);
      setCustName('');
      setCustPhone('');
      setSelectedCustomerId('');
    } catch {
      const fallbackInv = `INV-${Date.now().toString().slice(-5)}`;
      setActiveReceipt({ ...invoicePayload, invoiceNumber: fallbackInv });
      toast.success(`Invoice #${fallbackInv} generated (Offline mode)`);
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Products Grid */}
      <div className="lg:col-span-2 space-y-4">
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
          gridCols={gridCols}
          onGridColsChange={handleGridColsChange}
          onExport={handleExportPOS}
          exportLabel="Export POS Data"
          placeholder="Search products by name or category..."
        />
        <div className={`grid gap-4 transition-all duration-200 ${gridCols === 4
            ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-4'
            : gridCols === 5
              ? 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-5'
              : 'grid-cols-2 sm:grid-cols-3'
          }`}>
          {products
            .filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())))
            .filter((p) => {
              if (!selectedCategories || selectedCategories.length === 0) return true;
              return (
                Boolean(p.category && selectedCategories.includes(p.category)) ||
                categories.some((c) => selectedCategories.includes(c._id) && c.name === p.category)
              );
            })
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
      <div className="bg-white border border-slate-200 rounded-3xl p-4 flex flex-col justify-between shadow-sm lg:sticky lg:top-0 lg:h-[calc(100vh-7rem)] lg:max-h-[calc(100vh-7rem)] overflow-hidden">
        {/* Top Fixed Header & Customer Info */}
        <div className="shrink-0 space-y-2">
          <h2 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShoppingCart className="w-4 h-4 text-amber-600" /> Current Cart
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                {cart.reduce((a, b) => a + b.qty, 0)} Items
              </span>
              <button
                type="button"
                onClick={() => setIsCartModalOpen(true)}
                className="p-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 hover:text-amber-600 transition-colors cursor-pointer"
                title="Expand Full Screen Cart Modal"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </h2>

          {/* Customer Selection Section (Compact) */}
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
              <span className="flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-amber-600" /> Customer
              </span>
              {!selectedCustomerId && (
                <span className="text-[10px] text-slate-400 font-normal">Walk-in Guest</span>
              )}
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
              placeholder="Select Customer"
              compact
            />

            {!selectedCustomerId && (
              <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                <input
                  type="text"
                  placeholder="Name"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
                <input
                  type="text"
                  placeholder="Mobile"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Scrollable Cart Items Container (Spacious View) */}
        <div className="flex-1 min-h-[140px] overflow-y-auto my-2 pr-1 space-y-2 border-y border-slate-100 py-2 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-6">
              <ShoppingCart className="w-7 h-7 text-slate-300 mb-1.5" />
              <p className="font-extrabold text-xs text-slate-600">Cart is Empty</p>
              <p className="text-[11px] text-slate-400">Click products to add to cart</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item._id} className="flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 p-2 rounded-xl border border-slate-200/60 transition-all">
                <div className="min-w-0 flex-1 pr-2">
                  <h5 className="font-bold text-slate-900 text-xs truncate" title={item.name}>{item.name}</h5>
                  <div className="text-[11px] text-slate-500 font-medium">
                    ₹{item.price} × {item.qty} = <span className="font-extrabold text-slate-900">₹{(item.price * item.qty).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 bg-white p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => updateCartQty(item._id, item.qty - 1)}
                    className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center font-black text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer text-xs"
                  >
                    -
                  </button>
                  <span className="font-black text-xs min-w-[18px] text-center text-slate-900">{item.qty}</span>
                  <button
                    type="button"
                    onClick={() => updateCartQty(item._id, item.qty + 1)}
                    className="w-6 h-6 rounded-md bg-amber-600 text-white flex items-center justify-center font-black hover:bg-amber-700 transition-colors cursor-pointer text-xs"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pinned Bottom Footer Checkout Calculation & Discount */}
        <div className="shrink-0 space-y-1.5 pt-1">
          <div className="flex justify-between text-xs text-slate-600 font-semibold px-0.5">
            <span>Subtotal: <strong className="text-slate-900">₹{cartSubtotal.toFixed(2)}</strong></span>
            <span>Tax: <strong className="text-slate-900">₹{cartTaxTotal.toFixed(2)}</strong></span>
          </div>

          {/* Discount Section */}
          <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">Discount</span>
              <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 text-[10px] font-bold">
                <button
                  type="button"
                  onClick={() => setDiscountType('FIXED')}
                  className={`px-1.5 py-0.5 rounded transition-colors ${discountType === 'FIXED' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  ₹ Flat
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('PERCENT')}
                  className={`px-1.5 py-0.5 rounded transition-colors ${discountType === 'PERCENT' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  % Off
                </button>
              </div>
            </div>

            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs font-bold text-slate-400 pointer-events-none">
                {discountType === 'FIXED' ? '₹' : '%'}
              </span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={discountType === 'FIXED' ? 'Discount Amount' : 'Discount %'}
                value={discountValue || ''}
                onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full pl-7 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {calculatedDiscount > 0 && (
            <div className="flex justify-between text-xs text-emerald-700 font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
              <span>Discount</span>
              <span>-₹{calculatedDiscount.toFixed(2)}</span>
            </div>
          )}

          {/* Payment Mode Selector */}
          <div>
            <label className="block text-[10px] font-extrabold text-slate-700 uppercase tracking-wider mb-1">Payment Method</label>
            <div className="grid grid-cols-4 gap-1">
              {(['CASH', 'UPI', 'CARD', 'CREDIT'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`py-1 text-[11px] font-black rounded-lg border transition-all cursor-pointer ${paymentMode === mode
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-center text-sm font-black text-slate-900 border-t border-slate-200 pt-1.5">
            <span>Grand Total</span>
            <span className="text-lg text-amber-600 font-black">₹{cartGrandTotal.toFixed(2)}</span>
          </div>

          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="w-full h-10 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Generate & Print Bill
          </button>
        </div>
      </div>

      {/* Floating Bottom Cart Action Bar (Visible ONLY on mobile/tablet viewports < lg) */}
      {cart.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-[420px] z-40 bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-800 flex lg:hidden items-center justify-between animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 flex items-center justify-center font-black text-white shadow-md shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-300">Cart Summary</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 bg-slate-800 text-amber-400 rounded-full border border-slate-700">
                  {cart.reduce((a, b) => a + b.qty, 0)} items
                </span>
              </div>
              <div className="text-base font-black text-white">
                ₹{cartGrandTotal.toFixed(2)}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCartModalOpen(true)}
            className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Maximize2 className="w-4 h-4" /> View Full Cart
          </button>
        </div>
      )}

      {/* Full-Screen Cart & Checkout Modal */}
      {isCartModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200 my-auto">
            {/* Modal Body: 2-Column Split Pane */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
              {/* Left Column: Full Cart Items Table */}
              <div className="lg:col-span-7 p-6 border-r border-slate-200 flex flex-col justify-between overflow-y-auto space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-amber-600" /> Cart Items Breakdown
                      <span className="text-xs font-bold px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                        {cart.reduce((a, b) => a + b.qty, 0)} Items
                      </span>
                    </h3>
                    {cart.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setCart([])}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Clear Cart
                      </button>
                    )}
                  </div>

                  {cart.length === 0 ? (
                    <div className="py-16 text-center text-slate-400">
                      <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <p className="font-extrabold text-base text-slate-700">Your cart is currently empty</p>
                      <p className="text-xs text-slate-400 mt-1">Select items from the products catalog behind this window.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {cart.map((item) => (
                        <div key={item._id} className="py-3 flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-extrabold text-slate-900 text-sm truncate">{item.name}</h4>
                            <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold mt-0.5">
                              <span>Category: {item.category || 'General'}</span>
                              <span>•</span>
                              <span>Unit: ₹{item.price}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                              <button
                                type="button"
                                onClick={() => updateCartQty(item._id, item.qty - 1)}
                                className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center font-black text-slate-700 hover:bg-slate-200 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="font-black text-sm min-w-[24px] text-center text-slate-900">{item.qty}</span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(item._id, item.qty + 1)}
                                className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center font-black text-slate-700 hover:bg-slate-200 cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            <div className="w-24 text-right">
                              <span className="font-black text-slate-900 text-sm block">
                                ₹{(item.price * item.qty).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-bold">
                  <span>Showing {cart.length} distinct item(s)</span>
                  <span>GST Taxes included in item calculation</span>
                </div>
              </div>

              {/* Right Column: Customer Details & Checkout Calculation */}
              <div className="lg:col-span-5 p-6 bg-slate-50 flex flex-col justify-between overflow-y-auto space-y-6">
                <div className="space-y-4">
                  {/* Customer Selection */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-amber-600" /> Customer Information
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsCartModalOpen(false)}
                        className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-colors cursor-pointer"
                        title="Close Modal"
                      >
                        <X className="w-4 h-4" />
                      </button>
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
                      placeholder="Select Customer"
                    />

                    {!selectedCustomerId && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Customer Name"
                          value={custName}
                          onChange={(e) => setCustName(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                        />
                        <input
                          type="text"
                          placeholder="Mobile Number"
                          value={custPhone}
                          onChange={(e) => setCustPhone(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    )}
                  </div>

                  {/* Financial Breakdown */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                    <div className="flex justify-between text-sm text-slate-600 font-semibold">
                      <span>Items Subtotal</span>
                      <span className="font-bold text-slate-900">₹{cartSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600 font-semibold">
                      <span>GST Tax Total</span>
                      <span className="font-bold text-slate-900">₹{cartTaxTotal.toFixed(2)}</span>
                    </div>

                    {/* Discount Input */}
                    <div className="pt-2 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Apply Discount</span>
                        <div className="flex items-center bg-slate-100 border border-slate-200 rounded-lg p-0.5 text-xs font-bold">
                          <button
                            type="button"
                            onClick={() => setDiscountType('FIXED')}
                            className={`px-2.5 py-1 rounded-md transition-colors ${discountType === 'FIXED' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                              }`}
                          >
                            ₹ Flat
                          </button>
                          <button
                            type="button"
                            onClick={() => setDiscountType('PERCENT')}
                            className={`px-2.5 py-1 rounded-md transition-colors ${discountType === 'PERCENT' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-200'
                              }`}
                          >
                            % Off
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
                          placeholder={discountType === 'FIXED' ? 'Discount Amount' : 'Discount Percentage'}
                          value={discountValue || ''}
                          onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {calculatedDiscount > 0 && (
                      <div className="flex justify-between text-xs text-emerald-700 font-extrabold bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                        <span>Discount Savings</span>
                        <span>-₹{calculatedDiscount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Mode Selector */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Payment Mode</label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['CASH', 'UPI', 'CARD', 'CREDIT'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setPaymentMode(mode)}
                          className={`py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${paymentMode === mode
                              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Complete Sale Button */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20">
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Net Amount Payable</span>
                    <span className="text-2xl font-black text-amber-600">₹{cartGrandTotal.toFixed(2)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsCartModalOpen(false);
                      handleCheckout();
                    }}
                    disabled={cart.length === 0}
                    className="w-full h-12 rounded-2xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold text-base shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Printer className="w-5 h-5" /> Complete Sale & Print Bill
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Receipt Printable Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 font-mono text-slate-900 border border-slate-200 my-auto">

            {/* Real POS Receipt Slip Content */}
            <div id="printable-receipt" className="space-y-3 bg-white text-black p-1 text-xs">

              {/* Store Header */}
              <div className="text-center space-y-1">
                <div className="font-extrabold text-base tracking-tight uppercase border-b border-black pb-1">
                  {settings.storeName || 'BUILDPRO HARDWARE STORE'}
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
