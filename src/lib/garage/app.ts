import { gaugeDegrees, gaugeNeedle, medianSeries, sparkPath, sparkPoints } from './charts.ts';
import { OWNED_LABEL, prettyDate } from './labels.ts';
import { vehiclePath } from './market.ts';
import { compactDollars, dollars, signedDollars } from './money.ts';
import { ourDaysListed, vsMarket } from './market.ts';
import { compsFor, latestSnapshot, parseStore, sentimentsFor, snapshotsFor, todayStamp } from './store.ts';
import type { GarageStore, Vehicle } from './types.ts';

function $(id: string) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node;
}

function setHidden(id: string, hidden: boolean) {
  $(id).classList.toggle('hidden', hidden);
}

function setStatus(message: string, kind: 'ok' | 'err' | 'busy' = 'ok') {
  const node = $('status');
  node.textContent = message;
  node.setAttribute('data-kind', kind);
}

function setLocked(locked: boolean) {
  document.body.classList.toggle('g-locked', locked);
}

function setText(id: string, value: string) {
  const node = document.getElementById(id);
  if (node) node.textContent = value;
}

function setHero(input: { line1: string; line2: string; accent?: string; meta?: string; lede: string }) {
  setText('g-line-1', input.line1);
  setText('g-line-2', input.line2);
  setText('g-line-3', input.accent ?? 'Price tracker');
  setText('g-meta', input.meta ?? '80202 · 250 mi');
  setText('g-lede', input.lede);
}

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

function deltaChip(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null || previous === 0) return '<span class="g-chip flat">vs last</span>';
  const pct = ((current - previous) / previous) * 100;
  if (Math.abs(pct) < 0.35) return '<span class="g-chip flat">flat</span>';
  const up = pct > 0;
  return `<span class="g-chip${up ? '' : ' down'}">${up ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%</span>`;
}

function sparkSvg(values: number[]) {
  const usable = values.filter((value) => Number.isFinite(value));
  if (usable.length < 2) return '';
  const d = sparkPath(usable, 220, 46, 6);
  const dots = sparkPoints(usable, 220, 46, 6)
    .map((point) => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="2.4" fill="#e0b25a"></circle>`)
    .join('');
  return `<svg class="g-spark" viewBox="0 0 220 46" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="#e0b25a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></path>${dots}</svg>`;
}

function gaugeSvg(score: number | null | undefined) {
  const degrees = gaugeDegrees(score);
  const tip = gaugeNeedle(60, 68, 38, degrees);
  return `
    <svg class="g-gauge" viewBox="0 0 120 78" aria-hidden="true">
      <path d="M12 68 A48 48 0 0 1 108 68" fill="none" stroke="#c85a32" stroke-width="8" stroke-linecap="round" stroke-dasharray="50 200"></path>
      <path d="M12 68 A48 48 0 0 1 108 68" fill="none" stroke="#e0b25a" stroke-width="8" stroke-linecap="round" stroke-dasharray="50 200" stroke-dashoffset="-48"></path>
      <path d="M12 68 A48 48 0 0 1 108 68" fill="none" stroke="#9cbc7a" stroke-width="8" stroke-linecap="round" stroke-dasharray="50 200" stroke-dashoffset="-96"></path>
      <line x1="60" y1="68" x2="${tip.x.toFixed(1)}" y2="${tip.y.toFixed(1)}" stroke="#f3eee4" stroke-width="2.6" stroke-linecap="round"></line>
      <circle cx="60" cy="68" r="3.4" fill="#f3eee4"></circle>
    </svg>
  `;
}

function silhouettes(kind: Vehicle['kind']) {
  const car = `
    <svg viewBox="0 0 72 28" fill="none" aria-hidden="true">
      <path d="M8 20h56M14 20c0-3 2-5 5-5h4c2-6 8-9 16-9s14 3 16 9h4c3 0 5 2 5 5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <circle cx="24" cy="20" r="3.2" stroke="currentColor" stroke-width="1.6"/>
      <circle cx="50" cy="20" r="3.2" stroke="currentColor" stroke-width="1.6"/>
    </svg>`;
  const rv = `
    <svg viewBox="0 0 72 28" fill="none" aria-hidden="true">
      <path d="M6 20h60M10 20V9h36l12 7v4" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <rect x="14" y="11" width="8" height="5" stroke="currentColor" stroke-width="1.4"/>
      <circle cx="22" cy="20" r="3" stroke="currentColor" stroke-width="1.6"/>
      <circle cx="50" cy="20" r="3" stroke="currentColor" stroke-width="1.6"/>
    </svg>`;
  const mark = kind === 'rv' ? rv : car;
  return `<div class="g-silhouettes">${mark}${mark}${mark}</div>`;
}

function priorSnapshot(store: GarageStore, vehicleId: Vehicle['id']) {
  const history = snapshotsFor(store, vehicleId);
  return history.length > 1 ? history[history.length - 2] : null;
}

function marketAskSeries(store: GarageStore, ids?: string[]) {
  const byDate = new Map<string, number[]>();
  for (const snap of store.snapshots) {
    if (ids && !ids.includes(snap.vehicleId)) continue;
    const list = byDate.get(snap.date) ?? [];
    list.push(snap.askingMedian);
    byDate.set(snap.date, list);
  }
  return [...byDate.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, values]) => Math.round(values.reduce((sum, value) => sum + value, 0) / values.length));
}

function daysText(value: number | null | undefined) {
  return value == null ? '—' : `${value}d`;
}

function marketMeta(store: GarageStore, date?: string) {
  return `80202 · ${store.market.radiusMiles} mi · ${prettyDate(date ?? todayStamp())}`;
}

function stat(label: string, value: string, hint: string, extra = '') {
  return `
    <article class="g-stat">
      <p class="label"><span>${label}</span>${extra}</p>
      <p class="value">${value}</p>
      <p class="hint">${hint}</p>
    </article>
  `;
}

function tracker(vehicle: Vehicle, store: GarageStore) {
  const latest = latestSnapshot(store, vehicle.id);
  const ourAsk = vehicle.owned.askingPrice;
  const sold = latest?.soldMedian ?? null;
  const ask = latest?.askingMedian ?? null;
  const daysOurs = ourDaysListed(vehicle.owned.listedOn, todayStamp());
  const href = vehiclePath(vehicle.kind, vehicle.id);
  const asks = medianSeries(snapshotsFor(store, vehicle.id));
  const live = latest?.listingCount ?? 0;
  return `
    <a href="${href}" class="g-tracker">
      <div class="g-tracker-copy">
        <p class="g-stack">
          <span>${vehicle.year}</span>
          <span>${vehicle.make}</span>
          <span class="accent">Price tracker</span>
        </p>
        <p class="g-model">${vehicle.model} ${vehicle.trim} · ${vehicle.intent === 'buy' ? 'Watching' : 'For sale'}</p>
        <p class="g-meta-pill">${marketMeta(store, latest?.date)}</p>
        <p class="g-note" style="margin-top:.7rem">${vehicle.summary}</p>
      </div>
      <div class="g-panel">
        <div class="g-panel-top">
          <div>
            <p class="g-hero-num">${live || '—'}</p>
            <p class="g-hero-label">Live asks</p>
          </div>
          ${gaugeSvg(latest?.sentimentScore)}
        </div>
        ${sparkSvg(asks)}
        ${silhouettes(vehicle.kind)}
        <div class="g-panel-metrics">
          <span>Sold ${compactDollars(sold)}</span>
          <span>Ask ${compactDollars(ask)}</span>
          <span>Book ${compactDollars(ourAsk)}</span>
          <span>${OWNED_LABEL[vehicle.owned.status]}${daysOurs != null ? ` · ${daysOurs}d` : ''}</span>
        </div>
      </div>
    </a>
  `;
}

function portfolio(store: GarageStore) {
  const units = store.vehicles;
  const snaps = units.map((vehicle) => latestSnapshot(store, vehicle.id));
  const priors = units.map((vehicle) => priorSnapshot(store, vehicle.id));
  const ourAsks = units.map((vehicle) => vehicle.owned.askingPrice).filter((value): value is number => value != null);
  const solds = snaps.map((snap) => snap?.soldMedian).filter((value): value is number => value != null);
  const priorSolds = priors.map((snap) => snap?.soldMedian).filter((value): value is number => value != null);
  const priorAsks = snaps
    .map((_, index) => priors[index]?.askingMedian)
    .filter((value): value is number => value != null);
  const liveAsks = snaps.map((snap) => snap?.askingMedian).filter((value): value is number => value != null);
  const listings = snaps.reduce((sum, snap) => sum + (snap?.listingCount ?? 0), 0);
  const days = snaps.map((snap) => snap?.medianDaysToSale).filter((value): value is number => value != null);
  const avg = (values: number[]) =>
    values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
  const heat = snaps.map((snap) => snap?.sentimentScore).filter((value): value is number => value != null);
  return `
    <div class="g-strip">
      ${stat('Book ask', dollars(avg(ourAsks)), `${units.length} units in the book`)}
      ${stat('Sold median', dollars(avg(solds)), 'Recent sold prints', deltaChip(avg(solds), avg(priorSolds)))}
      ${stat('Live asking', dollars(avg(liveAsks)), `${listings} listings in the ring`, deltaChip(avg(liveAsks), avg(priorAsks)))}
      ${stat('Days to sale', daysText(avg(days)), `${store.market.radiusMiles} mi of ${store.market.center}`)}
    </div>
    <div class="g-tracker" style="margin-bottom:1.1rem">
      <div class="g-tracker-copy">
        <p class="g-stack">
          <span>Front</span>
          <span>Range</span>
          <span class="accent">Market tape</span>
        </p>
        <p class="g-meta-pill">${marketMeta(store)}</p>
      </div>
      <div class="g-panel">
        <div class="g-panel-top">
          <div>
            <p class="g-hero-num">${listings || '—'}</p>
            <p class="g-hero-label">Combined live asks</p>
          </div>
          ${gaugeSvg(avg(heat))}
        </div>
        ${sparkSvg(marketAskSeries(store))}
        <div class="g-panel-metrics">
          <span>Sold ${compactDollars(avg(solds))}</span>
          <span>Ask ${compactDollars(avg(liveAsks))}</span>
          <span>${daysText(avg(days))} to sale</span>
        </div>
      </div>
    </div>
  `;
}

function renderHome(store: GarageStore) {
  const cars = store.vehicles.filter((item) => item.kind === 'car');
  const rvs = store.vehicles.filter((item) => item.kind === 'rv');
  setHero({
    line1: 'Denver',
    line2: '250mi',
    accent: 'Price tracker',
    meta: marketMeta(store),
    lede: 'Sold prints, live asks, and days listed before sale. Open a unit to work one market.',
  });
  return `
    ${portfolio(store)}
    <div class="g-section">
      <h2>Units</h2>
      <p>Cars and RVs</p>
    </div>
    <div class="g-grid two">
      ${[...cars, ...rvs].map((vehicle) => tracker(vehicle, store)).join('')}
    </div>
  `;
}

function renderSection(store: GarageStore, section: 'cars' | 'rvs') {
  const list = store.vehicles.filter((item) => (item.kind === 'rv' ? 'rvs' : 'cars') === section);
  const label = section === 'cars' ? 'Cars' : 'RVs';
  const empty =
    section === 'rvs'
      ? 'When you shop the next RV, add it on the desk as “Watching to buy”.'
      : 'Add another car on the desk when you need it.';
  setHero({
    line1: 'Front',
    line2: 'Range',
    accent: `${label} desk`,
    meta: marketMeta(store),
    lede: empty,
  });
  const ids = list.map((vehicle) => vehicle.id);
  const listings = list.reduce((sum, vehicle) => sum + (latestSnapshot(store, vehicle.id)?.listingCount ?? 0), 0);
  const first = latestSnapshot(store, list[0]?.id ?? 'tesla-model-y-lr');
  return `
    <div class="g-strip">
      ${stat('Units', String(list.length), label)}
      ${stat('Live listings', String(listings), 'Current asking set')}
      ${stat('Sold median', dollars(first?.soldMedian), 'Latest pulse')}
      ${stat('Days to sale', daysText(first?.medianDaysToSale), 'Median days listed')}
    </div>
    ${sparkSvg(marketAskSeries(store, ids))}
    <div class="g-grid" style="margin-top: 1rem">
      ${list.map((vehicle) => tracker(vehicle, store)).join('') || `<p class="g-note">Nothing in ${label} yet.</p>`}
    </div>
  `;
}

function renderVehicle(store: GarageStore, slug: string) {
  const vehicle = store.vehicles.find((item) => item.id === slug);
  if (!vehicle) {
    setHero({ line1: 'Garage', line2: 'Unknown', lede: 'That slug is not in the notebook.' });
    return `<p class="g-alert">Unknown vehicle.</p>`;
  }
  const latest = latestSnapshot(store, vehicle.id);
  const prior = priorSnapshot(store, vehicle.id);
  const history = snapshotsFor(store, vehicle.id);
  const comps = compsFor(store, vehicle.id);
  const notes = sentimentsFor(store, vehicle.id);
  const sold = comps.filter((item) => item.status === 'sold');
  const asking = comps.filter((item) => item.status === 'active');
  const ourAsk = vehicle.owned.askingPrice;
  setHero({
    line1: String(vehicle.year),
    line2: vehicle.make,
    accent: 'Price tracker',
    meta: marketMeta(store, latest?.date),
    lede: `${vehicle.summary} ${latest?.brief ?? ''}`.trim(),
  });
  return `
    ${tracker(vehicle, store)}
    <div class="g-strip" style="margin-top:1.1rem">
      ${stat('Our ask', dollars(ourAsk), `${OWNED_LABEL[vehicle.owned.status]} · target ${dollars(vehicle.owned.targetPrice)}`)}
      ${stat('Sold median', dollars(latest?.soldMedian), `${latest?.soldCount ?? 0} sales · ${daysText(latest?.medianDaysToSale)} to sale`, deltaChip(latest?.soldMedian, prior?.soldMedian))}
      ${stat('Live ask', dollars(latest?.askingMedian), `${latest?.askingLow ? `${dollars(latest.askingLow)}–${dollars(latest.askingHigh)}` : '—'} · ${latest?.listingCount ?? 0} live`, deltaChip(latest?.askingMedian, prior?.askingMedian))}
      ${stat('Ask vs sold', signedDollars(vsMarket(ourAsk, latest?.soldMedian ?? null)), `vs ask ${signedDollars(vsMarket(ourAsk, latest?.askingMedian ?? null))}`)}
    </div>
    <div class="g-section">
      <h2>Sold · days listed</h2>
      <p>${sold.length} prints</p>
    </div>
    <div class="g-card">
      <div class="g-table-wrap">
        <table class="g-table">
          <thead><tr>
            <th>Listing</th><th class="num">Sold</th><th class="num">Days</th><th>Where</th>
          </tr></thead>
          <tbody>
            ${
              sold
                .map(
                  (comp) => `
              <tr>
                <td>${comp.title}<p class="sub">${comp.notes}</p></td>
                <td class="num">${dollars(comp.soldPrice ?? comp.price)}</td>
                <td class="num">${daysText(comp.daysListed)}</td>
                <td>${comp.location}</td>
              </tr>`,
                )
                .join('') || `<tr><td class="g-note" colspan="4">No sold prints yet. Fetch the market or add one on the desk.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </div>
    <div class="g-section">
      <h2>Current asking</h2>
      <p>${asking.length} live</p>
    </div>
    <div class="g-card">
      <div class="g-table-wrap">
        <table class="g-table">
          <thead><tr>
            <th>Listing</th><th class="num">Ask</th><th class="num">Miles</th><th>Where</th>
          </tr></thead>
          <tbody>
            ${asking
              .map(
                (comp) => `
              <tr>
                <td>${comp.title}</td>
                <td class="num">${dollars(comp.price)}</td>
                <td class="num">${comp.miles ?? '—'}</td>
                <td>${comp.location}<p class="sub">${prettyDate(comp.listedOn)}</p></td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </div>
    <p class="g-note" style="margin-top: 1rem">${history.length} daily pulses on file. Market: ${store.market.radiusMiles} miles of ${store.market.center}.</p>
    ${
      notes.length
        ? `<div class="g-section"><h2>Notes</h2><p>${notes.length}</p></div><div class="g-grid two">${notes
            .map(
              (note) =>
                `<article class="g-card"><p class="g-meta-pill">${note.source} · ${prettyDate(note.date)}</p><p class="g-note" style="margin-top:.5rem">${note.summary}</p></article>`,
            )
            .join('')}</div>`
        : ''
    }
  `;
}

function paint(store: GarageStore) {
  const view = document.body.dataset.garageView ?? 'home';
  const slug = document.body.dataset.garageSlug ?? '';
  const root = $('garage-app');
  if (view === 'cars') root.innerHTML = renderSection(store, 'cars');
  else if (view === 'rvs') root.innerHTML = renderSection(store, 'rvs');
  else if (view === 'vehicle' && slug) root.innerHTML = renderVehicle(store, slug);
  else root.innerHTML = renderHome(store);
}

async function afterUnlock(user: string) {
  setLocked(false);
  setHidden('login-panel', true);
  setHidden('app-panel', false);
  setStatus(`Signed in as ${user}. Private — not on the public site.`, 'ok');
  paint(parseStore(await api('/api/garage/store')));
}

async function unlock(event: Event) {
  event.preventDefault();
  setStatus('Signing in…', 'busy');
  try {
    const username = (document.getElementById('username') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;
    const website = (document.getElementById('website') as HTMLInputElement).value;
    const data = (await api('/api/garage/login', {
      method: 'POST',
      body: JSON.stringify({ website, username, password }),
    })) as { user?: string };
    (document.getElementById('password') as HTMLInputElement).value = '';
    await afterUnlock(data.user || username);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : 'Sign-in failed.', 'err');
  }
}

async function logout() {
  await api('/api/garage/logout', { method: 'POST' });
  $('garage-app').innerHTML = '';
  setHidden('app-panel', true);
  setHidden('login-panel', false);
  setLocked(true);
  setHero({
    line1: 'Denver',
    line2: '250mi',
    accent: 'Price tracker',
    lede: 'Sold prints, live asks, and days listed before sale.',
  });
  setStatus('Signed out.');
}

export function bootGarage() {
  setLocked(true);
  void (async () => {
    try {
      const session = (await api('/api/garage/session')) as { ok?: boolean; user?: string };
      if (session.ok && session.user) await afterUnlock(session.user);
    } catch {
      setStatus('Locked.');
    }
  })();
  $('login-form').addEventListener('submit', (event) => void unlock(event));
  document.getElementById('logout-btn')?.addEventListener('click', () => void logout());
}
