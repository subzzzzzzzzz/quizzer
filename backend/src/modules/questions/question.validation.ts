import { z } from 'zod';

export const addQuestionSchema = z.object({
  body: z.object({
    quizId: z.string().min(1, 'Quiz ID is required'),
    question: z.string().min(1, 'Question text is required'),
    options: z.array(z.string()).length(4, 'Exactly 4 options are required'),
    correctAnswers: z.array(z.number().min(0).max(3)).min(1, 'At least 1 correct answer index (0-3) is required'),
  }),
});

export const editQuestionSchema = z.object({
  body: z.object({
    question: z.string().min(1, 'Question text is required').optional(),
    options: z.array(z.string()).length(4, 'Exactly 4 options are required').optional(),
    correctAnswers: z.array(z.number().min(0).max(3)).min(1, 'At least 1 correct answer index (0-3) is required').optional(),
  }),
});
