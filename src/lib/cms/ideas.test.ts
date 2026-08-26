import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PostIndexItem } from './github.ts';
import { ideasFor, noteIdeas, seasonalIdeas } from './ideas.ts';

const posts: PostIndexItem[] = [
  { collection: 'adventures', slug: 'rmnp-bear-lake', path: 'src/content/adventures/rmnp-bear-lake.mdx' },
  { collection: 'camping', slug: 'first-car-camp', path: 'src/content/camping/first-car-camp.mdx' },
  { collection: 'gaming', slug: 'family-game-night', path: 'src/content/gaming/family-game-night.mdx' },
  { collection: 'kids', slug: 'pinecone-mountains', path: 'src/content/kids/pinecone-mountains.mdx' },
];

describe('campfire ideas', () => {
  it('suggests timed-entry notes in May', () => {
    const ideas = seasonalIdeas(new Date('2026-05-15T12:00:00Z'), posts);
    const bear = ideas.find((idea) => idea.id === 'season-rmnp-timed');
    assert.ok(bear);
    assert.equal(bear?.source?.slug, 'rmnp-bear-lake');
    assert.ok(bear?.platforms.includes('youtube'));
  });

  it('suggests indoor game night in December', () => {
    const ideas = seasonalIdeas(new Date('2026-12-02T12:00:00Z'), posts);
    assert.ok(ideas.some((idea) => idea.id === 'season-game-night'));
    assert.ok(ideas.some((idea) => idea.id === 'season-coop-not-rage'));
  });

  it('turns public notes into ideas and skips the kids archive', () => {
    const ideas = noteIdeas(posts);
    assert.ok(ideas.some((idea) => idea.source?.slug === 'first-car-camp'));
    assert.equal(
      ideas.some((idea) => idea.source?.slug === 'pinecone-mountains'),
      false,
    );
  });

  it('does not duplicate a seasonal source as a raw note idea', () => {
    const ideas = ideasFor(new Date('2026-05-15T12:00:00Z'), posts);
    const bearNotes = ideas.filter((idea) => idea.source?.slug === 'rmnp-bear-lake');
    assert.equal(bearNotes.length, 1);
    assert.equal(bearNotes[0].id, 'season-rmnp-timed');
  });
});
