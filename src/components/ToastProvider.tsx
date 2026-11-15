import React, { createContext, useCallback, useContext, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from 'lucide-react';
import type { ToastItem, ToastVariant } from '../types/certificate';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
}

interface FeedbackContextValue {
  showToast: (
    variant: ToastVariant,
    title: string,
    description?: string
  ) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useFeedback harus digunakan di dalam FeedbackProvider');
  }
  return ctx;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(
    null
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, variant, title, description }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4500);
    },
    [dismissToast]
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPendingConfirm({ ...options, resolve });
    });
  }, []);

  const handleConfirmChoice = (result: boolean) => {
    if (pendingConfirm) {
      pendingConfirm.resolve(result);
      setPendingConfirm(null);
    }
  };

  return (
    <FeedbackContext.Provider value={{ showToast, confirm }}>
      {children}

      {/* Toast Stack */}
      <div
        aria-live="polite"
        aria-label="Notifikasi aplikasi"
        className="pointer-events-none fixed top-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-2.5 px-2 sm:top-5 sm:right-6 sm:px-0"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => {
            const styles = {
              success: {
                container: 'border-emerald-200 bg-white text-slate-900',
                iconWrap: 'bg-emerald-50 text-emerald-600',
                Icon: CheckCircle2,
              },
              error: {
                container: 'border-red-200 bg-white text-slate-900',
                iconWrap: 'bg-red-50 text-red-600',
                Icon: XCircle,
              },
              warning: {
                container: 'border-amber-200 bg-white text-slate-900',
                iconWrap: 'bg-amber-50 text-amber-600',
                Icon: AlertTriangle,
              },
              info: {
                container: 'border-teal-200 bg-white text-slate-900',
                iconWrap: 'bg-teal-50 text-teal-600',
                Icon: Info,
              },
            }[toast.variant];

            const IconComponent = styles.Icon;

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.96 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                role="status"
                className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-lg shadow-slate-900/8 ${styles.container}`}
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${styles.iconWrap}`}
                >
                  <IconComponent className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-semibold leading-snug text-slate-900">
                    {toast.title}
                  </p>
                  {toast.description && (
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                      {toast.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Tutup notifikasi"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Modern Confirmation Modal */}
      <AnimatePresence>
        {pendingConfirm && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => handleConfirmChoice(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    pendingConfirm.variant === 'danger'
                      ? 'bg-red-50 text-red-600'
                      : pendingConfirm.variant === 'warning'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-teal-50 text-teal-600'
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h3
                    id="confirm-modal-title"
                    className="text-base font-semibold text-slate-900"
                  >
                    {pendingConfirm.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    {pendingConfirm.message}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => handleConfirmChoice(false)}
                  className="min-h-10 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                >
                  {pendingConfirm.cancelLabel || 'Batal'}
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmChoice(true)}
                  className={`min-h-10 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors whitespace-nowrap ${
                    pendingConfirm.variant === 'danger'
                      ? 'bg-red-600 hover:bg-red-700'
                      : pendingConfirm.variant === 'warning'
                      ? 'bg-amber-600 hover:bg-amber-700'
                      : 'bg-teal-600 hover:bg-teal-700'
                  }`}
                >
                  {pendingConfirm.confirmLabel || 'Lanjutkan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </FeedbackContext.Provider>
  );
};
