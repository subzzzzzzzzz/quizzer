import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import AssignedQuizzes from './AssignedQuizzes';
import { Routes, Route } from 'react-router-dom';

const mockQuizzes = [
  { _id: 'q-1', title: 'React 101', duration: 10, status: 'Live' },
  { _id: 'q-2', title: 'TypeScript 101', duration: 20, status: 'Live' },
];

vi.mock('../../services/api', async () => {
  const actual: any = await vi.importActual('../../services/api');
  return {
    ...actual,
    useGetQuizzesQuery: vi.fn(),
    useStartAttemptMutation: vi.fn().mockReturnValue([
      vi.fn().mockReturnValue({
        unwrap: vi.fn().mockResolvedValue({
          success: true,
          data: { _id: 'attempt-1' },
        }),
      }),
      { isLoading: false },
    ]),
  };
});

import { useGetQuizzesQuery, useStartAttemptMutation } from '../../services/api';

describe('AssignedQuizzes component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spin when loading', () => {
    vi.mocked(useGetQuizzesQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    } as any);

    renderWithProviders(<AssignedQuizzes />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('displays error alert when query fails', () => {
    vi.mocked(useGetQuizzesQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Error' },
    } as any);

    renderWithProviders(<AssignedQuizzes />);
    expect(screen.getByTestId('error-alert')).toBeInTheDocument();
  });

  it('renders list of assigned quizzes and navigates when clicking start', async () => {
    vi.mocked(useGetQuizzesQuery).mockReturnValue({
      data: { success: true, data: mockQuizzes },
      isLoading: false,
      error: undefined,
    } as any);

    renderWithProviders(
      <Routes>
        <Route path="/upcoming" element={<AssignedQuizzes />} />
        <Route path="/quiz-attempt/:attemptId" element={<div>Attempt Page</div>} />
      </Routes>,
      { initialEntries: ['/upcoming'] }
    );

    expect(screen.getByTestId('assigned-quizzes-card')).toBeInTheDocument();
    expect(screen.getByText('React 101')).toBeInTheDocument();
    expect(screen.getByText('TypeScript 101')).toBeInTheDocument();

    const startBtns = screen.getAllByRole('button', { name: 'Start Attempt' });
    expect(startBtns.length).toBe(2);

    fireEvent.click(startBtns[0]);
    expect(await screen.findByText('Attempt Page')).toBeInTheDocument();
  });

  it('resumes an in-progress attempt without calling startAttempt mutation', () => {
    const quizzesWithInProgress = [
      {
        _id: 'q-3',
        title: 'CSS 101',
        duration: 15,
        status: 'Live',
        candidateAttempt: { id: 'attempt-in-progress', status: 'InProgress' }
      }
    ];

    vi.mocked(useGetQuizzesQuery).mockReturnValue({
      data: { success: true, data: quizzesWithInProgress },
      isLoading: false,
      error: undefined,
    } as any);

    renderWithProviders(
      <Routes>
        <Route path="/upcoming" element={<AssignedQuizzes />} />
        <Route path="/quiz-attempt/:attemptId" element={<div>Attempt Page</div>} />
      </Routes>,
      { initialEntries: ['/upcoming'] }
    );

    const startBtn = screen.getByRole('button', { name: 'Resume' });
    expect(startBtn).toBeInTheDocument();

    fireEvent.click(startBtn);
    expect(screen.getByText('Attempt Page')).toBeInTheDocument();
  });

  it('handles API error when startAttempt mutation fails', async () => {
    vi.mocked(useGetQuizzesQuery).mockReturnValue({
      data: { success: true, data: mockQuizzes },
      isLoading: false,
      error: undefined,
    } as any);

    // Case 1: error object with data.message
    const mockUnwrap1 = vi.fn().mockRejectedValue({
      data: { message: 'Start attempt failed api error' }
    });
    
    vi.mocked(useStartAttemptMutation).mockReturnValue([
      vi.fn().mockReturnValue({ unwrap: mockUnwrap1 }),
      { isLoading: false }
    ] as any);

    const { unmount } = renderWithProviders(<AssignedQuizzes />);

    const startBtns = screen.getAllByRole('button', { name: 'Start Attempt' });
    fireEvent.click(startBtns[0]);

    const spyConsole = vi.spyOn(console, 'error').mockImplementation(() => {});
    await vi.waitFor(() => expect(mockUnwrap1).toHaveBeenCalled());

    // Case 2: error object without data.message to hit the fallback string
    unmount();
    const mockUnwrap2 = vi.fn().mockRejectedValue(new Error('Generic Error'));
    vi.mocked(useStartAttemptMutation).mockReturnValue([
      vi.fn().mockReturnValue({ unwrap: mockUnwrap2 }),
      { isLoading: false }
    ] as any);

    renderWithProviders(<AssignedQuizzes />);
    const newStartBtns = screen.getAllByRole('button', { name: 'Start Attempt' });
    fireEvent.click(newStartBtns[0]);

    await vi.waitFor(() => expect(mockUnwrap2).toHaveBeenCalled());
    spyConsole.mockRestore();
  });

  it('renders empty table when quizzes data is undefined or empty', () => {
    // case 1: quizzesResponse is undefined
    vi.mocked(useGetQuizzesQuery).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: undefined,
    } as any);

    const { rerender } = renderWithProviders(<AssignedQuizzes />);
    expect(screen.queryByText('React 101')).not.toBeInTheDocument();

    // case 2: quizzesResponse.data is undefined
    vi.mocked(useGetQuizzesQuery).mockReturnValue({
      data: { success: true, data: undefined },
      isLoading: false,
      error: undefined,
    } as any);

    rerender(<AssignedQuizzes />);
    expect(screen.queryByText('React 101')).not.toBeInTheDocument();
  });

  it('filters out quizzes that are Submitted, AutoSubmitted, or Draft status', () => {
    const mixedQuizzes = [
      { _id: 'q-1', title: 'React 101', duration: 10, status: 'Live', candidateAttempt: { status: 'Submitted' } },
      { _id: 'q-2', title: 'TypeScript 101', duration: 20, status: 'Live', candidateAttempt: { status: 'AutoSubmitted' } },
      { _id: 'q-3', title: 'Node 101', duration: 30, status: 'Draft' },
      { _id: 'q-4', title: 'Python 101', duration: 15, status: 'Live', candidateAttempt: { status: 'InProgress' } },
      { _id: 'q-5', title: 'SQL 101', duration: 25, status: 'Scheduled' },
    ];

    vi.mocked(useGetQuizzesQuery).mockReturnValue({
      data: { success: true, data: mixedQuizzes },
      isLoading: false,
      error: undefined,
    } as any);

    renderWithProviders(<AssignedQuizzes />);
    
    // q-1, q-2, and q-3 should be filtered out
    expect(screen.queryByText('React 101')).not.toBeInTheDocument();
    expect(screen.queryByText('TypeScript 101')).not.toBeInTheDocument();
    expect(screen.queryByText('Node 101')).not.toBeInTheDocument();

    // q-4 (Live, InProgress) and q-5 (Scheduled) should render
    expect(screen.getByText('Python 101')).toBeInTheDocument();
    expect(screen.getByText('SQL 101')).toBeInTheDocument();
  });

  it('correctly disables/enables buttons based on status combinations', () => {
    const mixedQuizzes = [
      { _id: 'q-1', title: 'Live Quiz', duration: 10, status: 'Live' },
      { _id: 'q-2', title: 'Scheduled Quiz', duration: 20, status: 'Scheduled' },
      { _id: 'q-3', title: 'Scheduled InProgress Quiz', duration: 30, status: 'Scheduled', candidateAttempt: { id: 'attempt-3', status: 'InProgress' } },
    ];

    vi.mocked(useGetQuizzesQuery).mockReturnValue({
      data: { success: true, data: mixedQuizzes },
      isLoading: false,
      error: undefined,
    } as any);

    renderWithProviders(<AssignedQuizzes />);

    // Live Quiz (isLive = true, isInProgress = false) => disabled = !true && !false => false (ENABLED)
    const liveBtn = screen.getAllByRole('button', { name: 'Start Attempt' }).find(
      btn => btn.closest('tr')?.textContent?.includes('Live Quiz')
    );
    expect(liveBtn).toBeEnabled();

    // Scheduled Quiz (isLive = false, isInProgress = false) => disabled = !false && !false => true (DISABLED)
    const scheduledBtn = screen.getAllByRole('button', { name: 'Start Attempt' }).find(
      btn => btn.closest('tr')?.textContent?.includes('Scheduled Quiz')
    );
    expect(scheduledBtn).toBeDisabled();

    // Scheduled InProgress Quiz (isLive = false, isInProgress = true) => disabled = !false && !true => false (ENABLED)
    const scheduledInProgressBtn = screen.getByRole('button', { name: 'Resume' });
    expect(scheduledInProgressBtn).toBeEnabled();
  });

  it('does not navigate if startAttempt response is success = false or data is missing', async () => {
    vi.mocked(useGetQuizzesQuery).mockReturnValue({
      data: { success: true, data: mockQuizzes },
      isLoading: false,
      error: undefined,
    } as any);

    // Mock startAttempt yielding success: false
    const mockUnwrapSuccessFalse = vi.fn().mockResolvedValue({
      success: false,
      data: { _id: 'attempt-failed' }
    });

    const startAttemptMock = vi.fn().mockReturnValue({ unwrap: mockUnwrapSuccessFalse });
    
    vi.mocked(useStartAttemptMutation).mockReturnValue([
      startAttemptMock,
      { isLoading: false }
    ] as any);

    const { rerender } = renderWithProviders(
      <Routes>
        <Route path="/upcoming" element={<AssignedQuizzes />} />
        <Route path="/quiz-attempt/:attemptId" element={<div>Attempt Page</div>} />
      </Routes>,
      { initialEntries: ['/upcoming'] }
    );

    const startBtns = screen.getAllByRole('button', { name: 'Start Attempt' });
    fireEvent.click(startBtns[0]);

    await vi.waitFor(() => expect(mockUnwrapSuccessFalse).toHaveBeenCalled());
    expect(screen.queryByText('Attempt Page')).not.toBeInTheDocument();

    // Mock startAttempt yielding success: true but missing data
    const mockUnwrapDataMissing = vi.fn().mockResolvedValue({
      success: true,
      data: null
    });

    const startAttemptMock2 = vi.fn().mockReturnValue({ unwrap: mockUnwrapDataMissing });
    vi.mocked(useStartAttemptMutation).mockReturnValue([
      startAttemptMock2,
      { isLoading: false }
    ] as any);

    rerender(
      <Routes>
        <Route path="/upcoming" element={<AssignedQuizzes />} />
        <Route path="/quiz-attempt/:attemptId" element={<div>Attempt Page</div>} />
      </Routes>
    );

    const startBtnsAfter = screen.getAllByRole('button', { name: 'Start Attempt' });
    fireEvent.click(startBtnsAfter[0]);

    await vi.waitFor(() => expect(mockUnwrapDataMissing).toHaveBeenCalled());
    expect(screen.queryByText('Attempt Page')).not.toBeInTheDocument();
  });
});
