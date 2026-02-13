import { NextRequest } from 'next/server';
import { refreshAccessToken } from '@/lib/auth';
import { successResponse, errorResponse, handleUnexpectedError, parseBody } from '@/lib/api-utils';
import { z } from 'zod';

const refreshSchema = z.object({
  refreshToken: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }
    
    const validation = refreshSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }
    
    const { refreshToken } = validation.data;
    
    const result = await refreshAccessToken(refreshToken);
    
    if (!result) {
      return errorResponse('Invalid or expired refresh token', 401);
    }
    
    return successResponse(result);
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
