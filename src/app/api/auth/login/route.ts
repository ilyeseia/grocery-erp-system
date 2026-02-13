import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, createAuthSession } from '@/lib/auth';
import { successResponse, errorResponse, handleUnexpectedError, parseBody } from '@/lib/api-utils';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }
    
    const validation = loginSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }
    
    const { email, password } = validation.data;
    
    // Find user by email
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    
    if (!user || !user.isActive) {
      return errorResponse('Invalid email or password', 401);
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return errorResponse('Invalid email or password', 401);
    }
    
    // Create session with tokens
    const authResponse = await createAuthSession(user);
    
    return successResponse(authResponse);
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
