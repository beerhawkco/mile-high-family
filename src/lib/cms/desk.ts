import { deleteFile, getFile, listPosts, putBinaryFile, savePost, uploadPath, publicUploadUrl, verifyToken } from './github.ts';
import { parsePost, serializePost } from './mdx.ts';
import { AGE_OPTIONS, DESK_COLLECTIONS, DESK_LABELS, isDeskCollection, isValidSlug, slugFromTitle, type DeskCollection, type PostFields } from './schema.ts';
import { clearVault, readVault, sealToken, unsealToken, writeVault } from './vault.ts';

type DeskState = {
  token: string | null;
  collection: DeskCollection;
  slug: string;
  sha: string;
  mode: 'list' | 'edit' | 'new';
};

const state: DeskState = {
  token: null,
  collection: 'camping',
  slug: '',
  sha: '',
  mode: 'list',
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

function fieldsFromForm(): PostFields {
  return {
    title: input('title').value,
    summary: input('summary').value,
    date: input('date').value,
    tags: input('tags').value.split(',').map((tag) => tag.trim()).filter(Boolean),
    ages: input('ages').value as PostFields['ages'],
    hero: input('hero').value,
    heroAlt: input('heroAlt').value,
    heroCredit: input('heroCredit').value,
    featured: (input('featured') as HTMLInputElement).checked,
    weekend: (input('weekend') as HTMLInputElement).checked,
    body: input('body').value,
  };
}

function fillForm(fields: PostFields) {
  input('title').value = fields.title;
  input('summary').value = fields.summary;
  input('date').value = fields.date;
  input('tags').value = fields.tags.join(', ');
  input('ages').value = fields.ages;
  input('hero').value = fields.hero;
  input('heroAlt').value = fields.heroAlt;
  input('heroCredit').value = fields.heroCredit;
  (input('featured') as HTMLInputElement).checked = fields.featured;
  (input('weekend') as HTMLInputElement).checked = fields.weekend;
  input('body').value = fields.body;
  updatePreview();
}

function emptyFields(): PostFields {
  const today = new Date().toISOString().slice(0, 10);
  return {
    title: '',
    summary: '',
    date: today,
    tags: [],
    ages: 'all',
    hero: '',
    heroAlt: '',
    heroCredit: '',
    featured: false,
    weekend: false,
    body: '',
  };
}

function updatePreview() {
  const hero = input('hero').value.trim();
  const img = $('hero-preview') as HTMLImageElement;
  if (hero) {
    img.src = hero;
    img.classList.remove('hidden');
  } else {
    img.removeAttribute('src');
    img.classList.add('hidden');
  }
}

async function afterUnlock(token: string) {
  state.token = token;
  setHidden('login-panel', true);
  setHidden('app-panel', false);
  await refreshList();
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
  if (forgetDevice) clearVault(localStorage);
  setHidden('app-panel', true);
  setHidden('login-panel', false);
  setHidden('token-wrap', !readVault(localStorage));
  input('password').value = '';
  input('token').value = '';
  setStatus(forgetDevice ? 'Forgotten on this device.' : 'Locked.');
}

async function refreshList() {
  if (!state.token) return;
  setStatus('Loading notes…', 'busy');
  const posts = await listPosts(state.token);
  const filter = input('filter').value;
  const visible = filter ? posts.filter((post) => post.collection === filter) : posts;
  const list = $('post-list');
  list.replaceChildren();
  for (const post of visible) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'post-row';
    button.innerHTML = '';
    const label = document.createElement('strong');
    label.textContent = post.slug.replace(/-/g, ' ');
    const meta = document.createElement('span');
    meta.textContent = DESK_LABELS[post.collection] ?? post.collection;
    button.append(label, meta);
    button.addEventListener('click', () => openPost(post.collection, post.slug));
    list.append(button);
  }
  $('post-count').textContent = `${visible.length} notes`;
  setStatus('Ready.');
}

function showEditor(mode: 'edit' | 'new') {
  state.mode = mode;
  setHidden('list-view', true);
  setHidden('editor-view', false);
  $('editor-kicker').textContent = mode === 'new' ? 'New note' : 'Edit note';
  setHidden('delete-btn', mode === 'new');
  (input('collection') as HTMLSelectElement).disabled = mode === 'edit';
  (input('slug') as HTMLInputElement).disabled = mode === 'edit';
}

function showList() {
  state.mode = 'list';
  state.slug = '';
  state.sha = '';
  setHidden('editor-view', true);
  setHidden('list-view', false);
}

async function openPost(collection: DeskCollection, slug: string) {
  if (!state.token) return;
  setStatus('Opening…', 'busy');
  const file = await getFile(state.token, `src/content/${collection}/${slug}.mdx`);
  state.collection = collection;
  state.slug = slug;
  state.sha = file.sha;
  input('collection').value = collection;
  input('slug').value = slug;
  fillForm(parsePost(file.content));
  showEditor('edit');
  setStatus(`Editing ${collection}/${slug}.`);
}

function startNew() {
  state.sha = '';
  state.slug = '';
  const fromFilter = input('filter').value;
  state.collection = isDeskCollection(fromFilter) ? fromFilter : 'camping';
  input('collection').value = state.collection;
  input('slug').value = '';
  fillForm(emptyFields());
  showEditor('new');
  setStatus('New note. Title first — the web address fills in.');
}

async function save() {
  if (!state.token) return;
  const collection = input('collection').value;
  if (!isDeskCollection(collection)) throw new Error('Pick a section.');
  let slug = input('slug').value.trim() || slugFromTitle(input('title').value);
  input('slug').value = slug;
  if (!isValidSlug(slug)) {
    setStatus('The web address can only use lowercase letters, numbers, and hyphens.', 'err');
    return;
  }
  try {
    const raw = serializePost(fieldsFromForm());
    setStatus('Saving to GitHub…', 'busy');
    await savePost(state.token, collection, slug, raw, state.mode === 'edit' ? state.sha : undefined);
    state.collection = collection;
    state.slug = slug;
    const file = await getFile(state.token, `src/content/${collection}/${slug}.mdx`);
    state.sha = file.sha;
    state.mode = 'edit';
    (input('collection') as HTMLSelectElement).disabled = true;
    (input('slug') as HTMLInputElement).disabled = true;
    setHidden('delete-btn', false);
    setStatus('Saved. Cloudflare usually republishes in a minute or two.');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Save failed.', 'err');
  }
}

async function removePost() {
  if (!state.token || state.mode !== 'edit') return;
  if (!window.confirm(`Delete ${state.collection}/${state.slug}? This goes live after the next rebuild.`)) return;
  try {
    setStatus('Deleting…', 'busy');
    await deleteFile(
      state.token,
      `src/content/${state.collection}/${state.slug}.mdx`,
      state.sha,
      `Desk: remove ${state.collection}/${state.slug}`,
    );
    showList();
    await refreshList();
    setStatus('Deleted. The public page will drop off after Cloudflare rebuilds.');
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Delete failed.', 'err');
  }
}

async function uploadPhoto(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  (event.target as HTMLInputElement).value = '';
  if (!file || !state.token) return;
  if (!file.type.startsWith('image/')) {
    setStatus('That file is not an image.', 'err');
    return;
  }
  if (file.size > 2_000_000) {
    setStatus('Keep photos under 2 MB so GitHub stays happy.', 'err');
    return;
  }
  try {
    setStatus('Uploading photo…', 'busy');
    const bytes = new Uint8Array(await file.arrayBuffer());
    const path = uploadPath(file.name);
    await putBinaryFile(state.token, path, bytes, `Desk: upload ${path}`);
    const url = publicUploadUrl(path);
    input('hero').value = url;
    if (!input('heroAlt').value) input('heroAlt').value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    updatePreview();
    setStatus(`Photo saved. After the rebuild it will load from ${url}`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : 'Upload failed.', 'err');
  }
}

function fillCollectionSelect(id: string, includeAll = false) {
  const select = $(id) as HTMLSelectElement;
  select.replaceChildren();
  if (includeAll) {
    const all = document.createElement('option');
    all.value = '';
    all.textContent = 'All sections';
    select.append(all);
  }
  for (const key of DESK_COLLECTIONS) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = DESK_LABELS[key];
    select.append(option);
  }
}

export function boot() {
  fillCollectionSelect('collection');
  fillCollectionSelect('filter', true);
  const ages = input('ages') as HTMLSelectElement;
  ages.replaceChildren();
  for (const age of AGE_OPTIONS) {
    const option = document.createElement('option');
    option.value = age;
    option.textContent = age === 'all' ? 'All ages' : age;
    ages.append(option);
  }

  setHidden('token-wrap', Boolean(readVault(localStorage)));
  $('login-form').addEventListener('submit', (event) => void unlock(event));
  $('logout-btn').addEventListener('click', () => lock(false));
  $('forget-btn').addEventListener('click', () => lock(true));
  input('filter').addEventListener('change', () => void refreshList());
  $('new-btn').addEventListener('click', startNew);
  $('back-btn').addEventListener('click', () => {
    showList();
    void refreshList();
  });
  $('save-btn').addEventListener('click', () => void save());
  $('delete-btn').addEventListener('click', () => void removePost());
  $('photo-file').addEventListener('change', (event) => void uploadPhoto(event));
  input('hero').addEventListener('input', updatePreview);
  input('title').addEventListener('input', () => {
    if (state.mode === 'new' && !input('slug').dataset.manual) {
      input('slug').value = slugFromTitle(input('title').value);
    }
  });
  input('slug').addEventListener('input', () => {
    input('slug').dataset.manual = '1';
  });
}
