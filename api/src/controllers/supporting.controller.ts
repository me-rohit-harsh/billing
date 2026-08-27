import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Customer, CustomerDocument } from '../schemas/customer.schema';
import { Category, CategoryDocument } from '../schemas/category.schema';

@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(@InjectModel(Customer.name) private customerModel: Model<CustomerDocument>) {}

  @Get()
  async findAll() { return this.customerModel.find().sort({ createdAt: -1 }).exec(); }

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
  constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) {}

  @Get()
  async findAll() { return this.categoryModel.find().sort({ name: 1 }).exec(); }

  @Post()
  async create(@Body() body: Partial<Category>) {
    return new this.categoryModel(body).save();
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.categoryModel.findByIdAndDelete(id).exec();
  }
}
