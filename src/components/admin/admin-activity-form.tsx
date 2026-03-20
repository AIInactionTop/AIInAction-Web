"use client";

import { useState, useTransition } from "react";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  updateAdminActivity,
  removeActivityChallenge,
  reorderActivityChallenges,
} from "@/actions/admin/activities";
import { ChallengePicker } from "@/components/admin/challenge-picker";
import { ImageUpload } from "@/components/ui/image-upload";
import type { ActivityType, ActivityStatus } from "@prisma/client";

type Challenge = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
};

type ActivityChallenge = {
  challengeId: string;
  order: number;
  challenge: Challenge;
};

type Activity = {
  id: string;
  title: string;
  description: string;
  type: ActivityType;
  status: ActivityStatus;
  content: string | null;
  externalUrl: string | null;
  startDate: string | null;
  endDate: string | null;
  coverImage: string | null;
  challenges: ActivityChallenge[];
};

function formatDateForInput(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toISOString().split("T")[0];
}

export function AdminActivityForm({ activity }: { activity: Activity }) {
  const [isReordering, startReorder] = useTransition();
  const [coverImage, setCoverImage] = useState(activity.coverImage ?? "");
  const challengeIds = activity.challenges.map((ac) => ac.challengeId);

  function handleMoveUp(index: number) {
    if (index === 0) return;
    const ids = [...challengeIds];
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    startReorder(() => {
      reorderActivityChallenges(activity.id, ids);
    });
  }

  function handleMoveDown(index: number) {
    if (index === challengeIds.length - 1) return;
    const ids = [...challengeIds];
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    startReorder(() => {
      reorderActivityChallenges(activity.id, ids);
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Edit Activity</h1>

      {/* Section 1: Activity Details */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={updateAdminActivity.bind(null, activity.id)}
            className="space-y-4"
          >
            <div>
              <label className="mb-1 block text-sm font-medium">Title *</label>
              <Input name="title" required defaultValue={activity.title} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Description *
              </label>
              <Textarea
                name="description"
                required
                rows={3}
                defaultValue={activity.description}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Type</label>
                <Select name="type" defaultValue={activity.type}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HACKATHON">Hackathon</SelectItem>
                    <SelectItem value="THEMED">Themed</SelectItem>
                    <SelectItem value="EXTERNAL">External</SelectItem>
                    <SelectItem value="GENERAL">General</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Status
                </label>
                <Select name="status" defaultValue={activity.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="UPCOMING">Upcoming</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="ENDED">Ended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Content</label>
              <Textarea
                name="content"
                rows={5}
                defaultValue={activity.content ?? ""}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                External URL
              </label>
              <Input
                name="externalUrl"
                type="url"
                defaultValue={activity.externalUrl ?? ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Start Date
                </label>
                <Input
                  name="startDate"
                  type="date"
                  defaultValue={formatDateForInput(activity.startDate)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  End Date
                </label>
                <Input
                  name="endDate"
                  type="date"
                  defaultValue={formatDateForInput(activity.endDate)}
                />
              </div>
            </div>
            <div>
              <ImageUpload
                value={coverImage}
                onChange={setCoverImage}
                label="Cover Image"
              />
              <input type="hidden" name="coverImage" value={coverImage} />
            </div>
            <Button type="submit" className="w-full">
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Section 2: Associated Challenges */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Associated Challenges</CardTitle>
          <ChallengePicker
            activityId={activity.id}
            existingChallengeIds={challengeIds}
          />
        </CardHeader>
        <CardContent>
          {activity.challenges.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              No challenges associated yet. Add some above.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Order</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.challenges.map((ac, index) => (
                  <TableRow key={ac.challengeId}>
                    <TableCell className="text-muted-foreground">
                      #{index + 1}
                    </TableCell>
                    <TableCell className="font-medium">
                      {ac.challenge.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ac.challenge.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={index === 0 || isReordering}
                          onClick={() => handleMoveUp(index)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={
                            index === activity.challenges.length - 1 ||
                            isReordering
                          }
                          onClick={() => handleMoveDown(index)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <form
                          action={removeActivityChallenge.bind(
                            null,
                            activity.id,
                            ac.challengeId
                          )}
                        >
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
        </CardContent>
      </Card>
    </div>
  );
}
