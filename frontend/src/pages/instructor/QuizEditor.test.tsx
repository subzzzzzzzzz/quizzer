import React from 'react';
import { screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import QuizEditor from './QuizEditor';
import { Routes, Route } from 'react-router-dom';

const mockCreateQuiz = vi.fn();
const mockUpdateQuiz = vi.fn();
const mockPublishQuiz = vi.fn();
const mockAddQuestion = vi.fn();
const mockDeleteQuestion = vi.fn();
const mockAddParticipants = vi.fn();

const mockQuizData = {
  _id: 'quiz-1',
  title: 'CSS Grid & Flexbox',
  description: 'Test layout details',
  duration: 25,
  questionType: 'single',
  status: 'Draft',
  questionCount: 1,
  participantCount: 1,
  startTime: '2026-06-15T12:00:00Z',
  endTime: '2026-06-15T13:00:00Z',
};

const mockQuestions = [
  {
    _id: 'q-99',
    quizId: 'quiz-1',
    question: 'Is display:flex a display mode?',
    options: ['Yes', 'No', 'Maybe', 'Never'],
    correctAnswers: [0],
  },
];

const mockParticipants = [
  {
    _id: 'part-1',
    quizId: 'quiz-1',
    userId: { _id: 'cand-1', name: 'Alice Candidate', email: 'alice@cand.com', status: 'active' },
    assignedAt: '2026-06-09T00:00:00Z',
  },
];

vi.mock('../../services/api', async () => {
  const actual: any = await vi.importActual('../../services/api');
  return {
    ...actual,
    useGetQuizByIdQuery: (id: string) => ({
      data: { success: true, data: mockQuizData },
      isLoading: false,
      refetch: vi.fn(),
    }),
    useCreateQuizMutation: () => [mockCreateQuiz, { isLoading: false }],
    useUpdateQuizMutation: () => [mockUpdateQuiz, { isLoading: false }],
    usePublishQuizMutation: () => [mockPublishQuiz, { isLoading: false }],
    useGetQuestionsQuery: () => ({
      data: { success: true, data: mockQuestions },
      isLoading: false,
      refetch: vi.fn(),
    }),
    useAddQuestionMutation: () => [mockAddQuestion, { isLoading: false }],
    useEditQuestionMutation: () => [vi.fn(), { isLoading: false }],
    useDeleteQuestionMutation: () => [mockDeleteQuestion, { isLoading: false }],
    useBulkImportQuestionsMutation: () => [vi.fn(), { isLoading: false }],
    useGetParticipantsQuery: () => ({
      data: { success: true, data: mockParticipants },
      isLoading: false,
      refetch: vi.fn(),
    }),
    useAddParticipantsMutation: () => [mockAddParticipants, { isLoading: false }],
    useRemoveParticipantMutation: () => [vi.fn(), { isLoading: false }],
  };
});

describe('QuizEditor component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders editor in create mode and allows saving details', async () => {
    mockCreateQuiz.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true, data: { _id: 'new-quiz-id' } }),
    });

    renderWithProviders(
      <Routes>
        <Route path="/quizzes/create" element={<QuizEditor />} />
        <Route path="/quizzes/:id/edit" element={<div>Edit Mode View</div>} />
      </Routes>,
      { initialEntries: ['/quizzes/create'] }
    );

    expect(screen.getByText('Create New Quiz')).toBeInTheDocument();

    const titleInput = screen.getByPlaceholderText('e.g. CSS Advanced Selectors');
    const durationInput = screen.getByPlaceholderText('30');

    fireEvent.change(titleInput, { target: { value: 'CSS Transitions' } });
    fireEvent.change(durationInput, { target: { value: 15 } });

    const submitBtn = screen.getByRole('button', { name: /Save Configuration/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockCreateQuiz).toHaveBeenCalled();
  });

  it('renders editor in edit mode and loads existing data', () => {
    renderWithProviders(
      <Routes>
        <Route path="/quizzes/:id/edit" element={<QuizEditor />} />
      </Routes>,
      { initialEntries: ['/quizzes/quiz-1/edit'] }
    );

    expect(screen.getByText('Edit Quiz: CSS Grid & Flexbox')).toBeInTheDocument();
    expect(screen.getByDisplayValue('CSS Grid & Flexbox')).toBeInTheDocument();
  });

  it('allows managing questions tab, adding questions, and deleting', async () => {
    mockAddQuestion.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true }),
    });

    renderWithProviders(
      <Routes>
        <Route path="/quizzes/:id/edit" element={<QuizEditor />} />
      </Routes>,
      { initialEntries: ['/quizzes/quiz-1/edit'] }
    );

    // Switch to Questions tab
    const questionsTabHeader = screen.getByText('Questions');
    fireEvent.click(questionsTabHeader);

    // Should list the loaded mock questions
    expect(screen.getByText('Is display:flex a display mode?')).toBeInTheDocument();

    // Click Add Question
    const addBtn = screen.getByRole('button', { name: /Add Question/i });
    fireEvent.click(addBtn);

    // Modal opens
    expect(screen.getAllByText('Add Question')[0]).toBeInTheDocument();

    // Fill details
    const questionInput = screen.getByLabelText('Question Text');
    fireEvent.change(questionInput, { target: { value: 'Is Flexbox awesome?' } });
    fireEvent.change(document.getElementById('optionA')!, { target: { value: 'Yes' } });
    fireEvent.change(document.getElementById('optionB')!, { target: { value: 'Absolutely' } });
    fireEvent.change(document.getElementById('optionC')!, { target: { value: 'No' } });
    fireEvent.change(document.getElementById('optionD')!, { target: { value: 'Not really' } });

    // Tick option A checkbox as correct answer (it has select checkboxes for correct answers)
    const selectCheckboxes = screen.getAllByRole('checkbox');
    // First checkbox in the correct answers section
    fireEvent.click(selectCheckboxes[0]);

    const modalSaveBtn = document.querySelector('.ant-modal-footer .ant-btn-primary') || screen.getByText('OK');
    await act(async () => {
      fireEvent.click(modalSaveBtn!);
    });

    expect(mockAddQuestion).toHaveBeenCalled();
  });

  it('allows managing participants, enrolling new users', async () => {
    mockAddParticipants.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true }),
    });

    renderWithProviders(
      <Routes>
        <Route path="/quizzes/:id/edit" element={<QuizEditor />} />
      </Routes>,
      { initialEntries: ['/quizzes/quiz-1/edit'] }
    );

    // Switch to Participants tab
    const participantsTabHeader = screen.getByText('Participants');
    fireEvent.click(participantsTabHeader);

    // Lists current enrolled
    expect(screen.getByText('Alice Candidate')).toBeInTheDocument();

    // Enroll email
    const enrollInput = screen.getByPlaceholderText('Enter candidate email (e.g. sara@company.com)');
    fireEvent.change(enrollInput, { target: { value: 'john@cand.com' } });

    const enrollBtn = screen.getByRole('button', { name: /Assign/i });
    await act(async () => {
      fireEvent.click(enrollBtn);
    });

    expect(mockAddParticipants).toHaveBeenCalledWith({
      quizId: 'quiz-1',
      emails: ['john@cand.com'],
    });
  });
});
