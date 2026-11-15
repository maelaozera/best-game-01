// Seeded random numbers (mulberry32) so the game, its screenshot scenes and
// its tests are all reproducible from a single seed.
export function mulberry32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small helper object so callers read intent, not raw floats.
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    // Float in [min, max).
    range(min, max) {
      return min + (max - min) * next();
    },
    // Integer in [min, max] inclusive.
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // Angle in radians, uniform over the circle.
    angle() {
      return next() * Math.PI * 2;
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
  };
}
