# Puerto Sol — gta6-01

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/AhmadTurki182/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/AhmadTurki182/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**Puerto Sol** — a sun-soaked open-world crime game in the spirit of GTA 6, built with three.js for make.fun's "Make GTA 6" bounty. Everything is original: the city, characters, vehicles, story, art, sounds and music. Nothing from Rockstar Games.

## The game

Dario Fuentes, bike courier turned getaway driver, was framed by the Halcyon Group. Reporter Lola Vega has the proof — if Dario can steal it back, job by job, across Puerto Sol.

- **Procedural 3D city** — 9×9 road grid, downtown towers (Meridian Tower), Solara Marina, Neon Pier, Puerto Sol Docks, boardwalk, warehouses; palms, streetlights, billboards, sea on two sides.
- **Drive anything** — steal parked cars, traffic cars or mission cars (Vento GT, Manta, Atlas armored van, Coral Cab…) with arcade handling, drift, damage and smoke.
- **Living streets** — 40+ traffic cars following the road graph, 70 pedestrians who stroll and panic, police cruisers that patrol, pursue, ram and set roadblocks.
- **Wanted system** — heat 0–500, 0–5 stars; crimes add heat, heat decays out of sight, spray shop clears it.
- **3 story missions** — Valet Heat (steal the Vento GT, deliver the case), The Ledger (confront loan shark Mickey Sable on foot, lose the cops), Meridian Job (steal the armored van, run the roadblocks to Lola).
- **Combat** — pistol and melee, hit reactions, on-foot cops.
- **HUD + minimap** — health/armor, wanted stars + heat bar, mission banner/objective, live minimap with mission marker and police dots, speedometer.
- **Menus + save** — start screen, pause menu, autosave + manual save in localStorage.
- **Sound** — fully procedural WebAudio: engine, sirens, gunshots, skids and a generative Latin-synthwave loop. No audio files.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Static files only, no build step, no network — three.js is vendored under `game/vendor/three.min.js`.

## Controls

WASD move / drive · Mouse look / aim · LMB punch / shoot · Shift sprint / boost · Space jump / handbrake · F enter / exit car · E interact · M next mission · Esc pause

---

<sub>Entered on [make.fun](https://make.fun/?ref=rqn4ywrm&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
