"use client";

import React, { useEffect, useRef } from "react";
import { X, Bell, Trash2, CheckCircle2, Clock } from "lucide-react";
import { useNotifications, Notification } from "@/app/context/NotificationContext";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export function NotificationDrawer() {
  const {
    notifications,
    unreadCount,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
    clearAll,
    addNotification,
  } = useNotifications();

  const drawerRef = useRef<HTMLDivElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  // Save the element that opened the drawer so we can restore focus on close
  useEffect(() => {
    if (isOpen) {
      lastFocusedRef.current = document.activeElement as HTMLElement;
    } else if (lastFocusedRef.current) {
      lastFocusedRef.current.focus();
      lastFocusedRef.current = null;
    }
  }, [isOpen]);

  // Focus the first focusable element when the drawer opens
  useEffect(() => {
    if (!isOpen || !drawerRef.current) return;
    const getFocusable = () =>
      drawerRef.current!.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
    const focusable = getFocusable();
    if (focusable.length > 0) focusable[0].focus();

    const handleTabTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !drawerRef.current!.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !drawerRef.current!.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    const host = drawerRef.current;
    host.addEventListener("keydown", handleTabTrap);
    return () => host.removeEventListener("keydown", handleTabTrap);
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, setIsOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-drawer-title"
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-full max-w-md bg-background border-l shadow-xl transition-transform duration-300 transform flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" aria-hidden="true" />
            <h2 id="notification-drawer-title" className="text-xl font-semibold text-foreground">Notifications</h2>
            {unreadCount > 0 && (
              <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full" aria-live="polite" aria-atomic="true">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close notifications panel"
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Actions */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 bg-muted/30 border-b">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8"
              onClick={markAllAsRead}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Mark all as read
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={clearAll}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Clear all
            </Button>
          </div>
        )}

        {/* Content */}
        <ScrollArea className="flex-1">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center mt-20">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium text-foreground">No notifications yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                We'll notify you when something important happens.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  role="listitem"
                  className={cn(
                    "p-4 transition-colors hover:bg-muted/50 relative group",
                    !n.read && "bg-primary/5"
                  )}
                  onClick={() => !n.read && markAsRead(n.id)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "mt-1 w-2 h-2 rounded-full",
                        !n.read ? "bg-primary" : "bg-transparent"
                      )}
                      aria-hidden="true"
                    />
                    <div className="flex-1 pr-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-foreground">
                          {n.title}
                        </span>
                        <div className="flex items-center text-[10px] text-muted-foreground">
                          <Clock className="w-3 h-3 mr-1" aria-hidden="true" />
                          <time dateTime={n.timestamp.toISOString()}>{formatTimestamp(n.timestamp)}</time>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                  </div>
                  {!n.read && (
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-primary/10 rounded-md"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(n.id);
                      }}
                      aria-label={`Mark "${n.title}" as read`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-primary" aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        {/* Footer */}
        <div className="p-4 border-t bg-muted/30">
          <Button 
            className="w-full" 
            variant="outline"
            onClick={() => {
              const testNotifs = [
                { title: "Vault Activated", message: "Your XLM-USDC vault strategy is now active.", type: "success" as const },
                { title: "Price Alert", message: "Stellar XLM has reached its target price.", type: "info" as const },
                { title: "Payout Processed", message: "Your monthly reward has been processed.", type: "success" as const },
              ];
              const random = testNotifs[Math.floor(Math.random() * testNotifs.length)];
              addNotification(random);
            }}
          >
            Check for Updates
          </Button>
        </div>
      </div>
    </>
  );
}

function formatTimestamp(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}
