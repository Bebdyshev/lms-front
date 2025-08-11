import React from 'react';

export default function Modal({ open, title, children, onClose, onSubmit, submitText = 'Save' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-card w-full max-w-lg p-6">
        <div className="text-lg font-semibold mb-4">{title}</div>
        <div className="space-y-4">{children}</div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100">Cancel</button>
          <button onClick={onSubmit} className="btn-primary">{submitText}</button>
        </div>
      </div>
    </div>
  );
}


