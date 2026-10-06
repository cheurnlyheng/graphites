'use client';

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

type ConfirmFn = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Drop-in, promise-based replacement for window.confirm() so admin "delete this?" prompts look
 * like the rest of the app instead of a raw browser dialog. Usage stays the same shape as
 * window.confirm: `if (!(await confirm('Delete this?'))) return;`. */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | undefined>(undefined);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setOptions(typeof opts === 'string' ? { message: opts } : opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function settle(result: boolean) {
    resolverRef.current?.(result);
    setOptions(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 animate-fade-in"
          onClick={() => settle(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl border border-black/5"
          >
            <h2 className="text-sm font-bold uppercase tracking-wide text-[#10100F] mb-2">
              {options.title ?? 'Please confirm'}
            </h2>
            <p className="text-sm text-[#10100F]/70 leading-relaxed mb-6 whitespace-pre-line">
              {options.message}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => settle(false)}
                className="rounded-lg border border-black/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#10100F]/70 hover:bg-black/5 transition-all"
              >
                {options.cancelLabel ?? 'Cancel'}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => settle(true)}
                className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-all active:scale-95 ${
                  options.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#10100F] hover:bg-neutral-800'
                }`}
              >
                {options.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
