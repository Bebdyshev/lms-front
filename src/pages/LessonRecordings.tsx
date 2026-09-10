import { CalendarDays, PlayCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * Announcement page for lesson recordings, before the feature opens up.
 *
 * The recordings pipeline is live but only for a single pilot teacher, so the page says
 * what is coming rather than listing anything. It exists now so the feature is
 * discoverable and so the route is stable when it starts showing real recordings — the
 * nav entry and URL will not move under anyone.
 */
export default function LessonRecordings() {
  const { user } = useAuth();
  const ru = ['head_curator', 'curator'].includes(user?.role || '');

  const t = ru
    ? {
        title: 'Записи уроков',
        soon: 'Скоро',
        lede: 'Скоро здесь появятся записи ваших занятий — можно будет пересмотреть урок целиком.',
        points: [
          {
            Icon: PlayCircle,
            head: 'Пересмотреть любой урок',
            body: 'Записи будут доступны вскоре после окончания занятия, прямо в браузере.',
          },
          {
            Icon: CalendarDays,
            head: 'Там же, где расписание',
            body: 'Запись открывается из карточки урока в календаре — искать отдельно не нужно.',
          },
          {
            Icon: ShieldCheck,
            head: 'Только для своей группы',
            body: 'Запись видят только участники этой группы и преподаватель.',
          },
        ],
        cta: 'Открыть календарь',
      }
    : {
        title: 'Lesson Recordings',
        soon: 'Coming soon',
        lede: 'Recordings of your lessons are coming here soon — so you can rewatch a class in full.',
        points: [
          {
            Icon: PlayCircle,
            head: 'Rewatch any lesson',
            body: 'Recordings appear shortly after a class ends, and play right in your browser.',
          },
          {
            Icon: CalendarDays,
            head: 'Right next to your schedule',
            body: 'Open a lesson in the calendar and the recording will be there — nothing extra to find.',
          },
          {
            Icon: ShieldCheck,
            head: 'Only your group',
            body: 'A recording is visible to the students of that group and their teacher, nobody else.',
          },
        ],
        cta: 'Open the calendar',
      };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{t.title}</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {t.soon}
          </span>
        </div>

        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t.lede}
        </p>

        <ul className="mt-8 space-y-5">
          {t.points.map(({ Icon, head, body }) => (
            <li key={head} className="flex gap-3.5">
              <span className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-xl bg-muted">
                <Icon className="h-[18px] w-[18px] text-primary" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{head}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-9 border-t border-border pt-6">
          <Link
            to="/calendar"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <CalendarDays className="h-4 w-4" aria-hidden />
            {t.cta}
          </Link>
        </div>
      </div>
    </div>
  );
}
