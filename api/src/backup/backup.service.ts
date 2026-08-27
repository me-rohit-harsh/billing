import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BackupSettings, BackupSettingsDocument } from './schemas/backup-settings.schema';
import { BackupLog, BackupLogDocument } from './schemas/backup-log.schema';
import { Product, ProductDocument } from '../schemas/product.schema';
import { Category, CategoryDocument } from '../schemas/category.schema';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { Customer, CustomerDocument } from '../schemas/customer.schema';
import { StockLog, StockLogDocument } from '../schemas/stock-log.schema';
import { User, UserDocument } from '../schemas/user.schema';

export class BackupMetadataDto {
  version: string;
  storeId: string;
  exportedAt: string;
  totalDocuments: number;
  collectionCounts: Record<string, number>;
}

export class BackupDataDto {
  products: any[];
  categories: any[];
  invoices: any[];
  customers: any[];
  stockLogs: any[];
  users: any[];
}

export class BackupSnapshotPayload {
  metadata: BackupMetadataDto;
  data: BackupDataDto;
}

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger(BackupService.name);

  constructor(
    @InjectModel(BackupSettings.name) private backupSettingsModel: Model<BackupSettingsDocument>,
    @InjectModel(BackupLog.name) private backupLogModel: Model<BackupLogDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(StockLog.name) private stockLogModel: Model<StockLogDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async onModuleInit() {
    await this.getSettings();
  }

  // Retrieve or initialize local store backup settings
  async getSettings(): Promise<BackupSettingsDocument> {
    let settings = await this.backupSettingsModel.findOne();
    if (!settings) {
      settings = await this.backupSettingsModel.create({
        enabled: true,
        frequency: 'DAILY',
        intervalHours: 24,
        dailyBackupTime: '22:00',
        cloudEndpointUrl: 'http://localhost:5000/api/v1/backups/upload',
        storeId: 'STORE_POS_01',
        apiKey: 'secret-store-backup-key-123',
        autoCloudUpload: true,
        lastBackupStatus: 'NEVER_RUN',
      });
    }
    return settings;
  }

  // Update backup settings
  async updateSettings(dto: Partial<BackupSettings>): Promise<BackupSettingsDocument> {
    const settings = await this.getSettings();
    Object.assign(settings, dto);
    return settings.save();
  }

  // Generate full database snapshot payload
  async exportFullDatabase(): Promise<BackupSnapshotPayload> {
    const settings = await this.getSettings();

    const [products, categories, invoices, customers, stockLogs, users] = await Promise.all([
      this.productModel.find().lean().exec(),
      this.categoryModel.find().lean().exec(),
      this.invoiceModel.find().lean().exec(),
      this.customerModel.find().lean().exec(),
      this.stockLogModel.find().lean().exec(),
      this.userModel.find().select('-password').lean().exec(),
    ]);

    const collectionCounts = {
      products: products.length,
      categories: categories.length,
      invoices: invoices.length,
      customers: customers.length,
      stockLogs: stockLogs.length,
      users: users.length,
    };

    const totalDocuments = Object.values(collectionCounts).reduce((a, b) => a + b, 0);

    return {
      metadata: {
        version: '1.0.0',
        storeId: settings.storeId || 'STORE_POS_01',
        exportedAt: new Date().toISOString(),
        totalDocuments,
        collectionCounts,
      },
      data: {
        products,
        categories,
        invoices,
        customers,
        stockLogs,
        users,
      },
    };
  }

  // Upload snapshot payload to remote cloud server using native fetch
  async uploadToCloud(snapshot: BackupSnapshotPayload): Promise<{ success: boolean; message: string }> {
    const settings = await this.getSettings();

    if (!settings.cloudEndpointUrl) {
      throw new Error('Cloud backup endpoint URL is not configured.');
    }

    try {
      this.logger.log(`Attempting cloud backup upload to ${settings.cloudEndpointUrl}...`);

      const response = await fetch(settings.cloudEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-store-id': settings.storeId,
          'x-api-key': settings.apiKey,
        },
        body: JSON.stringify(snapshot),
      });

      const resData: any = await response.json().catch(() => ({}));

      if (response.ok) {
        return { success: true, message: resData?.message || 'Backup uploaded successfully.' };
      }
      return { success: false, message: resData?.message || `Server returned HTTP ${response.status}` };
    } catch (err: any) {
      const errMsg = err?.message || 'Network error / cloud server unreachable';
      this.logger.warn(`Cloud backup upload failed: ${errMsg}`);
      return { success: false, message: errMsg };
    }
  }

  // Trigger immediate backup (Manual or Scheduled)
  async triggerBackup(type: 'MANUAL' | 'SCHEDULED' | 'SHUTDOWN' = 'MANUAL') {
    const settings = await this.getSettings();
    this.logger.log(`Starting ${type} database backup snapshot...`);

    try {
      const snapshot = await this.exportFullDatabase();
      const snapshotJsonStr = JSON.stringify(snapshot);
      const fileSizeBytes = Buffer.byteLength(snapshotJsonStr, 'utf8');

      let cloudUploadResult = { success: false, message: 'Cloud upload disabled or offline' };

      if (settings.autoCloudUpload && settings.cloudEndpointUrl) {
        cloudUploadResult = await this.uploadToCloud(snapshot);
      }

      const isSuccess = !settings.autoCloudUpload || cloudUploadResult.success;
      const status = isSuccess ? 'SUCCESS' : 'PENDING_ONLINE_RETRY';

      // Update settings state
      settings.lastBackupAt = new Date();
      settings.lastBackupStatus = status;
      settings.lastBackupDocumentCount = snapshot.metadata.totalDocuments;
      settings.lastBackupError = isSuccess ? undefined : cloudUploadResult.message;
      await settings.save();

      // Write log record
      const log = await this.backupLogModel.create({
        storeId: settings.storeId,
        backupType: type,
        status,
        totalDocuments: snapshot.metadata.totalDocuments,
        fileSizeBytes,
        cloudUploadedAt: cloudUploadResult.success ? new Date() : undefined,
        errorMessage: isSuccess ? undefined : cloudUploadResult.message,
        collectionCounts: snapshot.metadata.collectionCounts,
      });

      return {
        success: isSuccess,
        status,
        snapshot,
        log,
        message: isSuccess
          ? `Backup completed successfully (${snapshot.metadata.totalDocuments} records).`
          : `Local backup snapshot generated. Cloud upload pending (${cloudUploadResult.message}).`,
      };
    } catch (error: any) {
      this.logger.error(`Backup execution error: ${error.message}`, error.stack);

      settings.lastBackupStatus = 'FAILED';
      settings.lastBackupError = error.message;
      await settings.save();

      await this.backupLogModel.create({
        storeId: settings.storeId,
        backupType: type,
        status: 'FAILED',
        errorMessage: error.message,
        collectionCounts: {},
      });

      throw error;
    }
  }

  // Get recent backup logs
  async getLogs(limit = 20): Promise<BackupLogDocument[]> {
    return this.backupLogModel.find().sort({ createdAt: -1 }).limit(limit).exec();
  }

  // Restore database from a snapshot (Optional safety recovery feature)
  async restoreFromSnapshot(snapshot: BackupSnapshotPayload) {
    if (!snapshot || !snapshot.data) {
      throw new Error('Invalid snapshot file format.');
    }

    const { products, categories, invoices, customers, stockLogs, users } = snapshot.data;

    this.logger.warn(`Restoring database from snapshot dated ${snapshot.metadata?.exportedAt}...`);

    if (products?.length) {
      await this.productModel.deleteMany({});
      await this.productModel.insertMany(products);
    }
    if (categories?.length) {
      await this.categoryModel.deleteMany({});
      await this.categoryModel.insertMany(categories);
    }
    if (invoices?.length) {
      await this.invoiceModel.deleteMany({});
      await this.invoiceModel.insertMany(invoices);
    }
    if (customers?.length) {
      await this.customerModel.deleteMany({});
      await this.customerModel.insertMany(customers);
    }
    if (stockLogs?.length) {
      await this.stockLogModel.deleteMany({});
      await this.stockLogModel.insertMany(stockLogs);
    }
    if (users?.length) {
      await this.userModel.deleteMany({});
      await this.userModel.insertMany(users);
    }

    return {
      success: true,
      message: `Restored ${snapshot.metadata?.totalDocuments || 0} documents successfully.`,
    };
  }
}
