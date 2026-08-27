'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, Loader2, Info } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  isSubmitting?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = true,
  isSubmitting = false,
}: ConfirmModalProps) {
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={() => {
        if (!isSubmitting) onClose();
      }}
    >
      <div
        className="w-full max-w-sm sm:max-w-md bg-slate-200/50 p-2 sm:p-2.5 rounded-[28px] sm:rounded-[32px] border border-white/80 ring-1 ring-slate-900/10 shadow-2xl transition-all duration-200 animate-in zoom-in-95 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full bg-white rounded-[22px] sm:rounded-[26px] p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col items-center text-center">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 shadow-xs ${
              isDestructive
                ? 'bg-rose-100 text-rose-600 border border-rose-200/80'
                : 'bg-amber-100 text-amber-600 border border-amber-200/80'
            }`}
          >
            {isDestructive ? (
              <Trash2 className="w-7 h-7" />
            ) : (
              <AlertTriangle className="w-7 h-7" />
            )}
          </div>

          <h3 className="font-extrabold text-slate-900 text-xl tracking-tight mb-2">
            {title}
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-slate-500 leading-relaxed max-w-xs mb-6">
            {message}
          </p>

          <div className="flex items-center justify-center gap-3 w-full">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`flex-1 h-11 px-4 rounded-xl font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                isDestructive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20 focus:ring-2 focus:ring-rose-500/30'
                  : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20 focus:ring-2 focus:ring-amber-500/30'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{confirmLabel}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

