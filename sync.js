/* GitHub sync engine.
 * Data lives as one JSON file per list at data/<id>.json in a private repo.
 * Strategy: pull (sha-diff per file), merge (item-level, newest updatedAt wins),
 * push dirty lists with known sha; on conflict, re-pull and retry once.
 */
const Sync = (() => {
  const API = 'https://api.github.com';
  let busy = false;
  let timer = null;

  function settings() { return App.state.settings; }

  function ready() {
    const s = settings();
    return !!(s.owner && s.repo && s.token);
  }

  function b64encode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }

  function b64decode(b64) {
    const bin = atob(b64.replace(/\s/g, ''));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  async function gh(path, opts = {}) {
    const s = settings();
    const res = await fetch(API + path, {
      ...opts,
      headers: {
        'Authorization': 'Bearer ' + s.token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opts.headers || {}),
      },
    });
    if (res.status === 404) return { __status: 404 };
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      const err = new Error('GitHub ' + res.status + ': ' + body.slice(0, 200));
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? {} : res.json();
  }

  function repoPath(p) {
    const s = settings();
    return `/repos/${s.owner}/${s.repo}/contents/${p}`;
  }

  /* Merge a locally-dirty list with its remote counterpart.
   * Scalar fields: newest list updatedAt wins. Items: union by id, newest
   * item updatedAt wins. Deletions made on only one side can resurrect an
   * item — acceptable for a personal app; archive instead of delete. */
  function mergeLists(local, remote) {
    const localNewer = (local.updatedAt || '') > (remote.updatedAt || '');
    const merged = JSON.parse(JSON.stringify(localNewer ? local : remote));
    const base = localNewer ? remote : local;
    const byId = new Map((merged.items || []).map(i => [i.id, i]));
    for (const item of (base.items || [])) {
      const have = byId.get(item.id);
      if (!have) byId.set(item.id, item);
      else if ((item.updatedAt || '') > (have.updatedAt || '')) byId.set(item.id, item);
    }
    merged.items = [...byId.values()];
    return merged;
  }

  async function pull() {
    const listing = await gh(repoPath('data') + '?ref=' + (settings().branch || 'main'));
    if (listing.__status === 404) return; // no data dir yet — first push creates it
    const remoteFiles = new Set();
    for (const f of listing) {
      if (!f.name.endsWith('.json')) continue;
      remoteFiles.add(f.name);
      const id = f.name.replace(/\.json$/, '');
      if (App.state.shas[f.name] === f.sha && !App.state.dirty.has(id)) continue;
      if (App.state.shas[f.name] === f.sha) continue; // dirty but remote unchanged: push will handle
      const file = await gh(repoPath('data/' + f.name) + '?ref=' + (settings().branch || 'main'));
      let remote;
      try { remote = JSON.parse(b64decode(file.content)); }
      catch (e) { console.warn('Bad JSON in', f.name, e); continue; }
      const local = App.state.lists[id];
      if (local && App.state.dirty.has(id)) {
        App.state.lists[id] = mergeLists(local, remote);
        // keep dirty so the merged result is pushed back
      } else {
        App.state.lists[id] = remote;
      }
      App.state.shas[f.name] = f.sha;
    }
    // Remote deletions: drop local copies that aren't locally modified.
    for (const id of Object.keys(App.state.lists)) {
      const fname = id + '.json';
      if (!remoteFiles.has(fname) && App.state.shas[fname] && !App.state.dirty.has(id)) {
        delete App.state.lists[id];
        delete App.state.shas[fname];
      }
    }
  }

  async function pushOne(id) {
    const list = App.state.lists[id];
    if (!list) { App.state.dirty.delete(id); return; }
    const fname = id + '.json';
    const body = {
      message: `Update ${list.title} (Slipstream app)`,
      content: b64encode(JSON.stringify(list, null, 2) + '\n'),
      branch: settings().branch || 'main',
    };
    if (App.state.shas[fname]) body.sha = App.state.shas[fname];
    const res = await gh(repoPath('data/' + fname), {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    App.state.shas[fname] = res.content.sha;
    App.state.dirty.delete(id);
  }

  async function push() {
    for (const id of [...App.state.dirty]) {
      try {
        await pushOne(id);
      } catch (e) {
        if (e.status === 409 || e.status === 422) {
          await pull();          // refresh shas + merge
          await pushOne(id);     // retry once
        } else {
          throw e;
        }
      }
    }
  }

  async function now(reason = '') {
    if (!ready()) { App.setSyncStatus('local'); return; }
    if (busy) return;
    if (!navigator.onLine) { App.setSyncStatus('offline'); return; }
    busy = true;
    App.setSyncStatus('busy');
    try {
      await pull();
      await push();
      App.state.lastSync = new Date().toISOString();
      App.persist();
      App.setSyncStatus('ok');
      App.render();
    } catch (e) {
      console.warn('Sync failed', reason, e);
      App.setSyncStatus('error', e.message);
    } finally {
      busy = false;
    }
  }

  /* Debounced sync after local edits. */
  function schedule() {
    if (!ready()) return;
    clearTimeout(timer);
    timer = setTimeout(() => now('debounced'), 2500);
  }

  function start() {
    window.addEventListener('online', () => now('online'));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') now('visible');
      else if (App.state.dirty.size) now('hidden-flush');
    });
    setInterval(() => {
      if (document.visibilityState === 'visible') now('interval');
    }, 5 * 60 * 1000);
    now('startup');
  }

  return { now, schedule, start, ready };
})();
