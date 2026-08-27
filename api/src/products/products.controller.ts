import { Controller, Get, Post, Body, Param, Put, Delete, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../schemas/product.schema';
import { StockLog, StockLogDocument } from '../schemas/stock-log.schema';
import { diskStorage } from 'multer';
import { extname } from 'path';

@UseGuards(JwtAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(StockLog.name) private stockLogModel: Model<StockLogDocument>,
  ) {}

  @Get()
  async findAll() {
    return this.productModel.find().sort({ createdAt: -1 }).exec();
  }

  @Get('low-stock')
  async findLowStock() {
    const products = await this.productModel.find({ isActive: true }).exec();
    return products.filter((p) => p.stock <= (p.minStockAlert || 5));
  }

  @Get('stock-logs')
  async getStockLogs() {
    return this.stockLogModel.find().sort({ createdAt: -1 }).limit(100).exec();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productModel.findById(id).exec();
  }

  @Post()
  async create(@Body() body: Partial<Product>) {
    const created = new this.productModel(body);
    const saved = await created.save();

    if (saved.stock > 0) {
      await new this.stockLogModel({
        productId: saved._id,
        productName: saved.name,
        type: 'IN',
        quantity: saved.stock,
        reason: 'Initial Opening Stock',
      }).save();
    }

    return saved;
  }

  @Post(':id/adjust-stock')
  async adjustStock(
    @Param('id') id: string,
    @Body() body: { type: 'IN' | 'OUT' | 'ADJUSTMENT'; quantity: number; reason: string },
  ) {
    const product = await this.productModel.findById(id);
    if (!product) return null;

    let newStock = product.stock;
    if (body.type === 'IN') {
      newStock += body.quantity;
    } else if (body.type === 'OUT') {
      newStock = Math.max(0, newStock - body.quantity);
    } else {
      newStock = body.quantity;
    }

    product.stock = newStock;
    await product.save();

    await new this.stockLogModel({
      productId: product._id,
      productName: product.name,
      type: body.type,
      quantity: body.quantity,
      reason: body.reason || 'Manual Adjustment',
    }).save();

    return product;
  }

  @Post('upload-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './storage/uploads/products',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    return { imageUrl: `/uploads/products/${file.filename}` };
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<Product>) {
    return this.productModel.findByIdAndUpdate(id, body, { new: true }).exec();
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.productModel.findByIdAndDelete(id).exec();
  }
}
