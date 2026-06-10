import { Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import QuizModel, { IQuiz } from './quiz.model';
import QuestionModel from '../questions/question.model';
import ParticipantModel from '../participants/participant.model';
import AttemptModel from '../attempts/attempt.model';
import UserModel from '../users/user.model';
import { AuthenticatedRequest } from '../../middleware/auth';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors';

// Helper to dynamically update quiz statuses based on current time
export async function syncQuizStatuses(): Promise<void> {
  const now = new Date();

  // Scheduled -> Live (if current time is between startTime and endTime)
  await QuizModel.updateMany(
    {
      status: 'Scheduled',
      startTime: { $lte: now },
      endTime: { $gt: now },
    },
    { $set: { status: 'Live' } }
  );

  // Live/Scheduled -> Completed (if current time has passed endTime)
  await QuizModel.updateMany(
    {
      status: { $in: ['Live', 'Scheduled'] },
      endTime: { $lte: now },
    },
    { $set: { status: 'Completed' } }
  );

  // Draft -> Expired (if current time has passed endTime and it was never published)
  await QuizModel.updateMany(
    {
      status: 'Draft',
      endTime: { $lte: now },
    },
    { $set: { status: 'Expired' } }
  );
}

export async function createQuiz(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { title, description, duration, questionType, startTime, endTime } = req.body;
    const instructorId = req.user?._id;

    if (!instructorId) {
      next(new ForbiddenError('Only logged-in users can create quizzes'));
      return;
    }

    const quizData: Partial<IQuiz> = {
      title,
      description,
      duration: Number(duration),
      questionType: questionType || 'single',
      instructorId: instructorId as Types.ObjectId,
      status: 'Draft',
    };

    if (startTime && endTime) {
      quizData.startTime = new Date(startTime);
      quizData.endTime = new Date(endTime);
      
      // If times are set, check logic
      if (quizData.startTime >= quizData.endTime) {
        next(new BadRequestError('Start time must be before end time'));
        return;
      }
    }

    const quiz = await QuizModel.create(quizData);

    res.status(201).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuizzes(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await syncQuizStatuses();
    const userRole = req.user?.role;
    const userId = req.user?._id;

    let filter: any = {};

    if (userRole === 'instructor') {
      // Instructors see quizzes they created OR quizzes created by admin users
      // OR quizzes that are Completed OR quizzes with completed/submitted attempts
      const admins = await UserModel.find({ role: 'admin' }).select('_id');
      const adminIds = admins.map((a) => a._id);
      const quizzesWithAttempts = await AttemptModel.distinct('quizId', {
        status: { $in: ['Submitted', 'AutoSubmitted'] }
      });
      filter.$or = [
        { instructorId: userId },
        { instructorId: { $in: adminIds } },
        { status: 'Completed' },
        { _id: { $in: quizzesWithAttempts } }
      ];
    } else if (userRole === 'candidate') {
      // Candidates see quizzes they are assigned to
      const assignments = await ParticipantModel.find({ userId }).select('quizId');
      const assignedQuizIds = assignments.map((a) => a.quizId);
      filter._id = { $in: assignedQuizIds };
      // Only show quizzes that are Scheduled, Live, Completed, Cancelled or Expired (No Drafts!)
      filter.status = { $ne: 'Draft' };
    }
    // Admins see all quizzes, so filter remains empty {}

    const quizzes = await QuizModel.find(filter)
      .populate('instructorId', 'name email role')
      .sort({ createdAt: -1 });

    const data = [];
    for (const quiz of quizzes) {
      const qCount = await QuestionModel.countDocuments({ quizId: quiz._id });
      const pCount = await ParticipantModel.countDocuments({ quizId: quiz._id });
      const completedAttemptsCount = await AttemptModel.countDocuments({
        quizId: quiz._id,
        status: { $in: ['Submitted', 'AutoSubmitted'] }
      });
      
      let candidateAttempt = null;
      if (userRole === 'candidate') {
        const attempt = await AttemptModel.findOne({ quizId: quiz._id, candidateId: userId });
        if (attempt) {
          candidateAttempt = {
            id: attempt._id,
            status: attempt.status,
            score: attempt.score,
            timeTaken: attempt.timeTaken,
          };
        }
      }

      data.push({
        ...quiz.toObject(),
        questionCount: qCount,
        participantCount: pCount,
        completedAttemptsCount,
        candidateAttempt,
      });
    }

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuizById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await syncQuizStatuses();
    const { id } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const quiz = await QuizModel.findById(id).populate('instructorId', 'name email role');
    if (!quiz) {
      next(new NotFoundError('Quiz not found'));
      return;
    }

    // Role restrictions
    const instructorIdStr = (quiz.instructorId as any)._id ? (quiz.instructorId as any)._id.toString() : quiz.instructorId.toString();
    if (userRole === 'instructor' && instructorIdStr !== userId?.toString()) {
      const creatorRole = (quiz.instructorId as any).role;
      if (creatorRole !== 'admin') {
        next(new ForbiddenError('You do not have permission to view this quiz'));
        return;
      }
    }

    if (userRole === 'candidate') {
      const assigned = await ParticipantModel.findOne({ quizId: id, userId });
      if (!assigned) {
        next(new ForbiddenError('You are not assigned to this quiz'));
        return;
      }
      if (quiz.status === 'Draft') {
        next(new ForbiddenError('This quiz is not active yet'));
        return;
      }
    }

    const qCount = await QuestionModel.countDocuments({ quizId: id });
    const pCount = await ParticipantModel.countDocuments({ quizId: id });

    res.status(200).json({
      success: true,
      data: {
        ...quiz.toObject(),
        questionCount: qCount,
        participantCount: pCount,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateQuiz(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { title, description, duration, questionType, startTime, endTime } = req.body;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const quiz = await QuizModel.findById(id);
    if (!quiz) {
      next(new NotFoundError('Quiz not found'));
      return;
    }

    // Ownership check
    if (userRole === 'instructor' && quiz.instructorId.toString() !== userId?.toString()) {
      const creator = await UserModel.findById(quiz.instructorId);
      if (!creator || creator.role !== 'admin') {
        next(new ForbiddenError('You do not have permission to edit this quiz'));
        return;
      }
    }

    // State validation
    if (['Completed', 'Cancelled', 'Expired'].includes(quiz.status)) {
      next(new BadRequestError(`Cannot edit a quiz in ${quiz.status} status`));
      return;
    }

    quiz.title = title || quiz.title;
    quiz.description = description !== undefined ? description : quiz.description;
    quiz.duration = duration ? Number(duration) : quiz.duration;
    quiz.questionType = questionType || quiz.questionType;

    if (startTime && endTime) {
      quiz.startTime = new Date(startTime);
      quiz.endTime = new Date(endTime);

      if (quiz.startTime >= quiz.endTime) {
        next(new BadRequestError('Start time must be before end time'));
        return;
      }
    }

    await quiz.save();

    res.status(200).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
}

export async function publishQuiz(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const quiz = await QuizModel.findById(id);
    if (!quiz) {
      next(new NotFoundError('Quiz not found'));
      return;
    }

    if (userRole === 'instructor' && quiz.instructorId.toString() !== userId?.toString()) {
      const creator = await UserModel.findById(quiz.instructorId);
      if (!creator || creator.role !== 'admin') {
        next(new ForbiddenError('You do not have permission to publish this quiz'));
        return;
      }
    }

    if (quiz.status !== 'Draft') {
      next(new BadRequestError('Only draft quizzes can be published'));
      return;
    }

    // Validate completeness: at least 1 question
    const questionCount = await QuestionModel.countDocuments({ quizId: id });
    if (questionCount === 0) {
      next(new BadRequestError('Quiz must have at least 1 question to be published'));
      return;
    }

    // Validate completeness: at least 1 participant
    const participantCount = await ParticipantModel.countDocuments({ quizId: id });
    if (participantCount === 0) {
      next(new BadRequestError('Quiz must have at least 1 participant to be published'));
      return;
    }

    // Validate times are set
    if (!quiz.startTime || !quiz.endTime) {
      next(new BadRequestError('Quiz must have a start time and end time configured to be published'));
      return;
    }

    const now = new Date();
    if (quiz.endTime <= now) {
      next(new BadRequestError('Quiz end time is in the past'));
      return;
    }

    // Determine status
    if (quiz.startTime <= now) {
      quiz.status = 'Live';
    } else {
      quiz.status = 'Scheduled';
    }

    await quiz.save();

    res.status(200).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelQuiz(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const quiz = await QuizModel.findById(id);
    if (!quiz) {
      next(new NotFoundError('Quiz not found'));
      return;
    }

    if (userRole === 'instructor' && quiz.instructorId.toString() !== userId?.toString()) {
      const creator = await UserModel.findById(quiz.instructorId);
      if (!creator || creator.role !== 'admin') {
        next(new ForbiddenError('You do not have permission to cancel this quiz'));
        return;
      }
    }

    if (quiz.status === 'Cancelled') {
      next(new BadRequestError('Quiz is already cancelled'));
      return;
    }

    quiz.status = 'Cancelled';
    quiz.cancelledAt = new Date();
    await quiz.save();

    res.status(200).json({
      success: true,
      data: quiz,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteQuiz(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    // Only Admin can delete quizzes
    if (req.user?.role !== 'admin') {
      next(new ForbiddenError('Only administrators can delete quizzes'));
      return;
    }

    const quiz = await QuizModel.findById(id);
    if (!quiz) {
      next(new NotFoundError('Quiz not found'));
      return;
    }

    // Delete associated questions, participants, and attempts
    await QuizModel.findByIdAndDelete(id);
    await QuestionModel.deleteMany({ quizId: id });
    await ParticipantModel.deleteMany({ quizId: id });
    await AttemptModel.deleteMany({ quizId: id });

    res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
}
