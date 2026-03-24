"use server";

import { signIn } from "@/lib/auth";

export async function sendOtpCode(email: string) {
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Invalid email" };
  }
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

export async function verifyOtpCode(email: string, code: string) {
  // Build the NextAuth callback URL for the client to navigate to.
  // We return the URL instead of using redirect() because the NextAuth callback
  // must be a full browser navigation (not a soft RSC navigation) to properly
  // set session cookies.
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const callbackUrl = new URL("/api/auth/callback/resend", baseUrl);
  callbackUrl.searchParams.set("token", code);
  callbackUrl.searchParams.set("email", email);
  callbackUrl.searchParams.set("callbackUrl", "/");
  return { url: callbackUrl.toString() };
}
