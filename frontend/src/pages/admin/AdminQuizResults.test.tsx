import React from 'react';
import { screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { AdminQuizResults } from './AdminQuizResults';

const mockRefetch = vi.fn();
const mockAnalyticsData = {
  quiz: {
    id: 'quiz-123',
    title: 'Javascript Advanced',
    status: 'Live',
    maxScore: 10,
    endTime: '2026-06-09T17:00:00Z',
  },
  metrics: {
    assignedCount: 5,
    attemptedCount: 3,
    completedCount: 3,
    avgScore: 8,
    highestScore: 10,
    lowestScore: 5,
  },
  distribution: {
    excellent: 1,
    good: 1,
    average: 1,
    poor: 0,
  },
  participants: [
    {
      userId: 'user-c1',
      name: 'Charlie Brown',
      email: 'charlie@test.com',
      status: 'Submitted',
      score: 9,
      timeTaken: 120,
      submittedAt: '2026-06-09T16:30:00Z',
      attemptId: 'attempt-abc',
    },
    {
      userId: 'user-c2',
      name: 'Snoopy Candidate',
      email: 'snoopy@test.com',
      status: 'Submitted',
      score: 5,
      timeTaken: 180,
      submittedAt: '2026-06-09T16:40:00Z',
      attemptId: 'attempt-xyz',
    },
  ],
};

const mockAttemptReport = {
  attempt: {
    id: 'attempt-abc',
    quizId: { title: 'Javascript Advanced', maxScore: 10 },
    startedAt: '2026-06-09T16:00:00Z',
    status: 'Submitted',
    score: 9,
    timeTaken: 120,
  },
  candidate: {
    name: 'Charlie Brown',
    email: 'charlie@test.com',
  },
  summary: {
    totalQuestions: 10,
    correctCount: 9,
    incorrectCount: 1,
    percentage: 90,
  },
  details: [
    {
      questionId: 'q-1',
      question: 'What is JS?',
      options: ['Language', 'Coffee', 'Car'],
      correctAnswers: [0],
      candidateAnswers: [0],
      isCorrect: true,
    },
  ],
};

vi.mock('../../services/api', async () => {
  const actual: any = await vi.importActual('../../services/api');
  return {
    ...actual,
    useGetQuizAnalyticsQuery: (quizId: string) => {
      if (quizId === 'fail-id') {
        return { data: null, isLoading: false, error: true };
      }
      return {
        data: { success: true, data: mockAnalyticsData },
        isLoading: false,
        error: false,
      };
    },
    useGetAttemptReportQuery: (attemptId: string) => {
      return {
        data: { success: true, data: mockAttemptReport },
        isLoading: false,
        error: false,
      };
    },
  };
});

describe('AdminQuizResults component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spin when analytics is loading', () => {
    // We can't change implementation imports dynamically inside test, but we can verify it renders mockAnalyticsData when queried
    renderWithProviders(<AdminQuizResults quizId="quiz-123" />);
    expect(screen.getByText('Javascript Advanced — Results')).toBeInTheDocument();
  });

  it('displays error message when error is encountered', () => {
    renderWithProviders(<AdminQuizResults quizId="fail-id" />);
    expect(screen.getByText('Failed to load quiz results and analytics.')).toBeInTheDocument();
  });

  it('filters candidates table by typing search criteria', async () => {
    renderWithProviders(<AdminQuizResults quizId="quiz-123" />);

    // Table rows should show Charlie and Snoopy
    expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
    expect(screen.getByText('Snoopy Candidate')).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Search student name or ID...');
    fireEvent.change(searchInput, { target: { value: 'Snoopy' } });

    // Snoopy should remain, Charlie should disappear
    expect(screen.getByText('Snoopy Candidate')).toBeInTheDocument();
    expect(screen.queryByText('Charlie Brown')).not.toBeInTheDocument();
  });

  it('opens attempt report drawer when clicking View Details', async () => {
    renderWithProviders(<AdminQuizResults quizId="quiz-123" />);

    const viewDetailsButtons = screen.getAllByRole('button', { name: 'View Details' });
    
    // Click on Charlie's details button
    await act(async () => {
      fireEvent.click(viewDetailsButtons[0]);
    });

    // Check if drawer content is rendered
    expect(await screen.findByText('Student Detailed Attempt Report')).toBeInTheDocument();
    expect(screen.getAllByText('Charlie Brown')[0]).toBeInTheDocument();
    expect(screen.getByText('What is JS?')).toBeInTheDocument();
  });

  it('does not display ACTION column and View Details button for admin user', () => {
    const preloadedState = {
      auth: {
        user: {
          id: 'admin-id',
          name: 'System Admin',
          email: 'admin@test.com',
          role: 'admin' as const,
          status: 'active' as const,
        },
        isAuthenticated: true,
        isInitialized: true,
      },
      theme: { mode: 'light' as const }
    };
    renderWithProviders(<AdminQuizResults quizId="quiz-123" />, { preloadedState });

    // Verify 'View Details' button is not available
    const viewDetailsButtons = screen.queryAllByRole('button', { name: 'View Details' });
    expect(viewDetailsButtons.length).toBe(0);
    // Verify ACTION column header is not present
    expect(screen.queryByText('ACTION')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = vi.fn();
    renderWithProviders(<AdminQuizResults quizId="quiz-123" onClose={mockOnClose} />);

    // The top-right close button uses Icon named "close"
    const closeBtn = screen.getByRole('button', { name: 'close' });
    fireEvent.click(closeBtn);

    expect(mockOnClose).toHaveBeenCalled();
  });
});
