import { cardSpecFromItem, downloadCanvas, loadPhoto, paintCard } from './cards.ts';
import {
  deleteCampfireFile,
  getFile,
  getUser,
  isConflictError,
  listCampfireFiles,
  loadPostSummaries,
  saveCampfireFile,
  verifyToken,
  type GitHubUser,
} from './github.ts';
import { ideasFor, type ContentIdea } from './ideas.ts';
import { parsePost } from './mdx.ts';
import { generateImagePng, rewriteText } from './openai.ts';
import {
  CARD_KINDS,
  CARD_KIND_LABELS,
  CARD_SIZE_LABELS,
  CARD_SIZES,
  PLATFORM_LABELS,
  PLATFORMS,
  STATUS_LABELS,
  STATUSES,
  emptyQueueItem,
  filterQueue,
  parseQueueItem,
  peopleFromQueue,
  serializeQueueItem,
  sortQueue,
  type Platform,
  type QueueItem,
  type Status,
} from './queue.ts';
import {
  OPENAI_VAULT_KEY,
  contentPath,
  isValidSlug,
  slugFromTitle,
} from './schema.ts';
import { draftFromFields, draftFromNote, imagePromptFrom } from './scripts.ts';
import { clearVault, readVault, sealToken, unsealToken, writeVault } from './vault.ts';

type DeskMode = 'queue' | 'ideas' | 'composer' | 'settings';

type QueueRow = {
  item: QueueItem;
  sha: string;
};

const state: {
  token: string | null;
  user: GitHubUser | null;
  openaiKey: string | null;
  mode: DeskMode;
  ideas: ContentIdea[];
  rows: QueueRow[];
  current: QueueItem | null;
  sha: string;
  photo: HTMLImageElement | null;
  tab: Platform;
} = {
  token: null,
  user: null,
  openaiKey: null,
  mode: 'queue',
  ideas: [],
  rows: [],
  current: null,
  sha: '',
  photo: null,
  tab: 'instagram',
};

function $(id: string) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node;
}

function input(id: string) {
  return $(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
}

function setHidden(id: string, hidden: boolean) {
  $(id).classList.toggle('hidden', hidden);
}

function setStatus(message: string, kind: 'ok' | 'err' | 'busy' = 'ok') {
  const node = $('status');
  node.textContent = message;
  node.dataset.kind = kind;
}

function login() {
  return state.user?.login ?? '';
}

async function afterUnlock(token: string) {
  state.token = token;
  state.user = await getUser(token);
  const sealed = readVault(localStorage, OPENAI_VAULT_KEY);
  if (sealed) {
    try {
      state.openaiKey = await unsealToken(token, sealed);
    } catch {
      state.openaiKey = null;
    }
  }
  $('signed-in').textContent = `Signed in as ${state.user.name} (@${state.user.login})`;
  setHidden('login-panel', true);
  setHidden('app-panel', false);
  showMain('queue');
  await refreshAll();
}

async function unlock(event: Event) {
  event.preventDefault();
  const trap = (input('website') as HTMLInputElement).value;
  if (trap) return;
  const password = input('password').value;
  const tokenField = input('token').value.trim();
  setStatus('Unlocking…', 'busy');
  try {
    const vault = readVault(localStorage);
    if (vault && !tokenField) {
      const token = await unsealToken(password, vault);
      await verifyToken(token);
      await afterUnlock(token);
      setStatus('Unlocked.');
      return;
    }
    if (!tokenField) {
      throw new Error('Paste a GitHub token the first time you unlock this phone or laptop.');
    }
    if (!tokenField.startsWith('github_pat_') && !tokenField.startsWith('ghp_')) {
      throw new Error('That does not look like a GitHub token.');
    }
    await verifyToken(tokenField);
    writeVault(localStorage, await sealToken(password, tokenField));
    input('token').value = '';
    await afterUnlock(tokenField);
    setStatus('Saved a lock on this device. Next time you only need the password.');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not unlock.', 'err');
  }
}

function lock(forgetDevice = false) {
  state.token = null;
  state.user = null;
  state.openaiKey = null;
  state.rows = [];
  state.current = null;
  state.sha = '';
  state.photo = null;
  if (forgetDevice) {
    clearVault(localStorage);
    clearVault(localStorage, OPENAI_VAULT_KEY);
  }
  setHidden('app-panel', true);
  setHidden('login-panel', false);
  setHidden('token-wrap', !readVault(localStorage));
  input('password').value = '';
  input('token').value = '';
  setStatus(forgetDevice ? 'Forgotten on this device.' : 'Locked.');
}

function showMain(mode: DeskMode) {
  state.mode = mode;
  setHidden('queue-view', mode !== 'queue');
  setHidden('ideas-view', mode !== 'ideas');
  setHidden('composer-view', mode !== 'composer');
  setHidden('settings-view', mode !== 'settings');
  for (const id of ['nav-queue', 'nav-ideas', 'nav-settings']) {
    $(id).classList.toggle('active', id === `nav-${mode === 'composer' ? 'queue' : mode}`);
  }
}

async function refreshAll() {
  if (!state.token) return;
  setStatus('Loading the shared queue…', 'busy');
  try {
    const [posts, files] = await Promise.all([
      loadPostSummaries(state.token),
      listCampfireFiles(state.token),
    ]);
    state.ideas = ideasFor(new Date(), posts);
    const loaded = await Promise.all(
      files.map(async (file) => {
        const repo = await getFile(state.token as string, file.path);
        return { item: parseQueueItem(repo.content, file.slug), sha: repo.sha };
      }),
    );
    state.rows = loaded;
    renderQueue();
    renderIdeas();
    setStatus(`Ready. ${loaded.length} queued.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not load Campfire.', 'err');
  }
}

function uniqueSlug(base: string) {
  let slug = isValidSlug(base) ? base : slugFromTitle(base) || 'post';
  const taken = new Set(state.rows.map((row) => row.item.slug));
  if (state.current?.slug) taken.delete(state.current.slug);
  if (!taken.has(slug)) return slug;
  let n = 2;
  while (taken.has(`${slug}-${n}`)) n += 1;
  return `${slug}-${n}`;
}

function renderQueue() {
  const people = input('filter-people').value as 'all' | 'mine' | 'unclaimed';
  const status = input('filter-status').value as Status | '';
  const platform = input('filter-platform').value as Platform | '';
  const visible = sortQueue(
    filterQueue(
      state.rows.map((row) => row.item),
      { people, status, platform, login: login() },
    ),
  );
  const list = $('queue-list');
  list.replaceChildren();
  for (const item of visible) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'post-row';
    const title = document.createElement('strong');
    title.textContent = item.title || item.slug;
    const meta = document.createElement('span');
    const who = item.assignee ? `@${item.assignee}` : 'unclaimed';
    const editor = item.updatedBy ? ` · last ${item.updatedBy}` : '';
    meta.textContent = `${STATUS_LABELS[item.status]} · ${item.date} · ${who}${editor}`;
    button.append(title, meta);
    button.addEventListener('click', () => void openItem(item.slug));
    list.append(button);
  }
  $('queue-count').textContent = `${visible.length} in view`;
}

function renderIdeas() {
  const list = $('idea-list');
  list.replaceChildren();
  for (const idea of state.ideas) {
    const row = document.createElement('div');
    row.className = 'idea-row';
    const copy = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = idea.title;
    const why = document.createElement('p');
    why.className = 'idea-why';
    why.textContent = idea.why;
    const hook = document.createElement('p');
    hook.className = 'help';
    hook.textContent = idea.hook;
    const plats = document.createElement('p');
    plats.className = 'help';
    plats.textContent = idea.platforms.map((platform) => PLATFORM_LABELS[platform]).join(' · ');
    copy.append(title, why, hook, plats);
    const use = document.createElement('button');
    use.type = 'button';
    use.className = 'btn';
    use.textContent = 'Use this';
    use.addEventListener('click', () => void useIdea(idea));
    row.append(copy, use);
    list.append(row);
  }
}

function fillSelect(
  id: string,
  options: { value: string; label: string }[],
  includeEmpty?: { value: string; label: string },
) {
  const select = $(id) as HTMLSelectElement;
  select.replaceChildren();
  if (includeEmpty) {
    const option = document.createElement('option');
    option.value = includeEmpty.value;
    option.textContent = includeEmpty.label;
    select.append(option);
  }
  for (const item of options) {
    const option = document.createElement('option');
    option.value = item.value;
    option.textContent = item.label;
    select.append(option);
  }
}

function itemFromForm(): QueueItem {
  if (!state.current) throw new Error('Nothing to save.');
  const platforms = PLATFORMS.filter((platform) => (input(`platform-${platform}`) as HTMLInputElement).checked);
  return {
    ...state.current,
    title: input('item-title').value,
    slug: input('item-slug').value.trim(),
    date: input('item-date').value,
    status: input('item-status').value as Status,
    platforms,
    assignee: input('item-assignee').value,
    note: input('item-note').value,
    cardKind: input('card-kind').value as QueueItem['cardKind'],
    cardSize: input('card-size').value as QueueItem['cardSize'],
    cardLine: input('card-line').value,
    cardSub: input('card-sub').value,
    imagePrompt: input('image-prompt').value,
    copy: {
      blog: { blurb: input('copy-blog-blurb').value, link: input('copy-blog-link').value },
      instagram: {
        caption: input('copy-ig-caption').value,
        hashtags: input('copy-ig-hashtags').value,
        alt: input('copy-ig-alt').value,
        story: input('copy-ig-story').value,
      },
      facebook: { post: input('copy-fb-post').value, link: input('copy-fb-link').value },
      x: { thread: input('copy-x-thread').value },
      youtube: {
        title: input('copy-yt-title').value,
        description: input('copy-yt-description').value,
        tags: input('copy-yt-tags').value,
        script: input('copy-yt-script').value,
      },
    },
    updatedBy: login(),
    updatedAt: new Date().toISOString(),
  };
}

function fillComposer(item: QueueItem, existing: boolean) {
  input('item-title').value = item.title;
  input('item-slug').value = item.slug;
  (input('item-slug') as HTMLInputElement).disabled = existing;
  input('item-date').value = item.date;
  input('item-status').value = item.status;
  input('item-note').value = item.note;
  fillSelect(
    'item-assignee',
    peopleFromQueue(
      state.rows.map((row) => row.item),
      login(),
    ).map((name) => ({ value: name, label: `@${name}` })),
    { value: '', label: 'Unclaimed' },
  );
  input('item-assignee').value = item.assignee;
  for (const platform of PLATFORMS) {
    (input(`platform-${platform}`) as HTMLInputElement).checked = item.platforms.includes(platform);
  }
  input('copy-blog-blurb').value = item.copy.blog.blurb;
  input('copy-blog-link').value = item.copy.blog.link;
  input('copy-ig-caption').value = item.copy.instagram.caption;
  input('copy-ig-hashtags').value = item.copy.instagram.hashtags;
  input('copy-ig-alt').value = item.copy.instagram.alt;
  input('copy-ig-story').value = item.copy.instagram.story;
  input('copy-fb-post').value = item.copy.facebook.post;
  input('copy-fb-link').value = item.copy.facebook.link;
  input('copy-x-thread').value = item.copy.x.thread;
  input('copy-yt-title').value = item.copy.youtube.title;
  input('copy-yt-description').value = item.copy.youtube.description;
  input('copy-yt-tags').value = item.copy.youtube.tags;
  input('copy-yt-script').value = item.copy.youtube.script;
  input('card-kind').value = item.cardKind;
  input('card-size').value = item.cardSize;
  input('card-line').value = item.cardLine;
  input('card-sub').value = item.cardSub;
  input('image-prompt').value = item.imagePrompt;
  $('source-line').textContent = item.source
    ? `Source note: ${item.source.collection}/${item.source.slug}`
    : 'No source note. Generate from the title, or pick an idea.';
  setHidden('delete-item-btn', !existing);
  setHidden('rewrite-btn', !state.openaiKey);
  setHidden('openai-image-btn', !state.openaiKey);
  showPlatform(state.tab);
  void paintCurrentCard();
}

function showComposer(item: QueueItem, sha: string) {
  state.current = item;
  state.sha = sha;
  showMain('composer');
  fillComposer(item, Boolean(sha));
}

async function openItem(slug: string) {
  if (!state.token) return;
  setStatus('Opening…', 'busy');
  try {
    const file = await getFile(state.token, `src/content/campfire/${slug}.json`);
    const item = parseQueueItem(file.content, slug);
    const index = state.rows.findIndex((row) => row.item.slug === slug);
    if (index >= 0) state.rows[index] = { item, sha: file.sha };
    else state.rows.push({ item, sha: file.sha });
    showComposer(item, file.sha);
    setStatus(`Editing ${slug}. Last editor: ${item.updatedBy || 'unknown'}.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not open.', 'err');
  }
}

function startBlank() {
  const item = emptyQueueItem({
    slug: uniqueSlug('untitled'),
    title: '',
    createdBy: login(),
    assignee: login(),
    updatedBy: login(),
  });
  showComposer(item, '');
  setStatus('New queue item. Title first — the web address fills in.');
}

async function useIdea(idea: ContentIdea) {
  if (!state.token) return;
  setStatus('Building a draft…', 'busy');
  try {
    const baseSlug = idea.source?.slug || slugFromTitle(idea.title);
    let item = emptyQueueItem({
      slug: uniqueSlug(baseSlug),
      title: idea.title,
      createdBy: login(),
      assignee: login(),
      updatedBy: login(),
      status: 'draft',
      platforms: idea.platforms,
      source: idea.source,
      cardLine: idea.title,
      cardSub: idea.hook,
    });
    if (idea.source) {
      const file = await getFile(state.token, contentPath(idea.source.collection, idea.source.slug));
      const fields = parsePost(file.content);
      item = {
        ...item,
        title: fields.title,
        copy: draftFromFields(fields, idea.source.collection, idea.source.slug),
        imagePrompt: imagePromptFrom({
          title: fields.title,
          summary: fields.summary,
          tags: fields.tags,
          body: fields.body,
          heroAlt: fields.heroAlt,
          weekend: fields.weekend,
          source: idea.source,
        }),
        heroUrl: fields.hero,
        cardLine: fields.title,
        cardSub: fields.summary,
        cardKind: fields.weekend ? 'weekend' : 'title',
      };
    } else {
      item.copy = draftFromNote({
        title: idea.title,
        summary: idea.hook,
        tags: ['colorado', 'front range'],
        body: '',
      });
      item.imagePrompt = imagePromptFrom({
        title: idea.title,
        summary: idea.hook,
        tags: ['colorado'],
        body: '',
      });
    }
    showComposer(item, '');
    setStatus('Draft ready. Save it so the rest of the team can see it.');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not use that idea.', 'err');
  }
}

async function generateFromSource() {
  if (!state.token || !state.current?.source) {
    setStatus('This item has no source note to generate from.', 'err');
    return;
  }
  setStatus('Reading the note…', 'busy');
  try {
    const source = state.current.source;
    const file = await getFile(state.token, contentPath(source.collection, source.slug));
    const fields = parsePost(file.content);
    const next = itemFromForm();
    next.copy = draftFromFields(fields, source.collection, source.slug);
    next.imagePrompt = imagePromptFrom({
      title: fields.title,
      summary: fields.summary,
      tags: fields.tags,
      body: fields.body,
      heroAlt: fields.heroAlt,
      weekend: fields.weekend,
      source,
    });
    next.heroUrl = fields.hero;
    if (!next.cardLine) next.cardLine = fields.title;
    if (!next.cardSub) next.cardSub = fields.summary;
    next.title = next.title || fields.title;
    state.current = next;
    fillComposer(next, Boolean(state.sha));
    setStatus('Filled from the source note. Edit anything before you save.');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not read the note.', 'err');
  }
}

async function saveItem() {
  if (!state.token) return;
  try {
    const item = itemFromForm();
    if (!state.sha) item.slug = uniqueSlug(item.slug || slugFromTitle(item.title));
    item.createdBy = item.createdBy || login();
    const raw = serializeQueueItem(item);
    setStatus('Saving to GitHub…', 'busy');
    await saveCampfireFile(state.token, item.slug, raw, login(), state.sha || undefined);
    const file = await getFile(state.token, `src/content/campfire/${item.slug}.json`);
    state.current = parseQueueItem(file.content, item.slug);
    state.sha = file.sha;
    const index = state.rows.findIndex((row) => row.item.slug === item.slug);
    const row = { item: state.current, sha: file.sha };
    if (index >= 0) state.rows[index] = row;
    else state.rows.push(row);
    fillComposer(state.current, true);
    setStatus('Saved to the shared queue.');
  } catch (error) {
    if (isConflictError(error)) {
      setStatus('Someone else saved this. Reload before overwriting.', 'err');
      return;
    }
    setStatus(error instanceof Error ? error.message : 'Save failed.', 'err');
  }
}

async function removeItem() {
  if (!state.token || !state.current || !state.sha) return;
  if (!window.confirm(`Delete ${state.current.slug} from the shared queue?`)) return;
  try {
    setStatus('Deleting…', 'busy');
    await deleteCampfireFile(state.token, state.current.slug, state.sha, login());
    state.rows = state.rows.filter((row) => row.item.slug !== state.current?.slug);
    state.current = null;
    state.sha = '';
    showMain('queue');
    renderQueue();
    setStatus('Removed from the queue.');
  } catch (error) {
    if (isConflictError(error)) {
      setStatus('Someone else saved this. Reload before deleting.', 'err');
      return;
    }
    setStatus(error instanceof Error ? error.message : 'Delete failed.', 'err');
  }
}

function showPlatform(tab: Platform) {
  state.tab = tab;
  for (const platform of PLATFORMS) {
    $(`pane-${platform}`).classList.toggle('hidden', platform !== tab);
    $(`tab-${platform}`).classList.toggle('active', platform === tab);
  }
}

async function copyField(id: string) {
  const value = input(id).value;
  try {
    await navigator.clipboard.writeText(value);
    setStatus('Copied.');
  } catch {
    setStatus('Could not copy. Select the text and copy it yourself.', 'err');
  }
}

async function rewriteActive() {
  if (!state.openaiKey) {
    setStatus('Save an OpenAI key in Settings to rewrite.', 'err');
    return;
  }
  const fields: Record<Platform, { id: string; label: string }[]> = {
    blog: [{ id: 'copy-blog-blurb', label: 'blog blurb' }],
    instagram: [
      { id: 'copy-ig-caption', label: 'Instagram caption' },
      { id: 'copy-ig-story', label: 'Instagram story line' },
    ],
    facebook: [{ id: 'copy-fb-post', label: 'Facebook post' }],
    x: [{ id: 'copy-x-thread', label: 'X thread' }],
    youtube: [
      { id: 'copy-yt-title', label: 'YouTube title' },
      { id: 'copy-yt-script', label: 'YouTube script' },
    ],
  };
  setStatus('Rewriting in our voice…', 'busy');
  try {
    for (const field of fields[state.tab]) {
      const current = input(field.id).value.trim();
      if (!current) continue;
      input(field.id).value = await rewriteText(state.openaiKey, field.label, current);
    }
    setStatus('Rewritten. Read it before you save.');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Rewrite failed.', 'err');
  }
}

async function paintCurrentCard() {
  const canvas = $('card-canvas') as HTMLCanvasElement;
  const spec = cardSpecFromItem(
    state.current
      ? {
          ...state.current,
          cardKind: input('card-kind').value as QueueItem['cardKind'],
          cardSize: input('card-size').value as QueueItem['cardSize'],
          cardLine: input('card-line').value,
          cardSub: input('card-sub').value,
        }
      : emptyQueueItem({ slug: 'preview', createdBy: login(), title: input('item-title').value }),
  );
  spec.line = input('card-line').value || input('item-title').value;
  spec.sub = input('card-sub').value;
  const useHero = (input('use-hero') as HTMLInputElement).checked;
  const hero = state.current?.heroUrl || '';
  if (useHero && hero) {
    try {
      if (!state.photo || state.photo.src !== hero) state.photo = await loadPhoto(hero);
      spec.photo = state.photo;
    } catch {
      spec.photo = null;
    }
  } else {
    spec.photo = null;
  }
  paintCard(canvas, spec);
}

function downloadCard() {
  const canvas = $('card-canvas') as HTMLCanvasElement;
  const slug = input('item-slug').value || 'card';
  const size = input('card-size').value;
  downloadCanvas(canvas, `${slug}-${size}`);
}

async function openaiImage() {
  if (!state.openaiKey) {
    setStatus('Save an OpenAI key in Settings to make a photo.', 'err');
    return;
  }
  const prompt = input('image-prompt').value.trim();
  if (!prompt) {
    setStatus('Write an image prompt first.', 'err');
    return;
  }
  setStatus('Asking OpenAI for a still…', 'busy');
  try {
    const dataUrl = await generateImagePng(state.openaiKey, prompt);
    const image = new Image();
    image.src = dataUrl;
    await new Promise((resolve, reject) => {
      image.onload = () => resolve(null);
      image.onerror = () => reject(new Error('Could not read the generated image.'));
    });
    state.photo = image;
    (input('use-hero') as HTMLInputElement).checked = true;
    await paintCurrentCard();
    setStatus('Photo drawn on the card. Download it — it is not uploaded to GitHub.');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Image failed.', 'err');
  }
}

async function saveOpenAi() {
  if (!state.token) return;
  const key = input('openai-key').value.trim();
  if (!key) {
    setStatus('Paste a key, or clear it.', 'err');
    return;
  }
  try {
    writeVault(localStorage, await sealToken(state.token, key), OPENAI_VAULT_KEY);
    state.openaiKey = key;
    input('openai-key').value = '';
    setHidden('rewrite-btn', false);
    setHidden('openai-image-btn', false);
    setStatus('OpenAI key sealed on this device only.');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Could not save that key.', 'err');
  }
}

function clearOpenAi() {
  clearVault(localStorage, OPENAI_VAULT_KEY);
  state.openaiKey = null;
  input('openai-key').value = '';
  setHidden('rewrite-btn', true);
  setHidden('openai-image-btn', true);
  setStatus('OpenAI key forgotten on this device.');
}

function fillStaticSelects() {
  fillSelect(
    'filter-status',
    STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
    { value: '', label: 'Any status' },
  );
  fillSelect(
    'filter-platform',
    PLATFORMS.map((platform) => ({ value: platform, label: PLATFORM_LABELS[platform] })),
    { value: '', label: 'Any platform' },
  );
  fillSelect(
    'item-status',
    STATUSES.map((status) => ({ value: status, label: STATUS_LABELS[status] })),
  );
  fillSelect(
    'card-kind',
    CARD_KINDS.map((kind) => ({ value: kind, label: CARD_KIND_LABELS[kind] })),
  );
  fillSelect(
    'card-size',
    CARD_SIZES.map((size) => ({ value: size, label: CARD_SIZE_LABELS[size] })),
  );
}

export function boot() {
  fillStaticSelects();
  setHidden('token-wrap', Boolean(readVault(localStorage)));
  $('login-form').addEventListener('submit', (event) => void unlock(event));
  $('logout-btn').addEventListener('click', () => lock(false));
  $('forget-btn').addEventListener('click', () => lock(true));
  $('nav-queue').addEventListener('click', () => {
    showMain('queue');
    renderQueue();
  });
  $('nav-ideas').addEventListener('click', () => showMain('ideas'));
  $('nav-settings').addEventListener('click', () => showMain('settings'));
  $('refresh-btn').addEventListener('click', () => void refreshAll());
  $('new-item-btn').addEventListener('click', startBlank);
  $('filter-people').addEventListener('change', renderQueue);
  $('filter-status').addEventListener('change', renderQueue);
  $('filter-platform').addEventListener('change', renderQueue);
  $('back-queue-btn').addEventListener('click', () => {
    showMain('queue');
    renderQueue();
  });
  $('save-item-btn').addEventListener('click', () => void saveItem());
  $('delete-item-btn').addEventListener('click', () => void removeItem());
  $('generate-btn').addEventListener('click', () => void generateFromSource());
  $('assign-me-btn').addEventListener('click', () => {
    input('item-assignee').value = login();
  });
  $('rewrite-btn').addEventListener('click', () => void rewriteActive());
  $('download-card-btn').addEventListener('click', downloadCard);
  $('openai-image-btn').addEventListener('click', () => void openaiImage());
  $('save-openai-btn').addEventListener('click', () => void saveOpenAi());
  $('clear-openai-btn').addEventListener('click', clearOpenAi);
  $('copy-image-prompt-btn').addEventListener('click', () => void copyField('image-prompt'));
  for (const platform of PLATFORMS) {
    $(`tab-${platform}`).addEventListener('click', () => showPlatform(platform));
  }
  document.querySelectorAll<HTMLButtonElement>('[data-copy]').forEach((button) => {
    button.addEventListener('click', () => void copyField(button.dataset.copy ?? ''));
  });
  input('item-title').addEventListener('input', () => {
    if (!state.sha && !input('item-slug').dataset.manual) {
      input('item-slug').value = slugFromTitle(input('item-title').value);
    }
  });
  input('item-slug').addEventListener('input', () => {
    input('item-slug').dataset.manual = '1';
  });
  for (const id of ['card-kind', 'card-size', 'card-line', 'card-sub', 'use-hero']) {
    input(id).addEventListener('input', () => void paintCurrentCard());
    input(id).addEventListener('change', () => void paintCurrentCard());
  }
}
