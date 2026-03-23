"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAIStudioStore, type OutlineChallenge, type PathOutline } from "@/stores/ai-studio-store";
import { useCredits } from "@/components/billing/credits-provider";
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

const STORAGE_KEY_MESSAGES = "ai-studio-outline-messages";

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

function parseChallengeDetailFromText(text: string) {
  // Try ```json ... ``` fences
  const jsonFenceMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonFenceMatch) {
    try { return JSON.parse(jsonFenceMatch[1]); } catch { /* fall through */ }
  }

  // Try ``` ... ``` fences without language hint
  const fenceMatch = text.match(/```\s*(\{[\s\S]*?\})\s*```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]); } catch { /* fall through */ }
  }

  // Try extracting a raw JSON object from the text
  const jsonObjectMatch = text.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch) {
    try { return JSON.parse(jsonObjectMatch[0]); } catch { /* fall through */ }
  }

  return null;
}

function loadMessages(): UIMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function normalizeChatError(message: string) {
  try {
    const parsed = JSON.parse(message) as {
      error?: { message?: string };
    };
    return parsed.error?.message || message;
  } catch {
    return message;
  }
}

export function AIStudioClient({ categories, locale }: Props) {
  const { pathOutline, phase, setPathOutline, setPhase } = useAIStudioStore();
  const lastParsedRef = useRef<string>("");
  const generatingChallengeRef = useRef<string | null>(null);
  const isGeneratingAllRef = useRef(false);
  const hasRestoredRef = useRef(false);
  const [generatingChallengeId, setGeneratingChallengeId] = useState<string | null>(null);
  const [localErrorMessage, setLocalErrorMessage] = useState<string | null>(null);
  const { balance, refreshCredits } = useCredits();
  const availableCredits = balance?.balance.credits ?? null;

  // Refs to break circular dependency and avoid stale closures
  const detailChatRef = useRef<ReturnType<typeof useChat>>(null!);
  const triggerDetailGenerationRef = useRef<(c: OutlineChallenge) => void>(null!);

  const outlineChat = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat/generate-outline" }),
    onFinish: ({ message }) => {
      void refreshCredits();
      const text = getTextFromMessage(message);
      const outline = parseOutlineFromText(text);
      if (outline) {
        setPathOutline(outline);
      }
    },
    onError: (error) => setLocalErrorMessage(normalizeChatError(error.message)),
  });

  const detailChat = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat/generate-challenge" }),
    onFinish: ({ message }) => {
      void refreshCredits();
      const text = getTextFromMessage(message);
      const detail = parseChallengeDetailFromText(text);
      const challengeId = generatingChallengeRef.current;

      if (detail && challengeId) {
        useAIStudioStore.getState().updateChallenge(challengeId, {
          description: detail.description,
          knowledgeContent: detail.knowledgeContent,
          objectives: detail.objectives,
          hints: detail.hints,
          resources: detail.resources,
          tags: detail.tags,
          estimatedTime: detail.estimatedTime,
          difficulty: detail.difficulty,
          isDetailGenerated: true,
        });
      } else if (challengeId) {
        // Parse failed — do NOT mark as generated so user can retry
        setLocalErrorMessage(
          `Failed to parse generated content for challenge. Raw response logged to console. You can retry.`
        );
        console.error("[AI Studio] Detail parse failed. Raw text:", text);
        isGeneratingAllRef.current = false;
      }

      generatingChallengeRef.current = null;
      setGeneratingChallengeId(null);

      // Auto-progress if generating all details
      if (isGeneratingAllRef.current) {
        const state = useAIStudioStore.getState();
        if (!state.pathOutline) return;
        const ungenerated = state.pathOutline.challenges.filter((c) => !c.isDetailGenerated);
        if (ungenerated.length > 0) {
          setTimeout(() => triggerDetailGenerationRef.current(ungenerated[0]), 500);
        } else {
          state.setPhase("done");
          isGeneratingAllRef.current = false;
        }
      }
    },
    onError: (error) => {
      // Stop "generate all" flow on error to prevent further credit consumption
      isGeneratingAllRef.current = false;
      generatingChallengeRef.current = null;
      setGeneratingChallengeId(null);
      setLocalErrorMessage(normalizeChatError(error.message));
    },
  });
  detailChatRef.current = detailChat;

  const triggerDetailGeneration = useCallback((challenge: OutlineChallenge) => {
    generatingChallengeRef.current = challenge.id;
    setGeneratingChallengeId(challenge.id);

    const { pathOutline: currentOutline } = useAIStudioStore.getState();
    const context = currentOutline
      ? `Learning Path: "${currentOutline.title}"\nChallenge to expand: "${challenge.title}" - ${challenge.summary}\nDifficulty: ${challenge.difficulty}\n\nPlease generate the full challenge details.`
      : "";

    // Use ref to always get the current detailChat instance
    const chat = detailChatRef.current;
    chat.setMessages([]);
    // Wait for state flush before sending new message
    requestAnimationFrame(() => {
      detailChatRef.current.sendMessage({ text: context });
    });
  }, []);
  triggerDetailGenerationRef.current = triggerDetailGeneration;

  const chatErrorMessage = normalizeChatError(
    outlineChat.error?.message || detailChat.error?.message || ""
  );
  const errorMessage = localErrorMessage || (chatErrorMessage || null);

  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    const saved = loadMessages();
    if (saved.length > 0) {
      outlineChat.setMessages(saved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save outline messages to localStorage
  useEffect(() => {
    if (outlineChat.messages.length > 0) {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(outlineChat.messages));
    }
  }, [outlineChat.messages]);

  // Parse outline from streaming response
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
  const isDetailLoading = detailChat.status === "submitted" || detailChat.status === "streaming";

  // Extract streaming text from the detail chat for live display
  const detailStreamingText = (() => {
    const lastAssistant = detailChat.messages.filter((m) => m.role === "assistant").at(-1);
    if (!lastAssistant) return "";
    return getTextFromMessage(lastAssistant);
  })();

  const handleSendMessage = useCallback(
    (content: string) => {
      if (balance && Number(balance.balance.credits) <= 0) {
        setLocalErrorMessage("You do not have enough credits to start a new AI request.");
        return;
      }

      setLocalErrorMessage(null);
      if (phase === "idle" || phase === "outline-done" || phase === "outlining") {
        setPhase("outlining");
        outlineChat.sendMessage({ text: content });
      }
    },
    [balance, phase, setPhase, outlineChat]
  );

  const handleGenerateDetails = useCallback(
    (challenge: OutlineChallenge) => {
      if (balance && Number(balance.balance.credits) <= 0) {
        setLocalErrorMessage("You do not have enough credits to generate challenge details.");
        return;
      }

      setLocalErrorMessage(null);
      isGeneratingAllRef.current = false;
      triggerDetailGeneration(challenge);
    },
    [balance, triggerDetailGeneration]
  );

  const handleGenerateAll = useCallback(() => {
    if (!pathOutline) return;

    if (balance && Number(balance.balance.credits) <= 0) {
      setLocalErrorMessage("You do not have enough credits to generate challenge details.");
      return;
    }

    setLocalErrorMessage(null);
    setPhase("generating-details");
    isGeneratingAllRef.current = true;
    const ungenerated = pathOutline.challenges.filter((c) => !c.isDetailGenerated);
    if (ungenerated.length > 0) {
      triggerDetailGeneration(ungenerated[0]);
    }
  }, [balance, pathOutline, setPhase, triggerDetailGeneration]);

  const handleNewSession = useCallback(() => {
    useAIStudioStore.getState().reset();
    outlineChat.setMessages([]);
    detailChat.setMessages([]);
    lastParsedRef.current = "";
    generatingChallengeRef.current = null;
    isGeneratingAllRef.current = false;
    setGeneratingChallengeId(null);
    setLocalErrorMessage(null);
    localStorage.removeItem(STORAGE_KEY_MESSAGES);
  }, [outlineChat, detailChat]);

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl">
      <div className="flex w-[40%] flex-col border-r border-border">
        <ChatPanel
          messages={outlineChat.messages}
          isLoading={isOutlineLoading}
          errorMessage={errorMessage}
          balanceLabel={availableCredits ? `${availableCredits} credits` : null}
          onSend={handleSendMessage}
          onNewSession={handleNewSession}
          hasSession={outlineChat.messages.length > 0 || !!pathOutline}
        />
      </div>
      <div className="flex w-[60%] flex-col overflow-y-auto">
        <PreviewPanel
          categories={categories}
          locale={locale}
          isDetailLoading={isDetailLoading}
          generatingChallengeId={generatingChallengeId}
          detailStreamingText={detailStreamingText}
          onGenerateDetails={handleGenerateDetails}
          onGenerateAll={handleGenerateAll}
        />
      </div>
    </div>
  );
}
