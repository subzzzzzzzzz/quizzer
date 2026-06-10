import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import QuizAnalyticsDetail from './QuizAnalyticsDetail';
import { Routes, Route } from 'react-router-dom';

vi.mock('../../services/api', async () => {
  const actual: any = await vi.importActual('../../services/api');
  return {
    ...actual,
    useGetQuizAnalyticsQuery: (quizId: string) => ({
      data: {
        success: true,
        data: {
          quiz: { id: quizId, title: 'Javascript Advanced', maxScore: 10, endTime: '2026-06-08T15:00:00Z' },
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

describe('QuizAnalyticsDetail component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders no quiz selected if quizId is not present', () => {
    renderWithProviders(
      <Routes>
        <Route path="/analytics/quiz" element={<QuizAnalyticsDetail />} />
      </Routes>,
      { initialEntries: ['/analytics/quiz'] }
    );

    expect(screen.getByText('No quiz selected.')).toBeInTheDocument();
  });

  it('renders AdminQuizResults with the quizId router param', () => {
    renderWithProviders(
      <Routes>
        <Route path="/analytics/quiz/:quizId" element={<QuizAnalyticsDetail />} />
      </Routes>,
      { initialEntries: ['/analytics/quiz/quiz-987'] }
    );

    expect(screen.getByText('Javascript Advanced — Results')).toBeInTheDocument();
  });

  it('navigates back to /analytics when back button is clicked', () => {
    renderWithProviders(
      <Routes>
        <Route path="/analytics/quiz/:quizId" element={<QuizAnalyticsDetail />} />
        <Route path="/analytics" element={<div data-testid="analytics-main">Analytics Main Dashboard</div>} />
      </Routes>,
      { initialEntries: ['/analytics/quiz/quiz-987'] }
    );

    const backBtn = screen.getByRole('button', { name: /Back to Analytics/i });
    fireEvent.click(backBtn);

    expect(screen.getByTestId('analytics-main')).toBeInTheDocument();
  });

  it('navigates back to /analytics when AdminQuizResults onClose is triggered', () => {
    renderWithProviders(
      <Routes>
        <Route path="/analytics/quiz/:quizId" element={<QuizAnalyticsDetail />} />
        <Route path="/analytics" element={<div data-testid="analytics-main">Analytics Main Dashboard</div>} />
      </Routes>,
      { initialEntries: ['/analytics/quiz/quiz-987'] }
    );

    const closeBtn = screen.getByRole('button', { name: 'close' });
    fireEvent.click(closeBtn);

    expect(screen.getByTestId('analytics-main')).toBeInTheDocument();
  });
});
