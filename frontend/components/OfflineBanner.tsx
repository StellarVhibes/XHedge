"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Check initial state
    setIsOffline(!navigator.onLine);

    // Listen for online/offline events
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) {
    return null;
  }

  return (
    <Alert className="border-orange-200 bg-orange-50 text-orange-900 fixed bottom-4 left-4 right-4 max-w-md mx-auto z-50 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200">
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="flex items-center gap-2">
        <span>You are offline — showing cached data</span>
        <button
          onClick={() => location.reload()}
          className="ml-auto text-sm font-medium underline hover:no-underline"
        >
          Retry
        </button>
      </AlertDescription>
    </Alert>
  );
}
