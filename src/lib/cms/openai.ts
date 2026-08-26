import { VOICE_RULES } from './scripts.ts';

const CHAT = 'https://api.openai.com/v1/chat/completions';
const IMAGES = 'https://api.openai.com/v1/images/generations';

async function openai<T>(apiKey: string, url: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      'OpenAI blocked the browser call. Copy the prompt and paste it into ChatGPT instead.',
    );
  }
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) {
    const message =
      typeof data === 'object' && data && 'error' in data
        ? String((data as { error?: { message?: string } }).error?.message ?? `OpenAI ${response.status}`)
        : `OpenAI ${response.status}`;
    throw new Error(message);
  }
  return data as T;
}

export function rewritePrompt(label: string, text: string) {
  return [
    `Rewrite this Mile High Family ${label} in the site voice.`,
    VOICE_RULES,
    'Keep facts. Do not invent reservations, prices, or kid names. Return only the rewritten text.',
    '',
    text,
  ].join('\n');
}

export async function rewriteText(apiKey: string, label: string, text: string) {
  const data = await openai<{ choices?: { message?: { content?: string } }[] }>(apiKey, CHAT, {
    model: 'gpt-4o-mini',
    temperature: 0.5,
    messages: [
      { role: 'system', content: `You write Mile High Family social copy. ${VOICE_RULES}` },
      { role: 'user', content: rewritePrompt(label, text) },
    ],
  });
  const out = data.choices?.[0]?.message?.content?.trim();
  if (!out) throw new Error('OpenAI did not return any text.');
  return out;
}

export async function generateImagePng(apiKey: string, prompt: string) {
  const data = await openai<{ data?: { b64_json?: string }[] }>(apiKey, IMAGES, {
    model: 'gpt-image-1',
    prompt,
    size: '1024x1024',
    n: 1,
  });
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI did not return an image.');
  return `data:image/png;base64,${b64}`;
}
