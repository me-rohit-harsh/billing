import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BackupSettings, BackupSettingsSchema } from './schemas/backup-settings.schema';
import { BackupLog, BackupLogSchema } from './schemas/backup-log.schema';
import { Product, ProductSchema } from '../schemas/product.schema';
import { Category, CategorySchema } from '../schemas/category.schema';
import { Invoice, InvoiceSchema } from '../schemas/invoice.schema';
import { Customer, CustomerSchema } from '../schemas/customer.schema';
import { StockLog, StockLogSchema } from '../schemas/stock-log.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { BackupService } from './backup.service';
import { BackupCronService } from './backup-cron.service';
import { BackupController } from './backup.controller';
import { CloudReceiverController } from './cloud-receiver.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BackupSettings.name, schema: BackupSettingsSchema },
      { name: BackupLog.name, schema: BackupLogSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: StockLog.name, schema: StockLogSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [BackupController, CloudReceiverController],
  providers: [BackupService, BackupCronService],
  exports: [BackupService],
})
export class BackupModule {}
