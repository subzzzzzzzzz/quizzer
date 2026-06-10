import React, { useState } from 'react';
import { Form, Input, Button, Table, Card, Typography, Space, Alert, message, Tag } from 'antd';
import { useAssignInstructorMutation, useGetInstructorsQuery } from '../../services/api';

const { Title, Text } = Typography;

export const AccessManagement: React.FC = () => {
  const [emailInput, setEmailInput] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const { data: instructorsResponse, isLoading, refetch } = useGetInstructorsQuery();
  const [assignInstructor, { isLoading: isAssigning }] = useAssignInstructorMutation();

  const instructors = instructorsResponse?.data || [];

  const handleAssign = async (values: { email: string }) => {
    setErrorMsg(null);
    try {
      const response = await assignInstructor({ email: values.email }).unwrap();
      if (response.success) {
        message.success(`${response.data.email} added as instructor successfully`);
        setEmailInput('');
        refetch();
      }
    } catch (err: any) {
      console.error('Assign instructor error:', err);
      // Custom message depending on error code (e.g. 404 "email not registered")
      const errMsg = err.data?.message || 'Failed to assign instructor. Please check the email.';
      setErrorMsg(errMsg);
      message.error(`Failed to add - ${errMsg}`);
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Email Address',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => <Tag color="warning">{role.toUpperCase()}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <span style={{ color: status === 'active' ? 'var(--color-success)' : 'var(--color-error)' }}>
          {status.toUpperCase()}
        </span>
      ),
    },
  ];

  return (
    <div>
      <RowAndHeader />

      <Card
        title="Assign Instructor Role"
        bordered={false}
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          marginBottom: '24px',
          maxWidth: '600px',
        }}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: '16px' }}>
          Enter a registered candidate's email address below to elevate their profile to the Instructor role.
        </Text>

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

        <Form layout="vertical" onFinish={handleAssign} requiredMark={false} fields={[{ name: 'email', value: emailInput }]}>
          <Form.Item
            name="email"
            label={<span style={{ fontWeight: 500, fontSize: '12px' }}>User Email Address</span>}
            rules={[
              { required: true, message: 'Please input the email address' },
              { type: 'email', message: 'Please enter a valid email address' },
            ]}
          >
            <Input
              placeholder="e.g. priya@company.com"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setErrorMsg(null);
              }}
              style={{ borderRadius: '6px' }}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            loading={isAssigning}
            style={{
              borderRadius: '6px',
              backgroundColor: 'var(--primary-2)',
              borderColor: 'var(--primary-2)',
              fontWeight: 600,
            }}
          >
            Assign Role
          </Button>
        </Form>
      </Card>

      <Card
        title="Current Instructors"
        bordered={false}
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
        }}
      >
        <Table
          dataSource={instructors}
          columns={columns}
          rowKey="_id"
          loading={isLoading}
          pagination={{ pageSize: 5 }}
          size="middle"
        />
      </Card>
    </div>
  );
};

const RowAndHeader = () => (
  <Space direction="vertical" style={{ marginBottom: '24px' }}>
    <Title level={2} style={{ color: 'var(--text-main)', margin: 0 }}>Access Management</Title>
    <Text type="secondary" style={{ color: 'var(--text-muted)' }}>Manage organizational permissions and assign system roles</Text>
  </Space>
);

export default AccessManagement;
