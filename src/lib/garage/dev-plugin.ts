import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { handleGarageRequest } from './http.ts';
import { parseStore, STORE_PATH } from './store.ts';
import { createSeedStore } from './seed.ts';
import type { GarageStore } from './types.ts';

function localEnv() {
  return {
    adminUser: process.env.GARAGE_ADMIN_USER || 'admin',
    adminPassword: process.env.GARAGE_ADMIN_PASSWORD || 'front-range-garage',
    sessionSecret: process.env.GARAGE_SESSION_SECRET || 'local-dev-session-secret!!',
  };
}

async function filePhotos(root: string) {
  const dir = resolve(root, 'src/content/garage/photos');

  async function putPhoto(id: string, encoded: string) {
    await mkdir(dir, { recursive: true });
    await writeFile(resolve(dir, `${id}.json`), encoded);
  }

  async function getPhoto(id: string) {
    try {
      return await readFile(resolve(dir, `${id}.json`), 'utf8');
    } catch {
      return null;
    }
  }

  return { putPhoto, getPhoto };
}

async function fileStore(root: string) {
  const file = resolve(root, STORE_PATH);

  async function load(): Promise<GarageStore> {
    try {
      return parseStore(JSON.parse(await readFile(file, 'utf8')));
    } catch {
      const seeded = createSeedStore();
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, `${JSON.stringify(seeded, null, 2)}\n`);
      return seeded;
    }
  }

  async function save(store: GarageStore) {
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, `${JSON.stringify(store, null, 2)}\n`);
  }

  return { load, save };
}

function nodeRequestToFetch(req: IncomingMessage, host: string): Promise<Request> {
  const url = `http://${host}${req.url ?? '/'}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (!value) continue;
    if (Array.isArray(value)) headers.set(key, value.join(', '));
    else headers.set(key, value);
  }
  const method = req.method ?? 'GET';
  if (method === 'GET' || method === 'HEAD') return Promise.resolve(new Request(url, { method, headers }));
  return new Promise((resolveRequest, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('error', reject);
    req.on('end', () => {
      resolveRequest(new Request(url, { method, headers, body: Buffer.concat(chunks) }));
    });
  });
}

async function writeFetch(res: ServerResponse, response: Response) {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
}

export function garageDevApi(root = process.cwd()): Plugin {
  return {
    name: 'garage-dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0] ?? '';
        if (!path.startsWith('/api/garage')) return next();
        try {
          const store = await fileStore(root);
          const photos = await filePhotos(root);
          const request = await nodeRequestToFetch(req, req.headers.host || 'localhost');
          const response = await handleGarageRequest(request, { ...localEnv(), ...store, ...photos });
          await writeFetch(res, response);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Garage API failed.' }));
        }
      });
    },
  };
}
