import React, { useEffect, useRef, useState } from "react";
import "./Game.scss";
import { DialogueBox, GUIDE_NAME } from "./Guide";
import { useGameStore, DIFFICULTIES, todayKey, sealNumber } from "../../stores/useGameStore";
import { useMuseumStore } from "../../stores/useMuseumStore";
import { useExperienceStore } from "../../stores/experienceStore";
import { useModalStore } from "../../stores/useModalStore";
import { locks } from "../../data/locks";
import { CHRONICLE } from "../../data/chronicle";
import { playSound } from "../../utils/audioSystem.js";

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const stop = { onPointerDown: (e) => e.stopPropagation(), onMouseDown: (e) => e.stopPropagation(), onWheel: (e) => e.stopPropagation() };

// ---------- Saved progress (this browser only) ----------
const read = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode */
  }
};
const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dailyRecord = () => {
  const d = read("escape.daily", null);
  return d && d.date === todayKey() ? d : null;
};
const currentStreak = () => {
  const s = read("escape.streak", { last: null, count: 0 });
  return s.last === todayKey() || s.last === yesterdayKey() ? s.count : 0;
};

// Records a finished run and returns what changed.
function recordRun({ mode, difficulty, won, elapsed, hints, solvedCount }) {
  const out = { newBest: false, page: null, streak: currentStreak(), counted: false };
  if (won) {
    const bests = read("escape.best", {});
    if (!bests[difficulty] || elapsed < bests[difficulty]) {
      out.newBest = Boolean(bests[difficulty]);
      bests[difficulty] = elapsed;
      write("escape.best", bests);
    }
    const pages = read("escape.chronicle", 0);
    if (pages < CHRONICLE.length) {
      write("escape.chronicle", pages + 1);
      out.page = pages;
    }
  }
  if (mode === "daily" && !dailyRecord()) {
    out.counted = true;
    write("escape.daily", { date: todayKey(), won, elapsed, hints, solvedCount, difficulty });
    if (won) {
      const s = read("escape.streak", { last: null, count: 0 });
      const count = s.last === yesterdayKey() ? s.count + 1 : 1;
      write("escape.streak", { last: todayKey(), count });
      out.streak = count;
    } else {
      write("escape.streak", { last: null, count: 0 });
      out.streak = 0;
    }
  }
  return out;
}

// ---------- The director: runs the game and lets Seraphine react ----------
const useDirector = () => {
  const { isExperienceReady } = useExperienceStore();
  const { status, mode, timeLeft, total, solved, choose, tick, say, win, barrier, runKey } = useGameStore();
  const progress = useMuseumStore((s) => s.progress);
  const travelTo = useMuseumStore((s) => s.travelTo);
  const said = useRef(new Set());
  const once = (key, line, mood, emote) => {
    if (said.current.has(key)) return;
    said.current.add(key);
    say(line, mood, emote);
  };

  useEffect(() => {
    if (isExperienceReady && status === "waiting") choose();
  }, [isExperienceReady, status, choose]);

  // A new run has begun.
  useEffect(() => {
    if (!runKey) return;
    said.current = new Set();
    const first = !read("escape.met", false);
    write("escape.met", true);
    const intro = first
      ? `Ah, a traveller! I am ${GUIDE_NAME}, the last Knight-Warden of this castle. The gate has sealed behind you, and the torches are dying. Open all six locks before the last flame goes out!`
      : mode === "daily"
        ? `You came back. Today's seal is number ${sealNumber()}. Every traveller in the realm faces this same castle today.`
        : "The castle has rearranged itself again. New locks, new riddles. Light your way.";
    const t = setTimeout(() => say(intro, "happy", "Wave"), 700);
    return () => clearTimeout(t);
  }, [runKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status !== "playing") return;
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [status, tick]);

  useEffect(() => {
    if (status !== "playing") return;
    if (progress > 0.15 && !solved.includes("book"))
      once("book", "See that book on the stand? Its words are scrambled. Walk up and touch the page.", "happy", "Yes");
    const b = barrier();
    if (b < 0.9 && progress > b - 0.02) {
      if (!solved.includes("book")) once("wall1", "Halt! The way is sealed. The book's lock must be opened first.", "angry", "No");
      else once("wall2", "Sealed again. All five frames on the wall must be opened before I can let you out.", "worried", "No");
    }
    if (progress > 0.4 && solved.includes("book"))
      once("frames", "Five frames, five locks. Touch any frame to try it. Order doesn't matter.", "happy", "ThumbsUp");
  }, [progress, solved, status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (status !== "playing") return;
    if (timeLeft === 60 && total > 90) say("Hurry! Only one minute of fire left!", "worried", "Jump");
    if (timeLeft === 20) say("The flames are failing… I can barely see you…", "scared", "No");
  }, [timeLeft, status, say, total]);

  useEffect(() => {
    if (status === "escaping") {
      say("All six locks! The castle is letting you go. Run!", "happy", "Jump");
      travelTo(0.72);
      const t = setTimeout(win, 4500);
      return () => clearTimeout(t);
    }
    if (status === "lost") say("The last torch… went out…", "sad");
  }, [status, say, travelTo, win]);
};

// ---------- HUD: Seraphine's banner ----------
const Banner = ({ onLeave }) => {
  const { status, timeLeft, total, solved, mode, difficulty } = useGameStore();
  if (status !== "playing" && status !== "escaping") return null;
  const f = Math.max(0, timeLeft / total);
  const state = f < 0.2 ? "dying" : f < 0.5 ? "low" : "";
  return (
    <div className={`banner ${state}`} {...stop} aria-label={`${fmt(timeLeft)} of fire left, ${solved.length} of 6 locks open`}>
      <div className="banner-rod" />
      <div className="banner-cloth">
        <div className="candle" aria-hidden="true">
          <div className="candle-glow" style={{ bottom: `${8 + f * 52}px` }} />
          <div className="candle-flame" style={{ bottom: `${8 + f * 52}px` }} />
          <div className="candle-wax" style={{ height: `${6 + f * 52}px` }} />
          <div className="candle-dish" />
        </div>
        <p className="banner-time">{fmt(timeLeft)}</p>
        <div className="seals">
          {locks.map((l) => (
            <span key={l.id} className={`seal ${solved.includes(l.id) ? "open" : ""}`} title={`Lock ${l.numeral}`}>
              {l.numeral}
            </span>
          ))}
        </div>
        <p className="banner-mode">
          {mode === "daily" ? `Seal ${sealNumber()}` : "Wander"}
          <br />
          {DIFFICULTIES[difficulty].label}
        </p>
      </div>
      <button className="banner-leave" onClick={onLeave} title="Leave this castle (Esc)">
        Leave
      </button>
    </div>
  );
};

// Asks before abandoning a run. A first Daily Seal attempt counts as not escaped.
const LeaveConfirm = ({ onStay }) => {
  const { mode, solved, difficulty, elapsed, hints, choose } = useGameStore();
  const travelTo = useMuseumStore((s) => s.travelTo);
  const closeModal = useModalStore((s) => s.closeModal);
  const firstDaily = mode === "daily" && !dailyRecord();

  useEffect(() => {
    const key = (e) => e.key === "Escape" && onStay();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onStay]);

  const leave = () => {
    if (firstDaily) recordRun({ mode, difficulty, won: false, elapsed, hints: hints.length, solvedCount: solved.length });
    closeModal();
    travelTo(0);
    onStay();
    choose();
  };

  return (
    <div className="leave" {...stop} role="dialog" aria-modal="true" aria-labelledby="leave-title">
      <div className="leave-card">
        <h2 id="leave-title">Leave this castle?</h2>
        <p>
          {firstDaily
            ? "Today's Daily Seal will count as not escaped, and your streak will end."
            : "Your torches go out and this castle is gone. The next one will be different."}
        </p>
        <div className="leave-actions">
          <button className="primary" onClick={onStay} autoFocus>
            Keep going
          </button>
          <button onClick={leave}>Leave</button>
        </div>
      </div>
    </div>
  );
};

// A quiet hint at the start, gone once you move.
const WalkHint = () => {
  const { status, runKey } = useGameStore();
  const progress = useMuseumStore((s) => s.progress);
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    setHidden(false);
    const t = setTimeout(() => setHidden(true), 9000);
    return () => clearTimeout(t);
  }, [runKey]);
  if (status !== "playing" || hidden || progress > 0.04) return null;
  return <p className="walk-hint">Scroll, drag or use the arrow keys to walk</p>;
};

// ---------- Choose your path ----------
const Prelude = () => {
  const { status, start, mode: lastMode, difficulty: lastDiff } = useGameStore();
  const [mode, setMode] = useState(lastMode);
  const [difficulty, setDifficulty] = useState(lastDiff);
  if (status !== "choosing") return null;
  const daily = dailyRecord();
  const streak = currentStreak();
  const pages = read("escape.chronicle", 0);

  const go = () => {
    playSound("thumpHover");
    useModalStore.getState().closeModal?.();
    useMuseumStore.getState().travelTo?.(0);
    start(mode, difficulty);
  };

  return (
    <div className="prelude" {...stop}>
      <div className="prelude-card">
        <h1>Escape the Castle</h1>
        <p className="prelude-sub">Six locks. Dying torches. A different castle every time.</p>

        <div className="paths" role="radiogroup" aria-label="Choose your path">
          <button className={`path ${mode === "daily" ? "on" : ""}`} onClick={() => setMode("daily")} role="radio" aria-checked={mode === "daily"}>
            <span className="path-name">The Daily Seal</span>
            <span className="path-note">
              Seal {sealNumber()}. The same castle for every traveller today.
              {daily ? ` You ${daily.won ? `escaped in ${fmt(daily.elapsed)}` : "were trapped"}; replays won't count.` : ""}
            </span>
            {streak > 0 && <span className="path-streak">{streak}-day streak</span>}
          </button>
          <button className={`path ${mode === "wander" ? "on" : ""}`} onClick={() => setMode("wander")} role="radio" aria-checked={mode === "wander"}>
            <span className="path-name">Wander</span>
            <span className="path-note">A new castle with new locks, every time you enter.</span>
          </button>
        </div>

        <div className="ranks" role="radiogroup" aria-label="Difficulty">
          {Object.entries(DIFFICULTIES).map(([id, d]) => (
            <button key={id} className={`rank ${difficulty === id ? "on" : ""}`} onClick={() => setDifficulty(id)} role="radio" aria-checked={difficulty === id}>
              <span className="rank-name">{d.label}</span>
              <span className="rank-note">{d.note}</span>
            </button>
          ))}
        </div>

        <button className="prelude-go" onClick={go}>
          Enter the castle
        </button>
        <p className="prelude-chronicle">
          {pages === 0
            ? `Escape to find the pages of ${GUIDE_NAME}'s chronicle.`
            : `${GUIDE_NAME}'s chronicle: ${Math.min(pages, CHRONICLE.length)} of ${CHRONICLE.length} pages found.`}
        </p>
      </div>
    </div>
  );
};

// ---------- End of a run ----------
const EndCard = () => {
  const { status, elapsed, hints, solved, mode, difficulty, start, choose } = useGameStore();
  const travelTo = useMuseumStore((s) => s.travelTo);
  const closeModal = useModalStore((s) => s.closeModal);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const done = status === "won" || status === "lost";

  useEffect(() => {
    if (!done) return setResult(null);
    setResult(recordRun({ mode, difficulty, won: status === "won", elapsed, hints: hints.length, solvedCount: solved.length }));
    setCopied(false);
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!done || !result) return null;
  const won = status === "won";
  const best = read("escape.best", {})[difficulty];

  const restart = (nextMode) => {
    playSound("thumpHover");
    closeModal();
    travelTo(0);
    start(nextMode, difficulty);
  };

  const share = async () => {
    const title = mode === "daily" ? `Escape the Castle · Seal ${sealNumber()} (${DIFFICULTIES[difficulty].label})` : `Escape the Castle · Wander (${DIFFICULTIES[difficulty].label})`;
    const line = won ? `🕯️ ${fmt(elapsed)} · ${hints.length} ${hints.length === 1 ? "clue" : "clues"}` : "🕯️ the last torch died";
    const seals = locks.map((l) => (solved.includes(l.id) ? "🔓" : "🔒")).join("");
    const text = `${title}\n${line}\n${seals}\n${window.location.origin}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      window.prompt("Copy this:", text);
    }
  };

  return (
    <div className={`game-end ${won ? "won" : "lost"}`} {...stop}>
      <div className="game-end-card">
        <p className="game-end-kicker">
          {mode === "daily" ? `Seal ${sealNumber()}` : "Wander"} · {DIFFICULTIES[difficulty].label}
          {mode === "daily" && !result.counted ? " · replay" : ""}
        </p>
        <h2>{won ? "Free!" : "The last torch died"}</h2>
        {won ? (
          <>
            <p className="game-end-time">{fmt(elapsed)}</p>
            <p className="game-end-sub">
              {hints.length === 0 ? "No clues used." : `${hints.length} ${hints.length === 1 ? "clue" : "clues"} used.`}
              {result.newBest && " A new personal best."}
              {best && !result.newBest ? ` Your best as ${DIFFICULTIES[difficulty].label}: ${fmt(best)}.` : ""}
            </p>
          </>
        ) : (
          <p className="game-end-sub">
            {GUIDE_NAME} fades into the dark… but torches can be relit.
            <br />
            You opened {solved.length} of {locks.length} locks.
          </p>
        )}
        {mode === "daily" && result.counted && (
          <p className="game-end-streak">
            {won ? `${result.streak}-day streak. A new seal appears tomorrow.` : "Your streak is broken. A new seal appears tomorrow."}
          </p>
        )}

        {result.page !== null && (
          <div className="chronicle-page">
            <p className="chronicle-head">
              A page of {GUIDE_NAME}'s chronicle · {result.page + 1} of {CHRONICLE.length}
            </p>
            <p className="chronicle-text">{CHRONICLE[result.page]}</p>
          </div>
        )}

        <div className="game-end-actions">
          <button className="primary" onClick={() => restart("wander")}>
            {won ? "Enter a new castle" : "Relight and try a new castle"}
          </button>
          <button onClick={share}>{copied ? "Copied. Send it to a friend" : "Share your result"}</button>
          <button
            className="quiet"
            onClick={() => {
              closeModal();
              choose();
            }}
          >
            Change path
          </button>
        </div>
      </div>
    </div>
  );
};

// Everything on top of the 3D castle: darkness, the banner, Seraphine and the menus.
const Game = () => {
  useDirector();
  const { isExperienceReady } = useExperienceStore();
  const { status, timeLeft, total } = useGameStore();
  const isModalOpen = useModalStore((s) => s.isModalOpen);
  const [leaving, setLeaving] = useState(false);

  // Esc opens "Leave this castle?" (unless a puzzle is open; Esc closes that first).
  useEffect(() => {
    if (status !== "playing" || leaving) return;
    const key = (e) => {
      if (e.key === "Escape" && !useModalStore.getState().isModalOpen) setLeaving(true);
    };
    // Capture phase, so this runs before the puzzle window closes itself on the same Esc press.
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [status, leaving, isModalOpen]);

  useEffect(() => {
    if (status !== "playing") setLeaving(false);
  }, [status]);

  if (!isExperienceReady) return null;

  const f = timeLeft / total;
  const darkness = status === "lost" ? 1 : status === "playing" && f < 0.5 ? (0.5 - f) * 1.6 : 0;

  return (
    <>
      <div className="game-darkness" style={{ opacity: darkness }} />
      <Banner onLeave={() => setLeaving(true)} />
      <WalkHint />
      {status !== "choosing" && <DialogueBox />}
      <Prelude />
      <EndCard />
      {leaving && <LeaveConfirm onStay={() => setLeaving(false)} />}
    </>
  );
};

export default Game;
