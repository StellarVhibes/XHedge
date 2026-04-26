"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";

interface InactivityWarningModalProps {
  isOpen: boolean;
  warningSeconds: number;
  onStayConnected: () => void;
  onDisconnectNow: () => void;
  onClose: () => void;
}

function formatSeconds(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function InactivityWarningModal({
  isOpen,
  warningSeconds,
  onStayConnected,
  onDisconnectNow,
  onClose,
}: InactivityWarningModalProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(warningSeconds);
  const endAtRef = useRef<number | null>(null);

  const animationKey = useMemo(() => {
    if (!isOpen) return "closed";
    return `${warningSeconds}-${Date.now()}`;
  }, [isOpen, warningSeconds]);

  useEffect(() => {
    if (!isOpen) return;

    const now = Date.now();
    endAtRef.current = now + warningSeconds * 1000;
    setSecondsRemaining(warningSeconds);

    const id = window.setInterval(() => {
      const endAt = endAtRef.current;
      if (!endAt) return;
      const msLeft = endAt - Date.now();
      const nextSeconds = Math.ceil(msLeft / 1000);
      setSecondsRemaining(nextSeconds);
      if (msLeft <= 0) {
        window.clearInterval(id);
      }
    }, 250);

    return () => {
      window.clearInterval(id);
    };
  }, [isOpen, warningSeconds]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="You’re about to be disconnected" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          For your security, we’ll disconnect your wallet due to inactivity.
        </p>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Time remaining</span>
            <span className="text-sm font-mono">{formatSeconds(secondsRemaining)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded bg-secondary">
            <div
              key={animationKey}
              className="h-full bg-primary"
              style={{
                animationName: "shrink",
                animationDuration: `${warningSeconds}s`,
                animationTimingFunction: "linear",
                animationFillMode: "forwards",
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={() => {
              onStayConnected();
              onClose();
            }}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 active:bg-indigo-700"
          >
            Stay Connected
          </button>
          <button
            onClick={() => {
              onDisconnectNow();
              onClose();
            }}
            className="rounded-lg border border-red-500/30 bg-red-950/30 px-4 py-2 text-sm text-red-400 transition-colors hover:bg-red-900/40"
          >
            Disconnect Now
          </button>
        </div>
      </div>
    </Modal>
  );
}
