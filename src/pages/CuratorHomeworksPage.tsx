import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import Skeleton from '../components/Skeleton';
import { 
  FileText, 
  Calendar, 
  Users, 
  Search,
  ArrowRight
} from 'lucide-react';
import { Input } from '../components/ui/input';

interface HomeworkStats {
  id: number;
  title: string;
  course_title: string;
  due_date: string | null;
  max_score: number;
  total_students: number;
  submitted_count: number;
  graded_count: number;
  average_score: number;
}

export default function CuratorHomeworksPage() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<HomeworkStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getCuratorAssignmentsAnalytics();
      setAssignments(data);
    } catch (error) {
      console.error('Failed to load homework analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    a.course_title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Homework Performance</h1>
          <p className="text-gray-600 mt-1">
            Analyze student performance across all assignments
          </p>
        </div>
        
        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search assignments..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredAssignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center p-6">
            <FileText className="w-12 h-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No assignments found</h3>
            <p className="text-gray-500 max-w-sm mt-1">
              There are no active assignments in the courses managed by your groups.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAssignments.map((assignment) => {
            const submissionRate = Math.round((assignment.submitted_count / (assignment.total_students || 1)) * 100);
            
            return (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow group">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    
                    {/* Assignment Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {assignment.course_title}
                        </Badge>
                        {assignment.due_date && new Date(assignment.due_date) < new Date() && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                            Passed
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {assignment.title}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1.5" />
                          {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : 'No deadline'}
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1.5" />
                          {assignment.total_students} Students
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap items-center gap-8">
                      {/* Submission Rate */}
                      <div className="flex flex-col items-center min-w-[100px]">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-2xl font-bold text-gray-900">{submissionRate}%</span>
                          <div className={`w-2 h-2 rounded-full ${submissionRate >= 80 ? 'bg-green-500' : submissionRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} />
                        </div>
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Submission Rate</span>
                        <span className="text-xs text-gray-400 mt-1">
                          {assignment.submitted_count} / {assignment.total_students}
                        </span>
                      </div>

                      {/* Avg Score */}
                      <div className="flex flex-col items-center min-w-[100px]">
                        <div className="text-2xl font-bold text-gray-900">{assignment.average_score}</div>
                        <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">Avg. Score</span>
                        <span className="text-xs text-gray-400 mt-1">
                          Max: {assignment.max_score}
                        </span>
                      </div>

                      {/* Action */}
                      <div>
                        <Button onClick={() => navigate(`/assignments/${assignment.id}/progress`)}>
                          View Details
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
