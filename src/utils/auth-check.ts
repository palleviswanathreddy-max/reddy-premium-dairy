import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken, verifyRefreshToken } from '@/db/auth-helper';
import { getCachedOrFetch, CacheKeys } from '@/utils/cache';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
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
 * Robustly checks the current request for an active NextAuth session JWT token
 * or custom accessToken/refreshToken cookies, and returns the AuthenticatedUser
 * or null if not authenticated.
 */
export async function getAuthenticatedUser(request: Request): Promise<AuthenticatedUser | null> {
  const isDev = process.env.NODE_ENV === 'development';
  const startTime = isDev ? performance.now() : 0;

  try {
    const cookieHeader = request.headers.get('cookie') || '';
    const cookies = parseCookies(cookieHeader);
    
    const accessToken = cookies['accessToken'];
    const refreshToken = cookies['refreshToken'];

    let userId = '';
    let email = '';

    // 1. Try Custom JWT Access Token
    if (accessToken) {
      const payload = verifyAccessToken(accessToken);
      if (payload) {
        userId = payload.id;
        email = payload.email;
      }
    }

    // 2. Try Custom JWT Refresh Token fallback
    if (!userId && !email && refreshToken) {
      const payload = verifyRefreshToken(refreshToken);
      if (payload) {
        userId = payload.id;
        email = payload.email;
      }
    }

    // 3. Fallback to NextAuth token decryption ONLY if neither accessToken nor refreshToken exists in cookies
    if (!userId && !email && !accessToken && !refreshToken) {
      if (isDev) {
        console.log('[DEBUG getAuthenticatedUser] Parsing token from request...');
      }
      
      let isSecure = !!(process.env.NEXTAUTH_URL?.startsWith('https://') || 
                        request.headers.get('x-forwarded-proto') === 'https' ||
                        (request.url && request.url.startsWith('https://')));
                        
      if (cookieHeader.includes('__Secure-next-auth.session-token')) {
        isSecure = true;
      } else if (cookieHeader.includes('next-auth.session-token')) {
        isSecure = false;
      }
      
      const token = await getToken({
        req: request as any,
        secret: process.env.NEXTAUTH_SECRET || 'reddy-premium-dairy-nextauth-secret-key-2026',
        secureCookie: isSecure
      });
      
      if (token) {
        userId = token.id as string;
        email = token.email as string;
      }
    }

    // 4. Look up user in DB if we resolved credentials
    if (userId || email) {
      let dbUser: { id: string; email: string | null; role: string } | null = null;
      
      if (userId) {
        dbUser = await getCachedOrFetch(CacheKeys.USER(userId), async () => {
          return prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, email: true, role: true }
          });
        });
      }
      
      if (!dbUser && email) {
        const normalizedEmail = email.toLowerCase();
        dbUser = await getCachedOrFetch(CacheKeys.USER(normalizedEmail), async () => {
          return prisma.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, email: true, role: true }
          });
        });
      }
      
      if (dbUser) {
        if (isDev) {
          const endTime = performance.now();
          console.log(`[PERF getAuthenticatedUser] Authenticated user ${dbUser.id} in ${(endTime - startTime).toFixed(2)}ms`);
        }
        return {
          id: dbUser.id,
          email: dbUser.email || '',
          role: dbUser.role
        };
      }
    }
  } catch (error) {
    console.error('[DEBUG getAuthenticatedUser] Error occurred:', error);
  }

  if (isDev) {
    const endTime = performance.now();
    console.log(`[PERF getAuthenticatedUser] Failed authentication in ${(endTime - startTime).toFixed(2)}ms`);
  }
  return null;
}
