"use client";
import { useEffect, useRef } from 'react';

export default function Modal({ open, title, onClose, children, footer }: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}){
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent){ if (e.key === 'Escape') onClose(); }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black" onClick={onClose} />
      <div ref={ref} className="relative w-[95vw] max-w-md card bg-slate-900 p-0 overflow-hidden">
        {title && <div className="px-4 py-3 border-b border-slate-700 font-semibold bg-slate-800">{title}</div>}
        <div className="p-4">
          {children}
        </div>
        {footer && <div className="px-4 py-3 border-t border-slate-700 bg-slate-900 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
