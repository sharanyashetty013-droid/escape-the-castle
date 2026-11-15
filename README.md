<div align="center">

# Escape the Castle

**A daily 3D escape room in your browser. The torches are the timer, and a knight who has been trapped for a hundred winters guides you out.**

[Play it](https://escape-the-castle.vercel.app) · Built by [Sharanya L Shetty](https://github.com/sharanyashetty013-droid)

</div>

---

The gate seals behind you. Six locks stand between you and the way out, and every torch in the castle is burning down. Seraphine, the last Knight-Warden, walks you through it. Open every lock before the last flame dies.

## What makes it different

- **A new castle every time.** All six locks are generated from a seed: a shifted cipher, a riddle, a number stair, a buggy piece of code, a word in binary and a logic puzzle about lying torches. You can't memorise your way out.
- **The Daily Seal.** One numbered castle per day, the same for every player. Keep a streak, then share your result as a grid of seals.
- **The fire is the clock, everywhere.** A candle on the banner melts down, the torches in the castle fade from gold to ember red, the screen darkens and even Seraphine dims, all from one timer.
- **Seraphine.** A painted portrait brought to life with a custom shader: her hair flows, she breathes and blinks, torchlight flickers on her, and she reacts to every right answer, wrong guess and close call.
- **Her chronicle.** Every escape uncovers one page of her story. There are seven, and the last one changes how you see the castle.
- **Three ranks.** Squire (8 minutes, cheap clues), Knight (6 minutes) or Warden (4 minutes, no clues at all).

## How to play

1. Pick a path (the Daily Seal or Wander) and a rank.
2. Walk with the scroll wheel, a drag, or the arrow keys.
3. Touch the book on the lectern to open the first lock. It unseals the hall.
4. Open the five frames on the wall, in any order.
5. Each lock you open relights a torch (+20 seconds). Each clue costs fire.
6. Press **Esc** or **Leave** to walk out of a run.

## Built with

React, React Three Fiber and Three.js, GLSL shaders, Zustand, Howler.js and Vite. Deployed on Vercel.

```bash
npm install
npm run dev
```

For testing, `VITE_GAME_SECONDS=1200 npm run dev` gives a Knight 20 minutes of fire.

Puzzles live in `src/data/locks.js` (each lock is a small generator) and Seraphine's chronicle in `src/data/chronicle.js`.

## Credits

The 3D castle, scroll camera, fire shader and models come from **[Codrops Fan Museum](https://github.com/andrewwoan/codrops-fan-museum)** by Andrew Woan, used under the MIT license (see [`LICENSE.md`](LICENSE.md)). The game, puzzles, guide, interface and story were built on top of it for this project.

Fonts: Cinzel and Crimson Pro (SIL Open Font License), Eagle Lake (SIL Open Font License). Sound effects from the original project (Pixabay).
