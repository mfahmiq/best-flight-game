# Skymail — Bush Pilot Courier

[![make.fun · best-flight-game-20261126-0057](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![rank](https://make.fun/badge/best-flight-game-20261126-0057/mfahmiq/best-flight-game/rank.svg)](https://make.fun/bounty/best-flight-game-20261126-0057/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)
[![reward](https://make.fun/badge/best-flight-game-20261126-0057/mfahmiq/best-flight-game/reward.svg)](https://make.fun/bounty/best-flight-game-20261126-0057?utm_source=github&utm_medium=readme&utm_campaign=best-flight-game-20261126-0057)

A bush-pilot flight game: fly a red-and-cream Skymail courier plane in chase
view over a seeded valley — fields, a winding river, runways and mountain
ridges — with lit instruments and a full HUD (airspeed, altitude, heading,
artificial horizon, fuel, throttle, gear and flap lights).

Three sorties share the one valley, each with a different goal:

1. **Ring Run** — thread 8 glowing rings down the valley against the clock.
2. **Island Courier** — deliver parcels to three airstrips; land gently on
   each runway to deliver and refuel.
3. **Mountain Rescue** — reach the SOS beacon at Pine Ridge strip, pick up
   the stranded hiker, and fly them home.

Flying rewards throttle and turn discipline: full throttle drinks fuel,
hard banks bleed speed into a stall, and every landing is judged — slow,
level, gear down for a clean touchdown; anything else at ground level is a
crash that reads as a crash.

## Controls

- **W / S** — throttle up / down
- **A / D** or **← / →** — bank
- **↑ / ↓** — pitch
- **Mouse** — steer (move to bank and pitch)
- **Space** — flaps (slows you for landing)
- **G** — landing gear up / down
- **1 / 2 / 3** — pick a sortie · **Enter** — fly · **P** — pause · **R** — restart

## Play

Serve `game/` with any static server (no build step, no network requests —
every script, sound and image is a file under `game/` or synthesised live)
and open `index.html` in a desktop browser:

```sh
python3 -m http.server 8091 --directory game
```

Sounds (engine drone, wind, ring chimes, touchdown, crash) are synthesised
with WebAudio — no audio files.

## Layout

- `game/index.html` + `game/css/style.css` — page shell
- `game/src/config.js` — constants and mission definitions
- `game/src/random.js` — seeded randomness and terrain noise
- `game/src/terrain.js` — the valley: heightfield, sky, runways, rings
- `game/src/physics.js` — the flight model: stall, fuel, damage, landings
- `game/src/aircraft.js` — the Skymail plane and its ground shadow
- `game/src/hud.js` — instruments, mission panel and screens
- `game/src/game.js` — state machine and mission rules
- `game/src/input.js` — keyboard and mouse
- `game/src/audio.js` — synthesised sounds
- `game/src/shots.js` — deterministic screenshot states (`?shot=cover|low|land|rescue|menu`)
- `game/src/main.js` — bootstrap and render loop

## Hand-in

`main.ts` copies `game/` and `screenshots/` to `/output` and writes
`/output/dossier.json` with the vendored make.fun library:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
