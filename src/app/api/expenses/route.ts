import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { successResponse, errorResponse, handleUnexpectedError, parseBody, getQueryParams, calculatePagination } from '@/lib/api-utils';
import { z } from 'zod';
import { ExpenseCategory, PaymentMethod } from '@prisma/client';

const createExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  amount: z.number().positive('Amount must be positive'),
  category: z.nativeEnum(ExpenseCategory),
  paymentMethod: z.nativeEnum(PaymentMethod).optional().default(PaymentMethod.CASH),
});

// GET - List all expenses
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const params = getQueryParams(request);
    const page = parseInt(params.get('page') || '1');
    const limit = parseInt(params.get('limit') || '50');
    const startDate = params.get('startDate');
    const endDate = params.get('endDate');
    const category = params.get('category');
    
    const whereClause: Record<string, unknown> = {};
    
    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    const [expenses, total] = await Promise.all([
      db.expense.findMany({
        where: whereClause,
        include: {
          user: { select: { id: true, name: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.expense.count({ where: whereClause }),
    ]);
    
    return successResponse({
      data: expenses,
      pagination: calculatePagination(page, limit, total),
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'expenses');

// POST - Create a new expense
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await parseBody(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }
    
    const validation = createExpenseSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }
    
    const userId = request.user!.userId;
    
    const expense = await db.expense.create({
      data: {
        ...validation.data,
        createdBy: userId,
      },
      include: {
        user: { select: { id: true, name: true } },
      },
    });
    
    // Audit log
    await db.auditLog.create({
      data: {
        userId,
        action: 'CREATE_EXPENSE',
        entityType: 'Expense',
        entityId: expense.id,
        newValues: JSON.stringify({ title: expense.title, amount: expense.amount }),
      },
    });
    
    return successResponse(expense, 201);
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'expenses');
