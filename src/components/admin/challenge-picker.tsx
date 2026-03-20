"use client";

import { useState, useTransition, useRef } from "react";
import { Search, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  searchChallengesAction,
  addActivityChallenge,
} from "@/actions/admin/activities";

type Challenge = {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
};

export function ChallengePicker({
  activityId,
  existingChallengeIds,
}: {
  activityId: string;
  existingChallengeIds: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Challenge[]>([]);
  const [isSearching, startSearch] = useTransition();
  const [isAdding, startAdd] = useTransition();
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setResults([]);
      setAddedIds(new Set());
    }
  }

  function handleSearch(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      const allExcluded = [...existingChallengeIds, ...addedIds];
      startSearch(async () => {
        const data = await searchChallengesAction(value, allExcluded);
        setResults(data);
      });
    }, 300);
  }

  function handleAdd(challengeId: string) {
    startAdd(async () => {
      await addActivityChallenge(activityId, challengeId);
      setAddedIds((prev) => new Set(prev).add(challengeId));
      setResults((prev) => prev.filter((c) => c.id !== challengeId));
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Challenge
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Challenge to Activity</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search challenges by title..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {isSearching ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-2">
                {results.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-md border p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{c.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {c.difficulty}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isAdding}
                      onClick={() => handleAdd(c.id)}
                    >
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            ) : query.trim() ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No challenges found.
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Type to search for challenges.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
