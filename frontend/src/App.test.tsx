import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

const mockGetMe = vi.fn();
vi.mock('./services/api', async () => {
  const actual: any = await vi.importActual('./services/api');
  return {
    ...actual,
    useGetMeQuery: () => mockGetMe(),
  };
});

describe('App Bootstrap component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders synchronizing session spinner initially when session fetch is loading', () => {
    mockGetMe.mockReturnValue({
      data: null,
      error: null,
      isLoading: true,
    });

    render(<App />);

    expect(screen.getByText('Synchronizing secure session...')).toBeInTheDocument();
  });

  it('renders login page if session check is completed but unauthenticated', async () => {
    mockGetMe.mockReturnValue({
      data: null,
      error: { status: 401 },
      isLoading: false,
    });

    render(<App />);

    // Since we are not logged in, Router catches-all or routes to login
    expect((await screen.findAllByText('Sign In'))[0]).toBeInTheDocument();
    expect(screen.getAllByText('Sign Up')[0]).toBeInTheDocument();
  });
});
