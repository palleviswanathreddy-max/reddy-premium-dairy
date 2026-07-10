/**
 * Advanced Authentication with Session Management
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken, verifyRefreshToken, generateAccessToken } from '@/db/auth-helper';
import { logger } from '@/utils/logger';

interface SessionPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
  isAuthenticated: boolean;
}

/**
 * Extract and verify JWT token from request
 */
export function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  return token;
}

/**
 * Verify access token and return auth context
 */
export function verifyAuth(token: string): AuthContext | null {
  try {
    const payload = verifyAccessToken(token) as SessionPayload;
    if (!payload) return null;

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      isAuthenticated: true
    };
  } catch (error) {
    logger.warn('Token verification failed', { error: String(error) });
    return null;
  }
}

/**
 * Token Refresh Handler
 */
export async function handleTokenRefresh(
  refreshToken: string
): Promise<{ accessToken: string; refreshToken?: string } | null> {
  try {
    const payload = verifyRefreshToken(refreshToken) as SessionPayload;
    if (!payload) return null;

    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    });

    return {
      accessToken: newAccessToken
      // Optionally return new refresh token with longer rotation
    };
  } catch (error) {
    logger.error('Token refresh failed', error as Error);
    return null;
  }
}

/**
 * Middleware: Verify JWT and attach to request
 */
export function withAuth(handler: Function) {
  return async (request: NextRequest) => {
    try {
      const token = extractToken(request);
      
      if (!token) {
        return NextResponse.json(
          { error: 'Missing or invalid authorization token' },
          { status: 401 }
        );
      }

      const auth = verifyAuth(token);
      
      if (!auth) {
        // Token expired or invalid - check if refresh token available
        const refreshToken = request.cookies.get('refreshToken')?.value;
        
        if (!refreshToken) {
          return NextResponse.json(
            { error: 'Token expired. Please login again.' },
            { status: 401 }
          );
        }

        const newTokens = await handleTokenRefresh(refreshToken);
        if (!newTokens) {
          return NextResponse.json(
            { error: 'Invalid refresh token' },
            { status: 401 }
          );
        }

        // Attach new token to response headers
        const response = await handler(request, { auth: verifyAuth(newTokens.accessToken)! });
        response.headers.set('X-New-Access-Token', newTokens.accessToken);
        return response;
      }

      // Attach auth context to request
      (request as any).auth = auth;
      return handler(request, { auth });
    } catch (error) {
      logger.error('Auth middleware error', error as Error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      );
    }
  };
}

/**
 * Role-based Access Control
 */
export function withRole(...allowedRoles: string[]) {
  return (handler: Function) => {
    return async (request: NextRequest, context: any) => {
      const auth = context?.auth || (request as any).auth;

      if (!auth) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (!allowedRoles.includes(auth.role)) {
        logger.warn('Access denied due to insufficient role', {
          userId: auth.userId,
          requiredRoles: allowedRoles,
          userRole: auth.role
        });

        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      return handler(request, context);
    };
  };
}

/**
 * Session Tracking
 */
export class SessionManager {
  private sessions: Map<string, { userId: string; createdAt: number; lastActivity: number }> = new Map();
  private sessionTimeout = 24 * 60 * 60 * 1000; // 24 hours

  createSession(userId: string, sessionId: string): void {
    const now = Date.now();
    this.sessions.set(sessionId, {
      userId,
      createdAt: now,
      lastActivity: now
    });
  }

  updateActivity(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.lastActivity = Date.now();
    return true;
  }

  isSessionValid(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const elapsedTime = Date.now() - session.lastActivity;
    return elapsedTime < this.sessionTimeout;
  }

  destroySession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getSessions(userId: string): string[] {
    return Array.from(this.sessions.entries())
      .filter(([, session]) => session.userId === userId)
      .map(([sessionId]) => sessionId);
  }

  destroyUserSessions(userId: string): number {
    const sessions = this.getSessions(userId);
    sessions.forEach(sessionId => this.destroySession(sessionId));
    return sessions.length;
  }
}

export const sessionManager = new SessionManager();
