// Deterministic screenshot scenes for ?shot=start|play|win|end&seed=N.
// One clear job: build a fixed, readable scene from a seed and a fixed
// amount of simulated time — no wall clock, no real input — so every render
// of the same scene is byte-identical in spirit and pixel-identical in fact.
import { CONFIG } from './config.js';
import { createWorld, update, botInput } from './world.js';

const STEP = 1 / 60;

// Run the bot for a fixed number of ticks so the play scene shows a real
// mid-game state: embers on the field, shadows closing in, HUD populated.
function simulate(world, ticks) {
  for (let i = 0; i < ticks; i++) {
    if (world.status !== 'playing') break;
    update(world, STEP, botInput(world));
  }
  return world;
}

// Shake is the renderer's one use of Math.random; zero it so a scene's
// pixels are identical on every render.
function finish(world, screen, time) {
  world.shake = 0;
  return { world, screen, time };
}

export function buildShotScene(name, seed = 7) {
  if (name === 'start') {
    const world = createWorld(seed);
    // Let the title idle briefly so embers drift into view.
    simulate(world, 90);
    return finish(world, 'title', 1.5);
  }
  if (name === 'play') {
    const world = createWorld(seed);
    // About 20 seconds of bot play: wave 2-3, combo built, braziers lit.
    simulate(world, 1200);
    return finish(world, 'playing', 20);
  }
  if (name === 'win') {
    const world = createWorld(seed);
    // Force a victory state with a played-looking run behind it.
    simulate(world, 600);
    world.stats.wavesCleared = CONFIG.TOTAL_WAVES;
    world.stats.embersCollected = 86;
    world.stats.kills = 74;
    world.stats.braziersLit = 9;
    world.stats.flaresUsed = 31;
    world.bestCombo = 11;
    world.score = 18420;
    world.time = 412;
    world.status = 'won';
    world.enemies = [];
    world.embers = [];
    world.braziers.forEach((b) => {
      b.lit = true;
    });
    return finish(world, 'won', 0);
  }
  // 'end': game over.
  const world = createWorld(seed);
  simulate(world, 900);
  world.stats.wavesCleared = 4;
  world.stats.embersCollected = 41;
  world.stats.kills = 33;
  world.stats.braziersLit = 5;
  world.stats.flaresUsed = 17;
  world.bestCombo = 8;
  world.score = 7310;
  world.time = 238;
  world.lives = 0;
  world.wave = world.stats.wavesCleared + 1; // died on the wave after the last one cleared
  world.status = 'lost';
  world.enemies = [];
  world.embers = [];
  return finish(world, 'lost', 0);
}
