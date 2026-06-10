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
import Icon from '../../components/atoms/Icon/Icon';

export const AccessManagement: React.FC = () => {
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const { data: instructorsResponse, isLoading, refetch } = useGetInstructorsQuery();
  const [assignInstructor, { isLoading: isAssigning }] = useAssignInstructorMutation();

  const instructors = instructorsResponse?.data || [];

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

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
        setSuccessMsg(`${response.data.email} added as Instructor`);
        message.success(`${response.data.email} added as Instructor`);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ color: 'var(--text-heading)', margin: 0, fontSize: '22px', fontWeight: 700 }}>Access Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Manage user roles across the platform</p>
        </div>
        {successMsg && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'var(--secondary-0)',
            border: '1px solid var(--secondary-1)',
            borderRadius: '24px',
            padding: '8px 16px',
            fontSize: '13px',
            color: 'var(--secondary-3)',
            fontWeight: 500,
          }}>
            <Icon name="check-circle" size={16} color="var(--secondary-2)" />
            <span>{successMsg}</span>
            <Icon
              name="x-close"
              size={12}
              style={{ cursor: 'pointer', marginLeft: '12px', opacity: 0.7 }}
              onClick={() => setSuccessMsg(null)}
            />
          </div>
        )}
      </div>

      <Card
        title="Assign Instructor Role"
        bordered
        style={{
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'block', marginBottom: '16px', color: 'var(--text-muted)', fontSize: '13px' }}>
          Enter a registered user's email to grant them Instructor access
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
            label="Email Address"
            error={emailError}
            required
          >
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ flexGrow: 1 }}>
                <Input
                  placeholder="priya@company.com"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setErrorMsg(null);
                    setSuccessMsg(null);
                    if (emailError) setEmailError(undefined);
                  }}
                  prefix={<Icon name="mail" size={14} style={{ opacity: 0.5 }} />}
                />
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  User must already be registered on the platform
                </div>
              </div>
              <Button
                type="submit"
                loading={isAssigning}
                style={{ fontWeight: 600, height: '40px' }}
              >
                Assign as Instructor
              </Button>
            </div>
          </FormField>
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
