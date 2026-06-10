import { Response, NextFunction } from 'express';
import AttemptModel from './attempt.model';
import QuizModel from '../quizzes/quiz.model';
import QuestionModel from '../questions/question.model';
import ParticipantModel from '../participants/participant.model';
import UserModel from '../users/user.model';
import { AuthenticatedRequest } from '../../middleware/auth';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors';
import { syncQuizStatuses } from '../quizzes/quiz.controller';

// Helper to compute quiz score based on candidate answers
async function computeScore(quizId: string, candidateAnswers: Map<string, number[]>): Promise<number> {
  const questions = await QuestionModel.find({ quizId });
  let score = 0;

  for (const question of questions) {
    const qIdStr = question._id.toString();
    const candidateSelected = candidateAnswers.get(qIdStr) || [];
    
    // Sort both arrays to compare them
    const correctSorted = [...question.correctAnswers].sort();
    const candidateSorted = [...candidateSelected].sort();

    const isCorrect = 
      correctSorted.length === candidateSorted.length && 
      correctSorted.every((val, index) => val === candidateSorted[index]);

    if (isCorrect) {
      score += 1; // 1 mark per correct answer, no negative marking
    }
  }

  return score;
}

export async function startAttempt(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await syncQuizStatuses();
    const { quizId } = req.body;
    const candidateId = req.user?._id;

    if (!candidateId) {
      next(new ForbiddenError('Authentication required'));
      return;
    }

    const quiz = await QuizModel.findById(quizId);
    if (!quiz) {
      next(new NotFoundError('Quiz not found'));
      return;
    }

    // 1. Assigned User Validation
    const isAssigned = await ParticipantModel.findOne({ quizId, userId: candidateId });
    if (!isAssigned) {
      next(new ForbiddenError('You are not assigned to participate in this quiz'));
      return;
    }

    // 2. Live Window Validation
    if (quiz.status !== 'Live') {
      next(new BadRequestError(`Quiz is not currently Live (Current status: ${quiz.status})`));
      return;
    }

    const now = new Date();
    if (quiz.startTime && now < quiz.startTime) {
      next(new BadRequestError('Quiz has not started yet'));
      return;
    }
    if (quiz.endTime && now >= quiz.endTime) {
      next(new BadRequestError('Quiz has already ended'));
      return;
    }

    // 3. One Attempt Validation
    const existingAttempt = await AttemptModel.findOne({ quizId, candidateId });
    if (existingAttempt) {
      next(new BadRequestError('You have already attempted this quiz'));
      return;
    }

    const attempt = await AttemptModel.create({
      quizId,
      candidateId,
      startedAt: new Date(),
      status: 'InProgress',
      score: 0,
      answers: new Map(),
    });

    res.status(201).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    next(error);
  }
}

export async function saveAnswers(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { attemptId, answers } = req.body; // answers is key-value object { [qId]: [selectedIndices] }
    const candidateId = req.user?._id;

    const attempt = await AttemptModel.findById(attemptId);
    if (!attempt) {
      next(new NotFoundError('Attempt session not found'));
      return;
    }

    if (attempt.candidateId.toString() !== candidateId?.toString()) {
      next(new ForbiddenError('You are not authorized to edit this attempt'));
      return;
    }

    if (attempt.status !== 'InProgress') {
      next(new BadRequestError('This attempt is already submitted and cannot be updated'));
      return;
    }

    const quiz = await QuizModel.findById(attempt.quizId);
    if (!quiz) {
      next(new NotFoundError('Associated quiz not found'));
      return;
    }

    // Enforce time bounds
    const now = new Date();
    const startTimeMs = attempt.startedAt.getTime();
    const durationMs = quiz.duration * 60 * 1000;
    const isExpired = now.getTime() > startTimeMs + durationMs;

    if (isExpired) {
      // Auto-submit attempt
      attempt.answers = new Map(Object.entries(answers || {}));
      attempt.status = 'AutoSubmitted';
      attempt.submittedAt = now;
      attempt.timeTaken = Math.round((now.getTime() - startTimeMs) / 1000);
      attempt.score = await computeScore(quiz._id.toString(), attempt.answers);
      await attempt.save();

      // Check if all assigned participants have submitted
      const participants = await ParticipantModel.find({ quizId: quiz._id });
      const participantIds = participants.map(p => p.userId.toString());
      const submittedAttempts = await AttemptModel.countDocuments({
        quizId: quiz._id,
        candidateId: { $in: participantIds },
        status: { $in: ['Submitted', 'AutoSubmitted'] }
      });
      if (submittedAttempts >= participants.length) {
        quiz.status = 'Completed';
        await quiz.save();
      }

      res.status(200).json({
        success: true,
        message: 'Time expired. Quiz has been auto-submitted.',
        data: attempt,
      });
      return;
    }

    // Save running selections
    if (answers) {
      attempt.answers = new Map(Object.entries(answers));
    }
    await attempt.save();

    res.status(200).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    next(error);
  }
}

export async function submitAttempt(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { attemptId, answers } = req.body;
    const candidateId = req.user?._id;

    const attempt = await AttemptModel.findById(attemptId);
    if (!attempt) {
      next(new NotFoundError('Attempt session not found'));
      return;
    }

    if (attempt.candidateId.toString() !== candidateId?.toString()) {
      next(new ForbiddenError('You are not authorized to submit this attempt'));
      return;
    }

    if (attempt.status !== 'InProgress') {
      next(new BadRequestError('This attempt is already submitted'));
      return;
    }

    const quiz = await QuizModel.findById(attempt.quizId);
    if (!quiz) {
      next(new NotFoundError('Associated quiz not found'));
      return;
    }

    const now = new Date();
    const startTimeMs = attempt.startedAt.getTime();
    
    // Save answers if final payload provided
    if (answers) {
      attempt.answers = new Map(Object.entries(answers));
    }

    // Calculate score
    const finalScore = await computeScore(quiz._id.toString(), attempt.answers);
    const timeTakenSec = Math.round((now.getTime() - startTimeMs) / 1000);

    attempt.score = finalScore;
    attempt.timeTaken = timeTakenSec;
    attempt.submittedAt = now;
    attempt.status = 'Submitted';

    await attempt.save();

    // Check if all assigned participants have submitted
    const participants = await ParticipantModel.find({ quizId: quiz._id });
    const participantIds = participants.map(p => p.userId.toString());
    const submittedAttempts = await AttemptModel.countDocuments({
      quizId: quiz._id,
      candidateId: { $in: participantIds },
      status: { $in: ['Submitted', 'AutoSubmitted'] }
    });
    if (submittedAttempts >= participants.length) {
      quiz.status = 'Completed';
      await quiz.save();
    }

    res.status(200).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAttemptDetails(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params; // attempt ID
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const attempt = await AttemptModel.findById(id)
      .populate('quizId', 'title description duration status endTime')
      .populate('candidateId', 'name email');

    if (!attempt) {
      next(new NotFoundError('Attempt not found'));
      return;
    }

    // Security check
    if (userRole === 'candidate' && attempt.candidateId._id.toString() !== userId?.toString()) {
      next(new ForbiddenError('You do not have permission to view this attempt'));
      return;
    }

    if (userRole === 'instructor') {
      const quiz = await QuizModel.findById(attempt.quizId);
      if (quiz && quiz.instructorId.toString() !== userId?.toString()) {
        const creator = await UserModel.findById(quiz.instructorId);
        if (!creator || creator.role !== 'admin') {
          next(new ForbiddenError('You do not have permission to view attempts for this quiz'));
          return;
        }
      }
    }

    res.status(200).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    next(error);
  }
}

export async function getActiveAttempt(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { quizId } = req.params;
    const candidateId = req.user?._id;

    const attempt = await AttemptModel.findOne({ quizId, candidateId, status: 'InProgress' });

    res.status(200).json({
      success: true,
      data: attempt,
    });
  } catch (error) {
    next(error);
  }
}
