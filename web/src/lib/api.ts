import axios from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005/api';
export const API_BASE_ORIGIN = API_URL.replace(/\/api\/?$/, '');

export function getImageUrl(path?: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_ORIGIN}${cleanPath}`;
}

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
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
