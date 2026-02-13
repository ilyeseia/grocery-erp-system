import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { successResponse, errorResponse, handleUnexpectedError, parseBody, getQueryParams, calculatePagination, generateInvoiceNumber } from '@/lib/api-utils';
import { z } from 'zod';
import { PaymentMethod, PaymentStatus, StockMovementType } from '@prisma/client';

const createSaleSchema = z.object({
  customerId: z.string().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
  })).min(1, 'At least one item is required'),
  paymentMethod: z.nativeEnum(PaymentMethod),
  discountAmount: z.number().min(0).optional().default(0),
  notes: z.string().optional(),
});

// GET - List all sales
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const params = getQueryParams(request);
    const page = parseInt(params.get('page') || '1');
    const limit = parseInt(params.get('limit') || '50');
    const startDate = params.get('startDate');
    const endDate = params.get('endDate');
    const customerId = params.get('customerId');
    
    const whereClause: Record<string, unknown> = {};
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    
    if (customerId) {
      whereClause.customerId = customerId;
    }
    
    const [sales, total] = await Promise.all([
      db.sale.findMany({
        where: whereClause,
        include: {
          customer: true,
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              product: { include: { category: true } },
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.sale.count({ where: whereClause }),
    ]);
    
    return successResponse({
      data: sales,
      pagination: calculatePagination(page, limit, total),
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'sales');

// POST - Create a new sale (transaction-safe with FIFO)
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await parseBody(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }
    
    const validation = createSaleSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }
    
    const { customerId, items, paymentMethod, discountAmount, notes } = validation.data;
    const userId = request.user!.userId;
    
    // Validate customer if provided
    if (customerId) {
      const customer = await db.customer.findUnique({ where: { id: customerId } });
      if (!customer) {
        return errorResponse('Customer not found', 404);
      }
    }
    
    // Use transaction for sale processing
    const result = await db.$transaction(async (tx) => {
      const saleItems: Array<{
        productId: string;
        productBatchId: string;
        quantity: number;
        unitPrice: number;
        taxAmount: number;
        discountAmount: number;
        totalAmount: number;
        costPrice: number;
      }> = [];
      
      let subtotal = 0;
      let totalTax = 0;
      let totalCost = 0;
      
      // Process each item with FIFO allocation
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: {
            batches: {
              where: {
                quantity: { gt: 0 },
                isExpired: false,
                OR: [
                  { expirationDate: null },
                  { expirationDate: { gt: new Date() } },
                ],
              },
              orderBy: [
                { expirationDate: 'asc' }, // FIFO: oldest expiration first
                { createdAt: 'asc' },
              ],
            },
          },
        });
        
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        
        // Check if selling price is set
        if (product.sellingPrice <= 0) {
          throw new Error(`Product ${product.name} has no selling price set`);
        }
        
        // Calculate total available stock
        const totalAvailable = product.batches.reduce((sum, b) => sum + b.quantity, 0);
        if (totalAvailable < item.quantity) {
          throw new Error(`Insufficient stock for ${product.name}. Available: ${totalAvailable}, Requested: ${item.quantity}`);
        }
        
        // Allocate from batches using FIFO
        let remainingQuantity = item.quantity;
        const unitTax = (product.sellingPrice * product.taxPercentage) / 100;
        
        for (const batch of product.batches) {
          if (remainingQuantity <= 0) break;
          
          const takeFromBatch = Math.min(batch.quantity, remainingQuantity);
          
          // Deduct from batch
          await tx.productBatch.update({
            where: { id: batch.id },
            data: { quantity: { decrement: takeFromBatch } },
          });
          
          // Calculate item totals
          const itemTotal = takeFromBatch * product.sellingPrice;
          const itemTax = takeFromBatch * unitTax;
          const itemCost = takeFromBatch * batch.purchasePrice;
          
          saleItems.push({
            productId: product.id,
            productBatchId: batch.id,
            quantity: takeFromBatch,
            unitPrice: product.sellingPrice,
            taxAmount: itemTax,
            discountAmount: 0,
            totalAmount: itemTotal,
            costPrice: itemCost,
          });
          
          subtotal += itemTotal;
          totalTax += itemTax;
          totalCost += itemCost;
          remainingQuantity -= takeFromBatch;
        }
        
        // Create stock movement for each product
        await tx.stockMovement.create({
          data: {
            productId: product.id,
            type: StockMovementType.SALE,
            quantity: -item.quantity,
            reason: 'Sale transaction',
            createdBy: userId,
          },
        });
      }
      
      // Calculate totals
      const totalAmount = subtotal + totalTax - discountAmount;
      
      // Generate invoice number
      const invoiceNumber = generateInvoiceNumber('INV');
      
      // Create sale
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: customerId || null,
          subtotal,
          taxAmount: totalTax,
          discountAmount,
          totalAmount,
          paymentMethod,
          paymentStatus: PaymentStatus.COMPLETED,
          notes,
          createdBy: userId,
          items: {
            create: saleItems,
          },
        },
        include: {
          customer: true,
          items: {
            include: {
              product: { include: { category: true } },
            },
          },
        },
      });
      
      // Update customer total purchased if applicable
      if (customerId) {
        await tx.customer.update({
          where: { id: customerId },
          data: { totalPurchased: { increment: totalAmount } },
        });
      }
      
      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE_SALE',
          entityType: 'Sale',
          entityId: sale.id,
          newValues: JSON.stringify({ invoiceNumber, totalAmount, itemCount: items.length }),
        },
      });
      
      return {
        ...sale,
        costOfGoodsSold: totalCost,
        grossProfit: totalAmount - totalCost,
      };
    });
    
    return successResponse(result, 201);
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return handleUnexpectedError(error);
  }
}, 'sales');
