/**
 * Rate Limiting Middleware
 * Protects API routes from brute force and DoS attacks
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory store for rate limiting (for production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const RATE_LIMITS = {
  // Authentication endpoints - stricter limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per window
  },
  // API endpoints - standard limits
  api: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
  },
};

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get client IP from request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
}

/**
 * Check rate limit for a client
 */
export function checkRateLimit(
  identifier: string,
  type: 'auth' | 'api' = 'api'
): RateLimitResult {
  const config = RATE_LIMITS[type];
  const now = Date.now();
  const key = `${type}:${identifier}`;
  
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    // Create new record
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }
  
  if (record.count >= config.maxRequests) {
    // Rate limit exceeded
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }
  
  // Increment count
  record.count++;
  rateLimitStore.set(key, record);
  
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Rate limiting middleware wrapper
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  type: 'auth' | 'api' = 'api'
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const clientIp = getClientIp(request);
    const result = checkRateLimit(clientIp, type);
    
    // Add rate limit headers
    const headers = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': result.resetTime.toString(),
    };
    
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: {
            ...headers,
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }
    
    const response = await handler(request);
    
    // Add rate limit headers to response
    for (const [key, value] of Object.entries(headers)) {
      response.headers.set(key, value);
    }
    
    return response;
  };
}

/**
 * Auth-specific rate limiter (stricter)
 */
export const authRateLimit = withRateLimit(
  async (request: NextRequest) => {
    // This is just a wrapper, actual handler is passed dynamically
    return NextResponse.json({ success: true });
  },
  'auth'
);
