import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types/api';
import { ZodError } from 'zod';

// Success response helper
export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

// Error response helper
export function errorResponse(message: string, status = 400): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, error: message }, { status });
}

// Handle Zod validation errors
export function handleZodError(error: ZodError): NextResponse<ApiResponse> {
  const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
  return errorResponse(messages.join(', '), 400);
}

// Handle unexpected errors
export function handleUnexpectedError(error: unknown): NextResponse<ApiResponse> {
  console.error('Unexpected error:', error);
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  return errorResponse(message, 500);
}

// Parse request body safely
export async function parseBody<T>(request: Request): Promise<T | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// Get query parameters
export function getQueryParams(request: Request): URLSearchParams {
  const url = new URL(request.url);
  return url.searchParams;
}

// Generate invoice number
export function generateInvoiceNumber(prefix: string): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${year}${month}${day}${random}`;
}

// Calculate pagination
export function calculatePagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// Format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Format date
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

// Format datetime
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
