import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from './db';
import { User, UserRole } from '@prisma/client';

// Security: JWT_SECRET must be set via environment variable
// Generate a secure secret with: openssl rand -base64 32
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is not set. Please set it before starting the application.');
}
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

// Login attempt tracking for account lockout
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  accessToken: string;
  refreshToken: string;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Generate access token
export function generateAccessToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Generate refresh token
export function generateRefreshToken(): string {
  return jwt.sign({}, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

// Verify JWT token
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

// Create session with tokens
export async function createAuthSession(user: User): Promise<AuthResponse> {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  
  // Calculate expiration date (7 days from now)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  // Store refresh token in database
  await db.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });
  
  // Update last login
  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  
  const { passwordHash: _, ...userWithoutPassword } = user;
  
  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken,
  };
}

// Validate refresh token and generate new access token
export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; user: Omit<User, 'passwordHash'> } | null> {
  const storedToken = await db.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });
  
  if (!storedToken || storedToken.expiresAt < new Date()) {
    return null;
  }
  
  const accessToken = generateAccessToken(storedToken.user);
  const { passwordHash: _, ...userWithoutPassword } = storedToken.user;
  
  return { accessToken, user: userWithoutPassword };
}

// Invalidate refresh token (logout)
export async function invalidateRefreshToken(refreshToken: string): Promise<void> {
  await db.refreshToken.deleteMany({
    where: { token: refreshToken },
  });
}

// Check if account is locked
export function isAccountLocked(user: User): boolean {
  if (!user.lockedUntil) return false;
  return new Date() < user.lockedUntil;
}

// Handle failed login attempt
export async function handleFailedLogin(userId: string): Promise<{ locked: boolean; attemptsRemaining: number }> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { locked: false, attemptsRemaining: 0 };
  
  const newAttempts = user.loginAttempts + 1;
  const shouldLock = newAttempts >= MAX_LOGIN_ATTEMPTS;
  
  await db.user.update({
    where: { id: userId },
    data: {
      loginAttempts: newAttempts,
      lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
    },
  });
  
  return {
    locked: shouldLock,
    attemptsRemaining: Math.max(0, MAX_LOGIN_ATTEMPTS - newAttempts),
  };
}

// Reset login attempts on successful login
export async function resetLoginAttempts(userId: string): Promise<void> {
  await db.user.update({
    where: { id: userId },
    data: {
      loginAttempts: 0,
      lockedUntil: null,
    },
  });
}

// Role-based access control
export const rolePermissions: Record<UserRole, string[]> = {
  ADMIN: ['all'],
  MANAGER: ['dashboard', 'products', 'inventory', 'sales', 'purchases', 'suppliers', 'customers', 'reports', 'expenses'],
  CASHIER: ['dashboard', 'pos', 'sales'],
  ACCOUNTANT: ['dashboard', 'reports', 'expenses', 'accounting'],
};

export function hasPermission(userRole: UserRole, permission: string): boolean {
  const permissions = rolePermissions[userRole];
  return permissions.includes('all') || permissions.includes(permission);
}

// Get user from token
export async function getUserFromToken(token: string): Promise<User | null> {
  const payload = verifyToken(token);
  if (!payload) return null;
  
  return db.user.findUnique({
    where: { id: payload.userId },
  });
}
