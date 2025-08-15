import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import Modal from '../components/Modal.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';
import CourseSidebar from '../components/CourseSidebar.tsx';
import type { Course, CourseModule, Lesson, LessonContentType } from '../types';
import { ChevronDown, ChevronUp, MoreVertical, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Loader from '../components/Loader.tsx';

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

interface DraggableModuleProps {
  module: CourseModule | any;
  index: number;
  children: React.ReactNode;
  onToggleExpanded: (moduleId: string) => void;
  onToggleDropdown: (moduleId: string) => void;
  onRemoveModule: (moduleId: string) => void;
  onEditModule: (module: CourseModule | any) => void;
  expandedModules: Set<string>;
  openDropdown: string | null;
  isPending?: boolean;
  onUpdatePendingModule?: (moduleId: string, field: string, value: string) => void;
}

const DraggableModule = ({ 
  module, 
  index, 
  children, 
  onToggleExpanded, 
  onToggleDropdown, 
  onRemoveModule, 
  onEditModule,
  expandedModules,
  openDropdown,
  isPending = false,
  onUpdatePendingModule
}: DraggableModuleProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`bg-white rounded-[5px] border border-l-8 border-l-blue-500 ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div 
              {...attributes}
              {...listeners}
              className="cursor-grab hover:cursor-grabbing p-1 hover:bg-gray-100 rounded"
            >
              <GripVertical className="w-4 h-4 text-gray-400" />
            </div>
            <span className="text-lg font-medium">{index + 1}</span>
            <div className="flex-1">
              {isPending ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <input 
                        type="text" 
                        placeholder="New module"
                        value={module.title}
                        onChange={(e) => {
                          if (onUpdatePendingModule) {
                            onUpdatePendingModule(module.id, 'title', e.target.value);
                          }
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
                      if (onUpdatePendingModule) {
                        onUpdatePendingModule(module.id, 'description', e.target.value);
                      }
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
            {!isPending && (
              <button 
                onClick={() => onToggleExpanded(module.id)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                {expandedModules.has(module.id) ? 
                  <ChevronUp className="w-4 h-4" /> : 
                  <ChevronDown className="w-4 h-4" />
                }
              </button>
            )}
            <div className="relative dropdown-container">
              <button 
                onClick={() => onToggleDropdown(module.id)}
                className="p-2 hover:bg-gray-100 rounded"
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>
              {openDropdown === module.id && (
                <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[120px]">
                  {!isPending && (
                    <button 
                      onClick={() => {
                        onEditModule(module);
                        // onToggleDropdown(null) will be handled by parent
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-t-lg"
                    >
                      Edit
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      onRemoveModule(module.id);
                      // onToggleDropdown(null) will be handled by parent
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

export default function CourseBuilderPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [mods, setMods] = useState<CourseModule[]>([]);
  const [selected, setSelected] = useState<SelectedModule | null>(null);
  const [modForm, setModForm] = useState<ModuleForm>({ open: false, title: '', description: '' });
  const [lecForm, setLecForm] = useState<LectureForm>({ open: false, title: '', type: 'text' });
  const [confirm, setConfirm] = useState<ConfirmDialog>({ open: false, action: null });
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showInlineModuleForm, setShowInlineModuleForm] = useState(true);
  const [inlineModuleData, setInlineModuleData] = useState({ title: '', description: '' });
  const [pendingModules, setPendingModules] = useState<any[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [showInlineLessonForm, setShowInlineLessonForm] = useState(false);
  const [inlineLessonData, setInlineLessonData] = useState({ title: '', type: 'text' as LessonContentType });
  const [moduleLectures, setModuleLectures] = useState<Map<string, Lesson[]>>(new Map());
  const [moduleOrder, setModuleOrder] = useState<string[]>([]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Legacy state from old inline create form removed

  const isNewCourse = !courseId || courseId === 'new';

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
    
    // If we have a custom order, apply it
    if (moduleOrder.length > 0) {
      const orderedModules = [];
      const moduleMap = new Map(displayModules.map(module => [module.id, module]));
      
      // Add modules in the custom order
      for (const moduleId of moduleOrder) {
        const module = moduleMap.get(moduleId);
        if (module) {
          orderedModules.push(module);
          moduleMap.delete(moduleId);
        }
      }
      
      // Add any remaining modules that weren't in the order
      for (const module of moduleMap.values()) {
        orderedModules.push(module);
      }
      
      return orderedModules;
    }
    
    return displayModules;
  };

  useEffect(() => {
    if (!courseId || courseId === 'new') return;
    
    loadCourseData();
  }, [courseId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdown && !(event.target as Element).closest('.dropdown-container')) {
        setOpenDropdown(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdown]);

  const loadCourseData = async () => {
    if (!courseId || courseId === 'new') return;
    
    try {
      console.log('Loading course data for courseId:', courseId);
      const courseData = await apiClient.fetchCourseById(courseId);
      setCourse(courseData);
      console.log('Course loaded:', courseData);
      
      const modules = await apiClient.fetchModulesByCourse(courseId);
      console.log('Modules loaded:', modules);
      setMods(modules);
      
      // If modules exist, select the first one and load its lectures
      if (modules[0]) {
        const lectures = await apiClient.fetchLecturesByModule(modules[0].id);
        setSelected({ module: modules[0], lectures });
        setModuleLectures(new Map([[modules[0].id, lectures]]));
      }
      
      // Show inline form if no modules exist or if we want to allow creating next module
      if (modules.length === 0) {
        console.log('No modules found, showing inline form');
        setShowInlineModuleForm(true);
      } else {
        console.log('Modules found, hiding inline form');
        setShowInlineModuleForm(false);
      }
    } catch (error) {
      console.error('Failed to load course data:', error);
    }
  };

  // New course creation handled in CreateCourseWizard

  const onSelectModule = async (m: CourseModule) => {
    const lectures = await apiClient.fetchLecturesByModule(m.id);
    setSelected({ module: m, lectures });
    setModuleLectures(prev => new Map(prev).set(m.id, lectures));
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

  const handleSaveInlineLesson = async () => {
    if (!inlineLessonData.title.trim() || !selected?.module) return;
    
    try {
      // Get current lectures to determine the next order_index
      const currentLectures = moduleLectures.get(selected.module.id) || [];
      const nextOrderIndex = currentLectures.length;
      
      console.log(`Creating lesson with order_index: ${nextOrderIndex}`);
      
      const payload: any = { 
        title: inlineLessonData.title.trim(), 
        content_type: inlineLessonData.type,
        order_index: nextOrderIndex
      };
      
      await apiClient.createLecture(selected.module.id, payload);
      
      // Refresh lectures for the current module
      const lectures = await apiClient.fetchLecturesByModule(selected.module.id);
      setModuleLectures(prev => new Map(prev).set(selected.module.id, lectures));
      
      // Reset form
      setInlineLessonData({ title: '', type: 'text' });
      setShowInlineLessonForm(false);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Failed to create lesson:', error);
    }
  };

  const handleCancelInlineLesson = () => {
    setShowInlineLessonForm(false);
    setInlineLessonData({ title: '', type: 'text' });
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
      
      // Update module order if it has changed
      if (moduleOrder.length > 0) {
        const displayModules = getDisplayModules();
        for (let i = 0; i < displayModules.length; i++) {
          const module = displayModules[i];
          if (!module.id.startsWith('temp-')) {
            await apiClient.updateModule(courseId, module.id, {
              title: module.title,
              description: module.description,
              order_index: i
            });
          }
        }
      }
      
      // Clear pending changes
      setPendingModules([]);
      setPendingUpdates([]);
      setModuleOrder([]);
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
      // Load lectures for this module if not already loaded
      if (!moduleLectures.has(moduleId)) {
        loadModuleLectures(moduleId);
      }
    }
    setExpandedModules(newExpanded);
  };

  const loadModuleLectures = async (moduleId: string) => {
    try {
      const lectures = await apiClient.fetchLecturesByModule(moduleId);
      setModuleLectures(prev => new Map(prev).set(moduleId, lectures));
    } catch (error) {
      console.error('Failed to load lectures for module:', moduleId, error);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const displayModules = getDisplayModules();
      const oldIndex = displayModules.findIndex(module => module.id === active.id);
      const newIndex = displayModules.findIndex(module => module.id === over?.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newOrder = arrayMove(displayModules, oldIndex, newIndex);
        setModuleOrder(newOrder.map(module => module.id));
        setHasUnsavedChanges(true);
      }
    }
  };

  const handleUpdatePendingModule = (moduleId: string, field: string, value: string) => {
    if (field === 'title') {
      if (moduleId.startsWith('temp-')) {
        // Update pending module
        setPendingModules(prev => prev.map(m => 
          m.id === moduleId ? { ...m, title: value } : m
        ));
      } else {
        // Update existing module
        setPendingUpdates(prev => prev.map(u => 
          u.id === moduleId ? { ...u, title: value } : u
        ));
      }
    } else if (field === 'description') {
      if (moduleId.startsWith('temp-')) {
        // Update pending module
        setPendingModules(prev => prev.map(m => 
          m.id === moduleId ? { ...m, description: value } : m
        ));
      } else {
        // Update existing module
        setPendingUpdates(prev => prev.map(u => 
          u.id === moduleId ? { ...u, description: value } : u
        ));
      }
    }
    setHasUnsavedChanges(true);
  };

  const renderModuleLectures = (moduleId: string) => {
    const lectures = moduleLectures.get(moduleId) || [];
    
    if (lectures.length > 0) {
      return (
        <div className="space-y-3">
          {lectures.map((l, lecIndex) => (
            <div key={l.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{lecIndex + 1}.1</span>
                <div>
                  <div className="font-medium">{l.title}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                                              <button 
                                onClick={() => navigate(`/teacher/course/${courseId}/lesson/${l.id}/edit`)} 
                                className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-100 rounded"
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
          {showInlineLessonForm && selected?.module?.id === moduleId ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{lectures.length + 1}.1</span>
                <div className="flex-1">
                  <input 
                    type="text" 
                    placeholder="New lesson"
                    value={inlineLessonData.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setInlineLessonData(prev => ({ ...prev, title: newTitle }));
                      
                      // Auto-create lesson when user starts typing
                      if (newTitle.trim() && !inlineLessonData.title.trim()) {
                        setTimeout(() => {
                          if (inlineLessonData.title.trim()) {
                            handleSaveInlineLesson();
                          }
                        }, 1000);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inlineLessonData.title.trim()) {
                        handleSaveInlineLesson();
                      }
                      if (e.key === 'Escape') {
                        handleCancelInlineLesson();
                      }
                    }}
                    onBlur={() => {
                      // Create lesson when user leaves the field
                      if (inlineLessonData.title.trim()) {
                        handleSaveInlineLesson();
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => { onSelectModule(mods.find(m => m.id === moduleId) || mods[0]); onAddLecture(moduleId); }} 
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
            >
              <span>+</span>
              <span>Create lesson</span>
            </button>
          )}
        </div>
      );
    } else {
      return (
        <div className="text-center py-6">
          {showInlineLessonForm && selected?.module?.id === moduleId ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">1.1</span>
                <div className="flex-1">
                  <input 
                    type="text" 
                    placeholder="New lesson"
                    value={inlineLessonData.title}
                    onChange={(e) => {
                      const newTitle = e.target.value;
                      setInlineLessonData(prev => ({ ...prev, title: newTitle }));
                      
                      // Auto-create lesson when user starts typing
                      if (newTitle.trim() && !inlineLessonData.title.trim()) {
                        setTimeout(() => {
                          if (inlineLessonData.title.trim()) {
                            handleSaveInlineLesson();
                          }
                        }, 1000);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && inlineLessonData.title.trim()) {
                        handleSaveInlineLesson();
                      }
                      if (e.key === 'Escape') {
                        handleCancelInlineLesson();
                      }
                    }}
                    onBlur={() => {
                      // Create lesson when user leaves the field
                      if (inlineLessonData.title.trim()) {
                        handleSaveInlineLesson();
                      }
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => { onSelectModule(mods.find(m => m.id === moduleId) || mods[0]); onAddLecture(moduleId); }} 
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <span>+</span>
              <span>Create lesson</span>
            </button>
          )}
        </div>
      );
    }
  };

  const toggleDropdown = (moduleId: string) => {
    setOpenDropdown(openDropdown === moduleId ? null : moduleId);
  };
  // removed unused handler placeholder to satisfy noUnusedLocals
  // const submitAddModule = async () => {};

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
    setSelected({ module: mods.find(m => m.id === moduleId) || mods[0], lectures: [] });
    setShowInlineLessonForm(true);
    setInlineLessonData({ title: '', type: 'text' });
  };
  // removed unused handler placeholder to satisfy noUnusedLocals
  // const submitAddLecture = async () => {};

  const onRemoveLecture = (id: string) => setConfirm({ open: true, action: async () => {
    if (!selected?.module) return;
    await apiClient.deleteLecture(id);
    const lectures = await apiClient.fetchLecturesByModule(selected.module.id);
    setModuleLectures(prev => new Map(prev).set(selected.module.id, lectures));
  }});

  // Redirect new course flow to the wizard
  if (isNewCourse) {
    navigate('/teacher/course/new');
    return null;
  }



  if (!course) return <Loader size="xl" animation="spin" color="#2563eb" />


  return (
    <div className="flex gap-6 h-full">
      {/* Course Navigation Panel */}
      <div className="w-64 bg-white rounded-lg border flex-shrink-0 h-full">
        <CourseSidebar 
          courseTitle={course.title}
          courseId={courseId}
          coverImageUrl={(course as any).cover_image_url}
          isActive={(course as any).is_active}
          onSave={handleSaveAllChanges}
          hasUnsavedChanges={hasUnsavedChanges}
          pendingChangesCount={pendingModules.length + pendingUpdates.length}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Course Program</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Autosave</span>
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            </div>
          </div>
        </div>

        {/* All Modules */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={getDisplayModules().map(module => module.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {getDisplayModules().map((module, index) => (
                <DraggableModule
                  key={module.id}
                  module={module}
                  index={index}
                  onToggleExpanded={toggleModuleExpanded}
                  onToggleDropdown={toggleDropdown}
                  onRemoveModule={onRemoveModule}
                  onEditModule={(module) => {
                    setModForm({ open: true, id: module.id, title: module.title, description: module.description });
                    setOpenDropdown(null);
                  }}
                  expandedModules={expandedModules}
                  openDropdown={openDropdown}
                  isPending={module.isPending}
                  onUpdatePendingModule={handleUpdatePendingModule}
                >
                  {!module.isPending && expandedModules.has(module.id) && (
                    <div className="border-t pt-4">
                      {renderModuleLectures(module.id)}
                    </div>
                  )}
                </DraggableModule>
              ))}
            </div>
          </SortableContext>
        </DndContext>

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
                        setInlineModuleData(prev => ({ ...prev, title: newTitle }));
                        
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
                  onChange={(e) => setInlineModuleData(prev => ({ ...prev, description: e.target.value }))}
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


      </div>

      
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

      
      <Modal
        open={lecForm.open}
        title="Edit lesson"
        onClose={() => setLecForm({ open: false, title: '', type: 'text', videoUrl: '' })}
        onSubmit={async () => {
          if (!lecForm.title.trim() || !selected?.module || !lecForm.id) return;
          const payload: any = { title: lecForm.title.trim(), content_type: lecForm.type };
          if (lecForm.type === 'video' && lecForm.videoUrl) payload.video_url = lecForm.videoUrl.trim();
          
          await apiClient.updateLecture(lecForm.id, payload);
          setLecForm({ open: false, title: '' });
          setHasUnsavedChanges(true);
          const lectures = await apiClient.fetchLecturesByModule(selected.module.id);
          setModuleLectures(prev => new Map(prev).set(selected.module.id, lectures));
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

      <ConfirmDialog
        open={confirm.open}
        onCancel={() => setConfirm({ open: false, action: null })}
        onConfirm={async () => { await confirm.action?.(); setConfirm({ open: false, action: null }); }}
        title="Delete item?"
        description="This action cannot be undone."
      />
      </div>
    </div>
  );
}


