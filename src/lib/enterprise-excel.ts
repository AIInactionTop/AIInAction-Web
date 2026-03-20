import * as XLSX from "xlsx";

// Generate a downloadable Excel template for batch member import
export function generateMemberImportTemplate(): Buffer {
  const wb = XLSX.utils.book_new();
  const headers = [
    "姓名/Name",
    "邮箱/Email",
    "一级部门/Dept L1",
    "二级部门/Dept L2",
    "三级部门/Dept L3",
    "岗位/Job Title",
    "角色/Role (ADMIN/MEMBER)",
  ];
  const exampleRow = [
    "张三",
    "zhangsan@company.com",
    "技术部",
    "前端组",
    "React团队",
    "高级工程师",
    "MEMBER",
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);

  // Set column widths
  ws["!cols"] = headers.map(() => ({ wch: 20 }));

  XLSX.utils.book_append_sheet(wb, ws, "Members");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

// Parse uploaded Excel file and return member data
export type ImportMemberRow = {
  name: string;
  email: string;
  department1?: string;
  department2?: string;
  department3?: string;
  jobTitle?: string;
  role: "ADMIN" | "MEMBER";
};

export function parseMemberImportFile(buffer: Buffer): {
  rows: ImportMemberRow[];
  errors: string[];
} {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

  const rows: ImportMemberRow[] = [];
  const errors: string[] = [];

  // Skip header row
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0 || !row[0]) continue;

    const name = String(row[0] || "").trim();
    const email = String(row[1] || "").trim();

    if (!email) {
      errors.push(`Row ${i + 1}: missing email`);
      continue;
    }
    if (!email.includes("@")) {
      errors.push(`Row ${i + 1}: invalid email "${email}"`);
      continue;
    }

    const roleStr = String(row[6] || "MEMBER")
      .trim()
      .toUpperCase();
    const role = roleStr === "ADMIN" ? "ADMIN" : "MEMBER";

    rows.push({
      name,
      email,
      department1: String(row[2] || "").trim() || undefined,
      department2: String(row[3] || "").trim() || undefined,
      department3: String(row[4] || "").trim() || undefined,
      jobTitle: String(row[5] || "").trim() || undefined,
      role,
    });
  }

  return { rows, errors };
}
