import { NextRequest } from 'next/server';
import { invalidateRefreshToken } from '@/lib/auth';
import { successResponse, errorResponse, handleUnexpectedError, parseBody } from '@/lib/api-utils';
import { z } from 'zod';

const logoutSchema = z.object({
  refreshToken: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await parseBody(request);
    if (!body) {
      return errorResponse('Invalid request body', 400);
    }
    
    const validation = logoutSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.errors[0].message, 400);
    }
    
    const { refreshToken } = validation.data;
    
    await invalidateRefreshToken(refreshToken);
    
    return successResponse({ message: 'Logged out successfully' });
  } catch (error) {
    return handleUnexpectedError(error);
  }
}
