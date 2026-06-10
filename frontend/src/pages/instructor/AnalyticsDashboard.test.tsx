import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import AnalyticsDashboard from './AnalyticsDashboard';

const mockQuizzes = [
  {
    _id: 'quiz-c1',
    title: 'CSS Grid Challenge',
    status: 'Completed',
    questionType: 'single',
    duration: 20,
    endTime: '2026-06-08T15:00:00Z',
    participantCount: 8,
  },
  {
    _id: 'quiz-d1',
    title: 'Draft Quiz (Unlisted)',
    status: 'Draft',
    questionType: 'multi',
    duration: 30,
  },
];

const mockUseGetQuizzesQuery = vi.fn().mockReturnValue({
  data: { success: true, data: mockQuizzes },
  isLoading: false,
  error: false,
});

vi.mock('../../services/api', async () => {
  const actual: any = await vi.importActual('../../services/api');
  return {
    ...actual,
    useGetQuizzesQuery: () => mockUseGetQuizzesQuery(),
    useGetQuizAnalyticsQuery: (quizId: string) => ({
      data: {
        success: true,
        data: {
          quiz: { id: quizId, title: 'CSS Grid Challenge', maxScore: 10, endTime: '2026-06-08T15:00:00Z' },
          metrics: { assignedCount: 8, avgScore: 7, highestScore: 10, lowestScore: 4 },
          distribution: { excellent: 2, good: 3, average: 2, poor: 1 },
          participants: [],
        },
      },
      isLoading: false,
      error: false,
    }),
  };
});

describe('AnalyticsDashboard component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetQuizzesQuery.mockReturnValue({
      data: { success: true, data: mockQuizzes },
      isLoading: false,
      error: false,
    });
  });

  it('renders loading spin when analytics is loading', () => {
    mockUseGetQuizzesQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: false,
    });
    renderWithProviders(<AnalyticsDashboard />);
    expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
  });

  it('displays error message when error is encountered', () => {
    mockUseGetQuizzesQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: true,
    });
    renderWithProviders(<AnalyticsDashboard />);
    expect(screen.getByText('Failed to load completed quiz analytics.')).toBeInTheDocument();
  });

  it('renders completed quizzes table and hides draft quizzes', () => {
    renderWithProviders(<AnalyticsDashboard />);

    expect(screen.getByText('Completed Quizzes Analytics')).toBeInTheDocument();
    expect(screen.getByText('CSS Grid Challenge')).toBeInTheDocument();
    // Draft quizzes should be filtered out
    expect(screen.queryByText('Draft Quiz (Unlisted)')).not.toBeInTheDocument();
  });

  it('opens results modal dialog when View Analytics is clicked and allows closing', async () => {
    renderWithProviders(<AnalyticsDashboard />);

    const analyticsBtn = screen.getByRole('button', { name: 'View Analytics' });
    fireEvent.click(analyticsBtn);

    // The AdminQuizResults component should render in the modal
    expect(await screen.findByText('CSS Grid Challenge — Results')).toBeInTheDocument();

    // Find close button inside results and click it to close modal
    const closeBtn = screen.getByRole('button', { name: 'close' });
    fireEvent.click(closeBtn);

    // Modal should close
    expect(screen.queryByText('CSS Grid Challenge — Results')).not.toBeInTheDocument();
  });
});
