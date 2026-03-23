"use server";

import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";

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
  // Redirect server-side to the NextAuth callback URL.
  // This prevents the client from seeing or manipulating the callback URL.
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const callbackUrl = new URL("/api/auth/callback/resend", baseUrl);
  callbackUrl.searchParams.set("token", code);
  callbackUrl.searchParams.set("email", email);
  callbackUrl.searchParams.set("callbackUrl", "/");
  redirect(callbackUrl.toString());
}
