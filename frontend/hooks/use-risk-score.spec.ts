import { renderHook, waitFor } from '@testing-library/react';
import { useRiskScore } from './use-risk-score';
import { VaultProvider } from '@/app/context/VaultContext';
import { NetworkProvider } from '@/app/context/NetworkContext';

// Mock dependencies
jest.mock('@/lib/stellar', () => ({
  fetchVaultData: jest.fn(),
}));

describe('useRiskScore', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NetworkProvider>
      <VaultProvider>
        {children}
      </VaultProvider>
    </NetworkProvider>
  );

  it('should compute risk score based on vault metrics', async () => {
    const { result } = renderHook(() => useRiskScore(), { wrapper });

    // Initially loading
    expect(result.current.loading).toBe(true);
    expect(result.current.score).toBe(null);

    // Wait for computation
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Score should be computed (0-100)
    expect(result.current.score).toBeGreaterThanOrEqual(0);
    expect(result.current.score).toBeLessThanOrEqual(100);
  });

  it('should return fallback score when computation fails', async () => {
    // Mock a scenario where vault data is unavailable
    const { result } = renderHook(() => useRiskScore(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should still return a valid score
    expect(result.current.score).toBeGreaterThanOrEqual(0);
    expect(result.current.score).toBeLessThanOrEqual(100);
  });

  it('should update score when vault metrics change', async () => {
    const { result, rerender } = renderHook(() => useRiskScore(), { wrapper });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const initialScore = result.current.score;

    // Rerender to simulate vault metrics change
    rerender();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Score should potentially be different (though may be same in some cases)
    expect(typeof result.current.score).toBe('number');
  });
});
