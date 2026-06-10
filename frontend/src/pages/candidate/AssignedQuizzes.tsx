import React, { useState } from 'react';
import { useGetQuizzesQuery, useStartAttemptMutation } from '../../services/api';
import { Table, Button, Card, Spin, Alert, message, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';

export const AssignedQuizzes: React.FC = () => {
  const { data: quizzesResponse, isLoading, error } = useGetQuizzesQuery();
  const [startAttempt] = useStartAttemptMutation();
  const [loadingQuizId, setLoadingQuizId] = useState<string | null>(null);
  const navigate = useNavigate();

  if (isLoading) {
    return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} data-testid="loading-spinner" />;
  }

  if (error) {
    return <Alert type="error" message="Failed to load upcoming quizzes" showIcon data-testid="error-alert" />;
  }

  const quizzes = quizzesResponse?.data || [];

  // Filter only Live or Scheduled quizzes that aren't completed by candidate
  const upcomingQuizzes = quizzes.filter(
    (q) =>
      (q.status === 'Live' || q.status === 'Scheduled') &&
      q.candidateAttempt?.status !== 'Submitted' &&
      q.candidateAttempt?.status !== 'AutoSubmitted'
  );

  const handleStart = async (record: any) => {
    if (record.candidateAttempt && record.candidateAttempt.status === 'InProgress') {
      navigate(`/quiz-attempt/${record.candidateAttempt.id}`);
      return;
    }
    setLoadingQuizId(record._id);
    try {
      const response = await startAttempt({ quizId: record._id }).unwrap();
      if (response.success && response.data) {
        navigate(`/quiz-attempt/${response.data._id}`);
      }
    } catch (err: any) {
      console.error('Start attempt error:', err);
      message.error(err.data?.message || 'Failed to start attempt');
    } finally {
      setLoadingQuizId(null);
    }
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: any) => (
        <div>
          <span style={{ fontWeight: 600 }}>{text}</span>
          {record.candidateAttempt?.status === 'InProgress' && (
            <Tag color="processing" style={{ marginLeft: '8px', fontWeight: 600 }}>IN PROGRESS</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Duration (mins)',
      dataIndex: 'duration',
      key: 'duration',
    },
    {
      title: 'Action',
      key: 'action',
      render: (record: any) => {
        const isInProgress = record.candidateAttempt?.status === 'InProgress';
        const isLive = record.status === 'Live';
        return (
          <Button
            type="primary"
            loading={loadingQuizId === record._id}
            disabled={!isLive && !isInProgress}
            onClick={() => handleStart(record)}
            style={{
              borderRadius: '6px',
              backgroundColor: isInProgress ? 'var(--primary-2)' : 'var(--secondary-2)',
              borderColor: isInProgress ? 'var(--primary-2)' : 'var(--secondary-2)',
              fontWeight: 600,
            }}
          >
            {isInProgress ? 'Resume' : 'Start Attempt'}
          </Button>
        );
      },
    },
  ];

  return (
    <Card title="Upcoming Assigned Quizzes" data-testid="assigned-quizzes-card">
      <Table dataSource={upcomingQuizzes} columns={columns} rowKey="_id" />
    </Card>
  );
};

export default AssignedQuizzes;
