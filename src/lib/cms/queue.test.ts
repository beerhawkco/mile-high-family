import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  emptyQueueItem,
  filterQueue,
  parseQueueItem,
  peopleFromQueue,
  serializeQueueItem,
  sortQueue,
} from './queue.ts';

const sample = emptyQueueItem({
  slug: 'bear-lake-week',
  title: 'Bear Lake without the circus',
  createdBy: 'ada',
  assignee: 'ada',
  updatedBy: 'ada',
  date: '2026-05-12',
  status: 'draft',
  platforms: ['instagram', 'youtube'],
  note: 'Needs a better hook.',
});

describe('campfire queue codec', () => {
  it('round-trips a queue item', () => {
    const raw = serializeQueueItem(sample);
    const parsed = parseQueueItem(raw);
    assert.equal(parsed.slug, 'bear-lake-week');
    assert.equal(parsed.assignee, 'ada');
    assert.equal(parsed.status, 'draft');
    assert.deepEqual(parsed.platforms, ['instagram', 'youtube']);
    assert.equal(parsed.note, 'Needs a better hook.');
    assert.equal(parsed.heroUrl, '');
  });

  it('treats a missing assignee as unclaimed', () => {
    const item = parseQueueItem(
      JSON.stringify({
        slug: 'open-item',
        title: 'Open',
        date: '2026-08-01',
        createdBy: 'ada',
      }),
    );
    assert.equal(item.assignee, '');
    assert.equal(item.status, 'idea');
  });

  it('rejects a blank title on save', () => {
    assert.throws(() => serializeQueueItem({ ...sample, title: '  ' }), /Title is required/);
  });

  it('filters mine and unclaimed', () => {
    const mine = { ...sample, slug: 'mine', assignee: 'ada' };
    const theirs = { ...sample, slug: 'theirs', assignee: 'bea' };
    const open = { ...sample, slug: 'open', assignee: '' };
    const items = [mine, theirs, open];
    assert.deepEqual(
      filterQueue(items, { people: 'mine', status: '', platform: '', login: 'ada' }).map((item) => item.slug),
      ['mine'],
    );
    assert.deepEqual(
      filterQueue(items, { people: 'unclaimed', status: '', platform: '', login: 'ada' }).map((item) => item.slug),
      ['open'],
    );
    assert.equal(filterQueue(items, { people: 'all', status: 'draft', platform: 'instagram', login: 'ada' }).length, 3);
    assert.equal(filterQueue(items, { people: 'all', status: '', platform: 'facebook', login: 'ada' }).length, 0);
  });

  it('collects people and sorts by date', () => {
    const later = { ...sample, slug: 'later', date: '2026-06-01', createdBy: 'bea', assignee: 'bea' };
    const names = peopleFromQueue([sample, later], 'cee');
    assert.deepEqual(names, ['ada', 'bea', 'cee']);
    assert.deepEqual(
      sortQueue([later, sample]).map((item) => item.slug),
      ['bear-lake-week', 'later'],
    );
  });
});
