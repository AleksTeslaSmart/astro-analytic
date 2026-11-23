// Хорарный калькулятор: карта на момент вопроса + классические правила
// (У. Лилли, традиционная хорарная астрология): септенер, классические управители,
// сигнификаторы, совершение аспекта, рецепция, пустая Луна, радикальность, планетарный час.
import * as S from './astro.js';
import { chartSVG } from './chart-svg.js';
import { attachPlaceSearch, offsetFor, fmtOffset } from './geo.js';

const A = globalThis.Astronomy;
const SEPT = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];
const DAT = { sun: 'Солнцу', moon: 'Луне', mercury: 'Меркурию', venus: 'Венере', mars: 'Марсу', jupiter: 'Юпитеру', saturn: 'Сатурну' };
const INS = { sun: 'Солнцем', moon: 'Луной', mercury: 'Меркурием', venus: 'Венерой', mars: 'Марсом', jupiter: 'Юпитером', saturn: 'Сатурном' };
const RU = { sun: 'Солнце', moon: 'Луна', mercury: 'Меркурий', venus: 'Венера', mars: 'Марс', jupiter: 'Юпитер', saturn: 'Сатурн', uranus: 'Уран', neptune: 'Нептун', pluto: 'Плутон' };
// Классические управители и достоинства
const RULER = ['mars', 'venus', 'mercury', 'moon', 'sun', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'saturn', 'jupiter'];
const EXALT = { sun: 0, moon: 1, mercury: 5, venus: 11, mars: 9, jupiter: 3, saturn: 6 };
const FALL = { sun: 6, moon: 7, mercury: 11, venus: 5, mars: 3, jupiter: 9, saturn: 0 };
// Управители триплицитетов (Доротей): [день, ночь]
const TRIP = { fire: ['sun', 'jupiter'], earth: ['venus', 'moon'], air: ['saturn', 'mercury'], water: ['venus', 'mars'] };
const EXALT_RULER = Object.fromEntries(Object.entries(EXALT).map(([p, s]) => [s, p]));
const MOIETY = { sun: 7.5, moon: 6, mercury: 3.5, venus: 3.5, mars: 3.75, jupiter: 4.5, saturn: 4.5 }; // половины орбисов Лилли
const ASPS = [{ a: 0, n: 'соединение', k: 'conj' }, { a: 60, n: 'секстиль', k: 'soft' }, { a: 90, n: 'квадрат', k: 'hard' }, { a: 120, n: 'трин', k: 'soft' }, { a: 180, n: 'оппозиция', k: 'hard' }];
const CHALDEAN = ['saturn', 'jupiter', 'mars', 'sun', 'venus', 'mercury', 'moon'];
const DAY_RULER = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn']; // вс..сб

export const TOPICS = [
  { h: 7, t: 'Отношения, брак, партнёр (будем ли вместе?)' },
  { h: 5, t: 'Любовь, роман, дети, беременность' },
  { h: 10, t: 'Карьера, должность, повышение, начальство' },
  { h: 6, t: 'Работа по найму, здоровье, болезнь' },
  { h: 2, t: 'Деньги, доход, покупка, пропавшая вещь' },
  { h: 8, t: 'Долги, кредит, деньги партнёра, наследство' },
  { h: 4, t: 'Дом, недвижимость, переезд, родители' },
  { h: 3, t: 'Документы, переписка, короткая поездка, братья/сёстры' },
  { h: 9, t: 'Дальняя поездка, учёба, суд, заграница' },
  { h: 11, t: 'Надежды, друзья, исполнится ли желание' },
  { h: 12, t: 'Тайные враги, скрытые обстоятельства, больница' },
  { h: 1, t: 'Сам спрашивающий: что меня ждёт, моё состояние' },
];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

function essential(id, lon, day) {
  const s = S.signOf(lon), el = S.SIGNS[s].el;
  const items = [];
  if (RULER[s] === id) items.push(['обитель', 5]);
  if (EXALT[id] === s) items.push(['экзальтация', 4]);
  if (TRIP[el][day ? 0 : 1] === id) items.push(['триплицитет', 3]);
  if (RULER[(s + 6) % 12] === id) items.push(['изгнание', -5]);
  if (FALL[id] === s) items.push(['падение', -4]);
  if (!items.length) items.push(['перегрин (без достоинств)', -5]);
  return { items, total: items.reduce((a, b) => a + b[1], 0) };
}
function accidental(id, ch) {
  const p = ch.pos[id], items = [];
  const hb = { 1: 5, 10: 5, 7: 4, 4: 4, 11: 4, 5: 3, 2: 3, 9: 2, 3: 1, 8: -2, 6: -2, 12: -5 }[p.house];
  items.push([`${ROMAN[p.house]} дом`, hb]);
  if (p.retro) items.push(['ретроградность', -5]);
  if (id !== 'sun') {
    const d = S.angDist(p.lon, ch.pos.sun.lon);
    if (d < 17 / 60) items.push(['казими (в сердце Солнца)', 5]);
    else if (d < 8.5) items.push(['сожжение Солнцем', -5]);
    else if (d < 17) items.push(['под лучами Солнца', -4]);
  }
  return { items, total: items.reduce((a, b) => a + b[1], 0) };
}
function reception(a, b, ch, day) {
  // a принимает b, если b находится в достоинстве a
  const s = ch.pos[b].sign, el = S.SIGNS[s].el, r = [];
  if (RULER[s] === a) r.push('по обители');
  if (EXALT_RULER[s] === a) r.push('по экзальтации');
  if (TRIP[el][day ? 0 : 1] === a) r.push('по триплицитету');
  return r;
}

// Ближайшее точное совершение аспекта между a и b после момента t0 (дней поиска maxDays)
function nextPerfection(a, b, t0, maxDays = 120) {
  const T = A.MakeTime(t0);
  const fast = a === 'moon' || b === 'moon';
  const step = fast ? 1 / 24 : 0.25;
  const L = (id, d) => S.lonOf(id, T.AddDays(d));
  let best = null;
  for (const asp of ASPS) {
    let prev = null;
    for (let d = 0; d <= maxDays; d += step) {
      const f = S.angDist(L(a, d), L(b, d)) - asp.a;
      if (prev !== null && Math.sign(f) !== Math.sign(prev) && Math.abs(f - prev) < 10) {
        let lo = d - step, hi = d;
        for (let k = 0; k < 25; k++) { const m = (lo + hi) / 2; const fm = S.angDist(L(a, m), L(b, m)) - asp.a; if (Math.sign(fm) === Math.sign(prev)) lo = m; else hi = m; }
        const dd = (lo + hi) / 2;
        if (!best || dd < best.days) best = { asp, days: dd, date: T.AddDays(dd).date, signChange: S.signOf(L(a, dd)) !== S.signOf(L(a, 0)) || S.signOf(L(b, dd)) !== S.signOf(L(b, 0)) };
        break;
      }
      prev = f;
      if (best && d > best.days) break;
    }
  }
  return best;
}
// Последний (разделяющий) аспект — поиск назад
function lastAspect(a, b, t0, maxDays = 30) {
  const T = A.MakeTime(t0); const step = 1 / 24;
  let best = null;
  for (const asp of ASPS) {
    let prev = null;
    for (let d = 0; d <= maxDays; d += step) {
      const f = S.angDist(S.lonOf(a, T.AddDays(-d)), S.lonOf(b, T.AddDays(-d))) - asp.a;
      if (prev !== null && Math.sign(f) !== Math.sign(prev) && Math.abs(f - prev) < 10) { if (!best || d < best.days) best = { asp, days: d }; break; }
      prev = f;
      if (best && d > best.days) break;
    }
  }
  return best;
}
// Время Луны до выхода из знака (дней)
function moonDaysLeftInSign(t0) {
  const T = A.MakeTime(t0), s0 = S.signOf(S.lonOf('moon', T));
  let d = 0; while (S.signOf(S.lonOf('moon', T.AddDays(d))) === s0 && d < 3) d += 1 / 48;
  return d;
}

function planetaryHour(date, lat, lon, tz) {
  try {
    const obs = new A.Observer(lat, lon, 0);
    const t = A.MakeTime(date);
    const rise = A.SearchRiseSet(A.Body.Sun, obs, +1, t, -1.2); // последний восход до момента (поиск назад)
    const set = A.SearchRiseSet(A.Body.Sun, obs, -1, rise, 1.2);
    const nextRise = A.SearchRiseSet(A.Body.Sun, obs, +1, t, 1.2);
    const isDay = t.ut < set.ut;
    const start = isDay ? rise : set, end = isDay ? set : nextRise;
    const len = (end.ut - start.ut) / 12;
    const idx = Math.floor((t.ut - start.ut) / len);
    const wd = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(rise.date);
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wd);
    const dayRuler = DAY_RULER[dow];
    const hourRuler = CHALDEAN[(CHALDEAN.indexOf(dayRuler) + (isDay ? 0 : 12) + idx) % 7];
    return { dayRuler, hourRuler, isDay, hourNo: idx + 1 };
  } catch { return null; }
}

function timingUnit(id, ch) {
  const h = ch.pos[id].house, cross = S.SIGNS[ch.pos[id].sign].cross;
  const ang = [1, 4, 7, 10].includes(h) ? 0 : [2, 5, 8, 11].includes(h) ? 1 : 2;
  const units = { card: ['дни', 'недели', 'месяцы'], mut: ['недели', 'месяцы', 'месяцы'], fix: ['месяцы', 'месяцы', 'годы'] };
  return units[cross][ang];
}

export function horaryAnalysis(ch, quesitedHouse, tz) {
  const day = ch.pos.sun.house >= 7;
  const out = { checks: [], sig: {}, events: [], verdict: [], score: 0 };
  // Радикальность
  const ascDeg = S.norm(ch.houses.asc) % 30;
  if (ascDeg < 3) out.checks.push(['warn', `Асцендент ${ascDeg.toFixed(1)}° — слишком ранний: вопрос задан преждевременно, ситуация ещё не созрела.`]);
  else if (ascDeg > 27) out.checks.push(['warn', `Асцендент ${ascDeg.toFixed(1)}° — слишком поздний: дело уже решено или спрашивающий опоздал.`]);
  else out.checks.push(['ok', `Асцендент ${ascDeg.toFixed(1)}° — карта радикальна по градусу ASC.`]);
  if (ch.pos.saturn.house === 1 || ch.pos.saturn.house === 7) out.checks.push(['warn', `Сатурн в ${ROMAN[ch.pos.saturn.house]} доме — традиционное предостережение: суждение затруднено или ошибочно.`]);
  const ml = ch.pos.moon.lon;
  if (ml >= 195 && ml <= 225) out.checks.push(['warn', 'Луна на «сожжённом пути» (15° Весов – 15° Скорпиона): обстановка нестабильна, тревожна.']);
  const md = S.norm(ml) % 30;
  if (md > 29) out.checks.push(['warn', 'Луна в последнем градусе знака — дело на исходе.']);
  // Пустая Луна
  const left = moonDaysLeftInSign(ch.date);
  let moonNext = null;
  for (const id of SEPT.filter((x) => x !== 'moon')) {
    const p = nextPerfection('moon', id, ch.date, left);
    if (p && p.days <= left && (!moonNext || p.days < moonNext.days)) moonNext = { ...p, id };
  }
  let moonLast = null;
  for (const id of SEPT.filter((x) => x !== 'moon')) { const l = lastAspect('moon', id, ch.date, 3); if (l && (!moonLast || l.days < moonLast.days)) moonLast = { ...l, id }; }
  out.moon = { next: moonNext, last: moonLast, left };
  if (!moonNext) out.checks.push(['warn', `Луна без курса: до выхода из знака (${(left * 24).toFixed(0)} ч) она не совершит ни одного аспекта — «ничего из этого не выйдет», ситуация не изменится.`]);
  else out.checks.push(['ok', `Луна применяется к ${DAT[moonNext.id]} (${moonNext.asp.n}) через ${(moonNext.days * 24).toFixed(0)} ч — следующее событие ситуации.`]);
  if (moonLast) out.checks.push(['info', `Последний аспект Луны: ${moonLast.asp.n} с ${INS[moonLast.id]} (${(moonLast.days * 24).toFixed(0)} ч назад) — недавнее прошлое ситуации.`]);
  // Сигнификаторы
  const ascSign = S.signOf(ch.houses.asc), qSign = S.signOf(ch.houses.cusps[quesitedHouse]);
  const qr = RULER[ascSign];
  let qd = RULER[qSign];
  const sameSig = qr === qd;
  out.sig = { querent: qr, quesited: qd, sameSig, ascSign, qSign };
  const cond = (id) => { const e = essential(id, ch.pos[id].lon, day), a = accidental(id, ch); return { e, a, total: e.total + a.total }; };
  out.cond = { [qr]: cond(qr), [qd]: cond(qd), moon: cond('moon') };
  // Совершение
  if (!sameSig) {
    const perf = nextPerfection(qr, qd, ch.date, 400);
    out.perf = perf;
    if (perf) {
      const unit = timingUnit(qr, ch);
      out.events.push(`${RU[qr]} и ${RU[qd]} совершают ${perf.asp.n} ${perf.date.toLocaleDateString('ru-RU')} (через ${perf.days.toFixed(1)} сут.)${perf.signChange ? ', но уже после смены знака — связь ослаблена' : ''}. Символическая единица времени: ${unit}.`);
      out.score += perf.signChange ? 0.5 : perf.asp.k === 'hard' ? 1 : 2;
    } else out.events.push(`Сигнификаторы ${RU[qr]} и ${RU[qd]} не сходятся в аспекте в обозримое время — прямого совершения нет.`);
    // Перенос света: Луна отделилась от одного и применяется к другому
    if (moonLast && moonNext && ((moonLast.id === qr && moonNext.id === qd) || (moonLast.id === qd && moonNext.id === qr))) {
      out.events.push('Перенос света: Луна отделилась от одного сигнификатора и применяется к другому — дело свершится через посредника или третье лицо.');
      out.score += 1.5;
    }
    // Рецепция
    const r1 = reception(qr, qd, ch, day), r2 = reception(qd, qr, ch, day);
    if (r1.length) out.events.push(`${RU[qr]} (спрашивающий) принимает ${RU[qd]} ${r1.join(', ')} — спрашивающий расположен к делу.`);
    if (r2.length) out.events.push(`${RU[qd]} (предмет вопроса) принимает ${RU[qr]} ${r2.join(', ')} — предмет вопроса благосклонен к спрашивающему.`);
    if (r1.length && r2.length) out.score += 1.5; else if (r1.length || r2.length) out.score += 0.7;
  } else out.events.push(`Оба дома управляются одной планетой (${RU[qr]}): исход определяют в первую очередь аспекты Луны.`);
  // Луна как со-сигнификатор
  if (moonNext && (moonNext.id === qd || moonNext.id === qr)) { out.events.push(`Луна применяется к сигнификатору (${RU[moonNext.id]}) — поддержка исхода.`); out.score += moonNext.asp.k === 'hard' ? 0.5 : 1; }
  if (!moonNext) out.score -= 1.5;
  // Состояние сигнификатора предмета
  const qc = out.cond[qd].total;
  if (qc >= 5) out.score += 0.5; if (qc <= -8) out.score -= 0.5;
  if (ch.pos[qd].retro) out.events.push(`${RU[qd]} ретрограден — возможны задержки, возврат к прошлому, отмена договорённостей.`);
  if (ch.pos[qr].retro) out.events.push(`${RU[qr]} ретрограден — спрашивающий может передумать или отступить.`);
  // Вердикт
  const s = out.score;
  out.verdictText = s >= 3 ? 'Скорее ДА: показатели сходятся, дело свершится.' : s >= 1.5 ? 'Скорее да, но с условиями: проверьте трудности (напряжённые аспекты, слабые сигнификаторы).' : s > 0 ? 'Неопределённо: есть отдельные благоприятные признаки, но нет надёжного совершения.' : 'Скорее НЕТ или «ничего не изменится»: нет совершения аспекта между сигнификаторами.';
  out.hour = planetaryHour(ch.date, ch.lat, ch.lon, tz);
  return out;
}

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } },
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function nowLocal(tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

export function renderHorary(view) {
  const saved = store.get('astro.horary', { place: 'Москва', lat: 55.7558, lon: 37.6173, tz: 'Europe/Moscow', topic: 7, q: '' });
  const n = nowLocal(saved.tz);
  view.innerHTML = `
  <div class="card">
    <p class="muted">Хорарная астрология отвечает на конкретный вопрос по карте момента, когда он задан. Сформулируйте вопрос чётко, задавайте его один раз. Используются классические правила (септенер, управители по Птолемею, орбисы Лилли).</p>
    <div class="grid">
      <label class="wide">Вопрос<input id="hq" value="${esc(saved.q || '')}" placeholder="Например: «Получу ли я эту работу?»"></label>
      <label class="wide">Тема вопроса (дом предмета)<select id="htopic">${TOPICS.map((t) => `<option value="${t.h}" ${t.h === saved.topic ? 'selected' : ''}>${ROMAN[t.h]} дом — ${t.t}</option>`).join('')}</select></label>
      <label>Дата<input id="hdate" type="date" value="${n.date}"></label>
      <label>Время<input id="htime" type="time" value="${n.time}"></label>
      <label class="wide">Где задан вопрос<span class="row nowrap"><input id="hplace" value="${esc(saved.place)}"><button class="btn" type="button" id="hfind">Найти</button></span><span id="hres" class="results"></span></label>
      <div class="wide note" id="hinfo">${esc(saved.tz)} · ${saved.lat.toFixed(2)}°, ${saved.lon.toFixed(2)}°</div>
      <div class="wide row"><button class="btn primary" id="hgo">Построить хорар</button><button class="btn ghost" id="hnow">Сейчас</button></div>
    </div>
  </div>
  <div id="hout"></div>`;
  const $ = (s) => view.querySelector(s);
  const place = { ...saved };
  const info = () => { const off = offsetFor(place.tz, $('#hdate').value, $('#htime').value); $('#hinfo').textContent = `${place.tz} · ${(+place.lat).toFixed(2)}°, ${(+place.lon).toFixed(2)}°${off !== null ? ' · ' + fmtOffset(off) : ''}`; };
  info();
  attachPlaceSearch($('#hplace'), $('#hres'), (it) => { Object.assign(place, { place: it.label.split(',').slice(0, 2).join(','), lat: it.lat, lon: it.lon, tz: it.tz }); $('#hplace').value = place.place; info(); }, $('#hfind'));
  $('#hnow').onclick = () => { const m = nowLocal(place.tz); $('#hdate').value = m.date; $('#htime').value = m.time; info(); build(); };
  $('#hgo').onclick = build;
  ['#hdate', '#htime'].forEach((s) => $(s).addEventListener('input', info));

  function build() {
    const topic = +$('#htopic').value;
    store.set('astro.horary', { ...place, topic, q: $('#hq').value });
    const [y, m, d] = $('#hdate').value.split('-').map(Number), [hh, mm] = $('#htime').value.split(':').map(Number);
    const date = S.localToUtc({ y, m, d, hh, mm }, place.tz);
    const ch = S.buildChart({ date, lat: +place.lat, lon: +place.lon, label: 'Хорар' });
    const an = horaryAnalysis(ch, topic, place.tz);
    const it = (h, t, cls = '') => `<div class="item ${cls}"><div class="item-head">${h}</div>${t ? `<div class="item-text">${t}</div>` : ''}</div>`;
    const condTxt = (id) => { const c = an.cond[id]; return `${RU[id]} в ${S.SIGNS[ch.pos[id].sign].loc}, ${ROMAN[ch.pos[id].house]} дом${ch.pos[id].retro ? ', R' : ''}. Сила: ${c.total > 0 ? '+' : ''}${c.total} (${[...c.e.items, ...c.a.items].map(([l, v]) => `${l} ${v > 0 ? '+' : ''}${v}`).join(', ')})`; };
    let html = `<details class="sec" open><summary>Ответ</summary><div class="sec-body">`;
    html += it(`${esc($('#hq').value || 'Вопрос')}`, `<p class="note"><b>${an.verdictText}</b></p><p class="muted">Балл суждения: ${an.score.toFixed(1)}. Хорар — инструмент для размышления: оцените обоснование ниже.</p>`);
    html += `</div></details>`;
    html += `<details class="sec" open><summary>Сигнификаторы</summary><div class="sec-body">`;
    html += it(`Спрашивающий: ${RU[an.sig.querent]} (управитель ASC в ${S.SIGNS[an.sig.ascSign].loc}) и Луна`, condTxt(an.sig.querent) + '<br>' + condTxt('moon'));
    html += it(`Предмет вопроса: ${RU[an.sig.quesited]} (управитель ${ROMAN[topic]} дома в ${S.SIGNS[an.sig.qSign].loc})`, condTxt(an.sig.quesited));
    html += `</div></details>`;
    html += `<details class="sec" open><summary>Совершение, рецепция, Луна</summary><div class="sec-body">${an.events.map((e) => it(e, '')).join('')}</div></details>`;
    html += `<details class="sec" open><summary>Радикальность и предостережения</summary><div class="sec-body">${an.checks.map(([k, t]) => it(t, '', k === 'warn' ? 'hard' : k === 'ok' ? 'soft' : '')).join('')}</div></details>`;
    if (an.hour) html += `<details class="sec"><summary>Планетарный день и час</summary><div class="sec-body">${it(`День ${RU[an.hour.dayRuler]}, ${an.hour.isDay ? 'дневной' : 'ночной'} час №${an.hour.hourNo} — управитель часа ${RU[an.hour.hourRuler]}`, `По традиции карта особенно показательна, если управитель часа совпадает по природе (триплицитету) с Асцендентом или его управителем. ASC в ${S.SIGNS[an.sig.ascSign].loc}; ${an.hour.hourRuler === an.sig.querent || an.hour.hourRuler === RULER[an.sig.ascSign] ? 'управитель часа совпадает с управителем ASC — карта радикальна.' : 'совпадения нет — карту стоит читать осторожно.'}`)}</div></details>`;
    let rows = '';
    for (const id of [...SEPT, 'uranus', 'neptune', 'pluto', 'node']) { const p = ch.pos[id]; rows += `<tr><td>${S.P[id].glyph}︎ ${S.P[id].name}</td><td>${S.fmtDeg(p.lon)}${p.retro ? ' R' : ''}</td><td>${ROMAN[p.house]}</td></tr>`; }
    const table = `<table class="tbl"><thead><tr><th>Точка</th><th>Положение</th><th>Дом</th></tr></thead><tbody>${rows}<tr><td>ASC</td><td>${S.fmtDeg(ch.houses.asc)}</td><td></td></tr><tr><td>MC</td><td>${S.fmtDeg(ch.houses.mc)}</td><td></td></tr></tbody></table>`;
    const asp = S.aspectsBetween(ch.pos, ch.pos, SEPT, SEPT, { minor: false });
    $('#hout').innerHTML = `<div class="layout"><div class="chartbox">${chartSVG(ch, { aspects: asp })}${table}</div><div>${html}</div></div>`;
  }
  build();
}
