import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';

@Controller('invoices')
export class InvoicesController {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
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
    return created.save();
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.invoiceModel.findByIdAndDelete(id).exec();
  }
}
