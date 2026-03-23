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

export default async function LoginPage() {
  const stats = await getLoginStats();
  return <LoginForm stats={stats} />;
}
