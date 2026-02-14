import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  verifyPassword, 
  createAuthSession, 
  isAccountLocked, 
  handleFailedLogin, 
  resetLoginAttempts 
} from '@/lib/auth';
import { successResponse, errorResponse, handleUnexpectedError, parseBody } from '@/lib/api-utils';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIp = getClientIp(request);
    const rateResult = checkRateLimit(clientIp, 'auth');
    
    if (!rateResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many login attempts. Please try again later.',
          retryAfter: Math.ceil((rateResult.resetTime - Date.now()) / 1000)
        },
        { status: 429 }
      );
    }
    
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
    
    if (!user) {
      // Don't reveal if email exists
      return errorResponse('Invalid email or password', 401);
    }
    
    // Check if account is active
    if (!user.isActive) {
      return errorResponse('Account is disabled. Contact administrator.', 401);
    }
    
    // Check if account is locked
    if (isAccountLocked(user)) {
      const remainingTime = Math.ceil((user.lockedUntil!.getTime() - Date.now()) / 60000);
      return errorResponse(
        `Account is temporarily locked due to too many failed attempts. Try again in ${remainingTime} minutes.`,
        423
      );
    }
    
    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    
    if (!isValidPassword) {
      // Track failed attempt
      const lockoutResult = await handleFailedLogin(user.id);
      
      if (lockoutResult.locked) {
        return errorResponse(
          'Account has been locked due to too many failed attempts. Try again in 15 minutes.',
          423
        );
      }
      
      return errorResponse(
        `Invalid email or password. ${lockoutResult.attemptsRemaining} attempts remaining.`,
        401
      );
    }
    
    // Reset login attempts on successful login
    await resetLoginAttempts(user.id);
    
    // Create session with tokens
    const authResponse = await createAuthSession(user);
    
    return successResponse(authResponse);
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
