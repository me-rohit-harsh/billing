'use client';

import React, { useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';

export interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'amber' | 'blue' | 'emerald';
}

export function FormModal({
  isOpen,
  onClose,
  title,
  description,
  icon,
  children,
  onSubmit,
  submitLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  isSubmitting = false,
  maxWidth = 'md',
  variant = 'amber',
}: FormModalProps) {
  // Prevent body scroll lock when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle keyboard ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isSubmitting]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md sm:max-w-lg',
    lg: 'max-w-lg sm:max-w-xl',
    xl: 'max-w-xl sm:max-w-2xl',
  };

  const variantClasses = {
    amber: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500/30 text-white shadow-amber-600/20',
    blue: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500/30 text-white shadow-blue-600/20',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500/30 text-white shadow-emerald-600/20',
  };

  const iconBgClasses = {
    amber: 'bg-amber-100/90 text-amber-700 border-amber-200/80',
    blue: 'bg-blue-100/90 text-blue-700 border-blue-200/80',
    emerald: 'bg-emerald-100/90 text-emerald-700 border-emerald-200/80',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidthClasses[maxWidth]} bg-slate-200/50 p-2 sm:p-2.5 rounded-[28px] sm:rounded-[32px] border border-white/80 ring-1 ring-slate-900/10 shadow-2xl transition-all duration-200 animate-in zoom-in-95 my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full bg-white rounded-[22px] sm:rounded-[26px] overflow-hidden border border-slate-200/80 shadow-xs flex flex-col max-h-[85vh]">
          {/* HEADER */}
          <div className="p-5 sm:p-6 pb-4 sm:pb-5 bg-slate-50/70 border-b border-slate-100/90 flex items-start justify-between gap-4 shrink-0">
            <div className="flex items-start gap-3.5 min-w-0">
              {icon && (
                <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 shadow-2xs mt-0.5 ${iconBgClasses[variant]}`}>
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight leading-snug">
                  {title}
                </h3>
                {description && (
                  <p className="text-xs sm:text-sm font-semibold text-slate-500 mt-0.5 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 ml-2"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* FORM BODY & FOOTER */}
          <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto custom-scrollbar flex-1">
              {children}
            </div>

            {/* FOOTER */}
            <div className="p-4 sm:p-5 px-5 sm:px-6 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-11 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm transition-all cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`h-11 px-6 rounded-xl font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 focus:outline-none focus:ring-2 ${variantClasses[variant]}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{submitLabel}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

