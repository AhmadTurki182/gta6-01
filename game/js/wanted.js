/* Wanted level: heat 0-500 maps to 0-5 stars; crimes add heat, heat decays
   only after the player has been unseen for a while. */
import { WANTED } from './config.js';
import { clamp } from './utils.js';

export function createWanted() {
  return { heat: 0, stars: 0, lastSeenAt: -99, lastCrimeAt: -99, clearedAt: 0 };
}
export function starsForHeat(heat) {
  let s = 0;
  for (let i = 1; i < WANTED.stars.length; i++) if (heat >= WANTED.stars[i]) s = i;
  return s;
}
export function addHeat(w, kind, now) {
  w.heat = clamp(w.heat + (WANTED.crime[kind] || 10), 0, 520);
  w.stars = starsForHeat(w.heat);
  w.lastCrimeAt = now; w.lastSeenAt = now;
}
export function clearWanted(w, now) {
  w.heat = 0; w.stars = 0; w.clearedAt = now;
}
export function updateWanted(w, seen, now, dt) {
  if (seen) w.lastSeenAt = now;
  if (w.heat > 0 && now - w.lastSeenAt > WANTED.unseenDelay) {
    w.heat = Math.max(0, w.heat - WANTED.decay * dt);
    w.stars = starsForHeat(w.heat);
  }
}
export function wantedLabel(w) {
  if (w.stars === 0) return 'CLEAN';
  if (w.stars <= 2) return 'WANTED';
  if (w.stars <= 3) return 'PURSUIT';
  return 'MANHUNT';
}
