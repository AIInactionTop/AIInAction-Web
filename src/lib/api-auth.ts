import { createHash, randomBytes } from "crypto";
import { prisma } from "./prisma";

const API_KEY_PREFIX = "aia_";

export function generateApiKey(): string {
  return API_KEY_PREFIX + randomBytes(32).toString("hex");
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export type ApiUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export type AuthenticatedApiKey = {
  apiKeyId: string;
  user: ApiUser;
};

export async function authenticateApiRequest(
  request: Request
): Promise<AuthenticatedApiKey | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const rawKey = authHeader.slice(7);
  if (!rawKey.startsWith(API_KEY_PREFIX)) return null;

  const hashedKey = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  if (!apiKey) return null;

  // Update lastUsedAt (fire and forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {});

  return {
    apiKeyId: apiKey.id,
    user: apiKey.user,
  };
}

export async function authenticateApiKey(
  request: Request
): Promise<ApiUser | null> {
  const authenticated = await authenticateApiRequest(request);
  return authenticated?.user ?? null;
}

export function jsonSuccess(data: unknown, status = 200) {
  return Response.json({ success: true, data }, { status });
}

export function jsonError(code: string, message: string, status = 400) {
  return Response.json(
    { success: false, error: { code, message } },
    { status }
  );
}

export async function requireAuth(request: Request) {
  const authenticated = await authenticateApiRequest(request);
  if (!authenticated) {
    return { user: null, error: jsonError("UNAUTHORIZED", "Invalid or missing API key", 401) };
  }
  return { user: authenticated.user, error: null };
}

export async function requireApiKeySession(request: Request) {
  const authenticated = await authenticateApiRequest(request);
  if (!authenticated) {
    return {
      apiKeyId: null,
      user: null,
      error: jsonError("UNAUTHORIZED", "Invalid or missing API key", 401),
    };
  }

  return {
    apiKeyId: authenticated.apiKeyId,
    user: authenticated.user,
    error: null,
  };
}
