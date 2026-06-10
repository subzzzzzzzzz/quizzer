import { Response, NextFunction } from 'express';
import UserModel from './user.model';
import { BadRequestError, NotFoundError } from '../../shared/errors';
import { AuthenticatedRequest } from '../../middleware/auth';

export async function assignInstructor(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      next(new BadRequestError('Email is required'));
      return;
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return 404, matching the UI expectation "email not registered"
      next(new NotFoundError('email not registered'));
      return;
    }

    user.role = 'instructor';
    await user.save();

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getInstructors(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const instructors = await UserModel.find({ role: 'instructor' }).select('name email role status');
    res.status(200).json({
      success: true,
      data: instructors,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCandidates(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const candidates = await UserModel.find({ role: 'candidate' }).select('name email role status');
    res.status(200).json({
      success: true,
      data: candidates,
    });
  } catch (error) {
    next(error);
  }
}
