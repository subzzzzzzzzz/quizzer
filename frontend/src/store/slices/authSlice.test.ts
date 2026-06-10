import { describe, it, expect } from 'vitest';
import authReducer, {
  setCredentials,
  logoutUser,
  setInitialized,
  User,
} from './authSlice';

describe('authSlice', () => {
  const initialState = {
    user: null,
    isAuthenticated: false,
    isInitialized: false,
  };

  const mockUser: User = {
    id: 'user-1',
    name: 'John Doe',
    email: 'john@example.com',
    role: 'instructor',
    status: 'active',
  };

  it('should return initial state when passed an empty action', () => {
    expect(authReducer(undefined, { type: '' })).toEqual(initialState);
  });

  it('should handle setCredentials', () => {
    const nextState = authReducer(initialState, setCredentials(mockUser));
    expect(nextState.user).toEqual(mockUser);
    expect(nextState.isAuthenticated).toBe(true);
    expect(nextState.isInitialized).toBe(true);
  });

  it('should handle logoutUser', () => {
    const loggedInState = {
      user: mockUser,
      isAuthenticated: true,
      isInitialized: true,
    };
    const nextState = authReducer(loggedInState, logoutUser());
    expect(nextState.user).toBeNull();
    expect(nextState.isAuthenticated).toBe(false);
    expect(nextState.isInitialized).toBe(true);
  });

  it('should handle setInitialized', () => {
    const nextState = authReducer(initialState, setInitialized());
    expect(nextState.isInitialized).toBe(true);
    expect(nextState.user).toBeNull();
    expect(nextState.isAuthenticated).toBe(false);
  });
});
