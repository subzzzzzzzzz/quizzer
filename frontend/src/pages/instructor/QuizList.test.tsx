import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import QuizList from './QuizList';
import { Routes, Route } from 'react-router-dom';

const mockCancelQuiz = vi.fn().mockImplementation(() => ({
  unwrap: () => Promise.resolve({ success: true }),
}));
const mockRefetch = vi.fn();

const mockQuizzes = [
  {
    _id: 'q-1',
    title: 'CSS Advanced Selectors',
    questionType: 'single',
    status: 'Live',
    duration: 30,
    questionCount: 5,
    participantCount: 10,
    startTime: '2026-06-09T10:00:00Z',
    endTime: '2026-06-09T20:00:00Z',
  },
  {
    _id: 'q-2',
    title: 'TypeScript Generics',
    questionType: 'multi',
    status: 'Draft',
    duration: 45,
    questionCount: 0,
    participantCount: 0,
  },
];

vi.mock('../../services/api', async () => {
  const actual: any = await vi.importActual('../../services/api');
  return {
    ...actual,
    useGetQuizzesQuery: () => ({
      data: { success: true, data: mockQuizzes },
      isLoading: false,
      refetch: mockRefetch,
    }),
    useCancelQuizMutation: () => [mockCancelQuiz, { isLoading: false }],
  };
});

describe('QuizList component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quizzes list in tables and shows correct counts and status tags', () => {
    renderWithProviders(<QuizList />);

    expect(screen.getByText('CSS Advanced Selectors')).toBeInTheDocument();
    expect(screen.getByText('TypeScript Generics')).toBeInTheDocument();
    expect(screen.getByText('Live')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getAllByText('Questions')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Participants')[0]).toBeInTheDocument();
  });

  it('filters quizzes using the title search text box', async () => {
    renderWithProviders(<QuizList />);

    const searchInput = screen.getByPlaceholderText('Search draft & scheduled...');
    fireEvent.change(searchInput, { target: { value: 'CSS' } });

    expect(screen.getByText('CSS Advanced Selectors')).toBeInTheDocument();
    expect(screen.queryByText('TypeScript Generics')).not.toBeInTheDocument();
  });

  it('navigates to create quiz path when clicking Create New Quiz', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/quizzes" element={<QuizList />} />
        <Route path="/quizzes/create" element={<div data-testid="create-quiz-view">Create Quiz Editor</div>} />
      </Routes>,
      { initialEntries: ['/quizzes'] }
    );

    const createBtn = screen.getByRole('button', { name: /Create Quiz/i });
    fireEvent.click(createBtn);

    expect(screen.getByTestId('create-quiz-view')).toBeInTheDocument();
  });

  it('handles cancelling a live quiz through the confirmation modal dialog', async () => {
    renderWithProviders(<QuizList />);

    // Click Cancel Quiz for CSS Advanced Selectors
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    // Modal should appear
    expect(screen.getByText('Cancel Quiz Confirmation')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Yes, Cancel Quiz' });
    expect(confirmBtn).toBeDisabled();

    // Check consent checkbox
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(confirmBtn).not.toBeDisabled();

    // Confirm
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockCancelQuiz).toHaveBeenCalledWith('q-1');
      expect(mockRefetch).toHaveBeenCalled();
    });
  });
});
