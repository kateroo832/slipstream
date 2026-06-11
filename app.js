/* Slipstream — checklists that forgive you.
 * List types:
 *   trip      — countdown to a departure date; items keyed to "days before"
 *   recurring — chores that reschedule from last completion (never stack guilt)
 *   project   — sectioned build/organizing projects
 *   simple    — plain checklist
 */

/* ---------------- date helpers (all local time) ---------------- */
function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function todayStr() { return ymd(new Date()); }
function parseDate(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(s, n) { const d = parseDate(s); d.setDate(d.getDate() + n); return ymd(d); }
function daysUntil(s) { return Math.round((parseDate(s) - parseDate(todayStr())) / 864e5); }
function fmtShort(s) { return parseDate(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function nowISO() { return new Date().toISOString(); }

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function uid(text) {
  const slug = String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28) || 'item';
  return slug + '-' + Math.random().toString(36).slice(2, 6);
}

/* ---------------- app state ---------------- */
const App = {
  state: {
    lists: {},          // id -> list object
    shas: {},           // filename -> github blob sha
    dirty: new Set(),   // list ids changed locally since last push
    settings: { name: '', owner: '', repo: '', branch: 'main', token: '' },
    activity: [],       // ISO timestamps of check-offs (capped)
    lastSync: null,
  },
  ui: { view: 'today', listId: null, snoozeFor: null, menuFor: null, spotlight: null },

  load() {
    try {
      const raw = JSON.parse(localStorage.getItem('slipstream') || 'null');
      if (raw) {
        Object.assign(this.state, raw);
        this.state.dirty = new Set(raw.dirty || []);
      } else {
        this.seed();
      }
    } catch (e) { console.warn('load failed', e); this.seed(); }
  },

  persist() {
    const s = { ...this.state, dirty: [...this.state.dirty] };
    localStorage.setItem('slipstream', JSON.stringify(s));
  },

  markDirty(listId) {
    const list = this.state.lists[listId];
    if (list) list.updatedAt = nowISO();
    this.state.dirty.add(listId);
    this.persist();
    if (Sync.ready()) { this.setSyncStatus('pending'); Sync.schedule(); }
    this.render();
  },

  logActivity() {
    this.state.activity.push(nowISO());
    if (this.state.activity.length > 400) this.state.activity = this.state.activity.slice(-400);
  },

  /* Demo data shown before sync is configured. Same ids as the starter
   * files in the data repo, so the first pull replaces them cleanly. */
  seed() {
    const t = todayStr();
    // ids must stay deterministic and match the starter files in the data
    // repo, so the first sync merges instead of duplicating items
    const mk = (id, text, extra = {}) => ({ id, text, updatedAt: nowISO(), ...extra });
    this.state.lists = {
      'summer-trip': {
        id: 'summer-trip', type: 'trip', emoji: '🧳', title: 'Summer Trip (example)',
        departure: addDays(t, 30), updatedAt: nowISO(),
        items: [
          mk('book-pet-care', 'Book pet care / house sitter', { daysBefore: 21, done: false }),
          mk('refill-prescriptions', 'Refill prescriptions', { daysBefore: 10, done: false }),
          mk('hold-mail', 'Hold the mail', { daysBefore: 7, done: false }),
          mk('laundry', 'Do all the laundry', { daysBefore: 3, done: false }),
          mk('pack', 'Pack (use the packing list!)', { daysBefore: 2, done: false }),
          mk('charge-download', 'Charge battery packs & download podcasts', { daysBefore: 1, done: false }),
          mk('day-of-sweep', 'Take out trash, water plants, lock up', { daysBefore: 0, done: false }),
        ],
      },
      'household': {
        id: 'household', type: 'recurring', emoji: '🏠', title: 'Household', updatedAt: nowISO(),
        items: [
          mk('water-plants', 'Water the plants', { every: 7, lastDone: addDays(t, -9), snoozedUntil: null, history: [] }),
          mk('vacuum-stairs', 'Vacuum the stairs', { every: 14, lastDone: addDays(t, -16), snoozedUntil: null, history: [] }),
          mk('wash-sheets', 'Wash the sheets', { every: 14, lastDone: addDays(t, -12), snoozedUntil: null, history: [] }),
          mk('clean-coffee-maker', 'Clean the coffee maker', { every: 30, lastDone: addDays(t, -20), snoozedUntil: null, history: [] }),
          mk('change-hvac-filter', 'Change HVAC filter', { every: 90, lastDone: addDays(t, -45), snoozedUntil: null, history: [] }),
        ],
      },
      'raskog-top-shelf': {
        id: 'raskog-top-shelf', type: 'project', emoji: '🔨', title: 'RÅSKOG Top Shelf', updatedAt: nowISO(),
        items: [
          mk('measure-sketch', 'Measure cart + sketch layout', { section: 'Design', done: true, doneAt: nowISO() }),
          mk('model-stl', 'Model the top shelf (STL)', { section: 'Design', done: true, doneAt: nowISO() }),
          mk('cut-shelf', 'Print / cut the shelf', { section: 'Build', done: false }),
          mk('sand-edges', 'Sand edges smooth', { section: 'Build', done: false }),
          mk('finish-shelf', 'Finish (paint or seal)', { section: 'Build', done: false }),
          mk('fit-to-cart', 'Fit to cart and load it up', { section: 'Install', done: false }),
        ],
      },
      'art-supply-organization': {
        id: 'art-supply-organization', type: 'project', emoji: '🎨', title: 'Art Supply Organization', updatedAt: nowISO(),
        items: [
          mk('inventory-supplies', 'Inventory supplies by use', { section: 'Sort', done: true, doneAt: nowISO() }),
          mk('purge-supplies', 'Purge dried-out / duplicate supplies', { section: 'Sort', done: false }),
          mk('pencil-layout', 'Finalize pencil layout', { section: 'Layout', done: false }),
          mk('cart-zones', 'Set up RÅSKOG cart zones', { section: 'Layout', done: false }),
          mk('label-everything', 'Label everything', { section: 'Finish', done: false }),
        ],
      },
    };
    this.persist();
  },

  /* ---------------- due-date logic ---------------- */
  /* weekday (0=Sun..6=Sat) anchors a recurring task to a fixed day of the
   * week: a late check-off re-anchors to the next occurrence instead of
   * drifting — right for meds, wrong for chores, so it's opt-in. */
  recurDueDate(item) {
    let due;
    if (item.weekday != null) {
      const base = item.lastDone ? addDays(item.lastDone, 1) : todayStr();
      const d = parseDate(base);
      d.setDate(d.getDate() + ((item.weekday - d.getDay()) + 7) % 7);
      due = ymd(d);
    } else {
      due = item.lastDone ? addDays(item.lastDone, item.every || 7) : todayStr();
    }
    if (item.snoozedUntil && item.snoozedUntil > due) due = item.snoozedUntil;
    return due;
  },
  cadenceLabel(item) {
    if (item.weekday != null) return ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'][item.weekday];
    return (item.every === 1) ? 'daily' : `every ${item.every}d`;
  },
  tripItemDue(list, item) {
    let due = addDays(list.departure, -(item.daysBefore || 0));
    if (item.snoozedUntil && item.snoozedUntil > due) due = item.snoozedUntil;
    return due;
  },

  /* Everything that wants attention today / in the next 3 days. */
  collectToday() {
    const t = todayStr();
    const soonEnd = addDays(t, 3);
    const now = [], soon = [];
    for (const list of Object.values(this.state.lists)) {
      if (list.archived || list.shelved) continue;
      if (list.type === 'recurring') {
        for (const item of list.items || []) {
          const due = this.recurDueDate(item);
          const entry = { list, item, due, kind: 'recurring' };
          if (due <= t) now.push(entry);
          else if (due <= soonEnd) soon.push(entry);
        }
      } else if (list.type === 'trip') {
        if ((list.return || list.departure) < t) continue; // trip is over
        for (const item of list.items || []) {
          if (item.done) continue;
          const due = this.tripItemDue(list, item);
          const entry = { list, item, due, kind: 'trip' };
          if (due <= t) now.push(entry);
          else if (due <= soonEnd) soon.push(entry);
        }
      } else {
        // project/simple items with an explicit due date surface in Today
        for (const item of list.items || []) {
          if (item.done || !item.due) continue;
          let due = item.due;
          if (item.snoozedUntil && item.snoozedUntil > due) due = item.snoozedUntil;
          const entry = { list, item, due, kind: 'dated' };
          if (due <= t) now.push(entry);
          else if (due <= soonEnd) soon.push(entry);
        }
      }
    }
    const byDue = (a, b) => a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
    now.sort(byDue); soon.sort(byDue);
    return { now, soon };
  },

  /* ---------------- actions ---------------- */
  checkRecurring(listId, itemId, evt) {
    const list = this.state.lists[listId];
    const item = (list.items || []).find(i => i.id === itemId);
    if (!item) return;
    const prev = { lastDone: item.lastDone, snoozedUntil: item.snoozedUntil, history: [...(item.history || [])] };
    item.lastDone = todayStr();
    item.snoozedUntil = null;
    item.history = [...(item.history || []), todayStr()].slice(-50);
    item.updatedAt = nowISO();
    this.logActivity();
    this.celebrate(evt);
    this.markDirty(listId);
    toast(`✓ Done. Next one schedules from today — no debt carried.`, 'Undo', () => {
      Object.assign(item, prev, { updatedAt: nowISO() });
      const idx = this.state.activity.length - 1;
      if (idx >= 0) this.state.activity.splice(idx, 1);
      this.markDirty(listId);
    });
  },

  toggleDone(listId, itemId, evt) {
    const list = this.state.lists[listId];
    const item = (list.items || []).find(i => i.id === itemId);
    if (!item) return;
    item.done = !item.done;
    item.doneAt = item.done ? nowISO() : null;
    item.updatedAt = nowISO();
    if (item.done) { this.logActivity(); this.celebrate(evt); }
    this.markDirty(listId);
  },

  snooze(listId, itemId, days) {
    const list = this.state.lists[listId];
    const item = (list.items || []).find(i => i.id === itemId);
    if (!item) return;
    item.snoozedUntil = addDays(todayStr(), days);
    item.updatedAt = nowISO();
    this.ui.snoozeFor = null;
    this.markDirty(listId);
    toast(`💤 Snoozed until ${fmtShort(item.snoozedUntil)}. Guilt not included.`);
  },

  addItem(listId, text) {
    const list = this.state.lists[listId];
    if (!list || !text.trim()) return;
    const item = { id: uid(text), text: text.trim(), updatedAt: nowISO() };
    if (list.type === 'recurring') { item.every = 7; item.lastDone = null; item.snoozedUntil = null; item.history = []; }
    else if (list.type === 'trip') { item.daysBefore = 7; item.done = false; }
    else { item.done = false; }
    list.items = list.items || [];
    list.items.push(item);
    this.markDirty(listId);
  },

  editItem(listId, itemId) {
    const list = this.state.lists[listId];
    const item = (list.items || []).find(i => i.id === itemId);
    if (!item) return;
    const text = prompt('Task text:', item.text);
    if (text === null) return;
    if (text.trim()) { item.text = text.trim(); }
    if (list.type === 'recurring') {
      const every = prompt('Repeat every how many days?', item.every || 7);
      if (every !== null && +every > 0) item.every = Math.round(+every);
    }
    if (list.type === 'trip') {
      const db = prompt('How many days before departure? (negative = during the trip)', item.daysBefore ?? 7);
      if (db !== null && db.trim() !== '' && !isNaN(+db)) item.daysBefore = Math.round(+db);
    }
    item.updatedAt = nowISO();
    this.ui.menuFor = null;
    this.markDirty(listId);
  },

  deleteItem(listId, itemId) {
    const list = this.state.lists[listId];
    const item = (list.items || []).find(i => i.id === itemId);
    if (!item) return;
    if (!confirm(`Delete "${item.text}"?`)) return;
    list.items = list.items.filter(i => i.id !== itemId);
    this.ui.menuFor = null;
    this.markDirty(listId);
  },

  createList(title, emoji, type, departure) {
    if (!title.trim()) return;
    const id = uid(title);
    const list = { id, title: title.trim(), emoji: emoji || '✅', type, items: [], updatedAt: nowISO() };
    if (type === 'trip') list.departure = departure || addDays(todayStr(), 14);
    this.state.lists[id] = list;
    this.markDirty(id);
    this.navigate('list', id);
  },

  shelveList(listId, shelved) {
    const list = this.state.lists[listId];
    if (!list) return;
    list.shelved = shelved;
    this.markDirty(listId);
    toast(shelved ? '💤 Shelved — resting, not forgotten.' : '☀️ Awake. Its tasks count now.');
  },

  archiveList(listId) {
    const list = this.state.lists[listId];
    if (!list) return;
    if (!confirm(`Archive "${list.title}"? (It's kept in the data, just hidden.)`)) return;
    list.archived = true;
    this.markDirty(listId);
    this.navigate('lists');
  },

  pickOne() {
    const { now } = this.collectToday();
    if (!now.length) { toast('Nothing is waiting on you. Go make something. 🌿'); return; }
    const pick = now[(Math.random() * now.length) | 0];
    this.ui.spotlight = pick.list.id + '/' + pick.item.id;
    this.render();
    const el = document.querySelector(`[data-key="${this.ui.spotlight}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    toast('This one. Just this one. 🎯');
    setTimeout(() => { this.ui.spotlight = null; this.render(); }, 6000);
  },

  celebrate(evt) {
    let x = window.innerWidth / 2, y = window.innerHeight / 2;
    if (evt && evt.clientX) { x = evt.clientX; y = evt.clientY; }
    Confetti.burst(x, y);
    if (navigator.vibrate) navigator.vibrate(25);
  },

  /* ---------------- navigation & rendering ---------------- */
  navigate(view, listId = null, replace = false) {
    this.ui.view = view;
    this.ui.listId = listId;
    this.ui.snoozeFor = null;
    this.ui.menuFor = null;
    const st = { view, listId };
    if (replace) history.replaceState(st, '');
    else history.pushState(st, '');
    this.render();
    window.scrollTo(0, 0);
  },

  setSyncStatus(status, msg = '') {
    const dot = document.getElementById('syncDot');
    const label = document.getElementById('syncLabel');
    if (!dot) return;
    dot.className = 'sync-dot';
    const map = {
      local:   ['', 'local'],
      offline: ['pending', 'offline'],
      pending: ['pending', 'unsynced'],
      busy:    ['busy', 'syncing…'],
      ok:      ['ok', 'synced'],
      error:   ['error', 'sync error'],
    };
    const [cls, text] = map[status] || ['', status];
    if (cls) dot.classList.add(cls);
    label.textContent = text;
    document.getElementById('syncPill').title = msg || 'Tap to sync now';
  },

  render() {
    const v = document.getElementById('view');
    if (this.ui.view === 'today') v.innerHTML = this.renderToday();
    else if (this.ui.view === 'lists') v.innerHTML = this.renderLists();
    else if (this.ui.view === 'list') v.innerHTML = this.renderListDetail();
    document.getElementById('navToday').classList.toggle('active', this.ui.view === 'today');
    document.getElementById('navLists').classList.toggle('active', this.ui.view !== 'today');
  },

  greeting() {
    const h = new Date().getHours();
    const part = h < 5 ? 'Up late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const name = this.state.settings.name;
    return part + (name ? ', ' + esc(name) : '') + (h < 5 ? '? No judgment.' : '.');
  },

  renderMomentum() {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const today = new Date();
    const dow = (today.getDay() + 6) % 7; // Monday = 0
    const weekDates = days.map((_, i) => { const d = new Date(today); d.setDate(d.getDate() - dow + i); return ymd(d); });
    const hits = new Set(this.state.activity.map(ts => ymd(new Date(ts))));
    const weekCount = this.state.activity.filter(ts => weekDates.includes(ymd(new Date(ts)))).length;
    const dots = weekDates.map((d, i) =>
      `<div class="mdot ${hits.has(d) ? 'hit' : ''} ${i === dow ? 'today' : ''}">${days[i]}</div>`).join('');
    const msg = weekCount === 0
      ? 'Fresh page this week.'
      : `<b>${weekCount}</b> check-off${weekCount === 1 ? '' : 's'} this week`;
    return `<div class="momentum"><div class="momentum-dots">${dots}</div><div class="momentum-text">${msg}</div></div>`;
  },

  dueLabel(due) {
    const n = daysUntil(due);
    if (n < 0) return `<span class="ready">ready since ${fmtShort(due)}</span>`;
    if (n === 0) return `<span class="ready">ready today</span>`;
    if (n === 1) return `tomorrow`;
    return `in ${n} days · ${fmtShort(due)}`;
  },

  renderEntryRow({ list, item, due, kind }) {
    const key = list.id + '/' + item.id;
    const spot = this.ui.spotlight === key ? 'spotlight' : '';
    const snoozing = this.ui.snoozeFor === key;
    const tripWhen = item.daysBefore === 0 ? 'departure day' : item.daysBefore < 0 ? 'during trip' : item.daysBefore + 'd before';
    const detail = kind === 'recurring' ? this.cadenceLabel(item) : kind === 'dated' ? `due ${fmtShort(item.due)}` : tripWhen;
    const sub = `${esc(list.emoji)} ${esc(list.title)} · ${detail} · ${this.dueLabel(due)}`;
    const actions = snoozing
      ? `<div class="row-actions">
           <button class="mini-btn accent" data-action="snooze" data-list="${list.id}" data-item="${item.id}" data-days="1">+1d</button>
           <button class="mini-btn accent" data-action="snooze" data-list="${list.id}" data-item="${item.id}" data-days="3">+3d</button>
           <button class="mini-btn accent" data-action="snooze" data-list="${list.id}" data-item="${item.id}" data-days="7">+1w</button>
           <button class="mini-btn" data-action="snooze-cancel">✕</button>
         </div>`
      : `<div class="row-actions">
           <button class="mini-btn" data-action="snooze-open" data-key="${key}" title="Snooze">💤</button>
         </div>`;
    const checkAction = kind === 'recurring' ? 'check-recurring' : 'toggle-done';
    return `<div class="task-row ${spot}" data-key="${key}">
      <button class="checkbtn" data-action="${checkAction}" data-list="${list.id}" data-item="${item.id}">✓</button>
      <div class="task-main"><div class="task-text">${esc(item.text)}</div><div class="task-sub">${sub}</div></div>
      ${actions}
    </div>`;
  },

  renderToday() {
    const { now, soon } = this.collectToday();
    const t = todayStr();
    const trips = Object.values(this.state.lists)
      .filter(l => l.type === 'trip' && !l.archived && !l.shelved && (l.return || l.departure) >= t)
      .sort((a, b) => a.departure < b.departure ? -1 : 1);

    const tripCards = trips.map(l => {
      const days = daysUntil(l.departure);
      const undone = (l.items || []).filter(i => !i.done);
      const next = undone.sort((a, b) => (b.daysBefore || 0) - (a.daysBefore || 0))[0];
      const sub = next ? `next: ${esc(next.text)}` : 'all set ✨';
      const count = days >= 0
        ? `<b>${days}</b><span>day${days === 1 ? '' : 's'}</span>`
        : `<b>✈️</b><span>day ${1 - days}</span>`;
      return `<div class="trip-card" data-action="open-list" data-list="${l.id}">
        <div class="trip-emoji">${esc(l.emoji)}</div>
        <div class="trip-info"><div class="trip-title">${esc(l.title)}</div><div class="trip-sub">${sub}</div></div>
        <div class="trip-count">${count}</div>
      </div>`;
    }).join('');

    const nowRows = now.length
      ? `<div class="task-group">${now.map(e => this.renderEntryRow(e)).join('')}</div>`
      : `<div class="empty"><span class="big">🌿</span>Nothing is waiting on you right now.<br>Go make sawdust.</div>`;

    const soonBlock = soon.length
      ? `<div class="section-label">Coming up</div><div class="task-group">${soon.map(e => this.renderEntryRow(e)).join('')}</div>`
      : '';

    return `
      <div class="greet"><h1>${this.greeting()}</h1><p>${fmtShort(t)} · one thing at a time.</p></div>
      ${this.renderMomentum()}
      ${trips.length ? `<div class="section-label">Countdowns</div><div class="trip-cards">${tripCards}</div>` : ''}
      <div class="section-label">Now</div>
      ${nowRows}
      ${now.length ? `<button class="bigbtn" data-action="pick-one">✨ Pick one for me</button>` : ''}
      ${soonBlock}`;
  },

  renderLists() {
    const all = Object.values(this.state.lists).filter(l => !l.archived);
    const lists = all.filter(l => !l.shelved);
    const shelf = all.filter(l => l.shelved);
    const order = { trip: 0, recurring: 1, project: 2, simple: 3 };
    lists.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9) || a.title.localeCompare(b.title));
    shelf.sort((a, b) => a.title.localeCompare(b.title));
    const cards = lists.map(l => {
      let sub = '', badge = '';
      if (l.type === 'trip') {
        const days = daysUntil(l.departure);
        const done = (l.items || []).filter(i => i.done).length;
        const onTrip = days < 0 && l.return && l.return >= todayStr();
        sub = days >= 0 ? `${days} days out · ${done}/${(l.items || []).length} prepped`
          : onTrip ? `on the trip · home ${fmtShort(l.return)}`
          : `departed ${fmtShort(l.departure)}`;
        badge = days >= 0 ? `<span class="list-badge due">${days}d</span>` : onTrip ? `<span class="list-badge due">✈️</span>` : '';
      } else if (l.type === 'recurring') {
        const due = (l.items || []).filter(i => this.recurDueDate(i) <= todayStr()).length;
        sub = `${(l.items || []).length} rhythms`;
        badge = due ? `<span class="list-badge due">${due} ready</span>` : `<span class="list-badge">all quiet</span>`;
      } else {
        const total = (l.items || []).length;
        const done = (l.items || []).filter(i => i.done).length;
        sub = `${done}/${total} done`;
        const pct = total ? Math.round(done / total * 100) : 0;
        sub += pct === 100 ? ' 🎉' : '';
        badge = `<span class="list-badge">${pct}%</span>`;
      }
      return `<div class="list-card" data-action="open-list" data-list="${l.id}">
        <div class="list-emoji">${esc(l.emoji)}</div>
        <div class="list-info"><div class="list-title">${esc(l.title)}</div><div class="list-sub">${sub}</div></div>
        ${badge}
      </div>`;
    }).join('');
    const shelfCards = shelf.map(l => {
      const total = (l.items || []).length;
      const done = (l.items || []).filter(i => i.done).length;
      return `<div class="list-card shelved" data-action="open-list" data-list="${l.id}">
        <div class="list-emoji">${esc(l.emoji)}</div>
        <div class="list-info"><div class="list-title">${esc(l.title)}</div><div class="list-sub">${done}/${total} done · resting</div></div>
        <button class="mini-btn accent" data-action="activate-list" data-list="${l.id}">Wake</button>
      </div>`;
    }).join('');
    return `
      <div class="list-head"><h1>Your lists</h1></div>
      ${cards || '<div class="empty"><span class="big">🗂️</span>No lists yet.</div>'}
      <button class="bigbtn secondary" data-action="new-list">＋ New list</button>
      ${shelf.length ? `<div class="section-label">On the shelf — resting, not forgotten</div>${shelfCards}` : ''}`;
  },

  renderListDetail() {
    const list = this.state.lists[this.ui.listId];
    if (!list) return '<div class="empty">List not found.</div>';
    const head = `
      <button class="back-btn" data-action="nav-lists">‹ Lists</button>
      <div class="list-head"><h1><span>${esc(list.emoji)}</span>${esc(list.title)}
        <button class="mini-btn ${list.shelved ? 'accent' : ''}" data-action="${list.shelved ? 'activate-list' : 'shelve-list'}" data-list="${list.id}" style="margin-left:auto">${list.shelved ? 'Wake' : 'Shelve'}</button>
        <button class="mini-btn" data-action="archive-list" data-list="${list.id}" title="Archive list">Archive</button>
      </h1></div>`;
    let body = '';
    if (list.type === 'trip') body = this.renderTripBody(list);
    else if (list.type === 'recurring') body = this.renderRecurringBody(list);
    else body = this.renderProjectBody(list);
    const addRow = `<div class="add-row">
      <input type="text" id="addInput" placeholder="${list.type === 'trip' ? 'Add a prep task…' : list.type === 'recurring' ? 'Add a rhythm…' : 'Add a task…'}" enterkeyhint="done">
      <button data-action="add-item" data-list="${list.id}">＋</button>
    </div>`;
    return head + body + addRow;
  },

  itemMenuOrActions(list, item) {
    const key = list.id + '/' + item.id;
    if (this.ui.menuFor === key) {
      return `<div class="row-actions">
        <button class="mini-btn accent" data-action="edit-item" data-list="${list.id}" data-item="${item.id}">Edit</button>
        <button class="mini-btn danger" data-action="delete-item" data-list="${list.id}" data-item="${item.id}">Delete</button>
        <button class="mini-btn" data-action="menu-close">✕</button>
      </div>`;
    }
    return `<div class="row-actions"><button class="mini-btn" data-action="menu-open" data-key="${key}">⋯</button></div>`;
  },

  renderTripBody(list) {
    const days = daysUntil(list.departure);
    const onTrip = days < 0 && list.return && list.return >= todayStr();
    const hero = days >= 0
      ? `<div class="countdown-hero"><b>${days}</b><span>day${days === 1 ? '' : 's'} until ${fmtShort(list.departure)}</span></div>`
      : onTrip
        ? `<div class="countdown-hero"><b>Day ${1 - days}</b><span>on the trip · home ${fmtShort(list.return)}</span></div>`
        : `<div class="countdown-hero"><b>✈️</b><span>departed ${fmtShort(list.departure)}</span></div>`;
    const items = [...(list.items || [])].sort((a, b) =>
      (a.done ? 1 : 0) - (b.done ? 1 : 0) || (b.daysBefore || 0) - (a.daysBefore || 0));
    const rows = items.map(item => {
      const due = this.tripItemDue(list, item);
      const when = item.daysBefore === 0 ? 'departure day'
        : item.daysBefore < 0 ? `during trip · ${fmtShort(due)}`
        : `${item.daysBefore}d before · ${fmtShort(due)}`;
      return `<div class="task-row ${item.done ? 'done-row' : ''}" data-key="${list.id}/${item.id}">
        <button class="checkbtn ${item.done ? 'checked' : ''}" data-action="toggle-done" data-list="${list.id}" data-item="${item.id}">✓</button>
        <div class="task-main"><div class="task-text">${esc(item.text)}</div><div class="task-sub">${when}</div>${item.notes ? `<div class="task-sub">${esc(item.notes)}</div>` : ''}</div>
        ${this.itemMenuOrActions(list, item)}
      </div>`;
    }).join('');
    return hero + `<div class="task-group">${rows || ''}</div>`;
  },

  renderRecurringBody(list) {
    const t = todayStr();
    const entries = (list.items || []).map(item => ({ item, due: this.recurDueDate(item) }));
    const ready = entries.filter(e => e.due <= t).sort((a, b) => a.due < b.due ? -1 : 1);
    const later = entries.filter(e => e.due > t).sort((a, b) => a.due < b.due ? -1 : 1);
    const row = ({ item, due }) => {
      const key = list.id + '/' + item.id;
      const last = item.lastDone ? `last ${fmtShort(item.lastDone)}` : 'never yet — no shame';
      const snoozing = this.ui.snoozeFor === key;
      const actions = snoozing
        ? `<div class="row-actions">
             <button class="mini-btn accent" data-action="snooze" data-list="${list.id}" data-item="${item.id}" data-days="1">+1d</button>
             <button class="mini-btn accent" data-action="snooze" data-list="${list.id}" data-item="${item.id}" data-days="3">+3d</button>
             <button class="mini-btn accent" data-action="snooze" data-list="${list.id}" data-item="${item.id}" data-days="7">+1w</button>
             <button class="mini-btn" data-action="snooze-cancel">✕</button>
           </div>`
        : this.ui.menuFor === key ? this.itemMenuOrActions(list, item)
        : `<div class="row-actions">
             <button class="mini-btn" data-action="snooze-open" data-key="${key}">💤</button>
             <button class="mini-btn" data-action="menu-open" data-key="${key}">⋯</button>
           </div>`;
      return `<div class="task-row" data-key="${key}">
        <button class="checkbtn" data-action="check-recurring" data-list="${list.id}" data-item="${item.id}">✓</button>
        <div class="task-main"><div class="task-text">${esc(item.text)}</div>
          <div class="task-sub">${this.cadenceLabel(item)} · ${last} · ${this.dueLabel(due)}</div>${item.notes ? `<div class="task-sub">${esc(item.notes)}</div>` : ''}</div>
        ${actions}
      </div>`;
    };
    return `
      ${ready.length ? `<div class="section-label">Ready when you are</div><div class="task-group">${ready.map(row).join('')}</div>` : ''}
      ${later.length ? `<div class="section-label">Resting</div><div class="task-group">${later.map(row).join('')}</div>` : ''}
      ${!entries.length ? '<div class="empty">No rhythms yet. Add one below.</div>' : ''}`;
  },

  renderProjectBody(list) {
    const items = list.items || [];
    const sections = [];
    for (const item of items) {
      const name = item.section || 'Tasks';
      let sec = sections.find(s => s.name === name);
      if (!sec) { sec = { name, items: [] }; sections.push(sec); }
      sec.items.push(item);
    }
    const total = items.length, done = items.filter(i => i.done).length;
    const pct = total ? Math.round(done / total * 100) : 0;
    const firstUndone = items.find(i => !i.done);
    const progress = `
      <div class="list-head"><div class="sub">${done}/${total} done${pct === 100 ? ' — finished! 🎉' : firstUndone ? ` · next up: <b>${esc(firstUndone.text)}</b>` : ''}</div>
      <div class="progress"><div style="width:${pct}%"></div></div></div>`;
    const blocks = sections.map(sec => {
      const secDone = sec.items.filter(i => i.done).length;
      const rows = sec.items.map(item => `
        <div class="task-row ${item.done ? 'done-row' : ''} ${firstUndone && item.id === firstUndone.id ? 'spotlight' : ''}" data-key="${list.id}/${item.id}">
          <button class="checkbtn ${item.done ? 'checked' : ''}" data-action="toggle-done" data-list="${list.id}" data-item="${item.id}">✓</button>
          <div class="task-main"><div class="task-text">${esc(item.text)}</div>${item.due && !item.done ? `<div class="task-sub">${this.dueLabel(item.due)}</div>` : ''}${item.notes ? `<div class="task-sub">${esc(item.notes)}</div>` : ''}</div>
          ${this.itemMenuOrActions(list, item)}
        </div>`).join('');
      return `<div class="group-head"><span>${esc(sec.name)}</span><span class="count">${secDone}/${sec.items.length}</span></div>
        <div class="task-group">${rows}</div>`;
    }).join('');
    return progress + blocks + (!items.length ? '<div class="empty">Blank slate. Add the first step below.</div>' : '');
  },
};

/* ---------------- toast ---------------- */
let toastTimer = null;
function toast(msg, btnLabel = null, btnFn = null) {
  const el = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  const btn = document.getElementById('toastBtn');
  if (btnLabel) {
    btn.textContent = btnLabel;
    btn.hidden = false;
    btn.onclick = () => { el.hidden = true; btnFn && btnFn(); };
  } else {
    btn.hidden = true;
  }
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, btnLabel ? 6000 : 3200);
}

/* ---------------- event wiring ---------------- */
document.addEventListener('click', (evt) => {
  const el = evt.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  const listId = el.dataset.list, itemId = el.dataset.item;
  switch (a) {
    case 'go-home':
    case 'nav-today': App.navigate('today'); break;
    case 'nav-lists': App.navigate('lists'); break;
    case 'open-list': App.navigate('list', listId); break;
    case 'open-settings': openSettings(); break;
    case 'sync-now': Sync.now('manual'); break;
    case 'check-recurring': App.checkRecurring(listId, itemId, evt); break;
    case 'toggle-done': App.toggleDone(listId, itemId, evt); break;
    case 'snooze-open': App.ui.snoozeFor = el.dataset.key; App.ui.menuFor = null; App.render(); break;
    case 'snooze-cancel': App.ui.snoozeFor = null; App.render(); break;
    case 'snooze': App.snooze(listId, itemId, +el.dataset.days); break;
    case 'menu-open': App.ui.menuFor = el.dataset.key; App.ui.snoozeFor = null; App.render(); break;
    case 'menu-close': App.ui.menuFor = null; App.render(); break;
    case 'edit-item': App.editItem(listId, itemId); break;
    case 'delete-item': App.deleteItem(listId, itemId); break;
    case 'add-item': {
      const input = document.getElementById('addInput');
      if (input && input.value.trim()) { App.addItem(listId, input.value); }
      break;
    }
    case 'new-list': openNewList(); break;
    case 'shelve-list': App.shelveList(listId, true); break;
    case 'activate-list': App.shelveList(listId, false); break;
    case 'archive-list': App.archiveList(listId); break;
    case 'pick-one': App.pickOne(); break;
  }
});

document.addEventListener('keydown', (evt) => {
  if (evt.key === 'Enter' && evt.target.id === 'addInput') {
    evt.preventDefault();
    const listId = App.ui.listId;
    if (evt.target.value.trim()) App.addItem(listId, evt.target.value);
    // re-focus the fresh input after render so you can rapid-fire entries
    requestAnimationFrame(() => { const i = document.getElementById('addInput'); if (i) i.focus(); });
  }
});

/* ---------------- dialogs ---------------- */
function openSettings() {
  const s = App.state.settings;
  document.getElementById('setName').value = s.name || '';
  document.getElementById('setOwner').value = s.owner || '';
  document.getElementById('setRepo').value = s.repo || 'slipstream-data';
  document.getElementById('setBranch').value = s.branch || 'main';
  document.getElementById('setToken').value = s.token || '';
  const dlg = document.getElementById('settingsDialog');
  dlg.showModal();
  dlg.addEventListener('close', function handler() {
    dlg.removeEventListener('close', handler);
    if (dlg.returnValue !== 'save') return;
    App.state.settings = {
      name: document.getElementById('setName').value.trim(),
      owner: document.getElementById('setOwner').value.trim(),
      repo: document.getElementById('setRepo').value.trim(),
      branch: document.getElementById('setBranch').value.trim() || 'main',
      token: document.getElementById('setToken').value.trim(),
    };
    App.persist();
    App.render();
    if (Sync.ready()) Sync.now('settings-saved');
    else App.setSyncStatus('local');
  });
}

function openNewList() {
  const dlg = document.getElementById('newListDialog');
  document.getElementById('nlTitle').value = '';
  document.getElementById('nlEmoji').value = '✅';
  document.getElementById('nlType').value = 'simple';
  document.getElementById('nlDepartureWrap').hidden = true;
  dlg.showModal();
  dlg.addEventListener('close', function handler() {
    dlg.removeEventListener('close', handler);
    if (dlg.returnValue !== 'create') return;
    App.createList(
      document.getElementById('nlTitle').value,
      document.getElementById('nlEmoji').value.trim(),
      document.getElementById('nlType').value,
      document.getElementById('nlDeparture').value || null,
    );
  });
}

document.getElementById('nlType').addEventListener('change', (e) => {
  document.getElementById('nlDepartureWrap').hidden = e.target.value !== 'trip';
});

/* ---------------- boot ---------------- */
window.addEventListener('popstate', (e) => {
  const st = e.state || { view: 'today', listId: null };
  App.ui.view = st.view;
  App.ui.listId = st.listId;
  App.render();
});

App.load();
App.navigate('today', null, true);
App.setSyncStatus(Sync.ready() ? (App.state.dirty.size ? 'pending' : 'ok') : 'local');
Sync.start();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
