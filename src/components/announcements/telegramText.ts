/**
 * What Telegram accepts, and how a message will look once it gets there.
 *
 * Telegram's two markup modes are MarkdownV2 and HTML. MarkdownV2 makes you
 * escape eighteen characters wherever they appear in ordinary prose, which is
 * hostile to text a human typed; HTML needs only &, < and > escaped. So the
 * composer speaks HTML, and the server sanitises it to Telegram's allowed tag
 * set before storing it (`backend/src/announcements/formatting.py`).
 */

/** Formatting tags rendered as themselves. Spoilers and links are special-cased. */
const SIMPLE_TAGS = ['b', 'i', 'u', 's', 'code', 'blockquote'];

/** Spoilers have no browser equivalent; they render blurred so the sender can
 *  see the extent of what will be hidden. */
const SPOILER_CLASS = 'rounded bg-muted-foreground/30 text-transparent';

/** Telegram's own limits, mirrored so the composer can enforce them live. */
export const TEXT_LIMIT = 4096;
export const CAPTION_LIMIT = 1024;
export const MAX_IMAGES = 10;

/** Tags the toolbar can produce. Kept in step with the server's allowlist in
 *  `backend/src/announcements/formatting.py`. */
export type MarkupTag = 'b' | 'i' | 'u' | 's' | 'code' | 'blockquote' | 'tg-spoiler';

/**
 * The message as a recipient reads it — tags removed, entities decoded.
 *
 * This is what Telegram's 4096/1024 caps apply to: the limits are enforced on
 * the message AFTER entity parsing, so `<b>hi</b>` is two characters. A counter
 * that measured the raw string would refuse text that comfortably fits.
 */
export function visibleText(body: string): string {
  const withoutTags = body
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '');
  const el = document.createElement('textarea');
  el.innerHTML = withoutTags;
  return el.value;
}

export function visibleLength(body: string): number {
  return visibleText(body).length;
}

/**
 * Render a body for the preview pane.
 *
 * Escapes everything first, then re-enables only the known tags. The content is
 * written by an admin in their own browser, but escape-then-allow is the only
 * version of this that stays correct when someone pastes markup from elsewhere.
 */
export function renderPreviewHtml(body: string): string {
  const escaped = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  let out = escaped;
  for (const tag of SIMPLE_TAGS) {
    out = out
      .replace(new RegExp(`&lt;${tag}&gt;`, 'gi'), `<${tag}>`)
      .replace(new RegExp(`&lt;/${tag}&gt;`, 'gi'), `</${tag}>`);
  }
  // Spoilers have no browser equivalent; show them blurred so the sender can
  // see the extent of what will be hidden.
  out = out
    .replace(/&lt;tg-spoiler&gt;/gi, `<span class="${SPOILER_CLASS}">`)
    .replace(/&lt;\/tg-spoiler&gt;/gi, '</span>');
  // Links: only http(s), matching the server's scheme allowlist.
  out = out.replace(
    /&lt;a href=&quot;(https?:\/\/[^&"]+)&quot;&gt;([\s\S]*?)&lt;\/a&gt;/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline">$2</a>',
  );
  out = out.replace(
    /&lt;a href="(https?:\/\/[^&"]+)"&gt;([\s\S]*?)&lt;\/a&gt;/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline">$2</a>',
  );
  return out.replace(/\n/g, '<br />');
}

/**
 * Render a body that came back FROM the server — the History list and the
 * delivery report.
 *
 * Not the same job as `renderPreviewHtml`. The composer holds raw text the
 * sender typed, where `5 < 10` is prose and `<script>` must show as literal
 * characters. A stored body has already been through the server's sanitiser,
 * so it is Telegram wire format: allowed tags only, with every literal `<` and
 * `&` escaped as an entity. Pushing that through the composer's
 * escape-then-allow renderer would double-escape it and show `&lt;` on screen.
 *
 * So this parses it as HTML and rebuilds only the allowed elements, which is
 * also the right shape for defence in depth: it does not assume the server got
 * it right. Anything unrecognised keeps its text and loses its tag.
 */
export function renderStoredBodyHtml(body: string): string {
  const parsed = new DOMParser().parseFromString(`<div>${body}</div>`, 'text/html');
  const root = parsed.body.firstElementChild;
  const out = document.createElement('div');
  if (!root) return '';

  const copy = (from: Node, into: Node) => {
    from.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        into.appendChild(document.createTextNode(node.textContent ?? ''));
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      const tag = el.tagName.toLowerCase();
      let next: HTMLElement | null = null;
      if (SIMPLE_TAGS.includes(tag)) {
        next = document.createElement(tag);
      } else if (tag === 'tg-spoiler') {
        next = document.createElement('span');
        next.className = SPOILER_CLASS;
      } else if (tag === 'a' && /^https?:\/\//i.test(el.getAttribute('href') ?? '')) {
        const link = document.createElement('a');
        link.href = el.getAttribute('href') ?? '';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'underline';
        next = link;
      }
      if (next) {
        into.appendChild(next);
        copy(el, next);
      } else {
        copy(el, into); // unknown element: keep its words, drop the tag
      }
    });
  };

  copy(root, out);
  return out.innerHTML.replace(/\n/g, '<br />');
}
