import React, { useState } from 'react';
import { useAssignInstructorMutation, useGetInstructorsQuery } from '../../services/api';
import type { User } from '../../store/slices/authSlice';
import Card from '../../components/molecules/Card/Card';
import Button from '../../components/atoms/Button/Button';
import Input from '../../components/atoms/Input/Input';
import FormField from '../../components/molecules/FormField/FormField';
import Tag from '../../components/atoms/Tag/Tag';
import Alert from '../../components/atoms/Alert/Alert';
import Table from '../../components/organisms/Table/Table';
import type { ColumnType } from '../../components/organisms/Table/Table';
import message from '../../utils/message';

export const AccessManagement: React.FC = () => {
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const { data: instructorsResponse, isLoading, refetch } = useGetInstructorsQuery();
  const [assignInstructor, { isLoading: isAssigning }] = useAssignInstructorMutation();

  const instructors = instructorsResponse?.data || [];

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!emailInput.trim()) {
      setEmailError('Please enter an email address');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(emailInput)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setEmailError(undefined);

    try {
      const response = await assignInstructor({ email: emailInput }).unwrap();
      if (response.success) {
        message.success(`${response.data.email} added as instructor successfully`);
        setEmailInput('');
        refetch();
      }
    } catch (err: unknown) {
      console.error('Assign instructor error:', err);
      const errPayload = err as { data?: { message?: string } };
      const errMsg = errPayload.data?.message || 'Failed to assign instructor. Please check the email.';
      setErrorMsg(errMsg);
      message.error(`Failed to add - ${errMsg}`);
    }
  };

  const columns: ColumnType<User>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (value) => <span style={{ fontWeight: 600 }}>{String(value)}</span>,
    },
    {
      title: 'Email Address',
      dataIndex: 'email',
      key: 'email',
      render: (value) => <span>{String(value)}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (value) => <Tag color="warning">{String(value).toUpperCase()}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (value) => {
        const statusStr = String(value);
        return (
          <span style={{ color: statusStr === 'active' ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 600 }}>
            {statusStr.toUpperCase()}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text-main)', margin: 0, fontSize: '22px', fontWeight: 700 }}>Access Management</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Manage organizational permissions and assign system roles</p>
      </div>

      <Card
        title="Assign Instructor Role"
        bordered
        style={{
          marginBottom: '24px',
          maxWidth: '600px',
        }}
      >
        <div style={{ display: 'block', marginBottom: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
          Enter a registered candidate's email address below to elevate their profile to the Instructor role.
        </div>

        {errorMsg && (
          <Alert
            message={`Failed to add: ${errorMsg}`}
            type="error"
            showIcon
            closable
            onClose={() => setErrorMsg(null)}
            style={{ marginBottom: '16px', borderRadius: '6px' }}
          />
        )}

        <form onSubmit={handleAssign}>
          <FormField
            label="User Email Address"
            error={emailError}
            required
          >
            <Input
              placeholder="e.g. priya@company.com"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setErrorMsg(null);
                if (emailError) setEmailError(undefined);
              }}
            />
          </FormField>

          <Button
            type="submit"
            loading={isAssigning}
            style={{ fontWeight: 600 }}
          >
            Assign Role
          </Button>
        </form>
      </Card>

      <Card title="Current Instructors" bordered>
        <Table
          dataSource={instructors}
          columns={columns as ColumnType<unknown>[]}
          rowKey="_id"
          loading={isLoading}
          pagination={{ pageSize: 5 }}
          size="middle"
        />
      </Card>
    </div>
  );
};

export default AccessManagement;
