import { useEffect, useState, useMemo, useCallback } from 'react';
import apiClient from '../services/api';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Input } from '../components/ui/input';
import { Progress } from '../components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { cn } from '../lib/utils';
import { toast } from '../components/Toast';

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

type CategoryKey = 'os_parent' | 'os_student' | 'post' | 'group' | 'lesson' | 'practice' | 'call' | 'renewal' | 'onboarding';

const CATEGORY_DOT: Record<CategoryKey, string> = {
  os_parent: '#3b82f6',
  os_student: '#ef4444',
  post: '#f97316',
  group: '#a855f7',
  lesson: '#6366f1',
  practice: '#ef4444',
  call: '#10b981',
  renewal: '#dc2626',
  onboarding: '#22c55e',
};

const CATEGORY_LABEL: Record<CategoryKey, string> = {
  os_parent: 'ОС род.',
  os_student: 'ОС учен.',
  post: 'Посты',
  group: 'Группа',
  lesson: 'Урок',
  practice: 'Practice',
  call: 'Созвон',
  renewal: 'Продление',
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
  if (title.includes('напоминание') && (title.includes('урок') || title.includes('вебинар'))) return 'lesson';
  if (title.includes('weekly practice') || title.includes('practice')) return 'practice';
  if (task.scope === 'group') return 'group';
  return 'os_student';
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: 'Ожидает', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
  in_progress: { label: 'В процессе', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  completed: { label: 'Готово', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  overdue: { label: 'Просрочено', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const ALL_STATUSES = ['pending', 'in_progress', 'completed', 'overdue'];

const DAY_LABELS = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

function getISOWeekString(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function getWeekDates(weekStr: string): Date[] {
  const [yearStr, weekPart] = weekStr.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekPart);
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay() || 7;
  const monday = new Date(jan4);
  monday.setDate(jan4.getDate() - dayOfWeek + 1 + (week - 1) * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getWeekNumber(weekStr: string): number {
  return parseInt(weekStr.split('-W')[1]);
}

function shiftWeek(weekStr: string, delta: number): string {
  const dates = getWeekDates(weekStr);
  const shifted = new Date(dates[0]);
  shifted.setDate(shifted.getDate() + delta * 7);
  return getISOWeekString(shifted);
}

function formatDeadlineTime(dueDate: string | null): string | null {
  if (!dueDate) return null;
  try {
    const d = new Date(dueDate);
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    const almatyDate = new Date(utcMs + 5 * 60 * 60000);
    return `${String(almatyDate.getHours()).padStart(2, '0')}:${String(almatyDate.getMinutes()).padStart(2, '0')}`;
  } catch { return null; }
}

function getDueDayIndex(dueDate: string | null): number | null {
  if (!dueDate) return null;
  try {
    const d = new Date(dueDate);
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    const almatyDate = new Date(utcMs + 5 * 60 * 60000);
    const day = almatyDate.getDay();
    return day === 0 ? 6 : day - 1;
  } catch { return null; }
}

function getWeekDateRange(weekStr: string): string {
  const dates = getWeekDates(weekStr);
  const m = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const f = dates[0], l = dates[6];
  if (f.getMonth() === l.getMonth()) return `${f.getDate()} – ${l.getDate()} ${m[f.getMonth()]}`;
  return `${f.getDate()} ${m[f.getMonth()]} – ${l.getDate()} ${m[l.getMonth()]}`;
}

export default function CuratorTasksPage() {
  const [currentWeek, setCurrentWeek] = useState(() => getISOWeekString(new Date()));
  const [tasks, setTasks] = useState<CuratorTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CuratorTask | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editResultText, setEditResultText] = useState('');
  const [editScreenshotUrl, setEditScreenshotUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const weekNumber = getWeekNumber(currentWeek);

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

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const r = await apiClient.generateWeeklyTasks(currentWeek);
      toast(r.detail, 'success');
      await loadTasks();
    } catch (e: any) {
      toast(e?.response?.data?.detail || 'Ошибка генерации', 'error');
    } finally { setGenerating(false); }
  };

  const tasksByDay = useMemo(() => {
    const b: CuratorTask[][] = Array.from({ length: 7 }, () => []);
    const noDayTasks: CuratorTask[] = [];
    for (const t of tasks) {
      const idx = getDueDayIndex(t.due_date);
      if (idx !== null && idx >= 0 && idx < 7) b[idx].push(t);
      else noDayTasks.push(t);
    }
    if (noDayTasks.length > 0) b[0] = [...noDayTasks, ...b[0]];
    return b;
  }, [tasks]);

  const done = tasks.filter(t => t.status === 'completed').length;
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  const openDialog = (t: CuratorTask) => {
    setSelectedTask(t);
    setEditStatus(t.status);
    setEditResultText(t.result_text || '');
    setEditScreenshotUrl(t.screenshot_url || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!selectedTask) return;
    setSaving(true);
    try {
      const d: any = {};
      if (editStatus !== selectedTask.status) d.status = editStatus;
      if (editResultText !== (selectedTask.result_text || '')) d.result_text = editResultText;
      if (editScreenshotUrl !== (selectedTask.screenshot_url || '')) d.screenshot_url = editScreenshotUrl;
      if (Object.keys(d).length > 0) {
        await apiClient.updateCuratorTask(selectedTask.id, d);
        toast('Задача обновлена', 'success');
        await loadTasks();
      }
      setDialogOpen(false);
    } catch (e: any) {
      toast(e?.response?.data?.detail || 'Ошибка', 'error');
    } finally { setSaving(false); }
  };

  const sLabel = (s: string) => STATUS_CONFIG[s]?.label || s;

  return (
    <div className="p-4 md:p-6 max-w-[1440px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Задачи · Неделя {weekNumber}</h1>
          <p className="text-xs text-gray-400 mt-0.5">{getWeekDateRange(currentWeek)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg overflow-hidden bg-white h-8">
            <button className="h-full px-2.5 text-xs text-gray-500 hover:bg-gray-50 border-r transition-colors" onClick={() => setCurrentWeek(p => shiftWeek(p, -1))}>←</button>
            <button className="h-full px-3 text-xs text-gray-600 font-medium hover:bg-gray-50 transition-colors" onClick={() => setCurrentWeek(getISOWeekString(new Date()))}>Сегодня</button>
            <button className="h-full px-2.5 text-xs text-gray-500 hover:bg-gray-50 border-l transition-colors" onClick={() => setCurrentWeek(p => shiftWeek(p, 1))}>→</button>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="pending">Ожидает</SelectItem>
              <SelectItem value="in_progress">В процессе</SelectItem>
              <SelectItem value="completed">Готово</SelectItem>
              <SelectItem value="overdue">Просрочено</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats bar */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-4">
          <Progress value={pct} className="flex-1 h-1.5" />
          <span className="text-xs text-gray-500 tabular-nums whitespace-nowrap">{done} из {tasks.length}</span>
        </div>
      )}

      {/* Board */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-sm text-gray-400">Загрузка...</div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-sm text-gray-400">Нет задач на эту неделю</p>
          <Button onClick={handleGenerate} disabled={generating} size="sm" variant="outline">
            {generating ? 'Генерация...' : 'Сгенерировать задачи'}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-3">
          {DAY_LABELS.map((label, dayIdx) => {
            const dayTasks = tasksByDay[dayIdx];
            const dates = getWeekDates(currentWeek);
            const isToday = dates[dayIdx].toDateString() === new Date().toDateString();
            const dayDate = dates[dayIdx].getDate();

            return (
              <div key={dayIdx} className="flex flex-col min-h-[300px]">
                {/* Column header */}
                <div className={cn(
                  'flex items-center justify-between px-2 py-2 rounded-lg mb-2',
                  isToday ? 'bg-gray-900' : 'bg-gray-100'
                )}>
                  <span className={cn(
                    'text-[11px] font-semibold uppercase tracking-wide',
                    isToday ? 'text-white' : 'text-gray-500'
                  )}>
                    {label}
                  </span>
                  <span className={cn(
                    'text-[11px] font-medium',
                    isToday ? 'text-gray-300' : 'text-gray-400'
                  )}>
                    {dayDate}
                  </span>
                </div>

                {/* Task cards */}
                <div className="flex-1 space-y-2">
                  {dayTasks.map(task => {
                    const cat = classifyTask(task);
                    const dotColor = CATEGORY_DOT[cat];
                    const deadline = formatDeadlineTime(task.due_date);
                    const isCompleted = task.status === 'completed';
                    const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending;

                    return (
                      <button
                        key={task.id}
                        onClick={() => openDialog(task)}
                        className={cn(
                          'w-full text-left bg-white rounded-lg border border-gray-200 p-2.5 transition-all',
                          'hover:shadow-md hover:border-gray-300 hover:-translate-y-px',
                          'active:shadow-sm active:translate-y-0',
                          isCompleted && 'opacity-50',
                        )}
                      >
                        {/* Title */}
                        <p className={cn(
                          'text-[12px] font-medium leading-snug line-clamp-2',
                          isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'
                        )}>
                          {task.template_title}
                        </p>

                        {/* Assignee / group */}
                        {(task.student_name || task.group_name) && (
                          <p className="text-[10px] text-gray-400 mt-1 line-clamp-1">
                            {task.student_name || task.group_name}
                          </p>
                        )}

                        {/* Footer row: category dot + status + deadline */}
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-gray-100">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: dotColor }} />
                            <span className={cn(
                              'text-[9px] font-medium px-1.5 py-0.5 rounded',
                              statusCfg.bg, statusCfg.text,
                            )}>
                              {statusCfg.label}
                            </span>
                          </div>
                          {deadline && (
                            <span className={cn(
                              'text-[9px]',
                              task.status === 'overdue' ? 'text-red-500 font-medium' : 'text-gray-400'
                            )}>
                              {deadline}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}

                  {dayTasks.length === 0 && (
                    <div className="flex-1 flex items-center justify-center min-h-[60px]">
                      <span className="text-[10px] text-gray-300">—</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold pr-6">{selectedTask?.template_title}</DialogTitle>
            <DialogDescription className="sr-only">Детали задачи</DialogDescription>
          </DialogHeader>

          {selectedTask && (() => {
            const cat = classifyTask(selectedTask);
            const statusCfg = STATUS_CONFIG[selectedTask.status] || STATUS_CONFIG.pending;
            return (
              <div className="space-y-4 py-1">
                {/* Meta badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px] gap-1.5 font-normal">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: CATEGORY_DOT[cat] }} />
                    {CATEGORY_LABEL[cat]}
                  </Badge>
                  <Badge className={cn('border-0 text-[10px] px-2 py-0.5 rounded', statusCfg.bg, statusCfg.text)}>
                    {statusCfg.label}
                  </Badge>
                  {selectedTask.student_name && <Badge variant="outline" className="text-[10px] font-normal">{selectedTask.student_name}</Badge>}
                  {selectedTask.group_name && <Badge variant="outline" className="text-[10px] font-normal">{selectedTask.group_name}</Badge>}
                </div>

                {/* Description */}
                {selectedTask.template_description && (
                  <p className="text-sm text-gray-500 leading-relaxed bg-gray-50 rounded-lg p-3">
                    {selectedTask.template_description}
                  </p>
                )}

                {/* Deadline */}
                {selectedTask.due_date && (
                  <p className="text-xs text-gray-400">
                    Дедлайн: {new Date(selectedTask.due_date).toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}

                {/* Status select — always editable */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Статус</label>
                  <Select value={editStatus} onValueChange={setEditStatus}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>{sLabel(s)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Result text — always editable */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Результат</label>
                  <Textarea
                    value={editResultText}
                    onChange={e => setEditResultText(e.target.value)}
                    placeholder="Опишите результат..."
                    className="text-sm min-h-[70px] resize-none"
                  />
                </div>

                {/* Screenshot URL — always editable */}
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Скриншот (ссылка)</label>
                  <Input
                    value={editScreenshotUrl}
                    onChange={e => setEditScreenshotUrl(e.target.value)}
                    placeholder="https://..."
                    className="text-sm h-9"
                  />
                </div>

                {selectedTask.screenshot_url && (
                  <a href={selectedTask.screenshot_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline inline-block">
                    Открыть скриншот →
                  </a>
                )}

                {selectedTask.completed_at && (
                  <p className="text-[10px] text-gray-400">
                    Выполнено: {new Date(selectedTask.completed_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            );
          })()}

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>Закрыть</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
