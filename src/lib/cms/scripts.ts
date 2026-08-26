import { SITE_ORIGIN, type PostFields, type DeskCollection } from './schema.ts';
import { emptyCopy, type PlatformCopy, type SourceNote } from './queue.ts';

export type DraftSource = {
  title: string;
  summary: string;
  tags: string[];
  body: string;
  heroAlt?: string;
  weekend?: boolean;
  source?: SourceNote | null;
};

const HASHTAG_BASE = ['MileHighFamily', 'Colorado', 'FrontRange'];

export function noteUrl(source: SourceNote | null | undefined) {
  if (!source) return SITE_ORIGIN;
  return `${SITE_ORIGIN}/${source.collection}/${source.slug}`;
}

export function hashtagsFrom(tags: string[]) {
  const extra = tags
    .map((tag) => tag.replace(/[^a-z0-9]+/gi, ''))
    .filter((tag) => tag.length > 2)
    .map((tag) => tag.charAt(0).toUpperCase() + tag.slice(1));
  return [...new Set([...HASHTAG_BASE, ...extra])].slice(0, 8).map((tag) => `#${tag}`).join(' ');
}

export function bulletsAfter(body: string, headingPart: string) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const needle = headingPart.toLowerCase();
  const start = lines.findIndex((line) => line.startsWith('## ') && line.toLowerCase().includes(needle));
  if (start === -1) return [];
  const out: string[] = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.startsWith('## ')) break;
    const match = line.match(/^\s*[-*]\s+(.+)/);
    if (match) out.push(match[1].replace(/\s+/g, ' ').trim());
  }
  return out;
}

function clip(text: string, max: number) {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function firstSentence(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim();
  const cut = clean.search(/[.!?](\s|$)/);
  if (cut === -1) return clean;
  return clean.slice(0, cut + 1);
}

function listLines(items: string[], fallback: string) {
  if (!items.length) return fallback;
  return items.map((item) => `• ${item}`).join('\n');
}

export function draftFromNote(source: DraftSource): PlatformCopy {
  const copy = emptyCopy();
  const link = noteUrl(source.source);
  const effort = bulletsAfter(source.body, 'effort');
  const pack = bulletsAfter(source.body, 'pack');
  const tags = hashtagsFrom(source.tags);
  const hook = firstSentence(source.summary) || source.title;
  const effortLine = effort[0] ? effort[0] : 'Honest about drive, walk, and whether anyone will still be speaking at the end.';
  const packLine = pack[0] ? pack[0] : 'Water, a layer, and a snack that is better than the trail snacks.';

  copy.blog.blurb = `${source.title}: ${source.summary} Full note on Mile High Family.`.trim();
  copy.blog.link = link;

  copy.instagram.caption = [
    source.title,
    '',
    source.summary,
    '',
    `Effort, for real: ${effortLine}`,
    '',
    `The full note: ${link}`,
  ].join('\n');
  copy.instagram.hashtags = tags;
  copy.instagram.alt = source.heroAlt?.trim() || `${source.title} — Colorado Front Range`;
  copy.instagram.story = clip(`${source.title}. ${hook}`, 90);

  copy.facebook.post = [
    source.title,
    '',
    source.summary,
    '',
    'Effort, for real:',
    listLines(effort, `• ${effortLine}`),
    '',
    pack.length ? `What to pack:\n${listLines(pack, '')}` : '',
    '',
    `Read it: ${link}`,
  ]
    .filter((block) => block !== '')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
  copy.facebook.link = link;

  const x1 = clip(`${source.title}. ${hook}`, 240);
  const x2 = clip(`Effort: ${effortLine}`, 240);
  const x3 = clip(`Full note: ${link}`, 240);
  copy.x.thread = [x1, x2, x3].join('\n\n');

  copy.youtube.title = clip(source.title, 70);
  copy.youtube.tags = [...source.tags, 'colorado', 'front range', 'mile high family'].join(', ');
  copy.youtube.description = [
    source.summary,
    '',
    'This is a Mile High Family note: useful, family-friendly when a mixed group is coming, and honest about effort.',
    '',
    effort.length ? `Effort, for real:\n${listLines(effort, '')}` : '',
    pack.length ? `What to pack:\n${listLines(pack, '')}` : '',
    '',
    `Full write-up: ${link}`,
  ]
    .filter((block) => block !== '')
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

  copy.youtube.script = [
    `Hook (0–8s): ${hook} If you are planning this day on the Front Range, stay for the honest effort notes.`,
    '',
    `What this is: ${source.title}. ${source.summary}`,
    '',
    'Effort, for real:',
    listLines(effort, `• ${effortLine}`),
    '',
    'What to pack:',
    listLines(pack, `• ${packLine}`),
    '',
    `CTA: The full note lives at milehighfamily.com. Link in the description. ${link}`,
  ].join('\n');

  return copy;
}

export function draftFromFields(
  fields: PostFields,
  collection: DeskCollection,
  slug: string,
): PlatformCopy {
  return draftFromNote({
    title: fields.title,
    summary: fields.summary,
    tags: fields.tags,
    body: fields.body,
    heroAlt: fields.heroAlt,
    weekend: fields.weekend,
    source: { collection, slug },
  });
}

export function imagePromptFrom(source: DraftSource) {
  const place = source.title.replace(/[.].*$/, '');
  return [
    `Photoreal Colorado Front Range photo for Mile High Family, no text overlay.`,
    `${place}. ${source.summary}`,
    `Natural light, real landscape, no people posed for a stock ad, no children's faces, no clinic or medical vibe.`,
    `Warm late-day sun, navy and coral color grade, documentary still.`,
  ].join(' ');
}

export const VOICE_RULES = [
  'Useful, not cute.',
  'Honest about effort: drive, walk, weather, whether anyone will still be speaking.',
  'Family-friendly when a mixed group is coming — not a younger-family beat and not a clinic.',
  'No medical, therapy, or dental language.',
  'Short sentences. Concrete packing and timing. No hype.',
].join(' ');
