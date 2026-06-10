import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../test/utils';
import Dashboard from './Dashboard';
import { vi } from 'vitest';

vi.mock('../services/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/api')>();
  return {
    ...actual,
    useGetQuizzesQuery: vi.fn().mockReturnValue({ data: { data: [] }, isLoading: false }),
    useGetGlobalAnalyticsQuery: vi.fn().mockReturnValue({ data: { data: {} }, isLoading: false }),
  };
});

describe('Dashboard Component', () => {
  it('renders loading spin if not authenticated or user is loading', () => {
    renderWithProviders(<Dashboard />, {
      preloadedState: {
        auth: {
          user: null,
          isAuthenticated: false,
          isInitialized: false,
        },
      },
    });

    expect(screen.getByText('Verifying login status...')).toBeInTheDocument();
  });

  it('renders AdminDashboard if user role is admin', () => {
    renderWithProviders(<Dashboard />, {
      preloadedState: {
        auth: {
          user: { id: 'a1', name: 'Admin User', email: 'admin@test.com', role: 'admin', status: 'active' },
          isAuthenticated: true,
          isInitialized: true,
        },
      },
    });

    expect(screen.getByTestId('admin-dashboard')).toBeInTheDocument();
  });

  it('renders InstructorDashboard if user role is instructor', () => {
    renderWithProviders(<Dashboard />, {
      preloadedState: {
        auth: {
          user: { id: 'i1', name: 'Instructor User', email: 'inst@test.com', role: 'instructor', status: 'active' },
          isAuthenticated: true,
          isInitialized: true,
        },
      },
    });

    expect(screen.getByTestId('instructor-dashboard')).toBeInTheDocument();
  });

  it('renders CandidateDashboard if user role is candidate', () => {
    renderWithProviders(<Dashboard />, {
      preloadedState: {
        auth: {
          user: { id: 'c1', name: 'Candidate User', email: 'cand@test.com', role: 'candidate', status: 'active' },
          isAuthenticated: true,
          isInitialized: true,
        },
      },
    });

    expect(screen.getByTestId('candidate-dashboard')).toBeInTheDocument();
  });

  it('renders access denied message if role is invalid', () => {
    renderWithProviders(<Dashboard />, {
      preloadedState: {
        auth: {
          user: { id: 'x1', name: 'Unknown User', email: 'unknown@test.com', role: 'super-user' as any, status: 'active' },
          isAuthenticated: true,
          isInitialized: true,
        },
      },
    });

    expect(screen.getByText('Access denied: invalid role configuration.')).toBeInTheDocument();
  });
});
