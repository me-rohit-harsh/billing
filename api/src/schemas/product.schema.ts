import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  name: string;

  @Prop()
  sku: string;

  @Prop()
  barcode: string;

  @Prop()
  category: string;

  @Prop({ required: true, default: 0 })
  price: number;

  @Prop({ default: 0 })
  costPrice: number;

  @Prop({ default: 0 })
  taxRate: number; // e.g. 18 for 18% GST

  @Prop({ default: 0 })
  stock: number;

  @Prop({ default: 5 })
  minStockAlert: number;

  @Prop({ default: 'pcs' })
  unit: string;

  @Prop()
  imageUrl: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
