"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  ({ isOpen, onClose, title, children, className, showCloseButton = true, size = "md" }, ref) => {
    const modalRef = React.useRef<HTMLDivElement | null>(null);

    // Handle focus restoration and escape key
    React.useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          onClose();
        }
      };

      let previousActiveElement: HTMLElement | null = null;

      if (isOpen) {
        previousActiveElement = document.activeElement as HTMLElement | null;
        document.addEventListener("keydown", handleEscape);
        document.body.style.overflow = "hidden";
      }

      return () => {
        document.removeEventListener("keydown", handleEscape);
        document.body.style.overflow = "unset";
        if (isOpen) {
          previousActiveElement?.focus();
        }
      };
    }, [isOpen, onClose]);

    React.useEffect(() => {
      if (!isOpen) return;
      const host = modalRef.current;
      if (!host) return;

      const getFocusable = () =>
        host.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

      // Focus the first element on open
      const initialFocus = () => {
        const focusable = getFocusable();
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          host.focus();
        }
      };
      
      initialFocus();

      // MutationObserver to handle dynamic content changes
      const observer = new MutationObserver(() => {
        // We could re-focus here if active element is lost
        if (!host.contains(document.activeElement)) {
          initialFocus();
        }
      });
      
      observer.observe(host, { childList: true, subtree: true });

      const handleTabTrap = (event: KeyboardEvent) => {
        if (event.key !== "Tab") return;
        
        const items = getFocusable();
        if (items.length === 0) return;

        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (active === first || !host.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (active === last || !host.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      };

      host.addEventListener("keydown", handleTabTrap);
      return () => {
        host.removeEventListener("keydown", handleTabTrap);
        observer.disconnect();
      };
    }, [isOpen]);

    if (!isOpen) return null;

    const sizeClasses = {
      sm: "max-w-md",
      md: "max-w-2xl",
      lg: "max-w-4xl",
      xl: "max-w-6xl",
      full: "max-w-full mx-4"
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        
        {/* Modal */}
        <div
          ref={(node) => {
            modalRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          className={cn(
            "relative w-full bg-background rounded-lg shadow-lg border max-h-[90vh] overflow-hidden flex flex-col",
            sizeClasses[size],
            className
          )}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2
              id="modal-title"
              className="text-xl font-semibold text-foreground"
            >
              {title}
            </h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </button>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {children}
          </div>
        </div>
      </div>
    );
  }
);

Modal.displayName = "Modal";

export { Modal };
