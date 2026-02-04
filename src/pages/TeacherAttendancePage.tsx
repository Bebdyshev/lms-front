import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

import { 
  Loader2,
  Star,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../components/ui/select';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import apiClient, { getGroupFullAttendanceMatrix, updateAttendanceBulk, getCuratorGroups } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Group } from '../types';
import { cn } from '../lib/utils';
import { Skeleton } from '../components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";

interface LessonMeta {
    lesson_number: number;
    event_id: number;
    title: string;
    start_datetime: string;
}

interface StudentLessonStatus {
    event_id: number;
    attendance_status: string;
    activity_score?: number;
}

interface StudentRow {
    student_id: number;
    student_name: string;
    lessons: { [key: string]: StudentLessonStatus };
}

interface AttendanceData {
    lessons: LessonMeta[];
    students: StudentRow[];
}

export default function TeacherAttendancePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Track changes locally: Map<studentId, Set<lessonKey>>
  const [changedLessons, setChangedLessons] = useState<Map<number, Set<string>>>(new Map());
  
  // Activity score modal state
  const [activityModal, setActivityModal] = useState<{
    open: boolean;
    studentId: number | null;
    lessonKey: string | null;
    studentName: string;
    currentScore: number;
  }>({ open: false, studentId: null, lessonKey: null, studentName: '', currentScore: 0 });

  useEffect(() => {
    loadGroups();
  }, [user]);

  useEffect(() => {
    if (selectedGroupId) {
      loadAttendanceData();
    }
  }, [selectedGroupId]);

  const loadGroups = async () => {
    try {
      setLoading(true);
      let fetchedGroups;
      try {
          fetchedGroups = await apiClient.getTeacherGroups();
      } catch (e) {
          fetchedGroups = await getCuratorGroups();
      }
      
      setGroups(fetchedGroups || []);
      
      // Update selected group based on URL or default to first group
      const urlGroupId = searchParams.get('group');
      if (urlGroupId) {
          const groupExists = fetchedGroups?.find(g => g.id === Number(urlGroupId));
          if (groupExists) {
              setSelectedGroupId(Number(urlGroupId));
          } else if (fetchedGroups && fetchedGroups.length > 0) {
              setSelectedGroupId(fetchedGroups[0].id);
          }
      } else if (fetchedGroups && fetchedGroups.length > 0) {
        setSelectedGroupId(fetchedGroups[0].id);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceData = async () => {
    if (!selectedGroupId) return;
    
    // Update URL when group changes
    setSearchParams(prev => {
        prev.set('group', selectedGroupId.toString());
        return prev;
    });

    try {
      setLoading(true);
      setChangedLessons(new Map());
      const result = await getGroupFullAttendanceMatrix(selectedGroupId);
      setData(result);
    } catch (err) {
      console.error('Failed to load attendance data:', err);
      toast.error('Load error');
    } finally {
      setLoading(false);
    }
  };

  const updateStudentStatus = (studentId: number, lessonKey: string, status: string, activityScore?: number) => {
    setData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        students: prev.students.map(s => {
          if (s.student_id !== studentId) return s;
          const lesson = s.lessons[lessonKey];
          if (!lesson) return s;
          return {
            ...s,
            lessons: {
              ...s.lessons,
              [lessonKey]: { 
                ...lesson, 
                attendance_status: status,
                ...(activityScore !== undefined && { activity_score: activityScore })
              }
            }
          };
        })
      };
    });

    setChangedLessons(prev => {
      const next = new Map(prev);
      const studentChanges = next.get(studentId) || new Set<string>();
      studentChanges.add(lessonKey);
      next.set(studentId, studentChanges);
      return next;
    });
  };

  const updateActivityScore = (studentId: number, lessonKey: string, score: number) => {
    setData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        students: prev.students.map(s => {
          if (s.student_id !== studentId) return s;
          const lesson = s.lessons[lessonKey];
          if (!lesson) return s;
          return {
            ...s,
            lessons: {
              ...s.lessons,
              [lessonKey]: { ...lesson, activity_score: score }
            }
          };
        })
      };
    });

    setChangedLessons(prev => {
      const next = new Map(prev);
      const studentChanges = next.get(studentId) || new Set<string>();
      studentChanges.add(lessonKey);
      next.set(studentId, studentChanges);
      return next;
    });
  };

  const toggleStudentStatus = (studentId: number, lessonKey: string, currentStatus: string) => {
      let nextStatus = 'attended';
      if (currentStatus === 'pending') nextStatus = 'attended';
      else if (currentStatus === 'attended') nextStatus = 'late';
      else if (currentStatus === 'late') nextStatus = 'missed';
      else if (currentStatus === 'missed') nextStatus = 'pending';
      
      updateStudentStatus(studentId, lessonKey, nextStatus);
  };

  const totalChangesCount = useMemo(() => {
    let count = 0;
    changedLessons.forEach(changes => { count += changes.size; });
    return count;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [changedLessons, data]);

  const saveAllChanges = async () => {
    if (!selectedGroupId || !data || totalChangesCount === 0) return;

    try {
      setSaving(true);
      const updates: any[] = [];

      for (const [studentId, lessonKeys] of changedLessons.entries()) {
          const student = data.students.find(s => s.student_id === studentId);
          if (!student) continue;

          for (const lessonKey of lessonKeys) {
              const statusData = student.lessons[lessonKey];
              if (!statusData) continue;

              const score = statusData.attendance_status === 'attended' ? 10 : 0;
              updates.push({
                group_id: selectedGroupId,
                week_number: 1, 
                lesson_index: parseInt(lessonKey),
                student_id: studentId,
                score: score,
                status: statusData.attendance_status,
                event_id: statusData.event_id,
                activity_score: statusData.activity_score
              });
          }
      }

      if (updates.length > 0) {
          await updateAttendanceBulk({ updates });
      }

      toast.success('Changes saved');
      setChangedLessons(new Map());
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = useMemo(() => 
    data?.students.filter(s => 
        s.student_name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [], [data, searchTerm]);

  const formatDate = (dateStr: string) => {
      // Backend stores in UTC, convert to Kazakhstan time (GMT+5)
      const dt = new Date(dateStr);
      return dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Almaty' });
  };

  const formatDay = (dateStr: string) => {
      // Backend stores in UTC, convert to Kazakhstan time (GMT+5)
      const dt = new Date(dateStr);
      return dt.toLocaleDateString('ru-RU', { weekday: 'short', timeZone: 'Asia/Almaty' });
  };

  const isFutureLesson = (dateStr: string) => {
      return new Date(dateStr) > new Date();
  };

  const lastActualLessonId = useMemo(() => {
      if (!data) return null;
      const pastLessons = data.lessons.filter(l => !isFutureLesson(l.start_datetime));
      if (pastLessons.length === 0) return null;
      // Find the one with the latest date
      const last = [...pastLessons].sort((a, b) => 
          new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime()
      )[0];
      return last.event_id;
  }, [data]);

  const getStatusColor = (status: string) => {
      switch (status) {
          case 'attended': return 'bg-green-200 text-green-700 hover:bg-green-400 hover:text-white';
          case 'late': return 'bg-yellow-200 text-yellow-700 hover:bg-yellow-500 hover:text-white';
          case 'missed': return 'bg-rose-500 text-white hover:bg-rose-600';
          case 'pending': return 'bg-gray-100/50 text-gray-400 hover:bg-gray-200';
          default: return 'bg-gray-50 text-gray-400 border-gray-100';
      }
  };

  const getStatusLabel = (status: string) => {
      switch (status) {
          case 'attended': return 'Present';
          case 'late': return 'Late';
          case 'missed': return 'Absent';
          case 'pending': return '-';
          default: return 'None';
      }
  };

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto min-h-screen text-gray-900 font-sans">
      {/* Header - Aligned with AnalyticsPage */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Group Attendance</h1>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <Select value={selectedGroupId?.toString() || ''} onValueChange={(v) => setSelectedGroupId(Number(v))}>
            <SelectTrigger className="w-full sm:w-[240px] bg-white border-gray-200">
              <SelectValue placeholder="Select group" />
            </SelectTrigger>
            <SelectContent>
              {groups.map(g => (
                <SelectItem key={g.id} value={g.id.toString()}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={loadAttendanceData} 
            disabled={loading || totalChangesCount === 0}
            variant="ghost"
            className="text-gray-400 hover:text-gray-600 font-medium"
          >
            Cancel
          </Button>
          
          <Button 
            onClick={saveAllChanges} 
            disabled={saving || totalChangesCount === 0}
            className={cn(
                "font-semibold shadow-sm",
                totalChangesCount > 0 ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-100 text-gray-400 border-gray-200"
            )}
            variant={totalChangesCount > 0 ? "default" : "outline"}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Save Changes {totalChangesCount > 0 && `(${totalChangesCount})`}
          </Button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        {/* Sub-header / Filters */}
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <Input 
                    placeholder="Search students..." 
                    className="w-full md:w-64 h-9 bg-gray-50/50 border-gray-200 text-sm focus-visible:ring-blue-500/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex items-center gap-6 text-sm">
                {data && data.lessons.length > 0 && (
                    <button 
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        onClick={() => {
                            data.students.forEach(s => {
                                data.lessons.forEach(l => {
                                    if (!isFutureLesson(l.start_datetime)) {
                                        updateStudentStatus(s.student_id, l.lesson_number.toString(), 'attended');
                                    }
                                });
                            });
                        }}
                    >
                        Mark all present
                    </button>
                )}
            </div>
        </div>

        {/* Matrix Grid */}
        <div className="overflow-x-auto relative min-h-[400px]">
            {loading ? (
                <div className="p-8 space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : !data || data.lessons.length === 0 ? (
                <div className="py-24 text-center text-gray-500 font-medium">
                    No lessons available for this group.
                </div>
            ) : (
                <Table className="border-collapse text-left">
                    <TableHeader>
                        <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableHead className="sticky left-0 z-40 bg-gray-50 border-r border-gray-200 px-6 py-4 min-w-[220px]">
                                <span className="text-sm font-semibold text-gray-500">Student</span>
                            </TableHead>
                            {data.lessons.map(lesson => {
                                const isLastActual = lesson.event_id === lastActualLessonId;
                                return (
                                    <TableHead key={lesson.event_id} className={cn(
                                        "text-center min-w-[100px] px-2 py-3 transition-colors border-r border-gray-200",
                                        isFutureLesson(lesson.start_datetime) && "bg-gray-50/30 font-normal text-gray-400",
                                        isLastActual && "bg-blue-50/30 border-l-2 border-r-2 border-blue-600"
                                    )}>
                                        <div className="flex flex-col items-center">
                                            <span className={cn(
                                                "text-[10px] font-medium capitalize",
                                                isLastActual ? "text-blue-600 font-bold" : "text-gray-400"
                                            )}>{formatDay(lesson.start_datetime)}</span>
                                            <span className={cn(
                                                "text-sm font-bold",
                                                isLastActual ? "text-blue-700" : "text-gray-900"
                                            )}>{formatDate(lesson.start_datetime)}</span>
                                        </div>
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100">
                        {filteredStudents.map((student) => (
                        <TableRow key={student.student_id} className="hover:bg-gray-50/50 transition-colors group">
                            <TableCell className="sticky left-0 z-30 bg-white border-r border-gray-200 px-6 py-3.5 group-hover:bg-gray-50 transition-colors">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-900">{student.student_name}</span>
                                </div>
                            </TableCell>
                            {data.lessons.map(lesson => {
                                const lessonKey = lesson.lesson_number.toString();
                                const lessonData = student.lessons[lessonKey];
                                const status = lessonData?.attendance_status || 'pending';
                                const activityScore = lessonData?.activity_score;
                                const isFuture = isFutureLesson(lesson.start_datetime);
                                const isChanged = changedLessons.get(student.student_id)?.has(lessonKey);
                                const isLastActual = lesson.event_id === lastActualLessonId;
                                
                                return (
                                <TableCell 
                                    key={`${student.student_id}-${lesson.event_id}`} 
                                    className={cn(
                                        "p-0 text-center transition-colors cursor-pointer select-none border-r border-gray-100/50",
                                        isFuture ? "bg-gray-50/10 cursor-default" : getStatusColor(status),
                                        isLastActual && !isFuture && "border-l-2 border-r-2 border-blue-600 shadow-[inset_0_0_0_1px_rgba(37,99,235,0.1)]",
                                        isChanged && "brightness-95"
                                    )}
                                    onClick={() => !isFuture && toggleStudentStatus(student.student_id, lessonKey, status)}
                                    onContextMenu={(e) => {
                                        e.preventDefault();
                                        if (!isFuture && (status === 'attended' || status === 'late')) {
                                            setActivityModal({
                                                open: true,
                                                studentId: student.student_id,
                                                lessonKey,
                                                studentName: student.student_name,
                                                currentScore: activityScore || 0
                                            });
                                        }
                                    }}
                                >
                                    <div className="flex flex-col items-center justify-center h-10 w-full">
                                        {isFuture ? (
                                            <div className="w-1.5 h-1.5 bg-gray-200 rounded-full" />
                                        ) : (
                                            <>
                                                <span className="font-bold text-[11px] tracking-wide">
                                                    {getStatusLabel(status)}
                                                </span>
                                                {(status === 'attended' || status === 'late') && activityScore !== undefined && activityScore > 0 && (
                                                    <div className="flex items-center gap-0.5 mt-0.5">
                                                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                                        <span className="text-[9px] font-medium text-yellow-600">{activityScore}</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </TableCell>
                                );
                            })}
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
      </div>

      {/* Activity Score Modal */}
      <Dialog open={activityModal.open} onOpenChange={(open) => !open && setActivityModal(prev => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Activity Score</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Set activity score for <strong>{activityModal.studentName}</strong>
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => (
                <Button
                  key={score}
                  variant={activityModal.currentScore === score ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "w-10 h-10",
                    activityModal.currentScore === score && "bg-yellow-500 hover:bg-yellow-600"
                  )}
                  onClick={() => setActivityModal(prev => ({ ...prev, currentScore: score }))}
                >
                  {score}
                </Button>
              ))}
            </div>
            <p className="text-xs text-gray-500 text-center">
              Click a number to set the activity score (0-10)
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActivityModal({ open: false, studentId: null, lessonKey: null, studentName: '', currentScore: 0 })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (activityModal.studentId && activityModal.lessonKey) {
                  updateActivityScore(activityModal.studentId, activityModal.lessonKey, activityModal.currentScore);
                }
                setActivityModal({ open: false, studentId: null, lessonKey: null, studentName: '', currentScore: 0 });
              }}
              className="bg-yellow-500 hover:bg-yellow-600"
            >
              Save Score
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
