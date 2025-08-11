import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import { fetchCourses } from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    fetchCourses().then(setCourses);
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Courses</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(c => (
          <Card
            key={c.id}
            image={c.image}
            title={c.title}
            description={c.description}
            teacher={c.teacher}
            duration={c.duration}
            level={c.level}
            rating={c.rating}
            students={c.students}
            actionText="View Modules"
            onAction={() => nav(`/course/${c.id}`)}
          />
        ))}
      </div>
    </div>
  );
}
