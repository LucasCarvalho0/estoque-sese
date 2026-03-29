import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({ open, onClose, title, children, size = 'md' }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className={`relative bg-dark-800 border border-dark-700 rounded-3xl w-full ${widths[size]} animate-fade-in shadow-2xl flex flex-col max-h-[95vh] overflow-hidden`}>
        <div className="flex items-center justify-between p-5 border-b border-dark-700 shrink-0">
          <h2 className="text-base font-bold text-slate-100 uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-dark-700 hover:bg-dark-600 transition-colors text-slate-400 hover:text-slate-100 border border-dark-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1">{children}</div>
      </div>
    </div>
  );
}
