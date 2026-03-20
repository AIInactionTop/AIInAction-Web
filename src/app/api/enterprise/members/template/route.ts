import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateMemberImportTemplate } from "@/lib/enterprise-excel";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const buffer = generateMemberImportTemplate();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="member-import-template.xlsx"',
    },
  });
}
