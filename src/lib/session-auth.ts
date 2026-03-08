import { auth } from "@/lib/auth";
import { jsonError } from "@/lib/api-auth";

export type SessionUser = {
  id: string;
  email: string | null | undefined;
  name: string | null | undefined;
  image: string | null | undefined;
};

export async function requireSessionUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return {
      user: null,
      error: jsonError("UNAUTHORIZED", "You must be signed in", 401),
    };
  }

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    } satisfies SessionUser,
    error: null,
  };
}
