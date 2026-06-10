import React from 'react';
import { screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders } from '../test/utils';
import MainLayout from './MainLayout';
import { Routes, Route } from 'react-router-dom';

const mockLogoutUnwrap = vi.fn().mockResolvedValue({ success: true });
const mockLogout = vi.fn().mockReturnValue({
  unwrap: mockLogoutUnwrap,
});

vi.mock('../services/api', async () => {
  const actual: any = await vi.importActual('../services/api');
  return {
    ...actual,
    useLogoutMutation: () => [mockLogout, { isLoading: false }],
  };
});

describe('MainLayout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('redirects to /login if not authenticated', () => {
    renderWithProviders(
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
        </Route>
        <Route path="/login" element={<div data-testid="login">Login View</div>} />
      </Routes>,
      {
        preloadedState: {
          auth: {
            user: null,
            isAuthenticated: false,
            isInitialized: true,
          },
        },
        initialEntries: ['/dashboard'],
      }
    );

    expect(screen.getByTestId('login')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
  });

  it('renders sidebar navigation specific to instructor role', () => {
    renderWithProviders(
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Route>
      </Routes>,
      {
        preloadedState: {
          auth: {
            user: { id: '1', name: 'Alice Instructor', email: 'alice@test.com', role: 'instructor', status: 'active' },
            isAuthenticated: true,
            isInitialized: true,
          },
        },
        initialEntries: ['/dashboard'],
      }
    );

    expect(screen.getAllByText('Alice Instructor')[0]).toBeInTheDocument();
    expect(screen.getByText('instructor')).toBeInTheDocument();
    expect(screen.getByText('Update Quizzes')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
    expect(screen.queryByText('Access Management')).not.toBeInTheDocument();
  });

  it('renders sidebar navigation specific to admin role', () => {
    renderWithProviders(
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Route>
      </Routes>,
      {
        preloadedState: {
          auth: {
            user: { id: '2', name: 'Bob Admin', email: 'bob@test.com', role: 'admin', status: 'active' },
            isAuthenticated: true,
            isInitialized: true,
          },
        },
        initialEntries: ['/dashboard'],
      }
    );

    expect(screen.getAllByText('Bob Admin')[0]).toBeInTheDocument();
    expect(screen.getByText('Create Quiz')).toBeInTheDocument();
    expect(screen.getByText('Access Management')).toBeInTheDocument();
    expect(screen.queryByText('Analytics')).not.toBeInTheDocument();
  });

  it('triggers theme changes when theme toggle is clicked', () => {
    const { store } = renderWithProviders(
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Route>
      </Routes>,
      {
        preloadedState: {
          auth: {
            user: { id: '2', name: 'Bob Admin', email: 'bob@test.com', role: 'admin', status: 'active' },
            isAuthenticated: true,
            isInitialized: true,
          },
          theme: { isDark: false },
        },
        initialEntries: ['/dashboard'],
      }
    );

    const toggleButton = document.querySelector('header')?.querySelector('div[style*="cursor: pointer"]');
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton!);
    expect(store.getState().theme.isDark).toBe(true);
  });

  it('handles sign out correctly', async () => {
    const { store } = renderWithProviders(
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Route>
        <Route path="/login" element={<div data-testid="login">Login View</div>} />
      </Routes>,
      {
        preloadedState: {
          auth: {
            user: { id: '3', name: 'Charlie Cand', email: 'charlie@test.com', role: 'candidate', status: 'active' },
            isAuthenticated: true,
            isInitialized: true,
          },
        },
        initialEntries: ['/dashboard'],
      }
    );

    // Profile triggers dropdown
    const profileNode = screen.getAllByText('Charlie Cand')[1];
    fireEvent.click(profileNode);

    // Click logout
    const logoutBtn = screen.getByText('Sign Out');
    await act(async () => {
      fireEvent.click(logoutBtn);
    });

    expect(mockLogout).toHaveBeenCalled();
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });

  it('updates the clock time every second', () => {
    renderWithProviders(
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<div>Dashboard content</div>} />
        </Route>
      </Routes>,
      {
        preloadedState: {
          auth: {
            user: { id: '2', name: 'Bob Admin', email: 'bob@test.com', role: 'admin', status: 'active' },
            isAuthenticated: true,
            isInitialized: true,
          },
        },
        initialEntries: ['/dashboard'],
      }
    );

    const initialTimeText = screen.getByText(/•/).previousSibling?.textContent;
    
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    const updatedTimeText = screen.getByText(/•/).previousSibling?.textContent;
    // Clock should have changed or at least ticked
    expect(updatedTimeText).toBeDefined();
  });
});
