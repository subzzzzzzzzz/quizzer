import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import UserModel from '../users/user.model';
import { UnauthorizedError, ConflictError } from '../../shared/errors';
import { AuthenticatedRequest } from '../../middleware/auth';

const BCRYPT_SALT_ROUNDS = 12;

export async function signup(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      next(new ConflictError('Email already registered'));
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    const user = await UserModel.create({
      name,
      email,
      passwordHash,
      role: role || 'candidate',
      status: 'active',
    });

    // Generate JWT
    const token = jwt.sign({ id: user._id }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as any,
    });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user || user.status === 'inactive') {
      next(new UnauthorizedError('Invalid email or password'));
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      next(new UnauthorizedError('Invalid email or password'));
      return;
    }

    const token = jwt.sign({ id: user._id }, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN as any,
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.clearCookie('token', {
      httpOnly: true,
      secure: config.NODE_ENV === 'production',
      sameSite: 'strict',
    });
    res.status(200).json({
      success: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      next(new UnauthorizedError('Not authenticated'));
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        status: req.user.status,
      },
    });
  } catch (error) {
    next(error);
  }
}
