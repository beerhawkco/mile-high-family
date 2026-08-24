import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parsePost, serializePost } from './mdx.ts';
import { DESK_COLLECTIONS } from './schema.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../content');

function allPosts() {
  return DESK_COLLECTIONS.flatMap((collection) => {
    const folder = join(root, collection);
    return readdirSync(folder)
      .filter((name) => name.endsWith('.mdx'))
      .map((name) => ({
        collection,
        name,
        raw: readFileSync(join(folder, name), 'utf8'),
      }));
  });
}

describe('post codec', () => {
  it('parses every existing note', () => {
    const posts = allPosts();
    assert.ok(posts.length >= 16);
    for (const post of posts) {
      const fields = parsePost(post.raw);
      assert.ok(fields.title, post.name);
      assert.ok(fields.hero, post.name);
      assert.match(fields.date, /^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('round-trips a typical note', () => {
    const sample = allPosts().find((post) => post.name === 'first-car-camp.mdx');
    assert.ok(sample);
    const parsed = parsePost(sample.raw);
    assert.equal(parsed.title, 'First car-camp that still feels like camping');
    assert.equal(parsed.featured, true);
    assert.equal(parsed.weekend, true);
    assert.ok(parsed.tags.includes('camping'));
    const again = parsePost(serializePost(parsed));
    assert.deepEqual(again, parsed);
  });

  it('rejects an empty title on save', () => {
    assert.throws(() => {
      serializePost({
        title: '  ',
        summary: 'x',
        date: '2026-08-24',
        tags: [],
        ages: 'all',
        hero: 'https://example.com/p.jpg',
        heroAlt: 'p',
        heroCredit: '',
        featured: false,
        weekend: false,
        body: 'hi\n',
      });
    }, /Title is required/);
  });
});
