import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserModel, IUser } from '../modules/users/user.model';
import { UnauthorizedError, ForbiddenError } from '../shared/errors';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export async function requireAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.cookies?.token;

    if (!token) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET);
    } catch (err) {
      next(new UnauthorizedError('Invalid or expired authentication token'));
      return;
    }

    const user = await UserModel.findById(decoded.id);
    if (!user || user.status === 'inactive') {
      next(new UnauthorizedError('User account is suspended or deleted'));
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRole(roles: ('admin' | 'instructor' | 'candidate')[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('You do not have permission to access this resource'));
      return;
    }

    next();
  };
}
