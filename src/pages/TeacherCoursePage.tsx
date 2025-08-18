import { useEffect, useState } from 'react';
import type React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import CourseSidebar from '../components/CourseSidebar';
import Modal from '../components/Modal.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';
import type { Course, CourseModule, Lesson, LessonContentType } from '../types';
import { ChevronDown, ChevronUp, MoreVertical, FileText, Video, HelpCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';

type CourseSection = 'overview' | 'description' | 'content';

interface SelectedModule {
  module: CourseModule;
  lectures: Lesson[];
}

interface ModuleForm {
  open: boolean;
  title: string;
  description?: string;
  id?: string;
}

interface LectureForm {
  open: boolean;
  title: string;
  type?: LessonContentType;
  videoUrl?: string;
  id?: string;
}

interface ConfirmDialog {
  open: boolean;
  action: (() => Promise<void>) | null;
}

export default function TeacherCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [activeSection, setActiveSection] = useState<CourseSection>('content');
  
  // Course Builder state
  const [mods, setMods] = useState<CourseModule[]>([]);
  const [selected, setSelected] = useState<SelectedModule | null>(null);
  const [moduleLectures, setModuleLectures] = useState<Map<string, Lesson[]>>(new Map());
  const [modForm, setModForm] = useState<ModuleForm>({ open: false, title: '', description: '' });
  const [lecForm, setLecForm] = useState<LectureForm>({ open: false, title: '', type: 'text' });
  const [confirm, setConfirm] = useState<ConfirmDialog>({ open: false, action: null });
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showInlineModuleForm, setShowInlineModuleForm] = useState(true);
  const [inlineModuleData, setInlineModuleData] = useState({ title: '', description: '' });
  const [inlineLectureData, setInlineLectureData] = useState({ title: '', type: 'text' as LessonContentType, videoUrl: '' });
  const [showInlineLectureForm, setShowInlineLectureForm] = useState<string | null>(null); // moduleId for which to show form
  const [pendingModules, setPendingModules] = useState<any[]>([]);
  const [pendingLectures, setPendingLectures] = useState<any[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    loadCourseData();
  }, [courseId]);

  // removed manual dropdown close handler; using shadcn DropdownMenu

  const loadCourseData = async () => {
    if (!courseId) return;
    
    try {
      const courseData = await apiClient.fetchCourseById(courseId);
      setCourse(courseData);
      
      // Load modules for course builder
      const modules = await apiClient.fetchModulesByCourse(courseId);
      setMods(modules);
      
      // Load lectures for all modules
      const lecturesMap = new Map<string, Lesson[]>();
      for (const module of modules) {
        const lectures = await apiClient.fetchLecturesByModule(String(module.id));
        lecturesMap.set(String(module.id), lectures);
      }
      setModuleLectures(lecturesMap);
      
      // If modules exist, select the first one
      if (modules[0]) {
        const lectures = lecturesMap.get(modules[0].id) || [];
        setSelected({ module: modules[0], lectures });
      }
      
      // Show inline form if no modules exist
      if (modules.length === 0) {
        setShowInlineModuleForm(true);
      } else {
        setShowInlineModuleForm(false);
      }
    } catch (error) {
      console.error('Failed to load course data:', error);
    }
  };

  const handleNavigation = (section: CourseSection) => {
    setActiveSection(section);
  };

  // Create unified display modules array
  const getDisplayModules = () => {
    const displayModules = [];
    
    // Create a map of updated modules for quick lookup
    const updatedModulesMap = new Map();
    for (const update of pendingUpdates) {
      const originalModule = mods.find(m => m.id === update.id);
      if (originalModule) {
        updatedModulesMap.set(update.id, {
          ...originalModule,
          title: update.title,
          description: update.description,
          isPending: true
        });
      }
    }
    
    // First, add all existing modules (including updated ones) in their original order
    for (const module of mods) {
      if (updatedModulesMap.has(module.id)) {
        // This module has been updated, add the updated version
        displayModules.push(updatedModulesMap.get(module.id));
      } else {
        // This module hasn't been updated, add the original
        displayModules.push(module);
      }
    }
    
    // Then add all pending modules (new modules) at the end
    displayModules.push(...pendingModules);
    
    return displayModules;
  };

  const onSelectModule = async (m: CourseModule) => {
    const lectures = await apiClient.fetchLecturesByModule(String(m.id));
    setSelected({ module: m, lectures });
    
    // Update lectures in the map
    setModuleLectures(prev => {
      const newMap = new Map(prev);
      newMap.set(String(m.id), lectures);
      return newMap;
    });
  };

  const onAddModule = () => {
    // Show inline form for creating new module
    setShowInlineModuleForm(true);
    setInlineModuleData({ title: '', description: '' });
  };

  const handleSaveInlineModule = () => {
    if (!inlineModuleData.title.trim()) return;
    
    const newModule = {
      id: `temp-${Date.now()}`,
      title: inlineModuleData.title.trim(),
      description: inlineModuleData.description.trim(),
      courseId: courseId,
      isPending: true
    };
    
    setPendingModules(prev => [...prev, newModule]);
    setInlineModuleData({ title: '', description: '' });
    setHasUnsavedChanges(true);
    
    // Always hide form after creating a module, show it again for next module
    setShowInlineModuleForm(false);
  };

  const handleCancelInlineModule = () => {
    // Only hide form if there are existing modules, otherwise keep it for first module
    if (mods.length > 0) {
      setShowInlineModuleForm(false);
    }
    setInlineModuleData({ title: '', description: '' });
  };

  const handleSaveAllChanges = async () => {
    if (!courseId) return;
    
    setIsSaving(true);
    try {
      // Save all pending modules with proper order_index
      for (let i = 0; i < pendingModules.length; i++) {
        const module = pendingModules[i];
        await apiClient.createModule(courseId, {
          title: module.title,
          description: module.description,
          order_index: mods.length + i
        });
      }
      
      // Save all pending updates
      for (const update of pendingUpdates) {
        await apiClient.updateModule(courseId, update.id, {
          title: update.title,
          description: update.description,
          order_index: update.order_index || 0
        });
      }
      
      // Save all pending lectures
      for (const lecture of pendingLectures) {
        const payload: any = { 
          title: lecture.title, 
          content_type: lecture.content_type 
        };
        if (lecture.content_type === 'video' && lecture.video_url) {
          payload.video_url = lecture.video_url;
        }
        await apiClient.createLecture(lecture.module_id, payload);
      }
      
      // Clear pending changes
      setPendingModules([]);
      setPendingUpdates([]);
      setPendingLectures([]);
      setHasUnsavedChanges(false);
      
      // Refresh modules from server
      const updatedModules = await apiClient.fetchModulesByCourse(courseId);
      setMods(updatedModules);
      
    } catch (error) {
      console.error('Failed to save changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleModuleExpanded = (moduleId: string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  // removed manual dropdown toggler; using shadcn DropdownMenu

  const onRemoveModule = (id: string) => setConfirm({ open: true, action: async () => {
    // Check if it's a pending module
    const pendingModule = pendingModules.find(m => m.id === id);
    if (pendingModule) {
      setPendingModules(prev => prev.filter(m => m.id !== id));
      setHasUnsavedChanges(pendingModules.length > 1 || pendingUpdates.length > 0);
    } else {
      // It's an existing module - delete immediately
      if (courseId) {
        await apiClient.deleteModule(courseId, id);
        const ms = await apiClient.fetchModulesByCourse(courseId);
        setMods(ms);
        setSelected(null);
        setHasUnsavedChanges(true);
      }
    }
  }});

  const onAddLecture = (moduleId: string) => {
    // Show inline form for specific module
    setShowInlineLectureForm(moduleId);
    setInlineLectureData({ title: '', type: 'text', videoUrl: '' });
  };

  const handleSaveInlineLecture = (moduleId: string) => {
    if (!inlineLectureData.title.trim()) return;
    
    const newLecture = {
      id: `temp-lecture-${Date.now()}`,
      title: inlineLectureData.title.trim(),
      content_type: inlineLectureData.type,
      video_url: inlineLectureData.videoUrl,
      module_id: moduleId,
      isPending: true
    };
    
    setPendingLectures(prev => [...prev, newLecture]);
    setInlineLectureData({ title: '', type: 'text', videoUrl: '' });
    setShowInlineLectureForm(null);
    setHasUnsavedChanges(true);
  };

  const handleCancelInlineLecture = () => {
    setShowInlineLectureForm(null);
    setInlineLectureData({ title: '', type: 'text', videoUrl: '' });
  };

  const getLessonTypeIcon = (type: LessonContentType) => {
    switch (type) {
      case 'text':
        return <FileText className="w-4 h-4 text-gray-600" />;
      case 'video':
        return <Video className="w-4 h-4 text-gray-600" />;
      case 'quiz':
        return <HelpCircle className="w-4 h-4 text-gray-600" />;
      default:
        return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const onRemoveLecture = (id: string) => setConfirm({ open: true, action: async () => {
    // Check if it's a pending lecture
    const pendingLecture = pendingLectures.find(l => l.id === id);
    if (pendingLecture) {
      setPendingLectures(prev => prev.filter(l => l.id !== id));
      setHasUnsavedChanges(pendingLectures.length > 1 || pendingUpdates.length > 0);
    } else {
      // It's an existing lecture - delete immediately
      if (!selected?.module) return;
      await apiClient.deleteLecture(id);
      const lectures = await apiClient.fetchLecturesByModule(selected.module.id);
      setSelected({ module: selected.module, lectures });
    }
  }});

  if (!course) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="flex gap-6 h-full">
      {/* Course Navigation Panel */}
      <div className="w-64 bg-white rounded-lg border flex-shrink-0 h-full">
        <CourseSidebar 
          courseTitle={course.title}
          courseId={courseId}
          coverImageUrl={course.image}
          isActive={false}
          onSave={activeSection === 'content' ? handleSaveAllChanges : undefined}
          hasUnsavedChanges={activeSection === 'content' ? hasUnsavedChanges : false}
          pendingChangesCount={activeSection === 'content' ? pendingModules.length + pendingUpdates.length + pendingLectures.length : 0}
          onNavigate={handleNavigation}
          activeSection={activeSection}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        {activeSection === 'overview' && (
          <CourseOverviewSection course={course} />
        )}
        {activeSection === 'description' && (
          <CourseDescriptionSection course={course} courseId={courseId} />
        )}
        {activeSection === 'content' && (
          <CourseContentSection 
            course={course} 
            courseId={courseId}
            mods={mods}
            selected={selected}
            moduleLectures={moduleLectures}
            modForm={modForm}
            lecForm={lecForm}
            confirm={confirm}
            expandedModules={expandedModules}
            hasUnsavedChanges={hasUnsavedChanges}
            showInlineModuleForm={showInlineModuleForm}
            inlineModuleData={inlineModuleData}
            inlineLectureData={inlineLectureData}
            showInlineLectureForm={showInlineLectureForm}
            pendingModules={pendingModules}
            pendingLectures={pendingLectures}
            pendingUpdates={pendingUpdates}
            isSaving={isSaving}
            getDisplayModules={getDisplayModules}
            onSelectModule={onSelectModule}
            onAddModule={onAddModule}
            handleSaveInlineModule={handleSaveInlineModule}
            handleCancelInlineModule={handleCancelInlineModule}
            handleSaveInlineLecture={handleSaveInlineLecture}
            handleCancelInlineLecture={handleCancelInlineLecture}
            toggleModuleExpanded={toggleModuleExpanded}
            onRemoveModule={onRemoveModule}
            onAddLecture={onAddLecture}
            onRemoveLecture={onRemoveLecture}
            setInlineModuleData={setInlineModuleData}
            setInlineLectureData={setInlineLectureData}
            setModForm={setModForm}
            setLecForm={setLecForm}
            setConfirm={setConfirm}
            setPendingUpdates={setPendingUpdates}
            setHasUnsavedChanges={setHasUnsavedChanges}
            getLessonTypeIcon={getLessonTypeIcon}
            navigate={navigate}
          />
        )}
      </div>
    </div>
  );
}

// Overview Section Component
function CourseOverviewSection({ course }: { course: Course }) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    totalModules: 0,
    totalLessons: 0,
    averageProgress: 0,
    completionRate: 0
  });

  useEffect(() => {
    // TODO: Fetch actual stats from API
    // For now, using mock data
    setStats({
      totalStudents: 24,
      activeStudents: 18,
      totalModules: 5,
      totalLessons: 23,
      averageProgress: 67,
      completionRate: 75
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Course Overview</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Last updated</span>
            <span className="text-sm font-medium">2 hours ago</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <svg className="w-4 h-4 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <span className="text-green-600">+12% from last month</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Students</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeStudents}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <span className="text-gray-600">{Math.round((stats.activeStudents / stats.totalStudents) * 100)}% of total</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Course Content</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalModules} modules</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <span className="text-gray-600">{stats.totalLessons} lessons total</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completionRate}%</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <span className="text-gray-600">Avg. progress: {stats.averageProgress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Course Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Course Information</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">Created</p>
                <p className="text-sm text-gray-600">December 15, 2024</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">Duration</p>
                <p className="text-sm text-gray-600">{course.estimated_duration_minutes || 0} minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <div>
                <p className="text-sm font-medium text-gray-900">Status</p>
                <p className="text-sm text-gray-600">{course.is_active ? 'Active' : 'Draft'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">New student enrolled</p>
                <p className="text-sm text-gray-600">2 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Module completed</p>
                <p className="text-sm text-gray-600">4 hours ago</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Course updated</p>
                <p className="text-sm text-gray-600">1 day ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Description Section Component
function CourseDescriptionSection({ course, courseId }: { course: Course; courseId?: string }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    estimated_duration_minutes: 0,
    cover_image_url: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    setFormData({
      title: course.title || '',
      description: course.description || '',
      estimated_duration_minutes: course.estimated_duration_minutes || 0,
      cover_image_url: course.cover_image_url || ''
    });
  }, [course]);

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
    } catch (error) {
      console.error('Failed to save course:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
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
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
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
                value={formData.duration || 0}
                onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
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
                              {course.image ? (
                <img
                  src={(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000') + course.image}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
              </div>

              {/* Upload Button */}
              <div>
                <label className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm font-medium">Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
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
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                  Draft
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
  );
}

// Content Section Component (CourseBuilder logic)
function CourseContentSection({ 
  course, 
  courseId,
  mods,
  selected,
  moduleLectures,
  modForm,
  lecForm,
  confirm,
  expandedModules,
  hasUnsavedChanges,
  showInlineModuleForm,
  inlineModuleData,
  inlineLectureData,
  showInlineLectureForm,
  pendingModules,
  pendingLectures,
  pendingUpdates,
  isSaving,
  
  getDisplayModules,
  onSelectModule,
  onAddModule,
  handleSaveInlineModule,
  handleCancelInlineModule,
  handleSaveInlineLecture,
  handleCancelInlineLecture,
  toggleModuleExpanded,
  
  onRemoveModule,
  onAddLecture,
  onRemoveLecture,
  setInlineModuleData,
  setInlineLectureData,
  setModForm,
  setLecForm,
  setConfirm,
  setPendingUpdates,
  setHasUnsavedChanges,
  getLessonTypeIcon,
  navigate
}: { 
  course: Course; 
  courseId?: string;
  mods: CourseModule[];
  selected: SelectedModule | null;
  moduleLectures: Map<string, Lesson[]>;
  modForm: ModuleForm;
  lecForm: LectureForm;
  confirm: ConfirmDialog;
  expandedModules: Set<string>;
  hasUnsavedChanges: boolean;
  showInlineModuleForm: boolean;
  inlineModuleData: { title: string; description: string };
  inlineLectureData: { title: string; type: LessonContentType; videoUrl: string };
  showInlineLectureForm: string | null;
  pendingModules: any[];
  pendingLectures: any[];
  pendingUpdates: any[];
  isSaving: boolean;
  
  getDisplayModules: () => any[];
  onSelectModule: (m: CourseModule) => Promise<void>;
  onAddModule: () => void;
  handleSaveInlineModule: () => void;
  handleCancelInlineModule: () => void;
  handleSaveInlineLecture: (moduleId: string) => void;
  handleCancelInlineLecture: () => void;
  toggleModuleExpanded: (moduleId: string) => void;
  
  onRemoveModule: (id: string) => void;
  onAddLecture: (moduleId: string) => void;
  onRemoveLecture: (id: string) => void;
  setInlineModuleData: (data: { title: string; description: string }) => void;
  setInlineLectureData: (data: { title: string; type: LessonContentType; videoUrl: string }) => void;
  setModForm: (form: ModuleForm) => void;
  setLecForm: (form: LectureForm) => void;
  setConfirm: (confirm: ConfirmDialog) => void;
  setPendingUpdates: (updates: any[]) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  getLessonTypeIcon: (type: LessonContentType) => JSX.Element;
  navigate: (path: string) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Course Program</h1>
        <div className="flex items-center gap-2">
          <Button onClick={onAddModule}>
            + Add module
          </Button>
          <Button onClick={handleSaveAllChanges} variant="outline" disabled={!hasUnsavedChanges || isSaving}>
            {isSaving ? 'Saving…' : 'Save all'}
          </Button>
        </div>
      </div>

      {/* All Modules */}
      <div className="space-y-4">
        {getDisplayModules().map((module: any, index: number) => (
          <div key={module.id} className="bg-white rounded-[5px] border border-l-8 border-l-blue-500">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <span className="text-lg font-medium">{index + 1}</span>
                  <div className="flex-1">
                    {module.isPending ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <input 
                              type="text" 
                              placeholder="New module"
                              value={module.title}
                              onChange={(e) => {
                                if (module.isPending && !module.id.startsWith('temp-')) {
                                  // Update existing module
                                  setPendingUpdates(prev => prev.map(u => 
                                    u.id === module.id ? { ...u, title: e.target.value } : u
                                  ));
                                } else {
                                  // Update pending module
                                  setPendingModules(prev => prev.map(m => 
                                    m.id === module.id ? { ...m, title: e.target.value } : m
                                  ));
                                }
                                setHasUnsavedChanges(true);
                              }}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <span className="text-sm text-gray-500">Total points: 0</span>
                            <button className="p-2 hover:bg-gray-100 rounded">
                              <MoreVertical className="w-4 h-4 text-gray-500" />
                            </button>
                          </div>
                        </div>
                        
                        <input 
                          type="text" 
                          placeholder="Additional description"
                          value={module.description}
                          onChange={(e) => {
                            if (module.isPending && !module.id.startsWith('temp-')) {
                              // Update existing module
                              setPendingUpdates(prev => prev.map(u => 
                                u.id === module.id ? { ...u, description: e.target.value } : u
                              ));
                            } else {
                              // Update pending module
                              setPendingModules(prev => prev.map(m => 
                                m.id === module.id ? { ...m, description: e.target.value } : m
                              ));
                            }
                            setHasUnsavedChanges(true);
                          }}
                          maxLength={254}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="text-lg font-medium">{module.title}</h3>
                        {module.description && (
                          <p className="text-gray-600 text-sm mt-1">{module.description}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!module.isPending && (
                    <button 
                      onClick={() => toggleModuleExpanded(module.id)}
                      className="p-2 hover:bg-gray-100 rounded"
                    >
                      {expandedModules.has(module.id) ? 
                        <ChevronUp className="w-4 h-4" /> : 
                        <ChevronDown className="w-4 h-4" />
                      }
                    </button>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!module.isPending && (
                        <DropdownMenuItem onClick={() => setModForm({ open: true, id: module.id, title: module.title, description: module.description })}>
                          Edit
                        </DropdownMenuItem>
                      )}
                      {!module.isPending && <DropdownMenuSeparator />}
                      <DropdownMenuItem className="text-red-600" onClick={() => onRemoveModule(module.id)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

                              {!module.isPending && expandedModules.has(module.id) && (
                  <div className="border-t pt-4">
                                        {/* Existing Lectures */}
                    {(function() {
                      const moduleLecturesList = moduleLectures.get(module.id) || [];
                      if (moduleLecturesList.length > 0) {
                        return (
                          <div className="space-y-3 mb-4">
                            {moduleLecturesList.map((l: any, lecIndex: number) => (
                              <div key={l.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-8 h-8 bg-gray-200 rounded">
                                    {getLessonTypeIcon(l.content_type)}
                                  </div>
                                  <div>
                                    <div className="font-medium">{l.title}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => navigate(`/teacher/course/${courseId}/lesson/${l.id}/edit`)} 
                                    className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                                  >
                                    Edit
                                  </button>
                                  <button 
                                    onClick={() => onRemoveLecture(l.id)} 
                                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-100 rounded"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Pending Lectures */}
                    {pendingLectures.filter(l => l.module_id === module.id).map((l: any, lecIndex: number) => {
                      const moduleLecturesList = moduleLectures.get(module.id) || [];
                      return (
                        <div key={l.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-200 rounded">
                              {getLessonTypeIcon(l.content_type)}
                            </div>
                            <div>
                              <div className="font-medium">{l.title}</div>
                              <div className="text-sm text-gray-500">Pending</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => onRemoveLecture(l.id)} 
                              className="px-3 py-1 text-sm text-red-600 hover:bg-red-100 rounded"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Inline Lecture Creation Form */}
                    {showInlineLectureForm === module.id && (
                      <div className="bg-blue-50 rounded-lg p-4 mb-3">
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-200 rounded">
                              {getLessonTypeIcon(inlineLectureData.type)}
                            </div>
                            <div className="flex-1">
                              <input 
                                type="text" 
                                placeholder="Enter lesson title and press Enter"
                                value={inlineLectureData.title}
                                onChange={(e) => {
                                  const newTitle = e.target.value;
                                  setInlineLectureData((prev: { title: string; type: LessonContentType; videoUrl: string }) => ({ ...prev, title: newTitle }));
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && inlineLectureData.title.trim()) {
                                    handleSaveInlineLecture(module.id);
                                  }
                                }}
                                onBlur={() => {
                                  if (inlineLectureData.title.trim()) {
                                    handleSaveInlineLecture(module.id);
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Add Lesson Button */}
                    {!showInlineLectureForm && (
                      <button 
                        onClick={() => onAddLecture(module.id)} 
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
                      >
                        <span>+</span>
                        <span>Create lesson</span>
                      </button>
                    )}
                  </div>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* Inline Module Creation Form */}
      {showInlineModuleForm && (
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-start gap-4 mb-4">
            <span className="text-lg font-medium mt-3">{getDisplayModules().length + 1}</span>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <input 
                    type="text" 
                    placeholder="New module"
                    value={inlineModuleData.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setInlineModuleData((prev: { title: string; description: string }) => ({ ...prev, title: newTitle }));
                      
                      // Auto-create module when user starts typing
                      if (newTitle.trim() && !inlineModuleData.title.trim()) {
                        // User started typing, create module after a short delay
                        setTimeout(() => {
                          if (inlineModuleData.title.trim()) {
                            handleSaveInlineModule();
                          }
                        }, 1000);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inlineModuleData.title.trim()) {
                        handleSaveInlineModule();
                      }
                    }}
                    onBlur={() => {
                      // Create module when user leaves the field
                      if (inlineModuleData.title.trim()) {
                        handleSaveInlineModule();
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-sm text-gray-500">Total points: 0</span>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              
              <input 
                type="text" 
                placeholder="Additional description"
                value={inlineModuleData.description}
                onChange={(e) => setInlineModuleData((prev: { title: string; description: string }) => ({ ...prev, description: e.target.value }))}
                maxLength={254}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Add New Module Button */}
      <button 
        onClick={onAddModule}
        className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 bg-white"
      >
        <span>+</span>
        <span>Add module</span>
      </button>

      {/* Modals */}
      <Modal
        open={modForm.open}
        title={modForm.id ? 'Edit module' : 'New module'}
        onClose={() => setModForm({ open: false, title: '', description: '' })}
        onSubmit={async () => {
          if (!modForm.title.trim()) return;
          
          if (modForm.id) {
            // Find the existing module to get its order_index
            const existingModule = mods.find(m => m.id === modForm.id);
            // Add to pending updates
            setPendingUpdates(prev => [...prev, {
              id: modForm.id,
              title: modForm.title.trim(),
              description: modForm.description?.trim() || '',
              order_index: existingModule?.order_index || 0
            }]);
          } else {
            // Add to pending modules
            const newModule = {
              id: `temp-${Date.now()}`,
              title: modForm.title.trim(),
              description: modForm.description?.trim() || '',
              courseId: courseId,
              isPending: true
            };
            setPendingModules(prev => [...prev, newModule]);
          }
          
          setModForm({ open: false, title: '', description: '' });
          setHasUnsavedChanges(true);
        }}
        submitText="Save"
        cancelText="Cancel"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Module title</label>
            <input 
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={modForm.title} 
              onChange={e => setModForm(f => ({ ...f, title: e.target.value }))} 
              placeholder="Enter module title"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Description (optional)</label>
            <textarea 
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
              value={modForm.description || ''} 
              onChange={e => setModForm(f => ({ ...f, description: e.target.value }))} 
              placeholder="Module description"
              rows={3}
            />
          </div>
        </div>
      </Modal>

      {/* Edit Lesson Modal - only for editing existing lessons */}
      {lecForm.id && (
        <Modal
          open={lecForm.open}
          title="Edit lesson"
          onClose={() => setLecForm({ open: false, title: '', type: 'text', videoUrl: '' })}
          onSubmit={async () => {
            if (!lecForm.title.trim() || !selected?.module) return;
            const payload: any = { title: lecForm.title.trim(), content_type: lecForm.type };
            if (lecForm.type === 'video' && lecForm.videoUrl) payload.video_url = lecForm.videoUrl.trim();
            await apiClient.updateLecture(lecForm.id!, payload);
            setLecForm({ open: false, title: '' });
            setHasUnsavedChanges(true);
            const lectures = await apiClient.fetchLecturesByModule(selected.module.id);
            setSelected({ module: selected.module, lectures });
          }}
          submitText="Save"
          cancelText="Cancel"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Lesson title</label>
              <input 
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={lecForm.title} 
                onChange={e => setLecForm(f => ({ ...f, title: e.target.value }))} 
                placeholder="Enter lesson title"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Lesson type</label>
              <select 
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                value={lecForm.type} 
                onChange={(e) => setLecForm(f => ({ ...f, type: e.target.value as LessonContentType }))}
              >
                <option value="text">Text</option>
                <option value="video">Video</option>
                <option value="quiz">Quiz</option>
              </select>
            </div>
            {lecForm.type === 'video' && (
              <div>
                <label className="block text-sm text-gray-600 mb-1">Video URL</label>
                <input 
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={lecForm.videoUrl || ''} 
                  onChange={e => setLecForm(f => ({ ...f, videoUrl: e.target.value }))} 
                  placeholder="https://..." 
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      <ConfirmDialog
        open={confirm.open}
        onCancel={() => setConfirm({ open: false, action: null })}
        onConfirm={async () => { await confirm.action?.(); setConfirm({ open: false, action: null }); }}
        title="Delete item?"
        description="This action cannot be undone."
      />
    </div>
  );
}
