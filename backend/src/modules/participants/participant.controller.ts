import { Response, NextFunction } from 'express';
import ParticipantModel from './participant.model';
import QuizModel from '../quizzes/quiz.model';
import UserModel from '../users/user.model';
import { AuthenticatedRequest } from '../../middleware/auth';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors';

export async function getQuizParticipants(
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

    if (userRole === 'instructor' && quiz.instructorId.toString() !== userId?.toString()) {
      const creator = await UserModel.findById(quiz.instructorId);
      if (!creator || creator.role !== 'admin') {
        next(new ForbiddenError('You do not have permission to view participants for this quiz'));
        return;
      }
    }

    const participants = await ParticipantModel.find({ quizId })
      .populate('userId', 'name email status')
      .sort({ assignedAt: -1 });

    res.status(200).json({
      success: true,
      data: participants,
    });
  } catch (error) {
    next(error);
  }
}

export async function addParticipants(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { quizId, emails } = req.body;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const quiz = await QuizModel.findById(quizId);
    if (!quiz) {
      next(new NotFoundError('Quiz not found'));
      return;
    }

    if (userRole === 'instructor' && quiz.instructorId.toString() !== userId?.toString()) {
      const creator = await UserModel.findById(quiz.instructorId);
      if (!creator || creator.role !== 'admin') {
        next(new ForbiddenError('You do not have permission to manage participants for this quiz'));
        return;
      }
    }

    if (quiz.status !== 'Draft') {
      next(new BadRequestError('Can only add participants to Draft quizzes'));
      return;
    }

    if (!Array.isArray(emails) || emails.length === 0) {
      next(new BadRequestError('Emails list must be a non-empty array'));
      return;
    }

    const lowercaseEmails = emails.map(e => e.trim().toLowerCase());

    // Find users who have these emails
    const users = await UserModel.find({ email: { $in: lowercaseEmails } });
    const registeredEmails = users.map(u => u.email.toLowerCase());
    const unregisteredEmails = lowercaseEmails.filter(e => !registeredEmails.includes(e));

    const participantRecords = [];
    for (const user of users) {
      // Check if already assigned
      const exists = await ParticipantModel.findOne({ quizId, userId: user._id });
      if (!exists) {
        participantRecords.push({
          quizId,
          userId: user._id,
        });
      }
    }

    let insertedCount = 0;
    if (participantRecords.length > 0) {
      const inserted = await ParticipantModel.insertMany(participantRecords, { ordered: false });
      insertedCount = inserted.length;
    }

    res.status(200).json({
      success: true,
      data: {
        importedCount: insertedCount,
        registeredCount: users.length,
        unregisteredCount: unregisteredEmails.length,
        unregisteredEmails,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function removeParticipant(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params; // Participant record ID
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const participant = await ParticipantModel.findById(id);
    if (!participant) {
      next(new NotFoundError('Participant assignment not found'));
      return;
    }

    const quiz = await QuizModel.findById(participant.quizId);
    if (!quiz) {
      next(new NotFoundError('Associated quiz not found'));
      return;
    }

    if (userRole === 'instructor' && quiz.instructorId.toString() !== userId?.toString()) {
      const creator = await UserModel.findById(quiz.instructorId);
      if (!creator || creator.role !== 'admin') {
        next(new ForbiddenError('You do not have permission to remove participants from this quiz'));
        return;
      }
    }

    if (quiz.status !== 'Draft') {
      next(new BadRequestError('Can only remove participants from Draft quizzes'));
      return;
    }

    await ParticipantModel.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
}
