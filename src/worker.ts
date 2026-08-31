import bundled from './content/garage/store.json';
import { handleGarageRequest } from './lib/garage/http.ts';
import { applyDailyPulse } from './lib/garage/pulse.ts';
import { parseStore } from './lib/garage/store.ts';
import type { GarageStore } from './lib/garage/types.ts';

type KvStore = {
  get(key: string, type: 'json'): Promise<unknown>;
  put(key: string, value: string): Promise<void>;
};

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  GARAGE?: KvStore;
  GARAGE_ADMIN_USER?: string;
  GARAGE_ADMIN_PASSWORD?: string;
  GARAGE_SESSION_SECRET?: string;
  GARAGE_GITHUB_TOKEN?: string;
  GARAGE_GITHUB_REPO?: string;
  GARAGE_GITHUB_BRANCH?: string;
}

const KV_KEY = 'store';
const PHOTO_KEY = (id: string) => `photo:${id}`;
const REPO_PATH = 'src/content/garage/store.json';

async function fromKv(env: Env): Promise<GarageStore | null> {
  if (!env.GARAGE) return null;
  const raw = await env.GARAGE.get(KV_KEY, 'json');
  if (!raw) return null;
  try {
    return parseStore(raw);
  } catch {
    return null;
  }
}

async function loadStore(env: Env): Promise<GarageStore> {
  return (await fromKv(env)) ?? parseStore(bundled);
}

async function saveStore(env: Env, store: GarageStore) {
  if (env.GARAGE) {
    await env.GARAGE.put(KV_KEY, JSON.stringify(store));
    return;
  }
  if (env.GARAGE_GITHUB_TOKEN) {
    await commitStore(env, store);
    return;
  }
  throw new Error(
    'Admin saves need a GARAGE KV namespace or a GARAGE_GITHUB_TOKEN secret. The token stays on the server — it is never pasted in the browser.',
  );
}

async function commitStore(env: Env, store: GarageStore) {
  const repo = env.GARAGE_GITHUB_REPO || 'beerhawkco/mile-high-family';
  const branch = env.GARAGE_GITHUB_BRANCH || 'main';
  const token = env.GARAGE_GITHUB_TOKEN as string;
  const api = `https://api.github.com/repos/${repo}/contents/${REPO_PATH}`;
  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/vnd.github+json',
    'user-agent': 'mile-high-family-garage',
  };
  const current = await fetch(`${api}?ref=${branch}`, { headers });
  let sha: string | undefined;
  if (current.ok) {
    const body = (await current.json()) as { sha?: string };
    sha = body.sha;
  }
  const encoded = btoa(unescape(encodeURIComponent(`${JSON.stringify(store, null, 2)}\n`)));
  const res = await fetch(api, {
    method: 'PUT',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({
      message: `Garage: update market desk ${store.updatedAt.slice(0, 10)}`,
      content: encoded,
      branch,
      sha,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub did not save the garage store (${res.status}). ${text.slice(0, 180)}`);
  }
}

function runtime(env: Env) {
  return {
    adminUser: env.GARAGE_ADMIN_USER || '',
    adminPassword: env.GARAGE_ADMIN_PASSWORD || '',
    sessionSecret: env.GARAGE_SESSION_SECRET || '',
    load: () => loadStore(env),
    save: (store: GarageStore) => saveStore(env, store),
    putPhoto: async (id: string, encoded: string) => {
      if (!env.GARAGE) throw new Error('Bind a GARAGE KV namespace to keep ad photos.');
      await env.GARAGE.put(PHOTO_KEY(id), encoded);
    },
    getPhoto: async (id: string) => {
      if (!env.GARAGE) return null;
      const raw = await env.GARAGE.get(PHOTO_KEY(id), 'json');
      return raw == null ? null : JSON.stringify(raw);
    },
  };
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/garage')) {
      try {
        return await handleGarageRequest(request, runtime(env));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Garage API failed.';
        return new Response(JSON.stringify({ error: message }), {
          status: 500,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        });
      }
    }
    return env.ASSETS.fetch(request);
  },

  async scheduled(_event: unknown, env: Env, ctx: { waitUntil: (promise: Promise<unknown>) => void }) {
    ctx.waitUntil(
      (async () => {
        const { store, changed } = await applyDailyPulse(await loadStore(env));
        if (changed) await saveStore(env, store);
      })(),
    );
  },
};
