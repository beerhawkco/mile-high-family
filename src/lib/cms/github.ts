import { CMS_BRANCH, CMS_REPO, contentPath, type DeskCollection } from './schema.ts';

const API = 'https://api.github.com';

export type RepoFile = {
  path: string;
  sha: string;
  content: string;
};

export type PostIndexItem = {
  collection: DeskCollection;
  slug: string;
  path: string;
};

async function github<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/vnd.github+json');
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('X-GitHub-Api-Version', '2022-11-28');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API}${path}`, { ...init, headers });
  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  if (!response.ok) {
    const message =
      typeof body === 'object' && body && 'message' in body
        ? String((body as { message: string }).message)
        : `GitHub ${response.status}`;
    throw new Error(message);
  }
  return body as T;
}

function bytesToB64(bytes: Uint8Array) {
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

export async function verifyToken(token: string) {
  const repo = await github<{ permissions?: { push?: boolean; maintain?: boolean; admin?: boolean } }>(
    token,
    `/repos/${CMS_REPO}`,
  );
  const perms = repo.permissions;
  if (perms && !perms.push && !perms.maintain && !perms.admin) {
    throw new Error('This token can read the repo but cannot save changes. Give it Contents: Read and write.');
  }
}

type TreeItem = { path: string; type: string };

export async function listPosts(token: string): Promise<PostIndexItem[]> {
  const tree = await github<{ tree: TreeItem[] }>(
    token,
    `/repos/${CMS_REPO}/git/trees/${CMS_BRANCH}?recursive=1`,
  );
  return tree.tree
    .filter((item) => item.type === 'blob' && /^src\/content\/[^/]+\/[^/]+\.mdx$/.test(item.path))
    .map((item) => {
      const [, , collection, file] = item.path.split('/');
      return {
        collection: collection as DeskCollection,
        slug: file.replace(/\.mdx$/, ''),
        path: item.path,
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

export async function getFile(token: string, path: string): Promise<RepoFile> {
  const file = await github<{ sha: string; content: string; encoding: string }>(
    token,
    `/repos/${CMS_REPO}/contents/${encodeURI(path)}?ref=${CMS_BRANCH}`,
  );
  const decoded =
    file.encoding === 'base64'
      ? new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\n/g, '')), (c) => c.charCodeAt(0)))
      : file.content;
  return { path, sha: file.sha, content: decoded };
}

export async function putFile(
  token: string,
  path: string,
  content: string,
  message: string,
  sha?: string,
) {
  const encoded = bytesToB64(new TextEncoder().encode(content));
  await github(`/repos/${CMS_REPO}/contents/${encodeURI(path)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: encoded,
      branch: CMS_BRANCH,
      sha,
    }),
  });
}

export async function putBinaryFile(
  token: string,
  path: string,
  bytes: Uint8Array,
  message: string,
  sha?: string,
) {
  await github(`/repos/${CMS_REPO}/contents/${encodeURI(path)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: bytesToB64(bytes),
      branch: CMS_BRANCH,
      sha,
    }),
  });
}

export async function deleteFile(token: string, path: string, sha: string, message: string) {
  await github(`/repos/${CMS_REPO}/contents/${encodeURI(path)}`, {
    method: 'DELETE',
    body: JSON.stringify({
      message,
      branch: CMS_BRANCH,
      sha,
    }),
  });
}

export async function savePost(
  token: string,
  collection: DeskCollection,
  slug: string,
  raw: string,
  sha?: string,
) {
  const path = contentPath(collection, slug);
  await putFile(token, path, raw, sha ? `Desk: update ${collection}/${slug}` : `Desk: add ${collection}/${slug}`, sha);
}

export function uploadPath(filename: string) {
  const year = new Date().getUTCFullYear();
  const safe = filename
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return `public/uploads/${year}/${safe}`;
}

export function publicUploadUrl(repoPath: string) {
  return `/${repoPath.replace(/^public\//, '')}`;
}
