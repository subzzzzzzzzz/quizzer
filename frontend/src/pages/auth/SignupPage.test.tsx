import React from 'react';
import { screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import SignupPage from './SignupPage';
import { Routes, Route } from 'react-router-dom';

const mockSignup = vi.fn();
vi.mock('../../services/api', async () => {
  const actual: any = await vi.importActual('../../services/api');
  return {
    ...actual,
    useSignupMutation: () => [mockSignup, { isLoading: false }],
  };
});

describe('SignupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates password requirements checklist in real-time', () => {
    renderWithProviders(<SignupPage />);

    const passwordInput = screen.getByLabelText('Password');

    // Initially requirements are unfulfilled ('○')
    expect(screen.queryAllByText('○').length).toBe(5);

    // Type a simple lowercase string
    fireEvent.change(passwordInput, { target: { value: 'abc' } });
    
    // "One lowercase letter (a-z)" should be checked '✓'
    expect(screen.getByText('One lowercase letter (a-z)')).toBeInTheDocument();

    // Type complex password
    fireEvent.change(passwordInput, { target: { value: 'A1!abcde' } });
    // All 5 should be ticked/checked '✓'
    expect(screen.queryAllByText('✓').length).toBe(5);
  });

  it('submits form successfully and redirects', async () => {
    const mockUserData = {
      id: '2',
      name: 'Aryan Kumar',
      email: 'aryan@company.com',
      role: 'candidate',
      status: 'active',
    };

    mockSignup.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true, data: mockUserData }),
    });

    const { store } = renderWithProviders(
      <Routes>
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard View</div>} />
      </Routes>,
      { initialEntries: ['/signup'] }
    );

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Aryan Kumar' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'aryan@company.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'A1!abcde' } });

    const submitBtn = screen.getByRole('button', { name: /Create Account/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockSignup).toHaveBeenCalledWith({
      name: 'Aryan Kumar',
      email: 'aryan@company.com',
      password: 'A1!abcde',
      role: 'candidate',
    });

    await waitFor(() => {
      expect(store.getState().auth.isAuthenticated).toBe(true);
      expect(store.getState().auth.user).toEqual(mockUserData);
      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    });
  });

  it('shows registration error alerts when API fails', async () => {
    mockSignup.mockReturnValue({
      unwrap: () => Promise.reject({
        data: { message: 'Email already in use.' }
      }),
    });

    renderWithProviders(<SignupPage />);

    fireEvent.change(screen.getByLabelText('Full Name'), { target: { value: 'Dup User' } });
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'dup@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'A1!abcde' } });

    const submitBtn = screen.getByRole('button', { name: /Create Account/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(await screen.findByText('Email already in use.')).toBeInTheDocument();
  });
});
