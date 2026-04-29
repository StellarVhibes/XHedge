import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationProvider, useNotifications } from "./NotificationContext";
import React from "react";

// Mock the hook that requires NetworkProvider
vi.mock("@/hooks/use-soroban-events", () => ({
  useSorobanEvents: vi.fn(),
}));

// Helper component to access context
const TestComponent = () => {
  const {
    notifications,
    unreadCount,
    addNotification,
    markAllAsRead,
    setIsOpen,
  } = useNotifications();

  return (
    <div>
      <div data-testid="count">{notifications.length}</div>
      <div data-testid="unread-count">{unreadCount}</div>
      <button
        type="button"
        onClick={() =>
          addNotification({
            title: "Harvest complete",
            message: "Harvest finished successfully.",
            type: "harvest_complete",
            severity: "success",
          })
        }
      >
        Add harvest
      </button>
      <button type="button" onClick={markAllAsRead}>
        Mark all read
      </button>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open drawer
      </button>
      <ul>
        {notifications.map((n) => (
          <li key={n.id} data-testid="notification">
            {n.title}:{n.read ? "read" : "unread"}
          </li>
        ))}
      </ul>
    </div>
  );
};

describe("NotificationContext", () => {
  let mockStorage: Record<string, string>;

  beforeEach(() => {
    // Mock localStorage
    mockStorage = {};
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key) => mockStorage[key] || null),
      setItem: vi.fn((key, val) => { mockStorage[key] = val; }),
      removeItem: vi.fn((key) => { delete mockStorage[key]; }),
      clear: vi.fn(() => { for (const k in mockStorage) delete mockStorage[k]; }),
    });

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: globalThis.localStorage,
    });

    // Mock Service Worker
    vi.stubGlobal("navigator", {
      serviceWorker: {
        register: vi.fn().mockResolvedValue({}),
        ready: Promise.resolve({
          showNotification: vi.fn()
        })
      }
    });

    // Mock window.location
    vi.stubGlobal("location", {
      origin: "http://localhost:3000"
    });
  });

  it("filters out malformed notifications from localStorage", async () => {
    const malformed = [
      { id: "1", title: "Valid", message: "Msg", timestamp: new Date().toISOString(), read: false, type: "harvest_complete", severity: "info" },
      { id: "2", title: "Invalid Type", message: "Msg", timestamp: new Date().toISOString(), read: false, type: "invalid" },
      { id: "3", title: "Missing Field", timestamp: new Date().toISOString(), read: false, type: "harvest_complete" },
      { id: 4, title: "Wrong ID Type", message: "Msg", timestamp: new Date().toISOString(), read: false, type: "harvest_complete" },
    ];

    localStorage.setItem("xh_notifications", JSON.stringify(malformed));
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Wait for the useEffect to run and update state
    await waitFor(() => {
      expect(screen.getByTestId("count").textContent).toBe("1");
    });
    
    expect(screen.getByTestId("notification").textContent).toContain("Valid");
  });

  it("tracks unread count and marks all notifications read", async () => {
    const user = userEvent.setup();

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    await user.click(screen.getByRole("button", { name: "Add harvest" }));
    await user.click(screen.getByRole("button", { name: "Add harvest" }));

    expect(screen.getByTestId("unread-count").textContent).toBe("2");

    await user.click(screen.getByRole("button", { name: "Mark all read" }));

    expect(screen.getByTestId("unread-count").textContent).toBe("0");
    expect(screen.getAllByTestId("notification").every((item) => item.textContent?.endsWith(":read"))).toBe(true);
  });

  it("marks notifications read when the drawer is opened", async () => {
    const user = userEvent.setup();

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    await user.click(screen.getByRole("button", { name: "Add harvest" }));
    expect(screen.getByTestId("unread-count").textContent).toBe("1");

    await user.click(screen.getByRole("button", { name: "Open drawer" }));

    expect(screen.getByTestId("unread-count").textContent).toBe("0");
    expect(screen.getByTestId("notification").textContent).toContain(":read");
  });

  it("persists notifications to localStorage", async () => {
    const user = userEvent.setup();

    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    await user.click(screen.getByRole("button", { name: "Add harvest" }));

    await waitFor(() => {
      const stored = localStorage.getItem("xh_notifications");
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored ?? "[]")).toHaveLength(1);
    });
  });
});
