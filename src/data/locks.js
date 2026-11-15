// The six locks of Escape the Castle, generated fresh for every run.
// "book" is the open book on the lectern; f1..f5 are the five frames on the wall, left to right.
// A run is built from a seed, so the Daily Seal gives everyone the same castle on the same day,
// and Wander gives a new castle every time.
// Answers are compared lowercase with extra spaces and punctuation removed.

export const FRAME_LOCKS = ["f1", "f2", "f3", "f4", "f5"];

export const normalizeAnswer = (s = "") =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Small seeded random generator (mulberry32).
export const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

// ---------- I. The scrambled book: a Caesar cipher ----------
const PHRASES = [
  ["THE FLAME", "NEVER LIES"],
  ["STONE", "REMEMBERS"],
  ["LIGHT THE", "LAST TORCH"],
  ["THE WARDEN", "KEEPS WATCH"],
  ["NO KEY", "NO CROWN"],
  ["ASH FALLS", "LIKE SNOW"],
  ["TRUST THE", "SILENT DOOR"],
  ["THE GATE", "DREAMS"],
  ["IRON BENDS", "TO PATIENCE"],
  ["WAX WEEPS", "FOR KINGS"],
  ["SEEK THE", "COLD HEARTH"],
  ["EVERY WALL", "HAS EARS"],
];
const shift = (text, n) =>
  text.replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 65 + n) % 26) + 65));

function bookLock(r) {
  const lines = pick(r, PHRASES);
  const n = int(r, 1, 6);
  const wall = lines.map((l) => shift(l, n));
  const plain = lines.join(" ");
  const ex = String.fromCharCode(65 + n);
  return {
    title: "The Scrambled Book",
    wall,
    prompt: ["The book on the lectern is written in a strange tongue:", wall.join(" "), "What does it really say?"],
    type: "text",
    answers: [normalizeAnswer(plain)],
    hint: `Every letter took ${n} ${n === 1 ? "step" : "steps"} forward in the alphabet. Walk each one back (${ex} → A).`,
    solvedLine: `“${plain.charAt(0) + plain.slice(1).toLowerCase()}.” The way to the hall is open!`,
  };
}

// ---------- II. The riddle ----------
const RIDDLES = [
  { wall: ["I eat, I grow,", "give me water", "and I die."], lines: ["I eat and I grow.", "Give me water and I die."], answers: ["fire", "a fire", "flame", "a flame"], hint: "Look at what is burning on the walls around you.", done: "Fire! The very thing keeping us alive." },
  { wall: ["I follow you", "all day, yet", "flee the dark."], lines: ["I follow you all day.", "In darkness I am gone."], answers: ["shadow", "a shadow", "your shadow"], hint: "Stand by a torch and look at the floor behind you.", done: "Your shadow. It never leaves, until the light does." },
  { wall: ["I speak with", "no mouth, and", "answer last."], lines: ["I speak without a mouth.", "I always have the last word."], answers: ["echo", "an echo"], hint: "Shout in an empty hall and wait.", done: "An echo! These halls are full of them." },
  { wall: ["Break me", "by saying", "my name."], lines: ["Say my name and you break me."], answers: ["silence"], hint: "Right now, in this empty castle, you can hear it.", done: "Silence… and now it is broken." },
  { wall: ["I grow tall", "when young,", "short when old."], lines: ["I am tall when I am young,", "and short when I am old."], answers: ["candle", "a candle"], hint: "It weeps wax as it burns.", done: "A candle. Like the ones keeping us alive." },
  { wall: ["Many teeth,", "yet I", "never bite."], lines: ["I have many teeth,", "but I never bite."], answers: ["comb", "a comb", "key", "a key"], hint: "You might pull it through your hair, or turn it in a lock.", done: "Teeth that never bite. Clever." },
  { wall: ["The more", "you take, the", "more you leave."], lines: ["The more you take,", "the more you leave behind."], answers: ["footsteps", "steps", "footprints"], hint: "Look behind you on a dusty floor.", done: "Footsteps! And you have left many in this hall." },
  { wall: ["I have keys", "but open", "no lock."], lines: ["I have keys,", "but I cannot open a single lock."], answers: ["piano", "a piano", "keyboard", "a keyboard"], hint: "Music hall, not dungeon.", done: "A piano! The castle had one, long ago." },
  { wall: ["Fill the room", "and take", "no space."], lines: ["I can fill a room,", "yet I take up no space."], answers: ["light", "darkness", "air", "sound"], hint: "Think of what the torches give the room.", done: "Yes! It fills every corner." },
  { wall: ["Always ahead,", "never", "arrived."], lines: ["I am always coming,", "but I never arrive."], answers: ["tomorrow"], hint: "It's always one sunrise away.", done: "Tomorrow. Let's make sure we see it." },
];

function riddleLock(r) {
  const q = pick(r, RIDDLES);
  return {
    title: "The Warden's Riddle",
    wall: q.wall,
    prompt: [...q.lines, "What am I?"],
    type: "text",
    answers: q.answers,
    hint: q.hint,
    solvedLine: q.done,
  };
}

// ---------- III. The stair of numbers ----------
function stairLock(r) {
  const kind = int(r, 0, 3);
  let seq = [];
  let hint = "";
  if (kind === 0) {
    // Growing steps: +k, +k+1, +k+2…
    let v = int(r, 1, 9);
    const k = int(r, 1, 3);
    for (let i = 0; i < 7; i++) {
      seq.push(v);
      v += k + i;
    }
    hint = `Look at how much each step grows: +${k}, +${k + 1}, +${k + 2}…`;
  } else if (kind === 1) {
    // Double and add.
    let v = int(r, 1, 4);
    const a = int(r, 1, 3);
    for (let i = 0; i < 7; i++) {
      seq.push(v);
      v = v * 2 + a;
    }
    hint = `Each number is the one before it, doubled, plus ${a}.`;
  } else if (kind === 2) {
    // Each is the sum of the two before.
    let a = int(r, 1, 4);
    let b = int(r, a, a + 4);
    seq = [a, b];
    for (let i = 0; i < 5; i++) {
      [a, b] = [b, a + b];
      seq.push(b);
    }
    hint = "Each number is the sum of the two before it.";
  } else {
    // Squares plus a constant.
    const c = int(r, 0, 5);
    const s = int(r, 1, 3);
    for (let i = s; i < s + 7; i++) seq.push(i * i + c);
    hint = c ? `Think of square numbers (1, 4, 9, 16…), each with ${c} added.` : "Think of square numbers: 1, 4, 9, 16…";
  }
  const shown = seq.slice(0, 6);
  const answer = String(seq[6]);
  return {
    title: "The Stair of Numbers",
    wall: [shown.slice(0, 3).join("  "), `${shown.slice(3).join("  ")}  ?`],
    prompt: ["The numbers climb like a staircase:", `${shown.join(", ")}, ?`, "What comes next?"],
    type: "text",
    answers: [answer],
    hint,
    solvedLine: `${answer}! The stairs agree.`,
  };
}

// ---------- IV. The broken spell (code) ----------
function codeLock(r) {
  const k = int(r, 0, 4);
  if (k === 0) {
    const n = int(r, 3, 5);
    const arr = Array.from({ length: n }, () => int(r, 1, 9));
    return {
      title: "The Broken Spell",
      wall: ["for (i = 0;", "i <= arr.length;", "i++) …"],
      prompt: [`A wizard wrote this spell. What does sum([${arr.join(", ")}]) return?`],
      code: `function sum(arr) {\n  let total = 0;\n  for (let i = 0; i <= arr.length; i++) {\n    total += arr[i];\n  }\n  return total;\n}\n\nsum([${arr.join(", ")}]);`,
      type: "text",
      answers: ["nan"],
      hint: "The loop runs one step too far. What is arr[arr.length]? And what is a number + undefined in JavaScript?",
      solvedLine: "NaN! The classic off-by-one curse.",
    };
  }
  if (k === 1) {
    const start = int(r, 0, 3);
    const end = int(r, 10, 25);
    const step = int(r, 2, 5);
    let c = 0;
    for (let i = start; i < end; i += step) c++;
    return {
      title: "The Counting Spell",
      wall: ["let c = 0;", `i += ${step}`, "c = ?"],
      prompt: ["How many times does the spell count?"],
      code: `let c = 0;\nfor (let i = ${start}; i < ${end}; i += ${step}) {\n  c++;\n}\nconsole.log(c);`,
      type: "text",
      answers: [String(c)],
      hint: `Write out the values of i: ${start}, ${start + step}, ${start + 2 * step}… and stop before reaching ${end}.`,
      solvedLine: `${c}! You counted true.`,
    };
  }
  if (k === 2) {
    const a = int(r, 5, 9);
    const b = int(r, 1, a - 1);
    const minus = r() < 0.5;
    const ans = minus ? String(a - b) : `${a}${b}`;
    return {
      title: "The Trickster's Sum",
      wall: [`"${a}" ${minus ? "-" : "+"} ${b}`, "= ?"],
      prompt: ["A trickster's spell mixes words and numbers. What does it print?"],
      code: `console.log("${a}" ${minus ? "-" : "+"} ${b});`,
      type: "text",
      answers: [ans],
      hint: minus ? "With minus, JavaScript turns the text into a number first." : "With plus, if one side is text, JavaScript glues them together as text.",
      solvedLine: `${ans}! The trickster is undone.`,
    };
  }
  if (k === 3) {
    const nums = [int(r, 10, 40), int(r, 1, 9), int(r, 100, 300)];
    const sorted = [...nums].map(String).sort();
    return {
      title: "The Crooked Sort",
      wall: [`[${nums.join(", ")}]`, ".sort()"],
      prompt: ["The spell should sort the numbers. What does it actually print? (separate with commas)"],
      code: `const n = [${nums.join(", ")}];\nconsole.log(n.sort());`,
      type: "text",
      answers: [normalizeAnswer(sorted.join(" ")), normalizeAnswer(sorted.join(""))],
      hint: "Without a compare function, sort() compares numbers as text, letter by letter.",
      solvedLine: `${sorted.join(", ")}! Sorted like words, not numbers.`,
    };
  }
  return {
    title: "The Phantom Type",
    wall: ["typeof null", "=== ?"],
    prompt: ["What does this spell print?"],
    code: "console.log(typeof null);",
    type: "text",
    answers: ["object"],
    hint: "It's a famous mistake from the very first version of JavaScript.",
    solvedLine: "“object”! A ghost from 1995.",
  };
}

// ---------- V. The machine's whisper (binary) ----------
const WORDS = ["KEY", "ASH", "OAK", "SUN", "WAX", "GATE", "MOON", "IRON", "WICK", "SEAL", "RUNE", "TOWER"];
function binaryLock(r) {
  const word = pick(r, WORDS);
  const bits = [...word].map((c) => c.charCodeAt(0).toString(2).padStart(8, "0"));
  return {
    title: "The Machine's Whisper",
    wall: bits,
    prompt: ["The frame hums in a machine's voice:", bits.join(" "), "What word is it whispering?"],
    type: "text",
    answers: [word.toLowerCase()],
    hint: "Each group is one letter in ASCII. 01000001 is 65, which is “A”.",
    solvedLine: `${word}! The machine finally speaks our language.`,
  };
}

// ---------- VI. The torches (logic) ----------
const COLORS = ["Red", "Blue", "Gold", "Green", "White"];
function torchLock(r) {
  const cols = [...COLORS].sort(() => r() - 0.5).slice(0, 3);
  const mode = r() < 0.6 ? "true" : "false";
  // A sign says something about where the way out is.
  const sign = (self) => {
    const other = pick(r, cols.filter((c) => c !== self));
    const t = int(r, 0, 3);
    if (t === 0) return { text: "The way out is behind me.", test: (w) => w === self };
    if (t === 1) return { text: "The way out is not behind me.", test: (w) => w !== self };
    if (t === 2) return { text: `The way out is behind ${other}.`, test: (w) => w === other };
    return { text: `The way out is not behind ${other}.`, test: (w) => w !== other };
  };
  for (let tries = 0; tries < 200; tries++) {
    const signs = cols.map(sign);
    const ok = cols.filter((w) => {
      const n = signs.filter((s) => s.test(w)).length;
      return mode === "true" ? n === 1 : n === 2;
    });
    if (ok.length === 1) {
      return {
        title: "The Three Torches",
        wall: mode === "true" ? ["Only one", "torch tells", "the truth."] : ["Only one", "torch tells", "a lie."],
        prompt: [
          `The way out is behind one torch. Exactly ONE of these signs is ${mode === "true" ? "true" : "a lie"}:`,
          ...cols.map((c, i) => `${c}: “${signs[i].text}”`),
          "Which torch hides the way out?",
        ],
        type: "choice",
        options: cols,
        answers: [ok[0].toLowerCase()],
        hint: `Try each torch as the answer and count how many signs would be ${mode === "true" ? "true" : "false"}. Only one choice gives exactly one.`,
        solvedLine: `${ok[0]}! The last lock is open!`,
      };
    }
  }
  return torchLock(r);
}

const NUMERALS = ["I", "II", "III", "IV", "V", "VI"];
const BUILDERS = [bookLock, riddleLock, stairLock, codeLock, binaryLock, torchLock];
const IDS = ["book", ...FRAME_LOCKS];

// The current run's locks. Filled in place so every import sees the same castle.
export const locks = [];

export function buildRun(seed) {
  const r = rng(seed);
  const next = BUILDERS.map((build, i) => ({
    id: IDS[i],
    numeral: NUMERALS[i],
    key: `${seed}-${IDS[i]}`,
    ...build(r),
  })).map((l) => ({ ...l, answers: [...new Set(l.answers.map(normalizeAnswer))] }));
  locks.splice(0, locks.length, ...next);
  return locks;
}

buildRun(Date.now() % 1e9);
