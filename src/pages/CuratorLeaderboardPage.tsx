import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { 
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';
import apiClient, { getCuratorGroups } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { toast } from '../components/Toast';
import { updateAttendance } from '../services/api';
import ScheduleGenerator from '../components/ScheduleGenerator';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

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
    <div className="p-4 w-full h-full bg-white space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
            Class Leaderboard
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
             <div className="flex items-center border rounded-md overflow-hidden bg-white h-8">
                <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-full w-8 rounded-none border-r hover:bg-gray-50"
                    onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
                    disabled={currentWeek <= 1}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="px-3 text-sm font-medium min-w-[3rem] text-center">W{currentWeek}</div>
                <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-full w-8 rounded-none border-l hover:bg-gray-50"
                    onClick={() => setCurrentWeek(currentWeek + 1)}
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>

            <div className=" w-[200px]">
                <Select 
                    value={selectedGroupId?.toString() || ''} 
                    onValueChange={(value) => setSelectedGroupId(Number(value))}
                >
                    <SelectTrigger className="h-8 rounded-md border-gray-300">
                        <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                        {groups.map(g => (
                            <SelectItem key={g.id} value={g.id.toString()}>
                                {g.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            
            {/* Schedule Generator Modal */}
            <ScheduleGenerator 
                groupId={selectedGroupId}
                open={isScheduleModalOpen}
                onOpenChange={setIsScheduleModalOpen}
                onSuccess={() => loadLeaderboard()}
                trigger={
                    <Button variant="outline" size="sm" className="h-8 gap-2">
                        <CalendarIcon className="w-3.5 h-3.5" />
                        Generate Schedule
                    </Button>
                }
            />
            
            <Button 
                onClick={handleSaveChanges} 
                disabled={changedEntries.size === 0 || isSaving}
                size="sm"
                className={cn(
                    "h-8 transition-colors rounded-md font-medium",
                    changedEntries.size > 0 ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-100 text-gray-400"
                )}
            >
                {isSaving ? (
                    <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Saving</>
                ) : (
                    <><Save className="w-3 h-3 mr-2" /> Save ({changedEntries.size})</>
                )}
            </Button>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="border border-gray-300 overflow-x-auto">
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
                        Student
                    </TableHead>
                    {/* Lesson & Homework Columns */}
                    {[1, 2, 3].map(i => (
                        <TableHead key={`lesson-${i}`} className="p-0 text-center border-r border-gray-300 h-auto min-w-[100px] align-top bg-gray-100">
                            <div className="flex flex-col h-full">
                                <div className="py-1 border-b border-gray-300 font-semibold text-gray-700 bg-gray-200/50">
                                    Lesson {i}
                                </div>
                                <div className="flex flex-1">
                                    <div className="flex-1 py-1 text-[10px] font-medium text-gray-500 border-r border-gray-300">
                                        Class
                                    </div>
                                    <div className="flex-1 py-1 text-[10px] font-medium text-gray-500 bg-gray-50">
                                        HW
                                    </div>
                                </div>
                            </div>
                        </TableHead>
                    ))}
                    <TableHead className="text-center font-semibold p-2 w-20 text-gray-700 bg-gray-100 border-r border-gray-300 align-top whitespace-normal leading-tight">
                        <ColumnToggle enabled={enabledCols.curator_hour} onToggle={() => setEnabledCols(p => ({...p, curator_hour: !p.curator_hour}))} />
                        Curator<br/>Hour
                    </TableHead>
                    <TableHead className="text-center font-semibold p-2 w-20 text-gray-700 bg-gray-100 border-r border-gray-300 align-middle whitespace-normal leading-tight">Mock<br/>Exam</TableHead>
                    <TableHead className="text-center font-semibold p-2 w-20 text-gray-700 bg-gray-100 border-r border-gray-300 align-top whitespace-normal leading-tight">
                        <ColumnToggle enabled={enabledCols.study_buddy} onToggle={() => setEnabledCols(p => ({...p, study_buddy: !p.study_buddy}))} />
                        Study<br/>Buddy
                    </TableHead>
                    <TableHead className="text-center font-semibold p-2 w-20 text-gray-700 bg-gray-100 border-r border-gray-300 align-top whitespace-normal leading-tight">
                        <ColumnToggle enabled={enabledCols.self_reflection_journal} onToggle={() => setEnabledCols(p => ({...p, self_reflection_journal: !p.self_reflection_journal}))} />
                        Journal
                    </TableHead>
                    <TableHead className="text-center font-semibold p-2 w-20 text-gray-700 bg-gray-100 border-r border-gray-300 align-top whitespace-normal leading-tight">
                        <ColumnToggle enabled={enabledCols.weekly_evaluation} onToggle={() => setEnabledCols(p => ({...p, weekly_evaluation: !p.weekly_evaluation}))} />
                        Weekly<br/>Eval
                    </TableHead>
                    <TableHead className="text-center font-semibold p-2 w-20 text-gray-700 bg-gray-100 border-r border-gray-300 align-top whitespace-normal leading-tight">
                        <ColumnToggle enabled={enabledCols.extra_points} onToggle={() => setEnabledCols(p => ({...p, extra_points: !p.extra_points}))} />
                        Extra
                    </TableHead>
                    
                    <TableHead className="text-center font-bold p-2 w-16 text-gray-800 bg-gray-100 border-r border-gray-300 align-middle">Total</TableHead>
                    <TableHead className="text-center font-bold p-2 w-16 sticky right-0 z-40 bg-gray-100 align-middle shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((student, index) => {
                    const percent = calculatePercent(student);
                    return (
                    <TableRow key={student.student_id} className="hover:bg-blue-50/50 border-b border-gray-300 h-8">
                        <TableCell className="p-2 sticky left-0 z-30 bg-white border-r border-gray-300">
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] text-gray-400 w-4 text-right font-mono">{index + 1}</span>
                                <span className="truncate max-w-[150px] font-medium text-gray-900" title={student.student_name}>{student.student_name}</span>
                            </div>
                        </TableCell>
                        
                        {[1, 2, 3].map(i => {
                            const lessonKey = `lesson_${i}` as keyof LeaderboardEntry;
                            const hwKey = `hw_lesson_${i}` as keyof LeaderboardEntry;
                            const hwScore = student[hwKey] as number | null;
                            
                            return (
                                <TableCell key={i} className="p-0 border-r border-gray-300">
                                    <div className="flex w-full h-full items-stretch">
                                        <div className="flex-1 p-1">
                                            <AttendanceToggle 
                                                value={student[lessonKey] as number}
                                                maxScore={MAX_SCORES.lesson}
                                                onChange={(val) => handleScoreChange(student.student_id, lessonKey, val)}
                                            />
                                        </div>
                                        <div className="flex-1 border-l border-gray-300 bg-gray-50 flex items-center justify-center p-0">
                                            <div className={cn(
                                                "w-full text-center text-xs",
                                                hwScore && hwScore >= 80 ? "text-green-700 font-medium" : "text-gray-400"
                                            )}>
                                                {hwScore !== null ? hwScore : '-'}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>
                            );
                        })}

                        <TableCell className={cn("p-0 border-r border-gray-300", !enabledCols.curator_hour && "bg-gray-100 opacity-50 pointer-events-none")}>
                            <ScoreSelect value={student.curator_hour} max={MAX_SCORES.curator_hour} onChange={(v) => handleScoreChange(student.student_id, 'curator_hour', v)} />
                        </TableCell>
                        <TableCell className="p-0 border-r border-gray-300"><ScoreSelect value={student.mock_exam} max={MAX_SCORES.mock_exam} onChange={(v) => handleScoreChange(student.student_id, 'mock_exam', v)} /></TableCell>
                        <TableCell className={cn("p-0 border-r border-gray-300", !enabledCols.study_buddy && "bg-gray-100 opacity-50 pointer-events-none")}>
                            <AttendanceToggle 
                                value={student.study_buddy} 
                                maxScore={MAX_SCORES.study_buddy}
                                onChange={(v) => handleScoreChange(student.student_id, 'study_buddy', v)} 
                            />
                        </TableCell>
                        <TableCell className={cn("p-0 border-r border-gray-300", !enabledCols.self_reflection_journal && "bg-gray-100 opacity-50 pointer-events-none")}>
                            <ScoreSelect value={student.self_reflection_journal} max={MAX_SCORES.self_reflection_journal} onChange={(v) => handleScoreChange(student.student_id, 'self_reflection_journal', v)} />
                        </TableCell>
                        <TableCell className={cn("p-0 border-r border-gray-300", !enabledCols.weekly_evaluation && "bg-gray-100 opacity-50 pointer-events-none")}>
                            <ScoreSelect value={student.weekly_evaluation} max={MAX_SCORES.weekly_evaluation} onChange={(v) => handleScoreChange(student.student_id, 'weekly_evaluation', v)} />
                        </TableCell>
                        <TableCell className={cn("p-0 border-r border-gray-300", !enabledCols.extra_points && "bg-gray-100 opacity-50 pointer-events-none")}>
                            <ScoreSelect value={student.extra_points} max={10} onChange={(v) => handleScoreChange(student.student_id, 'extra_points', v)} />
                        </TableCell>

                        <TableCell className="p-2 text-center font-semibold text-gray-900 border-r border-gray-300 bg-white">
                            {calculateTotal(student)}
                        </TableCell>
                         <TableCell className={cn(
                             "p-2 text-center font-bold sticky right-0 z-30 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]",
                             getPercentColor(percent)
                         )}>
                            {percent}%
                        </TableCell>
                    </TableRow>
                    );
                })}
              </TableBody>
            </Table>
            )}
      </div>
    </div>
  );
}
