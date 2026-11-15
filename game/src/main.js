// Emberlight — the loop and the screens. One clear job: own the canvas, the
// frame loop, the screen state machine and the wiring between input, world,
// rendering and sound. The simulation itself lives in world.js.
import { CONFIG } from './config.js';
import { createWorld, resetRun, update, drainEvents } from './world.js';
import { drawFrame } from './render.js';
import { buildShotScene } from './shots.js';
import { createInput, bindInput, readMovement, endFrame, wasPressed } from './input.js';
import { createAudio, unlockAudio, toggleMute, playEvent } from './audio.js';

const { WORLD_W, WORLD_H } = CONFIG;
const BEST_KEY = 'emberlight-best-score';
const STEP = 1 / 60;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusLine = document.getElementById('status');

function loadBestScore() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Private mode or blocked storage: the game plays on regardless.
  }
}

let bestScore = loadBestScore();
const audio = createAudio();
const input = createInput();

// Fit the 1280x720 arena into the window, letterboxed, and map mouse
// coordinates back into arena space.
let scale = 1;
let offsetX = 0;
let offsetY = 0;
function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  scale = Math.min(width / WORLD_W, height / WORLD_H);
  offsetX = (width - WORLD_W * scale) / 2;
  offsetY = (height - WORLD_H * scale) / 2;
  canvas.width = Math.floor(WORLD_W * scale);
  canvas.height = Math.floor(WORLD_H * scale);
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = `${canvas.height}px`;
}
window.addEventListener('resize', resize);
resize();

function toLogical(clientX, clientY) {
  const x = (clientX - offsetX) / scale;
  const y = (clientY - offsetY) / scale;
  if (x < 0 || y < 0 || x > WORLD_W || y > WORLD_H) return null;
  return { x, y };
}
bindInput(input, canvas, toLogical);

function setStatus(text) {
  if (statusLine) statusLine.textContent = text;
}

// --- Screenshot mode -------------------------------------------------------
// ?shot=start|play|win|end&seed=7 renders one deterministic scene, then
// signals window.__shotReady so the screenshot tool knows it is done.
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
if (shotName) {
  const seed = Number(params.get('seed') || 7);
  const scene = buildShotScene(shotName, seed);
  const sceneWorld = scene.world;
  if (sceneWorld.score > bestScore) bestScore = sceneWorld.score;
  drawFrame(ctx, sceneWorld, scene.screen, bestScore, scene.time);
  setStatus(`Emberlight screenshot: ${shotName}`);
  window.__shotReady = true;
} else {
  runGame();
}

function runGame() {
  let world = createWorld(Date.now() % 2147483647);
  let screen = 'title';
  let last = performance.now();
  let accumulator = 0;

  function startRun() {
    resetRun(world);
    screen = 'playing';
    setStatus('Emberlight: playing. Collect embers, light the braziers, survive 10 waves.');
  }

  function endRun() {
    if (world.score > bestScore) {
      bestScore = world.score;
      saveBestScore(bestScore);
    }
    screen = world.status === 'won' ? 'won' : 'lost';
    setStatus(
      screen === 'won'
        ? `Victory! The light endures. Final score ${world.score}. Press R to play again.`
        : `Game over on wave ${world.wave}. Final score ${world.score}. Press R to try again.`,
    );
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min((now - last) / 1000, 0.1);
    last = now;

    // One-shot keys, handled by screen.
    if (wasPressed(input, 'm') || wasPressed(input, 'M')) toggleMute(audio);
    if (screen === 'title') {
      if (
        wasPressed(input, 'Enter') ||
        wasPressed(input, ' ') ||
        input.mouseDown
      ) {
        unlockAudio(audio);
        startRun();
      }
    } else if (screen === 'playing') {
      if (wasPressed(input, 'p') || wasPressed(input, 'P') || wasPressed(input, 'Escape')) {
        screen = 'paused';
        setStatus('Emberlight paused. Press P to keep playing.');
      }
    } else if (screen === 'paused') {
      if (wasPressed(input, 'p') || wasPressed(input, 'P') || wasPressed(input, 'Escape') || wasPressed(input, 'Enter')) {
        screen = 'playing';
        setStatus('Emberlight: playing.');
      }
    } else if (screen === 'won' || screen === 'lost') {
      if (wasPressed(input, 'r') || wasPressed(input, 'R') || wasPressed(input, 'Enter') || wasPressed(input, ' ')) {
        unlockAudio(audio);
        startRun();
      }
    }

    if (screen === 'playing') {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        update(world, STEP, readMovement(input));
        accumulator -= STEP;
        if (world.status !== 'playing') {
          endRun();
          break;
        }
      }
      for (const event of drainEvents(world)) {
        playEvent(audio, event, world.combo);
      }
    }

    // Title screen idles on a live world so the lanterns and embers drift.
    const time = now / 1000;
    drawFrame(ctx, world, screen, bestScore, time);
    endFrame(input);
  }

  requestAnimationFrame(frame);
  setStatus('Emberlight: title screen. Press Enter or click to begin.');
}
