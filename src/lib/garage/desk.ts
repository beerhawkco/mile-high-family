import { newId, snapshotId } from './ids.ts';
import { todayStamp, parseStore } from './store.ts';
import type { Comp, GarageStore, SentimentNote, Snapshot, Vehicle, VehicleId } from './types.ts';

function $(id: string) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node;
}

function input(id: string) {
  return $(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
}

function setHidden(id: string, hidden: boolean) {
  $(id).classList.toggle('hidden', hidden);
}

function setStatus(message: string, kind: 'ok' | 'err' | 'busy' = 'ok') {
  const node = $('status');
  node.textContent = message;
  node.setAttribute('data-kind', kind);
}

const state: {
  store: GarageStore | null;
  vehicleId: VehicleId | null;
} = {
  store: null,
  vehicleId: null,
};

async function api(path: string, init: RequestInit = {}) {
  const res = await fetch(path, {
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
    ...init,
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function currentVehicle(): Vehicle {
  const store = state.store;
  const id = state.vehicleId;
  if (!store || !id) throw new Error('Nothing loaded.');
  const vehicle = store.vehicles.find((item) => item.id === id);
  if (!vehicle) throw new Error('Pick a vehicle.');
  return vehicle;
}

function currentSnapshot(): Snapshot | null {
  const store = state.store;
  const id = state.vehicleId;
  if (!store || !id) return null;
  const date = input('snap-date').value || todayStamp();
  return (
    store.snapshots.find((item) => item.vehicleId === id && item.date === date) ??
    [...store.snapshots.filter((item) => item.vehicleId === id)].sort((a, b) => a.date.localeCompare(b.date)).at(-1) ??
    null
  );
}

function blankSnapshot(vehicleId: VehicleId, date: string): Snapshot {
  return {
    id: snapshotId(vehicleId, date),
    vehicleId,
    date,
    askingLow: 0,
    askingHigh: 0,
    askingMedian: 0,
    soldMedian: null,
    listingCount: 0,
    daysOnMarket: 0,
    sentiment: 'warm',
    sentimentScore: 0,
    trend: 'flat',
    headline: '',
    brief: '',
    source: 'admin',
    needsReview: true,
  };
}

function numberValue(id: string) {
  const raw = input(id).value;
  if (raw === '') return 0;
  return Number(raw);
}

function optionalNumber(id: string) {
  const raw = input(id).value;
  if (raw === '') return null;
  return Number(raw);
}

function collectSnapshot(): Snapshot {
  const vehicle = currentVehicle();
  const date = input('snap-date').value || todayStamp();
  const previous = currentSnapshot();
  return {
    ...(previous ?? blankSnapshot(vehicle.id, date)),
    id: snapshotId(vehicle.id, date),
    vehicleId: vehicle.id,
    date,
    askingLow: numberValue('snap-low'),
    askingHigh: numberValue('snap-high'),
    askingMedian: numberValue('snap-median'),
    soldMedian: optionalNumber('snap-sold'),
    listingCount: numberValue('snap-count'),
    daysOnMarket: numberValue('snap-dom'),
    sentiment: input('snap-sentiment').value as Snapshot['sentiment'],
    sentimentScore: numberValue('snap-score'),
    trend: input('snap-trend').value as Snapshot['trend'],
    headline: input('snap-headline').value.trim(),
    brief: input('snap-brief').value.trim(),
    source: 'admin',
    needsReview: (input('snap-review') as HTMLInputElement).checked,
  };
}

function collectVehicle(): Vehicle {
  const vehicle = currentVehicle();
  return {
    ...vehicle,
    summary: input('vehicle-summary').value.trim(),
    notes: input('vehicle-notes').value.trim(),
  };
}

function applyVehicleEdits(store: GarageStore) {
  if (!state.vehicleId) return store;
  const vehicle = collectVehicle();
  const snapshot = collectSnapshot();
  return {
    ...store,
    vehicles: store.vehicles.map((item) => (item.id === vehicle.id ? vehicle : item)),
    snapshots: [
      ...store.snapshots.filter((item) => !(item.vehicleId === snapshot.vehicleId && item.date === snapshot.date)),
      snapshot,
    ],
  };
}

function renderVehicleOptions() {
  const select = input('vehicle');
  const store = state.store;
  if (!store) return;
  select.innerHTML = store.vehicles
    .map((vehicle) => `<option value="${vehicle.id}">${vehicle.name}</option>`)
    .join('');
  if (!state.vehicleId) state.vehicleId = store.vehicles[0]?.id ?? null;
  if (state.vehicleId) select.value = state.vehicleId;
}

function fillSnapshot(snapshot: Snapshot | null) {
  const date = snapshot?.date || todayStamp();
  input('snap-date').value = date;
  input('snap-median').value = snapshot ? String(snapshot.askingMedian) : '';
  input('snap-low').value = snapshot ? String(snapshot.askingLow) : '';
  input('snap-high').value = snapshot ? String(snapshot.askingHigh) : '';
  input('snap-sold').value = snapshot?.soldMedian == null ? '' : String(snapshot.soldMedian);
  input('snap-count').value = snapshot ? String(snapshot.listingCount) : '';
  input('snap-dom').value = snapshot ? String(snapshot.daysOnMarket) : '';
  input('snap-score').value = snapshot ? String(snapshot.sentimentScore) : '0';
  input('snap-sentiment').value = snapshot?.sentiment ?? 'warm';
  input('snap-trend').value = snapshot?.trend ?? 'flat';
  input('snap-headline').value = snapshot?.headline ?? '';
  input('snap-brief').value = snapshot?.brief ?? '';
  (input('snap-review') as HTMLInputElement).checked = snapshot?.needsReview ?? true;
}

function renderComps() {
  const store = state.store;
  const id = state.vehicleId;
  const root = $('comp-list');
  if (!store || !id) {
    root.innerHTML = '';
    return;
  }
  const comps = store.comps.filter((item) => item.vehicleId === id).sort((a, b) => b.listedOn.localeCompare(a.listedOn));
  root.innerHTML = comps
    .map(
      (comp) => `
      <article class="item" data-comp="${comp.id}">
        <label>Title<input data-field="title" value="${escapeAttr(comp.title)}" /></label>
        <div class="grid">
          <label>Year<input data-field="year" type="number" value="${comp.year}" /></label>
          <label>Price<input data-field="price" type="number" value="${comp.price}" /></label>
          <label>Miles<input data-field="miles" type="number" value="${comp.miles ?? ''}" /></label>
          <label>Hours<input data-field="hours" type="number" value="${comp.hours ?? ''}" /></label>
          <label>Listed<input data-field="listedOn" type="date" value="${comp.listedOn}" /></label>
          <label>Status
            <select data-field="status">
              <option value="active" ${comp.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="sold" ${comp.status === 'sold' ? 'selected' : ''}>Sold</option>
              <option value="expired" ${comp.status === 'expired' ? 'selected' : ''}>Expired</option>
            </select>
          </label>
        </div>
        <label>Location<input data-field="location" value="${escapeAttr(comp.location)}" /></label>
        <label>Source<input data-field="source" value="${escapeAttr(comp.source)}" /></label>
        <label>Condition<input data-field="condition" value="${escapeAttr(comp.condition)}" /></label>
        <label>URL<input data-field="url" value="${escapeAttr(comp.url)}" /></label>
        <label>Notes<textarea data-field="notes" rows="2">${escapeText(comp.notes)}</textarea></label>
        <button type="button" class="btn danger" data-delete-comp="${comp.id}">Remove</button>
      </article>`,
    )
    .join('');
}

function renderNotes() {
  const store = state.store;
  const id = state.vehicleId;
  const root = $('note-list');
  if (!store || !id) {
    root.innerHTML = '';
    return;
  }
  const notes = store.sentiments.filter((item) => item.vehicleId === id).sort((a, b) => b.date.localeCompare(a.date));
  root.innerHTML = notes
    .map(
      (note) => `
      <article class="item" data-note="${note.id}">
        <div class="grid">
          <label>Date<input data-field="date" type="date" value="${note.date}" /></label>
          <label>Tone
            <select data-field="tone">
              <option value="positive" ${note.tone === 'positive' ? 'selected' : ''}>Positive</option>
              <option value="neutral" ${note.tone === 'neutral' ? 'selected' : ''}>Neutral</option>
              <option value="negative" ${note.tone === 'negative' ? 'selected' : ''}>Negative</option>
            </select>
          </label>
        </div>
        <label>Source<input data-field="source" value="${escapeAttr(note.source)}" /></label>
        <label>URL<input data-field="url" value="${escapeAttr(note.url)}" /></label>
        <label>Summary<textarea data-field="summary" rows="3">${escapeText(note.summary)}</textarea></label>
        <button type="button" class="btn danger" data-delete-note="${note.id}">Remove</button>
      </article>`,
    )
    .join('');
}

function escapeAttr(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

function escapeText(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
}

function readComp(article: HTMLElement, vehicleId: VehicleId): Comp {
  const get = (field: string) =>
    (article.querySelector(`[data-field="${field}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)
      .value;
  const miles = get('miles');
  const hours = get('hours');
  return {
    id: article.dataset.comp as string,
    vehicleId,
    title: get('title').trim(),
    year: Number(get('year')) || new Date().getFullYear(),
    price: Number(get('price')) || 0,
    miles: miles === '' ? null : Number(miles),
    hours: hours === '' ? null : Number(hours),
    location: get('location').trim(),
    condition: get('condition').trim(),
    source: get('source').trim(),
    url: get('url').trim(),
    listedOn: get('listedOn') || todayStamp(),
    status: get('status') as Comp['status'],
    notes: get('notes').trim(),
  };
}

function readNote(article: HTMLElement, vehicleId: VehicleId): SentimentNote {
  const get = (field: string) =>
    (article.querySelector(`[data-field="${field}"]`) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement)
      .value;
  return {
    id: article.dataset.note as string,
    vehicleId,
    date: get('date') || todayStamp(),
    source: get('source').trim(),
    tone: get('tone') as SentimentNote['tone'],
    summary: get('summary').trim(),
    url: get('url').trim(),
  };
}

function collectLists(store: GarageStore) {
  const id = state.vehicleId;
  if (!id) return store;
  const comps = [...document.querySelectorAll<HTMLElement>('[data-comp]')].map((node) => readComp(node, id));
  const notes = [...document.querySelectorAll<HTMLElement>('[data-note]')].map((node) => readNote(node, id));
  return {
    ...store,
    comps: [...store.comps.filter((item) => item.vehicleId !== id), ...comps],
    sentiments: [...store.sentiments.filter((item) => item.vehicleId !== id), ...notes],
  };
}

function renderAll() {
  if (!state.store || !state.vehicleId) return;
  const vehicle = currentVehicle();
  input('vehicle-summary').value = vehicle.summary;
  input('vehicle-notes').value = vehicle.notes;
  const date = input('snap-date').value || todayStamp();
  const snapshot =
    state.store.snapshots.find((item) => item.vehicleId === vehicle.id && item.date === date) ??
    [...state.store.snapshots.filter((item) => item.vehicleId === vehicle.id)].sort((a, b) => a.date.localeCompare(b.date)).at(-1) ??
    null;
  fillSnapshot(snapshot);
  renderComps();
  renderNotes();
}

function stashEdits() {
  if (!state.store || !state.vehicleId) return;
  state.store = collectLists(applyVehicleEdits(state.store));
}

async function afterUnlock(user: string) {
  setHidden('login-panel', true);
  setHidden('app-panel', false);
  $('signed-in').textContent = `Signed in as ${user}`;
  setStatus('Loading the notebook…', 'busy');
  state.store = parseStore(await api('/api/garage/store'));
  renderVehicleOptions();
  renderAll();
  setStatus('Unlocked. Username and password only — no token.');
}

async function unlock(event: Event) {
  event.preventDefault();
  setStatus('Signing in…', 'busy');
  try {
    const data = (await api('/api/garage/login', {
      method: 'POST',
      body: JSON.stringify({
        website: input('website').value,
        username: input('username').value,
        password: input('password').value,
      }),
    })) as { user?: string };
    input('password').value = '';
    await afterUnlock(data.user || input('username').value);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Sign-in failed.', 'err');
  }
}

async function logout() {
  await api('/api/garage/logout', { method: 'POST' });
  state.store = null;
  state.vehicleId = null;
  setHidden('app-panel', true);
  setHidden('login-panel', false);
  setStatus('Signed out.');
}

async function save() {
  if (!state.store) return;
  setStatus('Saving…', 'busy');
  try {
    stashEdits();
    state.store = parseStore(await api('/api/garage/store', { method: 'PUT', body: JSON.stringify(state.store) }));
    renderAll();
    setStatus('Saved. Public pages pick this up on the next refresh or deploy.');
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Save failed.', 'err');
  }
}

async function pulse() {
  setStatus('Carrying yesterday forward…', 'busy');
  try {
    stashEdits();
    state.store = parseStore(await api('/api/garage/pulse', { method: 'POST', body: JSON.stringify({}) }));
    input('snap-date').value = todayStamp();
    renderAll();
    setStatus('Today’s pulse is ready. Edit the numbers, then save.');
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Pulse failed.', 'err');
  }
}

function addComp() {
  if (!state.store || !state.vehicleId) return;
  stashEdits();
  state.store.comps.push({
    id: newId('cmp'),
    vehicleId: state.vehicleId,
    title: '',
    year: state.store.vehicles.find((item) => item.id === state.vehicleId)?.year ?? new Date().getFullYear(),
    price: 0,
    miles: null,
    hours: null,
    location: '',
    condition: '',
    source: '',
    url: '',
    listedOn: todayStamp(),
    status: 'active',
    notes: '',
  });
  renderComps();
}

function addNote() {
  if (!state.store || !state.vehicleId) return;
  stashEdits();
  state.store.sentiments.push({
    id: newId('sen'),
    vehicleId: state.vehicleId,
    date: todayStamp(),
    source: '',
    tone: 'neutral',
    summary: '',
    url: '',
  });
  renderNotes();
}

export function boot() {
  void (async () => {
    try {
      const session = (await api('/api/garage/session')) as { ok?: boolean; user?: string };
      if (session.ok && session.user) await afterUnlock(session.user);
    } catch {
      setStatus('Locked.');
    }
  })();

  $('login-form').addEventListener('submit', (event) => void unlock(event));
  $('logout-btn').addEventListener('click', () => void logout());
  $('save-btn').addEventListener('click', () => void save());
  $('pulse-btn').addEventListener('click', () => void pulse());
  $('add-comp').addEventListener('click', addComp);
  $('add-note').addEventListener('click', addNote);
  input('vehicle').addEventListener('change', () => {
    stashEdits();
    state.vehicleId = input('vehicle').value as VehicleId;
    renderAll();
  });
  input('snap-date').addEventListener('change', () => {
    stashEdits();
    renderAll();
  });
  $('comp-list').addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest('[data-delete-comp]');
    if (!button || !state.store) return;
    stashEdits();
    const id = button.getAttribute('data-delete-comp');
    state.store.comps = state.store.comps.filter((item) => item.id !== id);
    renderComps();
  });
  $('note-list').addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest('[data-delete-note]');
    if (!button || !state.store) return;
    stashEdits();
    const id = button.getAttribute('data-delete-note');
    state.store.sentiments = state.store.sentiments.filter((item) => item.id !== id);
    renderNotes();
  });
}
