// Emberlight — all drawing. One clear job: turn a world state into pixels.
// It never changes the world; the screens (title, pause, victory, game over)
// are drawn here too, from the same helpers the play view uses.
// Note: the player wisp is NOT drawn on the victory or game-over screens:
// its glow used to cover the stats table.
import { CONFIG } from './config.js';
import { makeRng } from './random.js';

const { WORLD_W, WORLD_H, ARENA_MARGIN, PALETTE } = CONFIG;

// Fixed background stars, the same every run.
const STARS = (() => {
  const rng = makeRng(20261116);
  const stars = [];
  for (let i = 0; i < 90; i++) {
    stars.push({
      x: rng.range(0, WORLD_W),
      y: rng.range(0, WORLD_H),
      r: rng.range(0.6, 2.0),
      twinkle: rng.range(0, Math.PI * 2),
    });
  }
  return stars;
})();

function circle(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function glowCircle(ctx, x, y, radius, color, alpha) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  circle(ctx, x, y, radius);
  ctx.globalAlpha = 1;
}

function drawBackground(ctx, time) {
  const gradient = ctx.createLinearGradient(0, 0, 0, WORLD_H);
  gradient.addColorStop(0, PALETTE.backgroundTop);
  gradient.addColorStop(1, PALETTE.backgroundBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  for (const star of STARS) {
    const twinkle = 0.35 + 0.3 * Math.sin(time * 1.4 + star.twinkle);
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = '#cdd6ff';
    circle(ctx, star.x, star.y, star.r);
  }
  ctx.globalAlpha = 1;

  // Arena floor and edge.
  ctx.fillStyle = PALETTE.arenaGlow;
  ctx.fillRect(ARENA_MARGIN, ARENA_MARGIN, WORLD_W - ARENA_MARGIN * 2, WORLD_H - ARENA_MARGIN * 2);
  ctx.strokeStyle = PALETTE.arenaEdge;
  ctx.lineWidth = 3;
  ctx.strokeRect(ARENA_MARGIN, ARENA_MARGIN, WORLD_W - ARENA_MARGIN * 2, WORLD_H - ARENA_MARGIN * 2);

  // Faint floor specks so the dark floor reads as a place, not a void.
  ctx.fillStyle = PALETTE.floorSpeck;
  for (let i = 0; i < 24; i++) {
    const x = ARENA_MARGIN + 60 + ((i * 173) % (WORLD_W - ARENA_MARGIN * 2 - 120));
    const y = ARENA_MARGIN + 50 + ((i * 211) % (WORLD_H - ARENA_MARGIN * 2 - 100));
    ctx.fillRect(x, y, 3, 3);
  }
}

function drawBraziers(ctx, world, time) {
  for (const brazier of world.braziers) {
    // Stone base.
    ctx.fillStyle = '#3a4266';
    ctx.beginPath();
    ctx.arc(brazier.x, brazier.y + 14, 26, 0, Math.PI);
    ctx.fill();
    ctx.fillRect(brazier.x - 26, brazier.y + 12, 52, 8);
    ctx.fillStyle = '#232a4a';
    ctx.fillRect(brazier.x - 6, brazier.y + 20, 12, 14);
    if (brazier.lit) {
      const flicker = 1 + 0.12 * Math.sin(time * 9 + brazier.x);
      glowCircle(ctx, brazier.x, brazier.y - 6, 90 * flicker, 'rgba(255,179,71,0.55)', 0.8);
      // Flame: three stacked teardrops.
      ctx.fillStyle = PALETTE.flame;
      ctx.beginPath();
      ctx.moveTo(brazier.x, brazier.y - 34 * flicker);
      ctx.quadraticCurveTo(brazier.x + 13, brazier.y - 12, brazier.x, brazier.y + 2);
      ctx.quadraticCurveTo(brazier.x - 13, brazier.y - 12, brazier.x, brazier.y - 34 * flicker);
      ctx.fill();
      ctx.fillStyle = '#ffe9a8';
      ctx.beginPath();
      ctx.moveTo(brazier.x, brazier.y - 20 * flicker);
      ctx.quadraticCurveTo(brazier.x + 7, brazier.y - 6, brazier.x, brazier.y + 2);
      ctx.quadraticCurveTo(brazier.x - 7, brazier.y - 6, brazier.x, brazier.y - 20 * flicker);
      ctx.fill();
    } else {
      // Unlit: a cold bowl with a faint "light me" ring.
      ctx.strokeStyle = 'rgba(154,163,199,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(brazier.x, brazier.y - 2, CONFIG.BRAZIER_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#1a2038';
      circle(ctx, brazier.x, brazier.y - 2, 18);
      ctx.fillStyle = PALETTE.textDim;
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('LIGHT ME', brazier.x, brazier.y + 52);
    }
  }
}

function drawEmbers(ctx, world, time) {
  for (const ember of world.embers) {
    const bob = Math.sin(time * 3 + ember.phase) * 3;
    const y = ember.y + bob;
    glowCircle(ctx, ember.x, y, 26, 'rgba(255,207,77,0.5)', 0.75);
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.moveTo(ember.x, y - 10);
    ctx.quadraticCurveTo(ember.x + 8, y, ember.x, y + 10);
    ctx.quadraticCurveTo(ember.x - 8, y, ember.x, y - 10);
    ctx.fill();
    ctx.fillStyle = '#fff3c4';
    circle(ctx, ember.x - 2, y - 3, 2.5);
  }
}

function drawEnemies(ctx, world, time) {
  for (const enemy of world.enemies) {
    const wobble = Math.sin(time * 5 + enemy.born * 7) * 2;
    const x = enemy.x;
    const y = enemy.y + wobble;
    // Shadow body: a dark blob with a violet rim.
    const body = ctx.createRadialGradient(x, y, enemy.radius * 0.2, x, y, enemy.radius * 1.6);
    body.addColorStop(0, '#3a2d63');
    body.addColorStop(0.7, PALETTE.shadow);
    body.addColorStop(1, 'rgba(26,20,48,0)');
    ctx.fillStyle = body;
    circle(ctx, x, y, enemy.radius * 1.6);
    ctx.fillStyle = '#241b45';
    circle(ctx, x, y, enemy.radius);
    // Eyes say which kind it is: violet drifter, red darter, cyan splitter.
    const eyeColor = enemy.type === 'darter' ? PALETTE.darterEye : enemy.type === 'splitter' ? PALETTE.splitterEye : PALETTE.shadowEye;
    const eyeY = y - 2;
    const eyeGap = enemy.radius * 0.42;
    ctx.fillStyle = eyeColor;
    circle(ctx, x - eyeGap, eyeY, 3.2);
    circle(ctx, x + eyeGap, eyeY, 3.2);
    if (enemy.type === 'splitter') {
      // A cracked ring marks the one that splits.
      ctx.strokeStyle = 'rgba(127,227,255,0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, enemy.radius + 4, 0.4, Math.PI * 1.3);
      ctx.stroke();
    }
    if (enemy.state === 'lunge') {
      ctx.strokeStyle = 'rgba(255,107,107,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - enemy.lungeX * 22, y - enemy.lungeY * 22);
      ctx.lineTo(x + enemy.lungeX * 10, y + enemy.lungeY * 10);
      ctx.stroke();
    }
  }
}

function drawPlayer(ctx, world, time) {
  const player = world.player;
  // Blink while invulnerable after a hit.
  if (player.invuln > 0 && Math.floor(time * 12) % 2 === 0) return;
  const flicker = 1 + 0.08 * Math.sin(time * 7);
  glowCircle(ctx, player.x, player.y, 78 * flicker, 'rgba(255,215,106,0.5)', 0.85);
  glowCircle(ctx, player.x, player.y, 34, 'rgba(255,246,216,0.7)', 0.9);
  // Lantern body.
  ctx.fillStyle = '#f7c948';
  ctx.beginPath();
  ctx.ellipse(player.x, player.y, 12, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.wispCore;
  ctx.beginPath();
  ctx.ellipse(player.x, player.y - 2, 7, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // Lantern cap and handle.
  ctx.fillStyle = '#8a6d1f';
  ctx.fillRect(player.x - 7, player.y - 19, 14, 5);
  ctx.strokeStyle = '#8a6d1f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x, player.y - 19, 6, Math.PI, 0);
  ctx.stroke();
  // Face: two warm eyes looking toward the mouse.
  ctx.fillStyle = '#3a2a00';
  circle(ctx, player.x - 4, player.y - 3, 1.8);
  circle(ctx, player.x + 4, player.y - 3, 1.8);
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    circle(ctx, p.x, p.y, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawFlare(ctx, world) {
  if (!world.flare.active) return;
  const progress = 1 - world.flare.t / CONFIG.FLARE_SECONDS;
  const radius = CONFIG.FLARE_RADIUS * (0.35 + 0.65 * progress);
  ctx.globalAlpha = 0.85 * (1 - progress);
  ctx.strokeStyle = '#ffe9a8';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(world.flare.x, world.flare.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.3 * (1 - progress);
  ctx.fillStyle = '#ffd76a';
  circle(ctx, world.flare.x, world.flare.y, CONFIG.FLARE_KILL_RADIUS * (0.5 + 0.5 * progress));
  ctx.globalAlpha = 1;
}

// --- HUD -----------------------------------------------------------------

function drawLives(ctx, lives, x, y) {
  for (let i = 0; i < CONFIG.START_LIVES; i++) {
    const lx = x + i * 30;
    if (i < lives) {
      glowCircle(ctx, lx, y, 16, 'rgba(255,215,106,0.5)', 0.8);
      ctx.fillStyle = PALETTE.wispCore;
      circle(ctx, lx, y, 7);
    } else {
      ctx.strokeStyle = PALETTE.textDim;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(lx, y, 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

export function drawHUD(ctx, world) {
  // Top bar.
  ctx.fillStyle = 'rgba(8,11,26,0.72)';
  ctx.fillRect(0, 0, WORLD_W, 52);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE ${world.score}`, 18, 34);
  ctx.font = 'bold 20px sans-serif';
  ctx.fillStyle = world.combo >= 8 ? PALETTE.gold : PALETTE.textDim;
  ctx.fillText(world.combo > 1 ? `COMBO x${world.combo}` : 'COMBO —', 250, 32);
  ctx.fillStyle = PALETTE.text;
  ctx.textAlign = 'center';
  ctx.fillText(`WAVE ${Math.min(world.wave, CONFIG.TOTAL_WAVES)} / ${CONFIG.TOTAL_WAVES}`, WORLD_W / 2, 34);
  ctx.textAlign = 'right';
  ctx.fillText('LIVES', WORLD_W - 250, 32);
  drawLives(ctx, world.lives, WORLD_W - 225, 26);
  // Charge bar under the top bar.
  const barW = 220;
  const barX = WORLD_W - barW - 18;
  ctx.fillStyle = PALETTE.hudBar;
  ctx.fillRect(barX, 58, barW, 12);
  ctx.fillStyle = world.charge >= CONFIG.FLARE_COST ? PALETTE.charge : PALETTE.danger;
  ctx.fillRect(barX, 58, barW * (world.charge / CONFIG.CHARGE_MAX), 12);
  ctx.strokeStyle = PALETTE.arenaEdge;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, 58, barW, 12);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`FLARE ${Math.floor(world.charge)}  [SPACE / CLICK]`, barX + barW, 88);
  // Brazier pips: how many of the three are lit this wave.
  const lit = world.braziers.filter((b) => b.lit).length;
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '13px sans-serif';
  ctx.fillText(`BRAZIERS ${lit}/3`, 18, 76);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(8,11,26,0.86)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.arenaEdge;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}

function centeredText(ctx, text, y, font, color) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(text, WORLD_W / 2, y);
}

function drawStatsTable(ctx, world, y) {
  const rows = [
    ['Score', String(world.score)],
    ['Waves cleared', `${world.stats.wavesCleared} / ${CONFIG.TOTAL_WAVES}`],
    ['Embers collected', String(world.stats.embersCollected)],
    ['Shadows banished', String(world.stats.kills)],
    ['Braziers lit', String(world.stats.braziersLit)],
    ['Best combo', `x${world.bestCombo}`],
    ['Flares cast', String(world.stats.flaresUsed)],
    ['Time', `${Math.floor(world.time)}s`],
  ];
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'left';
  const labelX = WORLD_W / 2 - 150;
  const valueX = WORLD_W / 2 + 150;
  rows.forEach(([label, value], i) => {
    const rowY = y + i * 30;
    ctx.fillStyle = PALETTE.textDim;
    ctx.fillText(label, labelX, rowY);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'right';
    ctx.fillText(value, valueX, rowY);
    ctx.textAlign = 'left';
  });
  return y + rows.length * 30;
}

// --- Screens ---------------------------------------------------------------

export function drawTitle(ctx, world, bestScore, time) {
  drawBackground(ctx, time);
  drawBraziers(ctx, world, time);
  drawEmbers(ctx, world, time);
  // The wisp hovers in the middle of the title, a living logo.
  const hover = WORLD_H / 2 - 40 + Math.sin(time * 1.5) * 8;
  glowCircle(ctx, WORLD_W / 2, hover, 120, 'rgba(255,215,106,0.4)', 0.8);
  ctx.fillStyle = PALETTE.wispCore;
  ctx.beginPath();
  ctx.ellipse(WORLD_W / 2, hover, 26, 32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.gold;
  ctx.beginPath();
  ctx.ellipse(WORLD_W / 2, hover, 16, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  centeredText(ctx, 'EMBERLIGHT', 130, 'bold 72px sans-serif', PALETTE.gold);
  centeredText(ctx, 'Keeper of the Last Light', 172, 'italic 28px sans-serif', PALETTE.text);
  centeredText(ctx, 'The dark is coming. Keep the last light burning.', 220, '20px sans-serif', PALETTE.textDim);
  centeredText(ctx, 'Collect embers  •  Light all 3 braziers  •  Flare back the shadows', 258, '20px sans-serif', PALETTE.text);
  centeredText(ctx, 'Clear wave 10 to win — lose 3 lives and the dark wins', 288, '20px sans-serif', PALETTE.text);
  centeredText(ctx, 'MOVE  WASD / Arrows      FLARE  Space / Click      PAUSE  P      MUTE  M', 395, '18px sans-serif', PALETTE.textDim);
  const blink = Math.floor(time * 1.6) % 2 === 0;
  if (blink) centeredText(ctx, 'PRESS ENTER OR CLICK TO BEGIN', 450, 'bold 26px sans-serif', PALETTE.wispCore);
  if (bestScore > 0) centeredText(ctx, `Best score: ${bestScore}`, 495, '20px sans-serif', PALETTE.gold);
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(8,11,26,0.72)';
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  centeredText(ctx, 'PAUSED', WORLD_H / 2 - 30, 'bold 56px sans-serif', PALETTE.text);
  centeredText(ctx, 'Press P or Esc to keep playing', WORLD_H / 2 + 20, '22px sans-serif', PALETTE.textDim);
}

export function drawVictory(ctx, world, bestScore) {
  drawBackground(ctx, 0);
  // No player wisp here: its glow covered the stats table.
  glowCircle(ctx, WORLD_W / 2, 150, 160, 'rgba(255,215,106,0.35)', 0.7);
  centeredText(ctx, 'THE LIGHT ENDURES', 130, 'bold 56px sans-serif', PALETTE.gold);
  centeredText(ctx, 'Wave 10 is clear. Every brazier burns, and the night is yours.', 172, '22px sans-serif', PALETTE.text);
  centeredText(ctx, `Final score: ${world.score}`, 216, 'bold 28px sans-serif', PALETTE.wispCore);
  if (world.score >= bestScore && world.score > 0) {
    centeredText(ctx, 'NEW BEST SCORE!', 252, 'bold 22px sans-serif', PALETTE.gold);
  }
  const endY = drawStatsTable(ctx, world, 300);
  centeredText(ctx, 'Press R or Enter to play again', endY + 40, 'bold 24px sans-serif', PALETTE.wispCore);
}

export function drawGameOver(ctx, world, bestScore) {
  drawBackground(ctx, 0);
  // No player wisp here either: the stats table must stay legible.
  centeredText(ctx, 'THE LIGHT GOES OUT', 130, 'bold 56px sans-serif', PALETTE.danger);
  centeredText(ctx, `The shadows took the last lantern on wave ${world.wave}.`, 172, '22px sans-serif', PALETTE.text);
  centeredText(ctx, `Final score: ${world.score}`, 216, 'bold 28px sans-serif', PALETTE.wispCore);
  centeredText(ctx, `Best score: ${bestScore}`, 252, '22px sans-serif', PALETTE.gold);
  const endY = drawStatsTable(ctx, world, 300);
  centeredText(ctx, 'Press R or Enter to try again', endY + 40, 'bold 24px sans-serif', PALETTE.wispCore);
}

// --- Frame -----------------------------------------------------------------

export function drawFrame(ctx, world, screen, bestScore, time) {
  ctx.save();
  if (world.shake > 0) {
    const s = world.shake;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  if (screen === 'title') {
    drawTitle(ctx, world, bestScore, time);
  } else if (screen === 'won') {
    drawVictory(ctx, world, bestScore);
  } else if (screen === 'lost') {
    drawGameOver(ctx, world, bestScore);
  } else {
    drawBackground(ctx, time);
    drawBraziers(ctx, world, time);
    drawEmbers(ctx, world, time);
    drawEnemies(ctx, world, time);
    drawPlayer(ctx, world, time);
    drawParticles(ctx, world);
    drawFlare(ctx, world);
    drawHUD(ctx, world);
    if (screen === 'paused') drawPause(ctx);
  }
  ctx.restore();
}
