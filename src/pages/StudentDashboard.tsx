import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Progress } from "../components/ui/progress";
import CourseCard from "../components/CourseCard";
import type { Course, DashboardStats, RecentActivity, StudentProgressOverview } from "../types";
import { Clock, BookOpen, LineChart, CheckCircle, Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import apiClient from "../services/api";

interface StudentDashboardProps {
  firstName: string;
  stats: DashboardStats;
  recentCourses: Course[];
  recentActivity?: RecentActivity[] | any[];
  onContinueCourse: (id: string) => void;
  onGoToAllCourses: () => void;
}

export default function StudentDashboard({
  firstName,
  stats,
  recentCourses,
  recentActivity = [],
  onContinueCourse,
  onGoToAllCourses,
}: StudentDashboardProps) {
  const [progressData, setProgressData] = useState<StudentProgressOverview | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      setIsLoadingProgress(true);
      const data = await apiClient.getStudentProgressOverview();
      setProgressData(data);
    } catch (error) {
      console.error('Failed to load progress data:', error);
    } finally {
      setIsLoadingProgress(false);
    }
  };

  const coursesCount = progressData?.total_courses ?? stats?.courses_count ?? 0;
  const totalStudyHours = progressData 
    ? Math.round((progressData.total_time_spent_minutes / 60) * 10) / 10
    : Math.round(((stats?.total_study_time ?? 0) / 60) * 10) / 10;
  const overallProgress = progressData?.overall_completion_percentage ?? stats?.overall_progress ?? 0;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-8">
      <Card className="border-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <CardHeader className="p-5 sm:p-6">
          <CardTitle className="text-2xl sm:text-3xl">Welcome back, {firstName}!</CardTitle>
          <CardDescription className="text-white/80 text-sm sm:text-base">
            Continue your learning journey with Master Education
          </CardDescription>
        </CardHeader>
        <CardFooter className="p-5 sm:p-6 pt-0">
          <Button onClick={onGoToAllCourses} variant="secondary">
            Go to courses
          </Button>
        </CardFooter>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-2">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="rounded-md bg-blue-100 text-blue-700 p-3">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="text-3xl font-bold">{coursesCount}</div>
              <div className="text-muted-foreground text-sm">My courses</div>
              {progressData && (
                <div className="text-xs text-green-600 mt-1">
                  {progressData.completed_lessons}/{progressData.total_lessons} lessons completed
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="rounded-md bg-amber-100 text-amber-700 p-3">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <div className="text-3xl font-bold">{totalStudyHours}h</div>
              <div className="text-muted-foreground text-sm">Study time</div>
              {progressData && (
                <div className="text-xs text-blue-600 mt-1">
                  {progressData.total_time_spent_minutes} minutes total
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="rounded-md bg-emerald-100 text-emerald-700 p-3">
              <LineChart className="h-6 w-6" />
            </div>
            <div>
              <div className="text-3xl font-bold">{overallProgress}%</div>
              <div className="text-muted-foreground text-sm">Average progress</div>
              {progressData && (
                <div className="text-xs text-emerald-600 mt-1">
                  {progressData.completed_steps}/{progressData.total_steps} steps completed
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="courses" className="mt-4">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="mt-4">
          {isLoadingProgress ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Loading progress...</CardTitle>
                <CardDescription>
                  Loading your course progress information.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : progressData?.courses && progressData.courses.length > 0 ? (
            <div className="space-y-6">
              {/* Course Progress Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {progressData.courses.map((course) => (
                  <Card key={course.course_id} className="hover:shadow-lg transition-shadow overflow-hidden">
                    {/* Course Image */}
                    {course.cover_image_url ? (
                      <div className="relative h-48 bg-gray-200">
                        <img
                          src={(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000') + course.cover_image_url}
                          alt={course.course_title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.parentElement!.style.display = 'none';
                          }}
                        />
                        {/* Progress Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                          <div className="flex items-center justify-between text-white">
                            <span className="text-sm font-medium">Progress</span>
                            <span className="text-sm font-bold">{course.completion_percentage}%</span>
                          </div>
                          <Progress 
                            value={course.completion_percentage} 
                            className="h-1 mt-2"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <div className="text-center text-white">
                          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-80" />
                          <div className="text-sm font-medium opacity-90">{course.course_title}</div>
                        </div>
                        {/* Progress Overlay */}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                          <div className="flex items-center justify-between text-white">
                            <span className="text-sm font-medium">Progress</span>
                            <span className="text-sm font-bold">{course.completion_percentage}%</span>
                          </div>
                          <Progress 
                            value={course.completion_percentage} 
                            className="h-1 mt-2"
                          />
                        </div>
                      </div>
                    )}
                    
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg truncate">{course.course_title}</CardTitle>
                      <CardDescription className="text-sm">
                        Teacher: {course.teacher_name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progress Bar - Only show if no image */}
                      {!course.cover_image_url && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Course progress</span>
                            <span className={`font-medium ${getProgressColor(course.completion_percentage)}`}>
                              {course.completion_percentage}%
                            </span>
                          </div>
                          <Progress 
                            value={course.completion_percentage} 
                            className="h-2"
                          />
                        </div>
                      )}
                      {/* Continue Button */}
                      <Button 
                        onClick={() => onContinueCourse(course.course_id.toString())}
                        className="w-full"
                        variant={course.completion_percentage === 100 ? "outline" : "default"}
                      >
                        {course.completion_percentage === 100 ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Course completed
                          </>
                        ) : (
                          <>
                            <Target className="w-4 h-4 mr-2" />
                            Continue learning
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>No available courses</CardTitle>
                <CardDescription>
                  It looks like you don't have any courses yet. Go to the catalog to start learning.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button onClick={onGoToAllCourses}>Find course</Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          {isLoadingProgress ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Loading activity...</CardTitle>
                <CardDescription>
                  Loading your activity information.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : progressData ? (
            <div className="space-y-6">

              {/* Course Progress Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed course progress</CardTitle>
                </CardHeader>
                <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Teacher</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead>Lessons</TableHead>
                        <TableHead>Steps</TableHead>
                        <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                      {progressData.courses.map((course) => (
                        <TableRow key={course.course_id}>
                          <TableCell className="font-medium">{course.course_title}</TableCell>
                          <TableCell>{course.teacher_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={course.completion_percentage} 
                                className="w-16 h-2"
                              />
                              <span className={`text-sm font-medium ${getProgressColor(course.completion_percentage)}`}>
                                {course.completion_percentage}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {course.completed_lessons}/{course.total_lessons}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {course.completed_steps}/{course.total_steps}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-gray-600">
                              {course.time_spent_minutes} min
                            </span>
                          </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>No activity yet</CardTitle>
                <CardDescription>
                  Your recent activity will be displayed here: completed lessons, submitted assignments, etc.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="outline" onClick={onGoToAllCourses}>Go to courses</Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}


