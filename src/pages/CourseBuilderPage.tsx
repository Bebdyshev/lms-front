import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/api';
import Modal from '../components/Modal.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';
import CourseSidebar from '../components/CourseSidebar.tsx';
import type { Course, CourseModule, Lesson, LessonContentType } from '../types';
import { ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';

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
      
      // If modules exist, select the first one
      if (modules[0]) {
        const lectures = await apiClient.fetchLecturesByModule(modules[0].id);
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
    } catch (error) {
      console.error('Failed to load course data:', error);
    }
  };

  // New course creation handled in CreateCourseWizard

  const onSelectModule = async (m: CourseModule) => {
    const lectures = await apiClient.fetchLecturesByModule(m.id);
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
      
      // Clear pending changes
      setPendingModules([]);
      setPendingUpdates([]);
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

  const onAddLecture = () => setLecForm({ open: true, title: '', type: 'text', videoUrl: '' });
  // removed unused handler placeholder to satisfy noUnusedLocals
  // const submitAddLecture = async () => {};

  const onRemoveLecture = (id: string) => setConfirm({ open: true, action: async () => {
    if (!selected?.module) return;
    await apiClient.deleteLecture(id);
    const lectures = await apiClient.fetchLecturesByModule(selected.module.id);
    setSelected({ module: selected.module, lectures });
  }});

  // Redirect new course flow to the wizard
  if (isNewCourse) {
    navigate('/teacher/course/new');
    return null;
  }



  if (!course) return <div className="text-gray-500">Loading...</div>;

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
        <div className="space-y-4">
          {getDisplayModules().map((module, index) => (
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
                    <div className="relative dropdown-container">
                      <button 
                        onClick={() => toggleDropdown(module.id)}
                        className="p-2 hover:bg-gray-100 rounded"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                      </button>
                      {openDropdown === module.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-10 min-w-[120px]">
                          {!module.isPending && (
                            <button 
                              onClick={() => {
                                setModForm({ open: true, id: module.id, title: module.title, description: module.description });
                                setOpenDropdown(null);
                              }}
                              className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-t-lg"
                            >
                              Edit
                            </button>
                          )}
                          <button 
                            onClick={() => {
                              onRemoveModule(module.id);
                              setOpenDropdown(null);
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

                {!module.isPending && expandedModules.has(module.id) && (
                  <div className="border-t pt-4">
                    {selected?.module?.id === module.id && selected?.lectures && selected.lectures.length > 0 ? (
                      <div className="space-y-3">
                        {selected.lectures.map((l, lecIndex) => (
                          <div key={l.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-500">{lecIndex + 1}.1</span>
                              <div>
                                <div className="font-medium">{l.title}</div>
                                <div className="text-sm text-gray-500">Kerey Berdyshev</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => setLecForm({ open: true, id: l.id, title: l.title, type: l.content_type as LessonContentType })} 
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
                        <button 
                          onClick={() => { onSelectModule(module); onAddLecture(); }} 
                          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700"
                        >
                          <span>+</span>
                          <span>Create lesson</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <button 
                          onClick={() => { onSelectModule(module); onAddLecture(); }} 
                          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <span>+</span>
                          <span>Create lesson</span>
                        </button>
                      </div>
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
        title={lecForm.id ? 'Edit lesson' : 'New lesson'}
        onClose={() => setLecForm({ open: false, title: '', type: 'text', videoUrl: '' })}
        onSubmit={async () => {
          if (!lecForm.title.trim() || !selected?.module) return;
          const payload: any = { title: lecForm.title.trim(), content_type: lecForm.type };
          if (lecForm.type === 'video' && lecForm.videoUrl) payload.video_url = lecForm.videoUrl.trim();
          if (lecForm.id) {
            await apiClient.updateLecture(lecForm.id, payload);
          } else {
            await apiClient.createLecture(selected.module.id, payload);
          }
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


