import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import type { User, Group } from '../types';
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
  Calendar
} from 'lucide-react';
import Loader from '../components/Loader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

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
                const progressResponse = await apiClient.getStudentProgress(student.id);
                const progress = progressResponse || [];
                
                const totalCourses = progress.length;
                const completedCourses = progress.filter(p => p.completion_percentage >= 100).length;
                const averageProgress = totalCourses > 0 
                  ? progress.reduce((sum, p) => sum + p.completion_percentage, 0) / totalCourses 
                  : 0;
                
                const lastActivity = progress.length > 0 
                  ? Math.max(...progress.map(p => new Date(p.last_accessed || 0).getTime()))
                  : null;
                
                return {
                  studentId: student.id,
                  stats: {
                    total_courses: totalCourses,
                    completed_courses: completedCourses,
                    average_progress: averageProgress,
                    last_activity: lastActivity ? new Date(lastActivity).toISOString() : null
                  }
                };
              } catch (error) {
                console.error(`Failed to load stats for student ${student.id}:`, error);
                return {
                  studentId: student.id,
                  stats: {
                    total_courses: 0,
                    completed_courses: 0,
                    average_progress: 0,
                    last_activity: null
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
          <Button
            onClick={loadTeacherGroups}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
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
                              Courses
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Progress
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Last Activity
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
                                  <div className="text-sm text-gray-900">
                                    {stats?.total_courses || 0} total
                                  </div>
                                  <div className="text-sm text-gray-500">
                                    {stats?.completed_courses || 0} completed
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <div className="flex items-center">
                                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                      <div 
                                        className="bg-blue-600 h-2 rounded-full" 
                                        style={{ width: `${stats?.average_progress || 0}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-sm text-gray-900">
                                      {stats?.average_progress?.toFixed(1) || 0}%
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {formatLastActivity(stats?.last_activity || null)}
                                </td>
                                <td className="px-4 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    student.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {student.is_active ? 'Active' : 'Inactive'}
                                  </span>
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
