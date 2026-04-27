"use client";

import { Bell } from "lucide-react";
import { useNotifications } from "@/app/context/NotificationContext";
import { cn } from "@/lib/utils";

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { unreadCount, setIsOpen } = useNotifications();

  return (
    <button
      onClick={() => setIsOpen(true)}
      className={cn(
        "relative p-2 rounded-lg transition-colors hover:bg-accent hover:text-accent-foreground",
        className
      )}
      aria-label="Toggle Notifications"
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground animate-in zoom-in duration-300">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
