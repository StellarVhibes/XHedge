import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MaxAmountButton from './MaxAmountButton';

// Mock the wallet hook
vi.mock('@/hooks/use-wallet', () => ({
  useWallet: () => ({
    connected: true,
    address: 'test-address',
  })
}));

// Mock the network context
vi.mock('@/app/context/NetworkContext', () => ({
  useNetwork: () => ({
    network: 'testnet',
  })
}));

// Mock the stellar lib
vi.mock('@/lib/stellar', () => ({
  fetchVaultData: vi.fn(),
}));

// Mock the translation hook
vi.mock('@/lib/i18n-context', () => ({
  useTranslations: (key: string) => {
    const translations = {
      "Vault": {
        "max": "Max",
        "maxDepositTooltip": "Fill with your maximum wallet balance",
        "maxWithdrawTooltip": "Fill with your maximum withdrawable amount",
        "processing": "Processing..."
      }
    };
    return (subKey: string) => translations[key as keyof typeof translations.Vault]?.[subKey as keyof typeof translations.Vault] || subKey;
  }
}));

import { fetchVaultData } from '@/lib/stellar';

describe('MaxAmountButton', () => {
  const mockOnAmountSet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnAmountSet.mockClear();
  });

  it('renders the button with correct text', () => {
    render(<MaxAmountButton type="deposit" onAmountSet={mockOnAmountSet} />);
    
    const button = screen.getByRole('button', { name: /max/i });
    expect(button).toBeInTheDocument();
    expect(screen.getByText('Max')).toBeInTheDocument();
  });

  it('is disabled when wallet is not connected', () => {
    vi.mocked('@/hooks/use-wallet').useWallet = () => ({
      connected: false,
      address: null,
    });

    render(<MaxAmountButton type="deposit" onAmountSet={mockOnAmountSet} />);
    
    const button = screen.getByRole('button', { name: /max/i });
    expect(button).toBeDisabled();
  });

  it('is disabled when explicitly disabled', () => {
    render(<MaxAmountButton type="deposit" onAmountSet={mockOnAmountSet} disabled />);
    
    const button = screen.getByRole('button', { name: /max/i });
    expect(button).toBeDisabled();
  });

  it('calls onAmountSet with wallet balance for deposit type', async () => {
    const mockVaultData = {
      userBalance: 1000.5,
      userShares: 500,
      sharePrice: 2.0,
      totalAssets: 1000000,
      totalShares: 500000,
    };

    vi.mocked(fetchVaultData).mockResolvedValue(mockVaultData);

    render(<MaxAmountButton type="deposit" onAmountSet={mockOnAmountSet} />);
    
    const button = screen.getByRole('button', { name: /max/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnAmountSet).toHaveBeenCalledWith('1000.5');
    });
  });

  it('calls onAmountSet with shares converted to assets for withdraw type', async () => {
    const mockVaultData = {
      userBalance: 1000.5,
      userShares: 500,
      sharePrice: 2.0,
      totalAssets: 1000000,
      totalShares: 500000,
    };

    vi.mocked(fetchVaultData).mockResolvedValue(mockVaultData);

    render(<MaxAmountButton type="withdraw" onAmountSet={mockOnAmountSet} />);
    
    const button = screen.getByRole('button', { name: /max/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnAmountSet).toHaveBeenCalledWith('1000'); // 500 shares * 2.0 sharePrice
    });
  });

  it('shows loading state while fetching data', async () => {
    vi.mocked(fetchVaultData).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<MaxAmountButton type="deposit" onAmountSet={mockOnAmountSet} />);
    
    const button = screen.getByRole('button', { name: /max/i });
    fireEvent.click(button);

    // Should show loading spinner
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('handles zero balance correctly', async () => {
    const mockVaultData = {
      userBalance: 0,
      userShares: 0,
      sharePrice: 2.0,
      totalAssets: 1000000,
      totalShares: 500000,
    };

    vi.mocked(fetchVaultData).mockResolvedValue(mockVaultData);

    render(<MaxAmountButton type="deposit" onAmountSet={mockOnAmountSet} />);
    
    const button = screen.getByRole('button', { name: /max/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnAmountSet).toHaveBeenCalledWith('0');
    });
  });

  it('formats amount correctly removing trailing zeros', async () => {
    const mockVaultData = {
      userBalance: 1000.500000,
      userShares: 500,
      sharePrice: 2.0,
      totalAssets: 1000000,
      totalShares: 500000,
    };

    vi.mocked(fetchVaultData).mockResolvedValue(mockVaultData);

    render(<MaxAmountButton type="deposit" onAmountSet={mockOnAmountSet} />);
    
    const button = screen.getByRole('button', { name: /max/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnAmountSet).toHaveBeenCalledWith('1000.5'); // Trailing zeros removed
    });
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(fetchVaultData).mockRejectedValue(new Error('API Error'));

    render(<MaxAmountButton type="deposit" onAmountSet={mockOnAmountSet} />);
    
    const button = screen.getByRole('button', { name: /max/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnAmountSet).not.toHaveBeenCalled();
    });

    // Button should be re-enabled after error
    expect(button).not.toBeDisabled();
  });

  it('has correct tooltip text for deposit type', () => {
    render(<MaxAmountButton type="deposit" onAmountSet={mockOnAmountSet} />);
    
    const button = screen.getByRole('button', { name: /max/i });
    expect(button).toHaveAttribute('title', 'Fill with your maximum wallet balance');
  });

  it('has correct tooltip text for withdraw type', () => {
    render(<MaxAmountButton type="withdraw" onAmountSet={mockOnAmountSet} />);
    
    const button = screen.getByRole('button', { name: /max/i });
    expect(button).toHaveAttribute('title', 'Fill with your maximum withdrawable amount');
  });
});
