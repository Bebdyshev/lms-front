import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
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

const CATEGORY_CONFIG: Record<CategoryKey, { color: string; bg: string; label: string }> = {
  os_parent:   { color: '#3b82f6', bg: '#eff6ff', label: 'ОС род.' },
  os_student:  { color: '#ef4444', bg: '#fef2f2', label: 'ОС учен.' },
  post:        { color: '#f97316', bg: '#fff7ed', label: 'Посты' },
  group:       { color: '#a855f7', bg: '#faf5ff', label: 'Группа' },
  lesson:      { color: '#6366f1', bg: '#eef2ff', label: 'Урок' },
  practice:    { color: '#ef4444', bg: '#fef2f2', label: 'Practice' },
  call:        { color: '#10b981', bg: '#ecfdf5', label: 'Созвон' },
  renewal:     { color: '#dc2626', bg: '#fef2f2', label: 'Продление' },
  onboarding:  { color: '#22c55e', bg: '#f0fdf4', label: 'Онбординг' },
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
    const almatyOffset = 5 * 60;
    const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
    const almatyDate = new Date(utcMs + almatyOffset * 60000);
    const day = almatyDate.getDay();
    return day === 0 ? 6 : day - 1;
  } catch {
    return null;
  }
}

function getWeekPhaseLabel(tasks: CuratorTask[]): { label: string; color: string } {
  const hasOnboarding = tasks.some(t => t.task_type === 'onboarding');
  const hasRenewal = tasks.some(t => t.task_type === 'renewal');
  if (hasOnboarding) return { label: 'Онбординг', color: 'bg-emerald-500' };
  if (hasRenewal) return { label: 'Продление', color: 'bg-red-500' };
  return { label: 'Прогресс', color: 'bg-green-500' };
}

function getWeekDateRange(weekStr: string): string {
  const dates = getWeekDates(weekStr);
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const first = dates[0];
  const last = dates[6];
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} – ${last.getDate()} ${months[first.getMonth()]}`;
  }
  return `${first.getDate()} ${months[first.getMonth()]} – ${last.getDate()} ${months[last.getMonth()]}`;
}

export default function CuratorTasksPage() {
  const { user } = useAuth();
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

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleGenerateTasks = async () => {
    setGenerating(true);
    try {
      const result = await apiClient.generateWeeklyTasks(currentWeek);
      toast(result.detail, 'success');
      await loadTasks();
    } catch (error: any) {
      toast(error?.response?.data?.detail || 'Не удалось сгенерировать задачи', 'error');
    } finally {
      setGenerating(false);
    }
  };

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
    if (noDayTasks.length > 0) {
      buckets[0] = [...noDayTasks, ...buckets[0]];
    }
    return buckets;
  }, [tasks]);

  const weekPhase = getWeekPhaseLabel(tasks);
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

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
        toast('Задача обновлена', 'success');
        await loadTasks();
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast(error?.response?.data?.detail || 'Не удалось обновить задачу', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickComplete = async (task: CuratorTask, e: React.MouseEvent) => {
    e.stopPropagation();
    if (task.status === 'completed') return;
    try {
      await apiClient.updateCuratorTask(task.id, { status: 'completed' });
      toast('Задача выполнена', 'success');
      await loadTasks();
    } catch (error: any) {
      toast(error?.response?.data?.detail || 'Ошибка', 'error');
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

  const statusLabel = (s: string) => {
    const labels: Record<string, string> = {
      pending: 'Ожидает',
      in_progress: 'В процессе',
      completed: 'Выполнено',
      overdue: 'Просрочено',
    };
    return labels[s] || s;
  };

  return (
    <div className="p-4 md:p-6 max-w-[1440px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">
            Неделя {weekNumber}
          </h1>
          <span className="text-sm text-gray-400 hidden sm:inline">—</span>
          <Badge className={cn('text-white border-0 px-3 py-0.5 text-xs rounded-full font-medium', weekPhase.color)}>
            {weekPhase.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{getWeekDateRange(currentWeek)}</span>
          <span className="text-gray-300">•</span>
          <span className="font-mono text-xs text-gray-400">{currentWeek}</span>
        </div>
      </div>

      {/* Stats + Controls */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Card className="flex-1 border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Всего</p>
              <p className="text-xl font-bold text-gray-900">{tasks.length}</p>
            </CardContent>
          </Card>
          <Card className="flex-1 border-0 shadow-sm">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">В работе</p>
              <p className="text-xl font-bold text-amber-600">
                {tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length}
              </p>
            </CardContent>
          </Card>
          <Card className="flex-1 border-0 shadow-sm">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Выполнено</p>
              <p className="text-xl font-bold text-emerald-600">{completedCount}</p>
            </CardContent>
          </Card>
          <Card className="flex-1 border-0 shadow-sm">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase text-gray-500 font-semibold tracking-wider">Просрочено</p>
              <p className="text-xl font-bold text-red-600">
                {tasks.filter(t => t.status === 'overdue').length}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center border rounded-lg overflow-hidden bg-white h-9">
            <Button
              variant="ghost"
              size="sm"
              className="h-full px-3 rounded-none border-r hover:bg-gray-50 text-xs"
              onClick={() => setCurrentWeek(prev => shiftWeek(prev, -1))}
            >
              ←
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-full px-4 rounded-none text-xs font-medium hover:bg-gray-50"
              onClick={() => setCurrentWeek(getISOWeekString(new Date()))}
            >
              Сегодня
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-full px-3 rounded-none border-l hover:bg-gray-50 text-xs"
              onClick={() => setCurrentWeek(prev => shiftWeek(prev, 1))}
            >
              →
            </Button>
          </div>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              <SelectItem value="pending">Ожидает</SelectItem>
              <SelectItem value="in_progress">В процессе</SelectItem>
              <SelectItem value="completed">Выполнено</SelectItem>
              <SelectItem value="overdue">Просрочено</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <div className="flex items-center gap-3">
          <Progress value={progressPercent} className="flex-1 h-2" />
          <span className="text-xs font-semibold text-gray-500 tabular-nums min-w-[48px] text-right">
            {completedCount}/{tasks.length}
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-gray-500">
        {(Object.keys(CATEGORY_CONFIG) as CategoryKey[]).map(key => (
          <div key={key} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full inline-block"
              style={{ backgroundColor: CATEGORY_CONFIG[key].color }}
            />
            <span>{CATEGORY_CONFIG[key].label}</span>
          </div>
        ))}
      </div>

      {/* Weekly Timeline Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
          Загрузка задач...
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
          <p className="text-sm">Нет задач на эту неделю</p>
          <p className="text-xs text-gray-300">Нажмите кнопку чтобы сгенерировать задачи</p>
          <Button
            onClick={handleGenerateTasks}
            disabled={generating}
            size="sm"
            className="mt-2"
          >
            {generating ? 'Генерация...' : 'Сгенерировать задачи'}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-2 lg:gap-3">
          {DAY_LABELS.map((label, dayIdx) => {
            const dayTasks = tasksByDay[dayIdx];
            const dates = getWeekDates(currentWeek);
            const isToday = dates[dayIdx].toDateString() === new Date().toDateString();
            const isPast = dates[dayIdx] < new Date() && !isToday;
            const dayDate = dates[dayIdx].getDate();

            return (
              <div key={dayIdx} className="flex flex-col items-center gap-2 min-w-0">
                <div className="flex flex-col items-center gap-0.5">
                  <span className={cn(
                    'text-[10px] font-bold uppercase tracking-wider',
                    isToday ? 'text-blue-600' : 'text-gray-400'
                  )}>
                    {label}
                  </span>
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                    isToday
                      ? 'bg-gray-900 text-white shadow-lg shadow-gray-900/20'
                      : isPast
                        ? 'bg-gray-50 text-gray-400'
                        : 'bg-gray-100 text-gray-600'
                  )}>
                    {dayDate}
                  </div>
                </div>

                <div className="w-full flex flex-col gap-1.5">
                  {dayTasks.length === 0 && (
                    <div className="h-16 rounded-lg border border-dashed border-gray-100" />
                  )}
                  {dayTasks.map(task => {
                    const cat = classifyTask(task);
                    const config = CATEGORY_CONFIG[cat];
                    const deadline = formatDeadlineTime(task.due_date);
                    const isCompleted = task.status === 'completed';
                    const isOverdue = task.status === 'overdue';

                    return (
                      <button
                        key={task.id}
                        onClick={() => openTaskDialog(task)}
                        className={cn(
                          'relative text-left w-full rounded-lg px-2.5 py-2 border transition-all duration-150',
                          'hover:shadow-md hover:-translate-y-0.5 cursor-pointer group',
                          isCompleted && 'opacity-50 border-gray-100',
                          isOverdue && 'border-red-200 bg-red-50/50',
                          !isCompleted && !isOverdue && 'border-gray-100 hover:border-gray-200',
                        )}
                        style={{
                          borderLeftWidth: '3px',
                          borderLeftColor: config.color,
                          backgroundColor: isCompleted ? '#fafafa' : isOverdue ? undefined : config.bg,
                        }}
                      >
                        {/* Quick complete — text checkmark, no icon */}
                        {!isCompleted && (
                          <div
                            onClick={(e) => handleQuickComplete(task, e)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-100 text-emerald-500 text-[10px] font-bold"
                            title="Отметить выполненной"
                          >
                            ✓
                          </div>
                        )}
                        {isCompleted && (
                          <div className="absolute top-1 right-1 text-emerald-400 text-[10px] font-bold">✓</div>
                        )}

                        <div className={cn(
                          'text-[11px] font-semibold leading-tight mb-0.5 pr-5 line-clamp-2',
                          isCompleted ? 'text-gray-400 line-through' : 'text-gray-800'
                        )}>
                          {task.template_title || 'Задача'}
                        </div>

                        <div className="text-[10px] text-gray-400 leading-tight line-clamp-1">
                          {task.student_name || task.group_name || ''}
                        </div>

                        {deadline && (
                          <div className={cn(
                            'text-[9px] mt-1 font-medium',
                            isOverdue ? 'text-red-500' : 'text-gray-300'
                          )}>
                            до {deadline}
                          </div>
                        )}

                        {task.status === 'in_progress' && (
                          <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-blue-400" />
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

      {/* Footer */}
      {!loading && tasks.length > 0 && (
        <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4">
            <span>▲ основные задачи</span>
            <span>▼ параллельные задачи</span>
          </div>
          <span>Неделя {weekNumber}</span>
        </div>
      )}

      {/* Task Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900 pr-8">
              {selectedTask?.template_title || 'Задача'}
            </DialogTitle>
            <DialogDescription className="sr-only">Детали задачи куратора</DialogDescription>
          </DialogHeader>

          {selectedTask && (() => {
            const cat = classifyTask(selectedTask);
            const config = CATEGORY_CONFIG[cat];
            return (
              <div className="space-y-4 py-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className="border-0 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full"
                    style={{ backgroundColor: config.color }}
                  >
                    {config.label}
                  </Badge>
                  <Badge className={cn(
                    'border-0 text-[10px] font-semibold px-2.5 py-0.5 rounded-full',
                    selectedTask.status === 'completed' && 'bg-emerald-100 text-emerald-700',
                    selectedTask.status === 'in_progress' && 'bg-blue-100 text-blue-700',
                    selectedTask.status === 'overdue' && 'bg-red-100 text-red-700',
                    selectedTask.status === 'pending' && 'bg-gray-100 text-gray-600',
                  )}>
                    {statusLabel(selectedTask.status)}
                  </Badge>
                  {selectedTask.student_name && (
                    <Badge variant="outline" className="text-[10px] font-normal text-gray-600">
                      {selectedTask.student_name}
                    </Badge>
                  )}
                  {selectedTask.group_name && (
                    <Badge variant="outline" className="text-[10px] font-normal text-gray-600">
                      {selectedTask.group_name}
                    </Badge>
                  )}
                </div>

                {selectedTask.template_description && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {selectedTask.template_description}
                    </p>
                  </div>
                )}

                {selectedTask.due_date && (
                  <p className="text-xs text-gray-500">
                    Дедлайн: {new Date(selectedTask.due_date).toLocaleDateString('ru-RU', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}

                {getAllowedTransitions(selectedTask.status).length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Статус</label>
                    <Select value={editStatus} onValueChange={setEditStatus}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={selectedTask.status}>
                          {statusLabel(selectedTask.status)}
                        </SelectItem>
                        {getAllowedTransitions(selectedTask.status).map(s => (
                          <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Результат / комментарий</label>
                  <Textarea
                    value={editResultText}
                    onChange={e => setEditResultText(e.target.value)}
                    placeholder="Опишите результат выполнения задачи..."
                    className="text-sm min-h-[80px] resize-none"
                    disabled={selectedTask.status === 'completed'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Ссылка на скриншот</label>
                  <Input
                    value={editScreenshotUrl}
                    onChange={e => setEditScreenshotUrl(e.target.value)}
                    placeholder="https://..."
                    className="text-sm h-9"
                    disabled={selectedTask.status === 'completed'}
                  />
                </div>

                {selectedTask.screenshot_url && (
                  <a
                    href={selectedTask.screenshot_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Открыть скриншот →
                  </a>
                )}

                {selectedTask.completed_at && (
                  <p className="text-[10px] text-gray-400">
                    Выполнено: {new Date(selectedTask.completed_at).toLocaleDateString('ru-RU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                )}
              </div>
            );
          })()}

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              Закрыть
            </Button>
            {selectedTask && getAllowedTransitions(selectedTask.status).length > 0 && (
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="bg-gray-900 hover:bg-gray-800"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
