import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createEmailTemplate } from "@/actions/admin/email-templates";

export default function NewEmailTemplatePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Create Email Template</h1>
      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createEmailTemplate} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium">
                Template Name
              </label>
              <Input
                id="name"
                name="name"
                required
                placeholder="e.g. Weekly Newsletter"
              />
            </div>
            <div>
              <label htmlFor="subject" className="mb-1.5 block text-sm font-medium">
                Email Subject
              </label>
              <Input
                id="subject"
                name="subject"
                required
                placeholder="e.g. Hey {{userName}}, check out this week's challenges!"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Supports variables: {"{{userName}}"}, {"{{userEmail}}"}, {"{{siteUrl}}"}
              </p>
            </div>
            <Button type="submit">Create & Edit Content</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
