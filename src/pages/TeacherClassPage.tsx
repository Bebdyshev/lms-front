import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import type { User, Group, StudentProgressOverview } from '../types';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Search, 
  RefreshCw,
  ChevronDown,
  ChevronRight,
  User as UserIcon,
  Mail,
  Calendar,
  Clock,
  CheckCircle,
  Target
} from 'lucide-react';
import Loader from '../components/Loader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';

interface TeacherGroup extends Group {
  students: User[];
  total_students: number;
  active_students: number;
  average_progress: number;
  is_expanded?: boolean;
}

interface StudentStats {
  total_courses: number;
  completed_courses: number;
  average_progress: number;
  last_activity: string | null;
  // New detailed progress fields
  total_lessons: number;
  completed_lessons: number;
  total_steps: number;
  completed_steps: number;
  total_time_spent_minutes: number;
  overall_completion_percentage: number;
}

export default function TeacherClassPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<TeacherGroup | null>(null);
  const [studentStats, setStudentStats] = useState<{ [key: string]: StudentStats }>({});

  useEffect(() => {
    loadTeacherGroups();
  }, []);

  const loadTeacherGroups = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Загружаем группы учителя (уже содержат студентов)
      const groupsData = await apiClient.getTeacherGroups();
      const teacherGroups = groupsData || [];
      
      console.log('Loaded teacher groups:', teacherGroups);
      
      // Обогащаем данные о группах
      const enrichedGroups: TeacherGroup[] = await Promise.all(
        teacherGroups.map(async (group) => {
          try {
            console.log(`Processing group ${group.id}: ${group.name}`);
            
            // Используем студентов, которые уже пришли с группой
            const students = group.students || [];
            
            console.log(`Found ${students.length} students in group ${group.id}`);
            
            // Получаем статистику для каждого студента
            const statsPromises = students.map(async (student) => {
              try {
                // Use new detailed progress endpoint for specific student
                const progressOverview = await apiClient.getStudentProgressOverviewById(student.id.toString());
                
                const stats = {
                  total_courses: progressOverview.total_courses,
                  completed_courses: progressOverview.courses.filter(c => c.completion_percentage >= 100).length,
                  average_progress: progressOverview.overall_completion_percentage,
                  last_activity: null, // Would need to be calculated from step progress
                  // New detailed fields
                  total_lessons: progressOverview.total_lessons,
                  completed_lessons: progressOverview.completed_lessons,
                  total_steps: progressOverview.total_steps,
                  completed_steps: progressOverview.completed_steps,
                  total_time_spent_minutes: progressOverview.total_time_spent_minutes,
                  overall_completion_percentage: progressOverview.overall_completion_percentage
                };
                
                return {
                  studentId: student.id,
                  stats
                };
              } catch (error) {
                console.error(`Failed to load stats for student ${student.id}:`, error);
                return {
                  studentId: student.id,
                  stats: {
                    total_courses: 0,
                    completed_courses: 0,
                    average_progress: 0,
                    last_activity: null,
                    total_lessons: 0,
                    completed_lessons: 0,
                    total_steps: 0,
                    completed_steps: 0,
                    total_time_spent_minutes: 0,
                    overall_completion_percentage: 0
                  }
                };
              }
            });
            
            const studentStats = await Promise.all(statsPromises);
            const statsMap = studentStats.reduce((acc, { studentId, stats }) => {
              acc[studentId] = stats;
              return acc;
            }, {} as { [key: string]: StudentStats });
            
            setStudentStats(prev => ({ ...prev, ...statsMap }));
            
            const activeStudents = students.filter(s => s.is_active).length;
            const totalProgress = students.reduce((sum, student) => {
              const stats = statsMap[student.id];
              return sum + (stats?.average_progress || 0);
            }, 0);
            const averageProgress = students.length > 0 ? totalProgress / students.length : 0;
            
            return {
              ...group,
              students,
              total_students: students.length,
              active_students: activeStudents,
              average_progress: averageProgress,
              is_expanded: false
            };
          } catch (error) {
            console.error(`Failed to process group ${group.id}:`, error);
            // Возвращаем группу без студентов, но с ошибкой
            return {
              ...group,
              students: group.students || [],
              total_students: group.students?.length || 0,
              active_students: group.students?.filter(s => s.is_active).length || 0,
              average_progress: 0,
              is_expanded: false
            };
          }
        })
      );
      
      setGroups(enrichedGroups);
    } catch (error) {
      console.error('Failed to load teacher groups:', error);
      setError('Failed to load class data');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGroupExpansion = (groupId: number) => {
    setGroups(prev => prev.map(group => 
      group.id === groupId 
        ? { ...group, is_expanded: !group.is_expanded }
        : group
    ));
  };

  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.students.some(student => 
      (student.name || student.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const totalStudents = groups.reduce((sum, group) => sum + group.total_students, 0);
  const totalActiveStudents = groups.reduce((sum, group) => sum + group.active_students, 0);
  const overallAverageProgress = groups.length > 0 
    ? groups.reduce((sum, group) => sum + group.average_progress, 0) / groups.length 
    : 0;

  const formatLastActivity = (lastActivity: string | null) => {
    if (!lastActivity) return 'Never';
    const date = new Date(lastActivity);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <GraduationCap className="w-8 h-8 mr-3 text-blue-600" />
            My Class
          </h1>
          <p className="text-gray-600 mt-1">Manage and monitor your students</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/teacher/courses')}
            variant="outline"
          >
            Back to Courses
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Groups</p>
                <p className="text-2xl font-bold text-gray-900">{groups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Students</p>
                <p className="text-2xl font-bold text-gray-900">{totalActiveStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Progress</p>
                <p className="text-2xl font-bold text-gray-900">{overallAverageProgress.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search groups or students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Groups and Students */}
      {isLoading ? (
        <div className="text-center py-12">
          <Loader size="lg" animation="spin" color="#2563eb" />
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-800">Error loading class data</h3>
            <p className="text-red-600">{error}</p>
            <button 
              onClick={loadTeacherGroups}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="text-center py-12">
          <GraduationCap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No groups found</h3>
          <p className="text-gray-600">
            {searchQuery ? 'No groups or students match your search.' : 'You don\'t have any groups assigned yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map((group) => (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleGroupExpansion(group.id)}
                      className="p-0 h-6 w-6"
                    >
                      {group.is_expanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </Button>
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      {group.description && (
                        <p className="text-sm text-gray-600 mt-1">{group.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {group.total_students} students
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {group.average_progress.toFixed(1)}% avg
                    </span>
                  </div>
                </div>
              </CardHeader>
              
              {group.is_expanded && (
                <CardContent>
                  {group.students.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No students in this group</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Student
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Overall Progress
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Lessons
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Steps
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Time Spent
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {group.students.map((student) => {
                            const stats = studentStats[student.id];
                            return (
                              <tr key={student.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {student.name || student.full_name}
                                    </div>
                                    <div className="text-sm text-gray-500">{student.email}</div>
                                    {student.student_id && (
                                      <div className="text-xs text-gray-400">ID: {student.student_id}</div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <Progress 
                                      value={stats?.overall_completion_percentage || 0} 
                                      className="w-20 h-2"
                                    />
                                    <span className="text-sm font-medium text-gray-900">
                                      {stats?.overall_completion_percentage?.toFixed(1) || 0}%
                                    </span>
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    {stats?.total_courses || 0} courses
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {stats?.completed_lessons || 0}/{stats?.total_lessons || 0}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {stats?.total_lessons ? ((stats.completed_lessons / stats.total_lessons) * 100).toFixed(1) : 0}% complete
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">
                                    {stats?.completed_steps || 0}/{stats?.total_steps || 0}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {stats?.total_steps ? ((stats.completed_steps / stats.total_steps) * 100).toFixed(1) : 0}% complete
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="flex items-center gap-1 text-sm text-gray-900">
                                    <Clock className="w-4 h-4" />
                                    {stats?.total_time_spent_minutes || 0} min
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {stats?.total_time_spent_minutes ? Math.floor(stats.total_time_spent_minutes / 60) : 0}h {stats?.total_time_spent_minutes ? stats.total_time_spent_minutes % 60 : 0}m
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <Badge variant={student.is_active ? "default" : "secondary"}>
                                    {student.is_active ? 'Active' : 'Inactive'}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
