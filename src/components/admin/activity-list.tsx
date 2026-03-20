"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  deleteAdminActivity,
  updateActivityStatus,
} from "@/actions/admin/activities";
import type { ActivityStatus, ActivityType } from "@prisma/client";

type Activity = {
  id: string;
  title: string;
  type: ActivityType;
  status: ActivityStatus;
  startDate: string | null;
  endDate: string | null;
  updatedAt: string;
  author: { id: string; name: string | null; image: string | null } | null;
  _count: { challenges: number };
};

type Stats = {
  total: number;
  active: number;
  upcoming: number;
  ended: number;
};

const typeLabels: Record<ActivityType, string> = {
  HACKATHON: "Hackathon",
  THEMED: "Themed",
  EXTERNAL: "External",
  GENERAL: "General",
};

function StatusSelect({
  activityId,
  currentStatus,
}: {
  activityId: string;
  currentStatus: ActivityStatus;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      defaultValue={currentStatus}
      disabled={isPending}
      onValueChange={(value) => {
        startTransition(() => {
          updateActivityStatus(activityId, value as ActivityStatus);
        });
      }}
    >
      <SelectTrigger className="h-8 w-[120px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="DRAFT">Draft</SelectItem>
        <SelectItem value="UPCOMING">Upcoming</SelectItem>
        <SelectItem value="ACTIVE">Active</SelectItem>
        <SelectItem value="ENDED">Ended</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function ActivityList({
  activities,
  stats,
}: {
  activities: Activity[];
  stats: Stats;
}) {
  const locale = useLocale();

  return (
    <div>
      {/* Stats row */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total },
          { label: "Active", value: stats.active },
          { label: "Upcoming", value: stats.upcoming },
          { label: "Ended", value: stats.ended },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Activities</h1>
        <Button asChild>
          <Link href={`/${locale}/admin/activities/new`}>
            <Plus className="mr-2 h-4 w-4" />
            New Activity
          </Link>
        </Button>
      </div>

      {/* Table */}
      {activities.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          No activities yet. Create your first one.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Challenges</TableHead>
              <TableHead>Author</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activities.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/${locale}/admin/activities/${a.id}`}
                    className="hover:underline"
                  >
                    {a.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{typeLabels[a.type]}</Badge>
                </TableCell>
                <TableCell>
                  <StatusSelect
                    activityId={a.id}
                    currentStatus={a.status}
                  />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {a.startDate
                    ? new Date(a.startDate).toLocaleDateString()
                    : "-"}
                  {" ~ "}
                  {a.endDate
                    ? new Date(a.endDate).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell>{a._count.challenges}</TableCell>
                <TableCell className="text-muted-foreground">
                  {a.author?.name ?? "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/${locale}/admin/activities/${a.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <form action={deleteAdminActivity.bind(null, a.id)}>
                      <Button variant="ghost" size="icon" type="submit">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
