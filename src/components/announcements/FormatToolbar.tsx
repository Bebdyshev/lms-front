import { Bold, Code, EyeOff, Italic, Link2, Quote, Strikethrough, Underline } from 'lucide-react';
import { toast } from '../Toast';
import type { MarkupTag } from './telegramText';

/**
 * Telegram's markup, inserted as literal tags into a plain textarea.
 *
 * A WYSIWYG editor would have to map a contentEditable DOM back onto Telegram's
 * narrow tag set, and every mismatch becomes a message that renders differently
 * from the preview. Showing the tags is honest instead: what is in the box is
 * exactly what the server stores and what Telegram parses. The preview pane
 * below covers the readability cost.
 */
const FORMAT_ACTIONS: {
  tag: MarkupTag;
  label: string;
  icon: typeof Bold;
  shortcut?: string;
}[] = [
  { tag: 'b', label: 'Bold', icon: Bold, shortcut: '⌘B' },
  { tag: 'i', label: 'Italic', icon: Italic, shortcut: '⌘I' },
  { tag: 'u', label: 'Underline', icon: Underline, shortcut: '⌘U' },
  { tag: 's', label: 'Strikethrough', icon: Strikethrough },
  { tag: 'code', label: 'Monospace', icon: Code },
  { tag: 'blockquote', label: 'Quote', icon: Quote },
  { tag: 'tg-spoiler', label: 'Spoiler', icon: EyeOff },
];

/**
 * Wrap the textarea's selection in `open`/`close`, or drop an empty pair at the
 * caret. The toolbar and the keyboard shortcuts both go through this, so a
 * button and its shortcut can never behave differently.
 */
export function wrapSelection(
  el: HTMLTextAreaElement | null,
  value: string,
  open: string,
  close: string,
  onChange: (next: string) => void,
) {
  if (!el) return;
  const start = el.selectionStart ?? value.length;
  const end = el.selectionEnd ?? start;
  const selected = value.slice(start, end);
  onChange(value.slice(0, start) + open + selected + close + value.slice(end));
  // Restore a sensible caret once React re-renders: keep the selection if there
  // was one, otherwise land between the tags ready to type.
  requestAnimationFrame(() => {
    el.focus();
    const caret = start + open.length;
    el.setSelectionRange(caret, caret + selected.length);
  });
}

/** Ask for a URL and wrap the selection in a link to it. */
export function insertLink(
  el: HTMLTextAreaElement | null,
  value: string,
  onChange: (next: string) => void,
) {
  const hasSelection = !!el && (el.selectionEnd ?? 0) > (el.selectionStart ?? 0);
  const url = window.prompt('Link URL', 'https://');
  if (!url) return;
  // The server only keeps http(s) links; refusing here beats a link that
  // silently disappears between the preview and the chat.
  if (!/^https?:\/\//i.test(url)) {
    toast('Only http:// and https:// links can be sent', 'error');
    return;
  }
  wrapSelection(el, value, `<a href="${url}">`, '</a>', onChange);
  if (!hasSelection) toast('Type the link text between the tags', 'info');
}

interface FormatToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (next: string) => void;
}

export function FormatToolbar({ textareaRef, value, onChange }: FormatToolbarProps) {
  const buttonClass =
    'rounded p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground';
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-muted/40 p-1">
      {FORMAT_ACTIONS.map(({ tag, label, icon: Icon, shortcut }) => (
        <button
          key={tag}
          type="button"
          onClick={() => wrapSelection(textareaRef.current, value, `<${tag}>`, `</${tag}>`, onChange)}
          title={shortcut ? `${label} (${shortcut})` : label}
          aria-label={label}
          className={buttonClass}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
      <button
        type="button"
        onClick={() => insertLink(textareaRef.current, value, onChange)}
        title="Link (⌘K)"
        aria-label="Link"
        className={buttonClass}
      >
        <Link2 className="h-4 w-4" />
      </button>
      <span className="ml-auto pr-1 text-[11px] text-muted-foreground">Telegram formatting</span>
    </div>
  );
}
