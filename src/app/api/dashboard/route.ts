import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { successResponse, handleUnexpectedError } from '@/lib/api-utils';

// GET - Dashboard statistics
export const GET = withAuth(async () => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Run all queries in parallel
    const [
      todaySales,
      todayTransactions,
      monthlySales,
      monthlyExpenses,
      inventoryValue,
      lowStockProducts,
      expiringProducts,
      topProducts,
      salesChartData,
    ] = await Promise.all([
      // Today's total sales
      db.sale.aggregate({
        where: {
          createdAt: { gte: todayStart },
          paymentStatus: { not: 'CANCELLED' },
        },
        _sum: { totalAmount: true },
      }),
      
      // Today's transaction count
      db.sale.count({
        where: {
          createdAt: { gte: todayStart },
          paymentStatus: { not: 'CANCELLED' },
        },
      }),
      
      // Monthly revenue
      db.sale.aggregate({
        where: {
          createdAt: { gte: monthStart },
          paymentStatus: { not: 'CANCELLED' },
        },
        _sum: { totalAmount: true },
      }),
      
      // Monthly expenses
      db.expense.aggregate({
        where: {
          createdAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      
      // Total inventory value
      db.productBatch.aggregate({
        where: { quantity: { gt: 0 } },
        _sum: {
          quantity: true,
          purchasePrice: true,
        },
      }),
      
      // Low stock products
      db.$queryRaw<Array<{ id: string; name: string; totalStock: number; minStockLevel: number }>>`
        SELECT p.id, p.name, COALESCE(SUM(pb.quantity), 0) as totalStock, p.minStockLevel
        FROM Product p
        LEFT JOIN ProductBatch pb ON p.id = pb.productId
        WHERE p.isActive = 1
        GROUP BY p.id
        HAVING totalStock <= p.minStockLevel
        ORDER BY totalStock ASC
        LIMIT 10
      `,
      
      // Products expiring within 30 days
      db.productBatch.findMany({
        where: {
          quantity: { gt: 0 },
          expirationDate: {
            lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            gte: now,
          },
        },
        include: {
          product: { select: { id: true, name: true } },
        },
        orderBy: { expirationDate: 'asc' },
        take: 10,
      }),
      
      // Top selling products this month
      db.saleItem.groupBy({
        by: ['productId'],
        where: {
          sale: {
            createdAt: { gte: monthStart },
            paymentStatus: { not: 'CANCELLED' },
          },
        },
        _sum: {
          quantity: true,
          totalAmount: true,
        },
        orderBy: {
          _sum: { totalAmount: 'desc' },
        },
        take: 5,
      }),
      
      // Sales chart data (last 7 days)
      db.$queryRaw<Array<{ date: string; totalSales: number; totalRevenue: number }>>`
        SELECT 
          DATE(createdAt) as date,
          COUNT(*) as totalSales,
          SUM(totalAmount) as totalRevenue
        FROM Sale
        WHERE createdAt >= datetime('now', '-7 days')
          AND paymentStatus != 'CANCELLED'
        GROUP BY DATE(createdAt)
        ORDER BY date DESC
      `,
    ]);
    
    // Get product details for top products
    const topProductsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await db.product.findUnique({
          where: { id: item.productId },
          select: { name: true },
        });
        return {
          id: item.productId,
          name: product?.name || 'Unknown',
          quantitySold: item._sum.quantity || 0,
          revenue: item._sum.totalAmount || 0,
        };
      })
    );
    
    // Calculate inventory value properly
    const batches = await db.productBatch.findMany({
      where: { quantity: { gt: 0 } },
      select: { quantity: true, purchasePrice: true },
    });
    const totalInventoryValue = batches.reduce(
      (sum, batch) => sum + batch.quantity * batch.purchasePrice,
      0
    );
    
    // Calculate monthly COGS
    const monthlyCOGS = await db.saleItem.aggregate({
      where: {
        sale: {
          createdAt: { gte: monthStart },
          paymentStatus: { not: 'CANCELLED' },
        },
      },
      _sum: { costPrice: true },
    });
    
    const monthlyRevenue = monthlySales._sum.totalAmount || 0;
    const totalExpenses = monthlyExpenses._sum.amount || 0;
    const cogs = monthlyCOGS._sum.costPrice || 0;
    const netProfit = monthlyRevenue - cogs - totalExpenses;
    
    return successResponse({
      todaySales: todaySales._sum.totalAmount || 0,
      todayTransactions,
      monthlyRevenue,
      monthlyExpenses: totalExpenses,
      costOfGoodsSold: cogs,
      netProfit,
      inventoryValue: totalInventoryValue,
      lowStockCount: lowStockProducts.length,
      expiringCount: expiringProducts.length,
      lowStockProducts: lowStockProducts.map(p => ({
        id: p.id,
        name: p.name,
        currentStock: p.totalStock,
        minStockLevel: p.minStockLevel,
      })),
      expiringProducts: expiringProducts.map(b => ({
        id: b.id,
        productName: b.product.name,
        quantity: b.quantity,
        expirationDate: b.expirationDate,
      })),
      topProducts: topProductsWithDetails,
      salesChart: salesChartData.map(d => ({
        date: d.date,
        sales: d.totalSales,
        revenue: d.totalRevenue,
      })),
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'dashboard');
