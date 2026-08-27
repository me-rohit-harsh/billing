import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, BadRequestException, NotFoundException, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from '../schemas/customer.schema';
import { Category, CategoryDocument } from '../schemas/category.schema';
import { Product, ProductDocument } from '../schemas/product.schema';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(@InjectModel(Customer.name) private customerModel: Model<CustomerDocument>) {}

  @Get()
  async findAll(@Query('page') pageStr?: string, @Query('limit') limitStr?: string, @Query('search') search?: string) {
    if (pageStr || limitStr) {
      const page = Math.max(1, parseInt(pageStr || '1', 10));
      const limit = Math.max(1, parseInt(limitStr || '10', 10));
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (search) {
        filter.$or = [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      const [data, total] = await Promise.all([
        this.customerModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
        this.customerModel.countDocuments(filter).exec(),
      ]);

      return {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }
    return this.customerModel.find().sort({ createdAt: -1 }).exec();
  }

  @Post()
  async create(@Body() body: Partial<Customer>) {
    return new this.customerModel(body).save();
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<Customer>) {
    return this.customerModel.findByIdAndUpdate(id, body, { new: true }).exec();
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.customerModel.findByIdAndDelete(id).exec();
  }
}

@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  @Get()
  async findAll() {
    const categories = await this.categoryModel.find().sort({ name: 1 }).exec();
    if (categories.length === 0) {
      // Seed default hardware categories if database is empty
      const defaultNames = ['Power Tools', 'Fasteners', 'Plumbing', 'Electrical', 'Paints & Coatings', 'Hand Tools'];
      for (const name of defaultNames) {
        await new this.categoryModel({ name }).save();
      }
      return this.categoryModel.find().sort({ name: 1 }).exec();
    }
    return categories;
  }

  @Post()
  async create(@Body() body: Partial<Category>) {
    return new this.categoryModel(body).save();
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<Category>) {
    return this.categoryModel.findByIdAndUpdate(id, body, { new: true }).exec();
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const mappedProductsCount = await this.productModel.countDocuments({ category: category.name });
    if (mappedProductsCount > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because ${mappedProductsCount} product(s) are assigned to it.`
      );
    }

    return this.categoryModel.findByIdAndDelete(id).exec();
  }
}
