import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BackupLogDocument = BackupLog & Document;

@Schema({ timestamps: true })
export class BackupLog {
  @Prop({ required: true })
  storeId: string;

  @Prop({ required: true })
  backupType: 'MANUAL' | 'SCHEDULED' | 'SHUTDOWN';

  @Prop({ required: true })
  status: 'SUCCESS' | 'FAILED' | 'PENDING_ONLINE_RETRY';

  @Prop({ default: 0 })
  totalDocuments: number;

  @Prop({ default: 0 })
  fileSizeBytes: number;

  @Prop()
  cloudUploadedAt?: Date;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object })
  collectionCounts: Record<string, number>;
}

export const BackupLogSchema = SchemaFactory.createForClass(BackupLog);
