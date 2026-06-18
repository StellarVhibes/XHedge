"use client";

import React, { createContext, useCallback, useContext, useEffect, ReactNode, useState } from "react";
import { useSorobanEvents, SorobanEvent } from "@/hooks/use-soroban-events";
import { safeLocalStorage } from "@/lib/safe-local-storage";

const NOTIFICATION_STORAGE_KEY = "xh_notifications";

export const NOTIFICATION_TYPES = [
  "harvest_complete",
  "strategy_flagged",
  "withdrawal_queued",
  "appeal_filed",
  "vault_paused",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationSeverity = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: NotificationType;
  severity: NotificationSeverity;
}

type NewNotification = Omit<Notification, "id" | "timestamp" | "read">;

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: NewNotification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  requestPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const notificationTypeSet = new Set<string>(NOTIFICATION_TYPES);
const severitySet = new Set<string>(["info", "success", "warning", "error"]);

function createNotificationId() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).substring(2, 9);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNotificationType(value: unknown): value is NotificationType {
  return typeof value === "string" && notificationTypeSet.has(value);
}

function isNotificationSeverity(value: unknown): value is NotificationSeverity {
  return typeof value === "string" && severitySet.has(value);
}

function parseStoredNotification(value: unknown): Notification | null {
  if (!isRecord(value)) return null;

  const { id, title, message, timestamp, read, type, severity } = value;
  if (
    typeof id !== "string" ||
    typeof title !== "string" ||
    typeof message !== "string" ||
    typeof timestamp !== "string" ||
    typeof read !== "boolean"
  ) {
    return null;
  }

  const parsedTimestamp = new Date(timestamp);
  if (Number.isNaN(parsedTimestamp.getTime()) || !isNotificationType(type)) {
    return null;
  }

  return {
    id,
    title,
    message,
    timestamp: parsedTimestamp,
    read,
    type,
    severity: isNotificationSeverity(severity) ? severity : "info",
  };
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = safeLocalStorage.get(NOTIFICATION_STORAGE_KEY);
    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const validatedNotifications = parsed.flatMap((entry) => {
            const notification = parseStoredNotification(entry);
            if (!notification) {
              console.warn("Discarding malformed notification entry:", entry);
              return [];
            }
            return [notification];
          });
          setNotifications(validatedNotifications);
        }
      } catch (e) {
        console.error("Failed to parse notifications", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (isInitialized) {
      safeLocalStorage.set(NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications));
    }
  }, [notifications, isInitialized]);

  // Register Service Worker and request permissions if possible
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .catch(err => console.error('SW registration failed', err));
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }, []);

  const addNotification = useCallback((n: NewNotification) => {
    const newNotification: Notification = {
      ...n,
      id: createNotificationId(),
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev) => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const openNotificationDrawer = useCallback((open: boolean) => {
    setIsOpen(open);
    if (open) {
      markAllAsRead();
    }
  }, [markAllAsRead]);

  const onChainEventCallback = useCallback((event: SorobanEvent) => {
    const title = `${event.type} Detected`;
    let message = `Contract: ${event.contractId.substring(0, 6)}...`;
    let type: NotificationType = "harvest_complete";
    let severity: NotificationSeverity = "info";

    if (event.type === "Deposit") {
      message = "You successfully deposited funds into the vault.";
      type = "harvest_complete";
      severity = "success";
    } else if (event.type === "Withdraw") {
      message = "Your withdrawal has been queued for processing.";
      type = "withdrawal_queued";
      severity = "success";
    } else if (event.type === "Rebalance") {
      message = "A strategy rebalance needs review.";
      type = "strategy_flagged";
      severity = "warning";
    }

    addNotification({ title, message, type, severity });

    // Show browser notification if permission granted and page is hidden
    if ("Notification" in window && Notification.permission === "granted" && document.visibilityState === "hidden") {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body: message,
          icon: "/shield.png",
          data: window.location.origin,
        });
      });
    }
  }, [addNotification]);

  useSorobanEvents(onChainEventCallback);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        isOpen,
        setIsOpen: openNotificationDrawer,
        requestPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
