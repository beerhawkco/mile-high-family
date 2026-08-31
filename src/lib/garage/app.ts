import { sparkPath, medianSeries } from './charts.ts';
import { OWNED_LABEL, prettyDate } from './labels.ts';
import { vehiclePath } from './market.ts';
import { dollars, signedDollars } from './money.ts';
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

function setHero(kicker: string, title: string, lede: string) {
  const kickerNode = document.getElementById('g-kicker');
  const titleNode = document.getElementById('g-title');
  const ledeNode = document.getElementById('g-lede');
  if (kickerNode) kickerNode.textContent = kicker;
  if (titleNode) titleNode.textContent = title;
  if (ledeNode) ledeNode.textContent = lede;
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
  const d = sparkPath(usable, 220, 42, 3);
  return `<svg class="g-spark" viewBox="0 0 220 42" preserveAspectRatio="none" aria-hidden="true"><path d="${d}" fill="none" stroke="#e87820" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
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

function kpi(label: string, value: string, hint: string, extra = '', tilt: 'tilt-l' | 'tilt-r' = 'tilt-l') {
  return `
    <article class="g-card g-kpi ${tilt}">
      <p class="label"><span>${label}</span>${extra}</p>
      <p class="value">${value}</p>
      <p class="hint">${hint}</p>
    </article>
  `;
}

function card(vehicle: Vehicle, store: GarageStore, tilt: 'tilt-l' | 'tilt-r') {
  const latest = latestSnapshot(store, vehicle.id);
  const prior = priorSnapshot(store, vehicle.id);
  const ourAsk = vehicle.owned.askingPrice;
  const sold = latest?.soldMedian ?? null;
  const ask = latest?.askingMedian ?? null;
  const vsSold = vsMarket(ourAsk, sold);
  const vsAsk = vsMarket(ourAsk, ask);
  const daysOurs = ourDaysListed(vehicle.owned.listedOn, todayStamp());
  const href = vehiclePath(vehicle.kind, vehicle.id);
  const asks = medianSeries(snapshotsFor(store, vehicle.id));
  const kind = vehicle.kind === 'rv' ? 'RV' : 'Car';
  const intent = vehicle.intent === 'buy' ? 'Watching' : 'For sale';
  return `
    <a href="${href}" class="g-card g-unit ${tilt}">
      <p><span class="g-badge ${vehicle.kind === 'rv' ? 'sky' : ''}">${kind}</span> <span class="g-badge grape">${intent}</span></p>
      <h2 class="mt-2 font-display text-2xl font-extrabold">${vehicle.name}</h2>
      <p class="g-note mt-1">${vehicle.summary}</p>
      <div class="g-kpis" style="margin: 0.9rem 0 0">
        ${kpi('Our ask', dollars(ourAsk), `${OWNED_LABEL[vehicle.owned.status]}${daysOurs != null ? ` · ${daysOurs}d listed` : ''}`)}
        ${kpi('Sold median', dollars(sold), `${latest?.soldCount ?? 0} sold · ${daysText(latest?.medianDaysToSale)} to sale`, deltaChip(sold, prior?.soldMedian), 'tilt-r')}
        ${kpi('Live ask', dollars(ask), `${latest?.listingCount ?? 0} listings · ${daysText(latest?.daysOnMarket)} DOM`, deltaChip(ask, prior?.askingMedian))}
        ${kpi('Ask vs sold', signedDollars(vsSold), `vs live ask ${signedDollars(vsAsk)}`, '', 'tilt-r')}
      </div>
      ${sparkSvg(asks)}
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
  const avg = (values: number[]) => (values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null);
  return `
    <div class="g-kpis">
      ${kpi('Book ask', dollars(avg(ourAsks)), `${units.length} units in the notebook`, '', 'tilt-l')}
      ${kpi('Sold median', dollars(avg(solds)), 'Recent sold prints, both desks', deltaChip(avg(solds), avg(priorSolds)), 'tilt-r')}
      ${kpi('Live asking', dollars(avg(liveAsks)), `${listings} listings in the ring`, deltaChip(avg(liveAsks), avg(priorAsks)), 'tilt-l')}
      ${kpi('Days to sale', daysText(avg(days)), `${store.market.radiusMiles} mi of ${store.market.center}`, '', 'tilt-r')}
    </div>
    ${sparkSvg(marketAskSeries(store))}
  `;
}

function renderHome(store: GarageStore) {
  const cars = store.vehicles.filter((item) => item.kind === 'car');
  const rvs = store.vehicles.filter((item) => item.kind === 'rv');
  setHero('250 miles of Denver', 'Both units, one glance', 'Sold prints, live asks, and days listed before sale. Open a card to work one market.');
  return `
    ${portfolio(store)}
    <div class="g-section">
      <h2>Units</h2>
      <p>Cars and RVs stay on their own desks</p>
    </div>
    <div class="g-grid two">
      ${[...cars, ...rvs].map((vehicle, index) => card(vehicle, store, index % 2 ? 'tilt-r' : 'tilt-l')).join('')}
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
  setHero(label, `${label} in the Denver ring`, empty);
  const ids = list.map((vehicle) => vehicle.id);
  return `
    <div class="g-kpis">
      ${kpi('Units', String(list.length), label, '', 'tilt-l')}
      ${kpi('Live listings', String(list.reduce((sum, vehicle) => sum + (latestSnapshot(store, vehicle.id)?.listingCount ?? 0), 0)), 'Current asking set', '', 'tilt-r')}
      ${kpi('Sold median', dollars(latestSnapshot(store, list[0]?.id ?? 'tesla-model-y-lr')?.soldMedian), 'Latest pulse on the first unit', '', 'tilt-l')}
      ${kpi('Days to sale', daysText(latestSnapshot(store, list[0]?.id ?? 'tesla-model-y-lr')?.medianDaysToSale), 'Median days listed before sale', '', 'tilt-r')}
    </div>
    ${sparkSvg(marketAskSeries(store, ids))}
    <div class="g-grid" style="margin-top: 1rem">
      ${list.map((vehicle, index) => card(vehicle, store, index % 2 ? 'tilt-r' : 'tilt-l')).join('') || `<p class="g-note">Nothing in ${label} yet.</p>`}
    </div>
  `;
}

function renderVehicle(store: GarageStore, slug: string) {
  const vehicle = store.vehicles.find((item) => item.id === slug);
  if (!vehicle) {
    setHero('Garage', 'Unknown vehicle', 'That slug is not in the notebook.');
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
  const kind = vehicle.kind === 'rv' ? 'RV' : 'Car';
  setHero(
    `${kind} · ${prettyDate(latest?.date ?? todayStamp())}`,
    vehicle.name,
    `${vehicle.summary} ${latest?.brief ?? ''}`.trim(),
  );
  return `
    <div class="g-kpis">
      ${kpi('Our ask', dollars(ourAsk), `${OWNED_LABEL[vehicle.owned.status]} · target ${dollars(vehicle.owned.targetPrice)}`, '', 'tilt-l')}
      ${kpi('Sold median', dollars(latest?.soldMedian), `${latest?.soldCount ?? 0} sales · ${daysText(latest?.medianDaysToSale)} to sale`, deltaChip(latest?.soldMedian, prior?.soldMedian), 'tilt-r')}
      ${kpi('Live ask', dollars(latest?.askingMedian), `${latest?.askingLow ? `${dollars(latest.askingLow)}–${dollars(latest.askingHigh)}` : '—'} · ${latest?.listingCount ?? 0} live`, deltaChip(latest?.askingMedian, prior?.askingMedian), 'tilt-l')}
      ${kpi('Ask vs sold', signedDollars(vsMarket(ourAsk, latest?.soldMedian ?? null)), `vs ask ${signedDollars(vsMarket(ourAsk, latest?.askingMedian ?? null))}`, '', 'tilt-r')}
    </div>
    ${sparkSvg(medianSeries(history))}
    <div class="g-section">
      <h2>Sold · days listed</h2>
      <p>${sold.length} prints</p>
    </div>
    <div class="g-card tilt-l">
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
                <td class="num">${comp.daysListed ?? '—'}d</td>
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
    <div class="g-card tilt-r">
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
              (note, index) =>
                `<article class="g-card ${index % 2 ? 'tilt-r' : 'tilt-l'}"><p class="g-badge">${note.source} · ${prettyDate(note.date)}</p><p class="g-note" style="margin-top:.5rem">${note.summary}</p></article>`,
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
  setHero('Private garage', 'Market pulse', 'Sold prints, current asks, and days listed before sale — 250 miles of Denver.');
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
  const logoutBtn = document.getElementById('logout-btn');
  logoutBtn?.addEventListener('click', () => void logout());
}
