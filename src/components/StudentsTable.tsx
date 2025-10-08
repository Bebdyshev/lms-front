import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Progress } from './ui/progress';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from './ui/table';
import { 
  Search, 
  Download, 
  Eye, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Users,
  Clock,
  BookOpen,
  BarChart3
} from 'lucide-react';

interface Student {
  student_id: number;
  student_name: string;
  student_email: string;
  student_number: string;
  groups: Array<{ id: number; name: string }>;
  active_courses_count: number;
  total_steps: number;
  completed_steps: number;
  completion_percentage: number;
  total_assignments: number;
  completed_assignments: number;
  assignment_score_percentage: number;
  total_study_time_minutes: number;
  daily_streak: number;
  last_activity_date: string | null;
}

interface StudentsTableProps {
  students: Student[];
  isLoading?: boolean;
  onViewStudent?: (studentId: number) => void;
  onViewDetailedProgress?: (studentId: number) => void;
  onExportStudent?: (studentId: number) => void;
  onExportAll?: () => void;
}

type SortField = 'student_name' | 'completion_percentage' | 'total_study_time_minutes' | 'daily_streak' | 'assignment_score_percentage';
type SortDirection = 'asc' | 'desc';

export default function StudentsTable({ 
  students, 
  isLoading = false, 
  onViewStudent, 
  onViewDetailedProgress,
  onExportStudent,
  onExportAll 
}: StudentsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('student_name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Normalize student data to ensure groups is always an array
  const normalizedStudents = students.map(student => ({
    ...student,
    groups: student.groups || []
  }));

  // Фильтрация студентов по поисковому запросу
  const filteredStudents = normalizedStudents.filter(student =>
    student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.groups && student.groups.some(group => group.name.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  // Сортировка студентов
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    if (sortField === 'student_name') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 80) return <Badge variant="default">Отлично</Badge>;
    if (percentage >= 60) return <Badge variant="secondary">Хорошо</Badge>;
    if (percentage >= 40) return <Badge variant="outline">Удовлетворительно</Badge>;
    return <Badge variant="destructive">Требует внимания</Badge>;
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`;
  };

  const formatLastActivity = (dateString: string | null) => {
    if (!dateString) return 'Никогда';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Вчера';
    if (diffDays < 7) return `${diffDays} дн. назад`;
    return date.toLocaleDateString('ru-RU');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Загрузка студентов...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Студенты ({students.length})
            </CardTitle>
          </div>
          <div className="flex gap-2">
            {onExportAll && (
              <Button variant="outline" onClick={onExportAll}>
                <Download className="w-4 h-4 mr-2" />
                Экспорт всех
              </Button>
            )}
          </div>
        </div>
        
        {/* Поиск */}
        <div className="flex items-center space-x-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени, email, номеру студента или группе..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
      </CardHeader>
      
      <CardContent>
        {sortedStudents.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Студенты не найдены' : 'Нет доступных студентов'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('student_name')}
                      className="h-auto p-0 font-semibold"
                    >
                      Студент {getSortIcon('student_name')}
                    </Button>
                  </TableHead>
                  <TableHead>Группы</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('completion_percentage')}
                      className="h-auto p-0 font-semibold"
                    >
                      Прогресс {getSortIcon('completion_percentage')}
                    </Button>
                  </TableHead>
                  <TableHead>Курсы</TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('assignment_score_percentage')}
                      className="h-auto p-0 font-semibold"
                    >
                      Задания {getSortIcon('assignment_score_percentage')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('total_study_time_minutes')}
                      className="h-auto p-0 font-semibold"
                    >
                      Время {getSortIcon('total_study_time_minutes')}
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button 
                      variant="ghost" 
                      onClick={() => handleSort('daily_streak')}
                      className="h-auto p-0 font-semibold"
                    >
                      Серия {getSortIcon('daily_streak')}
                    </Button>
                  </TableHead>
                  <TableHead>Последняя активность</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedStudents.map((student) => (
                  <TableRow key={student.student_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{student.student_name}</div>
                        <div className="text-sm text-muted-foreground">{student.student_email}</div>
                        {student.student_number && (
                          <div className="text-xs text-muted-foreground">ID: {student.student_number}</div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {student.groups.length > 0 ? (
                          student.groups.map((group) => (
                            <Badge key={group.id} variant="outline" className="text-xs">
                              {group.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">Нет группы</span>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Progress value={student.completion_percentage} className="w-16" />
                          <span className="text-sm font-medium">{Math.round(student.completion_percentage)}%</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {student.completed_steps}/{student.total_steps} шагов
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{student.active_courses_count}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          {student.completed_assignments}/{student.total_assignments}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.round(student.assignment_score_percentage)}% средний балл
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{formatTime(student.total_study_time_minutes)}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{student.daily_streak}</span>
                        <span className="text-xs text-muted-foreground">дн.</span>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <span className="text-sm">{formatLastActivity(student.last_activity_date)}</span>
                    </TableCell>
                    
                    <TableCell>
                      {getStatusBadge(student.completion_percentage)}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-1">
                        {onViewStudent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewStudent(student.student_id)}
                            title="Просмотреть профиль студента"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {onViewDetailedProgress && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewDetailedProgress(student.student_id)}
                            title="Детальный прогресс по шагам"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                        )}
                        {onExportStudent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onExportStudent(student.student_id)}
                            title="Экспорт отчета"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
