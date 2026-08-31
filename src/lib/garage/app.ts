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

function card(vehicle: Vehicle, store: GarageStore) {
  const latest = latestSnapshot(store, vehicle.id);
  const ourAsk = vehicle.owned.askingPrice;
  const sold = latest?.soldMedian ?? null;
  const ask = latest?.askingMedian ?? null;
  const vsSold = vsMarket(ourAsk, sold);
  const vsAsk = vsMarket(ourAsk, ask);
  const daysOurs = ourDaysListed(vehicle.owned.listedOn, todayStamp());
  const href = vehiclePath(vehicle.kind, vehicle.id);
  return `
    <a href="${href}" class="squash block bg-surface p-6 no-underline shadow-sm text-ink">
      <p class="text-sm font-extrabold uppercase tracking-wide text-sun">${vehicle.kind === 'rv' ? 'RV' : 'Car'} · ${vehicle.intent === 'buy' ? 'Watching to buy' : 'For sale'}</p>
      <h2 class="mt-1 font-display text-3xl font-extrabold">${vehicle.name}</h2>
      <p class="mt-2 text-sm text-muted">${vehicle.summary}</p>
      <div class="mt-5 grid gap-3 sm:grid-cols-2">
        <div>
          <p class="text-xs font-extrabold uppercase tracking-wide text-muted">Our ask</p>
          <p class="font-display text-3xl font-extrabold">${dollars(ourAsk)}</p>
          <p class="text-sm font-bold text-muted">${OWNED_LABEL[vehicle.owned.status]}${daysOurs != null ? ` · listed ${daysOurs}d` : ''}</p>
        </div>
        <div>
          <p class="text-xs font-extrabold uppercase tracking-wide text-muted">Recent sold</p>
          <p class="font-display text-3xl font-extrabold">${dollars(sold)}</p>
          <p class="text-sm font-bold text-muted">${latest?.soldCount ?? 0} sold · ${latest?.medianDaysToSale ?? '—'} days to sale</p>
        </div>
        <div>
          <p class="text-xs font-extrabold uppercase tracking-wide text-muted">Current asking</p>
          <p class="font-display text-2xl font-extrabold">${dollars(ask)}</p>
          <p class="text-sm font-bold text-muted">${latest?.listingCount ?? 0} listings now · ${latest?.daysOnMarket ?? '—'}d on market</p>
        </div>
        <div>
          <p class="text-xs font-extrabold uppercase tracking-wide text-muted">Our ask vs sold</p>
          <p class="font-display text-2xl font-extrabold">${signedDollars(vsSold)}</p>
          <p class="text-sm font-bold text-muted">vs current ask ${signedDollars(vsAsk)}</p>
        </div>
      </div>
    </a>
  `;
}

function renderHome(store: GarageStore) {
  const cars = store.vehicles.filter((item) => item.kind === 'car');
  const rvs = store.vehicles.filter((item) => item.kind === 'rv');
  return `
    <p class="eyebrow">250 miles of Denver</p>
    <h1 class="mt-2 font-display text-4xl font-extrabold">Both units, one glance</h1>
    <p class="mt-3 max-w-2xl text-muted">Sold prints, current asks, and days listed before sale. Cars and RVs stay in their own sections when you want to work one market.</p>
    <div class="mt-8 grid gap-6 md:grid-cols-2">
      ${[...cars, ...rvs].map((vehicle) => card(vehicle, store)).join('')}
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
  return `
    <p class="eyebrow">${label}</p>
    <h1 class="mt-2 font-display text-4xl font-extrabold">${label} in the Denver ring</h1>
    <p class="mt-3 max-w-2xl text-muted">${empty}</p>
    <div class="mt-8 grid gap-6">
      ${list.map((vehicle) => card(vehicle, store)).join('') || `<p class="text-muted">Nothing in ${label} yet.</p>`}
    </div>
  `;
}

function renderVehicle(store: GarageStore, slug: string) {
  const vehicle = store.vehicles.find((item) => item.id === slug);
  if (!vehicle) return `<p>Unknown vehicle.</p>`;
  const latest = latestSnapshot(store, vehicle.id);
  const history = snapshotsFor(store, vehicle.id);
  const comps = compsFor(store, vehicle.id);
  const notes = sentimentsFor(store, vehicle.id);
  const sold = comps.filter((item) => item.status === 'sold');
  const asking = comps.filter((item) => item.status === 'active');
  const ourAsk = vehicle.owned.askingPrice;
  return `
    <p class="eyebrow">${vehicle.kind === 'rv' ? 'RV' : 'Car'} · ${prettyDate(latest?.date ?? todayStamp())}</p>
    <h1 class="mt-2 font-display text-4xl font-extrabold">${vehicle.name}</h1>
    <p class="mt-3 max-w-2xl text-muted">${vehicle.summary}</p>
    <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="squash bg-surface p-5">
        <p class="text-xs font-extrabold uppercase tracking-wide text-muted">Our ask</p>
        <p class="font-display text-3xl font-extrabold">${dollars(ourAsk)}</p>
        <p class="text-sm font-bold text-muted">${OWNED_LABEL[vehicle.owned.status]} · target ${dollars(vehicle.owned.targetPrice)}</p>
      </div>
      <div class="squash-alt bg-surface p-5">
        <p class="text-xs font-extrabold uppercase tracking-wide text-muted">Recent sold</p>
        <p class="font-display text-3xl font-extrabold">${dollars(latest?.soldMedian)}</p>
        <p class="text-sm font-bold text-muted">${latest?.soldCount ?? 0} sales · ${latest?.medianDaysToSale ?? '—'} days to sale</p>
      </div>
      <div class="squash bg-surface p-5">
        <p class="text-xs font-extrabold uppercase tracking-wide text-muted">Current asking</p>
        <p class="font-display text-3xl font-extrabold">${dollars(latest?.askingMedian)}</p>
        <p class="text-sm font-bold text-muted">${latest?.askingLow ? `${dollars(latest.askingLow)}–${dollars(latest.askingHigh)}` : '—'} · ${latest?.listingCount ?? 0} live</p>
      </div>
      <div class="squash-alt bg-surface p-5">
        <p class="text-xs font-extrabold uppercase tracking-wide text-muted">Our ask vs sold</p>
        <p class="font-display text-3xl font-extrabold">${signedDollars(vsMarket(ourAsk, latest?.soldMedian ?? null))}</p>
        <p class="text-sm font-bold text-muted">vs ask ${signedDollars(vsMarket(ourAsk, latest?.askingMedian ?? null))}</p>
      </div>
    </div>
    <p class="mt-6 text-muted">${latest?.brief ?? ''}</p>
    <h2 class="mt-10 font-display text-2xl font-extrabold">Sold · days listed before sale</h2>
    <div class="mt-4 overflow-x-auto">
      <table class="w-full min-w-[40rem] text-left text-sm">
        <thead><tr class="text-xs font-extrabold uppercase tracking-wide text-muted">
          <th class="pb-2 pr-4">Listing</th><th class="pb-2 pr-4">Sold</th><th class="pb-2 pr-4">Days listed</th><th class="pb-2">Where</th>
        </tr></thead>
        <tbody>
          ${sold
            .map(
              (comp) => `
            <tr class="border-t border-line align-top">
              <td class="py-3 pr-4 font-extrabold">${comp.title}<p class="font-bold text-muted">${comp.notes}</p></td>
              <td class="py-3 pr-4 font-extrabold">${dollars(comp.soldPrice ?? comp.price)}</td>
              <td class="py-3 pr-4">${comp.daysListed ?? '—'}d</td>
              <td class="py-3 text-muted">${comp.location}</td>
            </tr>`,
            )
            .join('') || `<tr><td class="py-3 text-muted" colspan="4">No sold prints yet. Fetch the market or add one on the desk.</td></tr>`}
        </tbody>
      </table>
    </div>
    <h2 class="mt-10 font-display text-2xl font-extrabold">Current asking</h2>
    <div class="mt-4 overflow-x-auto">
      <table class="w-full min-w-[40rem] text-left text-sm">
        <thead><tr class="text-xs font-extrabold uppercase tracking-wide text-muted">
          <th class="pb-2 pr-4">Listing</th><th class="pb-2 pr-4">Ask</th><th class="pb-2 pr-4">Miles</th><th class="pb-2">Where</th>
        </tr></thead>
        <tbody>
          ${asking
            .map(
              (comp) => `
            <tr class="border-t border-line align-top">
              <td class="py-3 pr-4 font-extrabold">${comp.title}</td>
              <td class="py-3 pr-4 font-extrabold">${dollars(comp.price)}</td>
              <td class="py-3 pr-4">${comp.miles ?? '—'}</td>
              <td class="py-3 text-muted">${comp.location} · ${prettyDate(comp.listedOn)}</td>
            </tr>`,
            )
            .join('')}
        </tbody>
      </table>
    </div>
    <p class="mt-8 text-sm text-muted">${history.length} daily pulses on file. Market: ${store.market.radiusMiles} miles of ${store.market.center}.</p>
    ${notes.length ? `<h2 class="mt-10 font-display text-2xl font-extrabold">Notes</h2><div class="mt-4 grid gap-3">${notes.map((note) => `<article class="squash bg-surface p-4"><p class="text-xs font-extrabold uppercase text-sun">${note.source} · ${prettyDate(note.date)}</p><p class="mt-2 text-sm text-muted">${note.summary}</p></article>`).join('')}</div>` : ''}
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
  setStatus('Signed out.');
}

export function bootGarage() {
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
}
