import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import { DetailedAttemptReport } from './AttemptReport';

const mockReportData = {
  attempt: {
    id: 'attempt-1',
    score: 8,
    timeTaken: 150,
  },
  candidate: {
    name: 'Jane Candidate',
    email: 'jane@test.com',
  },
  summary: {
    totalQuestions: 10,
    correctCount: 8,
    incorrectCount: 2,
    percentage: 80,
  },
  details: [
    {
      questionId: 'q-1',
      question: 'What is HTML?',
      options: ['Language', 'Style', 'Database'],
      correctAnswers: [0],
      candidateAnswers: [0],
      isCorrect: true,
    },
    {
      questionId: 'q-2',
      question: 'What is CSS?',
      options: ['Markup', 'Style', 'Database'],
      correctAnswers: [1],
      candidateAnswers: [2],
      isCorrect: false,
    },
  ],
};

vi.mock('../../services/api', async () => {
  const actual: any = await vi.importActual('../../services/api');
  return {
    ...actual,
    useGetAttemptReportQuery: (attemptId: string) => {
      if (attemptId === 'fail-id') {
        return { data: null, isLoading: false, error: true };
      }
      return {
        data: { success: true, data: mockReportData },
        isLoading: false,
        error: false,
      };
    },
  };
});

describe('DetailedAttemptReport component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders report data correctly with score card, question counts and tag correctness indicators', () => {
    renderWithProviders(<DetailedAttemptReport attemptId="attempt-1" />);

    expect(screen.getByText('Jane Candidate')).toBeInTheDocument();
    expect(screen.getByText('jane@test.com')).toBeInTheDocument();
    expect(screen.getByText('8 / 10 (80%)')).toBeInTheDocument();
    
    // Check questions
    expect(screen.getByText('What is HTML?')).toBeInTheDocument();
    expect(screen.getByText('What is CSS?')).toBeInTheDocument();

    // Check tags
    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(screen.getByText('Incorrect')).toBeInTheDocument();
  });

  it('displays error notice when report fetch fails', () => {
    renderWithProviders(<DetailedAttemptReport attemptId="fail-id" />);
    expect(screen.getByText('Error loading detailed report')).toBeInTheDocument();
  });
});
