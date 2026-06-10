import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import UserModel, { IUser } from '../modules/users/user.model';
import { config } from '../config';

export const MOCK_PASSWORD = 'Password123!';

export async function createMockUser(
  role: 'admin' | 'instructor' | 'candidate',
  customData: Partial<IUser> = {}
): Promise<IUser> {
  const suffix = Math.random().toString(36).substring(2, 7);
  const email = customData.email || `${role}_${Date.now()}_${suffix}@example.com`;
  const name = customData.name || `${role.charAt(0).toUpperCase() + role.slice(1)} User`;
  const passwordHash = await bcrypt.hash(MOCK_PASSWORD, 10);

  const user = await UserModel.create({
    name,
    email,
    passwordHash,
    role,
    status: 'active',
    ...customData,
  });

  return user;
}

export function getAuthCookie(user: IUser): string[] {
  const token = jwt.sign({ id: user._id }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as any,
  });
  return [`token=${token}`];
}
