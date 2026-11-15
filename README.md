# Escape the Castle

The castle gate slams shut behind you. The torches are dying, and the only one on your side is
**Bolt**, the castle's last clockwork guardian. Open all six locks before the last flame goes out.

## How it plays

- **The torches are the timer.** You start with 6 minutes of fire. The torches fade from
  bright to orange to a dying red and the edges of the screen go dark.
- **Six locks.** The scrambled book on the lectern (a cipher) blocks the way into the hall.
  The five frames on the wall are a riddle, a number pattern, a buggy piece of code, a
  message in binary and a logic puzzle. Any order works.
- **You can't cheat past a lock.** The camera physically stops at a sealed doorway until it is open.
- **Every lock you open relights a torch:** +20 seconds of fire.
- **Clues cost fire:** each clue takes 30 seconds.
- **Bolt guides you.** A fully animated 3D character in an RPG-style portrait, with a
  typewriter dialogue box. He waves hello, shakes his head at wrong answers, gives a thumbs up
  when a lock opens, looks scared when the fire is low, dances when you escape and collapses
  if the last torch dies. His face changes too (worried, scared, sad, angry).
- **Escape**, and the camera runs you out of the castle. You get your time, your personal best,
  and a "Challenge a friend" button that copies a link with your time.

## Run it

```bash
npm install
npm run dev
```

Testing tip: `VITE_GAME_SECONDS=1200 npm run dev` gives you 20 minutes of fire.

## Add or change puzzles

All six locks live in `src/data/locks.js`: the text on the frame (`wall`), the full puzzle
(`prompt`, optional `code`), accepted `answers` (lowercase, no punctuation), the `hint`,
and what Bolt says when it opens.

## Ideas for next

- An online leaderboard (a small backend that stores names and times).
- A new set of puzzles every week.
- Sound effects for locks opening and torches dying.

## Built on the Codrops Fan Museum

This game is built on [Andrew Woan's Codrops Fan Museum](https://github.com/andrewwoan/codrops-fan-museum)
(MIT license). The 3D castle, the scroll camera, the fire shader and the models are his work.

Changed or added:

- `src/data/locks.js`: the six puzzles
- `src/stores/useGameStore.js`: game state, the fire timer, sealed doorways
- `src/components/Game/`: Bolt (portrait + dialogue), the HUD, the darkness and the end screens
- `src/components/Modal/`: the lock / puzzle screen
- `src/Experience/models/Ninth.jsx`: locks drawn on the frames and the book, "OPEN" seals, the title
- `src/Experience/Scene.jsx`: the camera stops at a sealed doorway
- `src/Experience/components/Fire.jsx`: torches fade with the timer
- `src/Experience/Experience.jsx`: smooth camera travel and arrow-key walking

Other credits:

- Bolt is [RobotExpressive](https://github.com/mrdoob/three.js/tree/dev/examples/models/gltf/RobotExpressive)
  by Tomás Laulhé ([Quaternius](https://quaternius.com)), CC0, with face morphs by Don McCurdy.
- Fonts: [Cinzel](https://fonts.google.com/specimen/Cinzel) and [Crimson Pro](https://fonts.google.com/specimen/Crimson+Pro) (SIL Open Font License).

**Before deploying publicly:** the background music is an Epidemic Sound track from the original
project and needs its own license, so replace it with music you are allowed to use.


---

## Original project README

### 🏰 Award-Winning Codrops Fan Museum 🖼️

**[Demo on Codrops](https://tympanus.net/Tutorials/CodropsFanMuseum/)** | **[Blender file](https://drive.google.com/file/d/1IzgT_Mrl3t6obvOgcs1kquUyk0oBlW2c/view?usp=sharing)** | **[YouTube video](https://youtu.be/R6yppleutsQ)** | **[Codrops article](https://tympanus.net/codrops/2025/04/08/3d-world-in-the-browser-with-blender-and-three-js/)**
| **[Live site](https://codrops-fan-museum.com/)**

This repo contains code of a fan museum for Codrops!

![Page screenshot](public/media/og-image.webp?raw=true "Page screenshot")

### Instructions

```
npm install
npm run dev
```

### Updates & Corrections

If you see something wrong in the article please let me know!! I'll post a list of corrections and/or updates for the code and article here~ Thank you in advance!

- When it comes to "bad" topology, sometimes it's actually good for optimization as in, it may have less verticies and geometry data which saves on file size. You may also use bad toplogy in certain scenarios as a "trick" to have a certain effect. Of course bad topology can do the opposite as well, as in, if it's really bad it will cause issues (lighting/shading, performance, etc).
- You'll see a lot of websites also use other file formats like .jpg and there are pros and cons to that. For one .jpg is more widely supported and WebP has additional time to decode so it really kind of depends on your use case. I'm using solid baked textures so I'm aiming for max compression with WebP and KTX rather than .jpg which might be ideal for more granular details or normal textures etc.
- Because GLTF/GLB is basically a glorified JSON object storing things like vertex positions, you might see a lot of websites use .bin files or .JSON files or some other custom vertex data format rather than a GLB file. However, GLBs are still very common to use.
- Ignore the curve rotation section with the create functional spline, I did not end up using that method. Simplified it way more.
- Try not to useState inside the useFrame hook like I did. For something like scrollProgress we could use useRef() for better performance.

### 🥰🥰 Inspo & Credits!!! 🥰🥰

Of course huge shoutout to the whole community for making things possible!! Three.js and Blender are so so amazing!!! Here are a list of the original creators for some of the things I used in this project:

- [The Adam | Blender techniques](https://www.youtube.com/watch?v=gw885XAKYiI)
- [sketching in blender | Blender techniques](https://youtu.be/JSuWu4EXVZw)
- [PolyHaven | Blender HDRI & Textures/PBR materials](https://polyhaven.com/)
- [BlenderKit | Textures/PBR materials](https://www.blendkit.com/get-blenderkit/)
- [ambientCG | Textures/PBR materials](http://ambientcg.com/)
- [Fire Shader](https://codesandbox.io/p/sandbox/3878x)
- [Background music](https://www.epidemicsound.com/track/an7vU7AM16/)
- [Thump SFX](https://pixabay.com/sound-effects/massive-thump-116359/)
- [Torch SFX](https://pixabay.com/users/freesoundsxx-47251115/)
- [Font](https://fonts.google.com/specimen/Eagle+Lake?query=eag)
- [DivyeSh's torch model](https://sketchfab.com/3d-models/torch-d47f1a85c4c846a392cc1d1afca15295)
- [distant_voices' lectern model](https://sketchfab.com/3d-models/lectern-17562d27f70b4b4a834cd778cd5e6c06)
- [Sky_Hunter's medieval brazier model](https://sketchfab.com/3d-models/medieval-brazier-cff29e533e3a4298a5d112cf7bb2558c)
- [GremorySaiyan's bird model](https://sketchfab.com/GremorySaiyan)

### More tools~

See all tools on the [Codrops article](https://tympanus.net/codrops/2025/04/08/3d-world-in-the-browser-with-blender-and-three-js/)!

### 🎉 Won FWA of the day 🎉!

[FWA of the Day](https://thefwa.com/cases/codrops-fane-museum)!
