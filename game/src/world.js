// Emberlight — the simulation. Pure logic, no DOM, no canvas: the same file
// runs in the browser and under Node for the local tests.
// A run: keep the last light burning. Collect gold embers (each one raises
// the combo, up to x12), light the three braziers, and drive the shadows
// back with flares. Clear wave 10 to win; lose all 3 lives and the dark wins.
import { CONFIG } from './config.js';
import { makeRng } from './random.js';

const { WORLD_W, WORLD_H, ARENA_MARGIN } = CONFIG;

function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

// Wave composition grows with the wave number: more drifters every wave,
// darters from wave 2, splitters from wave 3.
export function waveComposition(wave) {
  const drifters = 3 + wave;
  const darters = wave >= 2 ? Math.floor(wave / 2) : 0;
  const splitters = wave >= 3 ? Math.floor((wave - 1) / 2) : 0;
  return { drifters, darters, splitters };
}

export function createWorld(seed = 7) {
  const world = {
    seed,
    rng: makeRng(seed),
    time: 0,
    status: 'playing', // 'playing' | 'won' | 'lost'
    wave: 1,
    lives: CONFIG.START_LIVES,
    score: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    charge: CONFIG.CHARGE_MAX,
    player: {
      x: WORLD_W / 2,
      y: WORLD_H / 2,
      vx: 0,
      vy: 0,
      invuln: 0,
    },
    embers: [],
    enemies: [],
    particles: [],
    braziers: CONFIG.BRAZIER_POSITIONS.map((p) => ({ x: p.x, y: p.y, lit: false })),
    flare: { active: false, t: 0, x: 0, y: 0 },
    spawnQueue: [],
    spawnTimer: 0,
    emberTimer: 1,
    shake: 0,
    stats: {
      embersCollected: 0,
      kills: 0,
      flaresUsed: 0,
      hitsTaken: 0,
      wavesCleared: 0,
      braziersLit: 0,
    },
    // Sound events the main loop drains and hands to audio.js.
    events: [],
  };
  resetBraziers(world);
  startWave(world, 1);
  return world;
}

// Fresh run, same shape as createWorld, for the restart key.
export function resetRun(world, seed) {
  const fresh = createWorld(seed === undefined ? (world.seed + 1) % 2147483647 : seed);
  Object.keys(world).forEach((key) => delete world[key]);
  Object.assign(world, fresh);
}

function resetBraziers(world) {
  world.braziers.forEach((b) => {
    b.lit = false;
  });
}

function pushEvent(world, name) {
  world.events.push(name);
}

export function drainEvents(world) {
  const events = world.events;
  world.events = [];
  return events;
}

function spawnPositionAwayFrom(world, minDistance) {
  for (let tries = 0; tries < 20; tries++) {
    const x = world.rng.range(ARENA_MARGIN + 30, WORLD_W - ARENA_MARGIN - 30);
    const y = world.rng.range(ARENA_MARGIN + 30, WORLD_H - ARENA_MARGIN - 30);
    if (distance(x, y, world.player.x, world.player.y) >= minDistance) return { x, y };
  }
  return { x: ARENA_MARGIN + 60, y: ARENA_MARGIN + 60 };
}

function spawnEmber(world) {
  const pos = spawnPositionAwayFrom(world, 120);
  world.embers.push({
    x: pos.x,
    y: pos.y,
    phase: world.rng.range(0, Math.PI * 2),
    born: world.time,
  });
}

function makeEnemy(world, type) {
  const pos = spawnPositionAwayFrom(world, 260);
  const base = {
    type,
    x: pos.x,
    y: pos.y,
    vx: 0,
    vy: 0,
    stun: 0,
    state: 'stalk',
    stateTimer: world.rng.range(1.0, 2.2),
    lungeX: 0,
    lungeY: 0,
    born: world.time,
  };
  if (type === 'drifter') {
    base.radius = CONFIG.DRIFTER_RADIUS;
    base.speed = CONFIG.DRIFTER_SPEED + Math.min(world.wave * 2, 16);
  } else if (type === 'darter') {
    base.radius = CONFIG.DARTER_RADIUS;
    base.speed = CONFIG.DARTER_SPEED + Math.min(world.wave, 8);
  } else if (type === 'splitter') {
    base.radius = CONFIG.SPLITTER_RADIUS;
    base.speed = CONFIG.SPLITTER_SPEED;
  } else {
    // 'mote': a shard of a splitter, small and quick.
    base.radius = CONFIG.MOTE_RADIUS;
    base.speed = CONFIG.MOTE_SPEED;
  }
  return base;
}

export function startWave(world, wave) {
  world.wave = wave;
  const plan = waveComposition(wave);
  world.spawnQueue = [];
  for (let i = 0; i < plan.drifters; i++) world.spawnQueue.push('drifter');
  for (let i = 0; i < plan.darters; i++) world.spawnQueue.push('darter');
  for (let i = 0; i < plan.splitters; i++) world.spawnQueue.push('splitter');
  // Shuffle the queue so the wave never arrives in the same order.
  for (let i = world.spawnQueue.length - 1; i > 0; i--) {
    const j = Math.floor(world.rng.next() * (i + 1));
    [world.spawnQueue[i], world.spawnQueue[j]] = [world.spawnQueue[j], world.spawnQueue[i]];
  }
  world.spawnTimer = 0.4;
  resetBraziers(world);
  pushEvent(world, 'waveStart');
}

function burst(world, x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    if (world.particles.length >= CONFIG.PARTICLE_MAX) return;
    const angle = world.rng.angle();
    const v = world.rng.range(speed * 0.3, speed);
    world.particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v,
      life: world.rng.range(0.35, 0.8),
      maxLife: 0.8,
      size: world.rng.range(2, 5),
      color,
    });
  }
}

function killEnemy(world, enemy, index, byFlare) {
  world.enemies.splice(index, 1);
  world.stats.kills += 1;
  const score = enemy.type === 'mote' ? CONFIG.MOTE_SCORE : CONFIG.KILL_SCORE;
  world.score += score;
  burst(world, enemy.x, enemy.y, '#8f7bff', enemy.type === 'splitter' ? 18 : 10, 160);
  if (byFlare) pushEvent(world, 'kill');
  if (enemy.type === 'splitter') {
    // A splitter hit by a flare bursts into two motes.
    for (let i = 0; i < 2; i++) {
      const mote = makeEnemy(world, 'mote');
      mote.x = clamp(enemy.x + (i === 0 ? -14 : 14), ARENA_MARGIN, WORLD_W - ARENA_MARGIN);
      mote.y = clamp(enemy.y + (i === 0 ? 10 : -10), ARENA_MARGIN, WORLD_H - ARENA_MARGIN);
      world.enemies.push(mote);
    }
  }
}

function triggerFlare(world) {
  if (world.charge < CONFIG.FLARE_COST) return false;
  world.charge -= CONFIG.FLARE_COST;
  world.stats.flaresUsed += 1;
  const { x, y } = world.player;
  world.flare = { active: true, t: CONFIG.FLARE_SECONDS, x, y };
  world.shake = Math.max(world.shake, 8);
  burst(world, x, y, '#ffd76a', 26, 320);
  pushEvent(world, 'flare');
  // Kill ring first (so a splitter's motes are not also knocked back),
  // then knock back every shadow inside the wider flare radius.
  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const enemy = world.enemies[i];
    const d = distance(x, y, enemy.x, enemy.y);
    if (d <= CONFIG.FLARE_KILL_RADIUS) killEnemy(world, enemy, i, true);
  }
  for (const enemy of world.enemies) {
    const d = distance(x, y, enemy.x, enemy.y);
    if (d > CONFIG.FLARE_KILL_RADIUS && d <= CONFIG.FLARE_RADIUS) {
      const push = CONFIG.FLARE_KNOCKBACK * (1 - (d - CONFIG.FLARE_KILL_RADIUS) / (CONFIG.FLARE_RADIUS - CONFIG.FLARE_KILL_RADIUS));
      const nx = (enemy.x - x) / (d || 1);
      const ny = (enemy.y - y) / (d || 1);
      enemy.vx += nx * push;
      enemy.vy += ny * push;
      enemy.stun = 0.5;
    }
  }
  return true;
}

function hitPlayer(world) {
  if (world.player.invuln > 0 || world.status !== 'playing') return;
  world.lives -= 1;
  world.stats.hitsTaken += 1;
  world.combo = 0;
  world.comboTimer = 0;
  world.player.invuln = CONFIG.INVULN_SECONDS;
  world.shake = CONFIG.SHAKE_MAX;
  burst(world, world.player.x, world.player.y, '#ff5d5d', 22, 260);
  pushEvent(world, 'hit');
  if (world.lives <= 0) {
    world.status = 'lost';
    pushEvent(world, 'lose');
  }
}

function collectEmber(world, index) {
  const ember = world.embers[index];
  world.embers.splice(index, 1);
  world.stats.embersCollected += 1;
  if (world.comboTimer > 0) {
    world.combo = Math.min(world.combo + 1, CONFIG.COMBO_MAX);
  } else {
    world.combo = 1;
  }
  world.comboTimer = CONFIG.COMBO_WINDOW_SECONDS;
  world.bestCombo = Math.max(world.bestCombo, world.combo);
  world.score += CONFIG.EMBER_SCORE * world.combo;
  world.charge = Math.min(CONFIG.CHARGE_MAX, world.charge + CONFIG.EMBER_CHARGE);
  burst(world, ember.x, ember.y, '#ffcf4d', 8, 120);
  pushEvent(world, 'collect');
}

function lightBrazier(world, brazier) {
  brazier.lit = true;
  world.stats.braziersLit += 1;
  world.score += CONFIG.BRAZIER_SCORE;
  burst(world, brazier.x, brazier.y, '#ffb347', 20, 200);
  pushEvent(world, 'brazier');
  if (world.braziers.every((b) => b.lit)) {
    world.score += CONFIG.BRAZIER_ALL_LIT_BONUS;
    pushEvent(world, 'allLit');
  }
}

function updateEnemy(world, enemy, dt) {
  const player = world.player;
  if (enemy.stun > 0) {
    enemy.stun -= dt;
    // A flare's knockback fades fast instead of flinging the shadow away.
    const decay = Math.pow(0.005, dt);
    enemy.vx *= decay;
    enemy.vy *= decay;
  } else if (enemy.type === 'darter') {
    enemy.stateTimer -= dt;
    if (enemy.state === 'stalk') {
      const d = distance(enemy.x, enemy.y, player.x, player.y);
      const want = 190;
      const nx = (player.x - enemy.x) / (d || 1);
      const ny = (player.y - enemy.y) / (d || 1);
      const toward = d > want + 30 ? 1 : d < want - 30 ? -1 : 0;
      enemy.vx = nx * enemy.speed * toward;
      enemy.vy = ny * enemy.speed * toward;
      if (enemy.stateTimer <= 0) {
        enemy.state = 'lunge';
        enemy.stateTimer = CONFIG.DARTER_LUNGE_SECONDS;
        enemy.lungeX = (player.x - enemy.x) / (d || 1);
        enemy.lungeY = (player.y - enemy.y) / (d || 1);
      }
    } else {
      enemy.vx = enemy.lungeX * CONFIG.DARTER_LUNGE_SPEED;
      enemy.vy = enemy.lungeY * CONFIG.DARTER_LUNGE_SPEED;
      if (enemy.stateTimer <= 0) {
        enemy.state = 'stalk';
        enemy.stateTimer = world.rng.range(1.2, 2.2);
      }
    }
  } else {
    // Drifter, splitter and mote: chase the wisp.
    const d = distance(enemy.x, enemy.y, player.x, player.y);
    const nx = (player.x - enemy.x) / (d || 1);
    const ny = (player.y - enemy.y) / (d || 1);
    enemy.vx = nx * enemy.speed;
    enemy.vy = ny * enemy.speed;
  }
  // Knockback decays; steering velocity is re-applied each tick above.
  enemy.x += enemy.vx * dt;
  enemy.y += enemy.vy * dt;
  enemy.x = clamp(enemy.x, ARENA_MARGIN + enemy.radius, WORLD_W - ARENA_MARGIN - enemy.radius);
  enemy.y = clamp(enemy.y, ARENA_MARGIN + enemy.radius, WORLD_H - ARENA_MARGIN - enemy.radius);
}

// Advance the simulation one fixed step. `input` is readMovement()'s shape.
export function update(world, dt, input) {
  if (world.status !== 'playing') return;
  world.time += dt;

  // --- Player movement (acceleration + damping, clamped to the arena). ---
  const player = world.player;
  let ax = 0;
  let ay = 0;
  if (input.up) ay -= 1;
  if (input.down) ay += 1;
  if (input.left) ax -= 1;
  if (input.right) ax += 1;
  if (ax !== 0 || ay !== 0) {
    const len = Math.hypot(ax, ay);
    player.vx += (ax / len) * CONFIG.PLAYER_ACCEL * dt;
    player.vy += (ay / len) * CONFIG.PLAYER_ACCEL * dt;
  }
  const damp = Math.pow(0.0001, dt);
  player.vx *= damp;
  player.vy *= damp;
  const speed = Math.hypot(player.vx, player.vy);
  if (speed > CONFIG.PLAYER_SPEED) {
    player.vx = (player.vx / speed) * CONFIG.PLAYER_SPEED;
    player.vy = (player.vy / speed) * CONFIG.PLAYER_SPEED;
  }
  player.x = clamp(player.x + player.vx * dt, ARENA_MARGIN + CONFIG.PLAYER_RADIUS, WORLD_W - ARENA_MARGIN - CONFIG.PLAYER_RADIUS);
  player.y = clamp(player.y + player.vy * dt, ARENA_MARGIN + CONFIG.PLAYER_RADIUS, WORLD_H - ARENA_MARGIN - CONFIG.PLAYER_RADIUS);
  if (player.invuln > 0) player.invuln -= dt;

  // --- Flare. ---
  if (input.flare) triggerFlare(world);
  if (world.flare.active) {
    world.flare.t -= dt;
    if (world.flare.t <= 0) world.flare.active = false;
  }

  // --- Charge and combo timers. ---
  world.charge = Math.min(CONFIG.CHARGE_MAX, world.charge + CONFIG.CHARGE_REGEN_PER_SECOND * dt);
  if (world.comboTimer > 0) {
    world.comboTimer -= dt;
    if (world.comboTimer <= 0) world.combo = 0;
  }

  // --- Ember spawns. ---
  world.emberTimer -= dt;
  if (world.emberTimer <= 0) {
    world.emberTimer = CONFIG.EMBER_SPAWN_SECONDS;
    if (world.embers.length < CONFIG.EMBER_MAX_ON_FIELD) spawnEmber(world);
  }

  // --- Enemy spawns (staggered, so a wave arrives in a trickle). ---
  if (world.spawnQueue.length > 0) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      world.spawnTimer = 0.55;
      world.enemies.push(makeEnemy(world, world.spawnQueue.shift()));
    }
  }

  // --- Enemies. ---
  for (const enemy of world.enemies) updateEnemy(world, enemy, dt);

  // --- Ember pickups. ---
  for (let i = world.embers.length - 1; i >= 0; i--) {
    const ember = world.embers[i];
    if (distance(player.x, player.y, ember.x, ember.y) < CONFIG.PLAYER_RADIUS + CONFIG.EMBER_RADIUS + 8) {
      collectEmber(world, i);
    }
  }

  // --- Braziers. ---
  for (const brazier of world.braziers) {
    if (!brazier.lit && distance(player.x, player.y, brazier.x, brazier.y) < CONFIG.BRAZIER_TOUCH_RADIUS) {
      lightBrazier(world, brazier);
    }
  }

  // --- Touches: a shadow that reaches the wisp costs a life. ---
  for (const enemy of world.enemies) {
    if (distance(player.x, player.y, enemy.x, enemy.y) < CONFIG.PLAYER_RADIUS + enemy.radius - 2) {
      hitPlayer(world);
      if (world.status !== 'playing') break;
    }
  }

  // --- Particles and shake decay. ---
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const p = world.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.02, dt);
    p.vy *= Math.pow(0.02, dt);
    if (p.life <= 0) world.particles.splice(i, 1);
  }
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 30);

  // --- Wave clear: no shadows left and none waiting to spawn. ---
  if (world.status === 'playing' && world.enemies.length === 0 && world.spawnQueue.length === 0) {
    world.stats.wavesCleared += 1;
    world.score += CONFIG.WAVE_CLEAR_BONUS + CONFIG.WAVE_CLEAR_PER_WAVE * world.wave;
    pushEvent(world, 'waveClear');
    if (world.wave >= CONFIG.TOTAL_WAVES) {
      world.status = 'won';
      pushEvent(world, 'win');
    } else {
      startWave(world, world.wave + 1);
    }
  }
}

// A tiny autopilot used by the local playtest (and only there). Its rules,
// in priority order: sidestep a lunging darter; flare when surrounded;
// hunt an ISOLATED shadow while the flare is charged; while the flare
// recharges, keep clear of the pack by fleeing from the centroid of every
// nearby shadow; otherwise collect embers.
export function botInput(world) {
  const player = world.player;
  const distTo = (e) => distance(player.x, player.y, e.x, e.y);
  const byDistance = [...world.enemies].sort((a, b) => distTo(a) - distTo(b));
  const nearest = byDistance[0] || null;
  const nearestD = nearest ? distTo(nearest) : Infinity;
  let flare = false;
  let tx = player.x;
  let ty = player.y;

  const lungingDarter = byDistance.find(
    (e) => e.type === 'darter' && e.state === 'lunge' && distTo(e) < 240,
  );
  const closeCount = byDistance.filter((e) => distTo(e) < 170).length;

  // Pick a hunt target: the closest shadow, penalised for each friend
  // nearby, so the bot never dives into a pack. A shadow with two or more
  // friends close by is never a target: the bot waits for isolation.
  let target = null;
  let targetScore = Infinity;
  for (const enemy of world.enemies) {
    const d = distTo(enemy);
    if (d > 320) continue;
    const friends = world.enemies.filter((o) => o !== enemy && distance(enemy.x, enemy.y, o.x, o.y) < 130).length;
    if (friends >= 2) continue;
    const score = d + friends * 90;
    if (score < targetScore) {
      targetScore = score;
      target = enemy;
    }
  }

  if (lungingDarter) {
    // Sidestep the lunge: move perpendicular to its path.
    const px = -lungingDarter.lungeY;
    const py = lungingDarter.lungeX;
    tx = player.x + px * 240;
    ty = player.y + py * 240;
  } else if (closeCount >= 3 && world.charge >= CONFIG.FLARE_COST) {
    // Surrounded: flare now, the knockback buys room.
    flare = true;
  } else if (target && world.charge >= CONFIG.FLARE_COST) {
    // Hunt: close in and flare inside the kill ring. The ring is 105, so
    // wait until 95: flaring at 110+ only knocks the shadow back and the
    // approach starts over.
    tx = target.x;
    ty = target.y;
    if (distTo(target) < 95) flare = true;
  } else if (nearest && nearestD < 220) {
    // Flare recharging (or no target): keep clear of the pack. Step to
    // the open space: of 8 directions, take the one whose landing point is
    // farthest from every shadow. Fleeing straight from the centroid used
    // to pin the wisp in a corner.
    let bestX = player.x;
    let bestY = player.y;
    let bestScore = -1;
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const cx = clamp(
        player.x + Math.cos(angle) * 220,
        ARENA_MARGIN + 60,
        WORLD_W - ARENA_MARGIN - 60,
      );
      const cy = clamp(
        player.y + Math.sin(angle) * 220,
        ARENA_MARGIN + 60,
        WORLD_H - ARENA_MARGIN - 60,
      );
      let minD = Infinity;
      for (const enemy of world.enemies) {
        minD = Math.min(minD, distance(cx, cy, enemy.x, enemy.y));
      }
      if (minD > bestScore) {
        bestScore = minD;
        bestX = cx;
        bestY = cy;
      }
    }
    tx = bestX;
    ty = bestY;
  } else {
    let nearestEmber = null;
    let nearestEmberD = Infinity;
    for (const ember of world.embers) {
      const d = distTo(ember);
      if (d < nearestEmberD) {
        nearestEmberD = d;
        nearestEmber = ember;
      }
    }
    if (nearestEmber) {
      tx = nearestEmber.x;
      ty = nearestEmber.y;
    } else {
      tx = WORLD_W / 2;
      ty = WORLD_H / 2;
    }
  }
  // Point blank: a shadow inside the kill ring with a charged flare dies,
  // whatever the bot was doing that tick. (Deaths kept landing one tick
  // short of a charged flare while a mote closed the last few pixels.)
  if (!flare && nearest && nearestD < 60 && world.charge >= CONFIG.FLARE_COST) flare = true;
  // No defensive flare here on purpose: flaring at 130 wastes the charge
  // outside the 95 kill ring and the knockback just resets the approach.
  // Kills come from the hunt branch above, inside the ring.
  const dx = tx - player.x;
  const dy = ty - player.y;
  const dead = 6;
  return {
    up: dy < -dead,
    down: dy > dead,
    left: dx < -dead,
    right: dx > dead,
    flare,
    mouseX: player.x,
    mouseY: player.y,
  };
}
