"use client";

import { useState, useTransition, useRef } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  UserPlus,
  MoreHorizontal,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  inviteMember,
  updateMemberRole,
  removeMember,
  batchImportMembers,
} from "@/actions/enterprise-org";

type Member = {
  id: string;
  role: string;
  name: string | null;
  email: string | null;
  department1: string | null;
  department2: string | null;
  department3: string | null;
  jobTitle: string | null;
  joinedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

type Invite = {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
};

type ImportResult = {
  imported: number;
  skipped: number;
  errors: string[];
};

type Props = {
  orgId: string;
  orgSlug: string;
  members: Member[];
  pendingInvites: Invite[];
  currentUserRole: string;
  locale: string;
};

function formatDepartment(member: Member): string {
  return (
    [member.department1, member.department2, member.department3]
      .filter(Boolean)
      .join(" / ") || "—"
  );
}

export function MembersClient({
  orgId,
  orgSlug,
  members,
  pendingInvites,
  currentUserRole,
  locale,
}: Props) {
  const t = useTranslations("enterprise");
  const [isPending, startTransition] = useTransition();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImportResult, setShowImportResult] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canInvite = currentUserRole === "OWNER" || currentUserRole === "ADMIN";
  const canManageMembers = currentUserRole === "OWNER";

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    const formData = new FormData();
    formData.set("email", inviteEmail);
    formData.set("role", inviteRole);
    formData.set("locale", locale);
    startTransition(async () => {
      await inviteMember(orgId, formData);
      setInviteEmail("");
    });
  }

  function handleRoleChange(memberId: string, newRole: string) {
    const formData = new FormData();
    formData.set("role", newRole);
    startTransition(async () => {
      await updateMemberRole(orgId, memberId, formData);
    });
  }

  function handleRemove(memberId: string) {
    if (!confirm(t("removeMemberConfirm"))) return;
    startTransition(async () => {
      await removeMember(orgId, memberId);
    });
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("file", file);
    formData.set("locale", locale);

    startTransition(async () => {
      try {
        const result = await batchImportMembers(orgId, formData);
        setImportResult(result);
        setShowImportResult(true);
      } catch (err) {
        setImportResult({
          imported: 0,
          skipped: 0,
          errors: [err instanceof Error ? err.message : "Import failed"],
        });
        setShowImportResult(true);
      }
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "OWNER":
        return "default" as const;
      case "ADMIN":
        return "secondary" as const;
      default:
        return "outline" as const;
    }
  };

  // suppress unused var warning
  void orgSlug;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("members")}</h1>
          <p className="mt-1 text-muted-foreground">
            {t("membersCount", { count: members.length })}
          </p>
        </div>
        {canInvite && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href="/api/enterprise/members/template" download>
                <Download className="mr-2 h-4 w-4" />
                {t("downloadTemplate")}
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
            >
              <Upload className="mr-2 h-4 w-4" />
              {t("batchImport")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}
      </div>

      {/* Invite section */}
      {canInvite && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {t("inviteMember")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                type="email"
                placeholder={t("email")}
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1"
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="w-full sm:w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">{t("ADMIN")}</SelectItem>
                  <SelectItem value="MEMBER">{t("MEMBER")}</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleInvite} disabled={isPending}>
                {t("invite")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("avatar")}</TableHead>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("email")}</TableHead>
                <TableHead>{t("department")}</TableHead>
                <TableHead>{t("jobTitle")}</TableHead>
                <TableHead>{t("role")}</TableHead>
                <TableHead>{t("joinedDate")}</TableHead>
                {canManageMembers && <TableHead>{t("actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    {member.user?.image ? (
                      <Image
                        src={member.user.image}
                        alt={member.name ?? member.user.name ?? ""}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {(member.name ?? member.user?.name ?? "?")[0]?.toUpperCase()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {member.name ?? member.user?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {member.email ?? member.user?.email ?? "—"}
                  </TableCell>
                  <TableCell>{formatDepartment(member)}</TableCell>
                  <TableCell>{member.jobTitle ?? "—"}</TableCell>
                  <TableCell>
                    <Badge variant={roleBadgeVariant(member.role)}>
                      {t(member.role as "OWNER" | "ADMIN" | "MEMBER")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </TableCell>
                  {canManageMembers && (
                    <TableCell>
                      {member.role !== "OWNER" && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleRoleChange(
                                  member.id,
                                  member.role === "ADMIN" ? "MEMBER" : "ADMIN",
                                )
                              }
                            >
                              {t("changeRole")} →{" "}
                              {member.role === "ADMIN"
                                ? t("MEMBER")
                                : t("ADMIN")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleRemove(member.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {t("remove")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("pendingInvites")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {pendingInvites.map((invite) => (
                <li
                  key={invite.id}
                  className="flex items-center justify-between rounded-md border px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("role")}: {t(invite.role as "ADMIN" | "MEMBER")}{" "}
                      &middot; {t("expires")}:{" "}
                      {new Date(invite.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Import Result Dialog */}
      <Dialog open={showImportResult} onOpenChange={setShowImportResult}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {t("importResult")}
            </DialogTitle>
          </DialogHeader>
          {importResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {importResult.imported}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("imported")}
                  </p>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-2xl font-bold text-gray-500">
                    {importResult.skipped}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t("skipped")}
                  </p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-destructive">
                    {t("importErrors")} ({importResult.errors.length})
                  </p>
                  <ul className="max-h-40 overflow-y-auto rounded-md border p-3 text-sm">
                    {importResult.errors.map((err, i) => (
                      <li key={i} className="text-muted-foreground">
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
