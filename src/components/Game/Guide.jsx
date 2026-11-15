import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { useGameStore } from "../../stores/useGameStore";

export const GUIDE_NAME = "Seraphine";
const PORTRAIT = "/guide/seraphine.webp";
// The same painting with her eyes closed, for blinking.
const PORTRAIT_CLOSED = "/guide/seraphine-closed.webp";
// White where her hair is free to move (soft edges), black where she stays still.
const HAIR_MASK = "/guide/seraphine-hair.png";

// How each mood colours and moves her.
const MOODS = {
  happy: { tint: [1, 1, 1], tintAmt: 0, desat: 0, breath: 1.5, tremble: 0, lift: 0 },
  worried: { tint: [0.92, 0.95, 1.08], tintAmt: 0.35, desat: 0.08, breath: 2.3, tremble: 0.0015, lift: 0 },
  scared: { tint: [0.82, 0.9, 1.18], tintAmt: 0.55, desat: 0.15, breath: 3.3, tremble: 0.004, lift: -0.01 },
  sad: { tint: [0.9, 0.92, 1.05], tintAmt: 0.35, desat: 0.4, breath: 1.1, tremble: 0, lift: -0.025 },
  angry: { tint: [1.18, 0.86, 0.8], tintAmt: 0.45, desat: 0, breath: 2.1, tremble: 0.001, lift: 0 },
};

const vertex = /* glsl */ `
  uniform float uTime;
  uniform float uSway;
  uniform float uBreath;
  uniform float uBreathRate;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vec3 p = position;

    // Hair: the long strands on both sides drift, more toward the ends.
    float side = smoothstep(0.13, 0.33, abs(uv.x - 0.5));
    float ends = smoothstep(0.78, 0.1, uv.y);
    float hair = side * (0.3 + 0.7 * ends);
    float phase = uv.x > 0.5 ? 1.7 : 0.0;
    float wave = sin(uTime * 1.1 + uv.y * 5.0 + phase) * 0.65 + sin(uTime * 2.3 + uv.y * 11.0 + phase) * 0.22;
    p.x += hair * wave * 0.008 * uSway;
    p.y += hair * sin(uTime * 0.9 + uv.x * 4.0) * 0.006 * uSway;

    // Breathing: the chest rises and widens a little.
    float chest = smoothstep(0.0, 0.28, uv.y) * smoothstep(0.62, 0.36, uv.y);
    float br = sin(uTime * uBreathRate) * 0.5 + 0.5;
    p.y += chest * br * 0.014 * uBreath;
    p.x += (uv.x - 0.5) * chest * br * 0.012 * uBreath;

    // The head follows the breath very slightly.
    float head = smoothstep(0.52, 0.62, uv.y) * (1.0 - side);
    p.y += head * br * 0.006 * uBreath;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform sampler2D uClosed;
  uniform sampler2D uHair;
  uniform float uBlink;
  uniform float uSway;
  uniform float uTime;
  uniform float uDesat;
  uniform vec3 uTint;
  uniform float uTintAmt;
  uniform float uGlow;
  uniform float uFire;
  uniform float uAlpha;
  varying vec2 vUv;

  void main() {
    // Hair flows: ripples travel down each strand, with slow gusts of draught.
    float m = texture2D(uHair, vUv).r;
    float side = vUv.x < 0.5 ? -1.0 : 1.0;
    float gust = 0.65 + 0.35 * sin(uTime * 0.37) * sin(uTime * 0.23 + 1.3);
    float flow = sin(vUv.y * 9.0 - uTime * 1.9 + side * 0.8) * 0.6
               + sin(vUv.y * 17.0 - uTime * 3.1 + vUv.x * 6.0) * 0.25
               + sin(uTime * 0.9 + side) * 0.35;
    vec2 off = vec2(flow * side * 0.75 + 0.25 * sin(uTime * 1.3 + vUv.y * 5.0), sin(vUv.x * 11.0 + uTime * 1.6) * 0.3);
    vec2 uv = vUv - off * m * 0.02 * uSway * gust;

    vec4 open = texture2D(uMap, uv);
    vec4 shut = texture2D(uClosed, uv);
    vec4 tex = mix(open, shut, uBlink);
    vec3 col = tex.rgb;

    // Mood grading.
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, vec3(lum), uDesat);
    col = mix(col, col * uTint, uTintAmt);

    // Torchlight: warm, flickering, from below. It dims as the fire runs out.
    float flick = 0.86 + 0.1 * sin(uTime * 9.0) * sin(uTime * 13.7 + 1.0) + 0.04 * sin(uTime * 23.0);
    float fromBelow = smoothstep(0.95, 0.0, vUv.y) * (0.55 + 0.45 * smoothstep(1.0, 0.0, vUv.x));
    col = mix(col, col * vec3(1.06, 0.92, 0.78), 0.3);
    col *= mix(0.62, 1.0, uFire) * mix(1.0, flick, 0.6);
    col += vec3(1.0, 0.58, 0.26) * fromBelow * 0.14 * flick * (0.4 + 0.6 * uFire);

    // Golden glow when something good happens.
    col += vec3(1.0, 0.82, 0.45) * uGlow * 0.32;

    gl_FragColor = vec4(col, tex.a * uAlpha);
    #include <colorspace_fragment>
  }
`;

const damp = THREE.MathUtils.damp;

// Seraphine: a hand-painted portrait brought to life with a shader:
// flowing hair, blinking, breathing, torchlight, and reactions to what happens in the game.
function Seraphine() {
  const [map, closed, hairMask] = useTexture([PORTRAIT, PORTRAIT_CLOSED, HAIR_MASK]);
  map.colorSpace = THREE.SRGBColorSpace;
  closed.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = closed.anisotropy = 4;
  const mesh = useRef();
  const { guide, status, timeLeft, total } = useGameStore();

  const uniforms = useMemo(
    () => ({
      uMap: { value: map },
      uClosed: { value: closed },
      uHair: { value: hairMask },
      uBlink: { value: 0 },
      uTime: { value: 0 },
      uSway: { value: 1 },
      uBreath: { value: 1 },
      uBreathRate: { value: 1.5 },
      uDesat: { value: 0 },
      uTint: { value: new THREE.Vector3(1, 1, 1) },
      uTintAmt: { value: 0 },
      uGlow: { value: 0 },
      uFire: { value: 1 },
      uAlpha: { value: 1 },
    }),
    [map, closed, hairMask]
  );

  // Current reaction and when it started.
  const emote = useRef({ name: null, t0: 0 });
  const clock = useRef(0);
  const blink = useRef({ next: 1.5, t0: -1, double: false });

  useEffect(() => {
    if (guide.emote) emote.current = { name: guide.emote, t0: clock.current };
  }, [guide.key, guide.emote]);

  useFrame((state, delta) => {
    const t = (clock.current = state.clock.elapsedTime);
    const u = uniforms;
    u.uTime.value = t;

    const lost = status === "lost";
    const won = status === "won" || status === "escaping";
    const mood = MOODS[lost ? "sad" : guide.mood] || MOODS.happy;
    const fire = status === "playing" ? Math.min(1, timeLeft / (total * 0.5)) : lost ? 0 : 1;

    // Reaction envelopes.
    const { name, t0 } = emote.current;
    const dt = t - t0;
    let x = 0,
      y = 0,
      rot = 0,
      scale = 1,
      glow = 0;
    if (name && dt < 2.5) {
      const fade = Math.exp(-dt * 1.6);
      switch (name) {
        case "Wave":
          rot = Math.sin(dt * 5) * 0.035 * fade;
          scale = 1 + 0.025 * fade;
          glow = 0.25 * fade;
          break;
        case "Yes":
          y = -Math.abs(Math.sin(dt * 7)) * 0.035 * Math.exp(-dt * 2);
          break;
        case "No":
          x = Math.sin(dt * 18) * 0.035 * Math.exp(-dt * 3);
          break;
        case "ThumbsUp":
          scale = 1 + 0.06 * Math.exp(-dt * 3.5);
          glow = Math.exp(-dt * 1.3);
          break;
        case "Jump":
          y = dt < 1.6 ? Math.max(0, Math.sin(dt * 6.5)) * 0.07 * Math.exp(-dt * 1.2) : 0;
          break;
        case "Punch":
          scale = 1 + 0.09 * Math.exp(-dt * 6);
          x = 0.03 * Math.exp(-dt * 6);
          glow = 0.3 * Math.exp(-dt * 4);
          break;
        default:
          break;
      }
    }

    // Idle life: a slow float, plus trembling when afraid.
    y += Math.sin(t * 1.2) * 0.008 + mood.lift;
    x += mood.tremble ? (Math.sin(t * 47) + Math.sin(t * 31.3)) * mood.tremble : 0;
    if (won) glow = Math.max(glow, 0.35 + Math.sin(t * 2) * 0.12);

    // Defeat: she sinks into the dark.
    if (lost) {
      y += -0.18;
      rot += 0.05;
    }

    const m = mesh.current;
    if (m) {
      m.position.x = damp(m.position.x, x, 14, delta);
      m.position.y = damp(m.position.y, y, lost ? 1.2 : 14, delta);
      m.rotation.z = damp(m.rotation.z, rot, 10, delta);
      const s = damp(m.scale.x, scale, 12, delta);
      m.scale.set(s, s, 1);
    }

    const kick = name && dt < 1.5 && (name === "Wave" || name === "Jump" || name === "No") ? 0.6 * Math.exp(-dt * 2) : 0;
    u.uSway.value = damp(u.uSway.value, (won ? 1.7 : lost ? 0.2 : mood.breath > 3 ? 1.3 : 1) + kick, 3, delta);
    u.uBreathRate.value = damp(u.uBreathRate.value, mood.breath, 2, delta);
    u.uDesat.value = damp(u.uDesat.value, lost ? 0.85 : mood.desat, 2, delta);
    u.uTintAmt.value = damp(u.uTintAmt.value, mood.tintAmt, 3, delta);
    u.uTint.value.set(...mood.tint);
    u.uGlow.value = damp(u.uGlow.value, glow, 10, delta);
    u.uFire.value = damp(u.uFire.value, fire, 2, delta);
    u.uAlpha.value = damp(u.uAlpha.value, lost ? 0.4 : 1, 1, delta);

    // Blinking: every few seconds, sometimes twice in a row, faster when she is afraid.
    // Her eyes close softly when she smiles a "yes", and stay closed when the last torch dies.
    const bl = blink.current;
    if (name === "Yes" && dt < 0.05 && bl.t0 < 0) bl.t0 = t;
    if (t > bl.next && bl.t0 < 0) bl.t0 = t;
    let lid = 0;
    if (bl.t0 >= 0) {
      const p = (t - bl.t0) / (name === "Yes" && dt < 1 ? 0.45 : 0.15);
      lid = p < 1 ? Math.sin(p * Math.PI) : 0;
      if (p >= 1) {
        bl.t0 = -1;
        const again = !bl.double && Math.random() < 0.22;
        bl.double = again;
        const calm = guide.mood === "scared" || guide.mood === "worried" ? 0.5 : 1;
        bl.next = t + (again ? 0.18 : (2.2 + Math.random() * 3.2) * calm);
      }
    }
    u.uBlink.value = lost ? damp(u.uBlink.value, 1, 2, delta) : Math.min(1, lid * 1.3);
  });

  return (
    <mesh ref={mesh}>
      <planeGeometry args={[1.7, 2.125, 64, 80]} />
      <shaderMaterial vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} transparent depthWrite={false} />
    </mesh>
  );
}

useTexture.preload([PORTRAIT, PORTRAIT_CLOSED, HAIR_MASK]);

function Embers() {
  const { status } = useGameStore();
  const won = status === "won" || status === "escaping";
  return (
    <Sparkles
      position={[0, -0.2, -0.3]}
      count={won ? 40 : 22}
      scale={[1.8, 2.2, 0.5]}
      size={won ? 3 : 2}
      speed={0.35}
      opacity={status === "lost" ? 0.15 : 0.75}
      color={won ? "#ffd27a" : "#ff9a4a"}
    />
  );
}

// The portrait window.
export const GuidePortrait = ({ talking }) => (
  <div className={`guide-portrait ${talking ? "talking" : ""}`}>
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 3.73], fov: 30 }} gl={{ antialias: true, alpha: true }}>
      <Suspense fallback={null}>
        <Embers />
        <Seraphine />
      </Suspense>
    </Canvas>
  </div>
);

// Classic RPG dialogue: name plate, text that types itself out, click to skip or close.
export const DialogueBox = () => {
  const { guide } = useGameStore();
  const [shown, setShown] = useState("");
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!guide.line) return;
    setOpen(true);
    setShown("");
    let i = 0;
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      i += 1;
      setShown(guide.line.slice(0, i));
      if (i >= guide.line.length) clearInterval(timer.current);
    }, 24);
    return () => clearInterval(timer.current);
  }, [guide.key, guide.line]);

  const done = shown.length >= (guide.line || "").length;

  // Close by itself a while after the text finishes.
  useEffect(() => {
    if (!open || !done) return;
    const t = setTimeout(() => setOpen(false), 4000 + guide.line.length * 35);
    return () => clearTimeout(t);
  }, [open, done, guide.line]);

  const click = (e) => {
    e.stopPropagation();
    if (!done) {
      clearInterval(timer.current);
      setShown(guide.line);
    } else setOpen(false);
  };

  return (
    <>
      <GuidePortrait talking={open && !done} />
      {open && guide.line && (
        <div key={guide.key} className="dialogue" onClick={click} onPointerDown={(e) => e.stopPropagation()}>
          <div className="dialogue-name">{GUIDE_NAME}</div>
          <p className="dialogue-text">
            {shown}
            {!done && <span className="dialogue-caret" />}
          </p>
          {done && <span className="dialogue-next">▼</span>}
        </div>
      )}
    </>
  );
};
