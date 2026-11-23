// Астрономическое ядро: положения планет, дома Плацидуса, аспекты,
// соляр, вторичные прогрессии, транзиты. Тропический зодиак.
// Использует astronomy-engine (глобальный объект Astronomy).

const A = globalThis.Astronomy;

export const D2R = Math.PI / 180, R2D = 180 / Math.PI;
export const norm = (x) => ((x % 360) + 360) % 360;
const sind = (x) => Math.sin(x * D2R), cosd = (x) => Math.cos(x * D2R), tand = (x) => Math.tan(x * D2R);
const atan2d = (y, x) => Math.atan2(y, x) * R2D;

// ---------- Справочные данные ----------
export const SIGNS = [
  { id: 0, name: 'Овен', gen: 'Овна', loc: 'Овне', glyph: '♈', el: 'fire', cross: 'card' },
  { id: 1, name: 'Телец', gen: 'Тельца', loc: 'Тельце', glyph: '♉', el: 'earth', cross: 'fix' },
  { id: 2, name: 'Близнецы', gen: 'Близнецов', loc: 'Близнецах', glyph: '♊', el: 'air', cross: 'mut' },
  { id: 3, name: 'Рак', gen: 'Рака', loc: 'Раке', glyph: '♋', el: 'water', cross: 'card' },
  { id: 4, name: 'Лев', gen: 'Льва', loc: 'Льве', glyph: '♌', el: 'fire', cross: 'fix' },
  { id: 5, name: 'Дева', gen: 'Девы', loc: 'Деве', glyph: '♍', el: 'earth', cross: 'mut' },
  { id: 6, name: 'Весы', gen: 'Весов', loc: 'Весах', glyph: '♎', el: 'air', cross: 'card' },
  { id: 7, name: 'Скорпион', gen: 'Скорпиона', loc: 'Скорпионе', glyph: '♏', el: 'water', cross: 'fix' },
  { id: 8, name: 'Стрелец', gen: 'Стрельца', loc: 'Стрельце', glyph: '♐', el: 'fire', cross: 'mut' },
  { id: 9, name: 'Козерог', gen: 'Козерога', loc: 'Козероге', glyph: '♑', el: 'earth', cross: 'card' },
  { id: 10, name: 'Водолей', gen: 'Водолея', loc: 'Водолее', glyph: '♒', el: 'air', cross: 'fix' },
  { id: 11, name: 'Рыбы', gen: 'Рыб', loc: 'Рыбах', glyph: '♓', el: 'water', cross: 'mut' },
];

export const PLANETS = [
  { id: 'sun', name: 'Солнце', gen: 'Солнца', glyph: '☉', body: 'Sun', w: 3 },
  { id: 'moon', name: 'Луна', gen: 'Луны', glyph: '☽', body: 'Moon', w: 3 },
  { id: 'mercury', name: 'Меркурий', gen: 'Меркурия', glyph: '☿', body: 'Mercury', w: 2 },
  { id: 'venus', name: 'Венера', gen: 'Венеры', glyph: '♀', body: 'Venus', w: 2 },
  { id: 'mars', name: 'Марс', gen: 'Марса', glyph: '♂', body: 'Mars', w: 2 },
  { id: 'jupiter', name: 'Юпитер', gen: 'Юпитера', glyph: '♃', body: 'Jupiter', w: 1.5 },
  { id: 'saturn', name: 'Сатурн', gen: 'Сатурна', glyph: '♄', body: 'Saturn', w: 1.5 },
  { id: 'uranus', name: 'Уран', gen: 'Урана', glyph: '♅', body: 'Uranus', w: 1 },
  { id: 'neptune', name: 'Нептун', gen: 'Нептуна', glyph: '♆', body: 'Neptune', w: 1 },
  { id: 'pluto', name: 'Плутон', gen: 'Плутона', glyph: '♇', body: 'Pluto', w: 1 },
  { id: 'node', name: 'Раху (Сев. узел)', gen: 'Раху', glyph: '☊', w: 0 },
  { id: 'ketu', name: 'Кету (Юж. узел)', gen: 'Кету', glyph: '☋', w: 0 },
  { id: 'lilith', name: 'Лилит (Чёрная Луна)', gen: 'Лилит', glyph: '⚸', w: 0 },
  { id: 'selena', name: 'Селена (Белая Луна)', gen: 'Селены', glyph: '○', w: 0 },
];
export const FICT = ['node', 'ketu', 'lilith', 'selena'];
// Экзальтации фиктивных точек по Глобе
export const FICT_EXALT = { node: { exalt: [2], fall: [8] }, ketu: { exalt: [8], fall: [2] }, lilith: { exalt: [7, 9, 11], fall: [] }, selena: { exalt: [5, 3, 1], fall: [] } };
export const P = Object.fromEntries(PLANETS.map((p) => [p.id, p]));
export const MAIN = PLANETS.filter((p) => p.w > 0).map((p) => p.id);

// Достоинства по П. Глобе («Анализ и синтез космограмм»):
// дневные/ночные обители, экзальтации, изгнания и падения.
export const DIGN = {
  sun: { dom: [4], exalt: 0, exile: [10], fall: 6 },
  moon: { dom: [3], exalt: 1, exile: [9], fall: 7 },
  mercury: { dom: [5, 2], exalt: 5, exile: [11, 8], fall: 11 },
  venus: { dom: [6, 1], exalt: 11, exile: [0, 7], fall: 5 },
  mars: { dom: [7, 0], exalt: 9, exile: [1, 6], fall: 3 },
  jupiter: { dom: [8, 11], exalt: 3, exile: [2, 5], fall: 9 },
  saturn: { dom: [9, 10], exalt: 11, exile: [3, 4], fall: 0 },
  uranus: { dom: [10], exalt: 7, exile: [4], fall: 1 },
  neptune: { dom: [11], exalt: 10, exile: [5], fall: 4 },
  pluto: { dom: [7], exalt: 4, exile: [1], fall: 10 },
  node: { dom: [], exalt: 2, exile: [], fall: 8 },
  lilith: { dom: [], exalt: null, exile: [], fall: null },
};
// Управители знаков (септенер: дневная/ночная обитель; плюс высшие планеты)
export const RULERS = {
  0: ['mars'], 1: ['venus'], 2: ['mercury'], 3: ['moon'], 4: ['sun'], 5: ['mercury'],
  6: ['venus'], 7: ['mars', 'pluto'], 8: ['jupiter'], 9: ['saturn'], 10: ['saturn', 'uranus'], 11: ['jupiter', 'neptune'],
};

export const ASPECTS = [
  { angle: 0, id: 'conj', name: 'соединение', glyph: '☌', orb: 8, kind: 'conj', major: true },
  { angle: 180, id: 'opp', name: 'оппозиция', glyph: '☍', orb: 8, kind: 'hard', major: true },
  { angle: 120, id: 'trine', name: 'трин', glyph: '△', orb: 7, kind: 'soft', major: true },
  { angle: 90, id: 'square', name: 'квадрат', glyph: '□', orb: 7, kind: 'hard', major: true },
  { angle: 60, id: 'sextile', name: 'секстиль', glyph: '⚹', orb: 5, kind: 'soft', major: true },
  { angle: 150, id: 'quinc', name: 'квинконс', glyph: '⚻', orb: 2.5, kind: 'hard', major: false },
  { angle: 30, id: 'semisext', name: 'полусекстиль', glyph: '⚺', orb: 2, kind: 'soft', major: false },
  { angle: 45, id: 'semisq', name: 'полуквадрат', glyph: '∠', orb: 2, kind: 'hard', major: false },
  { angle: 135, id: 'sesqui', name: 'полутораквадрат', glyph: '⚼', orb: 2, kind: 'hard', major: false },
  { angle: 72, id: 'quint', name: 'квинтиль', glyph: 'Q', orb: 2, kind: 'soft', major: false },
  { angle: 144, id: 'biquint', name: 'биквинтиль', glyph: 'bQ', orb: 1.5, kind: 'soft', major: false },
];

// ---------- Форматирование ----------
export function signOf(lon) { return Math.floor(norm(lon) / 30); }
export function fmtDeg(lon, withSign = true) {
  const l = norm(lon), s = signOf(l), d = l - s * 30;
  let deg = Math.floor(d), min = Math.round((d - deg) * 60);
  if (min === 60) { deg += 1; min = 0; }
  return `${deg}°${String(min).padStart(2, '0')}′` + (withSign ? ` ${SIGNS[s].name}` : '');
}
export function angDist(a, b) { const d = Math.abs(norm(a) - norm(b)); return d > 180 ? 360 - d : d; }

// ---------- Время и часовые пояса ----------
// Смещение часового пояса (мин) для заданного локального времени в IANA-зоне — с историей правил (Intl).
export function tzOffsetMinutes(tz, utcMs) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const p = Object.fromEntries(f.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUtc - utcMs) / 60000);
}
// Локальная дата/время + зона (или фикс. смещение в часах) → Date (UTC)
export function localToUtc({ y, m, d, hh, mm }, tz, fixedOffsetH) {
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  if (fixedOffsetH !== undefined && fixedOffsetH !== null && fixedOffsetH !== '') return new Date(naive - fixedOffsetH * 3600000);
  let guess = naive - tzOffsetMinutes(tz, naive) * 60000;
  guess = naive - tzOffsetMinutes(tz, guess) * 60000;
  return new Date(guess);
}
export function utcToLocalString(date, tz) {
  try {
    return new Intl.DateTimeFormat('ru-RU', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
  } catch { return date.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'; }
}

// ---------- Положения ----------
function julianCenturies(t) { return t.tt / 36525; }

function bodyLon(body, t) {
  if (body === 'Sun') return A.SunPosition(t).elon;
  if (body === 'Moon') return A.EclipticGeoMoon(t).lon;
  return A.Ecliptic(A.GeoVector(A.Body[body], t, true)).elon;
}
function meanNode(t) {
  const T = julianCenturies(t);
  return norm(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T + T * T * T / 467441 - T ** 4 / 60616000);
}
function meanLilith(t) {
  const T = julianCenturies(t);
  return norm(83.3532465 + 4069.0137287 * T - 0.01032 * T * T - T ** 3 / 80053 + T ** 4 / 18999000 + 180);
}
// Селена (Белая Луна) авестийской школы: равномерный цикл ровно 7 тропических лет.
// Привязка: вход в 0° Весов 12.10.2026 10:04 UTC (выход в Скорпион 13.05.2027 — сходится).
const SELENA_EPOCH_MS = Date.UTC(2026, 9, 12, 10, 4), SELENA_PERIOD_DAYS = 7 * 365.2422;
function selena(t) { return norm(180 + 360 * ((t.date.getTime() - SELENA_EPOCH_MS) / 86400000) / SELENA_PERIOD_DAYS); }
export function lonOf(id, t) {
  if (id === 'node') return meanNode(t);
  if (id === 'ketu') return norm(meanNode(t) + 180);
  if (id === 'lilith') return meanLilith(t);
  if (id === 'selena') return selena(t);
  return norm(bodyLon(P[id].body, t));
}

export function planetPositions(date) {
  const t = A.MakeTime(date);
  const res = {};
  for (const p of PLANETS) {
    const lon = lonOf(p.id, t);
    const l1 = lonOf(p.id, t.AddDays(-0.5)), l2 = lonOf(p.id, t.AddDays(0.5));
    let speed = norm(l2 - l1 + 180) - 180;
    res[p.id] = { id: p.id, lon, speed, retro: speed < 0 && !FICT.includes(p.id), sign: signOf(lon) };
  }
  return res;
}

// ---------- Дома Плацидуса ----------
export function houses(date, lat, lon, system = 'placidus') {
  const t = A.MakeTime(date);
  const eps = A.e_tilt(t).tobl;
  const ramc = norm(A.SiderealTime(t) * 15 + lon);
  return housesFromRAMC(ramc, eps, lat, system);
}

export function housesFromRAMC(ramc, eps, lat, system = 'placidus') {
  const mc = norm(atan2d(sind(ramc), cosd(ramc) * cosd(eps)));
  let asc = norm(atan2d(cosd(ramc), -(sind(ramc) * cosd(eps) + tand(lat) * sind(eps))));
  // ASC должен лежать в восточной половине относительно MC
  if (angDist(asc, mc + 90) > 90) asc = norm(asc + 180);
  const cusps = new Array(13);
  cusps[1] = asc; cusps[10] = mc; cusps[7] = norm(asc + 180); cusps[4] = norm(mc + 180);
  const raToLon = (ra) => norm(atan2d(sind(ra), cosd(ra) * cosd(eps)));
  let used = system;
  if (system === 'placidus' && Math.abs(lat) < 66) {
    const cusp = (f, above) => {
      let R = norm(ramc + (above ? f * 90 : 180 - f * 90));
      for (let i = 0; i < 60; i++) {
        const l = raToLon(R);
        const dec = Math.asin(sind(eps) * sind(l)) * R2D;
        const x = tand(lat) * tand(dec);
        if (Math.abs(x) >= 1) return null;
        const ad = Math.asin(x) * R2D;
        const Rn = above ? norm(ramc + f * (90 + ad)) : norm(ramc + 180 - f * (90 - ad));
        if (angDist(Rn, R) < 1e-7) { R = Rn; break; }
        R = Rn;
      }
      return raToLon(R);
    };
    const c11 = cusp(1 / 3, true), c12 = cusp(2 / 3, true), c2 = cusp(2 / 3, false), c3 = cusp(1 / 3, false);
    if ([c11, c12, c2, c3].some((v) => v === null)) used = 'porphyry';
    else { cusps[11] = c11; cusps[12] = c12; cusps[2] = c2; cusps[3] = c3; }
  } else used = 'porphyry';
  if (used === 'porphyry') {
    const q1 = norm(cusps[4] - asc), q2 = norm(cusps[7] - cusps[4]);
    cusps[2] = norm(asc + q1 / 3); cusps[3] = norm(asc + 2 * q1 / 3);
    cusps[5] = norm(cusps[4] + q2 / 3); cusps[6] = norm(cusps[4] + 2 * q2 / 3);
    cusps[11] = norm(cusps[5] + 180); cusps[12] = norm(cusps[6] + 180);
  }
  for (const [a, b] of [[5, 11], [6, 12], [8, 2], [9, 3]]) cusps[a] = norm(cusps[b] + 180);
  return { cusps, asc, mc, ramc, eps, system: used };
}

export function houseOf(lon, cusps) {
  for (let h = 1; h <= 12; h++) {
    const a = cusps[h], b = cusps[h === 12 ? 1 : h + 1];
    const span = norm(b - a), d = norm(lon - a);
    if (d < span) return h;
  }
  return 1;
}

// ---------- Аспекты ----------
export function findAspect(l1, l2, { minor = true, orbMul = 1, lights = false, orbOverride = null } = {}) {
  const d = angDist(l1, l2);
  let best = null;
  for (const asp of ASPECTS) {
    if (!minor && !asp.major) continue;
    let orb = orbOverride !== null ? (asp.major ? orbOverride : Math.min(orbOverride, asp.orb)) : asp.orb * orbMul * (lights && asp.major ? 1.25 : 1);
    const diff = Math.abs(d - asp.angle);
    if (diff <= orb && (!best || diff < best.diff)) best = { ...asp, diff, exact: d };
  }
  return best;
}

export function aspectsBetween(posA, posB, idsA, idsB, opts = {}) {
  const res = [];
  const same = posA === posB;
  for (let i = 0; i < idsA.length; i++) {
    for (let j = same ? i + 1 : 0; j < idsB.length; j++) {
      const a = idsA[i], b = idsB[j];
      if (same && a === b) continue;
      if (FICT.includes(a) && FICT.includes(b)) continue;
      const pa = posA[a], pb = posB[b];
      if (!pa || !pb) continue;
      const lights = ['sun', 'moon'].includes(a) || ['sun', 'moon'].includes(b);
      const asp = findAspect(pa.lon, pb.lon, { ...opts, lights });
      if (asp) {
        // сходящийся/расходящийся (для натала, где есть скорости)
        let applying = null;
        if (pa.speed !== undefined && pb.speed !== undefined) {
          const dNow = Math.abs(angDist(pa.lon, pb.lon) - asp.angle);
          const dNext = Math.abs(angDist(pa.lon + pa.speed * 0.01, pb.lon + pb.speed * 0.01) - asp.angle);
          applying = dNext < dNow;
        }
        res.push({ a, b, ...asp, applying });
      }
    }
  }
  return res.sort((x, y) => x.diff - y.diff);
}

// ---------- Построение карты ----------
export function buildChart({ date, lat, lon, label = '' }) {
  const pos = planetPositions(date);
  const h = houses(date, lat, lon);
  pos.asc = { id: 'asc', lon: h.asc, speed: 0, sign: signOf(h.asc) };
  pos.mc = { id: 'mc', lon: h.mc, speed: 0, sign: signOf(h.mc) };
  for (const id of Object.keys(pos)) pos[id].house = houseOf(pos[id].lon, h.cusps);
  // дневное/ночное рождение: Солнце над горизонтом = дома 7–12
  const day = pos.sun.house >= 7;
  return { date, lat, lon, label, pos, houses: h, day };
}

// ---------- Соляр ----------
export function solarReturn(natal, year, lat = natal.lat, lon = natal.lon) {
  const sunLon = natal.pos.sun.lon;
  const nd = new Date(natal.date);
  const start = A.MakeTime(new Date(Date.UTC(year, nd.getUTCMonth(), nd.getUTCDate()) - 4 * 86400000));
  const t = A.SearchSunLongitude(sunLon, start, 10);
  if (!t) throw new Error('Не удалось найти момент соляра');
  return { ...buildChart({ date: t.date, lat, lon, label: `Соляр ${year}` }), year };
}

// ---------- Вторичные прогрессии (1 день = 1 год), MC по солнечной дуге ----------
export function progressed(natal, targetDate) {
  const years = (targetDate - natal.date) / (365.2422 * 86400000);
  const pDate = new Date(natal.date.getTime() + years * 86400000);
  const pos = planetPositions(pDate);
  const arc = norm(pos.sun.lon - natal.pos.sun.lon);
  const mc = norm(natal.houses.mc + arc);
  // ASC из прогрессивного MC для широты рождения
  const eps = natal.houses.eps;
  const ramc = norm(atan2d(sind(mc) * cosd(eps), cosd(mc)));
  const h = housesFromRAMC(ramc, eps, natal.lat);
  pos.asc = { id: 'asc', lon: h.asc, speed: 0, sign: signOf(h.asc) };
  pos.mc = { id: 'mc', lon: h.mc, speed: 0, sign: signOf(h.mc) };
  for (const id of Object.keys(pos)) {
    pos[id].house = houseOf(pos[id].lon, h.cusps);
    pos[id].natalHouse = houseOf(pos[id].lon, natal.houses.cusps);
  }
  return { date: pDate, targetDate, years, pos, houses: h, label: 'Прогрессии', arc };
}

// ---------- Транзиты ----------
// Поиск точных транзитных аспектов медленных/средних планет к натальным точкам за период.
export const TRANSIT_ORB = { sun: 1, mercury: 1, venus: 1, mars: 1, jupiter: 1.5, saturn: 1.5, uranus: 1.5, neptune: 1.5, pluto: 1.5, node: 1, lilith: 1 };
export function transitEvents(natal, from, to, { transiting = ['mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'node'], targets = null, aspects = ['conj', 'opp', 'square', 'trine', 'sextile'] } = {}) {
  const tgt = targets || [...MAIN, 'asc', 'mc', 'node'];
  const asps = ASPECTS.filter((a) => aspects.includes(a.id));
  const events = [];
  const stepDays = 1;
  const t0 = A.MakeTime(from), days = Math.ceil((to - from) / 86400000);
  for (const tp of transiting) {
    let prev = null;
    const series = [];
    for (let i = 0; i <= days; i += stepDays) series.push(lonOf(tp, t0.AddDays(i)));
    for (const np of tgt) {
      const nl = natal.pos[np].lon;
      for (const asp of asps) {
        // функция f(i) = подписанное отклонение от точного аспекта; ищем нули
        const targetsLon = asp.angle === 0 || asp.angle === 180 ? [norm(nl + asp.angle)] : [norm(nl + asp.angle), norm(nl - asp.angle)];
        for (const tl of targetsLon) {
          prev = null;
          let inOrb = null;
          const orb = TRANSIT_ORB[tp] || 1;
          for (let i = 0; i < series.length; i++) {
            const f = norm(series[i] - tl + 180) - 180;
            if (Math.abs(f) <= orb && !inOrb) inOrb = { start: i, exacts: [] };
            if (prev !== null && Math.sign(f) !== Math.sign(prev) && Math.abs(f - prev) < 30) {
              // уточнение бисекцией
              let lo = i - 1, hi = i, flo = prev;
              for (let k = 0; k < 20; k++) {
                const mid = (lo + hi) / 2;
                const fm = norm(lonOf(tp, t0.AddDays(mid)) - tl + 180) - 180;
                if (Math.sign(fm) === Math.sign(flo)) { lo = mid; flo = fm; } else hi = mid;
              }
              if (!inOrb) inOrb = { start: i, exacts: [] };
              inOrb.exacts.push(t0.AddDays((lo + hi) / 2).date);
            }
            if (inOrb && (Math.abs(f) > orb || i === series.length - 1)) {
              {
                events.push({
                  tp, np, asp, start: t0.AddDays(inOrb.start).date, end: t0.AddDays(i).date,
                  exacts: inOrb.exacts, openStart: inOrb.start === 0, openEnd: Math.abs(f) <= orb,
                });
              }
              inOrb = null;
            }
            prev = f;
          }
        }
      }
    }
  }
  return events.sort((a, b) => (a.exacts[0] || a.start) - (b.exacts[0] || b.start));
}

// Вход медленных транзитных планет в натальные дома
export function transitHouseIngresses(natal, from, to, planets = ['jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'node']) {
  const res = [];
  const t0 = A.MakeTime(from), days = Math.ceil((to - from) / 86400000);
  for (const tp of planets) {
    let prevH = houseOf(lonOf(tp, t0), natal.houses.cusps);
    res.push({ tp, house: prevH, date: from, initial: true });
    for (let i = 1; i <= days; i++) {
      const h = houseOf(lonOf(tp, t0.AddDays(i)), natal.houses.cusps);
      if (h !== prevH) { res.push({ tp, house: h, date: t0.AddDays(i).date, from: prevH }); prevH = h; }
    }
  }
  return res;
}

// Положения транзитных планет на дату + аспекты к радиксу
export function transitSnapshot(natal, date) {
  const pos = planetPositions(date);
  for (const id of Object.keys(pos)) pos[id].natalHouse = houseOf(pos[id].lon, natal.houses.cusps);
  const asp = aspectsBetween(pos, natal.pos, PLANETS.map((p) => p.id), [...MAIN, 'asc', 'mc', 'node'], { minor: false, orbOverride: 2 });
  return { date, pos, aspects: asp };
}
