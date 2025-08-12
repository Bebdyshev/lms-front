import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal.tsx';
import Button from './Button.tsx';
import CourseCard from './CourseCard.tsx';
import apiClient from '../services/api';
import { useAuth } from '../contexts/AuthContext.tsx';

interface CreateCourseModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: (course: any) => void;
}

export default function CreateCourseModal({ open, onClose, onCreated }: CreateCourseModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [tags, setTags] = useState('');
  const [teacherId, setTeacherId] = useState<string>('');
  const [teachers, setTeachers] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const remaining = useMemo(() => Math.max(0, 64 - title.length), [title]);
  const canSubmit = title.trim().length > 0 && title.trim().length <= 64 && !saving;
  const [step, setStep] = useState<'form' | 'preview'>('form');

  useEffect(() => {
    if (!open) return;
    if (isAdmin) {
      loadTeachers();
    }
  }, [open]);

  const loadTeachers = async () => {
    try {
      const result = await apiClient.getUsers({ role: 'teacher', limit: 100 });
      setTeachers(result || []);
    } catch (e) {
      console.warn('Failed to load teachers');
    }
  };

  const resetState = () => {
    setTitle('');
    setDescription('');
    setThumbnailFile(null);
    setThumbnailPreview('');
    setTags('');
    setTeacherId('');
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      setSaving(true);
      const payload: any = {
        title: title.trim(),
        description: description.trim() || undefined,
      };
      if (isAdmin && teacherId) payload.teacher_id = Number(teacherId);

      const created = await apiClient.createCourse(payload);

      // Thumbnail handling
      if (thumbnailFile) {
        try { await apiClient.uploadCourseThumbnail(String(created.id), thumbnailFile); } catch {}
      }

      onCreated?.(created);
      resetState();
      onClose();
    } catch (e) {
      alert('Failed to create course');
    } finally {
      setSaving(false);
    }
  };

  const applyFile = (f: File | null) => {
    if (f) {
      setThumbnailFile(f);
      const url = URL.createObjectURL(f);
      setThumbnailPreview(url);
    } else {
      setThumbnailFile(null);
      setThumbnailPreview('');
    }
  };

  return (
    <Modal
      open={open}
      title={step === 'form' ? 'Create Course' : 'Preview Course Card'}
      onClose={() => { resetState(); setStep('form'); onClose(); }}
      onSubmit={step === 'form' ? () => setStep('preview') : handleSubmit}
      submitText={step === 'form' ? 'Next' : (saving ? 'Create & Edit' : 'Create & Edit')}
      cancelText={step === 'form' ? 'Cancel' : 'Back'}
      onCancel={step === 'form' ? undefined : () => setStep('form')}
    >
      {step === 'form' ? (
      <div className="space-y-4">
        {/* 1) Image upload (click or drag&drop) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail image</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => applyFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
          />
          <div
            role="button"
            aria-label="Upload course thumbnail"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const f = e.dataTransfer.files && e.dataTransfer.files[0];
              applyFile(f || null);
            }}
            className={`relative w-64 h-64 mx-auto border-2 border-dashed rounded-xl overflow-hidden flex items-center justify-center cursor-pointer transition ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:border-gray-400'}`}
          >
            {thumbnailPreview ? (
              <img src={thumbnailPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="text-center text-gray-500 text-sm">
                <div className="font-medium">Click to upload</div>
                <div className="text-xs">or drag & drop image here</div>
              </div>
            )}
          </div>
        </div>

        {/* 2) Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
          <input
            value={title}
            maxLength={64}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Course title"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-xs text-gray-500 mt-1">{remaining} characters left</div>
        </div>

        {/* 3) Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short course description"
            rows={3}
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 4) Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="react, javascript, frontend"
            className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">Tags are for future filtering (optional)</p>
        </div>

        {isAdmin && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign Teacher</label>
            <select
              className="w-full border rounded-lg px-3 py-2"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
            >
              <option value="">Select a teacher (optional)</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
              ))}
            </select>
          </div>
        )}
      </div>
      ) : (
        <div className="space-y-2">
          <CourseCard
            course={{
              id: 'preview',
              title: title || 'Course title',
              description: description || 'Short course description',
              image: thumbnailPreview || undefined,
              teacher: isAdmin ? (teachers.find(t => String(t.id) === teacherId)?.name || 'Teacher') : (user?.name || 'Me'),
              modulesCount: 0,
              progress: 0,
              status: 'not-started',
            }}
            onContinue={() => {}}
          />
          <div className="text-xs text-gray-500">This course will be created as a draft. You can add modules and lessons next.</div>
        </div>
      )}
    </Modal>
  );
}


