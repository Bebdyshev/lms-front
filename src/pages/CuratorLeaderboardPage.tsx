import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Trophy, ChevronLeft, ChevronRight, Loader2, Users } from 'lucide-react';
import apiClient from '../services/api';
import { useAuth } from '../contexts/AuthContext';

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
  lesson_4: number;
  hw_lesson_4: number | null;
  lesson_5: number;
  hw_lesson_5: number | null;
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

export default function CuratorLeaderboardPage() {
  const { user } = useAuth();
  const [currentWeek, setCurrentWeek] = useState(1);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [savingMap, setSavingMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadGroups = async () => {
        try {
            const myGroups = await apiClient.getGroups();
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
    try {
        const result = await apiClient.getGroupLeaderboard(selectedGroupId, currentWeek);
        setData(result);
    } catch (e) {
        console.error("Failed to load leaderboard", e);
    } finally {
        setLoading(false);
    }
  };

  const calculateTotal = (entry: LeaderboardEntry) => {
    const hwScores = [
        entry.hw_lesson_1, entry.hw_lesson_2, entry.hw_lesson_3, 
        entry.hw_lesson_4, entry.hw_lesson_5
    ];
    
    // Treat null as 0 for HW
    const hwTotal = hwScores.reduce((acc, val) => (acc || 0) + (val || 0), 0) || 0;
    
    // Add manual lesson scores
    const lessonsTotal = 
        entry.lesson_1 + 
        entry.lesson_2 + 
        entry.lesson_3 + 
        entry.lesson_4 + 
        entry.lesson_5;

    const manualTotal = 
        entry.curator_hour + 
        entry.mock_exam + 
        entry.study_buddy + 
        entry.self_reflection_journal + 
        entry.weekly_evaluation + 
        entry.extra_points;
        
    return hwTotal + lessonsTotal + manualTotal;
  };
  
  const calculatePercent = (entry: LeaderboardEntry) => {
      // Assuming max score is roughly 600-700? 
      // HW: 500 max (assuming 100 each)
      // Lessons: 50 max (assuming 10 each?) or 100? Let's say 10.
      // Other manual: ~100?
      // For now, just return a percentage based on an arbitrary max or just the total if max is unknown.
      // Let's assume max possible is 600 for now.
      const total = calculateTotal(entry);
      return Math.round((total / 600) * 100); 
  };

  const handleScoreChange = (studentId: number, field: keyof LeaderboardEntry, value: string) => {
    const numValue = parseFloat(value) || 0;
    setData(prev => prev.map(item => 
        item.student_id === studentId ? { ...item, [field]: numValue } : item
    ));
  };

  const handleBlur = async (studentId: number, field: keyof LeaderboardEntry, value: number) => {
    if (!selectedGroupId) return;
    const key = `${studentId}-${field}`;
    setSavingMap(prev => ({ ...prev, [key]: true }));
    
    try {
        await apiClient.updateLeaderboardEntry({
            user_id: studentId,
            group_id: selectedGroupId,
            week_number: currentWeek,
            [field]: value
        });
    } catch (e) {
        console.error("Failed to save score", e);
    } finally {
        setSavingMap(prev => ({ ...prev, [key]: false }));
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Trophy className="w-8 h-8 text-yellow-500" />
            Class Leaderboard
          </h1>
          <p className="text-gray-500">Track weekly performance and engagement</p>
        </div>
        
        <div className="flex items-center gap-4">
            {/* Group Selector */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border shadow-sm">
                <Users className="w-4 h-4 text-gray-500" />
                <select 
                    className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer"
                    value={selectedGroupId || ''}
                    onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                >
                    {groups.map(g => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
            </div>

            {/* Week Selector */}
            <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-lg border shadow-sm">
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))}
                    disabled={currentWeek <= 1}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="font-medium min-w-[80px] text-center">Week {currentWeek}</div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setCurrentWeek(currentWeek + 1)}
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
            </div>
        </div>
      </div>

      <Card className="overflow-hidden border-0 shadow-lg">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {loading ? (
                <div className="p-12 flex justify-center text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                </div>
            ) : (
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50 text-gray-600 border-b border-gray-200">
                <tr>
                    <th className="p-3 text-left font-semibold sticky left-0 bg-gray-50 z-10 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Student</th>
                    {/* Lesson & Homework Columns */}
                    {[1, 2, 3, 4, 5].map(i => (
                        <th key={`lesson-${i}`} className="p-0 text-center border-r border-gray-200">
                            <div className="border-b border-gray-200 bg-gray-100 py-1 text-xs font-semibold text-gray-500">
                                Lesson {i}
                            </div>
                            <div className="flex divide-x divide-gray-200">
                                <div className="w-16 py-2 text-xs font-medium bg-orange-50/30 text-orange-800 text-center">Class</div>
                                <div className="w-16 py-2 text-xs font-medium bg-gray-50 text-gray-600 text-center">HW</div>
                            </div>
                        </th>
                    ))}
                    {/* Manual Columns */}
                    <th className="p-3 text-center font-medium w-24 bg-orange-50/50">Curator Hour</th>
                    <th className="p-3 text-center font-medium w-24 bg-orange-50/50">Mock Exam</th>
                    <th className="p-3 text-center font-medium w-24 bg-orange-50/50">Study Buddy</th>
                    <th className="p-3 text-center font-medium w-24 bg-orange-50/50">Journal</th>
                    <th className="p-3 text-center font-medium w-24 bg-orange-50/50">Weekly Eval</th>
                    <th className="p-3 text-center font-medium w-24 bg-orange-50/50">Extra Pts</th>
                    
                    <th className="p-3 text-center font-bold bg-gray-100 w-24">Overall</th>
                    <th className="p-3 text-center font-bold sticky right-0 bg-gray-100 z-10 w-24 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((student) => (
                    <tr key={student.student_id} className="hover:bg-gray-50/50 group">
                        <td className="p-3 sticky left-0 bg-white group-hover:bg-gray-50/50 z-10 border-r border-gray-100 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs text-blue-700 font-bold">
                                    {student.student_name.charAt(0)}
                                </div>
                                <span className="truncate max-w-[140px]" title={student.student_name}>{student.student_name}</span>
                            </div>
                        </td>
                        
                        {/* Lesson & Homework Scores */}
                        {[1, 2, 3, 4, 5].map(i => {
                            const lessonKey = `lesson_${i}` as keyof LeaderboardEntry;
                            const hwKey = `hw_lesson_${i}` as keyof LeaderboardEntry;
                            const hwScore = student[hwKey] as number | null;
                            
                            return (
                                <td key={i} className="p-0 border-r border-gray-100">
                                    <div className="flex h-full min-h-[40px] divide-x divide-gray-100">
                                        {/* Manual Lesson Score */}
                                        <div className="w-16 bg-orange-50/10">
                                             <div className="relative h-full flex items-center justify-center">
                                                <Input 
                                                    type="number" 
                                                    className="h-full w-full text-center bg-transparent border-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-blue-500 transition-all p-0 text-gray-700"
                                                    value={student[lessonKey] as number || ''}
                                                    onChange={(e) => handleScoreChange(student.student_id, lessonKey, e.target.value)}
                                                    onBlur={(e) => handleBlur(student.student_id, lessonKey, parseFloat(e.target.value) || 0)}
                                                    placeholder="-"
                                                />
                                                {savingMap[`${student.student_id}-${lessonKey}`] && (
                                                    <div className="absolute right-0 top-0">
                                                        <Loader2 className="w-2 h-2 animate-spin text-blue-500" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {/* Auto HW Score */}
                                        <div className="w-16 flex items-center justify-center bg-white">
                                            {hwScore !== null ? (
                                                <span className={`text-sm font-medium ${hwScore >= 80 ? "text-green-600" : "text-gray-600"}`}>
                                                    {hwScore}
                                                </span>
                                            ) : (
                                                <span className="text-gray-300 text-xs">-</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                            );
                        })}

                        {/* Manual Scores (Editable) */}
                        {[
                            'curator_hour', 'mock_exam', 'study_buddy', 
                            'self_reflection_journal', 'weekly_evaluation', 'extra_points'
                        ].map((field) => (
                            <td key={field} className="p-2 text-center bg-orange-50/10 border-r border-orange-100/50">
                                <div className="relative">
                                    <Input 
                                        type="number" 
                                        className="h-8 text-center bg-transparent border-transparent hover:bg-white hover:border-gray-200 focus:bg-white focus:border-blue-500 transition-all p-1"
                                        value={student[field as keyof LeaderboardEntry] as number || ''}
                                        onChange={(e) => handleScoreChange(student.student_id, field as keyof LeaderboardEntry, e.target.value)}
                                        onBlur={(e) => handleBlur(student.student_id, field as keyof LeaderboardEntry, parseFloat(e.target.value) || 0)}
                                        placeholder="0"
                                    />
                                    {savingMap[`${student.student_id}-${field}`] && (
                                        <div className="absolute right-1 top-2">
                                            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                                        </div>
                                    )}
                                </div>
                            </td>
                        ))}

                        <td className="p-3 text-center font-bold text-gray-700 bg-gray-50 border-l border-gray-200">
                            {calculateTotal(student)}
                        </td>
                         <td className="p-3 text-center font-bold text-blue-700 sticky right-0 bg-gray-50 group-hover:bg-gray-100/80 z-10 border-l border-gray-200">
                            {calculatePercent(student)}%
                        </td>
                    </tr>
                ))}
                {data.length === 0 && (
                    <tr>
                        <td colSpan={18} className="p-12 text-center text-gray-400">
                            No students found in this group.
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
