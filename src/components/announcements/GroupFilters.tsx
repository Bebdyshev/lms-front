import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '../ui/input';
import { PROGRAM_BADGE_STYLES } from '../../lib/groupPicker';
import { PROGRAM_CHIP_LABELS, PROGRAM_ORDER, detectPrograms } from './programs';
import type { ProgramKey } from './programs';
import type { TelegramGroup } from '../../services/api/announcements';

/**
 * Search and program filters for lists of Telegram groups.
 *
 * Shared by the announcement composer's recipient picker and the Groups tab, so
 * the two can't disagree about which groups count as "SAT". Programs come from
 * the group's title via `detectPrograms` — Telegram groups carry no program
 * metadata of their own.
 *
 * The hook only decides what is SHOWN. Anything that selects groups keeps its
 * own selection state, so narrowing the view never unticks a pick.
 */

/** A program filter, or the "no program in the name" bucket. */
export type ProgramFilterKey = ProgramKey | 'other';

export function useGroupFilters(groups: TelegramGroup[]) {
  const [search, setSearch] = useState('');
  const [programFilter, setProgramFilter] = useState<Set<ProgramFilterKey>>(new Set());

  const programsById = useMemo(
    () => new Map(groups.map((group) => [group.id, detectPrograms(group.title || '')])),
    [groups],
  );

  const searchMatched = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return groups;
    return groups.filter((group) =>
      (group.title || String(group.telegram_chat_id)).toLocaleLowerCase().includes(query),
    );
  }, [groups, search]);

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
      const programs = programsById.get(group.id) ?? [];
      if (programs.length === 0) counts.other += 1;
      for (const program of programs) counts[program] += 1;
    }
    return counts;
  }, [searchMatched, programsById]);

  const visibleGroups = useMemo(() => {
    if (programFilter.size === 0) return searchMatched;
    return searchMatched.filter((group) => {
      const programs = programsById.get(group.id) ?? [];
      if (programs.length === 0) return programFilter.has('other');
      return programs.some((program) => programFilter.has(program));
    });
  }, [searchMatched, programFilter, programsById]);

  const toggleProgram = (key: ProgramFilterKey) => {
    setProgramFilter((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return {
    search,
    setSearch,
    programFilter,
    toggleProgram,
    showAllPrograms: () => setProgramFilter(new Set()),
    clearFilters: () => {
      setSearch('');
      setProgramFilter(new Set());
    },
    programsOf: (group: TelegramGroup): ProgramKey[] => programsById.get(group.id) ?? [],
    searchMatched,
    chipCounts,
    visibleGroups,
    isFiltering: search.trim() !== '' || programFilter.size > 0,
  };
}

export type GroupFilters = ReturnType<typeof useGroupFilters>;

/** The search box and the SAT / IELTS / NUET / GE chips. */
export function GroupFilterBar({ filters }: { filters: GroupFilters }) {
  const { search, setSearch, programFilter, toggleProgram, chipCounts, searchMatched } = filters;
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setSearch('');
          }}
          placeholder="Search groups by name…"
          aria-label="Search groups by name"
          className="pl-9 pr-9"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
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
          onClick={filters.showAllPrograms}
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
        {/* Only offered when something actually lands there — usually staff
            chats whose names carry no program. */}
        {(chipCounts.other > 0 || programFilter.has('other')) && (
          <FilterChip
            label="Other"
            count={chipCounts.other}
            active={programFilter.has('other')}
            onClick={() => toggleProgram('other')}
          />
        )}
      </div>
    </div>
  );
}

/** The program tags beside a group's name, in the LMS's own program colours. */
export function ProgramBadges({ programs }: { programs: ProgramKey[] }) {
  return (
    <>
      {programs.map((key) => (
        <span
          key={key}
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${PROGRAM_BADGE_STYLES[key]}`}
        >
          {PROGRAM_CHIP_LABELS[key]}
        </span>
      ))}
    </>
  );
}

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
