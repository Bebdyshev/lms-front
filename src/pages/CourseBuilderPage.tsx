import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';
import CourseSidebar from '../components/CourseSidebar.tsx';
import type { Course, CourseModule, Lesson, LessonContentType, Group, CourseGroupAccess } from '../types';
import { ChevronDown, ChevronUp, MoreVertical, GripVertical, FileText, Video, HelpCircle, Users, Save, Check, X } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Loader from '../components/Loader.tsx';
import Modal from '../components/Modal.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';

interface SelectedModule {
  module: CourseModule;
  lectures: Lesson[];
}

interface ModuleForm {
  open: boolean;
  title: string;
  description?: string;
  id?: number;
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
  onToggleExpanded: (moduleId: number | string) => void;
  onToggleDropdown: (moduleId: number | string) => void;
  onRemoveModule: (moduleId: number | string) => void;
  onEditModule: (module: CourseModule | any) => void;
  expandedModules: Set<number | string>;
  openDropdown: number | string | null;
  isPending?: boolean;
  onUpdatePendingModule?: (moduleId: number | string, field: string, value: string) => void;
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
  const { user } = useAuth();
  
  const [course, setCourse] = useState<Course | null>(null);
  const [mods, setMods] = useState<CourseModule[]>([]);
  const [selected, setSelected] = useState<SelectedModule | null>(null);
  const [modForm, setModForm] = useState<ModuleForm>({ open: false, title: '', description: '' });
  const [lecForm, setLecForm] = useState<LectureForm>({ open: false, title: '', type: 'text' });
  const [confirm, setConfirm] = useState<ConfirmDialog>({ open: false, action: null });
  const [expandedModules, setExpandedModules] = useState<Set<number | string>>(new Set());
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showInlineModuleForm, setShowInlineModuleForm] = useState(true);
  const [inlineModuleData, setInlineModuleData] = useState({ title: '', description: '' });
  const [pendingModules, setPendingModules] = useState<any[]>([]);
  const [pendingUpdates, setPendingUpdates] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<number | string | null>(null);
  const [showInlineLessonForm, setShowInlineLessonForm] = useState(false);
  const [inlineLessonData, setInlineLessonData] = useState({ title: '', type: 'text' as LessonContentType });
  const [moduleLectures, setModuleLectures] = useState<Map<number, Lesson[]>>(new Map());
  const [moduleOrder, setModuleOrder] = useState<Array<number | string>>([]);
  const [activeSection, setActiveSection] = useState<'overview' | 'description' | 'content'>('overview');
  const [showInlineLectureForm, setShowInlineLectureForm] = useState<string | null>(null);
  const [inlineLectureData, setInlineLectureData] = useState({ title: '', type: 'text' as LessonContentType, videoUrl: '' });
  const [pendingLectures, setPendingLectures] = useState<any[]>([]);
  const [courseGroups, setCourseGroups] = useState<CourseGroupAccess[]>([]);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [showGroupManagementModal, setShowGroupManagementModal] = useState(false);
  const [groupsWithAccess, setGroupsWithAccess] = useState<number[]>([]);

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

  useEffect(() => {
    if (showGroupManagementModal) {
      loadGroups();
    }
  }, [showGroupManagementModal]);

  const loadCourseData = async () => {
    if (!courseId || courseId === 'new') return;
    
    try {
      console.log('Loading course data for courseId:', courseId);
      const courseData = await apiClient.fetchCourseById(courseId);
      setCourse(courseData);
      console.log('Course loaded:', courseData);
      
      const modules = await apiClient.fetchModulesByCourse(courseId, true);
      console.log('Modules loaded:', modules);
      setMods(modules);
      
      // Create lectures map from modules with lessons
      const lecturesMap = new Map<number, Lesson[]>();
      for (const module of modules) {
        if (module.lessons && module.lessons.length > 0) {
          const lectures = module.lessons;
          lecturesMap.set(module.id, lectures);
        } else {
          lecturesMap.set(module.id, []);
        }
      }
      setModuleLectures(lecturesMap);
      
      // If modules exist, select the first one
      if (modules[0]) {
        const lectures = lecturesMap.get(modules[0].id) || [];
        setSelected({ module: modules[0], lectures });
      }
      
      // Show inline form if no modules exist or if we want to allow creating next module
      if (modules.length === 0) {
        console.log('No modules found, showing inline form');
        setShowInlineModuleForm(true);
      } else {
        console.log('Modules found, hiding inline form');
        setShowInlineModuleForm(false);
      }
      
      // Load course groups
      await loadCourseGroups();
    } catch (error) {
      console.error('Failed to load course data:', error);
    }
  };

  // New course creation handled in CreateCourseWizard

  const onSelectModule = async (m: CourseModule) => {
    const lectures = moduleLectures.get(m.id) || [];
    setSelected({ module: m, lectures });
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
        order_index: 0
      };
      
      if (!courseId) return;
      await apiClient.createLesson(courseId, selected.module.id, payload);
      
      // Refresh lectures for the current module
      const lectures = await apiClient.getModuleLessons(courseId, selected.module.id);
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
      
      // Save all pending lectures
      for (const lecture of pendingLectures) {
        // Create lesson first
        const lessonPayload = { 
          title: lecture.title
        };
        const createdLesson = await apiClient.createLesson(courseId, lecture.module_id, lessonPayload);
        
        // Create step with content
        const stepPayload = {
          title: lecture.title,
          content_type: lecture.content_type === 'video' ? 'video_text' : lecture.content_type,
          video_url: lecture.content_type === 'video' ? lecture.video_url : undefined,
          content_text: lecture.content_type === 'text' ? lecture.content_text : undefined,
          order_index: 1
        };
        await apiClient.createStep(createdLesson.id, stepPayload);
      }
      
      // Clear pending changes
      setPendingModules([]);
      setPendingUpdates([]);
      setPendingLectures([]);
      setModuleOrder([]);
      setHasUnsavedChanges(false);
      
      // Refresh modules with lessons from server
      const updatedModules = await apiClient.fetchModulesByCourse(courseId, true);
      setMods(updatedModules);
      
      // Update lectures map
      const updatedLecturesMap = new Map<number, Lesson[]>();
      for (const module of updatedModules) {
        if (module.lessons) {
          const lectures = module.lessons;
          updatedLecturesMap.set(module.id, lectures);
        } else {
          updatedLecturesMap.set(module.id, []);
        }
      }
      setModuleLectures(updatedLecturesMap);
      
    } catch (error) {
      console.error('Failed to save changes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleModuleExpanded = (moduleId: number | string) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);

    }
    setExpandedModules(newExpanded);
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

  const handleUpdatePendingModule = (moduleId: number | string, field: string, value: string) => {
    if (field === 'title') {
      if (typeof moduleId === 'string' && moduleId.startsWith('temp-')) {
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
      if (typeof moduleId === 'string' && moduleId.startsWith('temp-')) {
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

  const renderModuleLectures = (moduleId: number) => {
    const lectures = moduleLectures.get(moduleId) || [];
    
    if (lectures.length > 0) {
      return (
        <div className="space-y-3">
          {lectures.filter(l => l).map((l, lecIndex) => (
            <div key={l?.id || lecIndex} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-white rounded-md">
                  {getLessonTypeIcon(getLessonType(l))}
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-sm">{l?.title || 'Untitled'}</div>
                  <div className="text-xs text-gray-500 capitalize">
                    {getLessonType(l)} • {lecIndex + 1}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => navigate(`/teacher/course/${courseId}/lesson/${l?.id}/edit`)} 
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-100 rounded"
                >
                  Edit
                </button>
                <button 
                  onClick={() => onRemoveLecture(l?.id)} 
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-100 rounded"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
          
          {/* Pending Lectures */}
          {pendingLectures.filter(l => l && l.module_id === moduleId).map((l: any, lecIndex: number) => (
            <div key={l?.id || lecIndex} className="flex items-center justify-between p-3 bg-blue-50 rounded-md border border-blue-200 mb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-200 rounded-md">
                  {getLessonTypeIcon(getLessonType(l))}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">{l?.title || "Untitled"}</div>
                  <div className="text-xs text-blue-600">Pending</div>
                </div>
              </div>
              <button 
                onClick={() => onRemoveLecture(l?.id)}
                className="px-3 py-1 text-xs text-red-600 hover:bg-red-100 rounded"
              >
                ×
              </button>
            </div>
          ))}

          {/* Inline Lecture Creation Form */}
          {showInlineLectureForm === String(moduleId) && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-200 rounded-lg">
                    {getLessonTypeIcon(inlineLectureData.type)}
                  </div>
                  <div className="flex-1">
                    <input 
                      type="text" 
                      placeholder="Enter lesson title..."
                      value={inlineLectureData.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setInlineLectureData(prev => ({ ...prev, title: newTitle }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && inlineLectureData.title.trim()) {
                          handleSaveInlineLecture(String(moduleId));
                        }
                      }}
                      onBlur={() => {
                        if (inlineLectureData.title.trim()) {
                          handleSaveInlineLecture(String(moduleId));
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
              onClick={() => onAddLecture(moduleId)}
              className="w-full py-3 border border-dashed border-gray-300 rounded-md text-gray-500 hover:border-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center justify-center gap-2">
                <span className="text-lg">+</span>
                <span className="text-sm">Add lesson</span>
              </div>
            </button>
          )}
        </div>
      );
    } else {
      return (
        <div className="text-center py-6">
          {/* Pending Lectures */}
          {pendingLectures.filter(l => l && l.module_id === moduleId).map((l: any, lecIndex: number) => (
            <div key={l?.id || lecIndex} className="flex items-center justify-between p-3 bg-blue-50 rounded-md border border-blue-200 mb-2">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-200 rounded-md">
                  {getLessonTypeIcon(getLessonType(l))}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 text-sm">{l?.title || "Untitled"}</div>
                  <div className="text-xs text-blue-600">Pending</div>
                </div>
              </div>
              <button 
                onClick={() => onRemoveLecture(l?.id)}
                className="px-3 py-1 text-xs text-red-600 hover:bg-red-100 rounded"
              >
                ×
              </button>
            </div>
          ))}

          {/* Inline Lecture Creation Form */}
          {showInlineLectureForm === String(moduleId) && (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 mb-4">
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-200 rounded-lg">
                    {getLessonTypeIcon(inlineLectureData.type)}
                  </div>
                  <div className="flex-1">
                    <input 
                      type="text" 
                      placeholder="Enter lesson title..."
                      value={inlineLectureData.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        setInlineLectureData(prev => ({ ...prev, title: newTitle }));
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && inlineLectureData.title.trim()) {
                          handleSaveInlineLecture(String(moduleId));
                        }
                      }}
                      onBlur={() => {
                        if (inlineLectureData.title.trim()) {
                          handleSaveInlineLecture(String(moduleId));
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
              onClick={() => onAddLecture(moduleId)}
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

  const toggleDropdown = (moduleId: number | string) => {
    setOpenDropdown(openDropdown === moduleId ? null : moduleId);
  };
  // removed unused handler placeholder to satisfy noUnusedLocals
  // const submitAddModule = async () => {};

  const onRemoveModule = (id: number | string) => setConfirm({ open: true, action: async () => {
    // Check if it's a pending module
    const pendingModule = pendingModules.find(m => m.id === id);
    if (pendingModule) {
      setPendingModules(prev => prev.filter(m => m.id !== id));
      setHasUnsavedChanges(pendingModules.length > 1 || pendingUpdates.length > 0);
    } else {
      // It's an existing module - delete immediately
      if (courseId) {
        await apiClient.deleteModule(courseId, Number(id));
        const ms = await apiClient.fetchModulesByCourse(courseId, true);
        setMods(ms);
        
        // Update lectures map
        const updatedLecturesMap = new Map<number, Lesson[]>();
        for (const module of ms) {
          if (module.lessons) {
            const lectures = module.lessons;
            updatedLecturesMap.set(module.id, lectures);
          } else {
            updatedLecturesMap.set(module.id, []);
          }
        }
        setModuleLectures(updatedLecturesMap);
        setSelected(null);
        setHasUnsavedChanges(true);
      }
    }
  }});

  const onAddLecture = (moduleId: number) => {
    setShowInlineLectureForm(String(moduleId));
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

  // Helper function to get lesson type from steps or fallback
  const getLessonType = (lesson: any): LessonContentType => {
    if (!lesson) return 'text';
    
    // Try to get from steps first
    if (Array.isArray(lesson.steps) && lesson.steps.length > 0) {
      const stepType = lesson.steps[0].content_type;
      // Map step content_type to lesson content_type
      switch (stepType) {
        case 'video_text': return 'video';
        case 'text': return 'text';
        case 'quiz': return 'quiz';
        default: return 'text';
      }
    }
    
    // Fallback to legacy content_type
    return (lesson as any).content_type || 'text';
  };
  // removed unused handler placeholder to satisfy noUnusedLocals
  // const submitAddLecture = async () => {};

  const onRemoveLecture = (id: string) => setConfirm({ open: true, action: async () => {
    // Check if it's a pending lecture
    const pendingLecture = pendingLectures.find(l => l.id === id);
    if (pendingLecture) {
      setPendingLectures(prev => prev.filter(l => l.id !== id));
      setHasUnsavedChanges(pendingLectures.length > 1 || pendingUpdates.length > 0);
    } else {
      // It's an existing lecture - delete immediately
      if (!selected?.module || !courseId) return;
      await apiClient.deleteLecture(id);
      const lectures = await apiClient.getModuleLessons(courseId, selected.module.id);
      setModuleLectures(prev => new Map(prev).set(selected.module.id, lectures));
    }
  }});

  const handleNavigate = (section: 'overview' | 'description' | 'content') => {
    setActiveSection(section);
  };

  const loadCourseGroups = async () => {
    if (!courseId) return;
    
    try {
      setIsLoadingGroups(true);
      const [groups, courseGroupsData] = await Promise.all([
        apiClient.getGroups(),
        apiClient.getCourseGroups(courseId)
      ]);
      
      setAvailableGroups(groups);
      setCourseGroups(courseGroupsData);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const handleGrantAccessToGroup = async (groupId: number) => {
    if (!courseId) return;
    
    try {
      await apiClient.grantCourseAccessToGroup(courseId, groupId);
      await loadCourseGroups(); // Reload groups
    } catch (error) {
      console.error('Failed to grant access:', error);
    }
  };

  const handleRevokeAccessFromGroup = async (groupId: number) => {
    if (!courseId) return;
    
    try {
      await apiClient.revokeCourseAccessFromGroup(courseId, groupId);
      await loadCourseGroups(); // Reload groups
    } catch (error) {
      console.error('Failed to revoke access:', error);
    }
  };

  const renderOverviewSection = () => {
    const totalLessons = Array.from(moduleLectures.values()).reduce((total, lectures) => total + lectures.length, 0);
    const lessonTypes = Array.from(moduleLectures.values())
      .flat()
      .filter((l): l is Lesson => Boolean(l))
      .reduce((acc, lesson) => {
        const type = (lesson as any).content_type ?? (Array.isArray((lesson as any).steps) && (lesson as any).steps.length > 0
          ? (lesson as any).steps[0].content_type
          : 'unknown');
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

  return (
      <div className="space-y-6">

        {course && (
          <>
            {/* Course Information Card */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Course Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title</label>
                    <p className="mt-1 text-lg font-medium">{course.title}</p>
                  </div>
                                    <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        (course as any).is_active ? 'bg-green-500' : 'bg-gray-400'
                      }`}></span>
                      <span className={`text-sm font-medium ${
                        (course as any).is_active ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {(course as any).is_active ? 'Active' : 'Draft'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="mt-1 text-gray-600">
                      {course.created_at ? new Date(course.created_at).toLocaleDateString() : 'Unknown'}
                    </p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="mt-1 text-gray-600 leading-relaxed">
                    {(course as any).description || 'No description provided'}
                  </p>
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Modules</p>
                    <p className="text-2xl font-bold text-blue-600">{mods.length}</p>
                  </div>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                </div>
      </div>

              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Lessons</p>
                    <p className="text-2xl font-bold text-green-600">{totalLessons}</p>
                  </div>
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Text Lessons</p>
                    <p className="text-2xl font-bold text-purple-600">{lessonTypes.text || 0}</p>
                  </div>
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Video Lessons</p>
                    <p className="text-2xl font-bold text-red-600">{lessonTypes.video || 0}</p>
                  </div>
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Quiz Statistics */}
            {(lessonTypes.quiz || 0) > 0 && (
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Quiz Lessons</p>
                    <p className="text-2xl font-bold text-orange-600">{lessonTypes.quiz || 0}</p>
                  </div>
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {mods.length > 0 ? (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Course structure updated</p>
                      <p className="text-xs text-gray-500">{mods.length} modules, {totalLessons} lessons</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <p className="text-sm">No activity yet. Start by adding modules and lessons.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  const renderDescriptionSection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Course Description</h1>
        <span className="text-xs text-gray-500">
          {course?.updated_at ? `Last updated: ${new Date((course as any).updated_at).toLocaleString()}` : ''}
        </span>
      </div>
      
      {course && (
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Course Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Course Image Section */}
              <div className="space-y-2">
                <Label htmlFor="course-image">Course Cover Image</Label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-32 h-24 bg-gray-100 rounded-lg overflow-hidden border">
                      {(course as any).cover_image_url ? (
                        <img 
                          src={(import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000') + (course as any).cover_image_url} 
                          alt="Course cover"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => document.getElementById('course-image-input')?.click()}
                      className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1">
                    <input
                      id="course-image-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        {(course as any).cover_image_url ? 'Click the edit button to change the image' : 'Upload a cover image for your course'}
                      </p>
                      {(course as any).cover_image_url && (
                        <button
                          onClick={() => setCourse(prev => prev ? { ...prev, cover_image_url: '' } : prev)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove image
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="course-title">Course Title</Label>
                <Input
                  id="course-title"
                  value={course.title}
                  onChange={(e) => setCourse(prev => prev ? { ...prev, title: e.target.value } : null)}
                  placeholder="Enter course title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="course-description">Description</Label>
                <Textarea
                  id="course-description"
                  value={(course as any).description || ''}
                  onChange={(e) => setCourse(prev => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Describe what students will learn..."
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setCourse(prev => prev ? { ...prev, title: prev.title || '', description: (prev as any).description || '' } : prev);
                  }}
                >
                  Reset
                </Button>
                <Button
                  onClick={async () => {
                    if (course && courseId) {
                      try {
                        await apiClient.updateCourse(courseId, {
                          title: course.title,
                          description: (course as any).description,
                          cover_image_url: (course as any).cover_image_url
                        });
                        setHasUnsavedChanges(false);
                      } catch (error) {
                        console.error('Failed to update course:', error);
                      }
                    }
                  }}
                >
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  const renderContentSection = () => (
    <div className="space-y-8">
      {/* Header with better visual hierarchy */}
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Course Program</h1>
            <p className="text-gray-600 mt-1">Organize your course content into modules and lessons</p>
          </div>
        </div>
        
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{mods.length}</div>
            <div className="text-sm text-gray-600">Modules</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {Array.from(moduleLectures.values()).reduce((total, lectures) => total + lectures.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Lessons</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{pendingModules.length + pendingLectures.length}</div>
            <div className="text-sm text-gray-600">Pending</div>
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
        <div className="bg-white rounded-lg border p-5">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-50 text-blue-600 rounded-md font-medium text-sm">
              {getDisplayModules().length + 1}
            </div>
            <div className="flex-1 space-y-3">
              <input 
                type="text" 
                placeholder="Module title..."
                value={inlineModuleData.title}
                onChange={(e) => {
                  const newTitle = e.target.value;
                  setInlineModuleData(prev => ({ ...prev, title: newTitle }));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && inlineModuleData.title.trim()) {
                    handleSaveInlineModule();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                autoFocus
              />
              
              <input 
                type="text" 
                placeholder="Description (optional)"
                value={inlineModuleData.description}
                onChange={(e) => setInlineModuleData(prev => ({ ...prev, description: e.target.value }))}
                maxLength={254}
                className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              
              <div className="flex items-center gap-2 pt-1">
                <button 
                  onClick={handleSaveInlineModule}
                  disabled={!inlineModuleData.title.trim()}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                >
                  Create
                </button>
                <button 
                  onClick={handleCancelInlineModule}
                  className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Module Button */}
      <div className="bg-white rounded-lg border p-6">
        <Button 
          onClick={onAddModule}
          variant="outline"
          className="w-full py-6 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-600 hover:text-blue-600"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">+</span>
            </div>
            <div className="text-left">
              <div className="font-medium">Add New Module</div>
              <div className="text-sm text-gray-500">Create a new module for your course</div>
            </div>
          </div>
        </Button>
      </div>
    </div>
  );

  // Redirect new course flow to the wizard
  if (isNewCourse) {
    navigate('/teacher/course/new');
    return null;
  }

  const handleAutoEnrollStudents = async () => {
    setShowGroupManagementModal(true);
  };

  const loadGroups = async () => {
    if (!user?.id || !course?.id) return;
    
    setIsLoadingGroups(true);
    try {
      const [groups, accessStatus] = await Promise.all([
        apiClient.getGroups(),
        apiClient.getCourseGroupAccessStatus(course.id.toString())
      ]);
      
      const teacherGroups = groups.filter((group: any) => group.teacher_id === user.id);
      setAvailableGroups(teacherGroups);
      setGroupsWithAccess(accessStatus.groups_with_access || []);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const grantAccessToGroup = async (groupId: string) => {
    if (!course?.id) return;
    
    try {
      const result = await apiClient.grantGroupAccess(course.id.toString(), groupId);
      
      if (result.status === 'granted') {
        alert('Доступ предоставлен группе!');
      } else if (result.status === 'already_granted') {
        alert('Группа уже имеет доступ к курсу');
      }
      
      loadGroups(); // Reload to update status
    } catch (error) {
      console.error('Failed to grant access:', error);
      alert('Не удалось предоставить доступ группе');
    }
  };

  const revokeAccessFromGroup = async (groupId: string) => {
    if (!course?.id) return;
    
    try {
      await apiClient.revokeGroupAccess(course.id.toString(), groupId);
      alert('Доступ отозван у группы');
      loadGroups(); // Reload to update status
    } catch (error) {
      console.error('Failed to revoke access:', error);
      alert('Не удалось отозвать доступ у группы');
    }
  };

  const grantAccessToAllGroups = async () => {
    if (!course?.id) return;
    
    let grantedCount = 0;
    let alreadyGrantedCount = 0;
    
    for (const group of availableGroups) {
      try {
        const result = await apiClient.grantGroupAccess(course.id.toString(), group.id.toString());
        if (result.status === 'granted') {
          grantedCount++;
        } else if (result.status === 'already_granted') {
          alreadyGrantedCount++;
        }
      } catch (error) {
        console.error(`Failed to grant access to group ${group.name}:`, error);
      }
    }
    
    let message = '';
    if (grantedCount > 0) {
      message += `Доступ предоставлен ${grantedCount} группам. `;
    }
    if (alreadyGrantedCount > 0) {
      message += `${alreadyGrantedCount} групп уже имели доступ.`;
    }
    
    alert(message || 'Операция завершена');
    loadGroups(); // Reload to update status
  };

  const handleSaveCourse = async () => {
    if (!course?.id) return;
    
    setIsSaving(true);
    try {
      // Save course changes if any
      await apiClient.updateCourse(course.id.toString(), {
        title: course.title,
        description: course.description || '',
        estimated_duration_minutes: course.estimatedDurationMinutes || 0
      });
      
      alert('Course saved successfully!');
    } catch (error) {
      console.error('Failed to save course:', error);
      alert('Failed to save course. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !courseId) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await apiClient.uploadFile(formData, courseId);
      if (response.cover_image_url) {
        setCourse(prev => prev ? { ...prev, cover_image_url: response.cover_image_url } : null);
        setHasUnsavedChanges(true);
      } else {
        alert('Failed to upload image.');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    }
  };




  if (!course) return <Loader size="xl" animation="spin" color="#2563eb" />


  return (
    <>
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
            pendingChangesCount={pendingModules.length + pendingUpdates.length + pendingLectures.length}
            onNavigate={handleNavigate}
            activeSection={activeSection}
            onCourseStatusChange={(isActive) => {
              setCourse(prev => prev ? { ...prev, is_active: isActive } : null);
            }}
          />
      </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{course?.title || 'Course Builder'}</h1>
              <p className="text-gray-600 mt-1">Create and organize your course content</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleAutoEnrollStudents}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Users className="w-4 h-4" />
                <span>Grant access to groups</span>
              </Button>
            </div>
          </div>
          {activeSection === 'overview' && renderOverviewSection()}
          {activeSection === 'description' && renderDescriptionSection()}
          {activeSection === 'content' && renderContentSection()}
        </div>
      </div>

      {/* Modals and Dialogs */}
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
          
          // Update lesson
          const lessonPayload = { title: lecForm.title.trim() };
          await apiClient.updateLesson(lecForm.id, lessonPayload);
          
          // Get existing steps and update the first one
          const steps = await apiClient.getLessonSteps(lecForm.id);
          const stepPayload = {
            title: lecForm.title.trim(),
            content_type: lecForm.type === 'video' ? 'video_text' : lecForm.type,
            video_url: lecForm.type === 'video' ? lecForm.videoUrl?.trim() : undefined,
            content_text: lecForm.type === 'text' ? '' : undefined,
            order_index: 1
          };
          
          if (steps.length > 0) {
            await apiClient.updateStep(steps[0].id.toString(), stepPayload);
          } else {
            await apiClient.createStep(lecForm.id.toString(), stepPayload);
          }
          
          setLecForm({ open: false, title: '' });
          setHasUnsavedChanges(true);
          if (!courseId) return;
          const lectures = await apiClient.getModuleLessons(courseId, selected.module.id);
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

      {/* Group Management Modal */}
      <Modal
        open={showGroupManagementModal}
        title="Управление доступом к курсу"
        onClose={() => setShowGroupManagementModal(false)}
        onSubmit={() => setShowGroupManagementModal(false)}
        submitText="Закрыть"
        cancelText=""
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 mb-4">
            Выберите группы, которым хотите предоставить доступ к курсу. Все студенты в выбранных группах автоматически получат доступ к курсу.
          </p>
          
          {isLoadingGroups ? (
            <div className="flex justify-center py-8">
              <Loader />
            </div>
          ) : availableGroups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">У вас пока нет групп</p>
              <Button onClick={() => navigate('/groups')} variant="outline">
                Создать группу
              </Button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-medium">Ваши группы ({availableGroups.length})</h3>
                <Button 
                  onClick={grantAccessToAllGroups}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Предоставить всем</span>
                </Button>
              </div>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableGroups.map((group) => {
                  const hasAccess = groupsWithAccess.includes(group.id);
                  return (
                    <div 
                      key={group.id} 
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div>
                        <h4 className="font-medium">{group.name}</h4>
                        <p className="text-sm text-gray-500">
                          {group.student_count || 0} студентов
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {hasAccess ? (
                          <>
                            <Badge variant="secondary" className="text-green-600 bg-green-50">
                              Доступ есть
                            </Badge>
                            <Button
                              onClick={() => revokeAccessFromGroup(group.id.toString())}
                              size="sm"
                              variant="outline"
                              className="flex items-center space-x-1 text-red-600 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                              <span>Отозвать</span>
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => grantAccessToGroup(group.id.toString())}
                            size="sm"
                            variant="outline"
                            className="flex items-center space-x-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>Доступ</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </Modal>
    </> 
  );
}


