import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import { ClipboardList, Calendar, Clock, CheckCircle, AlertCircle, FileText, Download } from 'lucide-react';

interface AssignmentWithStatus {
  id: number;
  title: string;
  description?: string;
  lesson_id: number;
  group_id?: number;
  due_date?: string;
  created_at: string;
  lesson_title?: string;
  course_title?: string;
  file_url?: string;
  allowed_file_types?: string[];
  status?: 'not_submitted' | 'submitted' | 'graded' | 'overdue';
  score?: number;
  submitted_at?: string;
  graded_at?: string;
  has_file_submission?: boolean;
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<AssignmentWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'submitted' | 'graded' | 'overdue'>('all');

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError('');

      // Get all assignments for the student
      const assignmentData = await apiClient.getAssignments({});
      
      // Enhance assignments with status information
      const assignmentsWithStatus = await Promise.all(
        assignmentData.map(async (assignment: any) => {
          let status = 'not_submitted';
          let score = undefined;
          let submitted_at = undefined;
          let graded_at = undefined;
          let has_file_submission = false;

          try {
            // Try to get submission status for this assignment
            const submissions = await apiClient.getMySubmissions();
            const mySubmission = submissions.find((sub: any) => sub.user_id === user?.id);
            
            if (mySubmission) {
              if (mySubmission.graded_at) {
                status = 'graded';
                score = mySubmission.score;
                graded_at = mySubmission.graded_at;
              } else {
                status = 'submitted';
              }
              submitted_at = mySubmission.submitted_at;
              has_file_submission = !!mySubmission.file_url;
            } else if (assignment.due_date && new Date(assignment.due_date) < new Date()) {
              status = 'overdue';
            }
          } catch (err) {
            // If we can't get submission info, just use the assignment as-is
            console.warn('Could not load submission status for assignment', assignment.id, err);
          }

          return {
            ...assignment,
            status,
            score,
            submitted_at,
            graded_at,
            has_file_submission
          };
        })
      );

      setAssignments(assignmentsWithStatus);
    } catch (err) {
      setError('Failed to load assignments');
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    switch (filter) {
      case 'pending':
        return assignment.status === 'not_submitted';
      case 'submitted':
        return assignment.status === 'submitted';
      case 'graded':
        return assignment.status === 'graded';
      case 'overdue':
        return assignment.status === 'overdue';
      default:
        return true;
    }
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'graded':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'submitted':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (assignment: AssignmentWithStatus) => {
    const baseClasses = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium";
    
    switch (assignment.status) {
      case 'graded':
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            <CheckCircle className="w-3 h-3 mr-1" />
            Graded ({assignment.score}/100)
          </span>
        );
      case 'submitted':
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            <Clock className="w-3 h-3 mr-1" />
            Submitted
          </span>
        );
      case 'overdue':
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            <AlertCircle className="w-3 h-3 mr-1" />
            Overdue
          </span>
        );
      default:
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            <FileText className="w-3 h-3 mr-1" />
            Not Submitted
          </span>
        );
    }
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-6"></div>
          <div className="bg-white rounded-xl shadow p-6">
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Assignments</h1>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <h3 className="font-semibold text-red-800">Error</h3>
          </div>
          <p className="text-red-600 mt-1">{error}</p>
          <button 
            onClick={loadAssignments}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center">
          <ClipboardList className="w-8 h-8 mr-3 text-blue-600" />
          Assignments
        </h1>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg p-1 shadow-sm border border-gray-200 inline-flex">
        {[
          { key: 'all', label: 'All', count: assignments.length },
          { key: 'pending', label: 'Pending', count: assignments.filter(a => a.status === 'not_submitted').length },
          { key: 'submitted', label: 'Submitted', count: assignments.filter(a => a.status === 'submitted').length },
          { key: 'graded', label: 'Graded', count: assignments.filter(a => a.status === 'graded').length },
          { key: 'overdue', label: 'Overdue', count: assignments.filter(a => a.status === 'overdue').length }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <FileText className="w-6 h-6 text-gray-600 mr-2" />
            <div>
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-xl font-bold">{assignments.length}</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Clock className="w-6 h-6 text-blue-600 mr-2" />
            <div>
              <div className="text-sm text-gray-600">Pending</div>
              <div className="text-xl font-bold">
                {assignments.filter(a => a.status === 'not_submitted').length}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CheckCircle className="w-6 h-6 text-green-600 mr-2" />
            <div>
              <div className="text-sm text-gray-600">Completed</div>
              <div className="text-xl font-bold">
                {assignments.filter(a => a.status === 'graded').length}
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <AlertCircle className="w-6 h-6 text-red-600 mr-2" />
            <div>
              <div className="text-sm text-gray-600">Overdue</div>
              <div className="text-xl font-bold">
                {assignments.filter(a => a.status === 'overdue').length}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Download className="w-6 h-6 text-purple-600 mr-2" />
            <div>
              <div className="text-sm text-gray-600">With Files</div>
              <div className="text-xl font-bold">
                {assignments.filter(a => a.file_url || a.has_file_submission).length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filteredAssignments.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No assignments yet' : `No ${filter} assignments`}
            </h3>
            <p className="text-gray-600">
              {filter === 'all' 
                ? 'Assignments will appear here when they are created by your teachers.'
                : `You don't have any ${filter} assignments at the moment.`
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-6 py-3 font-medium">Assignment</th>
                  <th className="text-left px-6 py-3 font-medium">Lesson</th>
                  <th className="text-left px-6 py-3 font-medium">Due Date</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="text-left px-6 py-3 font-medium">Files</th>
                  <th className="text-left px-6 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map(assignment => (
                  <tr key={assignment.id} className="border-t hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{assignment.title}</div>
                        {assignment.description && (
                          <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {assignment.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {assignment.lesson_title || `Lesson #${assignment.lesson_id}`}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {assignment.due_date ? (
                        <div className={`flex items-center ${isOverdue(assignment.due_date) ? 'text-red-600' : ''}`}>
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(assignment.due_date).toLocaleDateString()}
                          {isOverdue(assignment.due_date) && (
                            <AlertCircle className="w-4 h-4 ml-1" />
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">No deadline</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(assignment)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {assignment.file_url && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            <Download className="w-3 h-3 mr-1" />
                            Has file
                          </span>
                        )}
                        {assignment.has_file_submission && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            <Download className="w-3 h-3 mr-1" />
                            Submitted
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/assignment/${assignment.id}`)}
                        className={`px-3 py-1.5 rounded text-xs font-medium ${
                          assignment.status === 'graded'
                            ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                        disabled={assignment.status === 'graded'}
                      >
                        {assignment.status === 'graded' ? 'View' : 
                         assignment.status === 'submitted' ? 'View' : 'Submit'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


