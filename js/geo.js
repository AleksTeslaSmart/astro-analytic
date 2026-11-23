// Поиск населённых пунктов: координаты + часовой пояс.
// Основной сервис — Open-Meteo Geocoding (сразу отдаёт часовой пояс), запасной — OpenStreetMap Nominatim.
import { tzOffsetMinutes } from './astro.js';

export function tzFromCoords(lat, lon) { try { return globalThis.tzlookup(+lat, +lon); } catch { return 'UTC'; } }

export async function searchPlaces(q) {
  const out = [];
  try {
    const r = await fetch(`https://geocoding-api.open-meteo.com/v1/search?count=8&language=ru&format=json&name=${encodeURIComponent(q)}`);
    const j = await r.json();
    for (const it of j.results || []) {
      out.push({
        name: it.name, label: [it.name, it.admin1, it.country].filter(Boolean).join(', '),
        lat: it.latitude, lon: it.longitude, tz: it.timezone || tzFromCoords(it.latitude, it.longitude),
      });
    }
  } catch { /* переходим к запасному сервису */ }
  if (!out.length) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&accept-language=ru&q=${encodeURIComponent(q)}`);
      for (const it of await r.json()) out.push({ name: it.display_name.split(',')[0], label: it.display_name, lat: +it.lat, lon: +it.lon, tz: tzFromCoords(it.lat, it.lon) });
    } catch { /* сеть недоступна */ }
  }
  return out;
}

export function fmtOffset(min) {
  const s = min >= 0 ? '+' : '−', a = Math.abs(min);
  return `UTC${s}${Math.floor(a / 60)}${a % 60 ? ':' + String(a % 60).padStart(2, '0') : ''}`;
}
// Смещение для конкретной локальной даты/времени в зоне (с учётом исторического летнего времени)
export function offsetFor(tz, dateStr, timeStr) {
  if (!tz || !dateStr) return null;
  try {
    const [y, m, d] = dateStr.split('-').map(Number); const [hh, mm] = (timeStr || '12:00').split(':').map(Number);
    const naive = Date.UTC(y, m - 1, d, hh, mm);
    let off = tzOffsetMinutes(tz, naive); off = tzOffsetMinutes(tz, naive - off * 60000);
    return off;
  } catch { return null; }
}

// Автодополнение: ввод названия → подсказки → выбор заполняет координаты и пояс
export function attachPlaceSearch(input, box, onPick, button) {
  let timer = null, seq = 0;
  const run = async (auto) => {
    const q = input.value.trim();
    if (q.length < 2) { box.innerHTML = ''; return; }
    const my = ++seq;
    box.textContent = 'Поиск…';
    const list = await searchPlaces(q);
    if (my !== seq) return;
    box.innerHTML = '';
    if (!list.length) { box.textContent = 'Не найдено. Проверьте название или введите координаты вручную.'; return; }
    for (const it of list) {
      const b = document.createElement('button'); b.type = 'button';
      b.textContent = `${it.label} (${it.lat.toFixed(2)}, ${it.lon.toFixed(2)}, ${it.tz})`;
      b.onclick = () => { box.innerHTML = ''; onPick(it); };
      box.appendChild(b);
    }
    if (!auto && list.length === 1) { box.innerHTML = ''; onPick(list[0]); }
  };
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => run(true), 600); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(timer); run(false); } });
  if (button) button.addEventListener('click', () => run(false));
}
