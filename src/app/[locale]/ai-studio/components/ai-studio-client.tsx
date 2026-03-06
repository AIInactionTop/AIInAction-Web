"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useAIStudioStore, type OutlineChallenge, type PathOutline } from "@/stores/ai-studio-store";
import { ChatPanel } from "./chat-panel";
import { PreviewPanel } from "./preview-panel";

type Category = {
  id: string;
  slug: string;
  name: string;
};

type Props = {
  categories: Category[];
  locale: string;
};

function getTextFromMessage(message: UIMessage): string {
  return message.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function parseOutlineFromText(text: string): PathOutline | null {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (!jsonMatch) return null;

  try {
    const data = JSON.parse(jsonMatch[1]);
    if (!data.pathTitle || !data.challenges) return null;

    return {
      title: data.pathTitle,
      description: data.pathDescription || "",
      icon: data.icon || "📚",
      color: data.color || "blue",
      categorySlug: data.categorySlug || "",
      challenges: data.challenges.map((c: { title: string; summary: string; difficulty: string }, i: number) => ({
        id: `challenge-${i}-${Date.now()}`,
        title: c.title,
        summary: c.summary,
        difficulty: c.difficulty || "BEGINNER",
        order: i,
        isDetailGenerated: false,
      })),
    };
  } catch {
    return null;
  }
}

export function AIStudioClient({ categories, locale }: Props) {
  const t = useTranslations("aiStudio");
  const { pathOutline, phase, setPathOutline, setPhase } = useAIStudioStore();
  const lastParsedRef = useRef<string>("");

  const outlineChat = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat/generate-outline" }),
    onFinish: ({ message }) => {
      const text = getTextFromMessage(message);
      const outline = parseOutlineFromText(text);
      if (outline) {
        setPathOutline(outline);
      }
    },
  });

  const detailChat = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat/generate-challenge" }),
  });

  useEffect(() => {
    const lastAssistant = outlineChat.messages
      .filter((m) => m.role === "assistant")
      .at(-1);
    if (!lastAssistant) return;

    const text = getTextFromMessage(lastAssistant);
    if (text === lastParsedRef.current) return;

    const outline = parseOutlineFromText(text);
    if (outline) {
      lastParsedRef.current = text;
      setPathOutline(outline);
    }
  }, [outlineChat.messages, setPathOutline]);

  const isOutlineLoading = outlineChat.status === "submitted" || outlineChat.status === "streaming";

  const handleSendMessage = useCallback(
    (content: string) => {
      if (phase === "idle" || phase === "outline-done" || phase === "outlining") {
        setPhase("outlining");
        outlineChat.sendMessage({ text: content });
      }
    },
    [phase, setPhase, outlineChat]
  );

  const handleGenerateDetails = useCallback(
    (challenge: OutlineChallenge) => {
      const context = pathOutline
        ? `Learning Path: "${pathOutline.title}"\nChallenge to expand: "${challenge.title}" - ${challenge.summary}\nDifficulty: ${challenge.difficulty}\n\nPlease generate the full challenge details.`
        : "";
      detailChat.sendMessage({ text: context });
    },
    [pathOutline, detailChat]
  );

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl">
      <div className="flex w-[40%] flex-col border-r border-border">
        <ChatPanel
          messages={outlineChat.messages}
          isLoading={isOutlineLoading}
          onSend={handleSendMessage}
        />
      </div>
      <div className="flex w-[60%] flex-col overflow-y-auto">
        <PreviewPanel
          categories={categories}
          locale={locale}
          detailChat={detailChat}
          onGenerateDetails={handleGenerateDetails}
        />
      </div>
    </div>
  );
}
