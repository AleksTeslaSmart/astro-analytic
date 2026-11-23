// Аналитика карты по методике авестийской школы (П. Глоба):
// достоинства, ядро космограммы (Ян/Инь/Дэн), кармический статус,
// управители домов, конфигурации аспектов, сила планет.
import { SIGNS, P, MAIN, DIGN, RULERS, houseOf, signOf, angDist, norm, aspectsBetween } from './astro.js';

export const EL_NAME = { fire: 'Огонь', earth: 'Земля', air: 'Воздух', water: 'Вода' };
export const CROSS_NAME = { card: 'кардинальный', fix: 'фиксированный', mut: 'мутабельный (подвижный)' };
export const ZONE_NAME = { 1: '1-я зона (Овен–Рак) — творение, Брама', 2: '2-я зона (Лев–Скорпион) — равновесие, Вишну', 3: '3-я зона (Стрелец–Рыбы) — преображение, Шива' };
export const QUAD_NAME = { 1: '1-й квадрант (Овен–Близнецы) — «детство», Огонь', 2: '2-й квадрант (Рак–Дева) — «юность», Вода', 3: '3-й квадрант (Весы–Стрелец) — «зрелость», Воздух', 4: '4-й квадрант (Козерог–Рыбы) — «старость», Земля' };
const EL_PRINCIPLE = { fire: 'yan', air: 'yan', earth: 'yin', water: 'yin' };
const CROSS_PRINCIPLE = { card: 'yan', fix: 'yin', mut: 'den' };
const ZONE_PRINCIPLE = { 1: 'yan', 2: 'yin', 3: 'den' };
const QUAD_EL = { 1: 'fire', 2: 'water', 3: 'air', 4: 'earth' };
export const PRINC_NAME = { yan: 'Ян', yin: 'Инь', den: 'Дэн' };
// Связь планет с началами (зоны по Глобе)
const PLANET_PRINCIPLE = { sun: 'yan', mars: 'yan', jupiter: 'yan', pluto: 'yan', moon: 'yin', venus: 'yin', saturn: 'yin', neptune: 'yin', mercury: 'den', uranus: 'den' };

const zoneOf = (s) => (s < 4 ? 1 : s < 8 ? 2 : 3);
const quadOf = (s) => Math.floor(s / 3) + 1;

// Достоинство планеты в знаке
export function dignity(id, sign, isDay = true) {
  const d = DIGN[id];
  if (!d) return { key: 'none', label: '', score: 0 };
  if (id === 'mercury' && sign === 5) return { key: 'dom+exalt', label: 'обитель и экзальтация', score: 4 };
  if (id === 'mercury' && sign === 11) return { key: 'exile+fall', label: 'изгнание и падение', score: -4 };
  if (d.dom.includes(sign)) {
    // дневная обитель — знаки Лев…Козерог, ночная — Водолей…Рак
    const dayHouse = sign >= 4 && sign <= 9;
    const tone = d.dom.length > 1 ? (dayHouse ? ' (дневная)' : ' (ночная)') : '';
    const fits = d.dom.length > 1 && dayHouse !== isDay ? ', но рождение ' + (isDay ? 'дневное' : 'ночное') + ' — обитель звучит слабее' : '';
    return { key: 'dom', label: 'обитель' + tone + fits, score: 3 };
  }
  if (d.exalt === sign) return { key: 'exalt', label: 'экзальтация', score: 3 };
  if (d.exile.includes(sign)) return { key: 'exile', label: 'изгнание', score: -3 };
  if (d.fall === sign) return { key: 'fall', label: 'падение', score: -3 };
  return { key: 'none', label: '', score: 0 };
}

function dominance(scores) {
  // выделенная = максимальная, если превышает следующую в 1.5 раза (критерий Глобы)
  const arr = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [top, second] = arr;
  const weakest = arr[arr.length - 1][0];
  const dominant = second && top[1] >= second[1] * 1.5 && top[1] > 0 ? top[0] : (top[1] > 0 && (!second || second[1] === 0) ? top[0] : null);
  return { dominant, weakest, sorted: arr };
}

// Ядро космограммы
export function core(chart) {
  const el = { fire: 0, earth: 0, air: 0, water: 0 }, cr = { card: 0, fix: 0, mut: 0 };
  const zn = { 1: 0, 2: 0, 3: 0 }, qd = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const hemiNS = { upper: 0, lower: 0 }, hemiEW = { east: 0, west: 0 };
  const items = [...MAIN.map((id) => ({ id, w: P[id].w })), { id: 'asc', w: 2 }, { id: 'mc', w: 2 }];
  for (const { id, w } of items) {
    const p = chart.pos[id], s = p.sign;
    el[SIGNS[s].el] += w; cr[SIGNS[s].cross] += w; zn[zoneOf(s)] += w; qd[quadOf(s)] += w;
    if (id !== 'asc' && id !== 'mc') {
      if (p.house >= 7) hemiNS.upper += w; else hemiNS.lower += w;
      if (p.house >= 10 || p.house <= 3) hemiEW.east += w; else hemiEW.west += w;
    }
  }
  const dEl = dominance(el), dCr = dominance(cr), dZn = dominance(zn), dQd = dominance(qd);
  const dNS = dominance(hemiNS), dEW = dominance(hemiEW);
  // начала по уровням
  const yanEl = el.fire + el.air, yinEl = el.earth + el.water;
  const princ = (a, b) => (a >= b * 1.5 ? 'yan' : b >= a * 1.5 ? 'yin' : 'den');
  const levels = {
    element: princ(yanEl, yinEl),
    cross: dCr.dominant ? CROSS_PRINCIPLE[dCr.dominant] : 'den',
    zone: dZn.dominant ? ZONE_PRINCIPLE[dZn.dominant] : 'den',
    quadrant: dQd.dominant ? EL_PRINCIPLE[QUAD_EL[dQd.dominant]] : 'den',
    hemisphere: (() => {
      const yan = hemiNS.upper + hemiEW.east, yin = hemiNS.lower + hemiEW.west;
      return princ(yan, yin);
    })(),
  };
  const count = { yan: 0, yin: 0, den: 0 };
  Object.values(levels).forEach((v) => count[v]++);
  const main3 = [levels.zone, levels.element, levels.cross];
  const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  let integrity;
  if (best[1] >= 4) integrity = 'цельное';
  else if (main3.every((v) => v === main3[0]) || best[1] >= 3) integrity = 'относительно цельное';
  else integrity = 'расколотое или несформированное';
  const corePrinciple = best[1] >= 3 ? best[0] : null;
  return { el, cr, zn, qd, hemiNS, hemiEW, dEl, dCr, dZn, dQd, dNS, dEW, levels, count, integrity, corePrinciple };
}

// Кармический статус планет (упрощённая реализация 12 пунктов Глобы, без фиктивных планет)
export function karmicStatus(chart, c = core(chart)) {
  const res = {};
  for (const id of MAIN) {
    const p = chart.pos[id], s = p.sign, items = [];
    const dg = dignity(id, s, chart.day);
    if (dg.score) items.push([dg.label, dg.score]);
    const elOf = SIGNS[s].el;
    if (c.dEl.dominant) { if (elOf === c.dEl.dominant) items.push(['в выделенной стихии', 2]); else if (elOf === c.dEl.weakest) items.push(['в слабой стихии', -2]); }
    if (c.dCr.dominant) { if (SIGNS[s].cross === c.dCr.dominant) items.push(['в выделенном кресте', 2]); else if (SIGNS[s].cross === c.dCr.weakest) items.push(['в слабом кресте', -2]); }
    if (c.dZn.dominant) { if (zoneOf(s) == c.dZn.dominant) items.push(['в выделенной зоне', 1]); else if (zoneOf(s) == c.dZn.weakest) items.push(['в слабой зоне', -1]); }
    if (c.dQd.dominant) { if (quadOf(s) == c.dQd.dominant) items.push(['в выделенном квадранте', 1]); else if (quadOf(s) == c.dQd.weakest) items.push(['в слабом квадранте', -1]); }
    if (c.dNS.dominant) { const hs = p.house >= 7 ? 'upper' : 'lower'; items.push([hs === c.dNS.dominant ? 'в выделенной полусфере (верх/низ)' : 'в слабой полусфере (верх/низ)', hs === c.dNS.dominant ? 1 : -1]); }
    if (c.dEW.dominant) { const hs = p.house >= 10 || p.house <= 3 ? 'east' : 'west'; items.push([hs === c.dEW.dominant ? 'в выделенной полусфере (восток/запад)' : 'в слабой полусфере (восток/запад)', hs === c.dEW.dominant ? 1 : -1]); }
    if (c.corePrinciple) {
      const pp = PLANET_PRINCIPLE[id];
      if (pp === c.corePrinciple) items.push(['связана с доминирующим началом ядра', 1]);
    }
    const total = items.reduce((a, b) => a + b[1], 0);
    const allSame = items.length > 0 && (items.every((i) => i[1] > 0) || items.every((i) => i[1] < 0));
    res[id] = { items, total, royal: Math.abs(total) >= 7, absolute: allSame };
  }
  return res;
}

// Управители (альмутены) домов
export function houseRulers(chart) {
  const out = [];
  for (let h = 1; h <= 12; h++) {
    const s = signOf(chart.houses.cusps[h]);
    const rulers = RULERS[s].map((id) => ({ id, house: chart.pos[id].house, sign: chart.pos[id].sign }));
    out.push({ house: h, sign: s, rulers });
  }
  return out;
}

// Цепочка диспозиторов и финальный управитель
export function dispositors(chart) {
  const disp = {};
  for (const id of MAIN) disp[id] = RULERS[chart.pos[id].sign][0];
  const finals = MAIN.filter((id) => disp[id] === id);
  return { disp, finals };
}

// Сила планет (для выбора «владыки гороскопа»)
export function planetStrength(chart, aspects, ks) {
  const angular = { 1: 4, 10: 4, 7: 3, 4: 3, 11: 1, 5: 1, 2: 0.5, 8: 0.5, 9: 0.5, 3: 0, 6: -0.5, 12: -1 };
  const res = {};
  for (const id of MAIN) {
    const p = chart.pos[id];
    let s = (ks[id]?.total || 0) + angular[p.house];
    if (angDist(p.lon, chart.houses.asc) < 5 || angDist(p.lon, chart.houses.mc) < 5) s += 4;
    const asps = aspects.filter((a) => a.a === id || a.b === id);
    s += asps.length * 0.5;
    if (asps.some((a) => a.id === 'conj' && (a.a === 'sun' || a.b === 'sun') && id !== 'sun' && a.diff < 8)) s -= 2; // сожжение
    if (RULERS[signOf(chart.houses.asc)].includes(id)) s += 3;
    if (id === 'sun' || id === 'moon') s += 2;
    if (p.retro) s -= 1;
    res[id] = Math.round(s * 10) / 10;
  }
  return res;
}

// Конфигурации аспектов
export function configurations(chart, aspects) {
  const has = (a, b, ids) => aspects.find((x) => ((x.a === a && x.b === b) || (x.a === b && x.b === a)) && ids.includes(x.id));
  const ids = [...MAIN, 'asc', 'mc'];
  const res = [];
  const seen = new Set();
  const key = (arr, t) => t + ':' + [...arr].sort().join(',');
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) for (let k = j + 1; k < ids.length; k++) {
    const [a, b, c] = [ids[i], ids[j], ids[k]];
    const tri = [[a, b], [b, c], [a, c]];
    if (tri.every(([x, y]) => has(x, y, ['trine']))) { const kk = key([a, b, c], 'gt'); if (!seen.has(kk)) { seen.add(kk); res.push({ type: 'Большой трин', ids: [a, b, c], el: SIGNS[chart.pos[a].sign].el }); } }
    // Тау-квадрат: одна оппозиция + два квадрата к вершине
    for (const [x, y, z] of [[a, b, c], [a, c, b], [b, c, a]]) {
      if (has(x, y, ['opp']) && has(x, z, ['square']) && has(y, z, ['square'])) { const kk = key([x, y, z], 'tsq'); if (!seen.has(kk)) { seen.add(kk); res.push({ type: 'Тау-квадрат', ids: [x, y, z], apex: z }); } }
      if (has(x, y, ['sextile']) && has(x, z, ['quinc']) && has(y, z, ['quinc'])) { const kk = key([x, y, z], 'yod'); if (!seen.has(kk)) { seen.add(kk); res.push({ type: 'Йод («перст судьбы»)', ids: [x, y, z], apex: z }); } }
      if (has(x, y, ['opp']) && has(x, z, ['trine', 'sextile']) && has(y, z, ['trine', 'sextile'])) { const kk = key([x, y, z], 'kite'); if (!seen.has(kk)) { seen.add(kk); res.push({ type: 'Малое управление (оппозиция, разрешённая трином и секстилем)', ids: [x, y, z], apex: z }); } }
      if (has(x, y, ['sextile']) && has(x, z, ['sextile']) && has(y, z, ['trine'])) { const kk = key([x, y, z], 'mt'); if (!seen.has(kk)) { seen.add(kk); res.push({ type: 'Малый трин', ids: [x, y, z], apex: x }); } }
    }
  }
  // Большой крест
  for (const t of res.filter((r) => r.type === 'Тау-квадрат')) {
    const [x, y, z] = t.ids;
    for (const w of ids) if (![x, y, z].includes(w) && has(z, w, ['opp']) && has(x, w, ['square']) && has(y, w, ['square'])) {
      const kk = key([x, y, z, w], 'gc'); if (!seen.has(kk)) { seen.add(kk); res.push({ type: 'Большой крест', ids: [x, y, z, w] }); }
    }
  }
  // Стеллиумы (3+ планет в знаке или доме)
  const bySign = {}, byHouse = {};
  for (const id of MAIN) { (bySign[chart.pos[id].sign] ||= []).push(id); (byHouse[chart.pos[id].house] ||= []).push(id); }
  for (const [s, arr] of Object.entries(bySign)) if (arr.length >= 3) res.push({ type: `Стеллиум в знаке ${SIGNS[s].gen}`, ids: arr, sign: +s });
  for (const [h, arr] of Object.entries(byHouse)) if (arr.length >= 3) res.push({ type: `Стеллиум в ${h}-м доме`, ids: arr, house: +h });
  return res;
}

// Тип космограммы по распределению планет (по Глобе — виды космограмм)
export function chartShape(chart) {
  const lons = MAIN.map((id) => chart.pos[id].lon).sort((a, b) => a - b);
  const gaps = lons.map((l, i) => norm((lons[(i + 1) % lons.length]) - l));
  const maxGap = Math.max(...gaps);
  const span = 360 - maxGap;
  const occupied = new Set(MAIN.map((id) => chart.pos[id].sign)).size;
  if (span <= 120) return { name: 'Гроздь (связка)', text: 'Все планеты собраны в пределах 120°. Интересы сфокусированы на узком круге задач; сильная концентрация, но и односторонность — «специалист», который глубоко проходит свою тему.' };
  if (span <= 180) return { name: 'Чаша', text: 'Планеты занимают половину круга. Человек ощущает в себе содержимое, которое нужно отдать миру; пустая половина показывает область, куда направлено стремление и где нужен опыт.' };
  const sorted = [...gaps].sort((a, b) => b - a);
  if (sorted[0] >= 60 && sorted[1] >= 60) return { name: 'Качели', text: 'Две группы планет напротив друг друга. Жизнь строится как поиск равновесия между двумя полюсами; характерны колебания, выбор между альтернативами, умение видеть обе стороны.' };
  if (maxGap >= 120 && span <= 240) return { name: 'Локомотив', text: 'Планеты занимают около двух третей круга. Сильная движущая энергия, целеустремлённость; ведущая планета на краю группы (по ходу часовой стрелки) показывает, чем человек «тянет» себя вперёд.' };
  if (occupied >= 9) return { name: 'Разбросанный (брызги)', text: 'Планеты рассыпаны по всему Зодиаку. Широта интересов, разносторонность, способность ко многому; задача — не распылиться и собрать себя вокруг главного.' };
  return { name: 'Смешанный / «ведро»', text: 'Распределение без ярко выраженной формы. Важнее смотреть на ядро космограммы, сильные планеты и конфигурации аспектов.' };
}

// Повторяющиеся темы (для комплексного анализа): подсчёт активации домов и планет
export function themeCounter() {
  const houses = {}, planets = {}, notes = [];
  return {
    house(h, w, why) { if (!h) return; houses[h] = (houses[h] || 0) + w; notes.push({ kind: 'house', h, w, why }); },
    planet(id, w, why) { if (!P[id]) return; planets[id] = (planets[id] || 0) + w; notes.push({ kind: 'planet', id, w, why }); },
    result() {
      const hs = Object.entries(houses).sort((a, b) => b[1] - a[1]);
      const ps = Object.entries(planets).sort((a, b) => b[1] - a[1]);
      return { houses: hs, planets: ps, notes };
    },
  };
}

export function fullNatalAnalysis(chart) {
  const aspects = aspectsBetween(chart.pos, chart.pos, [...MAIN, 'node', 'lilith', 'asc', 'mc'], [...MAIN, 'node', 'lilith', 'asc', 'mc'], { minor: true })
    .filter((a) => !((a.a === 'asc' && a.b === 'mc') || (a.a === 'mc' && a.b === 'asc')))
    .filter((a) => a.major || (MAIN.includes(a.a) && MAIN.includes(a.b)))
    .filter((a) => !(['node', 'lilith'].includes(a.a) || ['node', 'lilith'].includes(a.b)) || (a.major && a.diff <= 3));
  const c = core(chart);
  const ks = karmicStatus(chart, c);
  const rulers = houseRulers(chart);
  const disp = dispositors(chart);
  const strength = planetStrength(chart, aspects.filter((a) => a.major), ks);
  const configs = configurations(chart, aspects);
  const shape = chartShape(chart);
  const ranked = Object.entries(strength).sort((a, b) => b[1] - a[1]);
  return { aspects, core: c, ks, rulers, disp, strength, ranked, configs, shape, lord: ranked[0][0] };
}
