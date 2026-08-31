import {
  clearCookieHeader,
  cookieHeader,
  credentialsOk,
  readCookie,
  readSession,
  signSession,
} from './auth.ts';
import { carryForwardPulse, parseStore, publicStore, todayStamp } from './store.ts';
import { VEHICLE_IDS, type GarageStore, type VehicleId } from './types.ts';

export type GarageRuntime = {
  adminUser: string;
  adminPassword: string;
  sessionSecret: string;
  load: () => Promise<GarageStore>;
  save: (store: GarageStore) => Promise<void>;
};

function json(data: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });
}

function error(message: string, status = 400) {
  return json({ error: message }, status);
}

async function bodyOf(request: Request) {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function requireUser(request: Request, runtime: GarageRuntime) {
  const token = readCookie(request.headers.get('cookie'));
  return readSession(runtime.sessionSecret, token);
}

export async function handleGarageRequest(request: Request, runtime: GarageRuntime): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '') || '/';
  const secure = url.protocol === 'https:';

  if (path === '/api/garage/public' && request.method === 'GET') {
    return json(publicStore(await runtime.load()));
  }

  if (path === '/api/garage/session' && request.method === 'GET') {
    const session = await requireUser(request, runtime);
    return json(session ? { ok: true, user: session.user } : { ok: false });
  }

  if (path === '/api/garage/login' && request.method === 'POST') {
    const body = await bodyOf(request);
    if (typeof body.website === 'string' && body.website.trim()) return error('Rejected.', 400);
    const username = typeof body.username === 'string' ? body.username : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!runtime.adminUser || !runtime.adminPassword) {
      return error('Admin login is not configured on this host.', 503);
    }
    if (!credentialsOk(runtime, username, password)) {
      return error('Username or password is wrong.', 401);
    }
    const token = await signSession(runtime.sessionSecret, runtime.adminUser);
    return json({ ok: true, user: runtime.adminUser }, 200, { 'set-cookie': cookieHeader(token, secure) });
  }

  if (path === '/api/garage/logout' && request.method === 'POST') {
    return json({ ok: true }, 200, { 'set-cookie': clearCookieHeader(secure) });
  }

  if (path === '/api/garage/store' && request.method === 'GET') {
    if (!(await requireUser(request, runtime))) return error('Sign in first.', 401);
    return json(await runtime.load());
  }

  if (path === '/api/garage/store' && request.method === 'PUT') {
    if (!(await requireUser(request, runtime))) return error('Sign in first.', 401);
    try {
      const store = parseStore(await bodyOf(request));
      store.updatedAt = new Date().toISOString();
      await runtime.save(store);
      return json(store);
    } catch (err) {
      return error(err instanceof Error ? err.message : 'Store was rejected.', 400);
    }
  }

  if (path === '/api/garage/pulse' && request.method === 'POST') {
    if (!(await requireUser(request, runtime))) return error('Sign in first.', 401);
    const body = await bodyOf(request);
    const date = typeof body.date === 'string' && body.date ? body.date : todayStamp();
    let store = await runtime.load();
    for (const id of VEHICLE_IDS) {
      store = carryForwardPulse(store, id as VehicleId, date, {
        source: 'auto',
        needsReview: true,
        headline: `Carried forward to ${date} — edit the numbers`,
      });
    }
    await runtime.save(store);
    return json(store);
  }

  return error('Not found.', 404);
}
