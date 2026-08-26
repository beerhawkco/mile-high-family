import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ideasFor, noteIdeas, seasonalIdeas, type IdeaPost } from './ideas.ts';

const posts: IdeaPost[] = [
  {
    collection: 'adventures',
    slug: 'rmnp-bear-lake',
    title: 'Bear Lake without the circus',
    summary: 'A Rocky Mountain National Park loop that stays short, scenic, and worth the timed-entry hassle.',
  },
  {
    collection: 'camping',
    slug: 'first-car-camp',
    title: 'First car-camp that still feels like camping',
    summary: 'Chatfield or Mueller-style — walk to the bathroom, cook once, and quit before anyone wants the highway.',
  },
  {
    collection: 'gaming',
    slug: 'family-game-night',
    title: 'A game night people actually finish',
    summary: 'One box, one snack, a 45-minute cap — cooperative if the table is mixed.',
  },
  {
    collection: 'gymnastics',
    slug: 'open-gym-saturday',
    title: 'Open gym Saturday',
    summary: 'Rec class, open gym, and strength work that is not a circus.',
  },
  { collection: 'kids', slug: 'pinecone-mountains', title: 'Pinecone mountains', summary: 'Archive.' },
];

describe('campfire ideas', () => {
  it('suggests timed-entry notes in May', () => {
    const ideas = seasonalIdeas(new Date('2026-05-15T12:00:00Z'), posts);
    const bear = ideas.find((idea) => idea.id === 'season-rmnp-timed');
    assert.ok(bear);
    assert.equal(bear?.source?.slug, 'rmnp-bear-lake');
    assert.equal(bear?.why, 'Timed-entry season');
    assert.doesNotMatch(bear?.hook ?? '', /Monsoon/);
  });

  it('suggests indoor game night in December', () => {
    const ideas = seasonalIdeas(new Date('2026-12-02T12:00:00Z'), posts);
    assert.ok(ideas.some((idea) => idea.id === 'season-game-night'));
    assert.ok(ideas.some((idea) => idea.id === 'season-coop-not-rage'));
  });

  it('keeps August gym and picnic ideas off the monsoon label', () => {
    const ideas = seasonalIdeas(new Date('2026-08-26T12:00:00Z'), posts);
    const gym = ideas.find((idea) => idea.id === 'season-open-gym');
    const picnic = ideas.find((idea) => idea.id === 'season-red-rocks');
    const pack = ideas.find((idea) => idea.id === 'season-monsoon-pack');
    assert.ok(gym);
    assert.equal(gym?.why, 'Saturday rec post');
    assert.doesNotMatch(`${gym?.why} ${gym?.hook}`, /Monsoon/);
    assert.equal(picnic?.why, 'Free-park picnic days');
    assert.equal(pack?.why, 'Monsoon afternoons');
  });

  it('uses the real note title and summary', () => {
    const ideas = noteIdeas(posts);
    const camp = ideas.find((idea) => idea.source?.slug === 'first-car-camp');
    assert.equal(camp?.title, 'First car-camp that still feels like camping');
    assert.match(camp?.hook ?? '', /Chatfield or Mueller-style/);
    assert.equal(camp?.why, 'From Camping');
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
