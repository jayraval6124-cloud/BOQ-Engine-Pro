import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.id = user.id as string; }
      return token;
    },
    async session({ session, token }) {
      if (token) { session.user.id = token.id as string; }
      return session;
    },
  },
};
