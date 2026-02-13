import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { successResponse, errorResponse, handleUnexpectedError, getQueryParams } from '@/lib/api-utils';

// GET - Generate various reports
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const params = getQueryParams(request);
    const reportType = params.get('type') || 'daily';
    const startDate = params.get('startDate');
    const endDate = params.get('endDate');
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let reportStartDate: Date;
    let reportEndDate: Date;
    
    if (startDate && endDate) {
      reportStartDate = new Date(startDate);
      reportEndDate = new Date(endDate);
    } else {
      switch (reportType) {
        case 'daily':
          reportStartDate = todayStart;
          reportEndDate = now;
          break;
        case 'weekly':
          reportStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          reportEndDate = now;
          break;
        case 'monthly':
          reportStartDate = monthStart;
          reportEndDate = now;
          break;
        default:
          reportStartDate = todayStart;
          reportEndDate = now;
      }
    }
    
    // Fetch all required data
    const [
      sales,
      expenses,
      purchases,
      topProducts,
      salesByCategory,
      paymentMethods,
    ] = await Promise.all([
      // Sales in period
      db.sale.findMany({
        where: {
          createdAt: { gte: reportStartDate, lte: reportEndDate },
          paymentStatus: { not: 'CANCELLED' },
        },
        include: {
          customer: true,
          items: {
            include: { product: { include: { category: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      
      // Expenses in period
      db.expense.findMany({
        where: {
          createdAt: { gte: reportStartDate, lte: reportEndDate },
        },
        orderBy: { createdAt: 'desc' },
      }),
      
      // Purchases in period
      db.purchase.findMany({
        where: {
          createdAt: { gte: reportStartDate, lte: reportEndDate },
        },
        include: {
          supplier: true,
          items: { include: { product: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      
      // Top selling products
      db.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: {
            createdAt: { gte: reportStartDate, lte: reportEndDate },
            paymentStatus: { not: 'CANCELLED' },
          },
        },
        _sum: {
          quantity: true,
          totalAmount: true,
          costPrice: true,
        },
        orderBy: {
          _sum: { totalAmount: 'desc' },
        },
        take: 10,
      }),
      
      // Sales by category
      db.$queryRaw<Array<{ categoryId: string; categoryName: string; totalSales: number; totalRevenue: number }>>`
        SELECT c.id as categoryId, c.name as categoryName,
               COUNT(DISTINCT s.id) as totalSales,
               SUM(si.totalAmount) as totalRevenue
        FROM Sale s
        JOIN SaleItem si ON s.id = si.saleId
        JOIN Product p ON si.productId = p.id
        JOIN Category c ON p.categoryId = c.id
        WHERE s.createdAt >= ${reportStartDate}
          AND s.createdAt <= ${reportEndDate}
          AND s.paymentStatus != 'CANCELLED'
        GROUP BY c.id, c.name
        ORDER BY totalRevenue DESC
      `,
      
      // Payment method breakdown
      db.sale.groupBy({
        by: ['paymentMethod'],
        where: {
          createdAt: { gte: reportStartDate, lte: reportEndDate },
          paymentStatus: { not: 'CANCELLED' },
        },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);
    
    // Calculate totals
    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalTax = sales.reduce((sum, s) => sum + s.taxAmount, 0);
    const totalDiscount = sales.reduce((sum, s) => sum + s.discountAmount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);
    const totalCOGS = sales.reduce((sum, s) => {
      return sum + s.items.reduce((itemSum, item) => itemSum + item.costPrice, 0);
    }, 0);
    
    // Get product details for top products
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await db.product.findUnique({
          where: { id: item.productId },
          select: { name: true, barcode: true },
        });
        return {
          productId: item.productId,
          name: product?.name || 'Unknown',
          barcode: product?.barcode || '',
          quantitySold: item._sum.quantity || 0,
          revenue: item._sum.totalAmount || 0,
          cost: item._sum.costPrice || 0,
          profit: (item._sum.totalAmount || 0) - (item._sum.costPrice || 0),
        };
      })
    );
    
    // Expense breakdown by category
    const expenseBreakdown = expenses.reduce((acc, expense) => {
      const category = expense.category;
      if (!acc[category]) {
        acc[category] = 0;
      }
      acc[category] += expense.amount;
      return acc;
    }, {} as Record<string, number>);
    
    // Hourly sales distribution (for today)
    const hourlySales = await db.$queryRaw<Array<{ hour: number; count: number; total: number }>>`
      SELECT strftime('%H', createdAt) as hour,
             COUNT(*) as count,
             SUM(totalAmount) as total
      FROM Sale
      WHERE createdAt >= ${reportStartDate}
        AND createdAt <= ${reportEndDate}
        AND paymentStatus != 'CANCELLED'
      GROUP BY hour
      ORDER BY hour
    `;
    
    return successResponse({
      reportType,
      period: {
        start: reportStartDate,
        end: reportEndDate,
      },
      summary: {
        totalSales: sales.length,
        totalRevenue: totalSales,
        totalTax,
        totalDiscount,
        totalExpenses,
        totalPurchases,
        costOfGoodsSold: totalCOGS,
        grossProfit: totalSales - totalCOGS,
        netProfit: totalSales - totalCOGS - totalExpenses,
      },
      sales,
      expenses,
      purchases,
      topProducts: topProductsWithDetails,
      salesByCategory,
      paymentMethodBreakdown: paymentMethods.map(p => ({
        method: p.paymentMethod,
        count: p._count,
        total: p._sum.totalAmount || 0,
      })),
      expenseBreakdown,
      hourlySales: hourlySales.map(h => ({
        hour: parseInt(h.hour),
        count: h.count,
        total: h.total,
      })),
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'reports');
