import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { NotificationProvider, useNotifications } from './NotificationContext';
import React from 'react';

// Mock the hook that requires NetworkProvider
vi.mock('@/hooks/use-soroban-events', () => ({
  useSorobanEvents: vi.fn(),
}));

// Helper component to access context
const TestComponent = () => {
  const { notifications } = useNotifications();
  return (
    <div>
      <div data-testid="count">{notifications.length}</div>
      <ul>
        {notifications.map(n => (
          <li key={n.id} data-testid="notification">{n.title}</li>
        ))}
      </ul>
    </div>
  );
};

describe('NotificationContext', () => {
  beforeEach(() => {
    // Mock localStorage
    const mockStorage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key) => mockStorage[key] || null),
      setItem: vi.fn((key, val) => { mockStorage[key] = val; }),
      removeItem: vi.fn((key) => { delete mockStorage[key]; }),
      clear: vi.fn(() => { for (const k in mockStorage) delete mockStorage[k]; }),
    });

    // Mock Service Worker
    vi.stubGlobal('navigator', {
      serviceWorker: {
        register: vi.fn().mockResolvedValue({}),
        ready: Promise.resolve({
          showNotification: vi.fn()
        })
      }
    });

    // Mock window.location
    vi.stubGlobal('location', {
      origin: 'http://localhost:3000'
    });
  });

  it('filters out malformed notifications from localStorage', async () => {
    const malformed = [
      { id: '1', title: 'Valid', message: 'Msg', timestamp: new Date().toISOString(), read: false, type: 'info' },
      { id: '2', title: 'Invalid Type', message: 'Msg', timestamp: new Date().toISOString(), read: false, type: 'invalid' },
      { id: '3', title: 'Missing Field', timestamp: new Date().toISOString(), read: false, type: 'info' },
      { id: 4, title: 'Wrong ID Type', message: 'Msg', timestamp: new Date().toISOString(), read: false, type: 'info' },
    ];

    localStorage.setItem('xh_notifications', JSON.stringify(malformed));
    
    render(
      <NotificationProvider>
        <TestComponent />
      </NotificationProvider>
    );

    // Wait for the useEffect to run and update state
    await waitFor(() => {
      expect(screen.getByTestId('count').textContent).toBe('1');
    });
    
    expect(screen.getByText('Valid')).toBeDefined();
  });
});
