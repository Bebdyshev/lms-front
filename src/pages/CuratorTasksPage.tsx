import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CuratorTask {
  id: number;
  template_id: number;
  template_title: string | null;
  template_description: string | null;
  task_type: string | null;
  scope: string | null;
  curator_id: number;
  curator_name: string | null;
  student_id: number | null;
  student_name: string | null;
  group_id: number | null;
  group_name: string | null;
  status: string;
  due_date: string | null;
  completed_at: string | null;
  result_text: string | null;
  screenshot_url: string | null;
  week_reference: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Category Colors ─────────────────────────────────────────────────────────
// Maps task titles/patterns to color categories that match the screenshot

type CategoryKey =
  | 'os_parent'
  | 'os_student'
  | 'post'
  | 'group'
  | 'lesson'
  | 'practice'
  | 'call'
  | 'renewal'
  | 'onboarding';

const CATEGORY_COLORS: Record<CategoryKey, { border: string; dot: string; bg: string }> = {
  os_parent:   { border: '#4ade80', dot: '#4ade80', bg: '#f0fdf4' },
  os_student:  { border: '#60a5fa', dot: '#60a5fa', bg: '#eff6ff' },
  post:        { border: '#fbbf24', dot: '#fbbf24', bg: '#fffbeb' },
  group:       { border: '#c084fc', dot: '#c084fc', bg: '#faf5ff' },
  lesson:      { border: '#818cf8', dot: '#818cf8', bg: '#eef2ff' },
  practice:    { border: '#f87171', dot: '#f87171', bg: '#fef2f2' },
  call:        { border: '#2dd4bf', dot: '#2dd4bf', bg: '#f0fdfa' },
  renewal:     { border: '#fb923c', dot: '#fb923c', bg: '#fff7ed' },
  onboarding:  { border: '#34d399', dot: '#34d399', bg: '#ecfdf5' },
};

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  os_parent:  'ОС род.',
  os_student: 'ОС учен.',
  post:       'Посты',
  group:      'Группа',
  lesson:     'Урок',
  practice:   'Practice',
  call:       'Созвон',
  renewal:    'Продление',
  onboarding: 'Онбординг',
};

function classifyTask(task: CuratorTask): CategoryKey {
  const title = (task.template_title || '').toLowerCase();
  const type = (task.task_type || '').toLowerCase();

  if (type === 'onboarding') return 'onboarding';
  if (type === 'renewal') return 'renewal';

  if (title.includes('родител')) return 'os_parent';
  if (title.includes('обратная связь') && title.includes('лс')) return 'os_student';
  if (title.includes('ос ученику')) return 'os_student';
  if (title.includes('пост в беседу')) return 'post';
  if (title.includes('лидерборд')) return 'group';
  if (title.includes('кураторский час')) return 'call';
  if (title.includes('напоминание о уроке') || title.includes('напоминание урок') || title.includes('вебинар')) return 'lesson';
  if (title.includes('weekly practice') || title.includes('practice')) return 'practice';

  // Fallback by scope
  if (task.scope === 'group') return 'group';
  return 'os_student';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getWeekDates(weekStr: string): Date[] {
  // Parse "2026-W08" → array of 7 Date objects (Mon-Sun)
  const [yearStr, weekPart] = weekStr.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekPart);

  // Jan 4 is always in week 1
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7; // Mon=1..Sun=7
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);

  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function getWeekNumber(weekStr: string): number {
  return parseInt(weekStr.split('-W')[1]);
}

function getMonthLabel(weekStr: string): string {
  const dates = getWeekDates(weekStr);
  const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  // Use the Thursday of the week to determine the month
  return months[dates[3].getMonth()];
}

function formatDeadlineTime(dueDate: string | null): string | null {
  if (!dueDate) return null;
  try {
    const d = new Date(dueDate);
    // Convert to Almaty time (UTC+5)
    const almatyOffset = 5 * 60;
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    const almatyDate = new Date(utcMs + almatyOffset * 60000);
    return `${String(almatyDate.getHours()).padStart(2, '0')}:${String(almatyDate.getMinutes()).padStart(2, '0')}`;
  } catch {
    return null;
  }
}

function getDueDayIndex(dueDate: string | null): number | null {
  if (!dueDate) return null;
  try {
    const d = new Date(dueDate);
    // Convert to Almaty (UTC+5)
    const almatyOffset = 5 * 60;
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    const almatyDate = new Date(utcMs + almatyOffset * 60000);
    const day = almatyDate.getDay(); // 0=Sun
    return day === 0 ? 6 : day - 1; // Convert to 0=Mon..6=Sun
  } catch {
    return null;
  }
}

function shiftWeek(weekStr: string, delta: number): string {
  const dates = getWeekDates(weekStr);
  const shifted = new Date(dates[0]);
  shifted.setDate(shifted.getDate() + delta * 7);
  return getISOWeekString(shifted);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CuratorTasksPage() {
  const { user } = useAuth();
  const isHeadCurator = user?.role === 'head_curator';

  const [currentWeek, setCurrentWeek] = useState(() => getISOWeekString(new Date()));
  const [tasks, setTasks] = useState<CuratorTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<CuratorTask | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Update form
  const [editStatus, setEditStatus] = useState('');
  const [editResultText, setEditResultText] = useState('');
  const [editScreenshotUrl, setEditScreenshotUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const weekNumber = getWeekNumber(currentWeek);
  const monthLabel = getMonthLabel(currentWeek);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { week: currentWeek, limit: 200 };
      if (filterStatus !== 'all') params.status = filterStatus;
      const result = await apiClient.getCuratorTasks(params);
      setTasks(result.tasks || []);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWeek, filterStatus]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Organize tasks into day buckets
  const tasksByDay = useMemo(() => {
    const buckets: CuratorTask[][] = Array.from({ length: 7 }, () => []);
    const noDayTasks: CuratorTask[] = [];

    for (const task of tasks) {
      const dayIdx = getDueDayIndex(task.due_date);
      if (dayIdx !== null && dayIdx >= 0 && dayIdx < 7) {
        buckets[dayIdx].push(task);
      } else {
        noDayTasks.push(task);
      }
    }

    // Put tasks without a day in Monday
    if (noDayTasks.length > 0) {
      buckets[0] = [...noDayTasks, ...buckets[0]];
    }

    return buckets;
  }, [tasks]);

  // Count tasks with onboarding type
  const hasOnboarding = tasks.some(t => t.task_type === 'onboarding');

  const openTaskDialog = (task: CuratorTask) => {
    setSelectedTask(task);
    setEditStatus(task.status);
    setEditResultText(task.result_text || '');
    setEditScreenshotUrl(task.screenshot_url || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedTask) return;
    setSaving(true);
    try {
      const data: any = {};
      if (editStatus !== selectedTask.status) data.status = editStatus;
      if (editResultText !== (selectedTask.result_text || '')) data.result_text = editResultText;
      if (editScreenshotUrl !== (selectedTask.screenshot_url || '')) data.screenshot_url = editScreenshotUrl;

      if (Object.keys(data).length > 0) {
        await apiClient.updateCuratorTask(selectedTask.id, data);
        await loadTasks();
      }
      setDialogOpen(false);
    } catch (error: any) {
      alert(error?.response?.data?.detail || 'Failed to update task');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-medium">Выполнено</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-700 border-0 text-xs font-medium">В процессе</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-700 border-0 text-xs font-medium">Просрочено</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-600 border-0 text-xs font-medium">Ожидает</Badge>;
    }
  };

  const getAllowedTransitions = (currentStatus: string): string[] => {
    const map: Record<string, string[]> = {
      pending: ['in_progress', 'completed'],
      in_progress: ['completed'],
      overdue: ['in_progress', 'completed'],
      completed: [],
    };
    return map[currentStatus] || [];
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">
            {isHeadCurator ? `Неделя ${weekNumber}` : `Week ${weekNumber}`}
          </h1>
          {hasOnboarding && (
            <Badge className="bg-emerald-500 text-white border-0 px-4 py-1 text-sm rounded-full font-medium">
              {isHeadCurator ? 'Онбординг' : 'Onboarding'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{monthLabel}</span>
          <span className="text-gray-300">|</span>
          <span>{currentWeek}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(prev => shiftWeek(prev, -1))}
            className="h-8 px-3 text-xs"
          >
            &larr;
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(getISOWeekString(new Date()))}
            className="h-8 px-3 text-xs"
          >
            {isHeadCurator ? 'Сегодня' : 'Today'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentWeek(prev => shiftWeek(prev, 1))}
            className="h-8 px-3 text-xs"
          >
            &rarr;
          </Button>
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isHeadCurator ? 'Все статусы' : 'All statuses'}</SelectItem>
            <SelectItem value="pending">{isHeadCurator ? 'Ожидает' : 'Pending'}</SelectItem>
            <SelectItem value="in_progress">{isHeadCurator ? 'В процессе' : 'In Progress'}</SelectItem>
            <SelectItem value="completed">{isHeadCurator ? 'Выполнено' : 'Completed'}</SelectItem>
            <SelectItem value="overdue">{isHeadCurator ? 'Просрочено' : 'Overdue'}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-gray-600">
        {(Object.keys(CATEGORY_COLORS) as CategoryKey[]).map(key => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: CATEGORY_COLORS[key].dot }}
            />
            <span>{CATEGORY_LABELS[key]}</span>
          </div>
        ))}
      </div>

      {/* Weekly Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          {isHeadCurator ? 'Загрузка...' : 'Loading...'}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-3">
          {DAY_LABELS.map((label, dayIdx) => {
            const dayTasks = tasksByDay[dayIdx];
            const isToday = (() => {
              const dates = getWeekDates(currentWeek);
              const today = new Date();
              return dates[dayIdx].toDateString() === today.toDateString();
            })();

            return (
              <div key={dayIdx} className="flex flex-col items-center gap-3">
                {/* Day label */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    isToday
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {label}
                </div>

                {/* Task cards */}
                <div className="w-full flex flex-col gap-2">
                  {dayTasks.length === 0 && (
                    <div className="h-12" /> // Empty placeholder
                  )}
                  {dayTasks.map(task => {
                    const cat = classifyTask(task);
                    const colors = CATEGORY_COLORS[cat];
                    const deadline = formatDeadlineTime(task.due_date);
                    const isCompleted = task.status === 'completed';
                    const isOverdue = task.status === 'overdue';

                    return (
                      <button
                        key={task.id}
                        onClick={() => openTaskDialog(task)}
                        className={`
                          relative text-left w-full rounded-lg p-2.5 border border-gray-100
                          transition-all duration-150 hover:shadow-md hover:-translate-y-0.5
                          cursor-pointer group
                          ${isCompleted ? 'opacity-60' : ''}
                          ${isOverdue ? 'ring-1 ring-red-200' : ''}
                        `}
                        style={{
                          borderLeft: `3px solid ${colors.border}`,
                          backgroundColor: isCompleted ? '#f9fafb' : colors.bg,
                        }}
                      >
                        <div className="text-xs font-semibold text-gray-800 leading-tight mb-0.5 line-clamp-2">
                          {task.template_title || 'Task'}
                        </div>
                        <div className="text-[10px] text-gray-500 leading-tight line-clamp-1">
                          {task.student_name || task.group_name || (task.template_description ? task.template_description.slice(0, 40) + '...' : '')}
                        </div>
                        {deadline && (
                          <div className={`text-[10px] mt-1 ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                            {isHeadCurator ? 'ДД' : 'DL'} {deadline}
                          </div>
                        )}
                        {/* Status indicator dot */}
                        {isCompleted && (
                          <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-400" />
                        )}
                        {isOverdue && (
                          <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-400" />
                        )}
                        {task.status === 'in_progress' && (
                          <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && tasks.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          {isHeadCurator ? 'Нет задач на эту неделю' : 'No tasks for this week'}
        </div>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {selectedTask?.template_title || 'Task'}
            </DialogTitle>
          </DialogHeader>

          {selectedTask && (
            <div className="space-y-4 py-2">
              {/* Description */}
              {selectedTask.template_description && (
                <p className="text-sm text-gray-600 leading-relaxed">
                  {selectedTask.template_description}
                </p>
              )}

              {/* Info row */}
              <div className="flex flex-wrap gap-2 text-xs">
                {getStatusBadge(selectedTask.status)}
                {selectedTask.student_name && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {selectedTask.student_name}
                  </Badge>
                )}
                {selectedTask.group_name && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {selectedTask.group_name}
                  </Badge>
                )}
                {selectedTask.due_date && (
                  <Badge variant="outline" className="text-xs font-normal">
                    {new Date(selectedTask.due_date).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Badge>
                )}
              </div>

              {/* Status change */}
              {getAllowedTransitions(selectedTask.status).length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {isHeadCurator ? 'Изменить статус' : 'Change Status'}
                  </label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={selectedTask.status}>
                        {selectedTask.status === 'pending' ? (isHeadCurator ? 'Ожидает' : 'Pending') :
                         selectedTask.status === 'in_progress' ? (isHeadCurator ? 'В процессе' : 'In Progress') :
                         selectedTask.status === 'overdue' ? (isHeadCurator ? 'Просрочено' : 'Overdue') :
                         (isHeadCurator ? 'Выполнено' : 'Completed')}
                      </SelectItem>
                      {getAllowedTransitions(selectedTask.status).map(s => (
                        <SelectItem key={s} value={s}>
                          {s === 'in_progress' ? (isHeadCurator ? 'В процессе' : 'In Progress') :
                           s === 'completed' ? (isHeadCurator ? 'Выполнено' : 'Completed') :
                           s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Result text */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {isHeadCurator ? 'Результат / комментарий' : 'Result / Comment'}
                </label>
                <Textarea
                  value={editResultText}
                  onChange={e => setEditResultText(e.target.value)}
                  placeholder={isHeadCurator ? 'Опишите результат...' : 'Describe result...'}
                  className="text-sm min-h-[80px]"
                />
              </div>

              {/* Screenshot URL */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {isHeadCurator ? 'Ссылка на скриншот' : 'Screenshot URL'}
                </label>
                <Input
                  value={editScreenshotUrl}
                  onChange={e => setEditScreenshotUrl(e.target.value)}
                  placeholder="https://..."
                  className="text-sm h-9"
                />
              </div>

              {/* Existing screenshot preview */}
              {selectedTask.screenshot_url && (
                <div>
                  <a
                    href={selectedTask.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {isHeadCurator ? 'Открыть скриншот' : 'View screenshot'}
                  </a>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              {isHeadCurator ? 'Отмена' : 'Cancel'}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || (selectedTask?.status === 'completed' && editStatus === 'completed')}
            >
              {saving
                ? (isHeadCurator ? 'Сохранение...' : 'Saving...')
                : (isHeadCurator ? 'Сохранить' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
