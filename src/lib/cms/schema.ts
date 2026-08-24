export const CMS_REPO = 'beerhawkco/mile-high-family';
export const CMS_BRANCH = 'main';
export const CMS_VAULT_KEY = 'mhf-cairn-vault';

export const DESK_COLLECTIONS = [
  'camping',
  'rockhounding',
  'gymnastics',
  'aviation',
  'gaming',
  'adventures',
  'fun',
  'lessons',
  'kids',
] as const;

export type DeskCollection = (typeof DESK_COLLECTIONS)[number];

export const DESK_LABELS: Record<DeskCollection, string> = {
  camping: 'Camping',
  rockhounding: 'Rockhounding',
  gymnastics: 'Gymnastics',
  aviation: 'Aviation',
  gaming: 'Gaming',
  adventures: 'Adventures',
  fun: 'Fun Things',
  lessons: 'Lessons',
  kids: 'Archive (unlisted)',
};

export const AGE_OPTIONS = ['all', '4-6', '7-10'] as const;
export type AgeOption = (typeof AGE_OPTIONS)[number];

export type PostFields = {
  title: string;
  summary: string;
  date: string;
  tags: string[];
  ages: AgeOption;
  hero: string;
  heroAlt: string;
  heroCredit: string;
  featured: boolean;
  weekend: boolean;
  body: string;
};

export function isDeskCollection(value: string): value is DeskCollection {
  return (DESK_COLLECTIONS as readonly string[]).includes(value);
}

export function contentPath(collection: DeskCollection, slug: string) {
  return `src/content/${collection}/${slug}.mdx`;
}

export function slugFromTitle(title: string) {
  return title
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function isValidSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
