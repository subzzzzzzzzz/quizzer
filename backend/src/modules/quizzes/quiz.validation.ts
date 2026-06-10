import { z } from 'zod';

export const createQuizSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z.string().optional(),
    duration: z.union([z.number(), z.string()]).transform(val => Number(val)),
    questionType: z.enum(['single', 'multi']).optional(),
    startTime: z.string().datetime({ message: 'Invalid start time date string' }).optional().nullable(),
    endTime: z.string().datetime({ message: 'Invalid end time date string' }).optional().nullable(),
  }),
});

export const updateQuizSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters').optional(),
    description: z.string().optional(),
    duration: z.union([z.number(), z.string()]).transform(val => Number(val)).optional(),
    questionType: z.enum(['single', 'multi']).optional(),
    startTime: z.string().datetime().optional().nullable(),
    endTime: z.string().datetime().optional().nullable(),
  }),
});
