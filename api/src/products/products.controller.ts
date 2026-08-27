import { Controller, Get, Post, Body, Param, Put, Delete, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from '../schemas/product.schema';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('products')
export class ProductsController {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  @Get()
  async findAll() {
    return this.productModel.find().sort({ createdAt: -1 }).exec();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productModel.findById(id).exec();
  }

  @Post()
  async create(@Body() body: Partial<Product>) {
    const created = new this.productModel(body);
    return created.save();
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
