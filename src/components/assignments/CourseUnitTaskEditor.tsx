import { useState, useEffect } from 'react';
import { BookOpen, CheckCircle, ClipboardCheck } from 'lucide-react';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import apiClient from '../../services/api';

interface AssignedLessonInfo {
  lesson_id: number;
  assignment_id: number;
  assignment_title: string;
  group_id: number;
  group_name: string;
  created_at: string;
}

interface CourseUnitTaskEditorProps {
  content: any;
  onContentChange: (content: any) => void;
}

export default function CourseUnitTaskEditor({ content, onContentChange }: CourseUnitTaskEditorProps) {
  const [courses, setCourses] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState(content.course_id || '');
  const [selectedLessonIds, setSelectedLessonIds] = useState<number[]>(content.lesson_ids || []);
  const [loading, setLoading] = useState(false);
  const [assignedLessons, setAssignedLessons] = useState<Record<number, AssignedLessonInfo[]>>({});
  const [showAssignedOnly, setShowAssignedOnly] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourseId) {
      loadCourseData(selectedCourseId);
    }
  }, [selectedCourseId]);

  useEffect(() => {
    onContentChange({
      course_id: selectedCourseId ? parseInt(selectedCourseId) : null,
      lesson_ids: selectedLessonIds
    });
  }, [selectedCourseId, selectedLessonIds]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const coursesData = await apiClient.getCourses({ is_active: true });
      setCourses(coursesData);
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseData = async (courseId: string) => {
    try {
      setLoading(true);
      // Load lessons (lightweight — no steps) and assigned lessons in parallel
      const [lessonsData, assignedData] = await Promise.all([
        apiClient.getCourseLessons(courseId, true),
        apiClient.getAssignedLessonsForCourse(courseId),
      ]);

      setLessons(lessonsData);

      // Group assigned lessons by lesson_id
      const grouped: Record<number, AssignedLessonInfo[]> = {};
      for (const item of assignedData) {
        if (!grouped[item.lesson_id]) {
          grouped[item.lesson_id] = [];
        }
        grouped[item.lesson_id].push(item);
      }
      setAssignedLessons(grouped);
    } catch (error) {
      console.error('Failed to load course data:', error);
      setLessons([]);
      setAssignedLessons({});
    } finally {
      setLoading(false);
    }
  };

  const toggleLesson = (lessonId: number) => {
    if (selectedLessonIds.includes(lessonId)) {
      setSelectedLessonIds(selectedLessonIds.filter(id => id !== lessonId));
    } else {
      setSelectedLessonIds([...selectedLessonIds, lessonId]);
    }
  };

  const assignedCount = lessons.filter(l => assignedLessons[l.id]).length;
  const notAssignedCount = lessons.length - assignedCount;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="course-select">Select Course *</Label>
        <Select
          value={selectedCourseId}
          onValueChange={(value) => {
            setSelectedCourseId(value);
            setSelectedLessonIds([]); // Reset lesson selection when course changes
          }}
          disabled={loading}
        >
          <SelectTrigger>
            <SelectValue placeholder={loading ? "Loading courses..." : "Select a course"} />
          </SelectTrigger>
          <SelectContent>
            {courses.map(course => (
              <SelectItem key={course.id} value={course.id.toString()}>
                {course.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCourseId && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Select Lessons/Units to Complete *</Label>
            {assignedCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAssignedOnly(!showAssignedOnly)}
                className={`text-xs px-2 py-1 rounded-md transition-colors ${
                  showAssignedOnly 
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {showAssignedOnly ? 'Show all' : `${notAssignedCount} not assigned yet`}
              </button>
            )}
          </div>

          {/* Summary of assigned vs not assigned */}
          {assignedCount > 0 && !loading && (
            <div className="flex items-center gap-4 text-xs mb-2 px-1">
              <span className="flex items-center gap-1 text-amber-600">
                <ClipboardCheck className="w-3.5 h-3.5" />
                {assignedCount} already assigned
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-gray-500">
                {notAssignedCount} not assigned
              </span>
            </div>
          )}

          {loading ? (
            <div className="text-sm text-gray-500">Loading lessons...</div>
          ) : lessons.length === 0 ? (
            <div className="text-sm text-gray-500">No lessons found in this course</div>
          ) : (
            <div className="border rounded-lg divide-y max-h-80 overflow-y-auto">
              {lessons
                .filter(lesson => !showAssignedOnly || !assignedLessons[lesson.id])
                .map(lesson => {
                const isAssigned = !!assignedLessons[lesson.id];
                const assignments = assignedLessons[lesson.id] || [];
                
                return (
                  <div
                    key={lesson.id}
                    onClick={() => toggleLesson(lesson.id)}
                    className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedLessonIds.includes(lesson.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                          selectedLessonIds.includes(lesson.id)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                        }`}>
                          {selectedLessonIds.includes(lesson.id) && (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <BookOpen className="w-4 h-4 text-gray-600" />
                        <div>
                          <div className="font-medium text-sm">{lesson.title}</div>
                          {lesson.description && (
                            <div className="text-xs text-gray-500 line-clamp-1">{lesson.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {lesson.duration_minutes > 0 && (
                          <span className="text-xs text-gray-500">{lesson.duration_minutes} min</span>
                        )}
                        {isAssigned && (
                          <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2 py-0.5 whitespace-nowrap">
                            <ClipboardCheck className="w-3 h-3" />
                            assigned
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Show which homework already uses this lesson */}
                    {isAssigned && (
                      <div className="mt-1.5 ml-8 space-y-0.5">
                        {assignments.map((a, idx) => (
                          <div key={idx} className="text-xs text-amber-600/80 flex items-center gap-1">
                            <span>→</span>
                            <span className="font-medium">{a.assignment_title}</span>
                            {a.group_name && (
                              <span className="text-amber-500/70">({a.group_name})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {selectedLessonIds.length > 0 && (
            <div className="mt-2 text-sm text-gray-600">
              Selected: {selectedLessonIds.length} lesson{selectedLessonIds.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
