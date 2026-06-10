import { Response, NextFunction } from 'express';
import AttemptModel from '../attempts/attempt.model';
import QuizModel from '../quizzes/quiz.model';
import QuestionModel from '../questions/question.model';
import ParticipantModel from '../participants/participant.model';
import UserModel from '../users/user.model';
import { AuthenticatedRequest } from '../../middleware/auth';
import { ForbiddenError, NotFoundError } from '../../shared/errors';
import { syncQuizStatuses } from '../quizzes/quiz.controller';

export async function getAttemptReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { attemptId } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const attempt = await AttemptModel.findById(attemptId)
      .populate('quizId', 'title duration questionType status endTime')
      .populate('candidateId', 'name email');

    if (!attempt) {
      next(new NotFoundError('Attempt not found'));
      return;
    }

    // Auth validation
    if (userRole === 'candidate' && attempt.candidateId._id.toString() !== userId?.toString()) {
      next(new ForbiddenError('You do not have permission to view this report'));
      return;
    }

    const quiz = await QuizModel.findById(attempt.quizId);
    if (userRole === 'instructor' && quiz) {
      const hasCompletedAttempts = !!(await AttemptModel.exists({
        quizId: quiz._id,
        status: { $in: ['Submitted', 'AutoSubmitted'] }
      }));
      if (quiz.status !== 'Completed' && !hasCompletedAttempts && quiz.instructorId.toString() !== userId?.toString()) {
        const creator = await UserModel.findById(quiz.instructorId);
        if (!creator || creator.role !== 'admin') {
          next(new ForbiddenError('You do not have permission to view results for this quiz'));
          return;
        }
      }
    }

    // Get all questions
    const questions = await QuestionModel.find({ quizId: attempt.quizId }).sort({ createdAt: 1 });

    // Build question analysis
    const questionsReport = questions.map((q) => {
      const qIdStr = q._id.toString();
      const candidateAnswers = attempt.answers.get(qIdStr) || [];
      
      const correctSorted = [...q.correctAnswers].sort();
      const candidateSorted = [...candidateAnswers].sort();

      const isCorrect = 
        correctSorted.length === candidateSorted.length && 
        correctSorted.every((val, index) => val === candidateSorted[index]);

      return {
        questionId: q._id,
        question: q.question,
        options: q.options,
        correctAnswers: q.correctAnswers, // Exposing here because this is the Results page!
        candidateAnswers,
        isCorrect,
      };
    });

    const totalQuestions = questions.length;
    const correctCount = questionsReport.filter(q => q.isCorrect).length;
    const incorrectCount = totalQuestions - correctCount;

    res.status(200).json({
      success: true,
      data: {
        attempt: {
          id: attempt._id,
          quizId: attempt.quizId,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          status: attempt.status,
          score: attempt.score,
          timeTaken: attempt.timeTaken,
        },
        candidate: {
          name: (attempt.candidateId as any).name,
          email: (attempt.candidateId as any).email,
        },
        summary: {
          totalQuestions,
          correctCount,
          incorrectCount,
          percentage: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
        },
        details: questionsReport,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getQuizAnalytics(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await syncQuizStatuses();
    const { quizId } = req.params;
    const userId = req.user?._id;
    const userRole = req.user?.role;

    const quiz = await QuizModel.findById(quizId);
    if (!quiz) {
      next(new NotFoundError('Quiz not found'));
      return;
    }

    // Validate permission
    const hasCompletedAttempts = !!(await AttemptModel.exists({
      quizId: quiz._id,
      status: { $in: ['Submitted', 'AutoSubmitted'] }
    }));
    if (userRole === 'instructor' && quiz.status !== 'Completed' && !hasCompletedAttempts && quiz.instructorId.toString() !== userId?.toString()) {
      const creator = await UserModel.findById(quiz.instructorId);
      if (!creator || creator.role !== 'admin') {
        next(new ForbiddenError('You do not have permission to access these analytics'));
        return;
      }
    }

    const questions = await QuestionModel.find({ quizId });
    const maxScore = questions.length;

    // Get all assigned participants
    const participants = await ParticipantModel.find({ quizId }).populate('userId', 'name email status');
    
    // Get attempts
    const attempts = await AttemptModel.find({ quizId });
    const attemptsMap = new Map(attempts.map(a => [a.candidateId.toString(), a]));

    const participantResults = participants.map((p: any) => {
      const attempt = attemptsMap.get(p.userId._id.toString());
      return {
        userId: p.userId._id,
        name: p.userId.name,
        email: p.userId.email,
        status: attempt ? attempt.status : 'NotStarted',
        score: attempt ? attempt.score : 0,
        timeTaken: attempt ? attempt.timeTaken : null,
        submittedAt: attempt ? attempt.submittedAt : null,
        attemptId: attempt ? attempt._id : null,
      };
    });

    // Compute metrics
    const completedAttempts = attempts.filter(a => a.status === 'Submitted' || a.status === 'AutoSubmitted');
    const attemptedScores = completedAttempts.map(a => a.score);

    let avgScore = 0;
    let highestScore = 0;
    let lowestScore = 0;

    if (attemptedScores.length > 0) {
      avgScore = Math.round((attemptedScores.reduce((a, b) => a + b, 0) / attemptedScores.length) * 10) / 10;
      highestScore = Math.max(...attemptedScores);
      lowestScore = Math.min(...attemptedScores);
    }

    // Score distribution calculation
    // Buckets: Excellent (>=80%), Good (60-79%), Average (40-59%), Poor (<40%)
    let distribution = {
      excellent: 0,
      good: 0,
      average: 0,
      poor: 0,
    };

    if (maxScore > 0) {
      completedAttempts.forEach((a) => {
        const pct = (a.score / maxScore) * 100;
        if (pct >= 80) distribution.excellent++;
        else if (pct >= 60) distribution.good++;
        else if (pct >= 40) distribution.average++;
        else distribution.poor++;
      });
    }

    res.status(200).json({
      success: true,
      data: {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          status: quiz.status,
          maxScore,
          endTime: quiz.endTime,
        },
        metrics: {
          assignedCount: participants.length,
          attemptedCount: attempts.length,
          completedCount: completedAttempts.length,
          avgScore,
          highestScore,
          lowestScore,
        },
        distribution,
        participants: participantResults,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getGlobalAnalytics(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await syncQuizStatuses();
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (userRole === 'candidate') {
      next(new ForbiddenError('Access denied'));
      return;
    }

    let quizFilter: any = {};
    if (userRole === 'instructor') {
      const admins = await UserModel.find({ role: 'admin' }).select('_id');
      const adminIds = admins.map(a => a._id);
      const quizzesWithAttempts = await AttemptModel.distinct('quizId', {
        status: { $in: ['Submitted', 'AutoSubmitted'] }
      });
      quizFilter = {
        $or: [
          { instructorId: userId },
          { instructorId: { $in: adminIds } },
          { status: 'Completed' },
          { _id: { $in: quizzesWithAttempts } }
        ]
      };
    }

    // Counts
    const totalQuizzes = await QuizModel.countDocuments(quizFilter);
    const draftCount = await QuizModel.countDocuments({ ...quizFilter, status: 'Draft' });
    const scheduledCount = await QuizModel.countDocuments({ ...quizFilter, status: 'Scheduled' });
    const liveCount = await QuizModel.countDocuments({ ...quizFilter, status: 'Live' });
    const completedCount = await QuizModel.countDocuments({ ...quizFilter, status: 'Completed' });
    const cancelledCount = await QuizModel.countDocuments({ ...quizFilter, status: 'Cancelled' });
    const expiredCount = await QuizModel.countDocuments({ ...quizFilter, status: 'Expired' });

    let candidatesCount = 0;
    let instructorsCount = 0;

    if (userRole === 'admin') {
      candidatesCount = await UserModel.countDocuments({ role: 'candidate' });
      instructorsCount = await UserModel.countDocuments({ role: 'instructor' });
    } else {
      // For instructors: find distinct candidates assigned to their quizzes
      const quizzes = await QuizModel.find(quizFilter).select('_id');
      const quizIds = quizzes.map(q => q._id);
      const uniqueCandidates = await ParticipantModel.distinct('userId', { quizId: { $in: quizIds } });
      candidatesCount = uniqueCandidates.length;
    }

    // Attempts count
    let totalAttempts = 0;
    if (userRole === 'admin') {
      totalAttempts = await AttemptModel.countDocuments();
    } else {
      const quizzes = await QuizModel.find(quizFilter).select('_id');
      const quizIds = quizzes.map(q => q._id);
      totalAttempts = await AttemptModel.countDocuments({ quizId: { $in: quizIds } });
    }

    res.status(200).json({
      success: true,
      data: {
        quizzes: {
          total: totalQuizzes,
          draft: draftCount,
          scheduled: scheduledCount,
          live: liveCount,
          completed: completedCount,
          cancelled: cancelledCount,
          expired: expiredCount,
        },
        users: {
          candidates: candidatesCount,
          instructors: instructorsCount,
        },
        attempts: {
          total: totalAttempts,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}
