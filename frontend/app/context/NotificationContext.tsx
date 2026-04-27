"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useSorobanEvents, SorobanEvent } from "@/hooks/use-soroban-events";

export interface Notification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: "info" | "success" | "warning" | "error";
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  requestPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("xh_notifications");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setNotifications(
          parsed.map((n: any) => ({
            ...n,
            timestamp: new Date(n.timestamp),
          }))
        );
      } catch (e) {
        console.error("Failed to parse notifications", e);
      }
    }
    setIsInitialized(true);
  }, []);

  // Save to localStorage on change
  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem("xh_notifications", JSON.stringify(notifications));
    }
  }, [notifications, isInitialized]);

  // Register Service Worker and request permissions if possible
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .catch(err => console.error('SW registration failed', err));
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const onChainEventCallback = useCallback((event: SorobanEvent) => {
    const title = `${event.type} Detected`;
    let message = `Contract: ${event.contractId.substring(0, 6)}...`;
    let type: "info" | "success" | "warning" | "error" = "info";

    if (event.type === "Deposit") {
        message = `You successfully deposited funds into the vault.`;
        type = "success";
    } else if (event.type === "Withdraw") {
        message = `You successfully withdrew funds from the vault.`;
        type = "success";
    } else if (event.type === "Rebalance") {
        message = `The AI engine has triggered a rebalance for your portfolio.`;
        type = "warning";
    }

    addNotification({ title, message, type });

    // Show browser notification if permission granted and page is hidden
    if (Notification.permission === 'granted' && document.visibilityState === 'hidden') {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification(title, {
                body: message,
                icon: '/shield.png',
                data: window.location.origin
            });
        });
    }
  }, []);

  useSorobanEvents(onChainEventCallback);

  const addNotification = (n: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...n,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
      read: false,
    };
    setNotifications((prev: Notification[]) => [newNotification, ...prev]);
  };

  const markAsRead = (id: string) => {
    setNotifications((prev: Notification[]) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev: Notification[]) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

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
        setIsOpen,
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
