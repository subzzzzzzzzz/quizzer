import React from 'react';
import { screen, fireEvent, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../../test/utils';
import AccessManagement from './AccessManagement';

const mockAssignInstructor = vi.fn();
const mockRefetch = vi.fn();

vi.mock('../../services/api', async () => {
  const actual: any = await vi.importActual('../../services/api');
  return {
    ...actual,
    useGetInstructorsQuery: () => ({
      data: {
        success: true,
        data: [
          { _id: 'inst-1', name: 'John Prof', email: 'john@uni.edu', role: 'instructor', status: 'active' },
          { _id: 'inst-2', name: 'Jane Prof', email: 'jane@uni.edu', role: 'instructor', status: 'active' },
        ],
      },
      isLoading: false,
      refetch: mockRefetch,
    }),
    useAssignInstructorMutation: () => [mockAssignInstructor, { isLoading: false }],
  };
});

describe('AccessManagement Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title, form and current instructor table rows', () => {
    renderWithProviders(<AccessManagement />);

    expect(screen.getByText('Access Management')).toBeInTheDocument();
    expect(screen.getByText('John Prof')).toBeInTheDocument();
    expect(screen.getByText('jane@uni.edu')).toBeInTheDocument();
  });

  it('successfully promotes a user and triggers refetch', async () => {
    mockAssignInstructor.mockReturnValue({
      unwrap: () => Promise.resolve({ success: true, data: { email: 'newinst@test.com' } }),
    });

    renderWithProviders(<AccessManagement />);

    const emailInput = screen.getByPlaceholderText('e.g. priya@company.com');
    fireEvent.change(emailInput, { target: { value: 'newinst@test.com' } });

    const submitBtn = screen.getByRole('button', { name: /Assign Role/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(mockAssignInstructor).toHaveBeenCalledWith({ email: 'newinst@test.com' });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('handles errors during assignment and shows alert message', async () => {
    mockAssignInstructor.mockReturnValue({
      unwrap: () => Promise.reject({ data: { message: 'User not found' } }),
    });

    renderWithProviders(<AccessManagement />);

    const emailInput = screen.getByPlaceholderText('e.g. priya@company.com');
    fireEvent.change(emailInput, { target: { value: 'unknown@test.com' } });

    const submitBtn = screen.getByRole('button', { name: /Assign Role/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });

    expect(await screen.findByText('Failed to add: User not found')).toBeInTheDocument();
  });
});
