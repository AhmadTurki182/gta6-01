/* Small math + deterministic RNG helpers shared by every system. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function damp(a, b, lambda, dt) { return lerp(a, b, 1 - Math.exp(-lambda * dt)); }
export function angleLerp(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
  return a + d * t;
}
export function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return dx * dx + dz * dz; }
export function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
export function hash2(x, z) {
  let h = (x * 374761393 + z * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/* Axis-aligned box test used for building collision. */
export function pointInBox(px, pz, box) {
  return px > box.minX && px < box.maxX && pz > box.minZ && pz < box.maxZ;
}
/* Push a circle (player/car) out of an AABB; returns true when it collided. */
export function resolveCircleBox(px, pz, r, box) {
  const cx = clamp(px, box.minX, box.maxX), cz = clamp(pz, box.minZ, box.maxZ);
  const dx = px - cx, dz = pz - cz, d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return null;
  if (d2 > 1e-8) {
    const d = Math.sqrt(d2), push = (r - d) / d;
    return { x: px + dx * push, z: pz + dz * push };
  }
  // Centre inside the box: push out along the smallest penetration axis.
  const pl = px - box.minX, pr = box.maxX - px, pt = pz - box.minZ, pb = box.maxZ - pz;
  const m = Math.min(pl, pr, pt, pb);
  if (m === pl) return { x: box.minX - r, z: pz };
  if (m === pr) return { x: box.maxX + r, z: pz };
  if (m === pt) return { x: px, z: box.minZ - r };
  return { x: px, z: box.maxZ + r };
}
