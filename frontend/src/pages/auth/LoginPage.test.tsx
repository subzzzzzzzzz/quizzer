import React from 'react';
import { screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import LoginPage from './LoginPage';
import { Routes, Route } from 'react-router-dom';

const mockLogin = vi.fn();
vi.mock('../../services/api', async () => {
  const actual: any = await vi.importActual('../../services/api');
  return {
    ...actual,
    useLoginMutation: () => [mockLogin, { isLoading: false }],
  };
});

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form inputs and handles form validation', async () => {
    const { container } = renderWithProviders(<LoginPage />);

    expect(screen.getByLabelText('Email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();

    const submitBtn = container.querySelector('button[type="submit"]');
    fireEvent.click(submitBtn);

    // Should display validation messages
    expect(await screen.findByText('Please enter your email address')).toBeInTheDocument();
    expect(screen.getByText('Please enter your password')).toBeInTheDocument();
  });

  it('submits form successfully and redirects on valid credentials', async () => {
    const mockUserData = {
      id: '1',
      name: 'Test Instructor',
      email: 'instructor@test.com',
      role: 'instructor',
      status: 'active',
    };

    mockLogin.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true, data: mockUserData }),
    });

    const { store, container } = renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard View</div>} />
      </Routes>,
      { initialEntries: ['/login'] }
    );

    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(emailInput, { target: { value: 'instructor@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const submitBtn = container.querySelector('button[type="submit"]');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'instructor@test.com',
      password: 'password123',
    });

    await waitFor(() => {
      expect(store.getState().auth.isAuthenticated).toBe(true);
      expect(store.getState().auth.user).toEqual(mockUserData);
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  it('displays alert on API error', async () => {
    mockLogin.mockReturnValue({
      unwrap: () => Promise.reject({
        data: { message: 'Incorrect email or password.' }
      }),
    });

    const { container } = renderWithProviders(<LoginPage />);

    const emailInput = screen.getByLabelText('Email address');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(emailInput, { target: { value: 'wrong@test.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });

    const submitBtn = container.querySelector('button[type="submit"]');
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockLogin).toHaveBeenCalled();
    expect(await screen.findByText('Incorrect email or password.')).toBeInTheDocument();
  });
});
