import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware';
import { successResponse, errorResponse, handleUnexpectedError, parseBody, getQueryParams, calculatePagination } from '@/lib/api-utils';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import { UserRole } from '@prisma/client';

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole),
});

const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

// GET - List all users (Admin only)
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    // Only admins can list users
    if (request.user!.role !== 'ADMIN') {
      return errorResponse('Forbidden: Admin access required', 403);
    }
    
    const params = getQueryParams(request);
    const page = parseInt(params.get('page') || '1');
    const limit = parseInt(params.get('limit') || '50');
    const search = params.get('search') || '';
    
    const whereClause = search
      ? {
          OR: [
            { name: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};
    
    const [users, total] = await Promise.all([
      db.user.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.user.count({ where: whereClause }),
    ]);
    
    return successResponse({
      data: users,
      pagination: calculatePagination(page, limit, total),
    });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'users');

// POST - Create user (Admin only)
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    if (request.user!.role !== 'ADMIN') {
      return errorResponse('Forbidden: Admin access required', 403);
    }
    
    const body = await parseBody(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }
    
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }
    
    const { name, email, password, role } = validation.data;
    
    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (existingUser) {
      return errorResponse('User with this email already exists', 409);
    }
    
    const passwordHash = await hashPassword(password);
    
    const user = await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    
    return successResponse(user, 201);
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'users');

// PUT - Update user (Admin only)
export const PUT = withAuth(async (request: AuthenticatedRequest) => {
  try {
    if (request.user!.role !== 'ADMIN') {
      return errorResponse('Forbidden: Admin access required', 403);
    }
    
    const body = await parseBody(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }
    
    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }
    
    const { id } = body;
    if (!id) {
      return errorResponse('User ID is required', 400);
    }
    
    const updateData: Record<string, unknown> = { ...validation.data };
    delete updateData['id'];
    
    if (validation.data.password) {
      updateData.passwordHash = await hashPassword(validation.data.password);
      delete updateData['password'];
    }
    
    const user = await db.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    
    return successResponse(user);
  } catch (error) {
    return handleUnexpectedError(error);
  }
}, 'users');
