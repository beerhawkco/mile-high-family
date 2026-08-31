import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { credentialsOk, readCookie, readSession, safeEqual, signSession } from './auth.ts';
import { handleGarageRequest } from './http.ts';
import { createSeedStore } from './seed.ts';
import { parseStore } from './store.ts';

describe('garage auth', () => {
  it('compares secrets without early exit on length', () => {
    assert.equal(safeEqual('front-range-garage', 'front-range-garage'), true);
    assert.equal(safeEqual('front-range-garage', 'front-range-garagx'), false);
    assert.equal(safeEqual('short', 'longer-secret'), false);
  });

  it('signs and reads a session cookie value', async () => {
    const token = await signSession('session-secret-16', 'ada', 1_000_000);
    const session = await readSession('session-secret-16', token, 1_000_001);
    assert.deepEqual(session, { user: 'ada', exp: 1_000_000 + 60 * 60 * 24 * 14 * 1000 });
    assert.equal(await readSession('wrong-secret-16!!', token, 1_000_001), null);
  });

  it('reads the garage cookie from a header', () => {
    assert.equal(readCookie('theme=dark; mhf-garage=abc.def; other=1'), 'abc.def');
    assert.equal(readCookie('theme=dark'), null);
  });

  it('accepts only the configured username and password', () => {
    const env = { adminUser: 'ada', adminPassword: 'correct-horse' };
    assert.equal(credentialsOk(env, 'ada', 'correct-horse'), true);
    assert.equal(credentialsOk(env, 'ada', 'wrong'), false);
    assert.equal(credentialsOk(env, 'eve', 'correct-horse'), false);
  });
});

describe('garage http', () => {
  it('rejects login without a token field and sets a cookie on success', async () => {
    const seed = createSeedStore();
    let saved = seed;
    const runtime = {
      adminUser: 'ada',
      adminPassword: 'correct-horse',
      sessionSecret: 'session-secret-16',
      load: async () => saved,
      save: async (store: typeof seed) => {
        saved = store;
      },
    };

    const denied = await handleGarageRequest(
      new Request('http://localhost/api/garage/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'ada', password: 'nope' }),
      }),
      runtime,
    );
    assert.equal(denied.status, 401);

    const ok = await handleGarageRequest(
      new Request('http://localhost/api/garage/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'ada', password: 'correct-horse' }),
      }),
      runtime,
    );
    assert.equal(ok.status, 200);
    const cookie = ok.headers.get('set-cookie') ?? '';
    assert.match(cookie, /mhf-garage=/);
    assert.match(cookie, /HttpOnly/);
    assert.doesNotMatch(cookie, /github|token/i);

    const store = await handleGarageRequest(
      new Request('http://localhost/api/garage/store', { headers: { cookie } }),
      runtime,
    );
    assert.equal(store.status, 200);
    assert.equal(parseStore(await store.json()).vehicles.length, 2);
  });

  it('tells the desk when saves cannot persist', async () => {
    const seed = createSeedStore();
    const runtime = {
      adminUser: 'ada',
      adminPassword: 'correct-horse',
      sessionSecret: 'session-secret-16',
      load: async () => seed,
      save: async () => undefined,
      canSave: false,
      canPhotos: false,
    };
    const login = await handleGarageRequest(
      new Request('http://localhost/api/garage/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'ada', password: 'correct-horse' }),
      }),
      runtime,
    );
    const cookie = login.headers.get('set-cookie') ?? '';
    const session = await handleGarageRequest(
      new Request('http://localhost/api/garage/session', { headers: { cookie } }),
      runtime,
    );
    const body = (await session.json()) as { canSave?: boolean; canPhotos?: boolean };
    assert.equal(body.canSave, false);
    assert.equal(body.canPhotos, false);
    assert.doesNotMatch(JSON.stringify(body), /github_pat_|GARAGE_GITHUB_TOKEN/i);
  });

  it('does not expose a GitHub token prompt on the public API', async () => {
    const seed = createSeedStore();
    const runtime = {
      adminUser: 'ada',
      adminPassword: 'correct-horse',
      sessionSecret: 'session-secret-16',
      load: async () => seed,
      save: async () => undefined,
    };
    const res = await handleGarageRequest(new Request('http://localhost/api/garage/public'), runtime);
    assert.equal(res.status, 404);
    const text = await res.text();
    assert.doesNotMatch(text, /github_pat_|ghp_/);
  });

  it('stores an ad photo only after sign-in', async () => {
    const files = new Map<string, string>();
    const seed = createSeedStore();
    const runtime = {
      adminUser: 'ada',
      adminPassword: 'correct-horse',
      sessionSecret: 'session-secret-16',
      load: async () => seed,
      save: async () => undefined,
      putPhoto: async (id: string, encoded: string) => {
        files.set(id, encoded);
      },
      getPhoto: async (id: string) => files.get(id) ?? null,
    };
    const locked = await handleGarageRequest(
      new Request('http://localhost/api/garage/photo', {
        method: 'POST',
        body: (() => {
          const form = new FormData();
          form.set('file', new File([new Uint8Array([255, 216, 255])], 'ad.jpg', { type: 'image/jpeg' }));
          return form;
        })(),
      }),
      runtime,
    );
    assert.equal(locked.status, 401);

    const login = await handleGarageRequest(
      new Request('http://localhost/api/garage/login', {
        method: 'POST',
        body: JSON.stringify({ username: 'ada', password: 'correct-horse' }),
      }),
      runtime,
    );
    const cookie = login.headers.get('set-cookie') ?? '';
    const form = new FormData();
    form.set('file', new File([new Uint8Array([255, 216, 255, 1, 2, 3])], 'ad.jpg', { type: 'image/jpeg' }));
    const uploaded = await handleGarageRequest(
      new Request('http://localhost/api/garage/photo', { method: 'POST', headers: { cookie }, body: form }),
      runtime,
    );
    assert.equal(uploaded.status, 200);
    const body = (await uploaded.json()) as { url?: string };
    assert.match(body.url ?? '', /\/api\/garage\/photo\/pho_[a-f0-9]{12}$/);

    const photo = await handleGarageRequest(new Request(`http://localhost${body.url}`, { headers: { cookie } }), runtime);
    assert.equal(photo.status, 200);
    assert.equal(photo.headers.get('content-type'), 'image/jpeg');
    assert.equal((await photo.arrayBuffer()).byteLength, 6);
  });
});
