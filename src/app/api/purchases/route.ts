import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { successResponse, errorResponse, handleUnexpectedError, parseBody, getQueryParams, calculatePagination, generateInvoiceNumber } from '@/lib/api-utils';
import { z } from 'zod';
import { PaymentMethod, PaymentStatus, StockMovementType } from '@prisma/client';

const createPurchaseSchema = z.object({
  supplierId: z.string().min(1, 'Supplier is required'),
  items: z.array(z.object({
    productId: z.string(),
    batchNumber: z.string(),
    quantity: z.number().int().positive(),
    purchasePrice: z.number().min(0),
    expirationDate: z.string().optional(),
  })).min(1, 'At least one item is required'),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional().default(PaymentStatus.PENDING),
  notes: z.string().optional(),
});

// GET - List all purchases
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const params = getQueryParams(request);
    const page = parseInt(params.get('page') || '1');
    const limit = parseInt(params.get('limit') || '50');
    const supplierId = params.get('supplierId');
    
    const whereClause: Record<string, unknown> = {};
    if (supplierId) {
      whereClause.supplierId = supplierId;
    }
    
    const [purchases, total] = await Promise.all([
      db.purchase.findMany({
        where: whereClause,
        include: {
          supplier: true,
          user: { select: { id: true, name: true } },
          items: {
            include: {
              product: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.purchase.count({ where: whereClause }),
    ]);
    
    return successResponse({
      data: purchases,
      pagination: calculatePagination(page, limit, total),
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'purchases');

// POST - Create a new purchase
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await parseBody(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }
    
    const validation = createPurchaseSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }
    
    const { supplierId, items, paymentMethod, paymentStatus, notes } = validation.data;
    const userId = request.user!.userId;
    
    // Validate supplier
    const supplier = await db.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) {
      return errorResponse('Supplier not found', 404);
    }
    
    const result = await db.$transaction(async (tx) => {
      let totalAmount = 0;
      const purchaseItems: Array<{
        productId: string;
        batchNumber: string;
        quantity: number;
        purchasePrice: number;
        expirationDate: Date | null;
        totalAmount: number;
      }> = [];
      
      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }
        
        const itemTotal = item.quantity * item.purchasePrice;
        totalAmount += itemTotal;
        
        purchaseItems.push({
          productId: item.productId,
          batchNumber: item.batchNumber,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
          totalAmount: itemTotal,
        });
        
        // Create or update product batch
        const existingBatch = await tx.productBatch.findUnique({
          where: {
            productId_batchNumber: {
              productId: item.productId,
              batchNumber: item.batchNumber,
            },
          },
        });
        
        if (existingBatch) {
          // Update existing batch
          await tx.productBatch.update({
            where: { id: existingBatch.id },
            data: {
              quantity: { increment: item.quantity },
              purchasePrice: item.purchasePrice,
              expirationDate: item.expirationDate ? new Date(item.expirationDate) : existingBatch.expirationDate,
            },
          });
        } else {
          // Create new batch
          await tx.productBatch.create({
            data: {
              productId: item.productId,
              batchNumber: item.batchNumber,
              quantity: item.quantity,
              purchasePrice: item.purchasePrice,
              expirationDate: item.expirationDate ? new Date(item.expirationDate) : null,
            },
          });
        }
        
        // Update product purchase price if different
        if (item.purchasePrice !== product.purchasePrice) {
          await tx.product.update({
            where: { id: item.productId },
            data: { purchasePrice: item.purchasePrice },
          });
        }
        
        // Create stock movement
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: StockMovementType.PURCHASE,
            quantity: item.quantity,
            reason: `Purchase - Batch: ${item.batchNumber}`,
            createdBy: userId,
          },
        });
      }
      
      // Generate invoice number
      const invoiceNumber = generateInvoiceNumber('PO');
      
      // Create purchase
      const purchase = await tx.purchase.create({
        data: {
          invoiceNumber,
          supplierId,
          subtotal: totalAmount,
          totalAmount,
          paymentMethod: paymentMethod || null,
          paymentStatus: paymentStatus || PaymentStatus.PENDING,
          notes,
          createdBy: userId,
          items: {
            create: purchaseItems,
          },
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
      
      // Update supplier balance if not fully paid
      if (paymentStatus !== PaymentStatus.COMPLETED) {
        await tx.supplier.update({
          where: { id: supplierId },
          data: { balance: { increment: totalAmount } },
        });
      }
      
      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE_PURCHASE',
          entityType: 'Purchase',
          entityId: purchase.id,
          newValues: JSON.stringify({ invoiceNumber, totalAmount }),
        },
      });
      
      return purchase;
    });
    
    return successResponse(result, 201);
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return handleUnexpectedError(error);
  }
}, 'purchases');
