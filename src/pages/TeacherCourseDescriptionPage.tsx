import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../services/api';
import CourseSidebar from '../components/CourseSidebar';
import type { Course } from '../types';
import { Save, Upload, Image as ImageIcon } from 'lucide-react';
import { useUnsavedChangesWarning } from '../hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '../components/UnsavedChangesDialog';

export default function TeacherCourseDescriptionPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    estimated_duration_minutes: 0,
    cover_image_url: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Unsaved changes warning
  const { confirmLeave, cancelLeave, isBlocked } = useUnsavedChangesWarning({
    hasUnsavedChanges,
    message: 'You have unsaved changes in the course description. Are you sure you want to leave?',
    onConfirmLeave: () => {
      setHasUnsavedChanges(false);
    }
  });

  useEffect(() => {
    if (!courseId) return;
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    if (!courseId) return;
    
    try {
      const courseData = await apiClient.fetchCourseById(courseId);
      setCourse(courseData);
      setFormData({
        title: courseData.title || '',
        description: courseData.description || '',
        estimated_duration_minutes: courseData.estimated_duration_minutes || 0,
        cover_image_url: courseData.cover_image_url || ''
      });
    } catch (error) {
      console.error('Failed to load course data:', error);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    if (!courseId) return;
    
    setIsSaving(true);
    try {
      await apiClient.updateCourse(courseId, formData);
      setHasUnsavedChanges(false);
      // Reload course data to get updated information
      await loadCourseData();
    } catch (error) {
      console.error('Failed to save course:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // TODO: Implement actual image upload
      console.log('Image upload:', file);
      setHasUnsavedChanges(true);
    }
  };

  if (!course) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="flex gap-6 h-full">
      {/* Course Navigation Panel */}
      <div className="w-64 bg-white rounded-lg border flex-shrink-0 h-full">
        <CourseSidebar 
          courseTitle={course.title}
          courseId={courseId}
          coverImageUrl={course.image}
          isActive={course.is_active}
          onSave={handleSave}
          hasUnsavedChanges={hasUnsavedChanges}
          pendingChangesCount={hasUnsavedChanges ? 1 : 0}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Course Description</h1>
            <button
              onClick={handleSave}
              disabled={!hasUnsavedChanges || isSaving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                hasUnsavedChanges && !isSaving
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Course Title */}
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Course Title</h2>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter course title"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Course Description */}
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Course Description</h2>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Enter course description"
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Course Duration */}
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Course Duration</h2>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    value={formData.estimated_duration_minutes}
                    onChange={(e) => handleInputChange('estimated_duration_minutes', parseInt(e.target.value) || 0)}
                    placeholder="Duration in minutes"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-600">minutes</span>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Course Image */}
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Course Image</h2>
                <div className="space-y-4">
                  {/* Current Image */}
                  <div className="aspect-video bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {course.cover_image_url ? (
                      <img
                        src={(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000') + course.cover_image_url}
                        alt={course.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`${course.cover_image_url ? 'hidden' : ''} flex items-center justify-center`}>
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  </div>

                  {/* Upload Button */}
                  <div>
                    <label className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                      <Upload className="w-4 h-4" />
                      <span className="text-sm font-medium">Upload Image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <p className="text-xs text-gray-500">
                    Recommended size: 1200x675 pixels. Max file size: 5MB.
                  </p>
                </div>
              </div>

              {/* Course Status */}
              <div className="bg-white rounded-lg border p-6">
                <h2 className="text-lg font-semibold mb-4">Course Status</h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Status</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      course.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {course.is_active ? 'Active' : 'Draft'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Created</span>
                    <span className="text-sm text-gray-600">Dec 15, 2024</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Last Updated</span>
                    <span className="text-sm text-gray-600">2 hours ago</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Warning Dialog */}
      <UnsavedChangesDialog
        open={isBlocked}
        onConfirm={confirmLeave}
        onCancel={cancelLeave}
        title="Unsaved Course Description"
        description="You have unsaved changes to the course description. Are you sure you want to leave? Your changes will be lost."
      />
    </div>
  );
}
