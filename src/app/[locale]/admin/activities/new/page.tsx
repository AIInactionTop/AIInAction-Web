import { createAdminActivity } from "@/actions/admin/activities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function NewActivityPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">New Activity</h1>
      <Card>
        <CardHeader>
          <CardTitle>Activity Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAdminActivity} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Title *</label>
              <Input name="title" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Description *
              </label>
              <Textarea name="description" required rows={3} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Type *</label>
              <Select name="type" required defaultValue="GENERAL">
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
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
              <label className="mb-1 block text-sm font-medium">Content</label>
              <Textarea name="content" rows={5} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                External URL
              </label>
              <Input name="externalUrl" type="url" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Start Date
                </label>
                <Input name="startDate" type="date" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">
                  End Date
                </label>
                <Input name="endDate" type="date" />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">
                Cover Image URL
              </label>
              <Input name="coverImage" type="url" />
            </div>
            <Button type="submit" className="w-full">
              Create Activity
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
