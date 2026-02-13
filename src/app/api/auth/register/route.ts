import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword, createAuthSession } from '@/lib/auth';
import { successResponse, errorResponse, handleUnexpectedError, parseBody } from '@/lib/api-utils';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(UserRole).optional().default('CASHIER'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }
    
    const validation = registerSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }
    
    const { name, email, password, role } = validation.data;
    
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (existingUser) {
      return errorResponse('User with this email already exists', 409);
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user
    const user = await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
      },
    });
    
    // Create session with tokens
    const authResponse = await createAuthSession(user);
    
    return successResponse(authResponse, 201);
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
