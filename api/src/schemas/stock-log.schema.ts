import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StockLogDocument = StockLog & Document;

@Schema({ timestamps: true })
export class StockLog {
  @Prop({ required: true })
  productId: string;

  @Prop({ required: true })
  productName: string;

  @Prop({ required: true })
  type: 'IN' | 'OUT' | 'ADJUSTMENT';

  @Prop({ required: true })
  quantity: number;

  @Prop()
  reason: string;

  @Prop()
  referenceNumber: string;
}

export const StockLogSchema = SchemaFactory.createForClass(StockLog);
