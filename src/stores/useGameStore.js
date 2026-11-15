// Escape the Castle: game state.
// The torches are the timer. Solving a lock relights a torch (+ time), a clue costs time.
// Every run builds a new castle from a seed: the Daily Seal uses the date, Wander uses a random one.

import { create } from "zustand";
import { locks, FRAME_LOCKS, buildRun } from "../data/locks";

// Seconds of fire for a Knight. VITE_GAME_SECONDS can change it (handy for testing).
export const DURATION = Number(import.meta.env.VITE_GAME_SECONDS) || 6 * 60;
export const SOLVE_BONUS = 20;

export const DIFFICULTIES = {
  squire: { label: "Squire", note: "8 minutes of fire, cheap clues", seconds: Math.round(DURATION * (8 / 6)), hintCost: 20, hints: true },
  knight: { label: "Knight", note: "6 minutes of fire", seconds: DURATION, hintCost: 30, hints: true },
  warden: { label: "Warden", note: "4 minutes, no clues", seconds: Math.round(DURATION * (4 / 6)), hintCost: 0, hints: false },
};

// Today's Daily Seal: same castle for everyone, numbered from the first day.
const EPOCH = Date.UTC(2026, 10, 1);
export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const sealNumber = () => {
  const d = new Date();
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - EPOCH) / 86400000) + 1;
};
const dailySeed = () => 7919 * sealNumber() + 104729;

// Where the camera is allowed to walk to, given which locks are open.
const BARRIERS = { beforeBook: 0.32, beforeEscape: 0.56, free: 0.999 };

export const useGameStore = create((set, get) => ({
  status: "waiting", // waiting | choosing | playing | escaping | won | lost
  mode: "daily", // daily | wander
  difficulty: "knight",
  total: DURATION,
  timeLeft: DURATION,
  elapsed: 0,
  solved: [],
  hints: [],
  runKey: 0,
  // What Seraphine (the guide) is saying and doing. emote = a one-shot reaction.
  guide: { mood: "happy", line: "", emote: null, key: 0 },

  config: () => DIFFICULTIES[get().difficulty],

  barrier: () => {
    const { solved } = get();
    if (!solved.includes("book")) return BARRIERS.beforeBook;
    if (!FRAME_LOCKS.every((id) => solved.includes(id))) return BARRIERS.beforeEscape;
    return BARRIERS.free;
  },

  say: (line, mood = "happy", emote = null) =>
    set((s) => ({ guide: { mood, line, emote, key: s.guide.key + 1 } })),

  // Show the "choose your path" screen.
  choose: () => set({ status: "choosing" }),

  start: (mode = get().mode, difficulty = get().difficulty) => {
    const seed = mode === "daily" ? dailySeed() : Math.floor(Math.random() * 1e9);
    buildRun(seed);
    const seconds = DIFFICULTIES[difficulty].seconds;
    set((s) => ({
      status: "playing",
      mode,
      difficulty,
      total: seconds,
      timeLeft: seconds,
      elapsed: 0,
      solved: [],
      hints: [],
      runKey: s.runKey + 1,
    }));
  },

  tick: () => {
    const { status, timeLeft, elapsed } = get();
    if (status !== "playing") return;
    const next = Math.max(0, timeLeft - 1);
    set({ timeLeft: next, elapsed: elapsed + 1 });
    if (next === 0) set({ status: "lost" });
  },

  solve: (id) => {
    const { solved, timeLeft, total } = get();
    if (solved.includes(id)) return;
    const nextSolved = [...solved, id];
    set({ solved: nextSolved, timeLeft: Math.min(total, timeLeft + SOLVE_BONUS) });
    if (nextSolved.length === locks.length) set({ status: "escaping" });
  },

  takeHint: (id) => {
    const { hints, timeLeft } = get();
    const cfg = get().config();
    if (!cfg.hints || hints.includes(id)) return;
    set({ hints: [...hints, id], timeLeft: Math.max(1, timeLeft - cfg.hintCost) });
  },

  win: () => set({ status: "won" }),
}));
