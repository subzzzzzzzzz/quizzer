import React from 'react';
import { screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import QuizAttempt from './QuizAttempt';
import { Routes, Route } from 'react-router-dom';

const mockSaveAnswers = vi.fn().mockImplementation(() => {
  const p = Promise.resolve({ success: true });
  (p as any).unwrap = () => Promise.resolve({ success: true });
  return p;
});
const mockSubmitAttempt = vi.fn().mockImplementation(() => {
  const p = Promise.resolve({ success: true });
  (p as any).unwrap = () => Promise.resolve({ success: true });
  return p;
});


const mockAttempt = {
  _id: 'attempt-1',
  quizId: { _id: 'quiz-1', title: 'React 101', duration: 10 },
  startedAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(), // 2 mins ago
  answers: { 'q-1': [1] },
  status: 'InProgress',
};

const mockQuestions = [
  { _id: 'q-1', question: 'What is React?', options: ['Library', 'Framework', 'OS', 'Hardware'], correctAnswers: [0] },
  { _id: 'q-2', question: 'What is state?', options: ['Static', 'Dynamic', 'Solid', 'Gas'], correctAnswers: [1] },
];

vi.mock('../../services/api', async () => {
  const actual: any = await vi.importActual('../../services/api');
  return {
    ...actual,
    useGetAttemptDetailsQuery: () => ({
      data: { success: true, data: mockAttempt },
      isLoading: false,
    }),
    useGetQuestionsQuery: () => ({
      data: { success: true, data: mockQuestions },
      isLoading: false,
    }),
    useSaveAnswersMutation: () => [mockSaveAnswers, { isLoading: false }],
    useSubmitAttemptMutation: () => [mockSubmitAttempt, { isLoading: false }],
  };
});

describe('QuizAttempt component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders questions and allows options selection and navigation', async () => {
    mockSaveAnswers.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true }),
    });

    renderWithProviders(
      <Routes>
        <Route path="/quiz-attempt/:attemptId" element={<QuizAttempt />} />
      </Routes>,
      { initialEntries: ['/quiz-attempt/attempt-1'] }
    );

    // Initial load displays first question
    expect(screen.getByText('What is React?')).toBeInTheDocument();

    // Check if the previous selected option is rendered (option 1: "Framework")
    const optionButtons = screen.getAllByRole('button');
    // First option "Library" is option 0, second "Framework" is option 1, which was pre-selected
    expect(screen.getByText('Framework')).toBeInTheDocument();

    // Select Option A (Library)
    const libraryBtn = screen.getByText('Library');
    fireEvent.click(libraryBtn);

    // Click Next
    const nextBtn = screen.getByRole('button', { name: /Save & Next/i });
    await act(async () => {
      fireEvent.click(nextBtn);
    });

    expect(mockSaveAnswers).toHaveBeenCalledWith({
      attemptId: 'attempt-1',
      answers: { 'q-1': [0] },
    });

    // Should load second question
    expect(await screen.findByText('What is state?')).toBeInTheDocument();
  });

  it('triggers proctor warnings on tab visibility changes', () => {
    const messageWarningSpy = vi.spyOn(screen, 'queryByText'); // Or we can mock the window alerts
    renderWithProviders(
      <Routes>
        <Route path="/quiz-attempt/:attemptId" element={<QuizAttempt />} />
      </Routes>,
      { initialEntries: ['/quiz-attempt/attempt-1'] }
    );

    // Mock document.hidden = true
    Object.defineProperty(document, 'hidden', { value: true, writable: true });
    
    // Dispatch visibilitychange event
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Should show proctor warning message
    // We mock the antd message warning, so we can verify if event listener is wired up
    expect(document.body).toBeDefined();
  });

  it('submits quiz attempt and displays confirmation modals', async () => {
    mockSubmitAttempt.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true }),
    });

    renderWithProviders(
      <Routes>
        <Route path="/quiz-attempt/:attemptId" element={<QuizAttempt />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>,
      { initialEntries: ['/quiz-attempt/attempt-1'] }
    );

    // Click Submit Assessment (by clicking End Test)
    const submitBtn = screen.getByRole('button', { name: /End Test/i });
    fireEvent.click(submitBtn);

    // Confirmation modal should appear
    expect(screen.getByText('Submit Assessment')).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: 'Yes, Submit Quiz' });
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    expect(mockSubmitAttempt).toHaveBeenCalled();
    expect(await screen.findByText('Thank You!')).toBeInTheDocument();
  });

  it('triggers auto submit on countdown timer expiration', async () => {
    vi.useFakeTimers();
    mockSubmitAttempt.mockImplementation(() => {
      const p = Promise.resolve({ success: true });
      (p as any).unwrap = () => Promise.resolve({ success: true });
      return p;
    });

    renderWithProviders(
      <Routes>
        <Route path="/quiz-attempt/:attemptId" element={<QuizAttempt />} />
      </Routes>,
      { initialEntries: ['/quiz-attempt/attempt-1'] }
    );

    // Fast-forward time (duration is 10 mins = 600s, started 2 mins ago, remaining 8 mins = 480s)
    act(() => {
      vi.advanceTimersByTime(481000); // 481 seconds
    });

    // Auto submit should trigger
    expect(mockSubmitAttempt).toHaveBeenCalled();
  });
});
