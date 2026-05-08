/**
 * Parse API.Bible-style HTML for USX-ish <span class="wj"> (Words of Jesus / Words of Christ).
 * Returns null when no wj markup is present so callers can fall back to other strategies.
 */

import type { ChristWordSegment } from '@/lib/bible-red-letter';

function decodeMinimalEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(Number.parseInt(h, 16)))
    .replace(/\s+/g, ' ')
    .trim();
}

function classHasWJ(attrsRaw: string): boolean {
  const m = attrsRaw.match(/\bclass\s*=\s*["']([^"']*)["']/i);
  return Boolean(m && /\bwj\b/i.test(m[1]));
}

function mergeAdjacentSameChrist(segments: ChristWordSegment[]): ChristWordSegment[] {
  const out: ChristWordSegment[] = [];
  for (const seg of segments) {
    const t = decodeMinimalEntities(seg.text);
    if (!t) continue;
    const prev = out[out.length - 1];
    if (prev && prev.wordsOfChrist === seg.wordsOfChrist) prev.text += ` ${t}`;
    else out.push({ text: t, wordsOfChrist: seg.wordsOfChrist });
  }
  return out;
}

/** Extract attribute string from full "<span attrs>" inner (without brackets). */
function spanAttributes(innerStart: string): string {
  const s = innerStart.trimStart();
  if (!s.toLowerCase().startsWith('span')) return '';
  return s.slice(4).trim();
}

/**
 * Handles flat/nested spans; ignores non-span tags for stack purposes.
 */
export function christSegmentsFromApiBibleHtml(html: string): ChristWordSegment[] | null {
  const input = html.replace(/<br\s*\/?>/gi, ' ');

  const stack: boolean[] = [false];
  let sawExplicitWJ = false;
  const fragments: ChristWordSegment[] = [];

  let i = 0;
  while (i < input.length) {
    if (input[i] !== '<') {
      const lt = input.indexOf('<', i + 1);
      const chunk = input.slice(i, lt === -1 ? input.length : lt);
      if (chunk) {
        const christ = Boolean(stack[stack.length - 1]);
        fragments.push({ text: chunk, wordsOfChrist: christ });
      }
      i = lt === -1 ? input.length : lt;
      continue;
    }

    const gt = input.indexOf('>', i + 1);
    if (gt === -1) break;

    const innerRaw = input.slice(i + 1, gt).trim();
    i = gt + 1;

    if (innerRaw.startsWith('!--')) continue;

    const closing = innerRaw.startsWith('/');
    const rest = closing ? innerRaw.slice(1).trim() : innerRaw;
    const tagNameMatch = /^([\w:-]+)/i.exec(rest);
    const tagName = tagNameMatch?.[1]?.toLowerCase() ?? '';

    if (tagName !== 'span') continue;

    if (closing) {
      if (stack.length > 1) stack.pop();
      continue;
    }

    const attrs = spanAttributes(innerRaw);
    const explicitWJ = classHasWJ(attrs);
    if (explicitWJ) sawExplicitWJ = true;
    const parent = Boolean(stack[stack.length - 1]);
    stack.push(parent || explicitWJ);
  }

  if (!sawExplicitWJ) return null;
  const merged = mergeAdjacentSameChrist(fragments);
  return merged.some((m) => m.wordsOfChrist) ? merged : null;
}
