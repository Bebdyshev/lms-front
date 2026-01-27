import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { 
    ChevronLeft, ChevronRight, Loader2, Save, Trophy, Calendar as CalendarIcon 
} from 'lucide-react';
import apiClient, { getCuratorGroups } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import {
    Card, CardHeader, CardTitle 
} from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';
import { toast } from '../components/Toast';
import { updateAttendance } from '../services/api';
import ScheduleGenerator from '../components/ScheduleGenerator';

interface LeaderboardEntry {
  student_id: number;
  student_name: string;
  avatar_url: string | null;
  lesson_1: number;
  hw_lesson_1: number | null;
  lesson_2: number;
  hw_lesson_2: number | null;
  lesson_3: number;
  hw_lesson_3: number | null;
  curator_hour: number;
  mock_exam: number;
  study_buddy: number;
  self_reflection_journal: number;
  weekly_evaluation: number;
  extra_points: number;
}

interface Group {
    id: number;
    name: string;
}

// Configuration
const MAX_SCORES = {
    lesson: 10, // Attendance: 0 (absent) or 10 (present)
    hw: 15,
    curator_hour: 20,
    mock_exam: 20,
    study_buddy: 15, // 0 (no) or 15 (yes)
    self_reflection_journal: 14,
    weekly_evaluation: 10,
    extra_points: 0,
};



const getBaseTotalMax = () => 
    (MAX_SCORES.lesson * 3) + 
    (MAX_SCORES.hw * 3) + 
    MAX_SCORES.mock_exam; // Lessons and Mock Exam are core

const getOptions = (max: number) => Array.from({ length: max + 1 }, (_, i) => i);

export default function CuratorLeaderboardPage() {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [changedEntries, setChangedEntries] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [enabledCols, setEnabledCols] = useState({
      curator_hour: true,
      study_buddy: true,
      self_reflection_journal: true,
      weekly_evaluation: true,
      extra_points: true
  });
  
  // Schedule Gen State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);

  useEffect(() => {
    const loadGroups = async () => {
        try {
            const myGroups = await getCuratorGroups();
            setGroups(myGroups);
            if (myGroups.length > 0) {
                setSelectedGroupId(myGroups[0].id);
            }
        } catch (e) {
            console.error("Failed to load groups", e);
        }
    };
    loadGroups();
  }, [user]);

  useEffect(() => {
    if (selectedGroupId) {
        loadLeaderboard();
    }
  }, [selectedGroupId, currentWeek]);

  const loadLeaderboard = async () => {
    if (!selectedGroupId) return;
    setLoading(true);
    setChangedEntries(new Set()); 
    try {
        const result = await apiClient.getGroupLeaderboard(selectedGroupId, currentWeek);
        setData(result);
    } catch (e) {
        console.error("Failed to load leaderboard", e);
        toast("Failed to load leaderboard", "error");
    } finally {
        setLoading(false);
    }
  };

  const calculateTotal = (entry: LeaderboardEntry) => {
    const hwScores = [
        entry.hw_lesson_1, entry.hw_lesson_2, entry.hw_lesson_3
    ];
    const hwTotal = hwScores.reduce((acc, val) => (acc || 0) + (val || 0), 0) || 0;
    const lessonsTotal = 
        entry.lesson_1 + entry.lesson_2 + entry.lesson_3;
    
    // Core (non-optional in this logic)
    const mockExam = entry.mock_exam;
    
    // Optional
    const curatorHour = enabledCols.curator_hour ? entry.curator_hour : 0;
    const studyBuddy = enabledCols.study_buddy ? entry.study_buddy : 0;
    const journal = enabledCols.self_reflection_journal ? entry.self_reflection_journal : 0;
    const weeklyEval = enabledCols.weekly_evaluation ? entry.weekly_evaluation : 0;
    const extraPoints = enabledCols.extra_points ? entry.extra_points : 0;
        
    return hwTotal + lessonsTotal + mockExam + curatorHour + studyBuddy + journal + weeklyEval + extraPoints;
  };
  
  const calculatePercent = (entry: LeaderboardEntry) => {
      const total = calculateTotal(entry);
      
      let maxForWeek = getBaseTotalMax();
      if (enabledCols.curator_hour) maxForWeek += MAX_SCORES.curator_hour;
      if (enabledCols.study_buddy) maxForWeek += MAX_SCORES.study_buddy;
      if (enabledCols.self_reflection_journal) maxForWeek += MAX_SCORES.self_reflection_journal;
      if (enabledCols.weekly_evaluation) maxForWeek += MAX_SCORES.weekly_evaluation;
      // extra_points NOT added to maxForWeek
      
      return Math.round((total / maxForWeek) * 100); 
  };

  const getPercentColor = (percent: number) => {
      // Using solid bg colors for flatness
      if (percent >= 90) return "bg-[#e6f4ea] text-[#137333]"; // Green
      if (percent >= 75) return "bg-[#e8f0fe] text-[#1967d2]"; // Blue
      if (percent >= 50) return "bg-[#fef7e0] text-[#ea8600]"; // Orange
      return "bg-[#fce8e6] text-[#c5221f]"; // Red
  };

  const handleScoreChange = (studentId: number, field: keyof LeaderboardEntry, value: string) => {
    const numValue = parseFloat(value) || 0;
    
    setData(prev => prev.map(item => 
        item.student_id === studentId ? { ...item, [field]: numValue } : item
    ));
    
    setChangedEntries(prev => new Set(prev).add(studentId));
  };

  const handleSaveChanges = async () => {
    if (!selectedGroupId || changedEntries.size === 0) return;
    
    setIsSaving(true);
    let successCount = 0;
    const entriesToSave = data.filter(s => changedEntries.has(s.student_id));
    
    for (const entry of entriesToSave) {
        try {
            // 1. Update Legacy / General Fields
            await apiClient.updateLeaderboardEntry({
                user_id: entry.student_id,
                group_id: selectedGroupId,
                week_number: currentWeek,
                lesson_1: entry.lesson_1,
                lesson_2: entry.lesson_2,
                lesson_3: entry.lesson_3,
                curator_hour: entry.curator_hour,
                mock_exam: entry.mock_exam,
                study_buddy: entry.study_buddy,
                self_reflection_journal: entry.self_reflection_journal,
                weekly_evaluation: entry.weekly_evaluation,
                extra_points: entry.extra_points
            });
            
            // 2. Update Attendance (Specific Lessons)
            // We assume lessons are 1, 2, 3 for now (matching UI)
            for (let i = 1; i <= 3; i++) {
                const key = `lesson_${i}` as keyof LeaderboardEntry;
                const score = entry[key] as number;
                
                await updateAttendance({
                    group_id: selectedGroupId,
                    week_number: currentWeek,
                    lesson_index: i,
                    student_id: entry.student_id,
                    score: score,
                    status: score > 0 ? "present" : "absent"
                });
            }

            successCount++;
        } catch (e) {
            console.error(`Failed to save for student ${entry.student_id}`, e);
        }
    }
    
    setIsSaving(false);
    if (successCount === entriesToSave.length) {
        toast("All changes saved successfully", "success");
        setChangedEntries(new Set());
    } else {
        toast(`Saved ${successCount}/${entriesToSave.length} entries. Please try again.`, "error");
    }
  };



  const ScoreSelect = ({ 
      value, 
      max, 
      onChange,
  }: { 
      value: number, 
      max: number, 
      onChange: (val: string) => void,
  }) => (
    <Select value={value.toString()} onValueChange={onChange}>
        <SelectTrigger className={cn(
            "h-full w-full border-none focus:ring-0 px-1 text-center justify-center rounded-none",
            "hover:bg-black/5" 
        )}>
            <span className="truncate text-xs text-gray-900">{value}</span>
        </SelectTrigger>
        <SelectContent>
            {getOptions(max).map(v => (
                <SelectItem key={v} value={v.toString()} className="justify-center text-xs">
                    {v}
                </SelectItem>
            ))}
        </SelectContent>
    </Select>
  );

  // Radio button toggle for attendance (lesson_1-5 and study_buddy)
  const AttendanceToggle = ({
      value,
      onChange,
      maxScore,
  }: {
      value: number,
      onChange: (val: string) => void,
      maxScore: number,
  }) => {
    const isPresent = value === maxScore;
    
    return (
      <div className="flex items-center justify-center gap-2 h-full">
        <button
          type="button"
          onClick={() => onChange(maxScore.toString())}
          className={cn(
            "flex items-center justify-center w-8 h-6 rounded text-[10px] font-medium transition-colors",
            isPresent 
              ? "bg-green-500 text-white shadow-sm" 
              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          )}
          title="Present"
        >
          ✓
        </button>
        <button
          type="button"
          onClick={() => onChange("0")}
          className={cn(
            "flex items-center justify-center w-8 h-6 rounded text-[10px] font-medium transition-colors",
            !isPresent 
              ? "bg-red-500 text-white shadow-sm" 
              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
          )}
          title="Absent"
        >
          ✕
        </button>
      </div>
    );
  };

  const ColumnToggle = ({ enabled, onToggle }: { enabled: boolean, onToggle: () => void }) => (
    <div 
      className="flex flex-col items-center mb-2.5 group cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <div 
        className={cn(
          "w-9 h-5 rounded-full transition-all duration-300 ease-in-out relative flex items-center px-1 shadow-inner",
          enabled 
            ? "bg-blue-600 ring-2 ring-blue-100" 
            : "bg-slate-200 ring-2 ring-transparent"
        )}
      >
        <div 
          className={cn(
            "w-3.5 h-3.5 bg-white rounded-full transition-all duration-300 ease-in-out shadow-[0_2px_4px_rgba(0,0,0,0.2)]",
            enabled ? "translate-x-3.5" : "translate-x-0"
          )} 
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-6 space-y-6">
      {/* Header Controls */}
      <Card className="border-0 shadow-sm bg-white rounded-2xl">
        <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-indigo-600 rounded-lg shadow-indigo-200 shadow-lg">
                  <Trophy className="w-5 h-5 text-white" />
              </div>
              {user?.role === 'head_curator' ? 'Лидерборд классов' : 'Class Leaderboard'}
            </CardTitle>
            <p className="text-gray-500 mt-1 ml-11">Управление успеваемостью и посещаемостью групп</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
             <div className="flex items-center border rounded-lg overflow-hidden bg-gray-50 h-9">
                <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-full w-9 rounded-none border-r hover:bg-gray-100 transition-colors"
                    onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
                    disabled={currentWeek <= 1}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="px-4 text-sm font-bold min-w-[4rem] text-center text-indigo-600">Неделя {currentWeek}</div>
                <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-full w-9 rounded-none border-l hover:bg-gray-100 transition-colors"
                    onClick={() => setCurrentWeek(currentWeek + 1)}
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>

            <div className="w-[220px]">
                <Select 
                    value={selectedGroupId?.toString() || ''} 
                    onValueChange={(value) => setSelectedGroupId(Number(value))}
                >
                    <SelectTrigger className="h-9 rounded-lg border-gray-200 bg-gray-50 font-medium">
                        <SelectValue placeholder={user?.role === 'head_curator' ? "Выберите группу" : "Select group"} />
                    </SelectTrigger>
                    <SelectContent>
                        {groups.map(g => (
                            <SelectItem key={g.id} value={g.id.toString()} className="font-medium">
                                {g.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            <ScheduleGenerator 
                groupId={selectedGroupId}
                open={isScheduleModalOpen}
                onOpenChange={setIsScheduleModalOpen}
                onSuccess={() => loadLeaderboard()}
                trigger={
                    <Button variant="outline" size="sm" className="h-9 gap-2 rounded-lg border-gray-200 hover:bg-gray-50">
                        <CalendarIcon className="w-4 h-4 text-indigo-500" />
                        <span className="hidden sm:inline">{user?.role === 'head_curator' ? 'Расписание' : 'Schedule'}</span>
                    </Button>
                }
            />
            
            <Button 
                onClick={handleSaveChanges} 
                disabled={changedEntries.size === 0 || isSaving}
                size="sm"
                className={cn(
                    "h-9 transition-all duration-200 rounded-lg font-bold px-4 shadow-md",
                    changedEntries.size > 0 
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200" 
                        : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed shadow-none"
                )}
            >
                {isSaving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {user?.role === 'head_curator' ? 'Сохранение...' : 'Saving...'}</>
                ) : (
                    <><Save className="w-4 h-4 mr-2" /> {user?.role === 'head_curator' ? `Сохранить (${changedEntries.size})` : `Save (${changedEntries.size})`}</>
                )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Spreadsheet Table Wrapped in Card */}
      <Card className="border-0 shadow-xl shadow-slate-200/50 overflow-hidden rounded-2xl bg-white">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
            {loading ? (
                <Table className="border-collapse w-full text-xs">
                    <TableHeader className="bg-gray-100 sticky top-0 z-30">
                        <TableRow className="h-auto border-b border-gray-300 hover:bg-gray-100">
                             <TableHead className="w-48 sticky left-0 z-40 bg-gray-100 p-2 border-r border-gray-300"><Skeleton className="h-4 w-20 bg-gray-200" /></TableHead>
                             {[1, 2, 3].map(i => (
                                <TableHead key={i} className="p-0 border-r border-gray-300 h-12 min-w-[100px] align-middle bg-gray-100">
                                   <div className="p-1 flex justify-center"><Skeleton className="h-3 w-12 bg-gray-200" /></div>
                                </TableHead>
                            ))}
                            {/* Manual Columns Skeletons */}
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <TableHead key={`manual-${i}`} className="p-2 w-20 bg-gray-100 border-r border-gray-300"><Skeleton className="h-8 w-16 bg-gray-200" /></TableHead>
                            ))}
                            <TableHead className="p-2 w-16 bg-gray-100 border-r border-gray-300"><Skeleton className="h-4 w-8 bg-gray-200" /></TableHead>
                            <TableHead className="p-2 w-16 sticky right-0 z-40 bg-gray-100"><Skeleton className="h-4 w-8 bg-gray-200" /></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 10 }).map((_, idx) => (
                            <TableRow key={idx} className="border-b border-gray-300 h-8">
                                <TableCell className="p-2 sticky left-0 z-30 bg-white border-r border-gray-300">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-3 w-4 bg-gray-100" />
                                        <Skeleton className="h-3 w-32 bg-gray-100" />
                                    </div>
                                </TableCell>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <TableCell key={i} className="p-0 border-r border-gray-300">
                                        <div className="flex w-full h-full p-1 gap-1">
                                            <Skeleton className="h-6 flex-1 bg-gray-50" />
                                            <Skeleton className="h-6 flex-1 bg-gray-50" />
                                        </div>
                                    </TableCell>
                                ))}
                                {[1, 2, 3, 4, 5, 6].map(i => (
                                    <TableCell key={`cell-${i}`} className="p-0 border-r border-gray-300">
                                         <div className="p-1"><Skeleton className="h-6 w-full bg-gray-50" /></div>
                                    </TableCell>
                                ))}
                                <TableCell className="p-2 border-r border-gray-300"><Skeleton className="h-4 w-8 mx-auto bg-gray-100" /></TableCell>
                                <TableCell className="p-2 sticky right-0 z-30 bg-white"><Skeleton className="h-4 w-8 mx-auto bg-gray-100" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
            <Table className="border-collapse w-full text-xs">
              <TableHeader className="bg-gray-100 sticky top-0 z-30">
                <TableRow className="h-auto border-b border-gray-300 hover:bg-gray-100">
                    <TableHead className="w-48 sticky left-0 z-40 bg-gray-100 font-semibold text-gray-700 p-2 border-r border-gray-300 text-left align-middle">
                        {user?.role === 'head_curator' ? 'Студент' : 'Student'}
                    </TableHead>
                    {/* Lesson & Homework Columns */}
                    {[1, 2, 3].map(i => (
                        <TableHead key={`lesson-${i}`} className="p-0 text-center border-r border-gray-300 h-auto min-w-[100px] align-top bg-gray-100">
                            <div className="flex flex-col h-full">
                                <div className="py-1 border-b border-gray-300 font-semibold text-gray-700 bg-gray-200/50">
                                    {user?.role === 'head_curator' ? `Урок ${i}` : `Lesson ${i}`}
                                </div>
                                <div className="flex flex-1">
                                    <div className="flex-1 py-1 text-[10px] font-medium text-gray-500 border-r border-gray-300">
                                        {user?.role === 'head_curator' ? 'Прис' : 'Class'}
                                    </div>
                                    <div className="flex-1 py-1 text-[10px] font-medium text-gray-500 bg-gray-50">
                                        {user?.role === 'head_curator' ? 'ДЗ' : 'HW'}
                                    </div>
                                </div>
                            </div>
                        </TableHead>
                    ))}
                    <TableHead className="text-center font-semibold p-2 w-20 text-gray-700 bg-gray-100 border-r border-gray-300 align-top whitespace-normal leading-tight">
                        <ColumnToggle enabled={enabledCols.curator_hour} onToggle={() => setEnabledCols(p => ({...p, curator_hour: !p.curator_hour}))} />
                        {user?.role === 'head_curator' ? <>Час<br/>Куратора</> : <>Curator<br/>Hour</>}
                    </TableHead>
                    <TableHead className="text-center font-semibold p-2 w-20 text-gray-700 bg-gray-100 border-r border-gray-300 align-middle whitespace-normal leading-tight">{user?.role === 'head_curator' ? <>Пробный<br/>тест</> : <>Mock<br/>Exam</>}</TableHead>
                    <TableHead className="text-center font-semibold p-2 w-20 text-gray-700 bg-gray-100 border-r border-gray-300 align-top whitespace-normal leading-tight">
                        <ColumnToggle enabled={enabledCols.study_buddy} onToggle={() => setEnabledCols(p => ({...p, study_buddy: !p.study_buddy}))} />
                        {user?.role === 'head_curator' ? <>Study<br/>Buddy</> : <>Study<br/>Buddy</>}
                    </TableHead>
                    <TableHead className="text-center font-semibold p-2 w-20 text-gray-700 bg-gray-100 border-r border-gray-300 align-top whitespace-normal leading-tight">
                        <ColumnToggle enabled={enabledCols.self_reflection_journal} onToggle={() => setEnabledCols(p => ({...p, self_reflection_journal: !p.self_reflection_journal}))} />
                        {user?.role === 'head_curator' ? 'Журнал' : 'Journal'}
                    </TableHead>
                    <TableHead className="text-center font-semibold p-2 w-20 text-gray-700 bg-gray-100 border-r border-gray-300 align-top whitespace-normal leading-tight">
                        <ColumnToggle enabled={enabledCols.weekly_evaluation} onToggle={() => setEnabledCols(p => ({...p, weekly_evaluation: !p.weekly_evaluation}))} />
                        {user?.role === 'head_curator' ? <>Ежен.<br/>Оценка</> : <>Weekly<br/>Eval</>}
                    </TableHead>
                    <TableHead className="text-center font-semibold p-2 w-20 text-gray-700 bg-gray-100 border-r border-gray-300 align-top whitespace-normal leading-tight">
                        <ColumnToggle enabled={enabledCols.extra_points} onToggle={() => setEnabledCols(p => ({...p, extra_points: !p.extra_points}))} />
                        {user?.role === 'head_curator' ? 'Доп.' : 'Extra'}
                    </TableHead>
                    
                    <TableHead className="text-center font-bold p-2 w-16 text-gray-800 bg-gray-100 border-r border-gray-300 align-middle">{user?.role === 'head_curator' ? 'Итого' : 'Total'}</TableHead>
                    <TableHead className="text-center font-bold p-2 w-16 sticky right-0 z-40 bg-gray-100 align-middle shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((student, index) => {
                    const percent = calculatePercent(student);
                    return (
                     <TableRow key={student.student_id} className="hover:bg-slate-50/80 border-b border-slate-100 h-10 transition-colors">
                        <TableCell className="p-2 sticky left-0 z-30 bg-white border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                             <div className="flex items-center gap-3">
                                <span className="text-[10px] text-gray-300 w-4 text-right font-mono font-bold">{index + 1}</span>
                                <Avatar className="h-7 w-7 border border-slate-100 shadow-sm">
                                    <AvatarImage src={student.avatar_url || ''} />
                                    <AvatarFallback className="bg-indigo-50 text-indigo-600 text-[10px] font-bold">
                                        {student.student_name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="truncate max-w-[140px] font-semibold text-slate-700 text-[13px]" title={student.student_name}>{student.student_name}</span>
                            </div>
                        </TableCell>
                        
                        {[1, 2, 3].map(i => {
                            const lessonKey = `lesson_${i}` as keyof LeaderboardEntry;
                            const hwKey = `hw_lesson_${i}` as keyof LeaderboardEntry;
                            const hwScore = student[hwKey] as number | null;
                            
                            return (
                                <TableCell key={i} className="p-0 border-r border-slate-100">
                                    <div className="flex w-full h-full items-stretch">
                                        <div className="flex-1 p-1">
                                            <AttendanceToggle 
                                                value={student[lessonKey] as number}
                                                maxScore={MAX_SCORES.lesson}
                                                onChange={(val) => handleScoreChange(student.student_id, lessonKey, val)}
                                            />
                                        </div>
                                        <div className="flex-1 border-l border-slate-100 bg-slate-50/50 flex items-center justify-center p-0">
                                            <div className={cn(
                                                "w-full text-center text-[13px] font-bold",
                                                hwScore !== null && hwScore >= 80 ? "text-emerald-600" : "text-slate-400"
                                            )}>
                                                {hwScore !== null ? hwScore : '-'}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                            );
                        })}

                        <TableCell className={cn("p-0 border-r border-slate-100", !enabledCols.curator_hour && "bg-slate-100/50 opacity-50 pointer-events-none")}>
                            <ScoreSelect value={student.curator_hour} max={MAX_SCORES.curator_hour} onChange={(v) => handleScoreChange(student.student_id, 'curator_hour', v)} />
                        </TableCell>
                        <TableCell className="p-0 border-r border-slate-100"><ScoreSelect value={student.mock_exam} max={MAX_SCORES.mock_exam} onChange={(v) => handleScoreChange(student.student_id, 'mock_exam', v)} /></TableCell>
                        <TableCell className={cn("p-0 border-r border-slate-100", !enabledCols.study_buddy && "bg-slate-100/50 opacity-50 pointer-events-none")}>
                            <AttendanceToggle 
                                value={student.study_buddy} 
                                maxScore={MAX_SCORES.study_buddy}
                                onChange={(v) => handleScoreChange(student.student_id, 'study_buddy', v)} 
                            />
                        </TableCell>
                        <TableCell className={cn("p-0 border-r border-slate-100", !enabledCols.self_reflection_journal && "bg-slate-100/50 opacity-50 pointer-events-none")}>
                            <ScoreSelect value={student.self_reflection_journal} max={MAX_SCORES.self_reflection_journal} onChange={(v) => handleScoreChange(student.student_id, 'self_reflection_journal', v)} />
                        </TableCell>
                        <TableCell className={cn("p-0 border-r border-slate-100", !enabledCols.weekly_evaluation && "bg-slate-100/50 opacity-50 pointer-events-none")}>
                            <ScoreSelect value={student.weekly_evaluation} max={MAX_SCORES.weekly_evaluation} onChange={(v) => handleScoreChange(student.student_id, 'weekly_evaluation', v)} />
                        </TableCell>
                        <TableCell className={cn("p-0 border-r border-slate-100", !enabledCols.extra_points && "bg-slate-100/50 opacity-50 pointer-events-none")}>
                            <ScoreSelect value={student.extra_points} max={10} onChange={(v) => handleScoreChange(student.student_id, 'extra_points', v)} />
                        </TableCell>

                        <TableCell className="p-2 text-center font-bold text-slate-800 border-r border-slate-100 bg-white text-[13px]">
                            {calculateTotal(student)}
                        </TableCell>
                          <TableCell className={cn(
                             "p-2 text-center font-black sticky right-0 z-30 shadow-[-4px_0_10px_-4px_rgba(0,0,0,0.1)] text-[13px] bg-white",
                         )}>
                            <Badge className={cn("font-black border-0 shadow-sm", getPercentColor(percent))}>
                                {percent}%
                            </Badge>
                        </TableCell>
                    </TableRow>
                    );
                })}
              </TableBody>
            </Table>
            )}
        </div>
      </Card>
    </div>
  );
}
