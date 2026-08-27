'use client';

import React, { useState, useEffect } from 'react';
import { useStoreSettings, defaultStoreSettings, themePalettes } from '@/context/StoreSettingsContext';
import { useToast } from '@/context/ToastContext';
import { Store, Tag, MapPin, FileText, Phone, HeartHandshake, ShieldAlert, Sparkles, Save, CheckCircle2, Download, Upload, Trash2, Loader2, Palette, Coins, Printer } from 'lucide-react';
import { api, getImageUrl } from '@/lib/api';
import { exportToJSON } from '@/lib/exportUtils';

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useStoreSettings();
  const { toast } = useToast();
  const [formData, setFormData] = useState(settings);
  const [isSavedAlert, setIsSavedAlert] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = (field: keyof typeof settings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingLogo(true);
      const data = new FormData();
      data.append('file', file);
      const res = await api.post('/products/upload-image', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.imageUrl) {
        const fullUrl = `http://localhost:5000${res.data.imageUrl}`;
        handleChange('logoUrl', fullUrl);
        toast.success('Store logo uploaded successfully!');
      }
    } catch {
      toast.error('Failed to upload logo image file.');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleExportSettings = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const success = exportToJSON(`store_settings_backup_${dateStr}`, formData);
    if (success) {
      toast.success('Exported store settings backup to JSON!');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.storeName.trim()) {
        toast.error('Store name cannot be empty');
        return;
      }
      updateSettings(formData);
      setIsSavedAlert(true);
      toast.success('Store settings saved successfully!');
      setTimeout(() => setIsSavedAlert(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save store settings';
      toast.error(msg);
    }
  };

  const handleReset = () => {
    try {
      resetSettings();
      setFormData(defaultStoreSettings);
      setIsSavedAlert(true);
      toast.info('Store settings reset to defaults');
      setTimeout(() => setIsSavedAlert(false), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset store settings';
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-600 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-amber-600/20 shrink-0">
            <Store className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Configure Store & Receipt Details</h1>
            <p className="text-slate-500 text-sm font-medium mt-0.5">
              Customize your hardware store branding, GSTIN, default stock alerts, and thermal bill slip layout
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportSettings}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            title="Export Settings Backup"
          >
            <Download className="w-4 h-4 text-amber-600" /> Export Backup
          </button>
          {isSavedAlert && (
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-xl font-bold text-xs animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Saved!</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Settings Form Pane */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">

          {/* Section 1: Store Branding */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-600" /> Store Branding & Header
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                Store / Outlet Name
              </label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                placeholder="e.g. BUILDPRO HARDWARE STORE"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" /> Tagline / Business Subtitle
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="e.g. Tools, Fasteners, Electrical & Plumbing"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Store Logo Branding</span>
                <span className="text-[11px] text-slate-400 font-normal lowercase">Upload image file or enter URL</span>
              </label>

              <div className="space-y-3">
                {/* File Upload Button & File Input */}
                <div className="flex items-center gap-3">
                  <label className="h-11 px-4 rounded-xl border border-slate-200 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center gap-2 cursor-pointer transition-all shadow-2xs">
                    {isUploadingLogo ? <Loader2 className="w-4 h-4 animate-spin text-amber-600" /> : <Upload className="w-4 h-4 text-amber-600" />}
                    <span>{isUploadingLogo ? 'Uploading Logo...' : 'Upload Store Logo File'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileUpload}
                      className="hidden"
                      disabled={isUploadingLogo}
                    />
                  </label>

                  {formData.logoUrl && (
                    <button
                      type="button"
                      onClick={() => handleChange('logoUrl', '')}
                      className="h-11 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Remove Custom Logo & Reset to BuildPro"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove Logo
                    </button>
                  )}
                </div>

                {/* Direct Image URL input */}
                <input
                  type="url"
                  value={formData.logoUrl || ''}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  placeholder="Or paste image URL (e.g. https://example.com/logo.png)"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                />

                {/* Live Logo Preview Container */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                  {formData.logoUrl ? (
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 p-1">
                      <img src={getImageUrl(formData.logoUrl)} alt="Store Logo Preview" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center text-white font-black text-xl shrink-0">
                      <Store className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="text-xs">
                    <p className="font-bold text-slate-900">
                      {formData.logoUrl ? 'Custom Store Logo Active' : `Store Branding: ${formData.storeName || 'BUILDPRO HARDWARE STORE'}`}
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      {formData.logoUrl
                        ? 'This custom logo will be rendered in the app sidebar alongside your store name.'
                        : `Sidebar branding will display your saved store name '${formData.storeName || 'BUILDPRO HARDWARE STORE'}'.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: App Panel Theme & Custom Color Picker */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-600" /> App Panel Theme & Custom Color Picker
            </h3>

            {/* Custom Color Picker Input */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-md shrink-0">
                  <input
                    type="color"
                    value={formData.themeHex || '#d97706'}
                    onChange={(e) => {
                      const hex = e.target.value;
                      setFormData((prev) => ({ ...prev, themeHex: hex, themeColor: 'custom' }));
                    }}
                    className="w-16 h-16 -top-2 -left-2 absolute cursor-pointer"
                    title="Click to Open Custom Color Picker"
                  />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs">Custom Brand Accent Color</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Click swatch to pick any color or type custom hex code</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-400">HEX:</span>
                <input
                  type="text"
                  value={formData.themeHex || '#d97706'}
                  onChange={(e) => {
                    const hex = e.target.value;
                    setFormData((prev) => ({ ...prev, themeHex: hex, themeColor: 'custom' }));
                  }}
                  placeholder="#d97706"
                  className="w-28 px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Quick Preset Color Palettes</span>
                <span className="text-[11px] text-slate-400 font-normal lowercase">Click to apply preset hex code</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {themePalettes.map((palette) => {
                  const isSelected = (formData.themeHex || '#d97706').toLowerCase() === palette.hex.toLowerCase();
                  return (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, themeColor: palette.id, themeHex: palette.hex }));
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                        isSelected
                          ? 'border-slate-900 bg-slate-900 text-white shadow-md ring-2 ring-slate-900/20'
                          : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 text-slate-800'
                      }`}
                    >
                      <span
                        style={{ backgroundColor: palette.hex }}
                        className="w-4 h-4 rounded-full shrink-0 shadow-2xs border border-white/40"
                      />
                      <span className="text-xs font-extrabold truncate">{palette.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-slate-400" /> Store Currency Symbol
                </label>
                <input
                  type="text"
                  required
                  value={formData.currencySymbol || '₹'}
                  onChange={(e) => handleChange('currencySymbol', e.target.value)}
                  placeholder="e.g. ₹ or $ or €"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Default Inventory & Low Stock Alerts */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" /> Default Inventory & Low Stock Alerts
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Default Low Stock Warning Threshold (pcs)</span>
                <span className="text-[11px] text-amber-600 font-semibold lowercase">Overrideable per product</span>
              </label>
              <input
                type="number"
                min={0}
                value={formData.defaultLowStockThreshold ?? 10}
                onChange={(e) => handleChange('defaultLowStockThreshold', Number(e.target.value))}
                placeholder="e.g. 10"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Products with stock level at or below this threshold trigger a low-stock alert, unless custom min stock is set on that product.
              </p>
            </div>
          </div>

          {/* Section 2: Location & Tax Registration */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-600" /> Location & Contact Info
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                Store Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="e.g. Plot #42, Hardware Market, Main Road"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" /> GSTIN Registration No
                </label>
                <input
                  type="text"
                  value={formData.gstin}
                  onChange={(e) => handleChange('gstin', e.target.value)}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" /> Contact Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Receipt Footer Terms & Messages */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 text-base border-b border-slate-100 pb-3 flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-amber-600" /> Thermal Receipt Footer Terms
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Thank You Message
              </label>
              <input
                type="text"
                value={formData.thankYouNote}
                onChange={(e) => handleChange('thankYouNote', e.target.value)}
                placeholder="e.g. Thank you for visiting BuildPro Hardware!"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> Return / Exchange Terms Policy
              </label>
              <textarea
                rows={2}
                value={formData.returnPolicy}
                onChange={(e) => handleChange('returnPolicy', e.target.value)}
                placeholder="e.g. Goods once sold can be exchanged within 7 days with valid receipt."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-slate-400" /> Receipt Footer Banner
              </label>
              <input
                type="text"
                value={formData.footerNote}
                onChange={(e) => handleChange('footerNote', e.target.value)}
                placeholder="e.g. *** HAVE A GREAT DAY ***"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <button
              type="submit"
              className="h-12 px-8 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-sm shadow-lg shadow-amber-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Save Store Settings
            </button>
          </div>
        </form>

        {/* Real-time Live Thermal Slip Preview Pane */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-4">
          <div className="bg-slate-900 text-white p-4 rounded-3xl flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Live Thermal Bill Preview</span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">80mm POS Slip</span>
          </div>

          <div className="bg-white border-2 border-slate-300 rounded-3xl p-6 shadow-xl font-mono text-xs space-y-3">
            {/* Store Header */}
            <div className="text-center space-y-1">
              <div className="font-extrabold text-sm uppercase border-b border-black pb-1">
                {formData.storeName || 'BUILDPRO HARDWARE STORE'}
              </div>
              {formData.tagline && (
                <p className="text-[10px] font-medium leading-tight">
                  {formData.tagline}
                </p>
              )}
              {formData.address && (
                <p className="text-[9px] text-slate-700">{formData.address}</p>
              )}
              {(formData.gstin || formData.phone) && (
                <p className="text-[9px] font-bold text-slate-900">
                  {formData.gstin ? `GSTIN: ${formData.gstin}` : ''} {formData.gstin && formData.phone ? '|' : ''} {formData.phone ? `Ph: ${formData.phone}` : ''}
                </p>
              )}
              <div className="border-t border-dashed border-black my-1" />
              <p className="text-[10px] font-bold tracking-widest uppercase">*** TAX INVOICE / BILL SLIP ***</p>
            </div>

            {/* Sample Metadata */}
            <div className="border-t border-dashed border-black pt-1 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span className="font-bold">Invoice No:</span>
                <span>INV-00042</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Date & Time:</span>
                <span>{new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">Customer:</span>
                <span className="font-bold">Walk-in Guest</span>
              </div>
            </div>

            {/* Sample Table */}
            <div className="border-t border-dashed border-black pt-1">
              <div className="grid grid-cols-12 font-bold text-[9px] uppercase border-b border-black pb-1 mb-1">
                <span className="col-span-6">Item</span>
                <span className="col-span-2 text-center">Qty</span>
                <span className="col-span-4 text-right">Amt (₹)</span>
              </div>
              <div className="space-y-1 text-[10px]">
                <div className="grid grid-cols-12">
                  <span className="col-span-6 font-bold truncate">DeWalt Drill Kit</span>
                  <span className="col-span-2 text-center font-bold">1</span>
                  <span className="col-span-4 text-right font-bold">₹4,999.00</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-6 font-bold truncate">Steel Screws (Box)</span>
                  <span className="col-span-2 text-center font-bold">2</span>
                  <span className="col-span-4 text-right font-bold">₹500.00</span>
                </div>
              </div>
            </div>

            {/* Sample Totals */}
            <div className="border-t border-dashed border-black pt-1.5 space-y-0.5 text-[10px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹5,499.00</span>
              </div>
              <div className="flex justify-between">
                <span>GST Tax (18%):</span>
                <span>₹989.82</span>
              </div>
              <div className="border-t-2 border-b-2 border-black py-1 flex justify-between font-black text-xs my-1">
                <span>NET PAYABLE:</span>
                <span>₹6,488.82</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Payment Mode:</span>
                <span>CASH (PAID)</span>
              </div>
            </div>

            {/* Footer Notes */}
            <div className="border-t border-dashed border-black pt-2 text-center text-[9px] space-y-0.5">
              {formData.thankYouNote && <p className="font-bold">{formData.thankYouNote}</p>}
              {formData.returnPolicy && <p className="text-slate-600">{formData.returnPolicy}</p>}
              {formData.footerNote && <p className="font-bold pt-0.5">{formData.footerNote}</p>}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
