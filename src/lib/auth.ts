import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from './prisma';
import { comparePassword } from '@/db/auth-helper';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        identifier: { type: 'text' },
        password: { type: 'password' },
        isPhoneLogin: { type: 'text' },
        isBiometricLogin: { type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.identifier) {
          throw new Error('Identifier is required');
        }

        const identifier = credentials.identifier;
        const password = credentials.password || '';
        const isPhoneLogin = credentials.isPhoneLogin === 'true';
        const isBiometricLogin = credentials.isBiometricLogin === 'true';

        let dbUser = null;

        if (isBiometricLogin) {
          dbUser = await prisma.user.findFirst({
            where: {
              biometricCredentialId: identifier,
              biometricsEnabled: true
            }
          });
          if (!dbUser) {
            throw new Error('No account is linked to this biometric key.');
          }
        } else if (isPhoneLogin) {
          const normalizedPhone = identifier.replace(/\D/g, '').slice(-10);
          dbUser = await prisma.user.findFirst({
            where: { phone: { endsWith: normalizedPhone } }
          });
          if (!dbUser) {
            // Auto-register phone user
            dbUser = await prisma.user.create({
              data: {
                name: `User ${normalizedPhone}`,
                email: `${normalizedPhone}@reddy.com`,
                phone: normalizedPhone,
                role: 'customer',
                passwordHash: 'otp-registered-account',
                rewardPoints: 0,
                walletBalance: 0
              }
            });
          }
        } else {
          // Regular Email/Password or Phone/Password Login
          const trimmed = identifier.trim();
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          const isEmail = emailRegex.test(trimmed);
          const normalizedIdentifier = isEmail
            ? trimmed.toLowerCase()
            : trimmed.replace(/\D/g, '').slice(-10);

          dbUser = await prisma.user.findFirst({
            where: isEmail
              ? { email: { equals: normalizedIdentifier, mode: 'insensitive' } }
              : { phone: { endsWith: normalizedIdentifier } }
          });

          if (!dbUser) {
            throw new Error('No account found with this email/mobile number. Please register first.');
          }

          if (!dbUser.passwordHash || dbUser.passwordHash === 'otp-registered-account') {
            throw new Error('No password has been set for this account. Please log in using OTP or set a password via Forgot Password.');
          }

          const isMatch = await comparePassword(password, dbUser.passwordHash);
          if (!isMatch) {
            throw new Error('Incorrect password.');
          }
        }

        // Update lastLoginAt
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { lastLoginAt: new Date() }
        });

        // Log Activity
        await prisma.activityLog.create({
          data: {
            userId: dbUser.id,
            type: 'login'
          }
        });

        return {
          id: dbUser.id,
          email: dbUser.email || '',
          name: dbUser.name,
          role: dbUser.role
        };
      }
    })
  ],
  secret: process.env.NEXTAUTH_SECRET || 'reddy-premium-dairy-nextauth-secret-key-2026',
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        try {
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });

          if (!existingUser) {
            const newUser = await prisma.user.create({
              data: {
                email,
                name: user.name || 'Google User',
                avatar: user.image || null,
                role: 'customer',
                emailVerified: true,
              },
            });
            await prisma.activityLog.create({
              data: {
                userId: newUser.id,
                type: 'register',
                meta: { method: 'google' },
              },
            });
          } else {
            // Update lastLogin
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                lastLoginAt: new Date(),
                avatar: existingUser.avatar || user.image || null,
              },
            });
          }
          return true;
        } catch (error) {
          console.error('[NextAuth] Error in signIn callback:', error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      const now = Date.now();

      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.lastVerified = now;
      }

      // To prevent database connection pool exhaustion from constant session checks,
      // only query the database to verify/refresh the user role at most once every 5 minutes.
      const shouldRefresh = !token.id || !token.role || !token.lastVerified || (now - (token.lastVerified as number) > 5 * 60 * 1000);

      if (shouldRefresh && token.email) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email.toLowerCase() },
            select: { id: true, role: true }
          });
          if (dbUser) {
            token.id = dbUser.id;
            token.role = dbUser.role;
            token.lastVerified = now;
          }
        } catch (error) {
          console.error('[NextAuth] Database query failed in jwt callback:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const sessionUser = session.user as { id?: string; role?: string };
        sessionUser.id = token.id as string;
        sessionUser.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};
