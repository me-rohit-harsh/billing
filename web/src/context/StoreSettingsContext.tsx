'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface StoreSettings {
  storeName: string;
  tagline: string;
  address: string;
  gstin: string;
  phone: string;
  thankYouNote: string;
  returnPolicy: string;
  footerNote: string;
  defaultLowStockThreshold: number;
  logoUrl?: string;
  themeColor: string;
  themeHex: string;
  currencySymbol: string;
}

export const themePalettes = [
  { id: 'amber', name: 'Amber / Gold', hex: '#d97706', bgClass: 'bg-amber-600' },
  { id: 'blue', name: 'Sapphire Blue', hex: '#2563eb', bgClass: 'bg-blue-600' },
  { id: 'emerald', name: 'Forest Emerald', hex: '#059669', bgClass: 'bg-emerald-600' },
  { id: 'purple', name: 'Violet Purple', hex: '#7c3aed', bgClass: 'bg-purple-600' },
  { id: 'rose', name: 'Crimson Rose', hex: '#e11d48', bgClass: 'bg-rose-600' },
  { id: 'indigo', name: 'Deep Indigo', hex: '#4f46e5', bgClass: 'bg-indigo-600' },
  { id: 'teal', name: 'Ocean Teal', hex: '#0d9488', bgClass: 'bg-teal-600' },
  { id: 'cyan', name: 'Electric Cyan', hex: '#0891b2', bgClass: 'bg-cyan-600' },
  { id: 'orange', name: 'Burnt Orange', hex: '#ea580c', bgClass: 'bg-orange-600' },
  { id: 'pink', name: 'Neon Pink', hex: '#db2777', bgClass: 'bg-pink-600' },
  { id: 'lime', name: 'Lime Green', hex: '#65a30d', bgClass: 'bg-lime-600' },
  { id: 'slate', name: 'Midnight Slate', hex: '#334155', bgClass: 'bg-slate-700' },
];

export const defaultStoreSettings: StoreSettings = {
  storeName: 'BUILDPRO HARDWARE STORE',
  tagline: 'Tools, Fasteners, Electrical & Plumbing',
  address: 'Plot #42, Hardware Market, Main Road',
  gstin: '07AAAAA0000A1Z5',
  phone: '+91 98765 43210',
  thankYouNote: 'Thank you for visiting BuildPro Hardware!',
  returnPolicy: 'Goods once sold can be exchanged within 7 days with valid receipt.',
  footerNote: '*** HAVE A GREAT DAY ***',
  defaultLowStockThreshold: 10,
  logoUrl: '',
  themeColor: 'amber',
  themeHex: '#d97706',
  currencySymbol: '₹',
};

interface StoreSettingsContextType {
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  resetSettings: () => void;
}

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

function hexToRgb(hex: string) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16) || 0;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function adjustColorBrightness(hex: string, percent: number) {
  const { r, g, b } = hexToRgb(hex);
  const R = Math.max(0, Math.min(255, Math.round(r + (255 - r) * (percent / 100))));
  const G = Math.max(0, Math.min(255, Math.round(g + (255 - g) * (percent / 100))));
  const B = Math.max(0, Math.min(255, Math.round(b + (255 - b) * (percent / 100))));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

function darkenColor(hex: string, percent: number) {
  const { r, g, b } = hexToRgb(hex);
  const R = Math.max(0, Math.min(255, Math.round(r * (1 - percent / 100))));
  const G = Math.max(0, Math.min(255, Math.round(g * (1 - percent / 100))));
  const B = Math.max(0, Math.min(255, Math.round(b * (1 - percent / 100))));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
}

export function updateBrandCSSVariables(hex: string) {
  if (typeof document === 'undefined') return;
  const validHex = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#d97706';

  const primary = validHex;
  const hover = darkenColor(validHex, 15);
  const light = adjustColorBrightness(validHex, 90);
  const border = adjustColorBrightness(validHex, 75);
  const text = darkenColor(validHex, 40);

  const root = document.documentElement;
  root.style.setProperty('--brand-primary', primary);
  root.style.setProperty('--brand-hover', hover);
  root.style.setProperty('--brand-light', light);
  root.style.setProperty('--brand-border', border);
  root.style.setProperty('--brand-text', text);
}

export function StoreSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(defaultStoreSettings);

  useEffect(() => {
    const saved = localStorage.getItem('billing_store_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings({ ...defaultStoreSettings, ...parsed });
        updateBrandCSSVariables(parsed.themeHex || defaultStoreSettings.themeHex);
      } catch {
        setSettings(defaultStoreSettings);
        updateBrandCSSVariables(defaultStoreSettings.themeHex);
      }
    } else {
      updateBrandCSSVariables(defaultStoreSettings.themeHex);
    }
  }, []);

  useEffect(() => {
    const hex = settings.themeHex || '#d97706';
    updateBrandCSSVariables(hex);
  }, [settings.themeHex]);

  const updateSettings = (newSettings: Partial<StoreSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('billing_store_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const resetSettings = () => {
    setSettings(defaultStoreSettings);
    localStorage.removeItem('billing_store_settings');
  };

  return (
    <StoreSettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </StoreSettingsContext.Provider>
  );
}

export function useStoreSettings() {
  const context = useContext(StoreSettingsContext);
  if (!context) {
    throw new Error('useStoreSettings must be used within a StoreSettingsProvider');
  }
  return context;
}
