import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { successResponse, errorResponse, handleUnexpectedError, parseBody, getQueryParams, calculatePagination } from '@/lib/api-utils';
import { z } from 'zod';
import { StockMovementType } from '@prisma/client';

const adjustStockSchema = z.object({
  productId: z.string(),
  batchId: z.string().optional(),
  type: z.nativeEnum(StockMovementType),
  quantity: z.number().int(),
  reason: z.string().optional(),
});

// GET - Get inventory status
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const params = getQueryParams(request);
    const page = parseInt(params.get('page') || '1');
    const limit = parseInt(params.get('limit') || '50');
    const search = params.get('search') || '';
    const lowStock = params.get('lowStock') === 'true';
    const expiring = params.get('expiring') === 'true';
    
    // Get all products with batch information
    const products = await db.product.findMany({
      where: {
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search } },
            { barcode: { contains: search } },
          ],
        }),
      },
      include: {
        category: true,
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: { expirationDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    // Calculate inventory for each product
    let inventoryData = products.map(product => {
      const totalStock = product.batches.reduce((sum, b) => sum + b.quantity, 0);
      const totalValue = product.batches.reduce(
        (sum, b) => sum + b.quantity * b.purchasePrice,
        0
      );
      const nearestExpiry = product.batches.find(b => b.expirationDate)?.expirationDate || null;
      
      return {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        category: product.category,
        unit: product.unit,
        minStockLevel: product.minStockLevel,
        totalStock,
        totalValue,
        nearestExpiry,
        isLowStock: totalStock <= product.minStockLevel,
        batches: product.batches,
      };
    });
    
    // Filter for low stock
    if (lowStock) {
      inventoryData = inventoryData.filter(p => p.isLowStock);
    }
    
    // Filter for expiring within 30 days
    if (expiring) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      inventoryData = inventoryData.filter(p => 
        p.nearestExpiry && new Date(p.nearestExpiry) <= thirtyDaysFromNow
      );
    }
    
    // Paginate
    const total = inventoryData.length;
    const startIndex = (page - 1) * limit;
    const paginatedData = inventoryData.slice(startIndex, startIndex + limit);
    
    return successResponse({
      data: paginatedData,
      pagination: calculatePagination(page, limit, total),
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'inventory');

// POST - Adjust inventory
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await parseBody(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }
    
    const validation = adjustStockSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }
    
    const { productId, batchId, type, quantity, reason } = validation.data;
    const userId = request.user!.userId;
    
    const result = await db.$transaction(async (tx) => {
      // Verify product exists
      const product = await tx.product.findUnique({
        where: { id: productId },
      });
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      // Handle different adjustment types
      if (type === StockMovementType.ADJUSTMENT || type === StockMovementType.DAMAGE) {
        if (!batchId) {
          throw new Error('Batch ID is required for adjustments');
        }
        
        const batch = await tx.productBatch.findUnique({
          where: { id: batchId },
        });
        
        if (!batch || batch.productId !== productId) {
          throw new Error('Batch not found or does not belong to product');
        }
        
        if (quantity < 0 && batch.quantity + quantity < 0) {
          throw new Error('Insufficient stock in batch');
        }
        
        await tx.productBatch.update({
          where: { id: batchId },
          data: { quantity: { increment: quantity } },
        });
      } else if (type === StockMovementType.RETURN) {
        // For returns, increase stock
        if (!batchId) {
          throw new Error('Batch ID is required for returns');
        }
        
        await tx.productBatch.update({
          where: { id: batchId },
          data: { quantity: { increment: Math.abs(quantity) } },
        });
      }
      
      // Create stock movement record
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type,
          quantity,
          reason,
          createdBy: userId,
        },
      });
      
      // Audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'STOCK_ADJUSTMENT',
          entityType: 'Product',
          entityId: productId,
          newValues: JSON.stringify({ type, quantity, reason }),
        },
      });
      
      return movement;
    });
    
    return successResponse(result);
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(error.message, 400);
    }
    return handleUnexpectedError(error);
  }
}, 'inventory');
