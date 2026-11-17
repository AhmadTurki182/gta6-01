/* HUD: health/armor, wanted stars, mission banner, speedometer, prompts,
   toasts, pause/death screens. All DOM — the WebGL canvas stays clean. */
import { wantedLabel } from './wanted.js';

export function createHud() {
  const $ = (id) => document.getElementById(id);
  return {
    root: $('hud'), healthFill: $('healthFill'), armorFill: $('armorFill'),
    cash: $('cash'), rep: $('rep'), stars: $('stars'), heatFill: $('heatFill'),
    wantedLabel: $('wantedLabel'), missionTitle: $('missionTitle'),
    missionObj: $('missionObj'), missionTimer: $('missionTimer'),
    speedBox: $('speedBox'), speed: $('speed'), carName: $('carName'),
    carHealthFill: $('carHealthFill'), prompt: $('prompt'), toast: $('toast'),
    crosshair: $('crosshair'), damageFlash: $('damageFlash'),
    centerMsg: $('centerMsg'), startScreen: $('startScreen'),
    pauseMenu: $('pauseMenu'), deadScreen: $('deadScreen'),
    continueBtn: $('continueBtn'), continueInfo: $('continueInfo'),
    pauseInfo: $('pauseInfo'), deadText: $('deadText'),
  };
}
export function updateHud(h, game, now) {
  const p = game.player, w = game.wanted, m = game.missions;
  h.healthFill.style.width = `${p.health}%`;
  h.armorFill.style.width = `${p.armor}%`;
  h.cash.textContent = String(game.money);
  h.rep.textContent = String(game.rep);
  let starsHtml = '';
  for (let i = 0; i < 5; i++) starsHtml += `<span class="${i < w.stars ? 'star on' : 'star'}">★</span>`;
  h.stars.innerHTML = starsHtml;
  h.heatFill.style.width = `${(w.heat / 520) * 100}%`;
  h.wantedLabel.textContent = wantedLabel(w);
  h.wantedLabel.className = w.stars > 0 ? 'hot' : '';
  // Mission text comes from the missions module via game.missionText().
  const mt = game.missionText();
  h.missionTitle.textContent = mt.title;
  h.missionObj.textContent = mt.objective;
  h.missionTimer.textContent = mt.timer || '';
  // Banner: big centre message for a few seconds after an event.
  if (now - m.bannerAt < 4) {
    h.centerMsg.textContent = m.banner;
    h.centerMsg.classList.remove('hidden');
  } else h.centerMsg.classList.add('hidden');
  if (now - m.toastAt < 6) {
    h.toast.textContent = m.toast;
    h.toast.style.opacity = '1';
  } else h.toast.style.opacity = '0';
  // Speedometer when driving.
  if (p.inCar) {
    h.speedBox.classList.remove('hidden');
    h.speed.textContent = String(Math.round(Math.abs(p.inCar.speed) * 3.6));
    h.carName.textContent = p.inCar.def.name;
    h.carHealthFill.style.width = `${p.inCar.health}%`;
    h.crosshair.classList.add('hidden');
  } else {
    h.speedBox.classList.add('hidden');
    h.crosshair.classList.remove('hidden');
  }
  // Damage flash.
  const sinceHit = now - p.lastDamageAt;
  h.damageFlash.style.opacity = sinceHit < 0.35 ? String(0.5 - sinceHit) : '0';
  // Prompt line (set by main.js each frame).
  h.prompt.textContent = game.promptText || '';
}
export function showStart(h, save) {
  h.startScreen.classList.remove('hidden');
  h.root.classList.add('hidden');
  if (save) {
    h.continueBtn.classList.remove('hidden');
    h.continueInfo.textContent = `MISSION ${Math.min(save.missionIndex + 1, 3)}/3 · $${save.money}`;
  } else h.continueBtn.classList.add('hidden');
}
export function showGame(h) {
  h.startScreen.classList.add('hidden');
  h.pauseMenu.classList.add('hidden');
  h.deadScreen.classList.add('hidden');
  h.root.classList.remove('hidden');
}
export function showPause(h, info) {
  h.pauseMenu.classList.remove('hidden');
  h.pauseInfo.textContent = info;
}
export function hidePause(h) { h.pauseMenu.classList.add('hidden'); }
export function showDead(h, text) {
  h.deadScreen.classList.remove('hidden');
  h.deadText.textContent = text;
}
