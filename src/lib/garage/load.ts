import storeJson from '../../content/garage/store.json';
import { parseStore } from './store.ts';
import type { GarageStore } from './types.ts';

export function loadBuiltStore(): GarageStore {
  return parseStore(storeJson);
}
