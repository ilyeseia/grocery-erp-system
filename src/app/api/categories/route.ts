import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { successResponse, errorResponse, handleUnexpectedError, parseBody } from '@/lib/api-utils';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  description: z.string().optional(),
});

// GET - List all categories
export const GET = withAuth(async () => {
  try {
    const categories = await db.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    
    return successResponse(categories.map(c => ({
      ...c,
      productCount: c._count.products,
      _count: undefined,
    })));
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'products');

// POST - Create a new category
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await parseBody(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }
    
    const validation = createCategorySchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }
    
    const { name, description } = validation.data;
    
    // Check if category already exists
    const existingCategory = await db.category.findUnique({
      where: { name },
    });
    
    if (existingCategory) {
      return errorResponse('Category with this name already exists', 409);
    }
    
    const category = await db.category.create({
      data: { name, description },
    });
    
    return successResponse(category, 201);
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'products');
