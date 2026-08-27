import axios from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_URL,
});

export interface Product {
  _id: string;
  name: string;
  sku?: string;
  barcode?: string;
  category?: string;
  price: number;
  taxRate: number;
  stock: number;
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
