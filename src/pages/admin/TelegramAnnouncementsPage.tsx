import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bold,
  Check,
  ChevronLeft,
  Code,
  EyeOff,
  ImagePlus,
  Italic,
  Link2,
  Loader2,
  Megaphone,
  Pin,
  Quote,
  RefreshCw,
  Search,
  Send,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Checkbox } from '../../components/ui/checkbox';
import { Textarea } from '../../components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { toast } from '../../components/Toast';
import { PROGRAM_BADGE_STYLES } from '../../lib/groupPicker';
import {
  CAPTION_LIMIT,
  MAX_IMAGES,
  PROGRAM_CHIP_LABELS,
  PROGRAM_ORDER,
  TEXT_LIMIT,
  detectPrograms,
  renderPreviewHtml,
  visibleLength,
  visibleText,
  cancelAnnouncement,
  createAnnouncement,
  getAnnouncement,
  getAnnouncements,
  getGroups,
  getRecipientSummary,
  recallAnnouncement,
  setGroupStatus,
  testSendPreview,
} from '../../services/api/announcements';
import type {
  Announcement,
  AnnouncementDetail,
  AnnouncementStatus,
  MarkupTag,
  ProgramKey,
  RecipientSummary,
  TelegramGroup,
} from '../../services/api/announcements';

type Tab = 'compose' | 'history' | 'groups';

const TABS: { key: Tab; label: string }[] = [
  { key: 'compose', label: 'Compose' },
  { key: 'history', label: 'History' },
  { key: 'groups', label: 'Groups' },
];

/**
 * Telegram delete-for-all is only available to a bot for about 48 hours. Past
 * that a recall still runs, but every chat rejects it — so the button is hidden
 * rather than offering something that cannot work.
 */
const RECALL_WINDOW_MS = 48 * 60 * 60 * 1000;

const STATUS_STYLES: Record<AnnouncementStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  scheduled: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300',
  sending: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  sent: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  partially_failed: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300',
  canceled: 'bg-muted text-muted-foreground',
  recalled: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
};

const STATUS_LABELS: Record<AnnouncementStatus, string> = {
  draft: 'Draft',
  scheduled: 'Scheduled',
  sending: 'Sending',
  sent: 'Sent',
  partially_failed: 'Partly failed',
  canceled: 'Canceled',
  recalled: 'Recalled',
};

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export default function TelegramAnnouncementsPage() {
  const [tab, setTab] = useState<Tab>('compose');

  // Shared across tabs: the composer needs the approved groups as targets, and
  // the Groups tab manages the same list.
  const [groups, setGroups] = useState<TelegramGroup[]>([]);
  const [summary, setSummary] = useState<RecipientSummary | null>(null);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const loadGroups = useCallback(async () => {
    try {
      const [groupRows, counts] = await Promise.all([getGroups(), getRecipientSummary()]);
      setGroups(groupRows);
      setSummary(counts);
    } catch (error) {
      toast(errorMessage(error, 'Failed to load Telegram groups'), 'error');
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const approvedGroups = useMemo(
    () => groups.filter((group) => group.status === 'approved' && group.is_active),
    [groups],
  );
  const pendingGroups = useMemo(
    () => groups.filter((group) => group.status === 'pending'),
    [groups],
  );

  return (
    <div className="max-w-[90rem] mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            Telegram Announcements
          </h1>
          <p className="text-sm text-muted-foreground">
            Broadcast to the groups the support bot belongs to, and to students who linked their
            Telegram account.
          </p>
        </div>
        <Button variant="outline" onClick={loadGroups} disabled={loadingGroups}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingGroups ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {pendingGroups.length > 0 && tab !== 'groups' && (
        <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {pendingGroups.length} group{pendingGroups.length > 1 ? 's are' : ' is'} waiting for
            approval and cannot receive announcements yet.
          </span>
          <Button variant="ghost" size="sm" onClick={() => setTab('groups')}>
            Review
          </Button>
        </div>
      )}

      <div className="flex gap-2 border-b border-border">
        {TABS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTab(entry.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === entry.key
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {entry.label}
            {entry.key === 'groups' && pendingGroups.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-500 px-1.5 text-[11px] font-semibold text-white">
                {pendingGroups.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'compose' && (
        <ComposeTab
          approvedGroups={approvedGroups}
          summary={summary}
          onSent={() => setTab('history')}
        />
      )}
      {tab === 'history' && <HistoryTab />}
      {tab === 'groups' && (
        <GroupsTab groups={groups} loading={loadingGroups} onChanged={loadGroups} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formatting toolbar
// ---------------------------------------------------------------------------

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

interface FormatToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (next: string) => void;
}

function FormatToolbar({ textareaRef, value, onChange }: FormatToolbarProps) {
  /** Wrap the current selection, or drop an empty pair at the caret. */
  const wrap = (open: string, close: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? start;
    const selected = value.slice(start, end);
    const next = value.slice(0, start) + open + selected + close + value.slice(end);
    onChange(next);
    // Restore a sensible caret after React re-renders: keep the selection if
    // there was one, otherwise land between the tags ready to type.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + open.length;
      el.setSelectionRange(caret, caret + selected.length);
    });
  };

  const applyTag = (tag: MarkupTag) => wrap(`<${tag}>`, `</${tag}>`);

  const applyLink = () => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? start;
    const selected = value.slice(start, end);
    const url = window.prompt('Link URL', 'https://');
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      toast('Only http:// and https:// links can be sent', 'error');
      return;
    }
    wrap(`<a href="${url}">`, '</a>');
    if (!selected) {
      toast('Type the link text between the tags', 'info');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-md border border-border bg-muted/40 p-1">
      {FORMAT_ACTIONS.map(({ tag, label, icon: Icon, shortcut }) => (
        <button
          key={tag}
          type="button"
          onClick={() => applyTag(tag)}
          title={shortcut ? `${label} (${shortcut})` : label}
          aria-label={label}
          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
      <button
        type="button"
        onClick={applyLink}
        title="Link (⌘K)"
        aria-label="Link"
        className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
      >
        <Link2 className="h-4 w-4" />
      </button>
      <span className="ml-auto pr-1 text-[11px] text-muted-foreground">Telegram formatting</span>
    </div>
  );
}

/** A program filter, or the "no program in the name" bucket. */
type ProgramFilterKey = ProgramKey | 'other';

interface FilterChipProps {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  /** Colour when active; defaults to the primary colour. Program chips pass the
   *  LMS's own program badge colours so SAT reads blue here as everywhere else. */
  activeClassName?: string;
}

function FilterChip({ label, count, active, onClick, activeClassName }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      // An empty chip is a dead end — but never disable an ACTIVE one, or a
      // search that empties it would leave it stuck on with no way to turn it off.
      disabled={count === 0 && !active}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? `border-current ${activeClassName ?? 'bg-primary text-primary-foreground'}`
          : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Compose
// ---------------------------------------------------------------------------

interface ComposeTabProps {
  approvedGroups: TelegramGroup[];
  summary: RecipientSummary | null;
  onSent: () => void;
}

function ComposeTab({ approvedGroups, summary, onSent }: ComposeTabProps) {
  const [body, setBody] = useState('');
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [images, setImages] = useState<File[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<number>>(new Set());
  const [allStudents, setAllStudents] = useState(false);
  const [pin, setPin] = useState(false);
  const [silent, setSilent] = useState(false);
  const [scheduledFor, setScheduledFor] = useState('');
  const [testChatId, setTestChatId] = useState('');
  const [testing, setTesting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [sending, setSending] = useState(false);

  // --- recipient search & program filters ---------------------------------
  //
  // Filtering only changes what is SHOWN. Selection is independent of it, so
  // narrowing to SAT, ticking two groups, then switching to IELTS keeps those two
  // ticked. The summary line says how many selected groups the current filters
  // hide, because the confirm dialog counts them even when they are off screen.
  const [groupSearch, setGroupSearch] = useState('');
  const [programFilter, setProgramFilter] = useState<Set<ProgramFilterKey>>(new Set());

  const groupPrograms = useMemo(
    () => new Map(approvedGroups.map((group) => [group.id, detectPrograms(group.title || '')])),
    [approvedGroups],
  );

  const searchMatched = useMemo(() => {
    const query = groupSearch.trim().toLocaleLowerCase();
    if (!query) return approvedGroups;
    return approvedGroups.filter((group) =>
      (group.title || String(group.telegram_chat_id)).toLocaleLowerCase().includes(query),
    );
  }, [approvedGroups, groupSearch]);

  /** Per-chip counts, taken AFTER the search so each chip says what clicking it would show. */
  const chipCounts = useMemo(() => {
    const counts: Record<ProgramFilterKey, number> = {
      sat: 0,
      ielts: 0,
      nuet: 0,
      general_english: 0,
      other: 0,
    };
    for (const group of searchMatched) {
      const programs = groupPrograms.get(group.id) ?? [];
      if (programs.length === 0) counts.other += 1;
      for (const program of programs) counts[program] += 1;
    }
    return counts;
  }, [searchMatched, groupPrograms]);

  const visibleGroups = useMemo(() => {
    if (programFilter.size === 0) return searchMatched;
    return searchMatched.filter((group) => {
      const programs = groupPrograms.get(group.id) ?? [];
      if (programs.length === 0) return programFilter.has('other');
      return programs.some((program) => programFilter.has(program));
    });
  }, [searchMatched, programFilter, groupPrograms]);

  // Counted against the CURRENT approved list, not the raw selection. A group
  // removed between loading the page and pressing Refresh is dropped by the
  // server, and counting it here would make the confirm dialog promise a
  // recipient that never ships.
  const selectedApproved = useMemo(
    () => approvedGroups.filter((group) => selectedGroups.has(group.id)),
    [approvedGroups, selectedGroups],
  );
  const selectedGroupCount = selectedApproved.length;
  const visibleIds = useMemo(() => new Set(visibleGroups.map((g) => g.id)), [visibleGroups]);
  const hiddenSelectedCount = selectedApproved.filter((g) => !visibleIds.has(g.id)).length;
  const allVisibleSelected =
    visibleGroups.length > 0 && visibleGroups.every((group) => selectedGroups.has(group.id));
  const isFiltering = groupSearch.trim() !== '' || programFilter.size > 0;

  const toggleProgram = (key: ProgramFilterKey) => {
    setProgramFilter((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const clearFilters = () => {
    setGroupSearch('');
    setProgramFilter(new Set());
  };

  /** Select or deselect only what the filters show, leaving hidden picks alone. */
  const setVisibleSelected = (select: boolean) => {
    setSelectedGroups((current) => {
      const next = new Set(current);
      for (const group of visibleGroups) {
        if (select) next.add(group.id);
        else next.delete(group.id);
      }
      return next;
    });
  };

  // Object URLs must be revoked or every re-pick leaks one.
  const previews = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const studentCount = allStudents ? summary?.students_opted_in ?? 0 : 0;
  const recipientCount = selectedGroupCount + studentCount;

  /**
   * Telegram caps a photo caption at 1024 characters but a standalone message
   * at 4096. With images attached, a longer body is sent as a second message
   * rather than truncated — worth saying out loud, because the composer would
   * otherwise look like it was silently ignoring the lower limit.
   *
   * Counted on the VISIBLE text: the caps apply after Telegram parses entities,
   * so `<b>hi</b>` is two characters. Counting the raw markup would refuse text
   * that comfortably fits.
   */
  const bodyLength = visibleLength(body);
  const limit = images.length > 0 && bodyLength <= CAPTION_LIMIT ? CAPTION_LIMIT : TEXT_LIMIT;
  const splitsIntoTwoMessages = images.length > 0 && bodyLength > CAPTION_LIMIT;

  /** ⌘/Ctrl + B, I, U for the three people reach for most. */
  const handleBodyShortcut = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!event.metaKey && !event.ctrlKey) return;
    const tag = { b: 'b', i: 'i', u: 'u' }[event.key.toLowerCase()];
    if (!tag) return;
    event.preventDefault();
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? start;
    const open = `<${tag}>`;
    const close = `</${tag}>`;
    setBody(body.slice(0, start) + open + body.slice(start, end) + close + body.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + open.length;
      el.setSelectionRange(caret, caret + (end - start));
    });
  };

  const toggleGroup = (id: number) => {
    setSelectedGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addImages = (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files);
    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      toast(`Telegram allows at most ${MAX_IMAGES} images per album`, 'error');
      return;
    }
    if (picked.length > room) {
      toast(`Only ${room} more image${room > 1 ? 's' : ''} can be added`, 'info');
    }
    setImages((current) => [...current, ...picked.slice(0, room)]);
  };

  const moveImage = (index: number, delta: number) => {
    setImages((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const validate = (): string | null => {
    if (!visibleText(body).trim() && images.length === 0)
      return 'Write a message or attach an image';
    if (bodyLength > TEXT_LIMIT) return `Text is limited to ${TEXT_LIMIT} characters`;
    if (images.length > MAX_IMAGES) return `Telegram allows at most ${MAX_IMAGES} images`;
    if (recipientCount === 0) return 'Select at least one group, or all linked students';
    if (scheduledFor && new Date(scheduledFor).getTime() <= Date.now()) {
      return 'The scheduled time is in the past';
    }
    return null;
  };

  const buildPayload = () => ({
    body: body.trim(),
    target_group_ids: selectedApproved.map((group) => group.id),
    target_all_students: allStudents,
    pin,
    silent,
    scheduled_for: scheduledFor ? new Date(scheduledFor).toISOString() : null,
  });

  const handleTestSend = async () => {
    const chatId = Number(testChatId);
    if (!testChatId.trim() || Number.isNaN(chatId)) {
      toast('Enter the numeric chat ID of your staff test group', 'error');
      return;
    }
    if (!visibleText(body).trim() && images.length === 0) {
      toast('Write a message or attach an image first', 'error');
      return;
    }
    setTesting(true);
    try {
      const result = await testSendPreview({ ...buildPayload(), test_chat_id: chatId }, images);
      if (result.ok) {
        toast('Test sent — check the group', 'success');
      } else {
        toast(result.error || 'Test send failed', 'error');
      }
    } catch (error) {
      toast(errorMessage(error, 'Test send failed'), 'error');
    } finally {
      setTesting(false);
    }
  };

  const openConfirm = () => {
    const problem = validate();
    if (problem) {
      toast(problem, 'error');
      return;
    }
    setConfirmText('');
    setConfirmOpen(true);
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await createAnnouncement(buildPayload(), images);
      toast(
        scheduledFor
          ? `Scheduled for ${recipientCount} recipient${recipientCount > 1 ? 's' : ''}`
          : `Sending to ${recipientCount} recipient${recipientCount > 1 ? 's' : ''}`,
        'success',
      );
      setConfirmOpen(false);
      setBody('');
      setImages([]);
      setSelectedGroups(new Set());
      setAllStudents(false);
      setPin(false);
      setSilent(false);
      setScheduledFor('');
      onSent();
    } catch (error) {
      toast(errorMessage(error, 'Failed to send the announcement'), 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Message</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <FormatToolbar textareaRef={bodyRef} value={body} onChange={setBody} />
              <Textarea
                ref={bodyRef}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={handleBodyShortcut}
                placeholder="What should the students know?"
                className="min-h-[160px] font-mono text-sm"
              />
              <div className="flex items-center justify-between gap-4 text-xs">
                <span className={bodyLength > TEXT_LIMIT ? 'text-rose-600' : 'text-muted-foreground'}>
                  {bodyLength} / {limit}
                </span>
                {splitsIntoTwoMessages && (
                  <span className="text-right text-muted-foreground">
                    Over {CAPTION_LIMIT} characters — the text will arrive as a separate message
                    below the photos.
                  </span>
                )}
              </div>
            </div>

            {/* The preview is what makes showing raw tags acceptable: the sender
                always has the rendered result in front of them. */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Preview</Label>
              <div className="min-h-[64px] rounded-md border border-border bg-muted/30 p-3 text-sm leading-relaxed text-foreground [&_a]:text-primary [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono">
                {visibleText(body).trim() ? (
                  <span dangerouslySetInnerHTML={{ __html: renderPreviewHtml(body) }} />
                ) : (
                  <span className="text-muted-foreground">Nothing to preview yet.</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Images ({images.length}/{MAX_IMAGES})
                </Label>
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      addImages(event.target.files);
                      event.target.value = '';
                    }}
                  />
                  <span className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-accent">
                    <ImagePlus className="h-4 w-4" />
                    Add images
                  </span>
                </label>
              </div>
              {images.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {images.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="relative">
                      <img
                        src={previews[index]}
                        alt={file.name}
                        className="h-24 w-24 rounded-md border border-border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setImages((c) => c.filter((_, i) => i !== index))}
                        className="absolute -right-2 -top-2 rounded-full bg-rose-600 p-1 text-white"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="mt-1 flex justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveImage(index, -1)}
                          disabled={index === 0}
                          className="rounded p-0.5 text-muted-foreground disabled:opacity-30 hover:bg-accent"
                          aria-label="Move earlier"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(index, 1)}
                          disabled={index === images.length - 1}
                          className="rounded p-0.5 text-muted-foreground disabled:opacity-30 hover:bg-accent rotate-180"
                          aria-label="Move later"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recipients</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {approvedGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No approved groups yet. Add the bot to a group (or post <code>/register</code> in
                one it is already in), then approve it under Groups.
              </p>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={groupSearch}
                    onChange={(event) => setGroupSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Escape') setGroupSearch('');
                    }}
                    placeholder="Search groups by name…"
                    aria-label="Search groups by name"
                    className="pl-9 pr-9"
                  />
                  {groupSearch && (
                    <button
                      type="button"
                      onClick={() => setGroupSearch('')}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by program">
                  <FilterChip
                    label="All"
                    count={searchMatched.length}
                    active={programFilter.size === 0}
                    onClick={() => setProgramFilter(new Set())}
                  />
                  {PROGRAM_ORDER.map((key) => (
                    <FilterChip
                      key={key}
                      label={PROGRAM_CHIP_LABELS[key]}
                      count={chipCounts[key]}
                      active={programFilter.has(key)}
                      activeClassName={PROGRAM_BADGE_STYLES[key]}
                      onClick={() => toggleProgram(key)}
                    />
                  ))}
                  {/* Only offered when something actually lands there — usually
                      staff chats whose names carry no program. */}
                  {(chipCounts.other > 0 || programFilter.has('other')) && (
                    <FilterChip
                      label="Other"
                      count={chipCounts.other}
                      active={programFilter.has('other')}
                      onClick={() => toggleProgram('other')}
                    />
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-visible-groups"
                      checked={allVisibleSelected}
                      disabled={visibleGroups.length === 0}
                      onCheckedChange={(checked) => setVisibleSelected(checked === true)}
                    />
                    <Label
                      htmlFor="select-visible-groups"
                      className="cursor-pointer text-sm font-medium"
                    >
                      {isFiltering
                        ? `Select all ${visibleGroups.length} shown`
                        : `All groups (${approvedGroups.length})`}
                    </Label>
                  </div>
                  {selectedGroupCount > 0 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {selectedGroupCount} selected
                        {hiddenSelectedCount > 0 && (
                          <span className="text-amber-600">
                            {' '}
                            · {hiddenSelectedCount} hidden by filters
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedGroups(new Set())}
                        className="font-medium text-primary hover:underline"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>

                <div className="max-h-72 space-y-0.5 overflow-y-auto rounded-md border border-border p-1.5">
                  {visibleGroups.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      No groups match these filters.{' '}
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="font-medium text-primary hover:underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  ) : (
                    visibleGroups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted/50"
                      >
                        <Checkbox
                          id={`group-${group.id}`}
                          checked={selectedGroups.has(group.id)}
                          onCheckedChange={() => toggleGroup(group.id)}
                        />
                        <Label
                          htmlFor={`group-${group.id}`}
                          className="flex-1 cursor-pointer truncate text-sm font-normal"
                        >
                          {group.title || group.telegram_chat_id}
                        </Label>
                        {(groupPrograms.get(group.id) ?? []).map((key) => (
                          <span
                            key={key}
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${PROGRAM_BADGE_STYLES[key]}`}
                          >
                            {PROGRAM_CHIP_LABELS[key]}
                          </span>
                        ))}
                        {pin && !group.bot_is_admin && (
                          <span
                            className="shrink-0 text-xs text-amber-600"
                            title="Pinning needs admin rights"
                          >
                            can't pin
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-border pt-3">
              <Checkbox
                id="all-students"
                checked={allStudents}
                onCheckedChange={(checked) => setAllStudents(checked === true)}
              />
              <Label htmlFor="all-students" className="cursor-pointer text-sm font-normal">
                All linked students ({summary?.students_opted_in ?? 0})
              </Label>
              {summary && summary.students_bound > summary.students_opted_in && (
                <span className="text-xs text-muted-foreground">
                  {summary.students_bound - summary.students_opted_in} muted announcements
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="pin"
                checked={pin}
                onCheckedChange={(checked) => setPin(checked === true)}
              />
              <Label htmlFor="pin" className="flex cursor-pointer items-center gap-1.5 text-sm font-normal">
                <Pin className="h-3.5 w-3.5" />
                Pin in each group
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="silent"
                checked={silent}
                onCheckedChange={(checked) => setSilent(checked === true)}
              />
              <Label htmlFor="silent" className="cursor-pointer text-sm font-normal">
                Send silently (no notification)
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Schedule (optional)</Label>
              <Input
                type="datetime-local"
                value={scheduledFor}
                onChange={(event) => setScheduledFor(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to send now. The recipient list is fixed when you send, so a group
                approved later will not receive this.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Test send</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Deliver this exact message to one chat first — your staff test group. Nothing is
              recorded and it cannot be recalled.
            </p>
            <Input
              value={testChatId}
              onChange={(event) => setTestChatId(event.target.value)}
              placeholder="Chat ID, e.g. -1001234567890"
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={handleTestSend}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Test send
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="text-sm text-muted-foreground">
              Will reach{' '}
              <span className="font-semibold text-foreground">{recipientCount}</span> recipient
              {recipientCount === 1 ? '' : 's'}
              {selectedGroupCount > 0 && studentCount > 0 && (
                <>
                  {' '}
                  ({selectedGroupCount} group{selectedGroupCount > 1 ? 's' : ''}, {studentCount}{' '}
                  student{studentCount > 1 ? 's' : ''})
                </>
              )}
            </div>
            <Button className="w-full" onClick={openConfirm} disabled={sending}>
              <Send className="mr-2 h-4 w-4" />
              {scheduledFor ? 'Schedule' : 'Send now'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {scheduledFor ? 'Schedule this announcement?' : 'Send this announcement?'}
            </DialogTitle>
            <DialogDescription>
              This will reach {recipientCount} recipient{recipientCount === 1 ? '' : 's'}
              {selectedGroupCount > 0 &&
                ` — ${selectedGroupCount} group${selectedGroupCount > 1 ? 's' : ''}`}
              {studentCount > 0 && ` — ${studentCount} student${studentCount > 1 ? 's' : ''}`}.
              Type SEND to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder="SEND"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button onClick={handleSend} disabled={sending || confirmText.trim() !== 'SEND'}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {scheduledFor ? 'Schedule' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

function HistoryTab() {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AnnouncementDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await getAnnouncements();
      setRows(response.announcements);
    } catch (error) {
      toast(errorMessage(error, 'Failed to load announcements'), 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // While anything is still in flight the rollup changes underneath us, so poll
  // rather than leave the sender staring at a stale "12/40 delivered".
  const inFlight = rows.some((row) => row.status === 'sending' || row.status === 'scheduled');
  useEffect(() => {
    if (!inFlight) return undefined;
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [inFlight, load]);

  const openDetail = async (id: number) => {
    try {
      setSelected(await getAnnouncement(id));
    } catch (error) {
      toast(errorMessage(error, 'Failed to load the announcement'), 'error');
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Cancel this scheduled announcement?')) return;
    setBusy(true);
    try {
      await cancelAnnouncement(id);
      toast('Announcement canceled', 'success');
      setSelected(null);
      load();
    } catch (error) {
      toast(errorMessage(error, 'Failed to cancel'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRecall = async (id: number) => {
    if (
      !window.confirm(
        'Delete this announcement from every chat that still allows it? Messages older than about 48 hours cannot be removed.',
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const updated = await recallAnnouncement(id);
      setSelected(updated);
      const stuck = updated.targets.filter((t) => t.error?.startsWith('recall:')).length;
      toast(
        stuck > 0
          ? `Recalled, but ${stuck} chat${stuck > 1 ? 's' : ''} could not be cleared`
          : 'Announcement recalled',
        stuck > 0 ? 'info' : 'success',
      );
      load();
    } catch (error) {
      toast(errorMessage(error, 'Failed to recall'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const canRecall = (row: Announcement) =>
    (row.status === 'sent' || row.status === 'partially_failed' || row.status === 'sending') &&
    Date.now() - new Date(row.created_at).getTime() < RECALL_WINDOW_MS;

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Message</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-12 text-center text-muted-foreground">
                      No announcements yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => openDetail(row.id)}
                    >
                      <TableCell className="max-w-md">
                        <div className="truncate text-foreground">
                          {row.body || <span className="text-muted-foreground">(images only)</span>}
                        </div>
                        {row.images.length > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {row.images.length} image{row.images.length > 1 ? 's' : ''}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_STYLES[row.status]} variant="secondary">
                          {STATUS_LABELS[row.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={row.failed_count > 0 ? 'text-orange-600' : ''}>
                          {row.sent_count}/{row.total_count}
                        </span>
                        {row.failed_count > 0 && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({row.failed_count} failed)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {row.created_by_name || row.created_by_email}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {formatDateTime(row.scheduled_for || row.created_at)}
                      </TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        {row.status === 'scheduled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCancel(row.id)}
                            disabled={busy}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        {canRecall(row) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRecall(row.id)}
                            disabled={busy}
                          >
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Delivery report</DialogTitle>
                <DialogDescription>
                  {selected.sent_count} of {selected.total_count} delivered
                  {selected.failed_count > 0 && ` · ${selected.failed_count} failed`}
                </DialogDescription>
              </DialogHeader>
              <div className="whitespace-pre-wrap rounded-md bg-muted p-3 text-sm text-foreground">
                {selected.body || '(images only)'}
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Detail</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.targets.map((target) => (
                      <TableRow key={target.id}>
                        <TableCell className="text-foreground">{target.label}</TableCell>
                        <TableCell className="text-muted-foreground">{target.kind}</TableCell>
                        <TableCell>
                          {target.status === 'sent' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <Check className="h-3.5 w-3.5" />
                              sent
                              {target.pinned && <Pin className="h-3 w-3" />}
                            </span>
                          ) : target.status === 'failed' ? (
                            <span className="text-rose-600">failed</span>
                          ) : (
                            <span className="text-muted-foreground">{target.status}</span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs text-xs text-muted-foreground">
                          {target.error || formatDateTime(target.sent_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Groups
// ---------------------------------------------------------------------------

interface GroupsTabProps {
  groups: TelegramGroup[];
  loading: boolean;
  onChanged: () => void;
}

function GroupsTab({ groups, loading, onChanged }: GroupsTabProps) {
  const [busyId, setBusyId] = useState<number | null>(null);

  const update = async (group: TelegramGroup, status: 'approved' | 'rejected') => {
    setBusyId(group.id);
    try {
      await setGroupStatus(group.id, status);
      toast(status === 'approved' ? 'Group approved' : 'Group rejected', 'success');
      onChanged();
    } catch (error) {
      toast(errorMessage(error, 'Failed to update the group'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Groups the bot belongs to</CardTitle>
        <p className="text-sm text-muted-foreground">
          Telegram cannot list a bot's chats, so a group appears here only after the bot is added
          to it — or after someone posts <code>/register</code> in a group it is already in. A group
          receives nothing until you approve it.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Group</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Bot</TableHead>
                <TableHead>Approved by</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : groups.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                    No groups discovered yet. Add the bot to a group to get started.
                  </TableCell>
                </TableRow>
              ) : (
                groups.map((group) => (
                  <TableRow key={group.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">
                        {group.title || 'Untitled group'}
                      </div>
                      <div className="text-xs text-muted-foreground">{group.telegram_chat_id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          group.status === 'approved'
                            ? STATUS_STYLES.sent
                            : group.status === 'rejected'
                              ? STATUS_STYLES.recalled
                              : STATUS_STYLES.scheduled
                        }
                      >
                        {group.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {!group.is_active ? (
                        <span className="text-rose-600">removed</span>
                      ) : group.bot_is_admin ? (
                        <span className="text-muted-foreground">admin</span>
                      ) : (
                        <span className="text-muted-foreground" title="Cannot pin messages">
                          member
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {group.approved_by_email || '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {group.status !== 'approved' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mr-2"
                          onClick={() => update(group, 'approved')}
                          disabled={busyId === group.id || !group.is_active}
                        >
                          Approve
                        </Button>
                      )}
                      {group.status !== 'rejected' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => update(group, 'rejected')}
                          disabled={busyId === group.id}
                        >
                          Reject
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
