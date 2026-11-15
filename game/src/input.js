// Keyboard and mouse input, kept apart from the simulation so the world can
// be driven by a bot in tests with the same input shape.
//
// The input object the world reads each tick:
//   { up, down, left, right, flare, mouseX, mouseY }
// `flare` is an edge trigger: true only on the tick the key or button went down.
export function createInput() {
  return {
    keys: new Set(),
    mouseX: 0,
    mouseY: 0,
    mouseDown: false,
    flareQueued: false,
    // Edge-triggered one-shot actions the main loop drains each frame.
    pressed: new Set(),
  };
}

// Bind DOM listeners. `canvas` is the game canvas; `toLogical` converts a
// client pixel into logical arena coordinates (or null when outside).
export function bindInput(input, canvas, toLogical) {
  const down = (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed.add(event.key);
    input.keys.add(event.key);
    if (event.key === ' ' || event.key === 'Spacebar') input.flareQueued = true;
  };
  const up = (event) => {
    input.keys.delete(event.key);
  };
  const blur = () => {
    input.keys.clear();
  };
  const move = (event) => {
    const rect = canvas.getBoundingClientRect();
    const point = toLogical(event.clientX - rect.left, event.clientY - rect.top);
    if (point) {
      input.mouseX = point.x;
      input.mouseY = point.y;
    }
  };
  const click = (event) => {
    move(event);
    input.flareQueued = true;
    input.mouseDown = true;
  };
  const release = () => {
    input.mouseDown = false;
  };

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  canvas.addEventListener('mousemove', move);
  canvas.addEventListener('mousedown', click);
  window.addEventListener('mouseup', release);
}

// Read the held movement keys into the shape the world consumes.
export function readMovement(input) {
  const keys = input.keys;
  return {
    up: keys.has('ArrowUp') || keys.has('w') || keys.has('W'),
    down: keys.has('ArrowDown') || keys.has('s') || keys.has('S'),
    left: keys.has('ArrowLeft') || keys.has('a') || keys.has('A'),
    right: keys.has('ArrowRight') || keys.has('d') || keys.has('D'),
    flare: input.flareQueued,
    mouseX: input.mouseX,
    mouseY: input.mouseY,
  };
}

// Drain one-shot state after a tick so a flare fires exactly once.
export function endFrame(input) {
  input.flareQueued = false;
  input.pressed.clear();
}

// True when the named key was pressed down since the last endFrame.
export function wasPressed(input, key) {
  return input.pressed.has(key);
}
