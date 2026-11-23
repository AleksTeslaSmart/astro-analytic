// Генерация отчётов (HTML + текст для ИИ) по всем видам анализа.
import { SIGNS, P, MAIN, RULERS, fmtDeg, angDist, aspectsBetween, signOf, houseOf, transitEvents, transitHouseIngresses, transitSnapshot } from './astro.js';
import { fullNatalAnalysis, dignity, EL_NAME, CROSS_NAME, ZONE_NAME, QUAD_NAME, PRINC_NAME, themeCounter, houseRulers } from './analysis.js';
import * as N from './texts/natal.js';
import { aspectText, ASPECT_KIND_TEXT, synPairText, SYN_SPHERES } from './texts/aspects.js';
import * as F from './texts/forecast.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const name = (id) => (P[id] ? P[id].name : id === 'asc' ? 'Асцендент' : id === 'mc' ? 'MC' : id);
const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const dstr = (d) => d.toLocaleDateString('ru-RU');

function section(title, body, open = false) {
  return `<details class="sec"${open ? ' open' : ''}><summary>${title}</summary><div class="sec-body">${body}</div></details>`;
}
function item(head, text, cls = '') {
  return `<div class="item ${cls}"><div class="item-head">${head}</div>${text ? `<div class="item-text">${text}</div>` : ''}</div>`;
}

export function positionsTable(chart, extraCol = null) {
  let rows = '';
  for (const id of [...MAIN, 'node', 'lilith', 'asc', 'mc']) {
    const p = chart.pos[id]; if (!p) continue;
    const dg = MAIN.includes(id) ? dignity(id, p.sign, chart.day) : { label: '' };
    rows += `<tr><td>${P[id] ? P[id].glyph + '︎ ' : ''}${name(id)}</td><td>${fmtDeg(p.lon)}${p.retro ? ' <b title="ретроградно">R</b>' : ''}</td><td>${roman[p.house] || ''}</td><td class="muted">${dg.label || ''}</td>${extraCol ? `<td>${extraCol(id, p) ?? ''}</td>` : ''}</tr>`;
  }
  return `<table class="tbl"><thead><tr><th>Точка</th><th>Положение</th><th>Дом</th><th>Достоинство</th>${extraCol ? '<th></th>' : ''}</tr></thead><tbody>${rows}</tbody></table>`;
}
function cuspsTable(chart) {
  let rows = '';
  for (let h = 1; h <= 12; h++) rows += `<tr><td>${roman[h]}</td><td>${fmtDeg(chart.houses.cusps[h])}</td></tr>`;
  return `<table class="tbl small"><thead><tr><th>Дом</th><th>Куспид</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ================= НАТАЛ =================
export function natalReport(chart, an = fullNatalAnalysis(chart)) {
  const parts = [], txt = [];
  const c = an.core;
  // Общая характеристика
  const lord = an.lord;
  let overview = '';
  overview += item('Тип космограммы: ' + an.shape.name, an.shape.text);
  overview += item(`Рождение ${chart.day ? 'дневное' : 'ночное'}`, chart.day ? 'Солнце над горизонтом: сильнее Солнце и дневные обители планет, поведение более «оформленное», ориентированное вовне.' : 'Солнце под горизонтом: сильнее Луна и ночные обители, больше спонтанности, глубины и внутреннего содержания.');
  overview += item(`Сильнейшая планета (владыка карты): ${name(lord)}`, N.PLANET_MEANING[lord].core + ' Именно её темы окрашивают всю жизнь.');
  const top3 = an.ranked.slice(0, 4).map(([id, v]) => `${name(id)} (${v})`).join(', ');
  const weak = an.ranked.slice(-3).map(([id, v]) => `${name(id)} (${v})`).join(', ');
  overview += item('Рейтинг силы планет', `Сильные: ${top3}. Слабые: ${weak}. Сила учитывает достоинства, угловые дома, аспекты, управление Асцендентом.`);
  overview += item(`Солнце в ${SIGNS[chart.pos.sun.sign].loc}, Луна в ${SIGNS[chart.pos.moon.sign].loc}, Асцендент в ${SIGNS[signOf(chart.houses.asc)].loc}`, 'Солнце — сознательная цель, Луна — эмоциональная природа, Асцендент — способ проявления. Их сочетание даёт основной портрет.');
  parts.push(section('Общая характеристика', overview, true));
  txt.push(`ТИП КАРТЫ: ${an.shape.name}. Рождение ${chart.day ? 'дневное' : 'ночное'}. Владыка карты: ${name(lord)}. Сильные планеты: ${top3}. Слабые: ${weak}.`);

  // Ядро космограммы
  const balance = (obj, names) => Object.entries(obj).map(([k, v]) => `${names[k]}: ${Math.round(v * 10) / 10}`).join(' · ');
  let coreHtml = '';
  coreHtml += item('Стихии', balance(c.el, EL_NAME) + '<br>' + (c.dEl.dominant ? N.ELEMENT_TEXT[c.dEl.dominant] : 'Выраженного преобладания стихии нет — гармоничное распределение.') + ' ' + (c.el[c.dEl.weakest] <= 2 ? N.ELEMENT_LACK[c.dEl.weakest] : ''));
  coreHtml += item('Кресты', balance(c.cr, CROSS_NAME) + '<br>' + (c.dCr.dominant ? N.CROSS_TEXT[c.dCr.dominant] : 'Кресты уравновешены.'));
  coreHtml += item('Зоны Зодиака', balance(c.zn, { 1: '1-я', 2: '2-я', 3: '3-я' }) + '<br>' + (c.dZn.dominant ? 'Выделена ' + ZONE_NAME[c.dZn.dominant] + '.' : 'Зоны уравновешены.'));
  coreHtml += item('Квадранты Зодиака', balance(c.qd, { 1: 'I', 2: 'II', 3: 'III', 4: 'IV' }) + '<br>' + (c.dQd.dominant ? 'Выделен ' + QUAD_NAME[c.dQd.dominant] + '.' : 'Квадранты уравновешены.'));
  coreHtml += item('Полусферы', `Верх ${c.hemiNS.upper} / низ ${c.hemiNS.lower} · восток ${c.hemiEW.east} / запад ${c.hemiEW.west}<br>${c.hemiNS.upper > c.hemiNS.lower * 1.5 ? 'Верхняя полусфера: жизнь направлена вовне, на общество и карьеру. ' : c.hemiNS.lower > c.hemiNS.upper * 1.5 ? 'Нижняя полусфера: важнее внутренний мир, семья, личная жизнь. ' : ''}${c.hemiEW.east > c.hemiEW.west * 1.5 ? 'Восточная полусфера: человек сам творит свою судьбу, опирается на себя.' : c.hemiEW.west > c.hemiEW.east * 1.5 ? 'Западная полусфера: судьба во многом строится через других людей и обстоятельства.' : ''}`);
  const lv = c.levels;
  coreHtml += item(`Ядро космограммы: ${c.integrity}`, `Начала по уровням — зона: ${PRINC_NAME[lv.zone]}, стихия: ${PRINC_NAME[lv.element]}, крест: ${PRINC_NAME[lv.cross]}, квадрант: ${PRINC_NAME[lv.quadrant]}, полусферы: ${PRINC_NAME[lv.hemisphere]}.<br>${c.corePrinciple ? 'Доминирует ' + N.PRINCIPLE_TEXT[c.corePrinciple] : 'Единого начала нет: ядро требует сознательного выбора направления развития (по Глобе — «расколотое» или ещё не сформированное ядро встречается у большинства людей).'}`);
  // кармический статус
  let ksRows = '';
  for (const id of MAIN) {
    const k = an.ks[id];
    ksRows += `<tr><td>${name(id)}</td><td class="${k.total > 0 ? 'pos' : k.total < 0 ? 'neg' : ''}">${k.total > 0 ? '+' : ''}${k.total}${k.royal ? ' ♛' : ''}</td><td class="muted">${k.items.map(([l, v]) => `${l} (${v > 0 ? '+' : ''}${v})`).join('; ')}</td></tr>`;
  }
  const absScore = MAIN.reduce((a, id) => a + an.ks[id].total, 0);
  coreHtml += item(`Кармический статус планет (балл карты: ${absScore > 0 ? '+' : ''}${absScore})`, `<table class="tbl small"><tbody>${ksRows}</tbody></table><p class="muted">Положительный статус — достоинство, опора; отрицательный — комплекс, который нужно прорабатывать. ±7 и более — «королевский» статус. Сумма ${absScore > 0 ? 'положительна: ядро в процессе формирования' : absScore < 0 ? 'отрицательна: ядро расколото, важна работа над слабыми планетами' : 'равна нулю: свобода выбора направления'}.</p>`);
  parts.push(section('Ядро космограммы и кармический статус (по Глобе)', coreHtml));
  txt.push(`ЯДРО: стихии ${balance(c.el, EL_NAME)}; кресты ${balance(c.cr, CROSS_NAME)}; ядро ${c.integrity}, начало ${c.corePrinciple ? PRINC_NAME[c.corePrinciple] : 'нет'}. Кармич. статус: ${MAIN.map((id) => `${name(id)} ${an.ks[id].total}`).join(', ')}.`);

  // Планеты
  let pl = '';
  for (const id of [...MAIN, 'node', 'lilith']) {
    const p = chart.pos[id];
    const dg = MAIN.includes(id) ? dignity(id, p.sign, chart.day) : { key: 'none' };
    let t = `<p class="muted">${N.PLANET_MEANING[id].core}</p>`;
    t += `<p><b>В знаке ${SIGNS[p.sign].gen}:</b> ${N.PLANET_IN_SIGN[id][p.sign]}</p>`;
    t += `<p><b>В ${roman[p.house]} доме:</b> ${N.PLANET_IN_HOUSE[id][p.house]}</p>`;
    if (dg.key !== 'none') t += `<p class="note">${N.DIGNITY_TEXT[dg.key] || ''}</p>`;
    if (p.retro) t += `<p class="note">${N.RETRO_TEXT}</p>`;
    if (angDist(p.lon, chart.houses.asc) < 5) t += `<p class="note">${name(id)} ${N.ANGLE_CONJ.asc}</p>`;
    if (angDist(p.lon, chart.houses.mc) < 5) t += `<p class="note">${name(id)} ${N.ANGLE_CONJ.mc}</p>`;
    const ruled = an.rulers.filter((r) => r.rulers.some((x) => x.id === id)).map((r) => roman[r.house]);
    if (ruled.length) t += `<p class="muted">Управляет домами: ${ruled.join(', ')}.</p>`;
    if (id === 'node') t += `<p class="muted">Кету (Южный узел) — в ${SIGNS[signOf(p.lon + 180)].loc}, ${roman[houseOf(p.lon + 180, chart.houses.cusps)]} дом: прошлый опыт и привычки, на которые не стоит опираться чрезмерно.</p>`;
    pl += item(`${P[id].glyph}︎ ${name(id)} — ${fmtDeg(p.lon)}${p.retro ? ' R' : ''}, ${roman[p.house]} дом${dg.label ? ' · ' + dg.label : ''}`, t);
    txt.push(`${name(id)}: ${fmtDeg(p.lon)}${p.retro ? ' R' : ''}, ${p.house} дом${dg.label ? ', ' + dg.label : ''}.`);
  }
  pl += item(`Асцендент — ${fmtDeg(chart.houses.asc)}`, `${N.PLANET_MEANING.asc.core} ${N.SIGN_MEANING[signOf(chart.houses.asc)]}`);
  pl += item(`MC — ${fmtDeg(chart.houses.mc)}`, `${N.PLANET_MEANING.mc.core} ${N.SIGN_MEANING[signOf(chart.houses.mc)]}`);
  parts.push(section('Планеты в знаках и домах', pl));
  txt.push(`ASC ${fmtDeg(chart.houses.asc)}, MC ${fmtDeg(chart.houses.mc)}.`);

  // Дома и управители
  let hs = '';
  for (const r of an.rulers) {
    const inHouse = MAIN.filter((id) => chart.pos[id].house === r.house).map(name);
    const rul = r.rulers.map((x) => `${name(x.id)} (в ${roman[x.house]} доме, ${SIGNS[x.sign].name})`).join(', ');
    let t = `<p class="muted">${N.HOUSE_MEANING[r.house].text}</p>`;
    t += `<p>Куспид в знаке ${SIGNS[r.sign].gen}: ${N.SIGN_MEANING[r.sign].split(':')[1] || ''}</p>`;
    t += `<p><b>Управитель:</b> ${rul}. ${N.rulerInHouseText(r.house, r.rulers[0].house)}</p>`;
    t += inHouse.length ? `<p><b>Планеты в доме:</b> ${inHouse.join(', ')} — сфера жизни активна и значима.</p>` : '<p class="muted">Планет в доме нет — сфера раскрывается через управителя.</p>';
    hs += item(`${N.HOUSE_MEANING[r.house].name}: ${N.HOUSE_MEANING[r.house].theme}`, t);
    txt.push(`Дом ${r.house} (${SIGNS[r.sign].name}): управитель ${r.rulers.map((x) => `${name(x.id)} в ${x.house} доме`).join(', ')}; планеты: ${inHouse.join(', ') || 'нет'}.`);
  }
  hs += item('Диспозиторы', `${MAIN.map((id) => `${name(id)} → ${name(an.disp.disp[id])}`).join(', ')}.<br>${an.disp.finals.length ? 'Финальный(е) диспозитор(ы): ' + an.disp.finals.map(name).join(', ') + ' — планета в своей обители, к которой сходятся цепочки управления; её роль в карте особая.' : 'Единого финального диспозитора нет — несколько центров влияния (взаимные рецепции).'}`);
  parts.push(section('Дома и их управители', hs + cuspsTable(chart)));

  // Аспекты
  let as = '';
  for (const a of an.aspects) {
    as += item(`${name(a.a)} ${a.glyph} ${name(a.b)} — ${a.name}, орбис ${a.diff.toFixed(1)}°${a.applying === true ? ', сходящийся' : a.applying === false ? ', расходящийся' : ''}`, aspectText(a.a, a.b, a), a.kind);
  }
  parts.push(section(`Аспекты (${an.aspects.length})`, `<p class="muted">${ASPECT_KIND_TEXT.soft} ${ASPECT_KIND_TEXT.hard}</p>` + as));
  txt.push('АСПЕКТЫ: ' + an.aspects.filter((a) => a.major).map((a) => `${name(a.a)} ${a.name} ${name(a.b)} (${a.diff.toFixed(1)}°)`).join('; '));

  // Конфигурации
  if (an.configs.length) {
    const CONF = {
      'Большой трин': 'Замкнутый поток гармонии: большой талант и лёгкость в стихии трина; риск — самодовольство и пассивность.',
      'Тау-квадрат': 'Напряжённая фигура: постоянный внутренний «мотор», вершина (апекс) показывает точку разрядки и главную жизненную задачу.',
      'Большой крест': 'Предельное напряжение по четырём направлениям: огромная сила при умении выдерживать давление, судьба с испытаниями.',
      'Йод («перст судьбы»)': 'Кармическая фигура: апекс указывает особую миссию, к которой жизнь подводит через поворотные события.',
      'Малое управление (оппозиция, разрешённая трином и секстилем)': 'Напряжение оппозиции находит выход через планету-апекс — умение управлять противоречием.',
      'Малый трин': 'Талант и гармоничный навык, который легко развить.',
    };
    let cf = '';
    for (const k of an.configs) cf += item(`${k.type}: ${k.ids.map(name).join(', ')}${k.apex ? ' (апекс — ' + name(k.apex) + ')' : ''}`, CONF[k.type] || 'Скопление планет делает тему знака/дома центральной в жизни; энергия концентрируется, но может не хватать баланса.');
    parts.push(section('Конфигурации аспектов', cf));
    txt.push('КОНФИГУРАЦИИ: ' + an.configs.map((k) => `${k.type} (${k.ids.map(name).join(', ')})`).join('; '));
  }

  // Синтез по сферам
  parts.push(section('Синтез по сферам жизни', synthesis(chart, an)));
  // Возрастные периоды
  parts.push(section('Планетарные возрасты', N.PLANET_AGES.map((a) => item(`${a.from}–${a.to === 120 ? '…' : a.to} лет — ${name(a.id)} (сила ${an.strength[a.id]})`, `${a.text}. ${an.strength[a.id] >= 5 ? 'Планета сильна — период обещает раскрытие возможностей.' : an.strength[a.id] <= 1 ? 'Планета ослаблена — период требует больше усилий.' : 'Средняя сила планеты.'}`)).join('')));
  return { html: parts.join(''), text: txt.join('\n'), analysis: an };
}

function synthesis(chart, an) {
  const sp = [
    { name: 'Характер и личность', houses: [1], planets: ['sun', 'moon', 'mars'] },
    { name: 'Таланты и творчество', houses: [5], planets: ['sun', 'venus', 'neptune'] },
    { name: 'Деньги и финансы', houses: [2, 8], planets: ['venus', 'jupiter'] },
    { name: 'Карьера и призвание', houses: [10, 6], planets: ['saturn', 'sun', 'jupiter'] },
    { name: 'Любовь и брак', houses: [7, 5], planets: ['venus', 'mars', 'moon'] },
    { name: 'Семья и дом', houses: [4], planets: ['moon'] },
    { name: 'Здоровье', houses: [6, 1], planets: ['sun', 'moon', 'mars'] },
    { name: 'Предназначение и духовный путь', houses: [9, 12], planets: ['node', 'jupiter', 'neptune'] },
  ];
  let out = '';
  for (const s of sp) {
    const lines = [];
    for (const h of s.houses) {
      const r = an.rulers[h - 1];
      const occ = MAIN.filter((id) => chart.pos[id].house === h);
      const ruler = r.rulers[0];
      const rk = an.ks[ruler.id]?.total ?? 0;
      lines.push(`${roman[h]} дом в ${SIGNS[r.sign].loc}: управитель ${name(ruler.id)} в ${roman[ruler.house]} доме (статус ${rk > 0 ? '+' : ''}${rk}) — ${rk > 1 ? 'сфера поддержана' : rk < -1 ? 'сфера требует усилий' : 'нейтрально'}. ${occ.length ? 'В доме: ' + occ.map(name).join(', ') + '.' : ''}`);
    }
    for (const id of s.planets) {
      const p = chart.pos[id];
      const asps = an.aspects.filter((a) => a.major && (a.a === id || a.b === id));
      const soft = asps.filter((a) => a.kind === 'soft').length, hard = asps.filter((a) => a.kind === 'hard').length;
      lines.push(`${name(id)} в ${SIGNS[p.sign].loc}, ${roman[p.house]} дом: гармоничных аспектов ${soft}, напряжённых ${hard}.`);
    }
    const score = s.houses.reduce((a, h) => a + (an.ks[an.rulers[h - 1].rulers[0].id]?.total || 0), 0) + s.planets.reduce((a, id) => a + (an.aspects.filter((x) => x.major && (x.a === id || x.b === id)).reduce((b, x) => b + (x.kind === 'soft' ? 1 : x.kind === 'hard' ? -1 : 0), 0)), 0);
    const verdict = score >= 3 ? 'Сфера благоприятна: природные возможности и поддержка.' : score <= -3 ? 'Сфера напряжённая: здесь главные уроки, рост через преодоление.' : 'Сфера смешанная: результат зависит от сознательных усилий.';
    out += item(`${s.name} — ${verdict}`, '<ul>' + lines.map((l) => `<li>${l}</li>`).join('') + '</ul>');
  }
  return out;
}

// ================= СОЛЯР =================
export function solarReport(natal, sr) {
  const parts = [], txt = [];
  const ascH = houseOf(sr.houses.asc, natal.houses.cusps);
  const mcH = houseOf(sr.houses.mc, natal.houses.cusps);
  let o = item(`Момент соляра: ${sr.date.toLocaleString('ru-RU', { timeZone: 'UTC' })} UTC`, `Солнце возвращается в натальную точку ${fmtDeg(natal.pos.sun.lon)}.`);
  o += item(`ASC соляра (${fmtDeg(sr.houses.asc)}) в ${roman[ascH]} натальном доме`, F.SOLAR_ASC_IN_NATAL_HOUSE[ascH]);
  o += item(`Солнце в ${roman[sr.pos.sun.house]} доме соляра`, F.SOLAR_SUN_IN_HOUSE[sr.pos.sun.house]);
  o += item(`MC соляра в ${roman[mcH]} натальном доме`, `Социальные цели года связаны со сферой: ${N.HOUSE_MEANING[mcH].theme}.`);
  const srAscSign = signOf(sr.houses.asc);
  o += item(`Асцендент соляра в ${SIGNS[srAscSign].loc}`, `Стиль года: ${N.SIGN_MEANING[srAscSign]} Управитель года — ${name(RULERS[srAscSign][0])}.`);
  parts.push(section('Главные темы года', o, true));
  txt.push(`СОЛЯР ${sr.year}: ASC ${fmtDeg(sr.houses.asc)} в ${ascH} натальном доме; Солнце в ${sr.pos.sun.house} доме соляра; MC соляра в ${mcH} натальном доме.`);
  // Планеты по домам соляра
  let pl = '';
  for (const id of MAIN) {
    const p = sr.pos[id];
    pl += item(`${name(id)} — ${fmtDeg(p.lon)}${p.retro ? ' R' : ''}, ${roman[p.house]} дом соляра`, `${F.SOLAR_PLANET_HINT[id] || ''} Сфера: ${N.HOUSE_MEANING[p.house].theme}.`);
    txt.push(`Соляр: ${name(id)} ${fmtDeg(p.lon)} в ${p.house} доме соляра.`);
  }
  parts.push(section('Планеты в домах соляра', pl));
  // Аспекты соляра и к радиксу
  const sa = aspectsBetween(sr.pos, sr.pos, [...MAIN, 'asc', 'mc'], [...MAIN, 'asc', 'mc'], { minor: false }).filter((a) => !(a.a === 'asc' && a.b === 'mc'));
  parts.push(section(`Аспекты соляра (${sa.length})`, sa.map((a) => item(`${name(a.a)} ${a.glyph} ${name(a.b)} — ${a.name} (${a.diff.toFixed(1)}°)`, aspectText(a.a, a.b, a), a.kind)).join('')));
  const sn = aspectsBetween(sr.pos, natal.pos, [...MAIN, 'asc', 'mc'], [...MAIN, 'asc', 'mc'], { minor: false, orbOverride: 3 }).filter((a) => a.a !== 'sun' || a.b !== 'sun');
  parts.push(section(`Соляр к радиксу (${sn.length})`, '<p class="muted">Точки соляра, задевающие натальные планеты, выделяют темы года (орбис 3°).</p>' + sn.slice(0, 40).map((a) => item(`${name(a.a)} соляра ${a.glyph} ${name(a.b)} натальн. — ${a.name} (${a.diff.toFixed(1)}°)`, F.transitAspectText(a.a, a.b, a), a.kind)).join('')));
  txt.push('Аспекты соляра: ' + sa.map((a) => `${name(a.a)} ${a.name} ${name(a.b)}`).join('; '));
  // Управители
  let hs = '';
  for (const r of houseRulers(sr)) hs += item(`${roman[r.house]} дом соляра (${SIGNS[r.sign].name}): ${N.HOUSE_MEANING[r.house].theme}`, `Управитель ${name(r.rulers[0].id)} в ${roman[r.rulers[0].house]} доме соляра. ${N.rulerInHouseText(r.house, r.rulers[0].house)}`);
  parts.push(section('Управители домов соляра', hs));
  return { html: parts.join(''), text: txt.join('\n'), ascH, mcH, sa, sn };
}

// ================= ПРОГРЕССИИ =================
export function progressionReport(natal, pr) {
  const parts = [], txt = [];
  let o = item(`Прогрессивная дата: ${dstr(pr.date)} (возраст ${pr.years.toFixed(1)} лет)`, 'Вторичные прогрессии: один день после рождения соответствует одному году жизни. MC — по дуге Солнца, ASC — от прогрессивного MC для места рождения.');
  const pm = pr.pos.moon;
  o += item(`Прогрессивная Луна: ${fmtDeg(pm.lon)}, ${roman[pm.natalHouse]} натальный дом`, `${F.PROG_MOON_SIGN[pm.sign]} Фокус эмоциональной жизни на ближайшие ~2,5 года — сфера ${roman[pm.natalHouse]} дома: ${N.HOUSE_MEANING[pm.natalHouse].theme}.`);
  const ps = pr.pos.sun;
  o += item(`Прогрессивное Солнце: ${fmtDeg(ps.lon)}, ${roman[ps.natalHouse]} натальный дом`, `Основная линия самореализации сейчас — ${N.HOUSE_MEANING[ps.natalHouse].theme}. ${ps.sign !== natal.pos.sun.sign ? 'Солнце уже сменило знак рождения: ' + F.PROG_SUN_SIGN_CHANGE : ''} Солнце перейдёт в следующий знак примерно через ${((30 - (ps.lon % 30)) / 0.9856).toFixed(0)} лет.`);
  o += item(`Прогрессивный ASC ${fmtDeg(pr.houses.asc)}, MC ${fmtDeg(pr.houses.mc)}`, `MC в ${SIGNS[signOf(pr.houses.mc)].loc}: социальные цели окрашены этим знаком. ${N.SIGN_MEANING[signOf(pr.houses.mc)]}`);
  // смена направлений
  const changes = MAIN.filter((id) => (pr.pos[id].retro !== natal.pos[id].retro) && !['sun', 'moon'].includes(id));
  if (changes.length) o += item('Смена направления движения', changes.map((id) => `${name(id)} ${pr.pos[id].retro ? 'стал ретроградным' : 'стал директным'} в прогрессиях`).join('; ') + ' — важный поворот внутреннего развития в теме планеты.');
  parts.push(section('Главное', o, true));
  txt.push(`ПРОГРЕССИИ на ${dstr(pr.targetDate)} (возраст ${pr.years.toFixed(1)}): Луна ${fmtDeg(pm.lon)} в ${pm.natalHouse} натальн. доме; Солнце ${fmtDeg(ps.lon)}; ASC ${fmtDeg(pr.houses.asc)}; MC ${fmtDeg(pr.houses.mc)}.`);
  const pa = aspectsBetween(pr.pos, natal.pos, ['sun', 'moon', 'mercury', 'venus', 'mars', 'asc', 'mc'], [...MAIN, 'asc', 'mc'], { minor: false, orbOverride: 1 })
    .filter((a) => !(a.a === a.b && a.diff < 0.01));
  let as = `<p class="muted">${F.PROG_ASPECT_NOTE}</p>`;
  for (const a of pa) as += item(`прогр. ${name(a.a)} ${a.glyph} натальн. ${name(a.b)} — ${a.name} (${a.diff.toFixed(2)}°)`, F.transitAspectText(a.a, a.b, a) + ' Внутренний процесс: ' + aspectText(a.a, a.b, a), a.kind);
  parts.push(section(`Прогрессивные аспекты к радиксу (${pa.length})`, as));
  txt.push('Прогр. аспекты: ' + pa.map((a) => `прогр. ${name(a.a)} ${a.name} натальн. ${name(a.b)} (${a.diff.toFixed(2)}°)`).join('; '));
  const ppa = aspectsBetween(pr.pos, pr.pos, MAIN, MAIN, { minor: false, orbOverride: 1 });
  parts.push(section(`Аспекты внутри прогрессивной карты (${ppa.length})`, ppa.map((a) => item(`${name(a.a)} ${a.glyph} ${name(a.b)} — ${a.name} (${a.diff.toFixed(2)}°)`, aspectText(a.a, a.b, a), a.kind)).join('')));
  parts.push(section('Положения прогрессивных планет', positionsTable(pr, (id, p) => p.natalHouse ? 'в натал. ' + roman[p.natalHouse] : '')));
  // Луна по годам
  return { html: parts.join(''), text: txt.join('\n'), pa };
}

// ================= ТРАНЗИТЫ =================
export function transitReport(natal, from, to) {
  const parts = [], txt = [];
  const snap = transitSnapshot(natal, from);
  let s = '';
  for (const a of snap.aspects.filter((x) => !['moon'].includes(x.a))) s += item(`${name(a.a)} ${a.glyph} натальн. ${name(a.b)} — ${a.name} (${a.diff.toFixed(1)}°)`, F.transitAspectText(a.a, a.b, a), a.kind);
  parts.push(section(`Транзиты на ${dstr(from)}`, s || '<p class="muted">Значимых аспектов нет.</p>', true));
  const ev = transitEvents(natal, from, to);
  // группируем по силе
  const weightOf = (e) => ({ pluto: 5, neptune: 5, uranus: 5, saturn: 4, jupiter: 3, node: 2, mars: 1 }[e.tp] || 1) + (['sun', 'moon', 'asc', 'mc'].includes(e.np) ? 1 : 0);
  const big = ev.filter((e) => weightOf(e) >= 3);
  const small = ev.filter((e) => weightOf(e) < 3);
  const row = (e) => item(`${dstr(e.start)} – ${dstr(e.end)}${e.openEnd ? '…' : ''}: ${F.TRANSIT_NATURE[e.tp].name} ${e.asp.glyph} ${name(e.np)} (${e.asp.name})`, `${e.exacts.length ? 'Точно: ' + e.exacts.map(dstr).join(', ') + '. ' : 'Транзит в орбисе без точного касания. '}${F.transitAspectText(e.tp, e.np, e.asp)}`, e.asp.kind);
  parts.push(section(`Главные транзиты периода (${big.length})`, big.map(row).join('') || '<p class="muted">Нет</p>', true));
  parts.push(section(`Транзиты Марса и узлов (${small.length})`, small.map(row).join('')));
  txt.push(`ТРАНЗИТЫ ${dstr(from)} – ${dstr(to)}:`);
  for (const e of big) txt.push(`${F.TRANSIT_NATURE[e.tp].name} ${e.asp.name} натальн. ${name(e.np)}: ${dstr(e.start)}–${dstr(e.end)}${e.exacts.length ? ', точно ' + e.exacts.map(dstr).join(', ') : ''}`);
  const ing = transitHouseIngresses(natal, from, to);
  let ih = '';
  for (const i of ing) ih += item(`${i.initial ? 'На начало периода' : dstr(i.date)}: ${name(i.tp)} ${i.initial ? 'в' : 'входит в'} ${roman[i.house]} дом`, F.TRANSIT_HOUSE[i.tp]?.[i.house] || '');
  parts.push(section('Транзиты медленных планет по домам', ih));
  txt.push('Транзиты по домам: ' + ing.map((i) => `${name(i.tp)} ${i.initial ? 'в' : 'входит в'} ${i.house} дом ${i.initial ? '' : dstr(i.date)}`).join('; '));
  // Самые важные периоды: месяцы с наибольшей концентрацией
  const months = {};
  for (const e of big) for (const d of e.exacts.length ? e.exacts : [e.start]) { const k = d.toISOString().slice(0, 7); months[k] = (months[k] || 0) + weightOf(e) * (e.asp.kind === 'hard' ? -1 : e.asp.kind === 'soft' ? 1 : 0.2); }
  const mlist = Object.entries(months).sort((a, b) => a[0].localeCompare(b[0]));
  if (mlist.length) parts.push(section('Календарь напряжённости', '<div class="bars">' + mlist.map(([m, v]) => `<div class="bar"><span>${m}</span><i class="${v >= 0 ? 'soft' : 'hard'}" style="width:${Math.min(100, Math.abs(v) * 8)}%"></i><b>${v > 0 ? '+' : ''}${v.toFixed(1)}</b></div>`).join('') + '</div><p class="muted">Плюс — преобладание гармоничных транзитов (возможности), минус — напряжённых (испытания, перемены).</p>'));
  return { html: parts.join(''), text: txt.join('\n'), events: ev, big, snap, ingresses: ing };
}

// ================= СИНАСТРИЯ =================
export function synastryReport(a, b) {
  const parts = [], txt = [];
  const ids = [...MAIN, 'node', 'asc', 'mc'];
  const asp = aspectsBetween(a.pos, b.pos, ids, ids, { minor: false, orbMul: 0.75 }).filter((x) => !(x.a === 'mc' && x.b === 'mc'));
  const nA = a.label || 'Партнёр 1', nB = b.label || 'Партнёр 2';
  // сферы
  let sp = '';
  let total = 0;
  for (const [, sph] of Object.entries(SYN_SPHERES)) {
    let score = 0; const found = [];
    for (const [x, y] of sph.pairs) {
      for (const s of asp.filter((q) => (q.a === x && q.b === y) || (q.a === y && q.b === x))) {
        const v = (s.kind === 'soft' ? 2 : s.kind === 'conj' ? 1.5 : -1) * (s.diff < 2 ? 1.5 : 1);
        score += v; found.push(`${name(s.a)} (${nA}) ${s.name} ${name(s.b)} (${nB})`);
      }
    }
    total += score;
    const verdict = score >= 4 ? 'сильная' : score >= 1.5 ? 'хорошая' : score > -1.5 ? 'средняя' : 'напряжённая';
    sp += item(`${sph.name} совместимость: ${verdict} (${score > 0 ? '+' : ''}${score.toFixed(1)})`, found.length ? found.join('; ') : 'Прямых контактов немного — эта сфера строится сознательно.');
    txt.push(`${sph.name}: ${verdict} (${score.toFixed(1)}); ${found.join('; ')}`);
  }
  // стихии светил
  const elA = SIGNS[a.pos.sun.sign].el, elB = SIGNS[b.pos.sun.sign].el;
  const compatEl = { fire: ['fire', 'air'], air: ['air', 'fire'], earth: ['earth', 'water'], water: ['water', 'earth'] };
  sp += item(`Стихии Солнц: ${EL_NAME[elA]} и ${EL_NAME[elB]}`, compatEl[elA].includes(elB) ? 'Стихии совместимы: естественная взаимная поддержка темпераментов.' : 'Стихии разные по природе: партнёры дополняют друг друга, но требуется терпение к различиям темпераментов.');
  parts.push(section(`Совместимость по сферам (общий балл ${total > 0 ? '+' : ''}${total.toFixed(1)})`, sp, true));
  // Аспекты
  let as = '';
  for (const s of asp) as += item(`${name(s.a)} (${nA}) ${s.glyph} ${name(s.b)} (${nB}) — ${s.name}, ${s.diff.toFixed(1)}°`, (synPairText(s.a, s.b) || aspectText(s.a, s.b, s)) + ` ${s.kind === 'soft' ? 'Гармоничный контакт.' : s.kind === 'hard' ? 'Напряжённый контакт — источник притяжения и конфликтов.' : 'Слияние энергий.'}`, s.kind);
  parts.push(section(`Взаимные аспекты (${asp.length})`, as));
  // Наложение домов
  const overlay = (x, y, nx, ny) => MAIN.map((id) => {
    const h = houseOf(x.pos[id].lon, y.houses.cusps);
    return item(`${name(id)} (${nx}) в ${roman[h]} доме (${ny})`, `${nx} активизирует у ${ny} сферу «${N.HOUSE_MEANING[h].theme}» через качества ${P[id].gen}.${[1, 5, 7, 8].includes(h) && ['sun', 'moon', 'venus', 'mars'].includes(id) ? ' Сильный показатель личного притяжения.' : ''}`);
  }).join('');
  parts.push(section(`Планеты ${nA} в домах ${nB}`, overlay(a, b, nA, nB)));
  parts.push(section(`Планеты ${nB} в домах ${nA}`, overlay(b, a, nB, nA)));
  // Сильные стороны, конфликты, карма
  const PERS = ['sun', 'moon', 'mercury', 'venus', 'mars', 'asc'];
  const LOVE = ['sun', 'moon', 'venus', 'mars', 'asc'];
  const both = (s, A, B) => (A.includes(s.a) && B.includes(s.b)) || (B.includes(s.a) && A.includes(s.b));
  const strong = asp.filter((s) => s.kind !== 'hard' && both(s, PERS, [...PERS, 'jupiter']) && !(s.kind === 'conj' && both(s, ['mars'], ['mars'])));
  const conflicts = asp.filter((s) => s.kind === 'hard' && both(s, LOVE, [...LOVE, 'saturn', 'pluto', 'uranus']));
  const karmic = asp.filter((s) => both(s, ['node', 'saturn', 'pluto'], ['sun', 'moon', 'venus', 'asc']));
  const lbl = (s) => `${name(s.a)} (${nA})–${name(s.b)} (${nB}): ${s.name}`;
  let sum = item('Сильные стороны', strong.length ? strong.map(lbl).join('; ') : 'Нет ярких гармоничных контактов личных планет.');
  sum += item('Зоны конфликтов', conflicts.length ? conflicts.map(lbl).join('; ') : 'Выраженных конфликтных контактов нет.');
  sum += item('Кармические связи', karmic.length ? karmic.map(lbl).join('; ') + ' — контакты узлов, Сатурна и Плутона со светилами, Венерой и Асцендентом указывают на судьбоносный, «уроковый» характер связи.' : 'Явных кармических показателей немного.');
  parts.unshift(section('Итог', sum, true));
  txt.unshift(`СИНАСТРИЯ ${nA} + ${nB}: сильные стороны: ${strong.map(lbl).join('; ')}. Конфликты: ${conflicts.map(lbl).join('; ')}. Карма: ${karmic.map(lbl).join('; ')}.`);
  return { html: parts.join(''), text: txt.join('\n'), asp };
}

// ================= КОМПЛЕКСНЫЙ АНАЛИЗ =================
export function complexReport(natal, an, sr, srRep, pr, prRep, trRep) {
  const tc = themeCounter();
  // натальная значимость
  for (const id of an.ranked.slice(0, 3).map((x) => x[0])) tc.planet(id, 2, 'сильная натальная планета');
  for (const k of an.configs) if (k.house) tc.house(k.house, 2, 'стеллиум в натале');
  // соляр
  tc.house(srRep.ascH, 3, 'ASC соляра в натальном доме');
  tc.house(srRep.mcH, 2, 'MC соляра в натальном доме');
  tc.house(sr.pos.sun.house, 2, 'Солнце в доме соляра');
  for (const id of MAIN) if ([1, 4, 7, 10].includes(sr.pos[id].house) && ['jupiter', 'saturn', 'mars', 'uranus', 'pluto'].includes(id)) tc.house(sr.pos[id].house, 1, `${name(id)} в угловом доме соляра`);
  for (const a of srRep.sn.filter((x) => x.diff < 2)) { tc.planet(a.b, 1, `соляр задевает ${name(a.b)}`); }
  // прогрессии
  tc.house(pr.pos.moon.natalHouse, 2, 'прогрессивная Луна в натальном доме');
  tc.house(pr.pos.sun.natalHouse, 1, 'прогрессивное Солнце в натальном доме');
  for (const a of prRep.pa) { tc.planet(a.b, 2, `прогр. ${name(a.a)} ${a.name} натальн. ${name(a.b)}`); tc.planet(a.a, 1, 'активная прогрессивная планета'); }
  // транзиты
  for (const e of trRep.big) { if (P[e.np]) tc.planet(e.np, 1.5, `${F.TRANSIT_NATURE[e.tp].name} ${e.asp.name} ${name(e.np)}`); }
  for (const i of trRep.ingresses) if (['jupiter', 'saturn'].includes(i.tp)) tc.house(i.house, 1.5, `транзитный ${name(i.tp)} в ${i.house} доме`);
  // управители домов — переносим вес планет на дома, которыми они управляют
  const res = tc.result();
  const houseScore = {};
  for (const [h, v] of res.houses) houseScore[h] = (houseScore[h] || 0) + v;
  for (const [id, v] of res.planets) {
    for (const r of an.rulers) if (r.rulers.some((x) => x.id === id)) houseScore[r.house] = (houseScore[r.house] || 0) + v * 0.5;
    const h = natal.pos[id]?.house; if (h) houseScore[h] = (houseScore[h] || 0) + v * 0.3;
  }
  const topHouses = Object.entries(houseScore).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const topPlanets = res.planets.slice(0, 5);
  let o = '<p class="muted">Комплексный анализ сопоставляет натал, соляр, прогрессии и транзиты. Тема, которая повторяется по нескольким методам, — самая вероятная к реализации (принцип «повторяемости показателей»).</p>';
  o += item('Главные сферы периода', '<ol>' + topHouses.map(([h, v]) => `<li><b>${N.HOUSE_MEANING[h].name}</b> — ${N.HOUSE_MEANING[h].theme} (вес ${v.toFixed(1)})</li>`).join('') + '</ol>');
  o += item('Ключевые планеты периода', '<ol>' + topPlanets.map(([id, v]) => `<li><b>${name(id)}</b> (вес ${v.toFixed(1)}) — ${F.NATAL_POINT_THEME[id] || ''}</li>`).join('') + '</ol>');
  // тон периода
  const hard = trRep.big.filter((e) => e.asp.kind === 'hard').length + prRep.pa.filter((a) => a.kind === 'hard').length;
  const soft = trRep.big.filter((e) => e.asp.kind === 'soft').length + prRep.pa.filter((a) => a.kind === 'soft').length;
  const tone = soft > hard * 1.3 ? 'Период скорее благоприятный: преобладают гармоничные показатели, можно активно реализовывать планы.' : hard > soft * 1.3 ? 'Период напряжённый: много испытаний и перемен; важно не форсировать события, работать над слабыми местами, беречь здоровье.' : 'Период смешанный: возможности и испытания уравновешены, результат зависит от выбора.';
  o += item('Общий тон', `${tone} (гармоничных показателей: ${soft}, напряжённых: ${hard})`);
  // Повторы по методам
  const byHouse = {};
  for (const n of res.notes.filter((x) => x.kind === 'house')) (byHouse[n.h] ||= []).push(n.why);
  const reps = Object.entries(byHouse).filter(([, w]) => w.length >= 2);
  o += item('Повторяющиеся показатели', reps.length ? '<ul>' + reps.map(([h, w]) => `<li><b>${roman[h]} дом</b>: ${w.join('; ')}</li>`).join('') + '</ul>' : 'Явных повторов по домам нет — события распределены по разным сферам.');
  const byPl = {};
  for (const n of res.notes.filter((x) => x.kind === 'planet')) (byPl[n.id] ||= []).push(n.why);
  const repP = Object.entries(byPl).filter(([, w]) => w.length >= 2);
  if (repP.length) o += item('Планеты, задействованные несколькими методами', '<ul>' + repP.map(([id, w]) => `<li><b>${name(id)}</b>: ${w.slice(0, 6).join('; ')}${w.length > 6 ? '…' : ''}</li>`).join('') + '</ul>');
  // Прогноз-выводы
  const concl = topHouses.slice(0, 3).map(([h]) => {
    const r = an.rulers[h - 1].rulers[0];
    const st = an.ks[r.id]?.total || 0;
    return `<li><b>${N.HOUSE_MEANING[h].theme}</b>: тема активирована несколькими методами. Натальный управитель ${name(r.id)} ${st > 0 ? 'сильный — потенциал успешной реализации' : st < 0 ? 'ослаблен — результат потребует усилий, возможны трудности' : 'нейтрален'}. ${F.SOLAR_ASC_IN_NATAL_HOUSE[h] && +h === srRep.ascH ? 'Соляр подтверждает: ' + F.SOLAR_ASC_IN_NATAL_HOUSE[h] : ''}</li>`;
  }).join('');
  o += item('Выводы и прогноз', `<ul>${concl}</ul>`);
  const text = `КОМПЛЕКСНЫЙ АНАЛИЗ: главные дома ${topHouses.map(([h, v]) => `${h} (${v.toFixed(1)})`).join(', ')}; ключевые планеты ${topPlanets.map(([id, v]) => `${name(id)} (${v.toFixed(1)})`).join(', ')}; тон: ${tone}`;
  return { html: section('Сводный анализ', o, true), text };
}
