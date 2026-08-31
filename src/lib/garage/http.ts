import {
  clearCookieHeader,
  cookieHeader,
  credentialsOk,
  readCookie,
  readSession,
  signSession,
} from './auth.ts';
import { newId } from './ids.ts';
import { decodePhoto, encodePhoto, isPhotoId, PHOTO_MAX_BYTES, photoPath, sniffType } from './photos.ts';
import { applyDailyPulse } from './pulse.ts';
import { parseStore, todayStamp } from './store.ts';
import type { GarageStore } from './types.ts';

export type GarageRuntime = {
  adminUser: string;
  adminPassword: string;
  sessionSecret: string;
  load: () => Promise<GarageStore>;
  save: (store: GarageStore) => Promise<void>;
  putPhoto?: (id: string, encoded: string) => Promise<void>;
  getPhoto?: (id: string) => Promise<string | null>;
  canSave?: boolean;
  canPhotos?: boolean;
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

  if (path === '/api/garage/session' && request.method === 'GET') {
    const session = await requireUser(request, runtime);
    return json(
      session
        ? {
            ok: true,
            user: session.user,
            canSave: runtime.canSave !== false,
            canPhotos: runtime.canPhotos !== false,
          }
        : { ok: false, canSave: runtime.canSave !== false, canPhotos: runtime.canPhotos !== false },
    );
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
    return json(
      {
        ok: true,
        user: runtime.adminUser,
        canSave: runtime.canSave !== false,
        canPhotos: runtime.canPhotos !== false,
      },
      200,
      { 'set-cookie': cookieHeader(token, secure) },
    );
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
    const { store, notes } = await applyDailyPulse(await runtime.load(), date);
    await runtime.save(store);
    return json({ store, notes });
  }

  if (path === '/api/garage/photo' && request.method === 'POST') {
    if (!(await requireUser(request, runtime))) return error('Sign in first.', 401);
    if (!runtime.putPhoto) {
      return error(
        "Can't keep photos until this Worker has a KV store named GARAGE. In Cloudflare, open this Worker → Settings → Bindings → KV. Add a binding named GARAGE, then redeploy.",
        503,
      );
    }
    let file: File | null = null;
    try {
      const form = await request.formData();
      const raw = form.get('file');
      file = raw instanceof File ? raw : null;
    } catch {
      return error('Send the photo as a file upload.', 400);
    }
    if (!file || file.size === 0) return error('Choose a photo of the listing.', 400);
    if (file.size > PHOTO_MAX_BYTES) return error('That photo is over 4 MB.', 400);
    const type = sniffType(file);
    if (!type) return error('Use a JPEG, PNG, or WebP photo of the listing.', 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const id = newId('pho');
    await runtime.putPhoto(id, encodePhoto(bytes, type));
    return json({ ok: true, id, url: photoPath(id) });
  }

  if (path.startsWith('/api/garage/photo/') && request.method === 'GET') {
    if (!(await requireUser(request, runtime))) return error('Sign in first.', 401);
    const id = path.slice('/api/garage/photo/'.length);
    if (!isPhotoId(id) || !runtime.getPhoto) return error('Photo not found.', 404);
    let decoded = null;
    try {
      decoded = decodePhoto(JSON.parse((await runtime.getPhoto(id)) || 'null'));
    } catch {
      decoded = null;
    }
    if (!decoded) return error('Photo not found.', 404);
    return new Response(decoded.bytes, {
      headers: {
        'content-type': decoded.type,
        'cache-control': 'private, max-age=86400',
      },
    });
  }

  return error('Not found.', 404);
}
