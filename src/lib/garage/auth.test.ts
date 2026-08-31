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
});
