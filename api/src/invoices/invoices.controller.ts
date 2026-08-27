import { Controller, Get, Post, Body, Param, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { Product, ProductDocument } from '../schemas/product.schema';
import { StockLog, StockLogDocument } from '../schemas/stock-log.schema';

@UseGuards(JwtAuthGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(StockLog.name) private stockLogModel: Model<StockLogDocument>,
  ) {}

  @Get()
  async findAll() {
    return this.invoiceModel.find().sort({ createdAt: -1 }).exec();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.invoiceModel.findById(id).exec();
  }

  @Post()
  async create(@Body() body: Partial<Invoice>) {
    const count = await this.invoiceModel.countDocuments();
    const invoiceNumber = body.invoiceNumber || `INV-${String(count + 1).padStart(5, '0')}`;
    const created = new this.invoiceModel({ ...body, invoiceNumber });
    const savedInvoice = await created.save();

    // Deduct stock for each billed product & create Stock Logs
    if (body.items && Array.isArray(body.items)) {
      for (const item of body.items) {
        if (item.productId) {
          const product = await this.productModel.findById(item.productId);
          if (product) {
            product.stock = Math.max(0, product.stock - item.qty);
            await product.save();

            await new this.stockLogModel({
              productId: product._id,
              productName: product.name,
              type: 'OUT',
              quantity: item.qty,
              reason: `Sale Invoice #${savedInvoice.invoiceNumber}`,
              referenceNumber: savedInvoice.invoiceNumber,
            }).save();
          }
        }
      }
    }

    return savedInvoice;
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.invoiceModel.findByIdAndDelete(id).exec();
  }
}
