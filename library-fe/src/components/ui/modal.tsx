import React, { type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/utils/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full" | "fullscreen";
  animation?: "scale" | "slide" | "fade" | "bounce";
  className?: string;
  bodyClassName?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  title,
  size = "md",
  animation = "scale",
  className,
  bodyClassName,
}) => {
  // Animation variants based on animation type
  const getModalVariants = (animationType: string) => {
    switch (animationType) {
      case "scale":
        return {
          hidden: { opacity: 0, scale: 0.75, y: 20 },
          visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
              type: "spring" as const,
              damping: 25,
              stiffness: 300,
            },
          },
          exit: {
            opacity: 0,
            scale: 0.75,
            y: 20,
            transition: { duration: 0.2 },
          },
        };

      case "slide":
        return {
          hidden: { opacity: 0, y: -50, scale: 0.95 },
          visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
              type: "spring" as const,
              damping: 20,
              stiffness: 300,
            },
          },
          exit: {
            opacity: 0,
            y: -30,
            scale: 0.95,
            transition: { duration: 0.2 },
          },
        };

      case "fade":
        return {
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { duration: 0.3, ease: "easeOut" as const },
          },
          exit: {
            opacity: 0,
            transition: { duration: 0.2 },
          },
        };

      case "bounce":
        return {
          hidden: { opacity: 0, scale: 0.3, rotate: -10 },
          visible: {
            opacity: 1,
            scale: 1,
            rotate: 0,
            transition: {
              type: "spring" as const,
              damping: 15,
              stiffness: 400,
              bounce: 0.6,
            },
          },
          exit: {
            opacity: 0,
            scale: 0.3,
            rotate: 10,
            transition: { duration: 0.2 },
          },
        };

      default:
        return {
          hidden: { opacity: 0, scale: 0.75, y: 20 },
          visible: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
              type: "spring" as const,
              damping: 25,
              stiffness: 300,
            },
          },
          exit: {
            opacity: 0,
            scale: 0.75,
            y: 20,
            transition: { duration: 0.2 },
          },
        };
    }
  };

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const modalVariants = getModalVariants(animation);
  // Handle body scroll and pointer events
  useEffect(() => {
    if (isOpen) {
      // Store original values
      const originalOverflow = document.body.style.overflow;
      const originalPointerEvents = document.body.style.pointerEvents;

      // Apply modal styles
      document.body.style.overflow = "hidden";
      document.body.style.pointerEvents = "none";

      // Cleanup on modal close or unmount
      return () => {
        document.body.style.overflow = originalOverflow || "";
        document.body.style.pointerEvents = originalPointerEvents || "";
      };
    }
  }, [isOpen]);

  // Handle escape key - only when modal is open
  useEffect(() => {
    if (!isOpen) return; // Early return if modal is closed

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    // Add listener only when modal is open
    document.addEventListener("keydown", handleEscape);

    // Cleanup when modal closes or component unmounts
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isFull = size === "full" || size === "fullscreen";

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "w-[96vw] max-w-[96vw] h-[94vh] max-h-[94vh] mx-auto rounded-2xl flex flex-col overflow-hidden",
    fullscreen: "w-screen max-w-none h-screen max-h-screen m-0 rounded-none flex flex-col overflow-hidden",
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={backdropVariants}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className={cn(
              "absolute inset-0 backdrop-blur-sm",
              "bg-black/60 dark:bg-black/80"
            )}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal Content */}
          <motion.div
            className={cn(
              "relative shadow-2xl w-full",
              isFull
                ? sizeClasses[size]
                : cn("mx-4 rounded-xl max-h-[90vh] overflow-auto", sizeClasses[size]),
              "bg-card text-card-foreground",
              "border border-border",
              className
            )}
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {title && (
              <div
                className={cn(
                  "flex items-center justify-between p-4 border-b shrink-0",
                  "border-border bg-muted/30"
                )}
              >
                <h3
                  className={cn(
                    "text-base font-bold",
                    "text-foreground truncate pr-4"
                  )}
                >
                  {title}
                </h3>
                <button
                  onClick={onClose}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors cursor-pointer shrink-0",
                    "text-muted-foreground hover:text-foreground",
                    "hover:bg-muted"
                  )}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}

            <div
              className={cn(
                "p-4",
                isFull && "flex-1 flex flex-col min-h-0 overflow-hidden p-4",
                bodyClassName
              )}
            >
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default Modal;
