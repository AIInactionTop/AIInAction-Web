import { getEmailSendLogs } from "@/lib/admin-emails";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EmailSendStatus } from "@prisma/client";

const statusConfig: Record<EmailSendStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  PENDING: { label: "Pending", variant: "outline" },
  SENDING: { label: "Sending", variant: "secondary" },
  COMPLETED: { label: "Completed", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
};

const filterLabels: Record<string, string> = {
  all: "All Users",
  active_30d: "Active (30 days)",
  completed_challenge: "Completed Challenge",
  has_project: "Has Project",
};

export default async function EmailSendLogsPage() {
  const { logs } = await getEmailSendLogs();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Send History</h1>

      {logs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No emails have been sent yet.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Filter</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Success</TableHead>
              <TableHead>Failed</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Sent By</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const config = statusConfig[log.status];
              return (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {log.template.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {filterLabels[log.recipientFilter] || log.recipientFilter}
                  </TableCell>
                  <TableCell>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </TableCell>
                  <TableCell className="text-emerald-600">{log.successCount}</TableCell>
                  <TableCell className="text-destructive">{log.failCount}</TableCell>
                  <TableCell>{log.totalCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.sentBy.name || log.sentBy.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.sentAt
                      ? new Date(log.sentAt).toLocaleString()
                      : new Date(log.createdAt).toLocaleString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
