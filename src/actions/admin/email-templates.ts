"use server";

import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createEmailTemplate(formData: FormData) {
  await requireAdmin();

  const name = formData.get("name") as string;
  const subject = formData.get("subject") as string;

  if (!name || !subject) {
    throw new Error("Name and subject are required");
  }

  const template = await prisma.emailTemplate.create({
    data: {
      name,
      subject,
      content: { type: "doc", content: [{ type: "paragraph" }] },
      variables: ["userName", "userEmail", "siteUrl"],
    },
  });

  redirect(`/admin/emails/${template.id}`);
}

export async function updateEmailTemplate(
  id: string,
  data: {
    name?: string;
    subject?: string;
    content?: unknown;
    htmlContent?: string;
    variables?: string[];
    status?: "DRAFT" | "ACTIVE";
  }
) {
  await requireAdmin();

  await prisma.emailTemplate.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.content !== undefined && { content: data.content as import("@prisma/client").Prisma.InputJsonValue }),
      ...(data.htmlContent !== undefined && { htmlContent: data.htmlContent }),
      ...(data.variables !== undefined && { variables: data.variables }),
      ...(data.status !== undefined && { status: data.status }),
    },
  });

  revalidatePath(`/admin/emails/${id}`);
}

export async function deleteEmailTemplate(id: string) {
  await requireAdmin();

  const template = await prisma.emailTemplate.findUnique({
    where: { id },
    include: { _count: { select: { sendLogs: true } } },
  });

  if (!template) throw new Error("Template not found");

  if (template._count.sendLogs > 0) {
    await prisma.emailTemplate.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
  } else {
    await prisma.emailTemplate.delete({ where: { id } });
  }

  revalidatePath("/admin/emails");
  redirect("/admin/emails");
}
