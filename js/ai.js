// Чат с ИИ (Claude). Запросы идут напрямую из браузера в API Anthropic
// с ключом пользователя; ключ хранится только в localStorage этого браузера.

const SDK_URL = 'https://cdn.jsdelivr.net/npm/@anthropic-ai/sdk@1.5.0/+esm';
const MODELS = [
  ['claude-opus-5-5', 'Claude Opus 5.5 — максимум качества'],
  ['claude-sonnet-5-5', 'Claude Sonnet 5.5 — быстрее и дешевле'],
  ['claude-haiku-5-5', 'Claude Haiku 5.5 — самый дешёвый'],
];
const SYSTEM = `Ты — профессиональный астролог-аналитик западной тропической традиции (дома Плацидуса), опирающийся на методики авестийской школы П. П. Глобы (ядро космограммы, кармический статус планет, дневные/ночные обители, экзальтации по Глобе, управители домов, планетарные возрасты), а также на классическую аспектологию (С. Вронский, Б. Щитов) и предсказательные методы (соляр, вторичные прогрессии, транзиты).

Ниже приведены точно рассчитанные программой данные карты. Опирайся только на них: не придумывай положения планет, которых нет в данных. Если нужного расчёта нет — скажи, какую вкладку открыть или какие данные нужны.

Правила ответа:
- Отвечай по-русски, понятно и конкретно, но профессионально; обосновывай выводы ссылками на показатели (например: «управитель VII дома Юпитер в X доме, в экзальтации»).
- Синтезируй: ищи повторяющиеся показатели в разных методах, оценивай силу планет, не перечисляй всё подряд.
- Для прогнозов указывай периоды и даты из данных транзитов/прогрессий/соляра.
- Говори о тенденциях и вероятностях, а не о фатальной неизбежности; не давай медицинских, юридических и финансовых предписаний — лишь астрологические тенденции.`;

const store = {
  get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } },
};

let history = []; // [{role, content}]
let historyFor = null;
let clientPromise = null;

async function getClient(apiKey) {
  const { default: Anthropic } = await import(SDK_URL);
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

const QUICK = [
  'Сделай подробный психологический портрет по натальной карте',
  'Какие у меня главные таланты и призвание?',
  'Что показывает карта о любви и браке?',
  'Финансы: где мои сильные стороны и риски?',
  'Каким будет ближайший год? Сопоставь соляр, прогрессии и транзиты',
  'Какие периоды в ближайшие 12 месяцев самые важные?',
  'Проанализируй нашу совместимость (синастрию)',
];

export function renderChat(view, buildContext) {
  const ctx = buildContext();
  if (!ctx) { view.innerHTML = '<p class="empty">Сначала рассчитайте карту.</p>'; return; }
  if (historyFor !== ctx.name) { history = []; historyFor = ctx.name; }
  const key = store.get('astro.apiKey', '');
  const model = store.get('astro.model', MODELS[0][0]);
  view.innerHTML = `
  <div class="chat">
    <details class="sec" ${key ? '' : 'open'}><summary>Настройки ИИ ${key ? '· ключ сохранён' : '· нужен ключ API'}</summary><div class="sec-body">
      <p class="muted">Чат работает через API Claude (Anthropic) с вашим собственным ключом. Ключ хранится только в этом браузере и отправляется напрямую на api.anthropic.com. Получить ключ: console.anthropic.com → API Keys. Запросы платные по тарифу Anthropic.</p>
      <div class="controls">
        <label style="flex:1;min-width:220px">Ключ API<input type="password" id="aiKey" value="${key ? '••••••••' : ''}" placeholder="sk-ant-..."></label>
        <label>Модель<select id="aiModel">${MODELS.map(([id, n]) => `<option value="${id}" ${id === model ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <button class="btn" id="aiSave">Сохранить</button>
        <button class="btn ghost danger" id="aiForget">Забыть ключ</button>
      </div>
      <details><summary class="muted">Какие данные получает ИИ</summary><pre style="white-space:pre-wrap;font-size:12px;max-height:300px;overflow:auto">${escapeHtml(ctx.text)}</pre></details>
    </div></details>
    <div class="chips">${QUICK.map((q) => `<button type="button">${q}</button>`).join('')}</div>
    <div class="msgs" id="msgs"></div>
    <textarea id="aiInput" placeholder="Задайте вопрос о карте: «Когда лучше менять работу?», «Что значит мой Сатурн в V доме?»…"></textarea>
    <div class="row"><button class="btn primary" id="aiSend">Отправить</button><button class="btn ghost" id="aiClear">Очистить диалог</button><span id="aiStatus" class="muted"></span></div>
  </div>`;
  const msgs = view.querySelector('#msgs');
  const draw = () => {
    msgs.innerHTML = history.length ? history.map((m) => `<div class="msg ${m.role}${m.error ? ' error' : ''}">${escapeHtml(typeof m.content === 'string' ? m.content : '')}</div>`).join('') : '<p class="muted">Задайте вопрос или выберите готовый вариант выше. ИИ получит все рассчитанные данные: натал, соляр, прогрессии, транзиты на год, комплексный анализ и синастрию.</p>';
  };
  draw();
  view.querySelector('#aiSave').onclick = () => {
    const v = view.querySelector('#aiKey').value.trim();
    if (v && !v.startsWith('•')) store.set('astro.apiKey', v);
    store.set('astro.model', view.querySelector('#aiModel').value);
    clientPromise = null;
    renderChat(view, buildContext);
  };
  view.querySelector('#aiForget').onclick = () => { try { localStorage.removeItem('astro.apiKey'); } catch { /* */ } clientPromise = null; renderChat(view, buildContext); };
  view.querySelector('#aiClear').onclick = () => { history = []; draw(); };
  view.querySelectorAll('.chips button').forEach((b) => (b.onclick = () => { view.querySelector('#aiInput').value = b.textContent; send(); }));
  view.querySelector('#aiSend').onclick = send;
  view.querySelector('#aiInput').addEventListener('keydown', (e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send(); });

  async function send() {
    const input = view.querySelector('#aiInput');
    const q = input.value.trim(); if (!q) return;
    const apiKey = store.get('astro.apiKey', '');
    if (!apiKey) { view.querySelector('#aiStatus').textContent = 'Сначала сохраните ключ API в настройках.'; return; }
    input.value = '';
    history.push({ role: 'user', content: q });
    const answer = { role: 'assistant', content: '' };
    history.push(answer);
    draw();
    const status = view.querySelector('#aiStatus');
    status.textContent = 'ИИ анализирует…';
    const sendBtn = view.querySelector('#aiSend'); sendBtn.disabled = true;
    try {
      clientPromise ||= getClient(apiKey);
      const client = await clientPromise;
      const mdl = store.get('astro.model', MODELS[0][0]);
      const stream = client.beta.messages.stream({
        model: mdl,
        max_tokens: 64000,
        thinking: { type: 'adaptive' },
        // серверный запасной вариант при отказе модели (поддерживают Opus 5.5 и Sonnet 5.5)
        ...(mdl === 'claude-haiku-5-5' ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }),
        system: [
          { type: 'text', text: SYSTEM },
          { type: 'text', text: 'ДАННЫЕ РАСЧЁТА:\n' + ctx.text, cache_control: { type: 'ephemeral' } },
        ],
        messages: history.filter((m) => m !== answer && !m.error).map((m) => ({ role: m.role, content: m.content })),
      });
      for await (const ev of stream) {
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
          answer.content += ev.delta.text;
          const last = msgs.lastElementChild; if (last) last.textContent = answer.content;
          status.textContent = 'Пишет ответ…';
        }
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === 'refusal') { answer.content ||= 'Модель отказалась отвечать на этот запрос. Попробуйте переформулировать.'; answer.error = true; }
      if (final.stop_reason === 'max_tokens') answer.content += '\n\n[Ответ обрезан по длине]';
      status.textContent = '';
    } catch (err) {
      answer.content = 'Ошибка: ' + (err?.status === 401 ? 'неверный ключ API.' : err?.status === 429 ? 'превышен лимит запросов, попробуйте позже.' : err?.message || String(err));
      answer.error = true; status.textContent = '';
      clientPromise = null;
    } finally {
      sendBtn.disabled = false; draw(); msgs.lastElementChild?.scrollIntoView({ block: 'nearest' });
    }
  }
}

function escapeHtml(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
