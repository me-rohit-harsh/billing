import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from './app.module';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Product, ProductDocument } from './schemas/product.schema';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { Invoice, InvoiceDocument } from './schemas/invoice.schema';
import { StockLog, StockLogDocument } from './schemas/stock-log.schema';

async function seed() {
  console.log('--------------------------------------------------');
  console.log('🛠️  BUILDPRO HARDWARE POS - DATABASE SEEDER');
  console.log('--------------------------------------------------');

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

  const categoryModel = app.get<Model<CategoryDocument>>(getModelToken(Category.name));
  const productModel = app.get<Model<ProductDocument>>(getModelToken(Product.name));
  const customerModel = app.get<Model<CustomerDocument>>(getModelToken(Customer.name));
  const invoiceModel = app.get<Model<InvoiceDocument>>(getModelToken(Invoice.name));
  const stockLogModel = app.get<Model<StockLogDocument>>(getModelToken(StockLog.name));

  console.log('🧹 Clearing existing database collections...');
  await Promise.all([
    categoryModel.deleteMany({}),
    productModel.deleteMany({}),
    customerModel.deleteMany({}),
    invoiceModel.deleteMany({}),
    stockLogModel.deleteMany({}),
  ]);

  // 1. Seed Hardware Categories
  console.log('📦 Seeding Hardware Categories...');
  const categoryNames = [
    'Power Tools',
    'Hand Tools',
    'Fasteners & Fixtures',
    'Electrical & Wiring',
    'Plumbing & Fittings',
    'Paints & Coatings',
    'Safety & PPE',
    'Building Materials',
    'Measuring & Marking',
  ];

  const createdCategories = await categoryModel.insertMany(
    categoryNames.map((name) => ({ name }))
  );
  console.log(`   └─ Seeded ${createdCategories.length} categories.`);

  // 2. Seed Hardware Products
  console.log('🔧 Seeding Hardware Products & Catalog...');
  const rawProductsList = [
    {
      name: 'DeWalt 20V Max Cordless Drill Kit DCD771C2',
      sku: 'SKU-DW-20V',
      barcode: '885911475305',
      category: 'Power Tools',
      price: 6499,
      taxRate: 18,
      stock: 18,
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500',
    },
    {
      name: 'Bosch Professional Angle Grinder GWS 750W',
      sku: 'SKU-BOS-750',
      barcode: '3165140889204',
      category: 'Power Tools',
      price: 3450,
      taxRate: 18,
      stock: 4,
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=500',
    },
    {
      name: 'Makita Circular Saw 1800W 7-1/4 Inch',
      sku: 'SKU-MAK-5007',
      barcode: '088381016544',
      category: 'Power Tools',
      price: 8900,
      taxRate: 18,
      stock: 8,
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=500',
    },
    {
      name: 'Stanley FatMax Hammer Drill 18V',
      sku: 'SKU-STN-18V',
      barcode: '5035048651234',
      category: 'Power Tools',
      price: 4800,
      taxRate: 18,
      stock: 14,
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500',
    },
    {
      name: 'Stanley Steel Curved Claw Hammer 16 oz',
      sku: 'SKU-STN-HMR',
      barcode: '076174516213',
      category: 'Hand Tools',
      price: 650,
      taxRate: 18,
      stock: 35,
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=500',
    },
    {
      name: 'Knipex Combination Pliers 200mm Heavy Duty',
      sku: 'SKU-KNP-200',
      barcode: '4003773014072',
      category: 'Hand Tools',
      price: 1850,
      taxRate: 18,
      stock: 14,
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=500',
    },
    {
      name: 'Taparia Adjustable Spanner Wrench 300mm',
      sku: 'SKU-TAP-300',
      barcode: '8901234567890',
      category: 'Hand Tools',
      price: 720,
      taxRate: 18,
      stock: 22,
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=500',
    },
    {
      name: 'Stainless Steel Hex Bolts M8x50mm (Box 100)',
      sku: 'SKU-FAS-M8',
      barcode: '8901112223334',
      category: 'Fasteners & Fixtures',
      price: 450,
      taxRate: 12,
      stock: 80,
      unit: 'box',
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500',
    },
    {
      name: 'Self-Tapping Drywall Screws 3.5x25mm (Box 500)',
      sku: 'SKU-FAS-DW500',
      barcode: '8901112224445',
      category: 'Fasteners & Fixtures',
      price: 380,
      taxRate: 12,
      stock: 110,
      unit: 'box',
      imageUrl: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500',
    },
    {
      name: 'Finolex FlameGuard Copper Wire 1.5 sqmm (90m)',
      sku: 'SKU-FIN-1.5',
      barcode: '8902223334445',
      category: 'Electrical & Wiring',
      price: 1480,
      taxRate: 18,
      stock: 3,
      unit: 'roll',
      imageUrl: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=500',
    },
    {
      name: 'Finolex FlameGuard Copper Wire 2.5 sqmm (90m)',
      sku: 'SKU-FIN-2.5',
      barcode: '8902223335556',
      category: 'Electrical & Wiring',
      price: 2350,
      taxRate: 18,
      stock: 15,
      unit: 'roll',
      imageUrl: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=500',
    },
    {
      name: 'Schneider Electric 16A Single Pole MCB Breaker',
      sku: 'SKU-SCH-16A',
      barcode: '3606480088123',
      category: 'Electrical & Wiring',
      price: 220,
      taxRate: 18,
      stock: 48,
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=500',
    },
    {
      name: 'Havells Modular 6-Socket Extension Board 4m',
      sku: 'SKU-HAV-EXT',
      barcode: '8904005556667',
      category: 'Electrical & Wiring',
      price: 850,
      taxRate: 18,
      stock: 20,
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=500',
    },
    {
      name: 'Heavy Duty PVC Conduit Pipe 25mm (3m)',
      sku: 'SKU-PLM-PVC25',
      barcode: '8905556667778',
      category: 'Plumbing & Fittings',
      price: 180,
      taxRate: 18,
      stock: 5,
      unit: 'm',
      imageUrl: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=500',
    },
    {
      name: 'Supreme CPVC Brass Threaded Elbow 20mm',
      sku: 'SKU-PLM-ELB20',
      barcode: '8905556668889',
      category: 'Plumbing & Fittings',
      price: 145,
      taxRate: 18,
      stock: 90,
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=500',
    },
    {
      name: 'Jaquar Dual Flush Cistern Flush Valve Kit',
      sku: 'SKU-JQR-FLS',
      barcode: '8906667778880',
      category: 'Plumbing & Fittings',
      price: 1250,
      taxRate: 18,
      stock: 7,
      unit: 'set',
      imageUrl: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=500',
    },
    {
      name: 'Asian Paints Royale Luxury Emulsion White (4L)',
      sku: 'SKU-ASN-RYL4',
      barcode: '8907778889991',
      category: 'Paints & Coatings',
      price: 2450,
      taxRate: 18,
      stock: 14,
      unit: 'pack',
      imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500',
    },
    {
      name: 'Berger WeatherCoat All Guard Exterior (10L)',
      sku: 'SKU-BER-WTH10',
      barcode: '8907778880002',
      category: 'Paints & Coatings',
      price: 4200,
      taxRate: 18,
      stock: 6,
      unit: 'pack',
      imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500',
    },
    {
      name: '3M Half Facepiece Reusable Respirator Mask 6200',
      sku: 'SKU-3M-MSK',
      barcode: '051131070258',
      category: 'Safety & PPE',
      price: 1650,
      taxRate: 18,
      stock: 25,
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1618090584126-129cd1f3fbae?w=500',
    },
    {
      name: 'Karam Full Body Safety Harness Belt Kit',
      sku: 'SKU-KRM-HRN',
      barcode: '8908889990003',
      category: 'Safety & PPE',
      price: 2100,
      taxRate: 18,
      stock: 10,
      unit: 'set',
      imageUrl: 'https://images.unsplash.com/photo-1618090584126-129cd1f3fbae?w=500',
    },
    {
      name: 'Ultratech Cement OPC 53 Grade (50kg Bag)',
      sku: 'SKU-ULT-OPC53',
      barcode: '8909990001114',
      category: 'Building Materials',
      price: 395,
      taxRate: 18,
      stock: 150,
      unit: 'pack',
      imageUrl: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500',
    },
    {
      name: 'Bosch Professional Laser Distance Measure 50m',
      sku: 'SKU-BOS-LSR50',
      barcode: '3165140838123',
      category: 'Measuring & Marking',
      price: 4990,
      taxRate: 18,
      stock: 8,
      unit: 'pcs',
      imageUrl: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=500',
    },
  ];

  const createdProducts = await productModel.insertMany(rawProductsList);
  console.log(`   └─ Seeded ${createdProducts.length} hardware products.`);

  // 3. Seed Customers
  console.log('👥 Seeding Customers Directory...');
  const rawCustomersList = [
    { name: 'Rajesh Sharma Construction', phone: '+91 98765 43210', email: 'rajesh@sharmaconstruction.com', address: 'Plot 42, Industrial Area, Sector 62', balanceDue: 0 },
    { name: 'Suraj Electrical & Enterprises', phone: '+91 99887 76655', email: 'suraj@surajelectrical.com', address: 'Shop 14, Main Hardware Market', balanceDue: 14200 },
    { name: 'Amit Verma Plumbing Works', phone: '+91 91234 56789', email: 'amit@vermaplumbing.in', address: 'Block C, Green Park Extension', balanceDue: 0 },
    { name: 'Priya Interior Designers', phone: '+91 97654 32109', email: 'info@priyainteriors.com', address: 'Studio 9, Design Enclave', balanceDue: 0 },
    { name: 'Vikram Singh Builders Pvt Ltd', phone: '+91 98111 22334', email: 'vikram@singhbuilders.com', address: 'Tower A, Builder Heights', balanceDue: 28500 },
    { name: 'Karan Malhotra Infra Solutions', phone: '+91 98222 33445', email: 'karan@malhotrainfra.in', address: 'Site Office 4, Highway Project', balanceDue: 8400 },
    { name: 'Sunil Kumar Contracting Co', phone: '+91 98333 44556', email: 'sunil@skcontracting.com', address: '24 City Center Mall', balanceDue: 0 },
    { name: 'Anil Kapoor Hardware Store', phone: '+91 98444 55667', email: 'anil@kapoorhardware.com', address: 'Market Road No. 2', balanceDue: 5200 },
  ];

  const createdCustomers = await customerModel.insertMany(rawCustomersList);
  console.log(`   └─ Seeded ${createdCustomers.length} customer profiles.`);

  // 4. Seed Invoices & Stock Logs
  console.log('🧾 Seeding Historical Invoices & Stock Movement Logs...');
  const paymentModes: Array<'CASH' | 'UPI' | 'CARD' | 'CREDIT'> = ['CASH', 'UPI', 'CARD', 'CREDIT'];
  const invoicesToCreate: any[] = [];
  const stockLogsToCreate: any[] = [];

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let i = 1; i <= 35; i++) {
    const invNum = `INV-${String(i + 100).padStart(5, '0')}`;
    const custIndex = i % createdCustomers.length;
    const cust = createdCustomers[custIndex];
    const mode = paymentModes[i % paymentModes.length];
    const status = mode === 'CREDIT' ? (i % 2 === 0 ? 'PARTIAL' : 'UNPAID') : 'PAID';

    const daysOffset = (i * 1.7) % 55;
    const invDate = new Date(now - daysOffset * dayMs);

    const prod1 = createdProducts[(i * 2) % createdProducts.length];
    const prod2 = createdProducts[(i * 3 + 1) % createdProducts.length];
    const qty1 = (i % 4) + 1;
    const qty2 = (i % 3) + 1;

    const sub1 = prod1.price * qty1;
    const tax1 = (sub1 * prod1.taxRate) / 100;

    const sub2 = prod2.price * qty2;
    const tax2 = (sub2 * prod2.taxRate) / 100;

    const subtotal = sub1 + sub2;
    const taxTotal = tax1 + tax2;
    const discount = i % 5 === 0 ? 300 : 0;
    const grandTotal = Math.max(0, subtotal + taxTotal - discount);

    invoicesToCreate.push({
      invoiceNumber: invNum,
      customerName: cust.name,
      customerPhone: cust.phone,
      items: [
        {
          productId: prod1._id.toString(),
          name: prod1.name,
          price: prod1.price,
          qty: qty1,
          taxRate: prod1.taxRate,
          taxAmount: tax1,
          subtotal: sub1,
        },
        {
          productId: prod2._id.toString(),
          name: prod2.name,
          price: prod2.price,
          qty: qty2,
          taxRate: prod2.taxRate,
          taxAmount: tax2,
          subtotal: sub2,
        },
      ],
      subtotal,
      taxTotal,
      discount,
      grandTotal,
      paymentMode: mode,
      paymentStatus: status,
      createdAt: invDate,
      updatedAt: invDate,
    });

    stockLogsToCreate.push({
      productId: prod1._id.toString(),
      productName: prod1.name,
      type: 'OUT',
      quantity: qty1,
      reason: `Sale Invoice #${invNum}`,
      referenceNumber: invNum,
      createdAt: invDate,
    });
  }

  const createdInvoices = await invoiceModel.insertMany(invoicesToCreate);
  await stockLogModel.insertMany(stockLogsToCreate);
  console.log(`   └─ Seeded ${createdInvoices.length} invoices and ${stockLogsToCreate.length} stock logs.`);

  console.log('--------------------------------------------------');
  console.log('🎉 SUCCESS: BuildPro Hardware POS Database Seeded!');
  console.log('--------------------------------------------------');

  await app.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Database seeding failed:', err);
  process.exit(1);
});
