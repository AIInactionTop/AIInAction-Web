import { prisma } from "@/lib/prisma";
import { LoginForm } from "./login-form";

async function getLoginStats() {
  const [challenges, builders, projects] = await Promise.all([
    prisma.challenge.count(),
    prisma.user.count(),
    prisma.sharedProject.count(),
  ]);
  return { challenges, builders, projects };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string }>;
}) {
  const [stats, params] = await Promise.all([getLoginStats(), searchParams]);
  return <LoginForm stats={stats} initialVerify={params.verify === "1"} />;
}
