import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Health check endpoint for container monitoring
 * Used by Docker health checks and load balancers
 */
export async function GET() {
  try {
    // Check database connection
    await db.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected',
    });
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Database connection failed',
    }, { status: 503 });
  }
}
