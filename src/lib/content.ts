import { getCollection, type CollectionEntry } from 'astro:content';

export const GUIDE_KEYS = ['adventures', 'fun', 'lessons'] as const;
export const TOPIC_KEYS = ['camping', 'rockhounding', 'gymnastics', 'aviation', 'gaming'] as const;
export const COLLECTION_KEYS = [...GUIDE_KEYS, ...TOPIC_KEYS] as const;
export const ARCHIVE_KEYS = ['kids'] as const;
export type CollectionKey = (typeof COLLECTION_KEYS)[number] | (typeof ARCHIVE_KEYS)[number];
export type TopicKey = (typeof TOPIC_KEYS)[number];
export type GuideKey = (typeof GUIDE_KEYS)[number];

export const AGE_KEYS = ['all', '4-6', '7-10'] as const;
export type AgeKey = (typeof AGE_KEYS)[number];

export const COLLECTION_META: Record<
  CollectionKey,
  { path: string; label: string; eyebrow: string; blurb: string }
> = {
  adventures: {
    path: '/adventures',
    label: 'Adventures',
    eyebrow: 'Get outside',
    blurb: 'Front Range trips with honest effort notes, timing, and what to pack.',
  },
  fun: {
    path: '/fun',
    label: 'Fun Things',
    eyebrow: 'This weekend',
    blurb: 'Easy days that still feel like going out — trails, lawns, bike loops.',
  },
  lessons: {
    path: '/lessons',
    label: 'Lessons',
    eyebrow: 'Learn it once',
    blurb: 'Short how-tos you can use the same afternoon.',
  },
  kids: {
    path: '/kids',
    label: 'Archive',
    eyebrow: 'Unlisted',
    blurb: 'Older notes kept off the main site.',
  },
  camping: {
    path: '/camping',
    label: 'Camping',
    eyebrow: 'Sleep outside',
    blurb: 'Car-camp nights, tent setup, and Colorado weather that drops 30 degrees.',
  },
  rockhounding: {
    path: '/rockhounding',
    label: 'Rockhounding',
    eyebrow: 'Pockets of rocks',
    blurb: 'Colorado finds, plus the rules so you do not wreck the site.',
  },
  gymnastics: {
    path: '/gymnastics',
    label: 'Gymnastics',
    eyebrow: 'Flip it',
    blurb: 'Rec class, open gym, and strength work that is not a circus.',
  },
  aviation: {
    path: '/aviation',
    label: 'Aviation',
    eyebrow: 'Look up',
    blurb: 'Planes, hangars, and spotting days on the Front Range.',
  },
  gaming: {
    path: '/gaming',
    label: 'Gaming',
    eyebrow: 'Play together',
    blurb: 'Board nights and co-op games with a hard stop before anyone tilts.',
  },
};

export const AGE_LABELS: Record<AgeKey, string> = {
  all: 'All ages',
  '4-6': '4–6',
  '7-10': '7–10',
};

export type AnyPost =
  | CollectionEntry<'adventures'>
  | CollectionEntry<'fun'>
  | CollectionEntry<'lessons'>
  | CollectionEntry<'kids'>
  | CollectionEntry<'camping'>
  | CollectionEntry<'rockhounding'>
  | CollectionEntry<'gymnastics'>
  | CollectionEntry<'aviation'>
  | CollectionEntry<'gaming'>;

export function sortByDate(posts: AnyPost[]) {
  return [...posts].sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export function matchesAge(post: AnyPost, age?: string | null) {
  if (!age || age === 'all') return true;
  return post.data.ages === age || post.data.ages === 'all';
}

export function topicList() {
  return TOPIC_KEYS.map((key) => ({ key, ...COLLECTION_META[key] }));
}

export function guideList() {
  return GUIDE_KEYS.map((key) => ({ key, ...COLLECTION_META[key] }));
}

export async function getAllPosts() {
  const groups = await Promise.all(COLLECTION_KEYS.map((key) => getCollection(key)));

  const tagged = COLLECTION_KEYS.flatMap((key, index) =>
    groups[index].map((post) => ({ post, collection: key })),
  );

  return tagged.sort((a, b) => b.post.data.date.valueOf() - a.post.data.date.valueOf());
}

export function collectionPath(collection: CollectionKey, slug: string) {
  return `${COLLECTION_META[collection].path}/${slug}`;
}
