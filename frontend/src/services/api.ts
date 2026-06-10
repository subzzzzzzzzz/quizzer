import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { User } from '../store/slices/authSlice';

// Inline Interfaces
export interface Quiz {
  _id: string;
  title: string;
  description?: string;
  instructorId: {
    _id: string;
    name: string;
    email: string;
  } | string;
  questionType: 'single' | 'multi';
  duration: number;
  status: 'Draft' | 'Scheduled' | 'Live' | 'Completed' | 'Cancelled' | 'Expired';
  startTime?: string;
  endTime?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
  participantCount?: number;
  candidateAttempt?: {
    id: string;
    status: string;
    score: number;
  } | null;
}


export interface Question {
  _id: string;
  quizId: string;
  question: string;
  options: string[];
  correctAnswers?: number[];
  createdAt: string;
}

export interface Participant {
  _id: string;
  quizId: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    status: string;
  };
  assignedAt: string;
}

export interface Attempt {
  _id: string;
  quizId: string | Quiz;
  candidateId: string | { _id: string; name: string; email: string };
  startedAt: string;
  submittedAt?: string;
  answers: Record<string, number[]>;
  score: number;
  timeTaken?: number;
  status: 'InProgress' | 'Submitted' | 'AutoSubmitted';
}

export interface GlobalAnalytics {
  quizzes: {
    total: number;
    draft: number;
    scheduled: number;
    live: number;
    completed: number;
    cancelled: number;
    expired: number;
  };
  users: {
    candidates: number;
    instructors: number;
  };
  attempts: {
    total: number;
  };
}

export interface QuizAnalytics {
  quiz: {
    id: string;
    title: string;
    status: string;
    maxScore: number;
    endTime?: string;
  };
  metrics: {
    assignedCount: number;
    attemptedCount: number;
    completedCount: number;
    avgScore: number;
    highestScore: number;
    lowestScore: number;
  };
  distribution: {
    excellent: number;
    good: number;
    average: number;
    poor: number;
  };
  participants: Array<{
    userId: string;
    name: string;
    email: string;
    status: 'NotStarted' | 'InProgress' | 'Submitted' | 'AutoSubmitted';
    score: number;
    timeTaken: number | null;
    submittedAt: string | null;
    attemptId: string | null;
  }>;
}

export interface AttemptReport {
  attempt: {
    id: string;
    quizId: Quiz;
    startedAt: string;
    submittedAt?: string;
    status: string;
    score: number;
    timeTaken?: number;
  };
  candidate: {
    name: string;
    email: string;
  };
  summary: {
    totalQuestions: number;
    correctCount: number;
    incorrectCount: number;
    percentage: number;
  };
  details: Array<{
    questionId: string;
    question: string;
    options: string[];
    correctAnswers: number[];
    candidateAnswers: number[];
    isCorrect: boolean;
  }>;
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: 'http://localhost:3000/api/v1',
    prepareHeaders: (headers) => {
      // Credentials cookie handles authentication automatically
      return headers;
    },
    credentials: 'include', // Include credentials (cookies) in requests
  }),
  tagTypes: ['Auth', 'Quizzes', 'Questions', 'Participants', 'Attempts', 'Analytics'],
  endpoints: (builder) => ({
    // AUTH ENDPOINTS
    getMe: builder.query<{ success: boolean; data: User }, void>({
      query: () => '/auth/me',
      providesTags: ['Auth'],
    }),
    login: builder.mutation<{ success: boolean; data: User }, any>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Auth', 'Quizzes', 'Attempts', 'Analytics'],
    }),
    signup: builder.mutation<{ success: boolean; data: User }, any>({
      query: (userData) => ({
        url: '/auth/signup',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['Auth'],
    }),
    logout: builder.mutation<{ success: boolean; data: null }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),

    // USER ADMIN ENDPOINTS
    assignInstructor: builder.mutation<{ success: boolean; data: any }, { email: string }>({
      query: (payload) => ({
        url: '/users/assign-instructor',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Analytics'],
    }),
    getInstructors: builder.query<{ success: boolean; data: any[] }, void>({
      query: () => '/users/instructors',
    }),
    getCandidates: builder.query<{ success: boolean; data: User[] }, void>({
      query: () => '/users/candidates',
    }),

    // QUIZZES ENDPOINTS
    getQuizzes: builder.query<{ success: boolean; data: Quiz[] }, void>({
      query: () => '/quizzes',
      providesTags: ['Quizzes'],
    }),
    getQuizById: builder.query<{ success: boolean; data: Quiz }, string>({
      query: (id) => `/quizzes/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Quizzes', id }],
    }),
    createQuiz: builder.mutation<{ success: boolean; data: Quiz }, Partial<Quiz>>({
      query: (newQuiz) => ({
        url: '/quizzes',
        method: 'POST',
        body: newQuiz,
      }),
      invalidatesTags: ['Quizzes', 'Analytics'],
    }),
    updateQuiz: builder.mutation<{ success: boolean; data: Quiz }, { id: string; body: Partial<Quiz> }>({
      query: ({ id, body }) => ({
        url: `/quizzes/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => ['Quizzes', { type: 'Quizzes', id }, 'Analytics'],
    }),
    publishQuiz: builder.mutation<{ success: boolean; data: Quiz }, string>({
      query: (id) => ({
        url: `/quizzes/${id}/publish`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => ['Quizzes', { type: 'Quizzes', id }, 'Analytics'],
    }),
    cancelQuiz: builder.mutation<{ success: boolean; data: Quiz }, string>({
      query: (id) => ({
        url: `/quizzes/${id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => ['Quizzes', { type: 'Quizzes', id }, 'Analytics'],
    }),
    deleteQuiz: builder.mutation<{ success: boolean; data: null }, string>({
      query: (id) => ({
        url: `/quizzes/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Quizzes', 'Analytics'],
    }),

    // QUESTIONS ENDPOINTS
    getQuestions: builder.query<{ success: boolean; data: Question[] }, string>({
      query: (quizId) => `/questions/quiz/${quizId}`,
      providesTags: ['Questions'],
    }),
    addQuestion: builder.mutation<{ success: boolean; data: Question }, Partial<Question>>({
      query: (body) => ({
        url: '/questions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Questions', 'Quizzes'],
    }),
    editQuestion: builder.mutation<{ success: boolean; data: Question }, { id: string; body: Partial<Question> }>({
      query: ({ id, body }) => ({
        url: `/questions/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Questions'],
    }),
    deleteQuestion: builder.mutation<{ success: boolean; data: null }, string>({
      query: (id) => ({
        url: `/questions/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Questions', 'Quizzes'],
    }),
    bulkImportQuestions: builder.mutation<{ success: boolean; data: any }, { quizId: string; questions: any[] }>({
      query: (body) => ({
        url: '/questions/bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Questions', 'Quizzes'],
    }),

    // PARTICIPANTS ENDPOINTS
    getParticipants: builder.query<{ success: boolean; data: Participant[] }, string>({
      query: (quizId) => `/participants/quiz/${quizId}`,
      providesTags: ['Participants'],
    }),
    addParticipants: builder.mutation<{ success: boolean; data: any }, { quizId: string; emails: string[] }>({
      query: (body) => ({
        url: '/participants/bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Participants', 'Quizzes'],
    }),
    removeParticipant: builder.mutation<{ success: boolean; data: null }, string>({
      query: (id) => ({
        url: `/participants/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Participants', 'Quizzes'],
    }),

    // ATTEMPTS ENDPOINTS
    startAttempt: builder.mutation<{ success: boolean; data: Attempt }, { quizId: string }>({
      query: (body) => ({
        url: '/attempts/start',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Attempts', 'Quizzes'],
    }),
    saveAnswers: builder.mutation<{ success: boolean; message?: string; data: Attempt }, { attemptId: string; answers: Record<string, number[]> }>({
      query: (body) => ({
        url: '/attempts/save',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Attempts'],
    }),
    submitAttempt: builder.mutation<{ success: boolean; data: Attempt }, { attemptId: string; answers?: Record<string, number[]> }>({
      query: (body) => ({
        url: '/attempts/submit',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Attempts', 'Quizzes', 'Analytics'],
    }),
    getActiveAttempt: builder.query<{ success: boolean; data: Attempt | null }, string>({
      query: (quizId) => `/attempts/active/${quizId}`,
      providesTags: ['Attempts'],
    }),
    getAttemptDetails: builder.query<{ success: boolean; data: Attempt }, string>({
      query: (id) => `/attempts/${id}`,
      providesTags: ['Attempts'],
    }),

    // ANALYTICS ENDPOINTS
    getGlobalAnalytics: builder.query<{ success: boolean; data: GlobalAnalytics }, void>({
      query: () => '/analytics/global',
      providesTags: ['Analytics'],
    }),
    getQuizAnalytics: builder.query<{ success: boolean; data: QuizAnalytics }, string>({
      query: (quizId) => `/analytics/quiz/${quizId}`,
      providesTags: ['Analytics'],
    }),
    getAttemptReport: builder.query<{ success: boolean; data: AttemptReport }, string>({
      query: (attemptId) => `/analytics/attempt/${attemptId}`,
      providesTags: ['Analytics'],
    }),
  }),
});

export const {
  useGetMeQuery,
  useLoginMutation,
  useSignupMutation,
  useLogoutMutation,
  useAssignInstructorMutation,
  useGetInstructorsQuery,
  useGetCandidatesQuery,
  useGetQuizzesQuery,
  useGetQuizByIdQuery,
  useCreateQuizMutation,
  useUpdateQuizMutation,
  usePublishQuizMutation,
  useCancelQuizMutation,
  useDeleteQuizMutation,
  useGetQuestionsQuery,
  useAddQuestionMutation,
  useEditQuestionMutation,
  useDeleteQuestionMutation,
  useBulkImportQuestionsMutation,
  useGetParticipantsQuery,
  useAddParticipantsMutation,
  useRemoveParticipantMutation,
  useStartAttemptMutation,
  useSaveAnswersMutation,
  useSubmitAttemptMutation,
  useGetActiveAttemptQuery,
  useGetAttemptDetailsQuery,
  useGetGlobalAnalyticsQuery,
  useGetQuizAnalyticsQuery,
  useGetAttemptReportQuery,
} = api;
