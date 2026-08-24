import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clearVault, readVault, sealToken, unsealToken, writeVault } from './vault.ts';

describe('cairn vault', () => {
  it('unlocks with the same password and fails with another', async () => {
    const vault = await sealToken('front-range-desk', 'github_pat_example_token');
    assert.equal(await unsealToken('front-range-desk', vault), 'github_pat_example_token');
    await assert.rejects(() => unsealToken('wrong-password', vault), /does not unlock/);
  });

  it('refuses a short password', async () => {
    await assert.rejects(() => sealToken('short', 'token'), /10 characters/);
  });

  it('stores and clears a vault blob', async () => {
    const memory = new Map<string, string>();
    const storage = {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => void memory.set(key, value),
      removeItem: (key: string) => void memory.delete(key),
    };
    writeVault(storage, await sealToken('front-range-desk', 'tok'));
    assert.ok(readVault(storage));
    clearVault(storage);
    assert.equal(readVault(storage), null);
  });
});
