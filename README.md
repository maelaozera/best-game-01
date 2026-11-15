# Emberlight — Keeper of the Last Light

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/maelaozera/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/maelaozera/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A 2D canvas arena-survival game for the make.fun best-game-01 bounty.
No libraries, no build step, no network requests: plain ES modules under
`game/`, all art drawn in code, all sound synthesized with WebAudio.

## The game

You are a lantern wisp, the last light in a dark arena. Shadows drift in
from the night and close on your glow. Keep the light burning:

- **Collect gold embers.** Each one raises your combo (up to x12) and feeds
  your flare charge. The combo fades if you stop collecting.
- **Light the three braziers.** Touch one to light it (+250). Light all
  three in a wave for a +1000 bonus. They go dark again each wave.
- **Flare back the shadows.** Space or click spends 30 charge: shadows
  inside the kill ring are banished, the rest are knocked back.
- **Survive 10 waves to win.** Three lives; a touch from a shadow costs
  one and leaves you briefly invulnerable.

Three kinds of shadow hunt you: the **drifter** chases you, the **darter**
stalks at a distance and then lunges, and the **splitter** bursts into two
quick motes when a flare kills it.

## Controls

| Key | Action |
| --- | ------ |
| WASD / Arrow keys | Move the wisp |
| Space / Click | Flare (costs 30 charge) |
| P / Esc | Pause |
| M | Mute |
| R / Enter | Restart after victory or game over |

The HUD shows score, combo, wave, lives and flare charge. Your best score
is kept in `localStorage`. Title, pause, victory and game-over screens all
show a stats table of the run.

## Playing it

```sh
node serve.ts
# open http://localhost:8080
```

## Screenshots

The four screenshots in `screenshots/` are deterministic renders of the
game's own code, taken in headless Chromium at 1280x720:

| File | Scene |
| --- | ------ |
| `1-start.jpg` | Title screen (`?shot=start&seed=7`) |
| `2-play.jpg` | Mid-game, full HUD (`?shot=play&seed=7`) |
| `3-win.jpg` | Victory screen (`?shot=win&seed=7`) |
| `4-end.jpg` | Game-over screen (`?shot=end&seed=7`) |

## Layout

| Path | Job |
| --- | ------ |
| `game/index.html` | The page; loads the game, nothing else |
| `game/src/config.js` | Tuning constants and palette |
| `game/src/random.js` | Seeded RNG (mulberry32) |
| `game/src/input.js` | Keyboard and mouse |
| `game/src/audio.js` | Synthesized WebAudio sound |
| `game/src/world.js` | The simulation (pure logic, testable under Node) |
| `game/src/render.js` | All drawing, HUD and screens |
| `game/src/main.js` | Frame loop and screen state machine |
| `game/src/shots.js` | Deterministic screenshot scenes |
| `main.ts` | Hands the entry in: copies `game/` + `screenshots/`, writes `dossier.json` |
| `serve.ts` | Tiny static server for local play |
| `shots.json` | The four screenshot scenes |
| `vendor/makefun-game.ts` | The kit's dossier library, unchanged |

## Handing it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Run `main.ts` twice: both runs must write the same bytes.

## License

MIT — see `LICENSE`.

---

Entered on [make.fun](https://make.fun/?ref=02gvsh14&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards
