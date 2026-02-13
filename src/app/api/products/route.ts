import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { successResponse, errorResponse, handleUnexpectedError, parseBody, getQueryParams, calculatePagination } from '@/lib/api-utils';
import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  barcode: z.string().min(1, 'Barcode is required'),
  categoryId: z.string().min(1, 'Category is required'),
  purchasePrice: z.number().min(0, 'Purchase price must be non-negative'),
  sellingPrice: z.number().min(0, 'Selling price must be non-negative'),
  taxPercentage: z.number().min(0).max(100).optional().default(0),
  minStockLevel: z.number().int().min(0).optional().default(10),
  maxStockLevel: z.number().int().min(0).optional().default(100),
  unit: z.string().optional().default('piece'),
});

// GET - List all products with pagination and search
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const params = getQueryParams(request);
    const page = parseInt(params.get('page') || '1');
    const limit = parseInt(params.get('limit') || '50');
    const search = params.get('search') || '';
    const categoryId = params.get('categoryId') || '';
    const isActive = params.get('isActive');
    
    const whereClause: Record<string, unknown> = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { barcode: { contains: search } },
      ];
    }
    
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }
    
    if (isActive !== null && isActive !== 'all') {
      whereClause.isActive = isActive === 'true';
    }
    
    const [products, total] = await Promise.all([
      db.product.findMany({
        where: whereClause,
        include: {
          category: true,
          batches: {
            where: { quantity: { gt: 0 } },
            orderBy: { expirationDate: 'asc' },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.product.count({ where: whereClause }),
    ]);
    
    // Calculate total stock for each product
    const productsWithStock = products.map(product => ({
      ...product,
      totalStock: product.batches.reduce((sum, batch) => sum + batch.quantity, 0),
      batches: undefined,
    }));
    
    return successResponse({
      data: productsWithStock,
      pagination: calculatePagination(page, limit, total),
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'products');

// POST - Create a new product
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await parseBody(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }
    
    const validation = createProductSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }
    
    const data = validation.data;
    
    // Check if barcode already exists
    const existingProduct = await db.product.findUnique({
      where: { barcode: data.barcode },
    });
    
    if (existingProduct) {
      return errorResponse('Product with this barcode already exists', 409);
    }
    
    // Verify category exists
    const category = await db.category.findUnique({
      where: { id: data.categoryId },
    });
    
    if (!category) {
      return errorResponse('Category not found', 404);
    }
    
    const product = await db.product.create({
      data,
      include: { category: true },
    });
    
    return successResponse(product, 201);
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'products');
