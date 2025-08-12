
interface CourseCardData {
  id: string;
  title: string;
  description?: string;
  image?: string;
  teacher?: string;
  modulesCount?: number;
  progress: number;
  status?: 'not-started' | 'in-progress' | 'completed' | string;
}

interface CourseCardProps {
  course: CourseCardData;
  onContinue: (courseId: string) => void;
}

export default function CourseCard({ course, onContinue }: CourseCardProps) {
  return (
    <div className="card overflow-hidden flex flex-col">
      {course.image && (
        <img
          src={course.image}
          alt={course.title}
          className="w-full h-48 object-cover"
        />
      )}
      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-2xl font-semibold mb-2">{course.title}</h3>
        <p className="text-gray-600 text-sm mb-4">{course.description}</p>
        <div className="flex items-center text-gray-700 text-sm mb-4 space-x-1">
          <span className="mr-1">👤</span>
          <span>By {course.teacher}</span>
          <span className="mx-1">|</span>
          <span>{course.modulesCount} modules</span>
        </div>
        <div className="flex items-center mb-4">
          <span className="text-gray-500 text-sm mr-3">Progress</span>
          <div className="flex-1 bg-blue-100 h-2 rounded-full overflow-hidden">
            <div
              className="bg-blue-600 h-2"
              style={{ width: `${course.progress}%` }}
            />
          </div>
          <span className="text-gray-700 text-sm ml-3">{course.progress}%</span>
        </div>
        <div className="flex items-center justify-between mt-auto">
          <span className={`text-xs px-2 py-1 rounded-full ${course.status === 'completed' ? 'bg-green-100 text-green-800' : course.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>{course.status?.replace('-', ' ')}</span>
          <button onClick={() => onContinue(course.id)} className="btn-primary text-center rounded-xl">
            {course.status === 'not-started' ? 'Start' : course.status === 'completed' ? 'Review' : 'Continue Learning'}
          </button>
        </div>
      </div>
    </div>
  );
} 