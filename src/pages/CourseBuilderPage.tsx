import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Tabs from '../components/Tabs.tsx';
import apiClient from '../services/api';
import Modal from '../components/Modal.tsx';
import ConfirmDialog from '../components/ConfirmDialog.tsx';
import EmptyState from '../components/EmptyState.tsx';
import type { Course, CourseModule, Lesson, LessonContentType } from '../types';
import Badge from '../components/Badge.tsx';

interface SelectedModule {
  module: CourseModule;
  lectures: Lesson[];
}

interface ModuleForm {
  open: boolean;
  title: string;
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
  const [modForm, setModForm] = useState<ModuleForm>({ open: false, title: '' });
  const [lecForm, setLecForm] = useState<LectureForm>({ open: false, title: '', type: 'text' });
  const [confirm, setConfirm] = useState<ConfirmDialog>({ open: false, action: null });
  // Legacy state from old inline create form removed

  const isNewCourse = !courseId || courseId === 'new';

  useEffect(() => {
    if (!courseId || courseId === 'new') return;
    
    loadCourseData();
  }, [courseId]);

  const loadCourseData = async () => {
    if (!courseId || courseId === 'new') return;
    
    try {
      const courseData = await apiClient.fetchCourseById(courseId);
      setCourse(courseData);
      
      const modules = await apiClient.fetchModulesByCourse(courseId);
      setMods(modules);
      
      if (modules[0]) {
        const lectures = await apiClient.fetchLecturesByModule(modules[0].id);
        setSelected({ module: modules[0], lectures });
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

  const onAddModule = () => setModForm({ open: true, title: '' });
  // removed unused handler placeholder to satisfy noUnusedLocals
  // const submitAddModule = async () => {};

  const onRemoveModule = (id: string) => setConfirm({ open: true, action: async () => {
    if (!courseId) return;
    await apiClient.deleteModule(courseId, id);
    const ms = await apiClient.fetchModulesByCourse(courseId);
    setMods(ms);
    setSelected(null);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Course Builder — {course.title}</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Autosave</span>
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Outline */}
        <div className="col-span-4 card overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold flex items-center justify-between">
            <span>Curriculum</span>
            <button onClick={onAddModule} className="btn-primary text-sm">+ Module</button>
          </div>
          {mods.length === 0 ? (
            <EmptyState title="No modules" subtitle="Add your first module" />
          ) : (
            <div>
              {mods.map(m => (
                <div key={m.id} className={`px-4 py-3 border-b ${selected?.module?.id === m.id ? 'bg-gray-50' : ''}`}>
                  <button onClick={() => onSelectModule(m)} className="w-full text-left">
                    <div className="font-medium">{m.title}</div>
                    <div className="text-xs text-gray-500">{m.description}</div>
                  </button>
                  <div className="mt-2 text-right space-x-2">
                    <button onClick={() => setModForm({ open: true, id: m.id, title: m.title })} className="px-2 py-1 bg-gray-100 rounded text-xs">Rename</button>
                    <button onClick={() => onRemoveModule(m.id)} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main workspace */}
        <div className="col-span-8 card p-6">
          {!selected ? (
            <EmptyState title="Select a module" subtitle="Pick a module from the left to start editing" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-500">Module</div>
                  <div className="text-xl font-semibold">{selected.module.title}</div>
                </div>
                <button onClick={onAddLecture} className="btn-primary text-sm">+ Lesson</button>
              </div>

              <Tabs tabs={["Content", "Video", "Quiz", "Settings"]} value={0} onChange={() => {}} />

              {selected.lectures.length === 0 ? (
                <EmptyState title="No lessons yet" subtitle="Add a lesson to start writing or recording" />
              ) : (
                <ul className="space-y-3">
                  {selected.lectures.map(l => (
                    <li key={l.id} className="px-4 py-3 border rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-medium">{l.title}</div>
                        <div className="mt-1">
                          <Badge color={l.content_type === 'video' ? 'blue' : l.content_type === 'quiz' ? 'yellow' : 'green'}>
                            {l.content_type === 'video' ? 'Video' : l.content_type === 'quiz' ? 'Quiz' : 'Text'}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-x-2">
                        <button onClick={() => setLecForm({ open: true, id: l.id, title: l.title, type: l.content_type as LessonContentType })} className="px-3 py-1.5 bg-gray-100 rounded-lg">Edit</button>
                        <button onClick={() => onRemoveLecture(l.id)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg">Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      
      <Modal
        open={modForm.open}
        title={modForm.id ? 'Edit module' : 'New module'}
        onClose={() => setModForm({ open: false, title: '' })}
        onSubmit={async () => {
          if (!courseId || !modForm.title.trim()) return;
          if (modForm.id) {
            await apiClient.updateModule(courseId, modForm.id, { title: modForm.title.trim() });
          } else {
            await apiClient.createModule(courseId, { title: modForm.title.trim() });
          }
          setModForm({ open: false, title: '' });
          setMods(await apiClient.fetchModulesByCourse(courseId));
        }}
      >
        <div>
          <label className="block text-sm text-gray-600 mb-1">Title</label>
          <input className="w-full border rounded-lg px-3 py-2" value={modForm.title} onChange={e => setModForm(f => ({ ...f, title: e.target.value }))} />
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
          const lectures = await apiClient.fetchLecturesByModule(selected.module.id);
          setSelected({ module: selected.module, lectures });
        }}
      >
        <div>
          <label className="block text-sm text-gray-600 mb-1">Title</label>
          <input className="w-full border rounded-lg px-3 py-2" value={lecForm.title} onChange={e => setLecForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Lesson Type</label>
          <select className="w-full border rounded-lg px-3 py-2" value={lecForm.type} onChange={(e) => setLecForm(f => ({ ...f, type: e.target.value as LessonContentType }))}>
            <option value="text">Text</option>
            <option value="video">Video</option>
            <option value="quiz">Quiz</option>
          </select>
        </div>
        {lecForm.type === 'video' && (
          <div>
            <label className="block text-sm text-gray-600 mb-1">Video URL</label>
            <input className="w-full border rounded-lg px-3 py-2" value={lecForm.videoUrl || ''} onChange={e => setLecForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="https://..." />
          </div>
        )}
      </Modal>

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


