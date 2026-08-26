import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parsePost } from './mdx.ts';
import { bulletsAfter, draftFromFields, hashtagsFrom, imagePromptFrom, noteUrl } from './scripts.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../content');

describe('campfire scripts', () => {
  it('builds platform copy from the Bear Lake note', () => {
    const raw = readFileSync(join(root, 'adventures/rmnp-bear-lake.mdx'), 'utf8');
    const fields = parsePost(raw);
    const copy = draftFromFields(fields, 'adventures', 'rmnp-bear-lake');
    assert.match(copy.blog.link, /milehighfamily.com\/adventures\/rmnp-bear-lake/);
    assert.match(copy.instagram.caption, /Bear Lake without the circus/);
    assert.match(copy.instagram.hashtags, /#MileHighFamily/);
    assert.match(copy.facebook.post, /Effort, for real/);
    assert.match(copy.x.thread, /Full note:/);
    assert.match(copy.youtube.title, /Bear Lake/);
    assert.match(copy.youtube.script, /Hook/);
    assert.match(copy.youtube.script, /CTA/);
    assert.match(copy.youtube.description, /milehighfamily.com/);
  });

  it('pulls pack bullets and hashtags', () => {
    const bullets = bulletsAfter('## What to pack\n- Water\n- A layer\n\n## Later\n- skip', 'pack');
    assert.deepEqual(bullets, ['Water', 'A layer']);
    assert.match(hashtagsFrom(['rmnp', 'hike']), /#Rmnp/);
    assert.equal(noteUrl(null), 'https://milehighfamily.com');
  });

  it('writes a photo prompt without asking for children’s faces', () => {
    const prompt = imagePromptFrom({
      title: 'Bear Lake without the circus',
      summary: 'A short RMNP loop.',
      tags: ['rmnp'],
      body: '',
    });
    assert.match(prompt, /Front Range/);
    assert.match(prompt, /no children's faces/i);
    assert.match(prompt, /no clinic or medical vibe/);
  });
});
