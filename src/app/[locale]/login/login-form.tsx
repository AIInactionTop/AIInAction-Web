"use client";

import { useState, useEffect, useCallback } from "react";
import { signIn } from "next-auth/react";
import { Github, Zap, Mail, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { sendOtpCode, verifyOtpCode } from "@/actions/auth";

interface LoginFormProps {
  stats: {
    challenges: number;
    builders: number;
    projects: number;
  };
}

type FormState = "email" | "otp";

export function LoginForm({ stats }: LoginFormProps) {
  const t = useTranslations("login");
  const [formState, setFormState] = useState<FormState>("email");
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = useCallback(async () => {
    if (!email || isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await sendOtpCode(email);
      if (result.success) {
        setFormState("otp");
        setCountdown(60);
      } else {
        setError(result.error || "Failed to send code");
      }
    } catch {
      setError("Failed to send code");
    } finally {
      setIsLoading(false);
    }
  }, [email, isLoading]);

  const handleVerifyCode = useCallback(async () => {
    if (!otpCode || otpCode.length !== 6 || isLoading) return;
    setIsLoading(true);
    setError("");
    try {
      const result = await verifyOtpCode(email, otpCode);
      // Full browser navigation so NextAuth can set session cookies
      window.location.href = result.url;
    } catch {
      setError("Verification failed");
      setIsLoading(false);
    }
  }, [email, otpCode, isLoading]);

  const handleResend = useCallback(async () => {
    if (countdown > 0 || isLoading) return;
    setOtpCode("");
    await handleSendCode();
  }, [countdown, isLoading, handleSendCode]);

  const formatStat = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] w-full">
      {/* Left Panel - Brand */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 p-12 md:flex">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">AI In Action</span>
          </div>
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight text-white">
            {t("brand.tagline")}
          </h2>
          <p className="mt-4 text-lg text-blue-100/80">
            {t("brand.description")}
          </p>
          <div className="mt-10 flex gap-8">
            {[
              { value: stats.challenges, label: t("stats.challenges") },
              { value: stats.builders, label: t("stats.builders") },
              { value: stats.projects, label: t("stats.projects") },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-2xl font-bold text-white">
                  {formatStat(stat.value)}
                </div>
                <div className="text-sm text-blue-200/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-sm text-blue-200/50">
          © {new Date().getFullYear()} AI In Action
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo - only visible on mobile */}
          <div className="mb-8 flex items-center justify-center gap-2 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Zap className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">AI In Action</span>
          </div>

          <div className="text-center md:text-left">
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>

          {/* Email / OTP Form */}
          <div className="mt-8">
            <AnimatePresence mode="wait">
              {formState === "email" ? (
                <motion.div
                  key="email"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="space-y-3">
                    <Input
                      type="email"
                      placeholder={t("emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                      disabled={isLoading}
                      className="h-11"
                    />
                    <Button
                      size="lg"
                      className="w-full gap-2"
                      onClick={handleSendCode}
                      disabled={!email || isLoading}
                    >
                      <Mail className="h-4 w-4" />
                      {t("sendCode")}
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setFormState("email");
                        setOtpCode("");
                        setError("");
                      }}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="h-3 w-3" />
                      {email}
                    </button>
                    <p className="text-sm text-muted-foreground">
                      {t("codeSent", { email })}
                    </p>
                    <Input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder={t("enterCode")}
                      value={otpCode}
                      onChange={(e) =>
                        setOtpCode(e.target.value.replace(/\D/g, ""))
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleVerifyCode()
                      }
                      disabled={isLoading}
                      className="h-11 text-center text-lg tracking-widest"
                      autoFocus
                    />
                    <Button
                      size="lg"
                      className="w-full"
                      onClick={handleVerifyCode}
                      disabled={otpCode.length !== 6 || isLoading}
                    >
                      {t("verify")}
                    </Button>
                    <div className="text-center">
                      {countdown > 0 ? (
                        <span className="text-sm text-muted-foreground">
                          {t("resendIn", { seconds: countdown })}
                        </span>
                      ) : (
                        <button
                          onClick={handleResend}
                          className="text-sm text-primary hover:underline"
                          disabled={isLoading}
                        >
                          {t("resendCode")}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error message */}
            {error && (
              <p className="mt-3 text-center text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">
              {t("orDivider")}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3">
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2"
              onClick={() => signIn("github", { callbackUrl: "/" })}
            >
              <Github className="h-5 w-5" />
              {t("continueGithub")}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full gap-2"
              onClick={() => signIn("google", { callbackUrl: "/" })}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {t("continueGoogle")}
            </Button>
          </div>

          {/* Terms */}
          <p className="mt-6 text-center text-xs text-muted-foreground">
            {t("terms")}
          </p>
        </div>
      </div>
    </div>
  );
}
