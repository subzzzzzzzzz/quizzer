import { Response, NextFunction } from 'express';
import QuestionModel from './question.model';
import QuizModel from '../quizzes/quiz.model';
import ParticipantModel from '../participants/participant.model';
import { AuthenticatedRequest } from '../../middleware/auth';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors';

export async function addQuestion(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { quizId, question, options, correctAnswers } = req.body;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const quiz = await QuizModel.findById(quizId);
    if (!quiz) {
      next(new NotFoundError('Associated quiz not found'));
      return;
    }

    if (userRole === 'instructor' && quiz.instructorId.toString() !== userId?.toString()) {
      next(new ForbiddenError('You do not have permission to add questions to this quiz'));
      return;
    }

    if (quiz.status !== 'Draft') {
      next(new BadRequestError('Can only add questions to Draft quizzes'));
      return;
    }

    const newQuestion = await QuestionModel.create({
      quizId,
      question,
      options,
      correctAnswers,
    });

    res.status(201).json({
      success: true,
      data: newQuestion,
    });
  } catch (error) {
    next(error);
  }
}

export async function editQuestion(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { question, options, correctAnswers } = req.body;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const existingQuestion = await QuestionModel.findById(id);
    if (!existingQuestion) {
      next(new NotFoundError('Question not found'));
      return;
    }

    const quiz = await QuizModel.findById(existingQuestion.quizId);
    if (!quiz) {
      next(new NotFoundError('Associated quiz not found'));
      return;
    }

    if (userRole === 'instructor' && quiz.instructorId.toString() !== userId?.toString()) {
      next(new ForbiddenError('You do not have permission to edit questions in this quiz'));
      return;
    }

    if (quiz.status !== 'Draft') {
      next(new BadRequestError('Can only edit questions of Draft quizzes'));
      return;
    }

    existingQuestion.question = question || existingQuestion.question;
    existingQuestion.options = options || existingQuestion.options;
    existingQuestion.correctAnswers = correctAnswers || existingQuestion.correctAnswers;

    await existingQuestion.save();

    res.status(200).json({
      success: true,
      data: existingQuestion,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuestion(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const question = await QuestionModel.findById(id);
    if (!question) {
      next(new NotFoundError('Question not found'));
      return;
    }

    const quiz = await QuizModel.findById(question.quizId);
    if (!quiz) {
      next(new NotFoundError('Associated quiz not found'));
      return;
    }

    if (userRole === 'instructor' && quiz.instructorId.toString() !== userId?.toString()) {
      next(new ForbiddenError('You do not have permission to delete questions from this quiz'));
      return;
    }

    if (quiz.status !== 'Draft') {
      next(new BadRequestError('Can only delete questions of Draft quizzes'));
      return;
    }

    await QuestionModel.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuestionsByQuizId(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { quizId } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const quiz = await QuizModel.findById(quizId);
    if (!quiz) {
      next(new NotFoundError('Quiz not found'));
      return;
    }

    // Role-based logic
    if (userRole === 'instructor' && quiz.instructorId.toString() !== userId?.toString()) {
      next(new ForbiddenError('You do not have permission to view questions for this quiz'));
      return;
    }

    if (userRole === 'candidate') {
      // Must be assigned
      const assigned = await ParticipantModel.findOne({ quizId, userId });
      if (!assigned) {
        next(new ForbiddenError('You are not assigned to this quiz'));
        return;
      }
      // Draft/Scheduled quizzes are hidden from candidate question fetches
      if (quiz.status === 'Draft' || quiz.status === 'Scheduled') {
        next(new ForbiddenError('Questions are not available before quiz starts'));
        return;
      }
    }

    // Fetch questions
    let questions = await QuestionModel.find({ quizId }).sort({ createdAt: 1 });

    // CRITICAL: Hide answers for candidates
    if (userRole === 'candidate') {
      const sanitized = questions.map((q) => {
        const obj = q.toObject();
        delete (obj as any).correctAnswers; // DO NOT expose answers
        return obj;
      });
      res.status(200).json({
        success: true,
        data: sanitized,
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: questions,
    });
  } catch (error) {
    next(error);
  }
}

export async function bulkImportQuestions(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { quizId, questions } = req.body;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const quiz = await QuizModel.findById(quizId);
    if (!quiz) {
      next(new NotFoundError('Quiz not found'));
      return;
    }

    if (userRole === 'instructor' && quiz.instructorId.toString() !== userId?.toString()) {
      next(new ForbiddenError('You do not have permission to import questions to this quiz'));
      return;
    }

    if (quiz.status !== 'Draft') {
      next(new BadRequestError('Can only import questions to Draft quizzes'));
      return;
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      next(new BadRequestError('Questions list must be a non-empty array'));
      return;
    }

    // Validate each question
    const questionsToCreate = [];
    for (const q of questions) {
      if (!q.question || !Array.isArray(q.options) || q.options.length !== 4 || !Array.isArray(q.correctAnswers)) {
        next(new BadRequestError('Invalid question structure in bulk import'));
        return;
      }
      questionsToCreate.push({
        quizId,
        question: q.question,
        options: q.options,
        correctAnswers: q.correctAnswers,
      });
    }

    const created = await QuestionModel.insertMany(questionsToCreate);

    res.status(201).json({
      success: true,
      data: {
        count: created.length,
        questions: created,
      },
    });
  } catch (error) {
    next(error);
  }
}
