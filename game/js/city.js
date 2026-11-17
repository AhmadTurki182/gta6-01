/* Puerto Sol's road graph, blocks, buildings and colliders. Everything is
   derived from the seed, so the same seed always builds the same city. */
import { WORLD } from './config.js';
import { mulberry32, pick, hash2 } from './utils.js';

export function roadCoord(i) { return -WORLD.size / 2 + WORLD.roadHalf + i * WORLD.block + (i > 0 ? WORLD.roadHalf : 0) + (i === 0 ? 0 : 0); }
// Road centre lines: 9 lines, spacing = block + road width.
export function roadLines() {
  const lines = [];
  const step = WORLD.block + WORLD.roadHalf * 2;
  const start = -WORLD.size / 2 + WORLD.roadHalf;
  for (let i = 0; i < WORLD.roads; i++) lines.push(start + i * step);
  return lines;
}
export function nearestRoadCoord(v) {
  const lines = roadLines();
  let best = lines[0], bd = Infinity;
  for (const l of lines) { const d = Math.abs(v - l); if (d < bd) { bd = d; best = l; } }
  return best;
}
export function snapToRoad(x, z) {
  // Snap to the nearest road centre, keeping the closer axis.
  const nx = nearestRoadCoord(x), nz = nearestRoadCoord(z);
  return Math.abs(x - nx) < Math.abs(z - nz) ? { x: nx, z } : { x, z: nz };
}

export function buildCity(seed) {
  const rng = mulberry32(seed);
  const lines = roadLines();
  const half = WORLD.size / 2;
  const buildings = [];
  const colliders = [];
  const palms = [];
  const lamps = [];
  const signs = [];
  const districts = [];
  // District per block: downtown near centre, marina east, docks west-south,
  // boardwalk south-east, warehouses west.
  for (let bx = 0; bx < WORLD.roads - 1; bx++) {
    for (let bz = 0; bz < WORLD.roads - 1; bz++) {
      const x0 = lines[bx] + WORLD.roadHalf, x1 = lines[bx + 1] - WORLD.roadHalf;
      const z0 = lines[bz] + WORLD.roadHalf, z1 = lines[bz + 1] - WORLD.roadHalf;
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const dc = Math.hypot(cx, cz) / half; // 0 centre -> 1 edge
      let district = 'mid';
      if (cx > 180 && cz < -180) district = 'marina';
      else if (cx > 180 && cz > 180) district = 'pier';
      else if (cx < -180 && cz > 180) district = 'docks';
      else if (cx < -180 && cz < -180) district = 'industrial';
      else if (dc < 0.28) district = 'downtown';
      else if (cz > 240) district = 'boardwalk';
      districts.push({ bx, bz, district, cx, cz });
      const count = district === 'downtown' ? 1 : (rng() < 0.55 ? 2 : 1);
      for (let k = 0; k < count; k++) {
        const w = (x1 - x0) * (count === 1 ? 0.62 : 0.42);
        const d = (z1 - z0) * (count === 1 ? 0.62 : 0.42);
        const ox = count === 1 ? 0 : (k === 0 ? -w * 0.55 : w * 0.55);
        const oz = count === 1 ? 0 : (k === 0 ? -d * 0.55 : d * 0.55);
        let h;
        if (district === 'downtown') h = 55 + rng() * 90;
        else if (district === 'marina') h = 22 + rng() * 38;
        else if (district === 'industrial' || district === 'docks') h = 9 + rng() * 10;
        else if (district === 'boardwalk') h = 8 + rng() * 12;
        else h = 12 + rng() * 30;
        // Meridian Tower: the tallest, at the centre block.
        if (bx === 4 && bz === 4 && k === 0) { h = 150; district = 'downtown'; }
        const b = {
          x: cx + ox, z: cz + oz, w, d, h, district,
          hue: pick(rng, [0.08, 0.55, 0.6, 0.02, 0.35, 0.75]),
          floors: Math.max(2, Math.round(h / 3.4)),
          sign: rng() < 0.3,
        };
        buildings.push(b);
        colliders.push({ minX: b.x - w / 2, maxX: b.x + w / 2, minZ: b.z - d / 2, maxZ: b.z + d / 2 });
        if (b.sign) signs.push({ x: b.x, z: b.z - b.d / 2 - 0.4, h: Math.min(6, b.h * 0.25), text: pick(rng, ['SOLARA', 'NEON', 'HALCYON', 'MERIDIAN', 'CORAL', 'PALM', 'VISTA', 'AZUL']) });
      }
      // Palms along the block edges (boardwalk + marina get more).
      const palmN = district === 'boardwalk' || district === 'marina' ? 6 : district === 'pier' ? 5 : 2;
      for (let p = 0; p < palmN; p++) {
        palms.push({ x: x0 + 4 + rng() * (x1 - x0 - 8), z: z0 + 3 + rng() * 6, s: 0.8 + rng() * 0.5 });
        palms.push({ x: x0 + 4 + rng() * (x1 - x0 - 8), z: z1 - 3 - rng() * 6, s: 0.8 + rng() * 0.5 });
      }
    }
  }
  // Street lamps at every intersection corner.
  for (const lx of lines) for (const lz of lines) {
    lamps.push({ x: lx + WORLD.roadHalf + 1.2, z: lz + WORLD.roadHalf + 1.2 });
  }
  // Parked cars along random road edges.
  const parked = [];
  const styles = ['brisa', 'solmar', 'coral', 'manta'];
  for (let i = 0; i < 46; i++) {
    const along = lines[Math.floor(rng() * lines.length)];
    const cross = lines[Math.floor(rng() * lines.length)];
    const horiz = rng() < 0.5;
    parked.push({
      x: horiz ? along + (rng() - 0.5) * 600 : cross + (rng() < 0.5 ? -1 : 1) * (WORLD.roadHalf - 1.6),
      z: horiz ? cross + (rng() < 0.5 ? -1 : 1) * (WORLD.roadHalf - 1.6) : along + (rng() - 0.5) * 600,
      angle: horiz ? 0 : Math.PI / 2, style: pick(rng, styles),
    });
  }
  // Water: sea on the east + south edges beyond the city.
  return { lines, half, buildings, colliders, palms, lamps, signs, parked, districts,
    sea: { east: half + 40, south: half + 40 } };
}
/* Pick a road point near (x,z) that a car can drive on. */
export function roadPointNear(city, x, z) {
  const p = snapToRoad(x, z);
  return { x: p.x, z: p.z };
}
/* Is (x,z) on a road (within road half-width of a line)? */
export function onRoad(city, x, z) {
  for (const l of city.lines) {
    if (Math.abs(x - l) < WORLD.roadHalf) return true;
    if (Math.abs(z - l) < WORLD.roadHalf) return true;
  }
  return false;
}
export function districtAt(city, x, z) {
  let best = 'mid', bd = Infinity;
  for (const d of city.districts) {
    const dd = (d.cx - x) ** 2 + (d.cz - z) ** 2;
    if (dd < bd) { bd = dd; best = d.district; }
  }
  return best;
}
export function hashShade(x, z) { return hash2(Math.round(x / 8), Math.round(z / 8)); }
