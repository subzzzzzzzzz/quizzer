import React from 'react';
import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { renderWithProviders } from '../test/utils';
import AuthLayout from './AuthLayout';
import { Routes, Route } from 'react-router-dom';

describe('AuthLayout', () => {
  it('redirects to /dashboard if user is authenticated', () => {
    const { store } = renderWithProviders(
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<div data-testid="login-content">Login Form</div>} />
        </Route>
        <Route path="/dashboard" element={<div data-testid="dashboard-content">Dashboard View</div>} />
      </Routes>,
      {
        preloadedState: {
          auth: {
            user: { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active' },
            isAuthenticated: true,
            isInitialized: true,
          },
        },
        initialEntries: ['/login'],
      }
    );

    expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
    expect(screen.queryByTestId('login-content')).not.toBeInTheDocument();
  });

  it('renders features and children (Outlet) when not authenticated', () => {
    renderWithProviders(
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<div data-testid="login-content">Login Form</div>} />
        </Route>
      </Routes>,
      {
        preloadedState: {
          auth: {
            user: null,
            isAuthenticated: false,
            isInitialized: true,
          },
        },
        initialEntries: ['/login'],
      }
    );

    expect(screen.getByTestId('login-content')).toBeInTheDocument();
    expect(screen.getByText('Test your knowledge, track your growth')).toBeInTheDocument();
  });
  
  it('renders signup sidebar features on signup path', () => {
    renderWithProviders(
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/signup" element={<div data-testid="signup-content">Signup Form</div>} />
        </Route>
      </Routes>,
      {
        preloadedState: {
          auth: {
            user: null,
            isAuthenticated: false,
            isInitialized: true,
          },
        },
        initialEntries: ['/signup'],
      }
    );

    expect(screen.getByTestId('signup-content')).toBeInTheDocument();
    expect(screen.getByText('Your account, your progress')).toBeInTheDocument();
  });
});
