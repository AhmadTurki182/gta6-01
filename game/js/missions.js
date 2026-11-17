/* The three-mission story: Valet Heat, The Ledger, Meridian Job.
   Each mission is a short chain of objective steps with a live marker,
   a banner, rewards, and fail/restart handling. */
import { MISSIONS, PLACES, NAMES } from './config.js';
import { createCar, removeCar } from './vehicles.js';
import { buildPedMesh } from './world.js';
import { addHeat, clearWanted } from './wanted.js';
import { targetDown } from './combat.js';

export function createMissions(game) {
  return {
    game, index: 0, step: 0, active: false, done: false,
    target: null, missionCar: null, ledgerTaken: false,
    timer: 0, banner: '', bannerAt: -99, toast: '', toastAt: -99,
    escapeStartedAt: 0,
  };
}
export function currentDef(m) { return MISSIONS[m.index] || null; }
export function currentStep(m) {
  const def = currentDef(m);
  return def ? def.steps[m.step] : null;
}
export function setBanner(m, text, now) { m.banner = text; m.bannerAt = now; }
export function setToast(m, text, now) { m.toast = text; m.toastAt = now; }

export function startMission(m, index, now) {
  const game = m.game;
  m.index = index; m.step = 0; m.active = true; m.done = false;
  m.ledgerTaken = false; m.timer = 0;
  const def = MISSIONS[index];
  setBanner(m, def.title, now);
  setToast(m, def.brief, now);
  // Clean up previous mission props.
  if (m.missionCar) { removeCar(game.scene, m.missionCar); m.missionCar = null; }
  if (m.target) { game.scene.remove(m.target.mesh); m.target = null; }
  if (index === 0) {
    m.missionCar = createCar(game.scene, 'vento', PLACES.marina.x, PLACES.marina.z, Math.PI / 2, { mission: 'valet' });
    m.missionCar.driver = null;
  } else if (index === 1) {
    spawnShark(m, game);
  } else if (index === 2) {
    m.missionCar = createCar(game.scene, 'atlas', PLACES.tower.x - 18, PLACES.tower.z, 0, { mission: 'meridian' });
    m.missionCar.driver = null;
  }
  game.saveDirty = true;
}
function spawnShark(m, game) {
  const mesh = buildPedMesh(0x6b21a8, 0x111111, 0xe8b98a);
  mesh.scale.setScalar(1.12);
  mesh.position.set(PLACES.pier.x, 0, PLACES.pier.z);
  game.scene.add(mesh);
  m.target = { mesh, x: PLACES.pier.x, z: PLACES.pier.z, hp: 100, alive: true, name: NAMES.shark };
}
export function missionMarker(m) {
  if (!m.active) return null;
  const step = currentStep(m);
  if (!step) return null;
  const g = m.game;
  if (step.kind === 'car' || step.kind === 'steal') return m.missionCar ? { x: m.missionCar.x, z: m.missionCar.z, label: 'Vento GT' } : null;
  if (step.kind === 'stealVan') return m.missionCar ? { x: m.missionCar.x, z: m.missionCar.z, label: 'Atlas Van' } : null;
  if (step.kind === 'deliver') return m.index === 0 ? { x: PLACES.pier.x, z: PLACES.pier.z, label: 'Neon Pier' } : { x: PLACES.docks.x, z: PLACES.docks.z, label: 'Lola Vega — Docks' };
  if (step.kind === 'goto') return m.index === 1 ? { x: PLACES.pier.x, z: PLACES.pier.z, label: 'Neon Pier' } : { x: PLACES.tower.x, z: PLACES.tower.z, label: 'Meridian Tower' };
  if (step.kind === 'fight') return m.target ? { x: m.target.x, z: m.target.z, label: NAMES.shark } : null;
  if (step.kind === 'escape') return { x: PLACES.spray.x, z: PLACES.spray.z, label: 'Spray Shop — lose the cops' };
  return null;
}
function playerPos(g) {
  return g.player.inCar ? { x: g.player.inCar.x, z: g.player.inCar.z } : { x: g.player.x, z: g.player.z };
}
function near(g, x, z, r) {
  const p = playerPos(g);
  return Math.hypot(p.x - x, p.z - z) < r;
}
export function updateMissions(m, dt, now) {
  const g = m.game;
  if (!m.active) return;
  const def = currentDef(m);
  const step = currentStep(m);
  if (!step) return;
  const p = g.player;
  // Mission car destroyed = fail.
  if (m.missionCar && m.missionCar.health <= 0) { failMission(m, now, 'The mission car was destroyed.'); return; }
  if (step.kind === 'gotoCar') {
    if (near(g, PLACES.marina.x, PLACES.marina.z, 16)) { m.step = 1; setToast(m, 'There it is — the Vento GT. Press F to steal it.', now); }
  } else if (step.kind === 'steal') {
    if (p.inCar === m.missionCar) {
      m.step = 2;
      addHeat(g.wanted, 'steal', now);
      setBanner(m, 'ALARM TRIPPED — 2 STARS', now);
      setToast(m, 'The valet called it in. Get the case to Neon Pier — keep the car above 50% health.', now);
      g.audio.sirenBurst();
    }
  } else if (step.kind === 'deliver' && m.index === 0) {
    if (p.inCar === m.missionCar && near(g, PLACES.pier.x, PLACES.pier.z, 16)) {
      if (m.missionCar.health >= 50) completeMission(m, now);
      else failMission(m, now, 'The Vento GT arrived below 50% health — the case is ruined.');
    }
  } else if (step.kind === 'goto' && m.index === 1) {
    if (!p.inCar && near(g, PLACES.pier.x, PLACES.pier.z, 16)) { m.step = 1; setToast(m, 'Mickey Sable is by the arcade. Punch him down (LMB), then grab the ledger (E).', now); }
  } else if (step.kind === 'fight') {
    if (m.target && targetDown(m.target)) {
      m.target.alive = false;
      m.target.mesh.rotation.x = Math.PI / 2; m.target.mesh.position.y = 0.2;
      setToast(m, 'Sable is down. Press E to grab the ledger.', now);
    }
    if (m.target && !m.target.alive && m.ledgerTaken) {
      m.step = 2; m.escapeStartedAt = now;
      addHeat(g.wanted, 'kill', now); addHeat(g.wanted, 'steal', now);
      setBanner(m, '3 STARS — LOSE THE COPS', now);
      setToast(m, 'Cops are coming. Lose them — or reach the spray shop at the north-west corner.', now);
    }
  } else if (step.kind === 'escape') {
    if (g.wanted.stars === 0 && now - m.escapeStartedAt > 3) completeMission(m, now);
    else if (near(g, PLACES.spray.x, PLACES.spray.z, 14)) {
      clearWanted(g.wanted, now);
      setToast(m, 'Fresh paint, clean plates. You are clear.', now);
      completeMission(m, now);
    }
  } else if (step.kind === 'goto' && m.index === 2) {
    if (near(g, PLACES.tower.x, PLACES.tower.z, 18)) { m.step = 1; setToast(m, 'The Atlas van is in the garage. Press F to take it.', now); }
  } else if (step.kind === 'stealVan') {
    if (p.inCar === m.missionCar) {
      m.step = 2;
      addHeat(g.wanted, 'steal', now); addHeat(g.wanted, 'steal', now);
      setBanner(m, '3 STARS — ROADBLOCKS AHEAD', now);
      setToast(m, 'Halcyon security is on you. Run the roadblocks to Lola at the Docks.', now);
    }
  } else if (step.kind === 'deliver' && m.index === 2) {
    if (p.inCar === m.missionCar && near(g, PLACES.docks.x, PLACES.docks.z, 16)) completeMission(m, now);
  }
  // Target NPC idles / taunts while the fight step runs.
  if (m.target && m.target.alive && step.kind === 'fight') {
    const d = Math.hypot(p.x - m.target.x, p.z - m.target.z);
    if (d < 10 && Math.random() < dt * 0.3) setToast(m, 'Sable: "Halcyon owns this pier, courier."', now);
  }
}
function completeMission(m, now) {
  const g = m.game;
  const def = currentDef(m);
  g.money += def.reward; g.rep += def.rep;
  setBanner(m, `MISSION COMPLETE — +$${def.reward}  +${def.rep} REP`, now);
  setToast(m, m.index === 2
    ? 'Lola has the evidence. Halcyon is finished — Puerto Sol is yours, Dario. Free roam: press M to replay missions.'
    : 'Job done. Press M for the next mission.', now);
  g.audio.missionComplete();
  m.active = false; m.done = true;
  if (m.missionCar) { /* keep the car in the world as a reward */ m.missionCar.mission = null; m.missionCar = null; }
  if (m.target) { g.scene.remove(m.target.mesh); m.target = null; }
  m.index += 1;
  if (m.index >= MISSIONS.length) { m.index = MISSIONS.length; }
  g.saveGame();
}
function failMission(m, now, reason) {
  setBanner(m, 'MISSION FAILED', now);
  setToast(m, `${reason} Press M to retry.`, now);
  m.active = false;
  const g = m.game;
  if (m.missionCar) { removeCar(g.scene, m.missionCar); m.missionCar = null; }
  if (m.target) { g.scene.remove(m.target.mesh); m.target = null; }
  g.saveGame();
}
export function restartMission(m, now) {
  const idx = m.active ? m.index : Math.max(0, Math.min(m.index, MISSIONS.length - 1));
  if (idx >= MISSIONS.length) { startMission(m, 0, now); return; }
  startMission(m, idx, now);
}
/* E key: grab the ledger, use the spray shop, heal at the safehouse. */
export function interact(m, now) {
  const g = m.game;
  const step = currentStep(m);
  if (m.active && step && step.kind === 'fight' && m.target && !m.target.alive && !m.ledgerTaken) {
    if (near(g, m.target.x, m.target.z, 4)) {
      m.ledgerTaken = true;
      setToast(m, 'Ledger grabbed. Now run.', now);
      return true;
    }
  }
  if (near(g, PLACES.spray.x, PLACES.spray.z, 14) && g.wanted.stars > 0) {
    clearWanted(g.wanted, now);
    g.money = Math.max(0, g.money - 50);
    setToast(m, 'Spray shop: fresh paint, clean plates. -$50.', now);
    return true;
  }
  if (near(g, PLACES.safehouse.x, PLACES.safehouse.z, 14)) {
    g.player.health = 100; g.player.armor = 50;
    setToast(m, 'Safehouse: patched up, armor restocked.', now);
    return true;
  }
  return false;
}
