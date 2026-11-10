// src/context/ToastContext.tsx
// Global Toast System — React Context + useReducer (no external deps)
import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { NotificationType } from '@/components/ui/toast';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToastItem {
  id: number;
  type: NotificationType;
  title: string;
  message?: string;
  showIcon: boolean;
  duration?: number;
}

type ToastAction =
  | { type: 'ADD'; toast: ToastItem }
  | { type: 'REMOVE'; id: number };

interface ToastContextValue {
  notifications: ToastItem[];
  removeToast: (id: number) => void;
  success: (title: string, message?: string, duration?: number) => number;
  error: (title: string, message?: string, duration?: number) => number;
  warning: (title: string, message?: string, duration?: number) => number;
  info: (title: string, message?: string, duration?: number) => number;
  loading: (title: string, message?: string) => number;
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

function toastReducer(
  state: ToastItem[],
  action: ToastAction,
): ToastItem[] {
  switch (action.type) {
    case 'ADD':
      // Maks 5 toast agar tidak membanjiri layar
      return [...state, action.toast].slice(-5);
    case 'REMOVE':
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: ReactNode }) {
  const [notifications, dispatch] = useReducer(toastReducer, []);
  const nextIdRef = useRef(1);

  const addToast = useCallback(
    (
      toastType: NotificationType,
      title: string,
      message?: string,
      duration?: number,
    ): number => {
      const id = nextIdRef.current++;
      dispatch({
        type: 'ADD',
        toast: { id, type: toastType, title, message, showIcon: true, duration },
      });
      return id;
    },
    [],
  );

  const removeToast = useCallback((id: number) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  const success = useCallback(
    (title: string, message?: string, duration = 3000) =>
      addToast('success', title, message, duration),
    [addToast],
  );

  const error = useCallback(
    (title: string, message?: string, duration = 5000) =>
      addToast('error', title, message, duration),
    [addToast],
  );

  const warning = useCallback(
    (title: string, message?: string, duration = 4000) =>
      addToast('warning', title, message, duration),
    [addToast],
  );

  const info = useCallback(
    (title: string, message?: string, duration = 4000) =>
      addToast('info', title, message, duration),
    [addToast],
  );

  const loading = useCallback(
    (title: string, message?: string) =>
      addToast('loading', title, message, undefined),
    [addToast],
  );

  return (
    <ToastContext.Provider
      value={{ notifications, removeToast, success, error, warning, info, loading }}
    >
      {children}
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      notifications: [],
      removeToast: () => {},
      success: () => 0,
      error: () => 0,
      warning: () => 0,
      info: () => 0,
      loading: () => 0,
    };
  }
  return ctx;
}
