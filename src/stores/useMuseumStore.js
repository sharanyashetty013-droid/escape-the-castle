// Camera position and travel requests (shared by the scene and the on-screen UI).
import { create } from "zustand";

export const useMuseumStore = create((set) => ({
  progress: 0,
  travel: { target: null, nonce: 0 },
  setProgress: (progress) => set({ progress }),
  travelTo: (target) => set((state) => ({ travel: { target, nonce: state.travel.nonce + 1 } })),
}));
