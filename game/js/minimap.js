/* Minimap: 2D canvas drawn from the road graph — roads, sea, player arrow,
   mission marker, police dots, nearby cars. North is up. */
import { missionMarker } from './missions.js';

export function createMinimap() {
  return document.getElementById('minimap');
}
export function drawMinimap(canvas, game) {
  const g = canvas.getContext('2d');
  const S = canvas.width, half = game.city.half;
  const toMap = (x, z) => [(x / half) * 0.5 + 0.5, (z / half) * 0.5 + 0.5].map((v) => v * S);
  g.clearRect(0, 0, S, S);
  // Sea + land.
  g.fillStyle = '#1e7fa8'; g.fillRect(0, 0, S, S);
  g.fillStyle = '#c9b285'; g.fillRect(0, 0, S, S);
  // Blocks.
  g.fillStyle = '#a89a7c';
  const lines = game.city.lines;
  for (let i = 0; i < lines.length - 1; i++) {
    for (let j = 0; j < lines.length - 1; j++) {
      const [x0, y0] = toMap(lines[i] + 7, lines[j] + 7);
      const [x1, y1] = toMap(lines[i + 1] - 7, lines[j + 1] - 7);
      g.fillRect(x0, y0, x1 - x0, y1 - y0);
    }
  }
  // Roads.
  g.strokeStyle = '#2e3138'; g.lineWidth = 5;
  for (const l of lines) {
    const [ax, ay] = toMap(-half, l), [bx, by] = toMap(half, l);
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    const [cx, cy] = toMap(l, -half), [dx, dy] = toMap(l, half);
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(dx, dy); g.stroke();
  }
  // Meridian Tower + places.
  g.fillStyle = '#ff4d6d';
  const [tx, ty] = toMap(111, 111); g.fillRect(tx - 3, ty - 3, 6, 6);
  // Mission marker (pulsing yellow diamond).
  const marker = missionMarker(game.missions);
  if (marker) {
    const [mx, my] = toMap(marker.x, marker.z);
    const pulse = 6 + Math.sin(game.time * 5) * 2;
    g.fillStyle = '#ffd23f';
    g.beginPath(); g.moveTo(mx, my - pulse); g.lineTo(mx + pulse, my); g.lineTo(mx, my + pulse); g.lineTo(mx - pulse, my); g.closePath(); g.fill();
    g.strokeStyle = '#111'; g.lineWidth = 2; g.stroke();
  }
  // Police dots (red) and traffic (white).
  g.fillStyle = '#ff2222';
  for (const c of game.police.cruisers) {
    const [cx, cy] = toMap(c.x, c.z);
    g.beginPath(); g.arc(cx, cy, 3, 0, 7); g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (const c of game.traffic.cars) {
    const [cx, cy] = toMap(c.x, c.z);
    g.fillRect(cx - 1.5, cy - 1.5, 3, 3);
  }
  // Player arrow (green, rotated to heading).
  const px = game.player.inCar ? game.player.inCar.x : game.player.x;
  const pz = game.player.inCar ? game.player.inCar.z : game.player.z;
  const heading = game.player.inCar ? game.player.inCar.heading : game.player.heading;
  const [hx, hy] = toMap(px, pz);
  g.save();
  g.translate(hx, hy);
  // Heading 0 = +z = down on the map; the arrow is drawn pointing up.
  g.rotate(Math.PI - heading);
  g.fillStyle = '#2f9e44';
  g.beginPath(); g.moveTo(0, -8); g.lineTo(5, 6); g.lineTo(-5, 6); g.closePath(); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
  g.restore();
  // Border.
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
  g.strokeRect(1, 1, S - 2, S - 2);
}
