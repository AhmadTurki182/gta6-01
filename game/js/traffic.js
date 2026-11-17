/* Ambient traffic: cars that follow the road graph in lanes, yield at
   intersections, despawn far behind the player and respawn ahead. */
import { CARS } from './config.js';
import { mulberry32, pick, clamp } from './utils.js';
import { createCar, removeCar, steerToward } from './vehicles.js';

const TRAFFIC_STYLES = ['brisa', 'solmar', 'coral', 'manta'];
export function createTraffic(scene, city, seed, count) {
  const rng = mulberry32(seed ^ 0x51ab);
  const cars = [];
  for (let i = 0; i < count; i++) {
    const car = spawnTrafficCar(scene, city, rng, 0, 0, true);
    if (car) cars.push(car);
  }
  return { cars, rng, count };
}
function randomRoadPoint(city, rng) {
  const l = pick(rng, city.lines);
  const horiz = rng() < 0.5;
  const along = -city.half + rng() * city.half * 2;
  return horiz ? { x: along, z: l } : { x: l, z: along };
}
export function spawnTrafficCar(scene, city, rng, px, pz, anywhere) {
  let p;
  if (anywhere) p = randomRoadPoint(city, rng);
  else {
    // Ahead of the player, on a nearby road.
    for (let tries = 0; tries < 12; tries++) {
      p = randomRoadPoint(city, rng);
      const d = Math.hypot(p.x - px, p.z - pz);
      if (d > 60 && d < 220) break;
    }
  }
  const style = pick(rng, TRAFFIC_STYLES);
  const heading = rng() < 0.5 ? 0 : Math.PI / 2;
  const car = createCar(scene, style, p.x, p.z, heading, {});
  car.driver = 'traffic';
  car.speed = 8 + rng() * 6;
  // Route: pick a random road line to cruise along, then turn at random.
  car.routeAxis = rng() < 0.5 ? 'x' : 'z';
  car.routeLine = pick(rng, city.lines);
  car.routeDir = rng() < 0.5 ? 1 : -1;
  car.lane = (rng() < 0.5 ? -1 : 1) * 3.2;
  return car;
}
export function updateTraffic(t, scene, city, px, pz, dt, now) {
  for (const car of t.cars) {
    // Follow the route line in its lane; at the city edge, pick a new line.
    const along = car.routeAxis === 'x' ? car.x : car.z;
    const atEdge = car.routeDir > 0 ? along > city.half - 20 : along < -city.half + 20;
    if (atEdge || Math.random() < 0.0004) {
      car.routeLine = pick(t.rng, city.lines);
      car.routeDir *= -1;
      if (Math.random() < 0.5) car.routeAxis = car.routeAxis === 'x' ? 'z' : 'x';
    }
    let tx, tz;
    const lead = 26;
    if (car.routeAxis === 'x') { tx = car.x + car.routeDir * lead; tz = car.routeLine + car.lane; }
    else { tx = car.routeLine + car.lane; tz = car.z + car.routeDir * lead; }
    // Slow down if another car is right ahead.
    let slow = 1;
    for (const other of t.cars) {
      if (other === car) continue;
      const dx = other.x - car.x, dz = other.z - car.z;
      const ahead = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
      const side = Math.abs(dx * Math.cos(car.heading) - dz * Math.sin(car.heading));
      if (ahead > 0 && ahead < 14 && side < 3) { slow = 0.25; break; }
    }
    const targetSpeed = (9 + (car.id % 5)) * slow;
    steerToward(car, tx, tz, targetSpeed, dt);
    // Despawn far behind the player, respawn ahead.
    const d = Math.hypot(car.x - px, car.z - pz);
    if (d > 320) {
      const idx = t.cars.indexOf(car);
      removeCar(scene, car);
      const fresh = spawnTrafficCar(scene, city, t.rng, px, pz, false);
      if (fresh) t.cars[idx] = fresh;
    }
  }
}
export function nearestTrafficCar(t, x, z, maxD) {
  let best = null, bd = maxD * maxD;
  for (const c of t.cars) {
    const d2 = (c.x - x) ** 2 + (c.z - z) ** 2;
    if (d2 < bd) { bd = d2; best = c; }
  }
  return best;
}
