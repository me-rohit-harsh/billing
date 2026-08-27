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
}

export const defaultStoreSettings: StoreSettings = {
  storeName: 'BUILDPRO HARDWARE STORE',
  tagline: 'Tools, Fasteners, Electrical & Plumbing',
  address: 'Plot #42, Hardware Market, Main Road',
  gstin: '07AAAAA0000A1Z5',
  phone: '+91 98765 43210',
  thankYouNote: 'Thank you for visiting BuildPro Hardware!',
  returnPolicy: 'Goods once sold can be exchanged within 7 days with valid receipt.',
  footerNote: '*** HAVE A GREAT DAY ***',
};

interface StoreSettingsContextType {
  settings: StoreSettings;
  updateSettings: (newSettings: Partial<StoreSettings>) => void;
  resetSettings: () => void;
}

const StoreSettingsContext = createContext<StoreSettingsContextType | undefined>(undefined);

export function StoreSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings>(defaultStoreSettings);

  useEffect(() => {
    const saved = localStorage.getItem('billing_store_settings');
    if (saved) {
      try {
        setSettings({ ...defaultStoreSettings, ...JSON.parse(saved) });
      } catch {
        setSettings(defaultStoreSettings);
      }
    }
  }, []);

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
