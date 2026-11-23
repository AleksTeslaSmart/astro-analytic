import * as S from './astro.js';
import { fullNatalAnalysis } from './analysis.js';
import * as R from './report.js';
import { chartSVG } from './chart-svg.js';
import { renderChat } from './ai.js';
import { renderHorary } from './horary.js';
import { attachPlaceSearch, searchPlaces, offsetFor, fmtOffset } from './geo.js';

const $ = (s, el = document) => el.querySelector(s);
const view = $('#view');
const form = $('#personForm');
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* приватный режим */ } },
};

const state = {
  persons: store.get('astro.persons', []),
  current: store.get('astro.current', 0),
  tab: store.get('astro.tab', 'natal'),
  partner: store.get('astro.partner', 1),
  solarYear: new Date().getFullYear(),
  solarPlace: 'birth',
  progDate: new Date().toISOString().slice(0, 10),
  trFrom: new Date().toISOString().slice(0, 10),
  trMonths: 12,
  cache: {},
};

// ---------- Человек ----------
function personToChart(p) {
  const [y, m, d] = p.date.split('-').map(Number);
  const [hh, mm] = p.time.split(':').map(Number);
  const tz = p.tz || safeTz(p.lat, p.lon);
  const date = S.localToUtc({ y, m, d, hh, mm }, tz, p.offset === '' ? undefined : p.offset);
  return S.buildChart({ date, lat: +p.lat, lon: +p.lon, label: p.name });
}
function safeTz(lat, lon) { try { return globalThis.tzlookup(+lat, +lon); } catch { return 'UTC'; } }

function fillSelect() {
  const sel = $('#personSelect');
  sel.innerHTML = state.persons.length ? state.persons.map((p, i) => `<option value="${i}" ${i === state.current ? 'selected' : ''}>${escapeHtml(p.name)} · ${p.date.split('-').reverse().join('.')}</option>`).join('') : '<option>— нет сохранённых карт —</option>';
}
function fillForm(p) {
  for (const k of ['name', 'date', 'time', 'place', 'lat', 'lon', 'tz', 'offset']) form.elements[k].value = p?.[k] ?? (k === 'time' ? '12:00' : '');
  updateOffsetInfo();
}
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// Автоматическое смещение UTC: показываем для выбранной даты, времени и пояса
function updateOffsetInfo() {
  const tz = form.elements.tz.value || (form.elements.lat.value && form.elements.lon.value ? safeTz(form.elements.lat.value, form.elements.lon.value) : '');
  const box = $('#offsetInfo');
  if (form.elements.offset.value !== '') { box.textContent = `Ручная поправка: UTC${+form.elements.offset.value >= 0 ? '+' : ''}${form.elements.offset.value} (автоопределение отключено)`; return; }
  const off = offsetFor(tz, form.elements.date.value, form.elements.time.value);
  if (off === null || !tz) { box.textContent = 'Пояс и смещение UTC определятся автоматически после выбора города.'; return; }
  const winter = offsetFor(tz, form.elements.date.value.slice(0, 4) + '-01-15', '12:00');
  box.textContent = `Определено автоматически: ${tz}, ${fmtOffset(off)}${winter !== null && winter !== off ? ' (летнее время)' : ''}`;
}
['date', 'time', 'tz', 'offset'].forEach((k) => form.elements[k].addEventListener('input', updateOffsetInfo));
// город изменён вручную — старые координаты больше не годятся (при сохранении найдём заново)
form.elements.place.addEventListener('input', () => { form.elements.lat.value = ''; form.elements.lon.value = ''; form.elements.tz.value = ''; updateOffsetInfo(); });
attachPlaceSearch(form.elements.place, $('#placeResults'), (it) => {
  form.elements.lat.value = it.lat.toFixed(4); form.elements.lon.value = it.lon.toFixed(4);
  form.elements.place.value = it.label.split(',').slice(0, 2).join(',');
  form.elements.tz.value = it.tz; form.elements.offset.value = '';
  updateOffsetInfo();
}, $('#findPlace'));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  // координаты не введены — находим город автоматически
  if ((!form.elements.lat.value || !form.elements.lon.value) && form.elements.place.value.trim()) {
    $('#formMsg').textContent = 'Ищу координаты города…';
    const [it] = await searchPlaces(form.elements.place.value.trim());
    if (!it) { $('#formMsg').textContent = 'Город не найден — уточните название или введите координаты.'; return; }
    form.elements.lat.value = it.lat.toFixed(4); form.elements.lon.value = it.lon.toFixed(4); form.elements.tz.value = it.tz;
    form.elements.place.value = it.label.split(',').slice(0, 2).join(',');
    updateOffsetInfo();
  }
  if (!form.elements.lat.value || !form.elements.lon.value) { $('#formMsg').textContent = 'Укажите город (или координаты).'; return; }
  const f = Object.fromEntries(new FormData(form).entries());
  if (!f.tz) f.tz = safeTz(f.lat, f.lon);
  form.elements.tz.value = f.tz;
  const idx = state.editing === 'new' || !state.persons.length ? state.persons.push(f) - 1 : state.current;
  state.persons[idx] = f;
  state.current = idx; state.editing = null; state.cache = {};
  form.classList.add('hidden');
  store.set('astro.persons', state.persons); store.set('astro.current', idx);
  fillSelect();
  try {
    const ch = personToChart(f);
    $('#formMsg').textContent = `Сохранено. UTC: ${ch.date.toISOString().slice(0, 16).replace('T', ' ')}, пояс ${f.tz}${f.offset ? '' : ' (смещение ' + S.tzOffsetMinutes(f.tz, ch.date.getTime()) / 60 + ' ч)'}`;
  } catch (err) { $('#formMsg').textContent = 'Ошибка: ' + err.message; }
  render();
});
$('#personSelect').addEventListener('change', (e) => { state.current = +e.target.value; store.set('astro.current', state.current); state.cache = {}; fillForm(state.persons[state.current]); render(); });
$('#newPerson').addEventListener('click', () => { state.editing = 'new'; fillForm(null); form.classList.remove('hidden'); form.elements.name.focus(); $('#formMsg').textContent = 'Новая карта'; });
$('#toggleForm').addEventListener('click', () => form.classList.toggle('hidden'));
$('#deletePerson').addEventListener('click', () => {
  if (!state.persons.length || !confirm(`Удалить карту «${state.persons[state.current].name}»?`)) return;
  state.persons.splice(state.current, 1); state.current = 0; state.cache = {};
  store.set('astro.persons', state.persons); store.set('astro.current', 0);
  fillSelect(); fillForm(state.persons[0]); render();
});
for (const k of ['lat', 'lon']) form.elements[k].addEventListener('change', () => {
  if (form.elements.lat.value && form.elements.lon.value) { form.elements.tz.value = safeTz(form.elements.lat.value, form.elements.lon.value); updateOffsetInfo(); }
});

// ---------- Вкладки ----------
$('#tabs').addEventListener('click', (e) => {
  const t = e.target.closest('button'); if (!t) return;
  state.tab = t.dataset.tab; store.set('astro.tab', state.tab); render();
});

function natal() {
  if (!state.persons.length) return null;
  const p = state.persons[state.current];
  if (!state.cache.natal) {
    const ch = personToChart(p);
    state.cache.natal = { ch, an: fullNatalAnalysis(ch), tz: p.tz || safeTz(p.lat, p.lon) };
  }
  return state.cache.natal;
}

function layout(svg, report, controls = '') {
  return `${controls ? `<div class="controls">${controls}</div>` : ''}<div class="layout"><div class="chartbox">${svg}</div><div>${report}</div></div>`;
}

function aspLines(asps, from, to) { return asps.filter((a) => a.major || a.kind).map((a) => ({ ...a, from, to })); }

const RENDER = {
  natal() {
    const { ch, an, tz } = natal();
    const rep = R.natalReport(ch, an);
    state.cache.natalText = rep.text;
    const head = `<div class="sec"><div class="sec-body" style="padding-top:12px"><b>${escapeHtml(ch.label)}</b> · ${S.utcToLocalString(ch.date, tz)} (${tz}) · ${(+ch.lat).toFixed(2)}°, ${(+ch.lon).toFixed(2)}° · дома: ${ch.houses.system === 'placidus' ? 'Плацидус' : 'Порфирий (широта за полярным кругом)'}</div></div>`;
    view.innerHTML = layout(chartSVG(ch, { aspects: an.aspects.filter((a) => S.MAIN.includes(a.a) && S.MAIN.includes(a.b) || ['asc', 'mc'].includes(a.b)) }) + R.positionsTable(ch), head + rep.html);
  },
  solar() {
    const { ch } = natal();
    const p = state.persons[state.current];
    const res = p.resLat && state.solarPlace === 'res' ? { lat: +p.resLat, lon: +p.resLon } : { lat: ch.lat, lon: ch.lon };
    const sr = S.solarReturn(ch, state.solarYear, res.lat, res.lon);
    const rep = R.solarReport(ch, sr);
    state.cache.solarText = rep.text;
    const controls = `<label>Год соляра<input type="number" id="srYear" value="${state.solarYear}" min="1900" max="2100" style="width:110px"></label>
      <label>Место<select id="srPlace"><option value="birth">место рождения</option><option value="res" ${state.solarPlace === 'res' ? 'selected' : ''}>место проживания${p.resLat ? '' : ' (укажите ниже)'}</option></select></label>
      <label>Проживание: широта<input id="resLat" type="number" step="0.0001" value="${p.resLat || ''}" style="width:110px"></label>
      <label>долгота<input id="resLon" type="number" step="0.0001" value="${p.resLon || ''}" style="width:110px"></label>
      <button class="btn" id="srGo">Построить</button>`;
    view.innerHTML = layout(chartSVG(sr, { outer: ch.pos, outerLabel: 'натал', aspects: aspLines(rep.sa, sr.pos, sr.pos) }) + R.positionsTable(sr), rep.html, controls);
    $('#srGo').onclick = () => {
      state.solarYear = +$('#srYear').value; state.solarPlace = $('#srPlace').value;
      const lat = $('#resLat').value, lon = $('#resLon').value;
      if (lat && lon) { p.resLat = lat; p.resLon = lon; store.set('astro.persons', state.persons); }
      render();
    };
  },
  prog() {
    const { ch } = natal();
    const pr = S.progressed(ch, new Date(state.progDate + 'T12:00:00Z'));
    const rep = R.progressionReport(ch, pr);
    state.cache.progText = rep.text;
    const controls = `<label>На дату<input type="date" id="prDate" value="${state.progDate}"></label><button class="btn" id="prGo">Рассчитать</button>`;
    view.innerHTML = layout(chartSVG(ch, { outer: pr.pos, outerLabel: 'прогрессии', aspects: aspLines(rep.pa, pr.pos, ch.pos) }), rep.html, controls);
    $('#prGo').onclick = () => { state.progDate = $('#prDate').value; render(); };
  },
  transit() {
    const { ch } = natal();
    const from = new Date(state.trFrom + 'T12:00:00Z');
    const to = new Date(from); to.setUTCMonth(to.getUTCMonth() + state.trMonths);
    const rep = R.transitReport(ch, from, to);
    state.cache.transitText = rep.text;
    const controls = `<label>С даты<input type="date" id="trFrom" value="${state.trFrom}"></label>
      <label>Период<select id="trMonths">${[1, 3, 6, 12, 24, 36].map((m) => `<option value="${m}" ${m === state.trMonths ? 'selected' : ''}>${m} мес.</option>`).join('')}</select></label>
      <button class="btn" id="trGo">Рассчитать</button>`;
    view.innerHTML = layout(chartSVG(ch, { outer: rep.snap.pos, outerLabel: 'транзиты на ' + from.toLocaleDateString('ru-RU'), outerKind: 'transit', aspects: aspLines(rep.snap.aspects.filter((a) => a.a !== 'moon'), rep.snap.pos, ch.pos) }), rep.html, controls);
    $('#trGo').onclick = () => { state.trFrom = $('#trFrom').value; state.trMonths = +$('#trMonths').value; render(); };
  },
  syn() {
    const { ch } = natal();
    if (state.persons.length < 2) { view.innerHTML = '<p class="empty">Для синастрии добавьте вторую карту (кнопка «+ Новая»).</p>'; return; }
    if (state.partner === state.current || !state.persons[state.partner]) state.partner = state.persons.findIndex((_, i) => i !== state.current);
    const ch2 = personToChart(state.persons[state.partner]);
    const rep = R.synastryReport(ch, ch2);
    state.cache.synText = rep.text;
    const controls = `<label>Партнёр<select id="synP">${state.persons.map((p, i) => i === state.current ? '' : `<option value="${i}" ${i === state.partner ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}</select></label>`;
    view.innerHTML = layout(chartSVG(ch, { outer: ch2.pos, outerLabel: ch2.label, aspects: aspLines(rep.asp.filter((a) => S.MAIN.includes(a.a) && S.MAIN.includes(a.b)), ch.pos, ch2.pos) }), rep.html, controls);
    $('#synP').onchange = (e) => { state.partner = +e.target.value; store.set('astro.partner', state.partner); render(); };
  },
  complex() {
    const { ch, an } = natal();
    const target = new Date(state.trFrom + 'T12:00:00Z');
    const year = target.getUTCFullYear();
    // соляр, действующий на дату: если день рождения ещё не наступил — прошлогодний
    let sr = S.solarReturn(ch, year);
    if (sr.date > target) sr = S.solarReturn(ch, year - 1);
    const srRep = R.solarReport(ch, sr);
    const pr = S.progressed(ch, target);
    const prRep = R.progressionReport(ch, pr);
    const to = new Date(target); to.setUTCMonth(to.getUTCMonth() + 12);
    const trRep = R.transitReport(ch, target, to);
    const cx = R.complexReport(ch, an, sr, srRep, pr, prRep, trRep);
    state.cache.complexText = [cx.text, srRep.text, prRep.text, trRep.text].join('\n');
    const controls = `<label>Период: 12 месяцев с даты<input type="date" id="cxFrom" value="${state.trFrom}"></label><button class="btn" id="cxGo">Анализировать</button><span class="muted">Соляр ${sr.year} · прогрессии · транзиты</span>`;
    view.innerHTML = layout(chartSVG(ch, { outer: trRep.snap.pos, outerLabel: 'транзиты', outerKind: 'transit' }), cx.html + `<details class="sec"><summary>Соляр ${sr.year}</summary><div class="sec-body">${srRep.html}</div></details><details class="sec"><summary>Прогрессии</summary><div class="sec-body">${prRep.html}</div></details><details class="sec"><summary>Транзиты</summary><div class="sec-body">${trRep.html}</div></details>`, controls);
    $('#cxGo').onclick = () => { state.trFrom = $('#cxFrom').value; render(); };
  },
  horary() { renderHorary(view); },
  chat() {
    renderChat(view, buildAIContext);
  },
};

// Контекст для ИИ: все отчёты в текстовом виде
function buildAIContext() {
  const nat = natal(); if (!nat) return null;
  const { ch, an } = nat;
  const p = state.persons[state.current];
  const today = new Date();
  const parts = [`ЧЕЛОВЕК: ${p.name}, рождение ${p.date} ${p.time} (${p.tz}), ${p.place || ''} (${p.lat}, ${p.lon}). Сегодня ${today.toISOString().slice(0, 10)}.`];
  parts.push('=== НАТАЛЬНАЯ КАРТА ===\n' + R.natalReport(ch, an).text);
  let sr = S.solarReturn(ch, today.getFullYear()); if (sr.date > today) sr = S.solarReturn(ch, today.getFullYear() - 1);
  const srRep = R.solarReport(ch, sr);
  parts.push('=== ТЕКУЩИЙ СОЛЯР ===\n' + srRep.text);
  const pr = S.progressed(ch, today); const prRep = R.progressionReport(ch, pr);
  parts.push('=== ПРОГРЕССИИ НА СЕГОДНЯ ===\n' + prRep.text);
  const to = new Date(today); to.setUTCMonth(to.getUTCMonth() + 12);
  const trRep = R.transitReport(ch, today, to);
  parts.push('=== ТРАНЗИТЫ НА 12 МЕСЯЦЕВ ===\n' + trRep.text);
  parts.push('=== КОМПЛЕКСНЫЙ АНАЛИЗ ===\n' + R.complexReport(ch, an, sr, srRep, pr, prRep, trRep).text);
  if (state.persons.length > 1) {
    const pi = state.partner !== state.current && state.persons[state.partner] ? state.partner : state.persons.findIndex((_, i) => i !== state.current);
    const ch2 = personToChart(state.persons[pi]);
    parts.push(`=== СИНАСТРИЯ С ${state.persons[pi].name} ===\n` + R.synastryReport(ch, ch2).text);
  }
  return { name: p.name, text: parts.join('\n\n') };
}

function render() {
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === state.tab));
  if (!state.persons.length && state.tab !== 'horary') { view.innerHTML = '<p class="empty">Введите данные рождения и нажмите «Рассчитать и сохранить». Хорарный калькулятор работает без карты рождения.</p>'; return; }
  view.innerHTML = '<p class="loading">Расчёт…</p>';
  setTimeout(() => {
    try { RENDER[state.tab](); } catch (err) { console.error(err); view.innerHTML = `<p class="empty">Ошибка расчёта: ${escapeHtml(err.message)}</p>`; }
  }, 10);
}

// ---------- Старт ----------
fillSelect();
if (state.persons.length) { if (!state.persons[state.current]) state.current = 0; fillForm(state.persons[state.current]); form.classList.add('hidden'); }
render();
