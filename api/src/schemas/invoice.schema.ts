import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InvoiceItem = {
  productId?: string;
  name: string;
  price: number;
  qty: number;
  taxRate: number;
  taxAmount: number;
  subtotal: number;
};

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ required: true, unique: true })
  invoiceNumber: string;

  @Prop()
  customerName: string;

  @Prop()
  customerPhone: string;

  @Prop({ type: Array, required: true })
  items: InvoiceItem[];

  @Prop({ required: true })
  subtotal: number;

  @Prop({ default: 0 })
  taxTotal: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop({ required: true })
  grandTotal: number;

  @Prop({ required: true, default: 'CASH' })
  paymentMode: 'CASH' | 'UPI' | 'CARD' | 'CREDIT';

  @Prop({ default: 'PAID' })
  paymentStatus: 'PAID' | 'UNPAID' | 'PARTIAL';

  @Prop()
  notes: string;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
