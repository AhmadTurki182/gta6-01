/* Puerto Sol — boot, fixed-step loop, input, car stealing, death/pause,
   and the glue between every system. */
import { STEP, WORLD, MISSIONS, PLACES } from './config.js';
import { clamp } from './utils.js';
import { buildCity } from './city.js';
import { createWorld3D } from './world.js';
import { createPlayer, updatePlayer, updateCamera, damagePlayer } from './player.js';
import { createCar, driveCar, carSpeedKmh } from './vehicles.js';
import { createTraffic, updateTraffic, nearestTrafficCar } from './traffic.js';
import { createPedestrians, updatePedestrians, panicPeds } from './pedestrians.js';
import { createPolice, updatePolice, clearPolice } from './police.js';
import { createWanted, updateWanted, addHeat, clearWanted } from './wanted.js';
import { createMissions, startMission, updateMissions, missionMarker, interact, restartMission, currentStep, setBanner, setToast } from './missions.js';
import { createCombat, tryAttack } from './combat.js';
import { createHud, updateHud, showStart, showGame, showPause, hidePause, showDead } from './hud.js';
import { drawMinimap } from './minimap.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { stageShot } from './stage.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : (WORLD.seed + Math.floor(Math.random() * 1000));

const city = buildCity(seed);
const world3d = createWorld3D(city, seed);
const { scene, camera, renderer } = world3d;
const hud = createHud();
const audio = createAudio();
const saved = loadSave();

const game = {
  scene, city, time: 0, money: 250, rep: 0, promptText: '', events: [],
  audio, saveDirty: false, screen: 'title', paused: false,
  saveGame() { writeSave(game); },
  missionText() {
    const m = game.missions;
    if (!m.active) {
      if (m.index >= MISSIONS.length) return { title: 'PUERTO SOL — FREE ROAM', objective: 'All missions complete. Press M to replay from Mission 1.' };
      return { title: 'PUERTO SOL — FREE ROAM', objective: `Press M to start Mission ${m.index + 1}` };
    }
    const def = MISSIONS[m.index];
    const step = currentStep(m);
    return { title: def.title, objective: step ? step.text : def.brief, timer: '' };
  },
};

const player = createPlayer(scene, PLACES.safehouse.x, PLACES.safehouse.z);
game.player = player;
game.wanted = createWanted();
game.police = createPolice(scene, city, seed);
game.traffic = createTraffic(scene, city, seed, 42);
game.pedestrians = createPedestrians(scene, city, seed, 70);
game.combat = createCombat();
game.missions = createMissions(game);
game.input = { keys: new Set(), mouseDX: 0, mouseDY: 0, attack: false };
game.cars = [];
// Parked cars the player can steal.
for (const pk of city.parked) {
  const car = createCar(scene, pk.style, pk.x, pk.z, pk.angle, { parked: true });
  car.driver = null;
  game.cars.push(car);
}
// Restore a save's position/money when continuing.
if (saved) {
  game.money = saved.money ?? 250; game.rep = saved.rep ?? 0;
  game.missions.index = Math.min(saved.missionIndex ?? 0, MISSIONS.length);
  player.health = saved.health ?? 100; player.armor = saved.armor ?? 0;
}

function nearestDrivable(x, z, maxD) {
  let best = null, bd = maxD * maxD;
  const check = (c) => {
    const d2 = (c.x - x) ** 2 + (c.z - z) ** 2;
    if (d2 < bd) { bd = d2; best = c; }
  };
  for (const c of game.cars) check(c);
  for (const c of game.traffic.cars) check(c);
  if (game.missions.missionCar) check(game.missions.missionCar);
  return best;
}
function enterExitCar(now) {
  if (player.inCar) {
    const car = player.inCar;
    car.driver = null;
    player.inCar = null;
    const side = car.heading + Math.PI / 2;
    player.x = car.x + Math.sin(side) * 2.2; player.z = car.z + Math.cos(side) * 2.2;
    player.mesh.position.set(player.x, 0, player.z);
    return;
  }
  const car = nearestDrivable(player.x, player.z, 4.6);
  if (!car) return;
  // Stealing: traffic cars leave the traffic pool; any theft draws heat.
  const ti = game.traffic.cars.indexOf(car);
  if (ti !== -1) game.traffic.cars.splice(ti, 1);
  else if (!game.cars.includes(car) && car !== game.missions.missionCar) game.cars.push(car);
  const wasMission = car === game.missions.missionCar;
  const wasParked = car.parked;
  car.parked = false; car.driver = 'player';
  player.inCar = car;
  player.x = car.x; player.z = car.z;
  if (!wasMission) {
    game.wanted.heat = clamp(game.wanted.heat + (wasParked ? 45 : 60), 0, 520);
    game.wanted.stars = game.wanted.heat >= 80 ? (game.wanted.heat >= 180 ? 2 : 1) : game.wanted.stars;
    if (game.wanted.stars > 0) audio.sirenBurst();
  }
  panicPeds(game.pedestrians, car.x, car.z, 18);
}
function drainEvents(now) {
  for (const e of game.events) {
    if (e.type === 'shot') audio.shot();
    else if (e.type === 'crash') { audio.crash(); panicPeds(game.pedestrians, e.x, e.z, 25); }
    else if (e.type === 'hurt') { /* damage flash handled by HUD */ }
  }
  game.events.length = 0;
}
function updatePrompt() {
  const p = player;
  if (p.inCar) { game.promptText = ''; return; }
  const car = nearestDrivable(p.x, p.z, 4.6);
  if (car) {
    game.promptText = car === game.missions.missionCar ? `Press F — steal the ${car.def.name}` : `Press F — take the ${car.def.name}`;
    return;
  }
  const m = game.missions;
  if (m.active && m.target && !m.target.alive && !m.ledgerTaken) {
    const d = Math.hypot(p.x - m.target.x, p.z - m.target.z);
    if (d < 4) { game.promptText = 'Press E — grab the ledger'; return; }
  }
  const nearSpray = Math.hypot(p.x - PLACES.spray.x, p.z - PLACES.spray.z) < 14;
  if (nearSpray && game.wanted.stars > 0) { game.promptText = 'Press E — spray shop ($50, clears wanted)'; return; }
  const nearSafe = Math.hypot(p.x - PLACES.safehouse.x, p.z - PLACES.safehouse.z) < 14;
  if (nearSafe) { game.promptText = 'Press E — safehouse (heal + armor)'; return; }
  game.promptText = '';
}
function stepSim(dt) {
  game.time += dt;
  const now = game.time;
  const input = game.input;
  if (player.inCar) {
    const hit = driveCar(player.inCar, input, dt, city.colliders);
    if (hit) { game.events.push({ type: 'crash', x: player.inCar.x, z: player.inCar.z }); addHeat(game.wanted, 'crash', now); }
    // Car vs traffic collision (cooldown per car so one bump is one hit).
    for (const t of game.traffic.cars) {
      const d2 = (t.x - player.inCar.x) ** 2 + (t.z - player.inCar.z) ** 2;
      if (d2 < 12 && now - (t.lastBumpAt || 0) > 0.5) {
        t.lastBumpAt = now;
        player.inCar.speed *= 0.6; player.inCar.health = Math.max(0, player.inCar.health - 4);
        t.speed *= 0.5;
        game.events.push({ type: 'crash', x: t.x, z: t.z });
      }
    }
    if (player.inCar.health <= 0) {
      // Car wrecked: bail out on foot, wanted stays.
      const car = player.inCar; car.driver = null; player.inCar = null;
      player.x = car.x + 2; player.z = car.z + 2;
      game.missions && setBanner(game.missions, 'CAR WRECKED', now);
    }
    if (player.inCar) audio.setEngine(Math.abs(player.inCar.speed) / player.inCar.def.top, input.keys.has('KeyW') ? 1 : 0);
    else audio.setEngine(0, 0);
  } else {
    updatePlayer(player, input, dt, city.colliders, now);
    // Traffic car hits the player on foot.
    for (const t of game.traffic.cars) {
      const d2 = (t.x - player.x) ** 2 + (t.z - player.z) ** 2;
      if (d2 < 4.5 && Math.abs(t.speed) > 3 && now - (t.lastBumpAt || 0) > 1) { t.lastBumpAt = now; damagePlayer(player, 10, now); t.speed *= 0.4; }
    }
    audio.setEngine(0, 0);
  }
  // Combat.
  if (input.attack) { tryAttack(game.combat, game, dt, now); input.attack = false; }
  updateTraffic(game.traffic, scene, city, player.inCar ? player.inCar.x : player.x, player.inCar ? player.inCar.z : player.z, dt, now);
  updatePedestrians(game.pedestrians, city, dt, now);
  const seen = updatePolice(game.police, game, dt, now);
  updateWanted(game.wanted, seen, now, dt);
  updateMissions(game.missions, dt, now);
  // Siren audio: nearest cruiser distance.
  let nearestCop = 999;
  for (const c of game.police.cruisers) {
    const d = Math.hypot(c.x - player.x, c.z - player.z);
    if (d < nearestCop) nearestCop = d;
  }
  audio.setSiren(game.wanted.stars > 0 && nearestCop < 160, clamp(nearestCop / 160, 0, 1));
  // Beacon follows the mission marker.
  const marker = missionMarker(game.missions);
  if (marker) {
    world3d.beacon.position.set(marker.x, 45, marker.z);
    world3d.beaconRing.position.set(marker.x, 0.15, marker.z);
    world3d.beacon.visible = true; world3d.beaconRing.visible = true;
  } else { world3d.beacon.visible = false; world3d.beaconRing.visible = false; }
  // Death.
  if (player.dead && game.screen === 'play') {
    game.screen = 'dead';
    document.exitPointerLock?.();
    showDead(hud, `Dario went down at $${game.money} — the Halcyon crew is still laughing. Pay $100 and get back up.`);
  }
  updatePrompt();
  drainEvents(now);
}
function frame(nowMs) {
  requestAnimationFrame(frame);
  if (game.screen !== 'play' || game.paused) return;
  const dt = STEP;
  // Fixed-step catch-up, capped so a hitch never spirals.
  frame.acc = (frame.acc || 0) + Math.min(0.1, (nowMs - (frame.last || nowMs)) / 1000);
  frame.last = nowMs;
  let n = 0;
  while (frame.acc >= STEP && n < 6) { stepSim(STEP); frame.acc -= STEP; n++; }
  updateCamera(player, camera, game.input, dt, player.inCar);
  updateHud(hud, game, game.time);
  drawMinimap(document.getElementById('minimap'), game);
  renderer.render(scene, camera);
}
function startPlay(fromSave) {
  audio.start();
  if (fromSave && saved) {
    player.x = saved.x ?? player.x; player.z = saved.z ?? player.z;
    player.mesh.position.set(player.x, 0, player.z);
  }
  game.screen = 'play';
  showGame(hud);
  if (game.missions.index < MISSIONS.length && !game.missions.active && game.missions.index > 0) {
    // Continuing mid-story: offer the next mission via the banner, not auto-start.
    setToast(game.missions, `Welcome back, Dario. Press M for Mission ${game.missions.index + 1}.`, game.time);
  }
  document.getElementById('view').requestPointerLock?.();
  frame.last = performance.now(); frame.acc = 0;
  requestAnimationFrame(frame);
}
/* ---- Input ---- */
const canvas = document.getElementById('view');
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') e.preventDefault();
  game.input.keys.add(e.code);
  if (game.screen !== 'play') return;
  if (e.repeat) return;
  if (e.code === 'KeyF') enterExitCar(game.time);
  if (e.code === 'KeyE') interact(game.missions, game.time);
  if (e.code === 'KeyM') {
    if (!game.missions.active) startMission(game.missions, Math.min(game.missions.index, MISSIONS.length - 1), game.time);
    else restartMission(game.missions, game.time);
  }
  if (e.code === 'Escape') {
    game.paused = !game.paused;
    if (game.paused) { document.exitPointerLock?.(); showPause(hud, `Mission ${Math.min(game.missions.index + 1, 3)}/3 · $${game.money} · REP ${game.rep}`); }
    else hidePause(hud);
  }
});
window.addEventListener('keyup', (e) => game.input.keys.delete(e.code));
window.addEventListener('mousedown', (e) => {
  if (game.screen === 'play' && e.button === 0) game.input.attack = true;
  if (game.screen === 'play' && document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
});
document.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) {
    game.input.mouseDX += e.movementX; game.input.mouseDY += e.movementY;
  }
});
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement !== canvas) { /* mouse look pauses; keys still work */ }
});
document.getElementById('playBtn').addEventListener('click', () => startPlay(false));
document.getElementById('continueBtn').addEventListener('click', () => startPlay(true));
document.getElementById('resumeBtn').addEventListener('click', () => { game.paused = false; hidePause(hud); });
document.getElementById('saveBtn').addEventListener('click', () => { writeSave(game); document.getElementById('pauseInfo').textContent = 'Game saved.'; });
document.getElementById('restartMissionBtn').addEventListener('click', () => { game.paused = false; hidePause(hud); restartMission(game.missions, game.time); });
document.getElementById('quitBtn').addEventListener('click', () => { game.paused = false; game.screen = 'title'; document.exitPointerLock?.(); showStart(hud, loadSave()); });
document.getElementById('respawnBtn').addEventListener('click', () => {
  game.money = Math.max(0, game.money - 100);
  player.dead = false; player.health = 100; player.armor = 25;
  player.x = PLACES.safehouse.x; player.z = PLACES.safehouse.z;
  player.mesh.position.set(player.x, 0, player.z);
  clearWanted(game.wanted, game.time);
  clearPolice(game.police);
  game.screen = 'play';
  showGame(hud);
});
/* ---- Boot ---- */
if (shotName) {
  // Screenshot staging: run the real sim forward, then freeze and paint.
  game.screen = 'play';
  game.stepSim = stepSim;
  game.camRef = { camera, renderer, scene };
  game.hudRef = hud;
  showGame(hud);
  stageShot(shotName, game, seed);
  renderer.render(scene, camera);
  // Paint a few frames so headless screenshot captures the WebGL canvas
  // (preserveDrawingBuffer keeps the last frame presentable).
  let painted = 0;
  (function paintLoop() {
    updateHud(hud, game, game.time);
    drawMinimap(document.getElementById('minimap'), game);
    renderer.render(scene, camera);
    window.__shotReady = true;
    painted += 1;
    if (painted < 6) requestAnimationFrame(paintLoop);
  })();
} else {
  showStart(hud, saved);
  renderer.render(scene, camera);
}
