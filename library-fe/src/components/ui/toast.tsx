'use client';
import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'loading';

interface NotificationProps {
  type: NotificationType;
  title: string;
  message?: string;
  showIcon?: boolean;
  duration?: number;
  onClose: () => void;
}

const notificationConfig = {
  info: {
    badgeColor: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50',
    progressColor: 'bg-blue-500',
    icon: <Info size={16} strokeWidth={2.2} />,
  },
  success: {
    badgeColor: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50',
    progressColor: 'bg-emerald-500',
    icon: <CheckCircle2 size={16} strokeWidth={2.2} />,
  },
  warning: {
    badgeColor: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50',
    progressColor: 'bg-amber-500',
    icon: <AlertTriangle size={16} strokeWidth={2.2} />,
  },
  error: {
    badgeColor: 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50',
    progressColor: 'bg-red-500',
    icon: <AlertCircle size={16} strokeWidth={2.2} />,
  },
  loading: {
    badgeColor: 'bg-slate-50 dark:bg-slate-800 text-[#9D171D] border border-slate-200 dark:border-slate-700',
    progressColor: 'bg-[#9D171D]',
    icon: <Loader2 size={16} className="animate-spin" />,
  },
};

const Notification: React.FC<NotificationProps> = ({
  type,
  title,
  message,
  showIcon = true,
  duration,
  onClose,
}) => {
  const config = notificationConfig[type] || notificationConfig.info;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
      className="relative w-full rounded-2xl bg-white dark:bg-card border border-slate-200/80 dark:border-border/80 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.12),0_4px_12px_-2px_rgba(0,0,0,0.06)] overflow-hidden p-3.5 sm:p-4"
    >
      <div className="flex items-start gap-3">
        {showIcon && (
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-xs',
              config.badgeColor,
            )}
          >
            {config.icon}
          </div>
        )}

        <div className="flex-1 min-w-0 pr-1">
          <h4 className="text-[13px] sm:text-sm font-bold text-slate-900 dark:text-foreground leading-snug">
            {title}
          </h4>
          {message && (
            <p className="text-xs text-slate-500 dark:text-muted-foreground font-normal leading-relaxed mt-0.5">
              {message}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-muted transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer"
          aria-label="Tutup notifikasi"
        >
          <X size={15} />
        </button>
      </div>

      {duration && (
        <div className="absolute bottom-0 left-0 h-[2.5px] w-full bg-slate-100 dark:bg-muted overflow-hidden">
          <motion.div
            initial={{ width: '100%' }}
            animate={{ width: 0 }}
            transition={{ duration: duration / 1000, ease: 'linear' }}
            onAnimationComplete={onClose}
            className={cn('h-full', config.progressColor)}
          />
        </div>
      )}
    </motion.div>
  );
};

export default Notification;