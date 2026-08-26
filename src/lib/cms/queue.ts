import { isDeskCollection, isValidSlug, type DeskCollection } from './schema.ts';

export const PLATFORMS = ['blog', 'instagram', 'facebook', 'x', 'youtube'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const STATUSES = ['idea', 'draft', 'ready', 'posted'] as const;
export type Status = (typeof STATUSES)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  blog: 'Blog',
  instagram: 'Instagram',
  facebook: 'Facebook',
  x: 'X',
  youtube: 'YouTube',
};

export const STATUS_LABELS: Record<Status, string> = {
  idea: 'Idea',
  draft: 'Draft',
  ready: 'Ready',
  posted: 'Posted',
};

export type PlatformCopy = {
  blog: { blurb: string; link: string };
  instagram: { caption: string; hashtags: string; alt: string; story: string };
  facebook: { post: string; link: string };
  x: { thread: string };
  youtube: { title: string; description: string; tags: string; script: string };
};

export type SourceNote = {
  collection: DeskCollection;
  slug: string;
};

export type QueueItem = {
  v: 1;
  slug: string;
  title: string;
  date: string;
  status: Status;
  platforms: Platform[];
  source: SourceNote | null;
  copy: PlatformCopy;
  imagePrompt: string;
  heroUrl: string;
  cardKind: CardKind;
  cardSize: CardSize;
  cardLine: string;
  cardSub: string;
  assignee: string;
  createdBy: string;
  updatedBy: string;
  updatedAt: string;
  note: string;
};

export const CARD_KINDS = ['title', 'weekend', 'effort', 'quote'] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export const CARD_SIZES = ['feed', 'story', 'thumb', 'landscape'] as const;
export type CardSize = (typeof CARD_SIZES)[number];

export const CARD_KIND_LABELS: Record<CardKind, string> = {
  title: 'Title card',
  weekend: 'Weekend card',
  effort: 'Effort notes',
  quote: 'Quote card',
};

export const CARD_SIZE_LABELS: Record<CardSize, string> = {
  feed: 'Feed 1080×1080',
  story: 'Story 1080×1920',
  thumb: 'YouTube thumb 1280×720',
  landscape: 'Landscape 1600×900',
};

export function emptyCopy(): PlatformCopy {
  return {
    blog: { blurb: '', link: '' },
    instagram: { caption: '', hashtags: '', alt: '', story: '' },
    facebook: { post: '', link: '' },
    x: { thread: '' },
    youtube: { title: '', description: '', tags: '', script: '' },
  };
}

export function emptyQueueItem(partial: Partial<QueueItem> & Pick<QueueItem, 'slug' | 'createdBy'>): QueueItem {
  const today = new Date().toISOString().slice(0, 10);
  return {
    v: 1,
    title: '',
    date: today,
    status: 'idea',
    platforms: [...PLATFORMS],
    source: null,
    copy: emptyCopy(),
    imagePrompt: '',
    heroUrl: '',
    cardKind: 'title',
    cardSize: 'feed',
    cardLine: '',
    cardSub: '',
    assignee: partial.createdBy,
    updatedBy: partial.createdBy,
    updatedAt: new Date().toISOString(),
    note: '',
    ...partial,
  };
}

function asString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function asPlatforms(value: unknown): Platform[] {
  if (!Array.isArray(value)) return [...PLATFORMS];
  const picked = value.filter((item): item is Platform => (PLATFORMS as readonly string[]).includes(String(item)));
  return picked.length ? picked : [...PLATFORMS];
}

function asStatus(value: unknown): Status {
  return (STATUSES as readonly string[]).includes(String(value)) ? (value as Status) : 'idea';
}

function asCardKind(value: unknown): CardKind {
  return (CARD_KINDS as readonly string[]).includes(String(value)) ? (value as CardKind) : 'title';
}

function asCardSize(value: unknown): CardSize {
  return (CARD_SIZES as readonly string[]).includes(String(value)) ? (value as CardSize) : 'feed';
}

function asSource(value: unknown): SourceNote | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as { collection?: unknown; slug?: unknown };
  const collection = String(record.collection ?? '');
  const slug = String(record.slug ?? '');
  if (!isDeskCollection(collection) || !isValidSlug(slug)) return null;
  return { collection, slug };
}

function asCopy(value: unknown): PlatformCopy {
  const blank = emptyCopy();
  if (!value || typeof value !== 'object') return blank;
  const record = value as Record<string, Record<string, unknown> | undefined>;
  return {
    blog: {
      blurb: asString(record.blog?.blurb),
      link: asString(record.blog?.link),
    },
    instagram: {
      caption: asString(record.instagram?.caption),
      hashtags: asString(record.instagram?.hashtags),
      alt: asString(record.instagram?.alt),
      story: asString(record.instagram?.story),
    },
    facebook: {
      post: asString(record.facebook?.post),
      link: asString(record.facebook?.link),
    },
    x: {
      thread: asString(record.x?.thread),
    },
    youtube: {
      title: asString(record.youtube?.title),
      description: asString(record.youtube?.description),
      tags: asString(record.youtube?.tags),
      script: asString(record.youtube?.script),
    },
  };
}

export function parseQueueItem(raw: string, fallbackSlug = ''): QueueItem {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error('This Campfire file is not valid JSON.');
  }
  if (!data || typeof data !== 'object') {
    throw new Error('This Campfire file is empty.');
  }
  const record = data as Record<string, unknown>;
  const slug = asString(record.slug) || fallbackSlug;
  if (!isValidSlug(slug)) {
    throw new Error('This Campfire file needs a simple web address (lowercase letters, numbers, hyphens).');
  }
  const createdBy = asString(record.createdBy);
  return {
    v: 1,
    slug,
    title: asString(record.title),
    date: asString(record.date).slice(0, 10),
    status: asStatus(record.status),
    platforms: asPlatforms(record.platforms),
    source: asSource(record.source),
    copy: asCopy(record.copy),
    imagePrompt: asString(record.imagePrompt),
    heroUrl: asString(record.heroUrl),
    cardKind: asCardKind(record.cardKind),
    cardSize: asCardSize(record.cardSize),
    cardLine: asString(record.cardLine),
    cardSub: asString(record.cardSub),
    assignee: asString(record.assignee),
    createdBy,
    updatedBy: asString(record.updatedBy) || createdBy,
    updatedAt: asString(record.updatedAt),
    note: asString(record.note),
  };
}

export function serializeQueueItem(item: QueueItem) {
  const title = item.title.trim();
  const date = item.date.trim();
  if (!title) throw new Error('Title is required.');
  if (!isValidSlug(item.slug)) {
    throw new Error('The web address can only use lowercase letters, numbers, and hyphens.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date must be YYYY-MM-DD.');
  const payload: QueueItem = {
    ...item,
    v: 1,
    title,
    date,
    platforms: item.platforms.length ? item.platforms : [...PLATFORMS],
    assignee: item.assignee.trim(),
    note: item.note.trim(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  };
  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function peopleFromQueue(items: QueueItem[], currentLogin: string) {
  const names = new Set<string>();
  if (currentLogin) names.add(currentLogin);
  for (const item of items) {
    if (item.assignee) names.add(item.assignee);
    if (item.createdBy) names.add(item.createdBy);
    if (item.updatedBy) names.add(item.updatedBy);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export type QueueFilter = {
  people: 'all' | 'mine' | 'unclaimed';
  status: Status | '';
  platform: Platform | '';
  login: string;
};

export function filterQueue(items: QueueItem[], filter: QueueFilter) {
  return items.filter((item) => {
    if (filter.people === 'mine' && item.assignee !== filter.login) return false;
    if (filter.people === 'unclaimed' && item.assignee) return false;
    if (filter.status && item.status !== filter.status) return false;
    if (filter.platform && !item.platforms.includes(filter.platform)) return false;
    return true;
  });
}

export function sortQueue(items: QueueItem[]) {
  return [...items].sort((a, b) => {
    const date = a.date.localeCompare(b.date);
    if (date) return date;
    return a.title.localeCompare(b.title);
  });
}
