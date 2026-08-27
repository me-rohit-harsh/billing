import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Invoice, InvoiceDocument } from '../schemas/invoice.schema';
import { Product, ProductDocument } from '../schemas/product.schema';
import { Customer, CustomerDocument } from '../schemas/customer.schema';
import { Category, CategoryDocument } from '../schemas/category.schema';
import { StockLog, StockLogDocument } from '../schemas/stock-log.schema';

function getStartDateForRange(range: string): Date | null {
  const now = new Date();
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  if (range === '7d') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (range === '30d') {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }
  if (range === 'this_month') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (range === 'this_year') {
    return new Date(now.getFullYear(), 0, 1);
  }
  return null; // 'all'
}

@Controller('dashboard')
export class DashboardController {
  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(StockLog.name) private stockLogModel: Model<StockLogDocument>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getDashboardStats(@Query('range') range: string = '30d') {
    const startDate = getStartDateForRange(range);
    const invoiceQuery = startDate ? { createdAt: { $gte: startDate } } : {};

    const [invoices, products, customers, categories] = await Promise.all([
      this.invoiceModel.find(invoiceQuery).sort({ createdAt: -1 }).exec(),
      this.productModel.find().exec(),
      this.customerModel.find().exec(),
      this.categoryModel.find().exec(),
    ]);

    // Key Performance Indicators for selected range
    const totalRevenue = invoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0);
    const totalInvoices = invoices.length;
    const totalTax = invoices.reduce((sum, inv) => sum + (inv.taxTotal || 0), 0);
    const averageOrderValue = totalInvoices > 0 ? Math.round(totalRevenue / totalInvoices) : 0;

    // Inventory metrics
    const totalProductsCount = products.length;
    const totalStockUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const lowStockProducts = products.filter((p) => {
      const threshold = p.minStockAlert !== undefined && p.minStockAlert !== null && p.minStockAlert > 0 ? p.minStockAlert : 10;
      return (p.stock || 0) <= threshold;
    });
    const totalStockValuation = products.reduce((sum, p) => sum + (p.stock || 0) * (p.price || 0), 0);

    // Customer metrics
    const totalCustomersCount = customers.length;
    const totalBalanceDue = customers.reduce((sum, c) => sum + (c.balanceDue || 0), 0);

    // Payment mode distribution
    const paymentModeCounts = { CASH: 0, UPI: 0, CARD: 0, CREDIT: 0 };
    const paymentModeAmounts = { CASH: 0, UPI: 0, CARD: 0, CREDIT: 0 };
    invoices.forEach((inv) => {
      const mode = (inv.paymentMode || 'CASH') as keyof typeof paymentModeCounts;
      if (paymentModeCounts[mode] !== undefined) {
        paymentModeCounts[mode] += 1;
        paymentModeAmounts[mode] += inv.grandTotal || 0;
      }
    });

    // Category revenue calculation
    const categoryRevenueMap: Record<string, { revenue: number; itemsSold: number }> = {};
    categories.forEach((cat) => {
      categoryRevenueMap[cat.name] = { revenue: 0, itemsSold: 0 };
    });

    // Product sales leaderboard map
    const productSalesMap: Record<string, { id: string; name: string; category: string; qty: number; revenue: number }> = {};

    invoices.forEach((inv) => {
      if (inv.items && Array.isArray(inv.items)) {
        inv.items.forEach((item) => {
          const itemRev = item.subtotal || item.price * item.qty;
          
          if (item.productId || item.name) {
            const key = item.productId || item.name;
            if (!productSalesMap[key]) {
              const matchedProd = products.find((p) => p._id.toString() === item.productId || p.name === item.name);
              productSalesMap[key] = {
                id: key,
                name: item.name,
                category: matchedProd?.category || 'General',
                qty: 0,
                revenue: 0,
              };
            }
            productSalesMap[key].qty += item.qty;
            productSalesMap[key].revenue += itemRev;
          }

          const foundProd = products.find((p) => p._id.toString() === item.productId || p.name === item.name);
          const catName = foundProd?.category || 'General';
          if (!categoryRevenueMap[catName]) {
            categoryRevenueMap[catName] = { revenue: 0, itemsSold: 0 };
          }
          categoryRevenueMap[catName].revenue += itemRev;
          categoryRevenueMap[catName].itemsSold += item.qty;
        });
      }
    });

    const topProducts = Object.values(productSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const categoryBreakdown = Object.entries(categoryRevenueMap)
      .map(([name, data]) => ({
        name,
        revenue: data.revenue,
        itemsSold: data.itemsSold,
      }));

    // Dynamic Time Series Trend Buckets
    const trendBuckets: Record<string, { revenue: number; orders: number; tax: number }> = {};
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    if (range === 'today') {
      for (let hour = 0; hour < 24; hour += 4) {
        const label = `${String(hour).padStart(2, '0')}:00`;
        trendBuckets[label] = { revenue: 0, orders: 0, tax: 0 };
      }
      invoices.forEach((inv) => {
        const date = new Date((inv as any).createdAt || Date.now());
        const hourBucket = Math.floor(date.getHours() / 4) * 4;
        const label = `${String(hourBucket).padStart(2, '0')}:00`;
        if (trendBuckets[label]) {
          trendBuckets[label].revenue += inv.grandTotal || 0;
          trendBuckets[label].orders += 1;
          trendBuckets[label].tax += inv.taxTotal || 0;
        }
      });
    } else if (range === '7d' || range === '30d' || range === 'this_month') {
      const daysCount = range === '7d' ? 7 : range === '30d' ? 30 : new Date().getDate();
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = daysCount <= 7 ? dayNames[d.getDay()] : `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
        trendBuckets[label] = { revenue: 0, orders: 0, tax: 0 };
      }

      invoices.forEach((inv) => {
        const date = new Date((inv as any).createdAt || Date.now());
        const daysAgo = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (daysAgo < daysCount) {
          const label = daysCount <= 7 ? dayNames[date.getDay()] : `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
          if (trendBuckets[label]) {
            trendBuckets[label].revenue += inv.grandTotal || 0;
            trendBuckets[label].orders += 1;
            trendBuckets[label].tax += inv.taxTotal || 0;
          }
        }
      });
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach((m) => {
        trendBuckets[m] = { revenue: 0, orders: 0, tax: 0 };
      });
      invoices.forEach((inv) => {
        const date = new Date((inv as any).createdAt || Date.now());
        const mLabel = months[date.getMonth()];
        if (trendBuckets[mLabel]) {
          trendBuckets[mLabel].revenue += inv.grandTotal || 0;
          trendBuckets[mLabel].orders += 1;
          trendBuckets[mLabel].tax += inv.taxTotal || 0;
        }
      });
    }

    const trendData = Object.entries(trendBuckets).map(([date, val]) => ({
      date,
      revenue: val.revenue,
      orders: val.orders,
      tax: val.tax,
    }));

    return {
      range,
      kpi: {
        totalRevenue,
        totalInvoices,
        totalTax,
        averageOrderValue,
        totalProductsCount,
        totalStockUnits,
        lowStockCount: lowStockProducts.length,
        totalStockValuation,
        totalCustomersCount,
        totalBalanceDue,
      },
      paymentModeBreakdown: [
        { mode: 'Cash', count: paymentModeCounts.CASH, amount: paymentModeAmounts.CASH, color: '#10B981' },
        { mode: 'UPI / Online', count: paymentModeCounts.UPI, amount: paymentModeAmounts.UPI, color: '#3B82F6' },
        { mode: 'Card', count: paymentModeCounts.CARD, amount: paymentModeAmounts.CARD, color: '#8B5CF6' },
        { mode: 'Store Credit', count: paymentModeCounts.CREDIT, amount: paymentModeAmounts.CREDIT, color: '#F59E0B' },
      ],
      categoryBreakdown,
      topProducts,
      lowStockProducts: lowStockProducts.slice(0, 5),
      recentInvoices: invoices.slice(0, 5),
      trendData,
    };
  }
}
