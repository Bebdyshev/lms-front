import React from 'react';

export default function ConfirmDialog({ open, title = 'Are you sure?', description, confirmText = 'Delete', cancelText = 'Cancel', onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-card w-full max-w-md p-6">
        <div className="text-lg font-semibold mb-2">{title}</div>
        {description && <div className="text-sm text-gray-600 mb-4">{description}</div>}
        <div className="mt-2 flex items-center justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-gray-100">{cancelText}</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white">{confirmText}</button>
        </div>
      </div>
    </div>
  );
}


