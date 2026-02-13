import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload, hasPermission } from './auth';
import { errorResponse } from './api-utils';
import { UserRole } from '@prisma/client';

// Extend NextRequest to include user info
export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

// Auth middleware wrapper
export function withAuth(
  handler: (request: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>,
  requiredPermission?: string
) {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized: No token provided', 401);
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return errorResponse('Unauthorized: Invalid token', 401);
    }
    
    // Check permission if required
    if (requiredPermission && !hasPermission(payload.role, requiredPermission)) {
      return errorResponse('Forbidden: Insufficient permissions', 403);
    }
    
    // Add user to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = payload;
    
    return handler(authenticatedRequest, context);
  };
}

// Role-based middleware
export function withRole(
  handler: (request: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>,
  allowedRoles: UserRole[]
) {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return errorResponse('Unauthorized: No token provided', 401);
    }
    
    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    
    if (!payload) {
      return errorResponse('Unauthorized: Invalid token', 401);
    }
    
    if (!allowedRoles.includes(payload.role)) {
      return errorResponse('Forbidden: Insufficient role permissions', 403);
    }
    
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = payload;
    
    return handler(authenticatedRequest, context);
  };
}

// Optional auth - doesn't require authentication but adds user if present
export function withOptionalAuth(
  handler: (request: AuthenticatedRequest, context?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    const authHeader = request.headers.get('authorization');
    let payload: JWTPayload | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      payload = verifyToken(token);
    }
    
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = payload || undefined;
    
    return handler(authenticatedRequest, context);
  };
}
