import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { successResponse, errorResponse, handleUnexpectedError, parseBody } from '@/lib/api-utils';
import { z } from 'zod';

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  barcode: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  purchasePrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  taxPercentage: z.number().min(0).max(100).optional(),
  minStockLevel: z.number().int().min(0).optional(),
  maxStockLevel: z.number().int().min(0).optional(),
  unit: z.string().optional(),
  isActive: z.boolean().optional(),
});

// GET - Get a single product by ID
export const GET = withAuth(async (request: AuthenticatedRequest, context: { params: Promise<Record<string, string>> }) => {
  try {
    const { id } = await context.params;
    
    const product = await db.product.findUnique({
      where: { id },
      include: {
        category: true,
        batches: {
          where: { quantity: { gt: 0 } },
          orderBy: { expirationDate: 'asc' },
        },
      },
    });
    
    if (!product) {
      return errorResponse('Product not found', 404);
    }
    
    const totalStock = product.batches.reduce((sum, batch) => sum + batch.quantity, 0);
    
    return successResponse({ ...product, totalStock });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'products');

// PUT - Update a product
export const PUT = withAuth(async (request: AuthenticatedRequest, context: { params: Promise<Record<string, string>> }) => {
  try {
    const { id } = await context.params;
    const body = await parseBody(request);
    
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }
    
    const validation = updateProductSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }
    
    // Check if product exists
    const existingProduct = await db.product.findUnique({
      where: { id },
    });
    
    if (!existingProduct) {
      return errorResponse('Product not found', 404);
    }
    
    // Check barcode uniqueness if updating
    if (validation.data.barcode && validation.data.barcode !== existingProduct.barcode) {
      const barcodeExists = await db.product.findUnique({
        where: { barcode: validation.data.barcode },
      });
      
      if (barcodeExists) {
        return errorResponse('Product with this barcode already exists', 409);
      }
    }
    
    const product = await db.product.update({
      where: { id },
      data: validation.data,
      include: { category: true },
    });
    
    return successResponse(product);
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'products');

// DELETE - Delete a product (soft delete by setting isActive to false)
export const DELETE = withAuth(async (request: AuthenticatedRequest, context: { params: Promise<Record<string, string>> }) => {
  try {
    const { id } = await context.params;
    
    const product = await db.product.findUnique({
      where: { id },
    });
    
    if (!product) {
      return errorResponse('Product not found', 404);
    }
    
    // Soft delete
    await db.product.update({
      where: { id },
      data: { isActive: false },
    });
    
    return successResponse({ message: 'Product deactivated successfully' });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'products');
