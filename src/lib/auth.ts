import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
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
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
};
