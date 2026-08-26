import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CARD_PIXELS } from './cards.ts';
import { GitHubHttpError, isConflictError } from './github.ts';

describe('campfire cards and github conflicts', () => {
  it('uses the planned pixel sizes', () => {
    assert.deepEqual(CARD_PIXELS.feed, [1080, 1080]);
    assert.deepEqual(CARD_PIXELS.story, [1080, 1920]);
    assert.deepEqual(CARD_PIXELS.thumb, [1280, 720]);
    assert.deepEqual(CARD_PIXELS.landscape, [1600, 900]);
  });

  it('treats a stale sha as a teammate conflict', () => {
    assert.equal(isConflictError(new GitHubHttpError(409, 'Conflict')), true);
    assert.equal(isConflictError(new GitHubHttpError(422, 'is at sha abc but expected def')), true);
    assert.equal(isConflictError(new GitHubHttpError(422, 'Validation failed')), false);
    assert.equal(isConflictError(new Error('Conflict')), false);
  });
});
