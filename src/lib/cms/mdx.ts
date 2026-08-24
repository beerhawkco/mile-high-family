import { AGE_OPTIONS, type AgeOption, type PostFields } from './schema.ts';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function parseScalar(raw: string): string | boolean | string[] {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(',').map((part) => {
      const item = part.trim();
      if ((item.startsWith('"') && item.endsWith('"')) || (item.startsWith("'") && item.endsWith("'"))) {
        return item.slice(1, -1);
      }
      return item;
    });
  }
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    try {
      return JSON.parse(value.startsWith("'") ? `"${value.slice(1, -1).replace(/"/g, '\\"')}"` : value);
    } catch {
      return value.slice(1, -1);
    }
  }
  return value;
}

function yamlString(value: string) {
  return JSON.stringify(value);
}

export function parsePost(raw: string): PostFields {
  const match = raw.replace(/^\uFEFF/, '').match(FRONTMATTER);
  if (!match) {
    throw new Error('This file is missing the --- title block at the top.');
  }

  const data: Record<string, unknown> = {};
  for (const line of match[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const cut = line.indexOf(':');
    if (cut === -1) continue;
    data[line.slice(0, cut).trim()] = parseScalar(line.slice(cut + 1));
  }

  const ages = String(data.ages ?? 'all');
  if (!(AGE_OPTIONS as readonly string[]).includes(ages)) {
    throw new Error(`Unknown ages value: ${ages}`);
  }

  const tags = Array.isArray(data.tags) ? data.tags.map(String) : [];

  return {
    title: String(data.title ?? ''),
    summary: String(data.summary ?? ''),
    date: String(data.date ?? '').slice(0, 10),
    tags,
    ages: ages as AgeOption,
    hero: String(data.hero ?? ''),
    heroAlt: String(data.heroAlt ?? ''),
    heroCredit: String(data.heroCredit ?? ''),
    featured: data.featured === true,
    weekend: data.weekend === true,
    body: match[2].replace(/^\n+/, '').replace(/\s+$/, '') + '\n',
  };
}

export function serializePost(fields: PostFields) {
  const title = fields.title.trim();
  const summary = fields.summary.trim();
  const date = fields.date.trim();
  const hero = fields.hero.trim();
  const heroAlt = fields.heroAlt.trim();
  if (!title) throw new Error('Title is required.');
  if (!summary) throw new Error('Summary is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date must be YYYY-MM-DD.');
  if (!hero) throw new Error('Photo URL is required.');
  if (!heroAlt) throw new Error('Photo description is required.');

  const tags = fields.tags.map((tag) => tag.trim()).filter(Boolean);
  const lines = [
    '---',
    `title: ${yamlString(title)}`,
    `summary: ${yamlString(summary)}`,
    `date: ${date}`,
    `tags: [${tags.map((tag) => yamlString(tag)).join(', ')}]`,
    `ages: ${fields.ages}`,
    `hero: ${yamlString(hero)}`,
    `heroAlt: ${yamlString(heroAlt)}`,
  ];
  if (fields.heroCredit.trim()) lines.push(`heroCredit: ${yamlString(fields.heroCredit.trim())}`);
  if (fields.featured) lines.push('featured: true');
  if (fields.weekend) lines.push('weekend: true');
  lines.push('---', '', fields.body.replace(/^\n+/, '').replace(/\s+$/, ''), '');
  return lines.join('\n');
}
