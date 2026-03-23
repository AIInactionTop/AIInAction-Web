"use server";

import { signIn } from "@/lib/auth";

export async function sendOtpCode(email: string) {
  try {
    await signIn("resend", {
      email,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    // NextAuth signIn with redirect:false throws on redirect (expected behavior)
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      return { success: true };
    }
    return { success: false, error: "Failed to send code" };
  }
}

export async function getOtpCallbackUrl(email: string, code: string) {
  // Construct the NextAuth callback URL that verifies the token.
  // This is the same URL that magic links point to — we just build it manually.
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const callbackUrl = new URL("/api/auth/callback/resend", baseUrl);
  callbackUrl.searchParams.set("token", code);
  callbackUrl.searchParams.set("email", email);
  callbackUrl.searchParams.set("callbackUrl", "/");
  return callbackUrl.toString();
}
