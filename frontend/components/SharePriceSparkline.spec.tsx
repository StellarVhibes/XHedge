import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SharePriceSparkline, { get_share_price_history } from './SharePriceSparkline';

// Mock useWallet
vi.mock('@/hooks/use-wallet', () => ({
  useWallet: () => ({
    connected: true,
    network: 'testnet'
  })
}));

describe('SharePriceSparkline Component', () => {
  it('renders the empty state when insufficient data points (< 2)', async () => {
    // Mock get_share_price_history to return 1 point
    vi.mock('./SharePriceSparkline', async (importOriginal) => {
      const actual = await importOriginal<typeof import('./SharePriceSparkline')>();
      return {
        ...actual,
        get_share_price_history: vi.fn().mockResolvedValue([{ date: '2026-01-01', price: 1.0 }])
      };
    });

    render(<SharePriceSparkline />);
    
    await waitFor(() => {
      expect(screen.getByText('Insufficient data')).toBeInTheDocument();
    });
  });

  it('applies green color when end price > start price', async () => {
    vi.mocked(get_share_price_history).mockResolvedValue([
      { date: '2026-01-01', price: 1.0 },
      { date: '2026-01-02', price: 1.5 }
    ]);

    const { container } = render(<SharePriceSparkline />);

    await waitFor(() => {
      const polyline = container.querySelector('polyline');
      expect(polyline).toHaveClass('stroke-emerald-500');
    });
  });

  it('applies red color when end price < start price', async () => {
    vi.mocked(get_share_price_history).mockResolvedValue([
      { date: '2026-01-01', price: 1.5 },
      { date: '2026-01-02', price: 1.0 }
    ]);

    const { container } = render(<SharePriceSparkline />);

    await waitFor(() => {
      const polyline = container.querySelector('polyline');
      expect(polyline).toHaveClass('stroke-red-500');
    });
  });

  it('applies amber color when end price equals start price', async () => {
    vi.mocked(get_share_price_history).mockResolvedValue([
      { date: '2026-01-01', price: 1.0 },
      { date: '2026-01-02', price: 1.0 }
    ]);

    const { container } = render(<SharePriceSparkline />);

    await waitFor(() => {
      const polyline = container.querySelector('polyline');
      expect(polyline).toHaveClass('stroke-amber-500');
    });
  });

  it('shows correct tooltip content on hover', async () => {
    vi.mocked(get_share_price_history).mockResolvedValue([
      { date: '2026-01-01', price: 1.0 },
      { date: '2026-01-02', price: 1.2 }
    ]);

    const { container } = render(<SharePriceSparkline />);

    await waitFor(() => {
      expect(container.querySelector('polyline')).toBeInTheDocument();
    });

    const svg = container.querySelector('svg');
    if (svg) {
      // Mock mouse move
      fireEvent.mouseMove(svg, { clientX: 50, clientY: 25 });
      
      expect(screen.getByText('1.2')).toBeInTheDocument();
      expect(screen.getByText('2026-01-02')).toBeInTheDocument();
    }
  });
});
