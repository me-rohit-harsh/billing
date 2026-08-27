import { Controller, Get, Post, Body, Param, Delete, UseGuards, Query } from '@nestjs/common';
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
  async findAll(
    @Query('page') pageStr?: string,
    @Query('limit') limitStr?: string,
    @Query('search') search?: string,
    @Query('customer') customer?: string,
  ) {
    if (pageStr || limitStr) {
      const page = Math.max(1, parseInt(pageStr || '1', 10));
      const limit = Math.max(1, parseInt(limitStr || '10', 10));
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (search) {
        filter.$or = [
          { invoiceNumber: { $regex: search, $options: 'i' } },
          { customerName: { $regex: search, $options: 'i' } },
          { paymentMode: { $regex: search, $options: 'i' } },
        ];
      }
      if (customer) {
        filter.customerName = { $regex: customer, $options: 'i' };
      }

      const [data, total] = await Promise.all([
        this.invoiceModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
        this.invoiceModel.countDocuments(filter).exec(),
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }
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
