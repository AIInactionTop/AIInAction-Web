import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OutlineChallenge = {
  id: string;
  title: string;
  summary: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";
  order: number;
  description?: string;
  knowledgeContent?: string;
  objectives?: string[];
  hints?: string[];
  resources?: string[];
  tags?: string[];
  estimatedTime?: string;
  isDetailGenerated: boolean;
};

export type PathOutline = {
  title: string;
  description: string;
  icon: string;
  color: string;
  categorySlug: string;
  challenges: OutlineChallenge[];
};

type GenerationPhase = "idle" | "outlining" | "outline-done" | "generating-details" | "done";

type AIStudioState = {
  phase: GenerationPhase;
  pathOutline: PathOutline | null;
  activeChallenge: string | null;
  setPhase: (phase: GenerationPhase) => void;
  setPathOutline: (outline: PathOutline) => void;
  updatePathField: (field: keyof Pick<PathOutline, "title" | "description" | "icon" | "color" | "categorySlug">, value: string) => void;
  updateChallenge: (id: string, updates: Partial<OutlineChallenge>) => void;
  addChallenge: (challenge: OutlineChallenge) => void;
  removeChallenge: (id: string) => void;
  reorderChallenges: (challenges: OutlineChallenge[]) => void;
  setActiveChallenge: (id: string | null) => void;
  reset: () => void;
};

const initialState = {
  phase: "idle" as GenerationPhase,
  pathOutline: null as PathOutline | null,
  activeChallenge: null as string | null,
};

export const useAIStudioStore = create<AIStudioState>()(
  persist(
    (set) => ({
      ...initialState,

      setPhase: (phase) => set({ phase }),

      setPathOutline: (outline) => set({ pathOutline: outline, phase: "outline-done" }),

      updatePathField: (field, value) =>
        set((state) => ({
          pathOutline: state.pathOutline ? { ...state.pathOutline, [field]: value } : null,
        })),

      updateChallenge: (id, updates) =>
        set((state) => ({
          pathOutline: state.pathOutline
            ? {
                ...state.pathOutline,
                challenges: state.pathOutline.challenges.map((c) =>
                  c.id === id ? { ...c, ...updates } : c
                ),
              }
            : null,
        })),

      addChallenge: (challenge) =>
        set((state) => ({
          pathOutline: state.pathOutline
            ? { ...state.pathOutline, challenges: [...state.pathOutline.challenges, challenge] }
            : null,
        })),

      removeChallenge: (id) =>
        set((state) => ({
          pathOutline: state.pathOutline
            ? {
                ...state.pathOutline,
                challenges: state.pathOutline.challenges.filter((c) => c.id !== id),
              }
            : null,
        })),

      reorderChallenges: (challenges) =>
        set((state) => ({
          pathOutline: state.pathOutline ? { ...state.pathOutline, challenges } : null,
        })),

      setActiveChallenge: (id) => set({ activeChallenge: id }),

      reset: () => {
        set(initialState);
        if (typeof window !== "undefined") {
          localStorage.removeItem("ai-studio-outline-messages");
        }
      },
    }),
    {
      name: "ai-studio-storage",
      partialize: (state) => ({
        phase: state.phase,
        pathOutline: state.pathOutline,
      }),
    }
  )
);
