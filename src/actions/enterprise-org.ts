"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { RESERVED_SLUGS } from "@/types/enterprise";
import crypto from "crypto";
import { parseMemberImportFile } from "@/lib/enterprise-excel";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function generateUniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  if (!slug) slug = "org";
  let suffix = 0;
  while (
    RESERVED_SLUGS.includes(slug) ||
    (await prisma.organization.findUnique({ where: { slug } }))
  ) {
    suffix++;
    slug = `${slugify(base) || "org"}-${suffix}`;
  }
  return slug;
}

async function requireOrgRole(
  orgId: string,
  userId: string,
  allowedRoles: string[],
) {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId: orgId, userId },
    },
  });
  if (!member || !allowedRoles.includes(member.role)) {
    throw new Error("Forbidden");
  }
  return member;
}

export async function createOrganization(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const industry = (formData.get("industry") as string) || "OTHER";
  const size = (formData.get("size") as string) || "SMALL_1_50";
  const locale = (formData.get("locale") as string) || "en";

  if (!name?.trim()) throw new Error("Name is required");

  const slug = await generateUniqueSlug(name);

  await prisma.organization.create({
    data: {
      name: name.trim(),
      slug,
      description,
      industry: industry as
        | "TECHNOLOGY"
        | "FINANCE"
        | "HEALTHCARE"
        | "EDUCATION"
        | "MANUFACTURING"
        | "RETAIL"
        | "OTHER",
      size: size as
        | "SMALL_1_50"
        | "MEDIUM_51_200"
        | "LARGE_201_1000"
        | "ENTERPRISE_1000_PLUS",
      ownerId: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: "OWNER",
        },
      },
    },
  });

  revalidatePath(`/${locale}/enterprise`);
  redirect(`/${locale}/enterprise/${slug}`);
}

export async function updateOrganization(orgId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireOrgRole(orgId, session.user.id, ["OWNER", "ADMIN"]);

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || null;
  const industry = (formData.get("industry") as string) || "OTHER";
  const size = (formData.get("size") as string) || "SMALL_1_50";
  const locale = (formData.get("locale") as string) || "en";

  const org = await prisma.organization.update({
    where: { id: orgId },
    data: {
      name: name?.trim() || undefined,
      description,
      industry: industry as
        | "TECHNOLOGY"
        | "FINANCE"
        | "HEALTHCARE"
        | "EDUCATION"
        | "MANUFACTURING"
        | "RETAIL"
        | "OTHER",
      size: size as
        | "SMALL_1_50"
        | "MEDIUM_51_200"
        | "LARGE_201_1000"
        | "ENTERPRISE_1000_PLUS",
    },
  });

  revalidatePath(`/${locale}/enterprise/${org.slug}`);
  revalidatePath(`/${locale}/enterprise/${org.slug}/settings`);
}

export async function deleteOrganization(orgId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireOrgRole(orgId, session.user.id, ["OWNER"]);

  await prisma.organization.delete({ where: { id: orgId } });

  revalidatePath("/enterprise");
  redirect("/enterprise");
}

export async function inviteMember(orgId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireOrgRole(orgId, session.user.id, ["OWNER", "ADMIN"]);

  const email = formData.get("email") as string;
  const role = (formData.get("role") as string) || "MEMBER";
  const locale = (formData.get("locale") as string) || "en";

  if (!email?.trim()) throw new Error("Email is required");

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { slug: true },
  });
  if (!org) throw new Error("Organization not found");

  await prisma.organizationInvite.create({
    data: {
      organizationId: orgId,
      email: email.trim().toLowerCase(),
      token,
      role: role as "OWNER" | "ADMIN" | "MEMBER",
      expiresAt,
    },
  });

  revalidatePath(`/${locale}/enterprise/${org.slug}/members`);
}

export async function acceptInvite(token: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
    include: { organization: { select: { slug: true } } },
  });

  if (!invite) throw new Error("Invite not found");
  if (invite.acceptedAt) throw new Error("Invite already accepted");
  if (invite.expiresAt < new Date()) throw new Error("Invite expired");

  // Check if already a member
  const existing = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: invite.organizationId,
        userId: session.user.id,
      },
    },
  });

  if (!existing) {
    await prisma.organizationMember.create({
      data: {
        organizationId: invite.organizationId,
        userId: session.user.id,
        role: invite.role,
      },
    });
  }

  await prisma.organizationInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  redirect(`/enterprise/${invite.organization.slug}`);
}

export async function removeMember(orgId: string, memberId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireOrgRole(orgId, session.user.id, ["OWNER"]);

  const member = await prisma.organizationMember.findUnique({
    where: { id: memberId },
  });

  if (!member || member.organizationId !== orgId) {
    throw new Error("Member not found");
  }
  if (member.userId === session.user.id) {
    throw new Error("Cannot remove yourself");
  }

  await prisma.organizationMember.delete({ where: { id: memberId } });

  revalidatePath("/enterprise");
}

export async function updateMemberRole(
  orgId: string,
  memberId: string,
  formData: FormData,
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireOrgRole(orgId, session.user.id, ["OWNER"]);

  const role = formData.get("role") as string;
  if (!role) throw new Error("Role is required");

  const member = await prisma.organizationMember.findUnique({
    where: { id: memberId },
  });

  if (!member || member.organizationId !== orgId) {
    throw new Error("Member not found");
  }

  await prisma.organizationMember.update({
    where: { id: memberId },
    data: { role: role as "OWNER" | "ADMIN" | "MEMBER" },
  });

  revalidatePath("/enterprise");
}

export async function batchImportMembers(orgId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await requireOrgRole(orgId, session.user.id, ["OWNER", "ADMIN"]);

  const file = formData.get("file") as File;
  const locale = (formData.get("locale") as string) || "en";
  if (!file) throw new Error("File is required");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { rows, errors } = parseMemberImportFile(buffer);

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { slug: true },
  });
  if (!org) throw new Error("Organization not found");

  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    const email = row.email.toLowerCase();

    // Check if already a member by email
    const existingByEmail = await prisma.organizationMember.findFirst({
      where: { organizationId: orgId, email },
    });
    if (existingByEmail) {
      skipped++;
      continue;
    }

    // Check if user exists on platform — link if so
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      // Also check if already a member by userId
      const existingByUser = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: { organizationId: orgId, userId: user.id },
        },
      });
      if (existingByUser) {
        skipped++;
        continue;
      }
    }

    // Create member directly (userId is optional — will be linked when user registers)
    await prisma.organizationMember.create({
      data: {
        organizationId: orgId,
        userId: user?.id ?? null,
        name: row.name,
        email,
        role: row.role,
        department1: row.department1,
        department2: row.department2,
        department3: row.department3,
        jobTitle: row.jobTitle,
      },
    });
    imported++;
  }

  revalidatePath(`/${locale}/enterprise/${org.slug}/members`);

  return { imported, skipped, errors };
}
