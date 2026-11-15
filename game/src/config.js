// Emberlight — Keeper of the Last Light: tuning constants and palette.
// One clear job: every number the simulation and the renderer share lives here,
// so tuning the feel never means hunting through game logic.
export const CONFIG = {
  // Arena (logical pixels; the canvas scales to fit the window).
  WORLD_W: 1280,
  WORLD_H: 720,
  ARENA_MARGIN: 36,

  // Player: a lantern wisp.
  PLAYER_RADIUS: 14,
  PLAYER_SPEED: 265,
  PLAYER_ACCEL: 2400,

  // Run rules.
  START_LIVES: 3,
  TOTAL_WAVES: 10,
  INVULN_SECONDS: 2.0,
  WAVE_CLEAR_BONUS: 100,
  WAVE_CLEAR_PER_WAVE: 50,

  // Embers: gold pickups that feed the combo.
  EMBER_RADIUS: 9,
  EMBER_SCORE: 10,
  EMBER_CHARGE: 4,
  EMBER_MAX_ON_FIELD: 7,
  EMBER_SPAWN_SECONDS: 1.6,
  COMBO_MAX: 12,
  COMBO_WINDOW_SECONDS: 3.5,

  // Braziers: three fixed lamps. Touch one to light it.
  BRAZIER_RADIUS: 30,
  BRAZIER_TOUCH_RADIUS: 46,
  BRAZIER_SCORE: 250,
  BRAZIER_ALL_LIT_BONUS: 1000,
  BRAZIER_POSITIONS: [
    { x: 150, y: 130 },
    { x: 1130, y: 130 },
    { x: 640, y: 600 },
  ],

  // Flare: the wisp's burst of light. Costs charge, kills close shadows,
  // knocks back the rest.
  FLARE_COST: 30,
  FLARE_RADIUS: 175,
  FLARE_KILL_RADIUS: 105,
  FLARE_KNOCKBACK: 520,
  FLARE_SECONDS: 0.35,
  CHARGE_MAX: 100,
  CHARGE_REGEN_PER_SECOND: 16,

  // Enemies. Drifter speed 54 was tuned down from 58: at 58 the first
  // waves felt unfair before the player had learned the flare.
  DRIFTER_SPEED: 54,
  DRIFTER_RADIUS: 16,
  DARTER_SPEED: 46,
  DARTER_RADIUS: 14,
  DARTER_STALK_SECONDS: 1.6,
  DARTER_LUNGE_SPEED: 330,
  DARTER_LUNGE_SECONDS: 0.45,
  SPLITTER_SPEED: 40,
  SPLITTER_RADIUS: 20,
  MOTE_SPEED: 92,
  MOTE_RADIUS: 8,
  ENEMY_TOUCH_DAMAGE: 1,

  // Scoring for defeating shadows.
  KILL_SCORE: 50,
  MOTE_SCORE: 25,

  // Feel.
  SHAKE_MAX: 14,
  PARTICLE_MAX: 400,

  // Palette: deep night blues, warm gold, ember orange.
  PALETTE: {
    backgroundTop: '#0a0e24',
    backgroundBottom: '#131a33',
    arenaEdge: '#2a3560',
    arenaGlow: '#1c2547',
    floorSpeck: '#232c52',
    gold: '#ffcf4d',
    goldDeep: '#e89b1c',
    emberOrange: '#ff8a2a',
    flame: '#ffb347',
    wispCore: '#fff6d8',
    wispGlow: '#ffd76a',
    shadow: '#1a1430',
    shadowEye: '#b78cff',
    darterEye: '#ff6b6b',
    splitterEye: '#7fe3ff',
    text: '#f4ead2',
    textDim: '#9aa3c7',
    hudBar: '#2c3766',
    charge: '#ffd76a',
    danger: '#ff5d5d',
  },
};
