import axios from 'axios';

export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    
    // On production/live domains, prevent any fallback to localhost (avoids Chrome PNA local network access prompt)
    if (!isLocalhost) {
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl;
      }
      return '/api';
    }
  }

  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';
}

export function getApiBaseOrigin(): string {
  const url = getApiUrl();
  if (url.startsWith('/')) {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
  return url.replace(/\/api\/?$/, '');
}

export function getImageUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const origin = getApiBaseOrigin();
  return `${origin}${cleanPath}`;
}

export const API_URL = getApiUrl();
export const API_BASE_ORIGIN = getApiBaseOrigin();

export const api = axios.create();

api.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('billing_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response && error.response.status === 401) {
      localStorage.removeItem('billing_auth_token');
      localStorage.removeItem('billing_auth_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
      }
    }
    return Promise.reject(error);
  }
);

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
}

export interface Product {
  _id: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  price: number;
  taxRate: number;
  stock: number;
  minStockAlert?: number;
  unit: string;
  imageUrl?: string;
}

export interface Customer {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  balanceDue?: number;
  ordersCount?: number;
  totalSpent?: number;
}

export interface InvoiceItem {
  productId?: string;
  name: string;
  price: number;
  qty: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
}

export interface Invoice {
  _id?: string;
  invoiceNumber?: string;
  customerName?: string;
  customerPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxTotal: number;
  discount: number;
  grandTotal: number;
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'CREDIT';
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';
  createdAt?: string;
}
