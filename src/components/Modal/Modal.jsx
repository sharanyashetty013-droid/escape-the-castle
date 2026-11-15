import React, { useEffect, useRef, useState } from "react";
import "./Modal.scss";
import { useModalStore } from "../../stores/useModalStore";
import { useGameStore, SOLVE_BONUS } from "../../stores/useGameStore";
import { locks, normalizeAnswer } from "../../data/locks";
import { playSound } from "../../utils/audioSystem.js";

const WRONG = [
  "Nope, the lock didn't budge.",
  "Hmm… not that one. Try again!",
  "The lock just laughed at us.",
  "Click… no, that was just my knee.",
];

// One lock: the clue, an answer box (or choices), and a hint that costs fire.
const Puzzle = ({ lock, onSolved }) => {
  const solved = useGameStore((s) => s.solved.includes(lock.id));
  const hinted = useGameStore((s) => s.hints.includes(lock.id));
  const { solve, takeHint, say, config } = useGameStore();
  const cfg = config();
  const [value, setValue] = useState("");
  const [shake, setShake] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!solved) inputRef.current?.focus();
  }, [solved]);

  const check = (answer) => {
    if (solved) return;
    if (lock.answers.includes(normalizeAnswer(answer))) {
      playSound("thumpHover");
      solve(lock.id);
      say(`${lock.solvedLine} (+${SOLVE_BONUS}s of fire)`, "happy", Math.random() < 0.5 ? "ThumbsUp" : "Yes");
      onSolved();
    } else {
      setShake((n) => n + 1);
      say(WRONG[Math.floor(Math.random() * WRONG.length)], "worried", "No");
    }
  };

  const hint = () => {
    takeHint(lock.id);
    say(`A clue, as you wish. It cost us ${cfg.hintCost} seconds of fire.`, "worried", "Yes");
  };

  return (
    <div className="puzzle">
      <p className="puzzle-numeral">Lock {lock.numeral}</p>
      <h2 className="puzzle-title">{lock.title}</h2>
      <div className="puzzle-prompt">
        {lock.prompt.map((line, i) => (
          <p key={i} className={/^[A-Z0-9 ,?]+$/.test(line) && line.length > 6 ? "puzzle-cipher" : ""}>
            {line}
          </p>
        ))}
      </div>
      {lock.code && <pre className="puzzle-code">{lock.code}</pre>}

      {solved ? (
        <p className="puzzle-open">This lock is open.</p>
      ) : lock.type === "choice" ? (
        <div key={shake} className={`puzzle-choices ${shake ? "shake" : ""}`}>
          {lock.options.map((o) => (
            <button key={o} onClick={() => check(o)}>
              {o}
            </button>
          ))}
        </div>
      ) : (
        <form
          key={shake}
          className={`puzzle-form ${shake ? "shake" : ""}`}
          onSubmit={(e) => {
            e.preventDefault();
            check(value);
          }}
        >
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Your answer"
            autoComplete="off"
            spellCheck="false"
          />
          <button type="submit">Try the lock</button>
        </form>
      )}

      {!solved &&
        cfg.hints &&
        (hinted ? (
          <p className="puzzle-hint">{lock.hint}</p>
        ) : (
          <button className="puzzle-hint-button" onClick={hint}>
            Need a clue? (costs {cfg.hintCost}s of fire)
          </button>
        ))}
    </div>
  );
};

const Modal = () => {
  const { isModalOpen, modalID, closeModal } = useModalStore();
  const modalRef = useRef(null);
  const lock = locks.find((l) => l.id === modalID);

  const handleClose = () => {
    playSound("thumpHover");
    closeModal();
  };

  useEffect(() => {
    const handleEscapeKey = (e) => {
      if (e.key === "Escape" && isModalOpen) closeModal();
    };
    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [isModalOpen, closeModal]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) closeModal();
    };
    if (isModalOpen) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isModalOpen, closeModal]);

  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
      document.body.style.cursor = "auto";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isModalOpen]);

  if (!isModalOpen || !lock) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container" ref={modalRef}>
        <button className="modal-back-button" onClick={handleClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 130 134" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M128.986 128.986L1 1" stroke="currentColor" />
            <path d="M1 132.986L128.986 5" stroke="currentColor" />
          </svg>
        </button>
        <div className="modal-content">
          <Puzzle key={lock.id} lock={lock} onSolved={() => setTimeout(closeModal, 1400)} />
        </div>
      </div>
    </div>
  );
};

export default Modal;
