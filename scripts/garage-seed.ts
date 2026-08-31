import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createSeedStore } from '../src/lib/garage/seed.ts';
import { STORE_PATH } from '../src/lib/garage/store.ts';

const file = resolve(process.cwd(), STORE_PATH);
const store = createSeedStore();
await mkdir(dirname(file), { recursive: true });
await writeFile(file, `${JSON.stringify(store, null, 2)}\n`);
console.log(`Wrote ${store.vehicles.length} vehicles and no sample market rows to ${STORE_PATH}`);
