import { randomInt } from "crypto";
import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { prisma } from "./prisma";
import { sendWelcomeEmail, sendOtpEmail } from "./email";

// Set global proxy for all fetch calls (needed for Google OAuth in China)
const proxyUrl =
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  process.env.https_proxy ||
  process.env.http_proxy;
if (proxyUrl) {
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
}

function generateOtpCode(): string {
  return randomInt(100000, 1000000).toString();
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      profile(profile) {
        return {
          id: profile.id.toString(),
          name: profile.name || profile.login,
          email: profile.email,
          image: profile.avatar_url,
          githubId: profile.id.toString(),
          githubUrl: profile.html_url,
          bio: profile.bio,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "AI In Action <noreply@aiinaction.top>",
      maxAge: 600, // 10 minutes
      generateVerificationToken() {
        return generateOtpCode();
      },
      async sendVerificationRequest({ identifier: email, url }) {
        // Extract the token (OTP code) from the magic link URL
        const urlObj = new URL(url);
        const token = urlObj.searchParams.get("token");
        if (!token) throw new Error("Missing verification token");
        await sendOtpEmail(email, token);
      },
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  events: {
    async createUser({ user }) {
      if (user.email) {
        try {
          await sendWelcomeEmail(user.name || "", user.email);
        } catch {
          // Graceful degradation — don't block sign-in if email fails
        }
      }
    },
  },
});
