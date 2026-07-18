import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { logger } from '@/utils/logger';
import { verifyAccessToken, verifyRefreshToken } from '@/db/auth-helper';

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
  isAuthenticated: boolean;
}

function parseCookies(cookieHeader: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts[0].trim();
    const value = parts.slice(1).join('=').trim();
    if (name) {
      list[name] = decodeURIComponent(value);
    }
  });

  return list;
}

/**
 * Middleware: Verify NextAuth Session or custom JWT token and attach to request
 */
export function withAuth(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      const cookieHeader = request.headers.get('cookie') || '';
      const cookies = parseCookies(cookieHeader);

      let userId = '';
      let email = '';

      // 1. Try Custom JWT Access Token
      const accessToken = cookies['accessToken'];
      if (accessToken) {
        const payload = verifyAccessToken(accessToken);
        if (payload) {
          userId = payload.id;
          email = payload.email;
        }
      }

      // 2. Try Custom JWT Refresh Token
      if (!userId && !email) {
        const refreshToken = cookies['refreshToken'];
        if (refreshToken) {
          const payload = verifyRefreshToken(refreshToken);
          if (payload) {
            userId = payload.id;
            email = payload.email;
          }
        }
      }

      // 3. Fallback to NextAuth token decryption
      if (!userId && !email) {
        console.log('[DEBUG withAuth] Parsing token from request...');
        let isSecure = !!(process.env.NEXTAUTH_URL?.startsWith('https://') || 
                          request.headers.get('x-forwarded-proto') === 'https' ||
                          (request.url && request.url.startsWith('https://')));
                          
        if (cookieHeader.includes('__Secure-next-auth.session-token')) {
          isSecure = true;
        } else if (cookieHeader.includes('next-auth.session-token')) {
          isSecure = false;
        }

        const token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET || 'reddy-premium-dairy-nextauth-secret-key-2026',
          secureCookie: isSecure
        });

        if (token) {
          userId = token.id as string;
          email = token.email || '';
        }
      }

      if (!userId && !email) {
        return NextResponse.json(
          { error: 'Missing or invalid session' },
          { status: 401 }
        );
      }

      let dbUser = null;
      if (userId) {
        dbUser = await prisma.user.findUnique({
          where: { id: userId }
        });
      }

      if (!dbUser && email) {
        const normalizedEmail = email.toLowerCase();
        dbUser = await prisma.user.findUnique({
          where: { email: normalizedEmail }
        });
      }

      if (!dbUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 401 }
        );
      }

      const auth: AuthContext = {
        userId: dbUser.id,
        email: dbUser.email || '',
        role: dbUser.role,
        isAuthenticated: true
      };

      // Attach auth context to request
      (request as any).auth = auth;
      
      const routeContext = args[0] || {};
      return handler(request, { auth, ...routeContext });
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
