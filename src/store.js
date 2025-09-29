import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useInterviewStore = create(
  persist(
    (set) => ({
      candidates: [],
      activeCandidateId: null,
      addCandidate: (c) =>
        set((state) => ({
          candidates: [...state.candidates, c],
          activeCandidateId: c.id,
        })),
      updateCandidate: (id, data) =>
        set((state) => ({
          candidates: state.candidates.map((c) =>
            c.id === id ? { ...c, ...data } : c
          ),
        })),
      setActiveCandidate: (id) => set({ activeCandidateId: id }),
    }),
    { name: "interview-store" }
  )
);
