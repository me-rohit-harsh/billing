import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BackupSettingsDocument = BackupSettings & Document;

@Schema({ timestamps: true })
export class BackupSettings {
  @Prop({ default: true })
  enabled: boolean;

  // Backup frequency mode: 'DAILY' | 'INTERVAL' | 'MANUAL'
  @Prop({ default: 'DAILY' })
  frequency: 'DAILY' | 'INTERVAL' | 'MANUAL';

  // Interval in hours if frequency is 'INTERVAL' (e.g. 6, 12, 24)
  @Prop({ default: 24 })
  intervalHours: number;

  // Target daily backup time if frequency is 'DAILY' (HH:mm format e.g. "22:00")
  @Prop({ default: '22:00' })
  dailyBackupTime: string;

  // Remote cloud server backup receiver URL
  @Prop({ default: 'https://backup.yourserver.com/api/v1/backups/upload' })
  cloudEndpointUrl: string;

  // Store ID / Device Name for identifying this store's backup in the cloud
  @Prop({ default: 'STORE_POS_01' })
  storeId: string;

  // Store API Secret Key for authenticating cloud upload
  @Prop({ default: 'secret-store-backup-key-123' })
  apiKey: string;

  // Auto upload to cloud when internet connection is detected
  @Prop({ default: true })
  autoCloudUpload: boolean;

  // Last successful backup timestamp
  @Prop()
  lastBackupAt?: Date;

  // Status of the last backup operation
  @Prop({ default: 'NEVER_RUN' })
  lastBackupStatus: 'SUCCESS' | 'FAILED' | 'PENDING_ONLINE_RETRY' | 'NEVER_RUN';

  // Error message if last backup failed
  @Prop()
  lastBackupError?: string;

  // Total collections backed up in last snapshot
  @Prop({ default: 0 })
  lastBackupDocumentCount: number;
}

export const BackupSettingsSchema = SchemaFactory.createForClass(BackupSettings);
