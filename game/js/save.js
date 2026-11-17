/* Save/load: mission progress, money, reputation, position, settings.
   localStorage only — no network, no account. */
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s !== 'object' || s === null) return null;
    return s;
  } catch { return null; }
}
export function writeSave(game) {
  try {
    const p = game.player;
    const data = {
      version: 1, savedAt: new Date().toISOString(),
      missionIndex: game.missions.index, money: game.money, rep: game.rep,
      health: p.health, armor: p.armor,
      x: p.inCar ? p.inCar.x : p.x, z: p.inCar ? p.inCar.z : p.z,
      inCar: !!p.inCar,
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch { return false; }
}
export function clearSave() {
  try { window.localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
}
