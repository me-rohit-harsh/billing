import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { Product, ProductSchema } from './schemas/product.schema';
import { Category, CategorySchema } from './schemas/category.schema';
import { Customer, CustomerSchema } from './schemas/customer.schema';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';

import { ProductsController } from './products/products.controller';
import { InvoicesController } from './invoices/invoices.controller';
import { CustomersController, CategoriesController } from './controllers/supporting.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI') || 'mongodb://localhost:27017/billing_db',
      }),
    }),
    MongooseModule.forFeature([
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'storage', 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [
    ProductsController,
    InvoicesController,
    CustomersController,
    CategoriesController,
  ],
  providers: [],
})
export class AppModule {}
