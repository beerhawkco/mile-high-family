import type { CardKind, CardSize, QueueItem } from './queue.ts';

export const CARD_PIXELS: Record<CardSize, readonly [number, number]> = {
  feed: [1080, 1080],
  story: [1080, 1920],
  thumb: [1280, 720],
  landscape: [1600, 900],
};

export type CardSpec = {
  kind: CardKind;
  size: CardSize;
  line: string;
  sub: string;
  photo?: CanvasImageSource | null;
};

const NAVY = '#1b1638';
const SUN = '#f0a01a';
const CORAL = '#e87820';
const CREAM = '#f3e6c8';

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }
  if (current) lines.push(current);
  if (lines.length === maxLines) {
    const used = lines.join(' ').split(' ').filter(Boolean).length;
    if (used < words.length) {
      let last = lines[maxLines - 1];
      while (last.length && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1).trimEnd();
      lines[maxLines - 1] = `${last}…`;
    }
  }
  return lines;
}

function coverPhoto(
  ctx: CanvasRenderingContext2D,
  photo: CanvasImageSource,
  width: number,
  height: number,
) {
  const source = photo as { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number };
  const pw = Number(source.naturalWidth ?? source.width ?? width);
  const ph = Number(source.naturalHeight ?? source.height ?? height);
  if (!pw || !ph) return;
  const scale = Math.max(width / pw, height / ph);
  const dw = pw * scale;
  const dh = ph * scale;
  ctx.drawImage(photo, (width - dw) / 2, (height - dh) / 2, dw, dh);
}

function sun(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  const glow = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
  glow.addColorStop(0, '#ffc44a');
  glow.addColorStop(1, CORAL);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function ridge(ctx: CanvasRenderingContext2D, width: number, height: number, color: string) {
  const y = height * 0.72;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(8, width * 0.012);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(width * 0.06, y + height * 0.12);
  ctx.lineTo(width * 0.24, y - height * 0.08);
  ctx.lineTo(width * 0.4, y + height * 0.04);
  ctx.lineTo(width * 0.58, height * 0.52);
  ctx.lineTo(width * 0.74, y);
  ctx.lineTo(width * 0.94, y + height * 0.12);
  ctx.stroke();
}

export function sizeCanvas(canvas: HTMLCanvasElement, size: CardSize) {
  const [width, height] = CARD_PIXELS[size];
  canvas.width = width;
  canvas.height = height;
  return { width, height };
}

export function paintCard(canvas: HTMLCanvasElement, spec: CardSpec) {
  const { width, height } = sizeCanvas(canvas, spec.size);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser cannot draw the card.');

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, width, height);
  if (spec.photo) {
    try {
      coverPhoto(ctx, spec.photo, width, height);
      ctx.fillStyle = 'rgba(20, 16, 42, 0.58)';
      ctx.fillRect(0, 0, width, height);
    } catch {
      ctx.fillStyle = NAVY;
      ctx.fillRect(0, 0, width, height);
    }
  }

  sun(ctx, width * 0.78, height * (spec.size === 'story' ? 0.16 : 0.18), Math.min(width, height) * 0.08);
  ridge(ctx, width, height, spec.photo ? 'rgba(243,230,200,0.85)' : SUN);

  const pad = width * 0.08;
  ctx.fillStyle = SUN;
  ctx.font = `800 ${Math.round(width * 0.028)}px Outfit, ui-rounded, sans-serif`;
  ctx.textBaseline = 'top';
  ctx.fillText('MILE HIGH FAMILY', pad, height * 0.08);

  ctx.fillStyle = CREAM;
  ctx.font = `800 ${Math.round(width * 0.018)}px Figtree, ui-sans-serif, sans-serif`;
  ctx.fillText('COLORADO ADVENTURES', pad, height * 0.08 + Math.round(width * 0.04));

  const headline =
    spec.kind === 'weekend' ? spec.line || 'This weekend' : spec.kind === 'effort' ? spec.line || 'Effort, for real' : spec.line;
  const maxWidth = width - pad * 2;
  const titleSize = spec.size === 'story' ? 0.092 : spec.size === 'feed' ? 0.078 : 0.064;
  ctx.fillStyle = CREAM;
  ctx.font = `800 ${Math.round(width * titleSize)}px Outfit, ui-rounded, sans-serif`;
  const titleLines = wrapLines(ctx, headline || 'Untitled', maxWidth, spec.size === 'story' ? 6 : 4);
  let y = height * (spec.size === 'story' ? 0.28 : 0.32);
  const gap = Math.round(width * titleSize * 1.12);
  for (const line of titleLines) {
    ctx.fillText(line, pad, y);
    y += gap;
  }

  if (spec.kind === 'quote') {
    ctx.fillStyle = CORAL;
    ctx.font = `800 ${Math.round(width * 0.14)}px Outfit, ui-rounded, sans-serif`;
    ctx.fillText('“', pad, height * 0.2);
  }

  ctx.fillStyle = SUN;
  ctx.font = `700 ${Math.round(width * 0.032)}px Figtree, ui-sans-serif, sans-serif`;
  const subLines = wrapLines(ctx, spec.sub, maxWidth, spec.size === 'story' ? 5 : 3);
  y += Math.round(width * 0.03);
  for (const line of subLines) {
    ctx.fillText(line, pad, y);
    y += Math.round(width * 0.042);
  }

  ctx.fillStyle = CORAL;
  ctx.font = `800 ${Math.round(width * 0.024)}px Outfit, ui-rounded, sans-serif`;
  const footer = spec.kind === 'effort' ? 'HONEST ABOUT THE WALK' : spec.kind === 'weekend' ? 'THIS WEEKEND' : 'MILEHIGHFAMILY.COM';
  ctx.fillText(footer, pad, height - pad - Math.round(width * 0.02));
}

export function cardSpecFromItem(item: QueueItem): CardSpec {
  return {
    kind: item.cardKind,
    size: item.cardSize,
    line: item.cardLine || item.title,
    sub: item.cardSub || item.copy.blog.blurb || item.copy.instagram.story,
  };
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const href = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = href;
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.click();
}

export function loadPhoto(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Could not load that photo for the card.'));
    image.src = url;
  });
}
