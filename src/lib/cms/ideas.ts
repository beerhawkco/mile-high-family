import { DESK_LABELS, type DeskCollection } from './schema.ts';
import { PLATFORMS, type Platform } from './queue.ts';

export type IdeaPost = {
  collection: DeskCollection;
  slug: string;
  title?: string;
  summary?: string;
};

export type ContentIdea = {
  id: string;
  title: string;
  hook: string;
  why: string;
  platforms: Platform[];
  source: { collection: DeskCollection; slug: string } | null;
};

type SeasonSeed = {
  months: number[];
  id: string;
  title: string;
  hook: string;
  why: string;
  platforms: Platform[];
  sourceSlug?: string;
};

const ALL = [...PLATFORMS];
const SHORT = ['instagram', 'x', 'facebook'] as Platform[];
const VIDEO = ['youtube', 'instagram', 'blog'] as Platform[];

const SEASON_SEEDS: SeasonSeed[] = [
  {
    months: [1, 2],
    id: 'sledding',
    title: 'Front Range sledding without a circus',
    hook: 'A short hill, a hard stop time, and cocoa in the car. Honest about parking and whether the snow is still worth it.',
    why: 'After a Front Range snow',
    platforms: ALL,
    sourceSlug: 'front-range-sledding',
  },
  {
    months: [1, 2, 11, 12],
    id: 'game-night',
    title: 'Family game night with a hard stop',
    hook: 'Co-op, not rage. Pick a game that ends before anyone tilts, then actually end it.',
    why: 'Indoor week',
    platforms: SHORT,
    sourceSlug: 'family-game-night',
  },
  {
    months: [1, 2, 11, 12],
    id: 'living-room-strength',
    title: 'Living-room strength that is not a circus',
    hook: 'A few strength moves, a timer, and no performance. Open-gym energy at home.',
    why: 'Indoor week',
    platforms: VIDEO,
    sourceSlug: 'living-room-strength',
  },
  {
    months: [2, 3, 11],
    id: 'paper-wings',
    title: 'Paper wings and plane spotting',
    hook: 'Fold something that flies, then go watch the real ones. Indoor craft plus a hangar day.',
    why: 'Good rainy-day post',
    platforms: VIDEO,
    sourceSlug: 'paper-wings-and-spotting',
  },
  {
    months: [3, 4, 5],
    id: 'first-car-camp',
    title: 'First car-camp that still feels like camping',
    hook: 'Drive-up site, bathroom you can find in the dark, one meal that is not a science project.',
    why: 'Shoulder-season camping',
    platforms: ALL,
    sourceSlug: 'first-car-camp',
  },
  {
    months: [3, 4, 10],
    id: 'garden-gods',
    title: 'Garden of the Gods without the death march',
    hook: 'A Front Range day that looks hard in photos and is actually polite on the legs.',
    why: 'Cooler hiking weather',
    platforms: ALL,
    sourceSlug: 'garden-of-the-gods',
  },
  {
    months: [4, 5, 9, 10],
    id: 'rockhounding',
    title: 'Front Range finds, plus the rules',
    hook: 'Pockets of rocks. Do not wreck the site. Say what you can take and what you leave.',
    why: 'After the thaw / before the freeze',
    platforms: ALL,
    sourceSlug: 'front-range-finds',
  },
  {
    months: [4, 5, 6],
    id: 'high-line',
    title: 'High Line Canal bike loop',
    hook: 'An easy day that still feels like leaving the house. Shade, water, and a turnaround rule.',
    why: 'This-weekend bike day',
    platforms: SHORT,
    sourceSlug: 'high-line-canal-bike',
  },
  {
    months: [5, 6, 7],
    id: 'rmnp-timed',
    title: 'Bear Lake without the circus',
    hook: 'Timed entry is real. Grab the window the night before and pack like the parking lot will be a zoo.',
    why: 'Timed-entry season',
    platforms: ALL,
    sourceSlug: 'rmnp-bear-lake',
  },
  {
    months: [6, 7],
    id: 'altitude-water',
    title: 'Altitude, water, trail manners',
    hook: 'The lake does not care that Denver was 88. Water for every person, plus one bonus bottle.',
    why: 'Hot city, cold trail',
    platforms: VIDEO,
    sourceSlug: 'altitude-water-trail-manners',
  },
  {
    months: [7, 8],
    id: 'monsoon-pack',
    title: 'Pack a daypack someone will actually carry',
    hook: 'If they wear it, they own the day. Keep it light when the afternoon storms build over the Range.',
    why: 'Monsoon afternoons',
    platforms: VIDEO,
    sourceSlug: 'pack-a-daypack',
  },
  {
    months: [6, 7, 8],
    id: 'aviation',
    title: 'Wings Over the Rockies and spotting days',
    hook: 'Hangars, planes, and a Front Range afternoon that is mostly looking up.',
    why: 'Long summer evenings',
    platforms: ALL,
    sourceSlug: 'wings-over-the-rockies',
  },
  {
    months: [7, 8],
    id: 'open-gym',
    title: 'Open gym Saturday',
    hook: 'Rec class energy, not a meet. Show up, flip a little, leave before anyone is wrecked.',
    why: 'Saturday rec post',
    platforms: SHORT,
    sourceSlug: 'open-gym-saturday',
  },
  {
    months: [8, 9],
    id: 'red-rocks',
    title: 'Red Rocks picnic, not a concert sprint',
    hook: 'Trading-post lawn, a walk on the rocks, sunset included. Earplugs optional.',
    why: 'Free-park picnic days',
    platforms: ALL,
    sourceSlug: 'red-rocks-picnic',
  },
  {
    months: [9, 10],
    id: 'aspen-weekend',
    title: 'Aspen weekend that still feels like leaving the house',
    hook: 'Color on the Front Range, an early start, and a turnaround before the lot is a zoo.',
    why: 'Fall color week',
    platforms: ALL,
  },
  {
    months: [9, 10],
    id: 'tent-night',
    title: 'Tent-night kit before the last freeze',
    hook: 'Colorado weather that drops 30 degrees. Pack the fat pads and a breakfast if the stove sulks.',
    why: 'Last warm nights out',
    platforms: VIDEO,
    sourceSlug: 'tent-night-kit',
  },
  {
    months: [10],
    id: 'last-car-camp',
    title: 'Last car-camp of the season',
    hook: 'Same first-camp rules, colder. Quit before anyone wants the highway.',
    why: 'Last camp before winter',
    platforms: ALL,
    sourceSlug: 'first-car-camp',
  },
  {
    months: [11, 12],
    id: 'coop-not-rage',
    title: 'Co-op, not rage',
    hook: 'Indoor season is when game night either holds or explodes. Write the hard-stop rule out loud.',
    why: 'Indoor week',
    platforms: SHORT,
    sourceSlug: 'coop-not-rage',
  },
];

function sourceFromSlug(posts: IdeaPost[], slug?: string) {
  if (!slug) return null;
  const match = posts.find((post) => post.slug === slug);
  if (!match) return null;
  return { collection: match.collection, slug: match.slug };
}

export function seasonalIdeas(when: Date, posts: IdeaPost[]): ContentIdea[] {
  const month = when.getUTCMonth() + 1;
  return SEASON_SEEDS.filter((seed) => seed.months.includes(month)).map((seed) => ({
    id: `season-${seed.id}`,
    title: seed.title,
    hook: seed.hook,
    why: seed.why,
    platforms: seed.platforms,
    source: sourceFromSlug(posts, seed.sourceSlug),
  }));
}

export function noteIdeas(posts: IdeaPost[]): ContentIdea[] {
  return posts
    .filter((post) => post.collection !== 'kids' && (post.title || post.summary))
    .map((post) => ({
      id: `note-${post.collection}-${post.slug}`,
      title: post.title || post.slug,
      hook: post.summary || `Write captions from the ${DESK_LABELS[post.collection]} note.`,
      why: `From ${DESK_LABELS[post.collection]}`,
      platforms: [...PLATFORMS],
      source: { collection: post.collection, slug: post.slug },
    }));
}

export function ideasFor(when: Date, posts: IdeaPost[]): ContentIdea[] {
  const seasonal = seasonalIdeas(when, posts);
  const notes = noteIdeas(posts);
  const seen = new Set<string>();
  const out: ContentIdea[] = [];
  for (const idea of [...seasonal, ...notes]) {
    const key = idea.source ? `${idea.source.collection}/${idea.source.slug}` : idea.id;
    if (seen.has(key) && idea.id.startsWith('note-')) continue;
    if (idea.id.startsWith('season-') && idea.source) seen.add(key);
    out.push(idea);
  }
  return out;
}
