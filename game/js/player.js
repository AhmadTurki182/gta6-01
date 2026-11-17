/* Dario on foot: WASD movement, mouse-look camera, jump, health, enter/exit. */
import { PLAYER, STEP } from './config.js';
import { clamp, damp, angleLerp } from './utils.js';
import { buildPlayerMesh } from './world.js';

export function createPlayer(scene, x, z) {
  const mesh = buildPlayerMesh();
  mesh.position.set(x, 0, z);
  scene.add(mesh);
  return {
    mesh, x, z, y: 0, vy: 0, heading: 0, camYaw: 0, camPitch: 0.32,
    vx: 0, vz: 0, health: PLAYER.maxHealth, armor: 0,
    onGround: true, inCar: null, walkPhase: 0, moving: false,
    dead: false, lastDamageAt: -99,
  };
}
export function damagePlayer(p, amount, now) {
  if (p.dead) return;
  let left = amount;
  if (p.armor > 0) { const absorbed = Math.min(p.armor, left); p.armor -= absorbed; left -= absorbed; }
  p.health -= left; p.lastDamageAt = now;
  if (p.health <= 0) { p.health = 0; p.dead = true; }
}
export function healPlayer(p, amount) { p.health = clamp(p.health + amount, 0, PLAYER.maxHealth); }

export function updatePlayer(p, input, dt, colliders, now) {
  if (p.dead || p.inCar) { p.moving = false; return; }
  const sprint = input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
  const speed = sprint ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  let fx = 0, fz = 0;
  if (input.keys.has('KeyW')) fz -= 1;
  if (input.keys.has('KeyS')) fz += 1;
  if (input.keys.has('KeyA')) fx -= 1;
  if (input.keys.has('KeyD')) fx += 1;
  const len = Math.hypot(fx, fz) || 1;
  fx /= len; fz /= len;
  // Movement is relative to the camera yaw: forward = (-sin, -cos), right = (cos, -sin).
  const sin = Math.sin(p.camYaw), cos = Math.cos(p.camYaw);
  const wx = fx * cos + fz * sin, wz = -fx * sin + fz * cos;
  const tx = wx * speed, tz = wz * speed;
  p.vx = damp(p.vx, tx, 10, dt);
  p.vz = damp(p.vz, tz, 10, dt);
  p.x += p.vx * dt; p.z += p.vz * dt;
  // Building collision (circle vs AABB).
  for (const box of colliders) {
    const cx = clamp(p.x, box.minX, box.maxX), cz = clamp(p.z, box.minZ, box.maxZ);
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz, r = PLAYER.radius;
    if (d2 < r * r) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + (dx / d) * r; p.z = cz + (dz / d) * r; }
      else { p.x = box.maxX + r; }
    }
  }
  const half = 395;
  p.x = clamp(p.x, -half, half); p.z = clamp(p.z, -half, half);
  // Jump.
  if (input.keys.has('Space') && p.onGround) { p.vy = PLAYER.jumpVel; p.onGround = false; }
  if (!p.onGround) {
    p.vy -= 24 * dt; p.y += p.vy * dt;
    if (p.y <= 0) { p.y = 0; p.vy = 0; p.onGround = true; }
  }
  p.moving = Math.hypot(p.vx, p.vz) > 0.6;
  if (p.moving) {
    const target = Math.atan2(p.vx, p.vz);
    p.heading = angleLerp(p.heading, target, 1 - Math.exp(-12 * dt));
    p.walkPhase += Math.hypot(p.vx, p.vz) * dt * 1.6;
  }
  // Mesh pose.
  p.mesh.position.set(p.x, p.y, p.z);
  p.mesh.rotation.y = p.heading;
  const swing = p.moving ? Math.sin(p.walkPhase * 2) * 0.55 : 0;
  const u = p.mesh.userData;
  u.legL.rotation.x = swing; u.legR.rotation.x = -swing;
  u.armL.rotation.x = -swing * 0.8; u.armR.rotation.x = swing * 0.8;
  // Slow health regen out of combat.
  if (now - p.lastDamageAt > 12 && p.health > 0 && p.health < PLAYER.maxHealth) {
    p.health = Math.min(PLAYER.maxHealth, p.health + 2 * dt);
  }
}
/* Third-person camera: behind the player on foot, chase cam in a car. */
export function updateCamera(p, camera, input, dt, car) {
  p.camYaw -= (input.mouseDX || 0) * 0.0032;
  p.camPitch = clamp(p.camPitch + (input.mouseDY || 0) * 0.0022, 0.05, 1.1);
  input.mouseDX = 0; input.mouseDY = 0;
  let target, dist, height;
  if (car) {
    const back = car.heading + Math.PI;
    const cx = car.x + Math.sin(back) * 12, cz = car.z + Math.cos(back) * 12;
    target = { x: car.x, y: 1.6, z: car.z };
    const k = 1 - Math.exp(-6 * dt);
    camera.position.x += (cx - camera.position.x) * k;
    camera.position.y += (4.4 - camera.position.y) * k;
    camera.position.z += (cz - camera.position.z) * k;
    camera.lookAt(target.x, target.y, target.z);
    return;
  }
  dist = 8.5; height = 3.4 + p.camPitch * 3;
  const cx = p.x + Math.sin(p.camYaw) * dist;
  const cz = p.z + Math.cos(p.camYaw) * dist;
  const k = 1 - Math.exp(-14 * dt);
  camera.position.x += (cx - camera.position.x) * k;
  camera.position.y += (height - camera.position.y) * k;
  camera.position.z += (cz - camera.position.z) * k;
  camera.lookAt(p.x, 1.6 + p.camPitch, p.z);
}
