import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SummaryCard from '../components/SummaryCard';
import CourseCard from '../components/CourseCard';
import { fetchCourses } from '../services/api';
import Skeleton from '../components/Skeleton.jsx';

export default function DashboardPage() {
  const [courses, setCourses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses().then(setCourses);
  }, []);

  return (
    <div className="pl-32 pr-8 pt-4 space-y-8">
      <div>
        <h2 className="text-3xl font-bold">Welcome back, Fikrat!</h2>
        <p className="text-gray-600 text-base">Continue your learning journey with Master Education</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <SummaryCard
          icon="/assets/book.svg"
          value={courses.length}
          label="Enrolled Courses"
        />
        <SummaryCard
          icon="/assets/clock.svg"
          value="24h"
          label="Total Study Time"
        />
        <SummaryCard
          icon="/assets/chart.svg"
          value="68%"
          label="Avg. Progress"
        />
      </div>

      <div className="mt-12">
        <h3 className="text-2xl font-semibold mb-4">My Courses</h3>
        {courses.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="card p-6">
                <Skeleton className="h-40 mb-4" />
                <Skeleton className="h-6 w-1/2 mb-2" />
                <Skeleton className="h-4 w-2/3 mb-4" />
                <Skeleton className="h-3 w-full mb-4" />
                <Skeleton className="h-9 w-40" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                onContinue={id => navigate(`/course/${id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
