// Круг карты в SVG: знаки, дома, планеты, аспекты; опционально внешний круг (би-карта).
import { SIGNS, P, norm, MAIN } from './astro.js';

const EL_COLOR = { fire: 'var(--fire)', earth: 'var(--earth)', air: 'var(--air)', water: 'var(--water)' };
const ASP_COLOR = { soft: 'var(--soft)', hard: 'var(--hard)', conj: 'var(--conj)' };
const VS = '︎'; // текстовое (не эмодзи) отображение символов

function spread(items, minGap) {
  // раздвигаем близко стоящие планеты по кругу
  const arr = items.map((i) => ({ ...i, d: i.lon })).sort((a, b) => a.lon - b.lon);
  for (let iter = 0; iter < 60; iter++) {
    let moved = false;
    for (let i = 0; i < arr.length; i++) {
      const a = arr[i], b = arr[(i + 1) % arr.length];
      let gap = norm(b.d - a.d);
      if (arr.length > 1 && gap < minGap) { const push = (minGap - gap) / 2; a.d = norm(a.d - push); b.d = norm(b.d + push); moved = true; }
    }
    if (!moved) break;
  }
  return arr;
}

export function chartSVG(chart, { outer = null, aspects = [], outerLabel = '' } = {}) {
  const size = outer ? 700 : 620, c = size / 2;
  const R = outer ? { sOut: 300, sIn: 268, pl: 236, hIn: 150, outPl: 325 } : { sOut: 300, sIn: 266, pl: 232, hIn: 150 };
  const asc = chart.houses.cusps[1];
  const ang = (lon) => (180 + (lon - asc)) * Math.PI / 180;
  const xy = (lon, r) => [c + r * Math.cos(ang(lon)), c - r * Math.sin(ang(lon))];
  let s = `<svg viewBox="0 0 ${size} ${size}" class="wheel" role="img" aria-label="Карта ${chart.label || ''}">`;
  s += `<circle cx="${c}" cy="${c}" r="${R.sOut}" class="ring"/><circle cx="${c}" cy="${c}" r="${R.sIn}" class="ring"/><circle cx="${c}" cy="${c}" r="${R.hIn}" class="ring"/>`;
  if (outer) s += `<circle cx="${c}" cy="${c}" r="${R.outPl + 22}" class="ring faint"/>`;
  // знаки
  for (let i = 0; i < 12; i++) {
    const [x1, y1] = xy(i * 30, R.sIn), [x2, y2] = xy(i * 30, R.sOut);
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="tick"/>`;
    const [tx, ty] = xy(i * 30 + 15, (R.sIn + R.sOut) / 2);
    s += `<text x="${tx}" y="${ty}" class="sign" fill="${EL_COLOR[SIGNS[i].el]}">${SIGNS[i].glyph}${VS}</text>`;
    for (let d = 5; d < 30; d += 5) { const [a1, b1] = xy(i * 30 + d, R.sIn), [a2, b2] = xy(i * 30 + d, R.sIn + (d === 15 ? 8 : 4)); s += `<line x1="${a1}" y1="${b1}" x2="${a2}" y2="${b2}" class="tick faint"/>`; }
  }
  // дома
  for (let h = 1; h <= 12; h++) {
    const cu = chart.houses.cusps[h];
    const angular = [1, 4, 7, 10].includes(h);
    const [x1, y1] = xy(cu, R.hIn), [x2, y2] = xy(cu, R.sIn);
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${angular ? 'cusp axis' : 'cusp'}"/>`;
    const next = chart.houses.cusps[h === 12 ? 1 : h + 1];
    const mid = cu + norm(next - cu) / 2;
    const [tx, ty] = xy(mid, R.hIn + 14);
    s += `<text x="${tx}" y="${ty}" class="hnum">${h}</text>`;
  }
  for (const [lbl, lon] of [['ASC', chart.houses.asc], ['MC', chart.houses.mc]]) {
    const [tx, ty] = xy(lon, R.sOut + 14);
    s += `<text x="${tx}" y="${ty}" class="axislbl">${lbl}</text>`;
  }
  // аспекты
  for (const a of aspects) {
    const pa = (a.from || chart.pos)[a.a], pb = (a.to || chart.pos)[a.b];
    if (!pa || !pb) continue;
    const [x1, y1] = xy(pa.lon, R.hIn - 4), [x2, y2] = xy(pb.lon, R.hIn - 4);
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${ASP_COLOR[a.kind]}" class="asp${a.major ? '' : ' minor'}"><title>${P[a.a]?.name || a.a} ${a.name} ${P[a.b]?.name || a.b}</title></line>`;
  }
  // планеты
  const drawSet = (pos, r, cls) => {
    const ids = [...MAIN, 'node', 'lilith'].filter((id) => pos[id]);
    const items = spread(ids.map((id) => ({ id, lon: pos[id].lon })), 8.5);
    for (const it of items) {
      const [px, py] = xy(it.d, r), [lx1, ly1] = xy(it.lon, cls === 'outer' ? R.sOut : R.sIn), [lx2, ly2] = xy(it.d, cls === 'outer' ? r - 12 : r + 12);
      const deg = Math.floor(norm(it.lon) % 30);
      s += `<line x1="${lx1}" y1="${ly1}" x2="${lx2}" y2="${ly2}" class="pline"/>`;
      s += `<g class="planet ${cls}"><title>${P[it.id].name} ${deg}° ${SIGNS[Math.floor(norm(it.lon) / 30)].gen}${pos[it.id].retro ? ' R' : ''}</title><text x="${px}" y="${py}" class="pglyph">${P[it.id].glyph}${VS}</text>`;
      const [dx, dy] = xy(it.d, cls === 'outer' ? r + 19 : r - 20);
      s += `<text x="${dx}" y="${dy}" class="pdeg">${deg}${pos[it.id].retro ? 'ᴿ' : ''}</text></g>`;
    }
  };
  drawSet(chart.pos, R.pl, 'inner');
  if (outer) drawSet(outer, R.outPl, 'outer');
  if (outerLabel) s += `<text x="10" y="20" class="legend">Внешний круг: ${outerLabel}</text>`;
  s += '</svg>';
  return s;
}
