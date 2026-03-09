"use client";

import { useRef, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2, RotateCcw } from "lucide-react";
import type { UIMessage } from "ai";
import ReactMarkdown from "react-markdown";

type Props = {
  messages: UIMessage[];
  isLoading: boolean;
  onSend: (content: string) => void;
  onNewSession: () => void;
  hasSession: boolean;
};

function getTextFromMessage(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function stripJsonBlocks(text: string): string {
  return text.replace(/```json\s*[\s\S]*?\s*```/g, "").trim();
}

export function ChatPanel({ messages, isLoading, onSend, onNewSession, hasSession }: Props) {
  const t = useTranslations("aiStudio");
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="text-lg font-semibold">{t("title")}</h2>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {hasSession && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNewSession}
            title={t("newSession")}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const rawText = getTextFromMessage(message);
          const displayText = message.role === "assistant" ? stripJsonBlocks(rawText) : rawText;
          if (!displayText) return null;

          return (
            <div key={message.id} className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                {message.role === "assistant" ? (
                  <Bot className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none flex-1 overflow-hidden">
                <ReactMarkdown>{displayText}</ReactMarkdown>
              </div>
            </div>
          );
        })}
        {isLoading && messages.at(-1)?.role !== "assistant" && (
          <div className="flex gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("generating")}
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("inputPlaceholder")}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
