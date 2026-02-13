import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { successResponse, errorResponse, handleUnexpectedError, parseBody, getQueryParams, calculatePagination } from '@/lib/api-utils';
import { z } from 'zod';

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
});

// GET - List all customers
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
    
    const [customers, total] = await Promise.all([
      db.customer.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      db.customer.count({ where: whereClause }),
    ]);
    
    return successResponse({
      data: customers,
      pagination: calculatePagination(page, limit, total),
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'customers');

// POST - Create a new customer
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await parseBody(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }
    
    const validation = createCustomerSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }
    
    // Check if phone already exists
    if (validation.data.phone) {
      const existingCustomer = await db.customer.findUnique({
        where: { phone: validation.data.phone },
      });
      
      if (existingCustomer) {
        return errorResponse('Customer with this phone number already exists', 409);
      }
    }
    
    const customer = await db.customer.create({
      data: {
        ...validation.data,
        email: validation.data.email || null,
      },
    });
    
    return successResponse(customer, 201);
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'customers');
