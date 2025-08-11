import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchCourseById, fetchModulesByCourse, fetchLecturesByModule, createModule, deleteModule, createLecture, deleteLecture, updateModule, updateLecture } from '../services/api';
import Modal from '../components/Modal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import EmptyState from '../components/EmptyState.jsx';

export default function CourseBuilderPage() {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [mods, setMods] = useState([]);
  const [selected, setSelected] = useState(null);
  const [modForm, setModForm] = useState({ open: false, title: '' });
  const [lecForm, setLecForm] = useState({ open: false, title: '' });
  const [confirm, setConfirm] = useState({ open: false, action: null });

  useEffect(() => {
    fetchCourseById(courseId).then(setCourse);
    fetchModulesByCourse(courseId).then(async ms => {
      setMods(ms);
      if (ms[0]) setSelected({ module: ms[0], lectures: await fetchLecturesByModule(ms[0].id) });
    });
  }, [courseId]);

  const onSelectModule = async m => {
    setSelected({ module: m, lectures: await fetchLecturesByModule(m.id) });
  };

  const onAddModule = () => setModForm({ open: true, title: '' });
  const submitAddModule = async () => {
    if (!modForm.title.trim()) return;
    await createModule(courseId, { title: modForm.title.trim() });
    setModForm({ open: false, title: '' });
    setMods(await fetchModulesByCourse(courseId));
  };

  const onRemoveModule = (id) => setConfirm({ open: true, action: async () => {
    await deleteModule(id);
    const ms = await fetchModulesByCourse(courseId);
    setMods(ms);
    setSelected(null);
  }});

  const onAddLecture = () => setLecForm({ open: true, title: '' });
  const submitAddLecture = async () => {
    if (!selected?.module || !lecForm.title.trim()) return;
    await createLecture(selected.module.id, { title: lecForm.title.trim() });
    setLecForm({ open: false, title: '' });
    setSelected({ module: selected.module, lectures: await fetchLecturesByModule(selected.module.id) });
  };

  const onRemoveLecture = (id) => setConfirm({ open: true, action: async () => {
    await deleteLecture(id);
    setSelected({ module: selected.module, lectures: await fetchLecturesByModule(selected.module.id) });
  }});

  if (!course) return <div className="text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Course Builder — {course.title}</h1>
      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-4 card overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold flex items-center justify-between">
            <span>Modules</span>
            <button onClick={onAddModule} className="btn-primary text-sm">Add</button>
          </div>
          {mods.length === 0 ? (
            <EmptyState />
          ) : (
            <div>
              {mods.map(m => (
                <div key={m.id} className={`px-4 py-3 border-b ${selected?.module?.id === m.id ? 'bg-gray-50' : ''}`}>
                  <button onClick={() => onSelectModule(m)} className="w-full text-left">
                    <div className="font-medium">{m.title}</div>
                    <div className="text-xs text-gray-500">{m.description}</div>
                  </button>
                <div className="mt-2 text-right space-x-2">
                  <button onClick={() => setModForm({ open: true, id: m.id, title: m.title })} className="px-2 py-1 bg-gray-100 rounded text-xs">Edit</button>
                  <button onClick={() => onRemoveModule(m.id)} className="px-2 py-1 bg-red-600 text-white rounded text-xs">Delete</button>
                </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="col-span-8 card p-6">
          {!selected ? (
            <EmptyState title="Select module" />
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-gray-500">Module</div>
                  <div className="text-xl font-semibold">{selected.module.title}</div>
                </div>
                <button onClick={onAddLecture} className="btn-primary text-sm">Add lecture</button>
              </div>
              {selected.lectures.length === 0 ? (
                <EmptyState title="No lectures" subtitle="Add your first lecture" />
              ) : (
                <ul className="space-y-3">
                  {selected.lectures.map(l => (
                    <li key={l.id} className="px-4 py-3 border rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-medium">{l.title}</div>
                        <div className="text-xs text-gray-500">Video • 45 min</div>
                      </div>
                      <div className="space-x-2">
                        <button onClick={() => setLecForm({ open: true, id: l.id, title: l.title })} className="px-3 py-1.5 bg-gray-100 rounded-lg">Edit</button>
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
          if (!modForm.title.trim()) return;
          if (modForm.id) {
            await updateModule(modForm.id, { title: modForm.title.trim() });
          } else {
            await createModule(courseId, { title: modForm.title.trim() });
          }
          setModForm({ open: false, title: '' });
          setMods(await fetchModulesByCourse(courseId));
        }}
      >
        <div>
          <label className="block text-sm text-gray-600 mb-1">Title</label>
          <input className="w-full border rounded-lg px-3 py-2" value={modForm.title} onChange={e => setModForm(f => ({ ...f, title: e.target.value }))} />
        </div>
      </Modal>

      
      <Modal
        open={lecForm.open}
        title={lecForm.id ? 'Edit lecture' : 'New lecture'}
        onClose={() => setLecForm({ open: false, title: '' })}
        onSubmit={async () => {
          if (!lecForm.title.trim() || !selected?.module) return;
          if (lecForm.id) {
            await updateLecture(lecForm.id, { title: lecForm.title.trim() });
          } else {
            await createLecture(selected.module.id, { title: lecForm.title.trim() });
          }
          setLecForm({ open: false, title: '' });
          setSelected({ module: selected.module, lectures: await fetchLecturesByModule(selected.module.id) });
        }}
      >
        <div>
          <label className="block text-sm text-gray-600 mb-1">Title</label>
          <input className="w-full border rounded-lg px-3 py-2" value={lecForm.title} onChange={e => setLecForm(f => ({ ...f, title: e.target.value }))} />
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
  );
}


