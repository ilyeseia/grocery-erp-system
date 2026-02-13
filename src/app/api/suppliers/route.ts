import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { successResponse, errorResponse, handleUnexpectedError, parseBody, getQueryParams, calculatePagination } from '@/lib/api-utils';
import { z } from 'zod';

const createSupplierSchema = z.object({
  name: z.string().min(1, 'Supplier name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  creditLimit: z.number().min(0).optional().default(0),
});

// GET - List all suppliers
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const params = getQueryParams(request);
    const page = parseInt(params.get('page') || '1');
    const limit = parseInt(params.get('limit') || '50');
    const search = params.get('search') || '';
    
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};
    
    const [suppliers, total] = await Promise.all([
      db.supplier.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      db.supplier.count({ where: whereClause }),
    ]);
    
    return successResponse({
      data: suppliers,
      pagination: calculatePagination(page, limit, total),
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'suppliers');

// POST - Create a new supplier
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await parseBody(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }
    
    const validation = createSupplierSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }
    
    const supplier = await db.supplier.create({
      data: {
        ...validation.data,
        email: validation.data.email || null,
      },
    });
    
    return successResponse(supplier, 201);
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'suppliers');
