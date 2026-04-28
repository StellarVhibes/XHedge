import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PerformanceHeatmap from './PerformanceHeatmap';

// Mock the translation hook
vi.mock('@/lib/i18n-context', () => ({
  useTranslations: (key: string) => {
    const translations = {
      "Analytics": {
        "performanceHeatmap": "Performance Heatmap",
        "failedToLoadData": "Failed to load data",
        "noDataAvailable": "No data available",
        "less": "Less",
        "more": "More",
        "noData": "No data"
      }
    };
    return (subKey: string) => translations[key as keyof typeof translations]?.[subKey as keyof typeof translations.Analytics] || subKey;
  }
}));

describe('PerformanceHeatmap', () => {
  const mockData = [
    { date: '2024-01-01', return: 1.5 },
    { date: '2024-01-02', return: -0.8 },
    { date: '2024-01-03', return: 2.1 },
    { date: '2024-01-04', return: 0.0 },
    { date: '2024-01-05', return: -1.2 },
  ];

  it('renders loading state', () => {
    render(<PerformanceHeatmap data={[]} loading={true} />);
    
    expect(screen.getByText('Performance Heatmap')).toBeInTheDocument();
    expect(screen.getByText('Loading chart data...')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(<PerformanceHeatmap data={[]} loading={false} error="Failed to load" />);
    
    expect(screen.getByText('Performance Heatmap')).toBeInTheDocument();
    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(<PerformanceHeatmap data={[]} loading={false} />);
    
    expect(screen.getByText('Performance Heatmap')).toBeInTheDocument();
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders heatmap with data', () => {
    render(<PerformanceHeatmap data={mockData} loading={false} />);
    
    expect(screen.getByText('Performance Heatmap')).toBeInTheDocument();
    
    // Check for legend elements
    expect(screen.getByText('Less')).toBeInTheDocument();
    expect(screen.getByText('More')).toBeInTheDocument();
    expect(screen.getByText('No data')).toBeInTheDocument();
    
    // Check for month labels (should be present)
    expect(screen.getByText('Jan')).toBeInTheDocument();
    
    // Check for week day labels
    expect(screen.getByText('S')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('renders year selector when multiple years are available', () => {
    const multiYearData = [
      ...mockData,
      { date: '2023-12-31', return: 0.5 },
      { date: '2023-12-30', return: -0.3 },
    ];
    
    render(<PerformanceHeatmap data={multiYearData} loading={false} />);
    
    expect(screen.getByDisplayValue('2024')).toBeInTheDocument();
  });

  it('displays correct colors for positive and negative returns', () => {
    render(<PerformanceHeatmap data={mockData} loading={false} />);
    
    // Check for heatmap cells (they should have appropriate color classes)
    const heatmapCells = document.querySelectorAll('[class*="bg-"]');
    expect(heatmapCells.length).toBeGreaterThan(0);
    
    // Should have both green (positive) and red (negative) cells
    const greenCells = document.querySelectorAll('[class*="bg-green"]');
    const redCells = document.querySelectorAll('[class*="bg-red"]');
    
    expect(greenCells.length).toBeGreaterThan(0);
    expect(redCells.length).toBeGreaterThan(0);
  });

  it('handles tooltip on hover', async () => {
    render(<PerformanceHeatmap data={mockData} loading={false} />);
    
    // Find a heatmap cell
    const heatmapCells = document.querySelectorAll('[class*="bg-"]');
    const firstCell = heatmapCells[0];
    
    expect(firstCell).toBeInTheDocument();
    
    // The tooltip should be present in the DOM (it's rendered by TooltipProvider)
    const tooltip = document.querySelector('[role="tooltip"]');
    expect(tooltip).toBeInTheDocument();
  });
});
