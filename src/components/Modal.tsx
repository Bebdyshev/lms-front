
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
}

export default function Modal({ open, title, children, onClose, onSubmit, submitText = 'Save', cancelText = 'Cancel', onCancel }: ModalProps) {
  if (!open) return null;
  const content = (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-card w-full max-w-lg p-6">
        <div className="text-lg font-semibold mb-4">{title}</div>
        <div className="space-y-4 max-h-[70vh] overflow-auto px-3">{children}</div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onCancel || onClose} className="px-4 py-2 rounded-lg bg-gray-100">{cancelText}</button>
          <button onClick={onSubmit} className="btn-primary">{submitText}</button>
        </div>
      </div>
    </div>
  );
  return createPortal(content, document.body);
}


