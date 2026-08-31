import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { applyDailyPulse } from '../src/lib/garage/pulse.ts';
import { parseStore, STORE_PATH, todayStamp } from '../src/lib/garage/store.ts';

const file = resolve(process.cwd(), STORE_PATH);
const current = parseStore(JSON.parse(await readFile(file, 'utf8')));
const date = process.env.GARAGE_PULSE_DATE || todayStamp();
const { store, changed, notes } = await applyDailyPulse(current, date);
if (!changed) {
  console.log(`No garage pulse needed for ${date}.`);
  process.exit(0);
}
await writeFile(file, `${JSON.stringify(store, null, 2)}\n`);
console.log(`Wrote daily pulse for ${date}.`);
for (const note of notes) console.log(`- ${note}`);
