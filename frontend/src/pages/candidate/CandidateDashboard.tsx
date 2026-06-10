import React, { useState } from 'react';
import { useGetQuizzesQuery, useStartAttemptMutation } from '../../services/api';
import { Table, Tag, Button, Card, Row, Col, Typography, Drawer, message, Spin } from 'antd';
import Icon from '../../components/ui/Icon/Icon';
import { useNavigate } from 'react-router-dom';
import DetailedAttemptReport from './AttemptReport';

const { Title, Text } = Typography;

export const CandidateDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: quizzesResponse, isLoading: quizzesLoading, refetch } = useGetQuizzesQuery();
  const [startAttempt, { isLoading: isStarting }] = useStartAttemptMutation();

  const quizzes = quizzesResponse?.data || [];

  // Categorize quizzes
  const liveQuizzes = quizzes.filter(
    (q) =>
      q.status === 'Live' &&
      q.candidateAttempt?.status !== 'Submitted' &&
      q.candidateAttempt?.status !== 'AutoSubmitted'
  );

  const scheduledQuizzes = quizzes.filter((q) => q.status === 'Scheduled');

  const completedQuizzes = quizzes.filter(
    (q) =>
      q.status === 'Completed' ||
      q.candidateAttempt?.status === 'Submitted' ||
      q.candidateAttempt?.status === 'AutoSubmitted'
  );

  // Start attempt click handler
  const handleStartAttempt = async (quizId: string, candidateAttempt?: any) => {
    if (candidateAttempt && candidateAttempt.status === 'InProgress') {
      navigate(`/quiz-attempt/${candidateAttempt.id}`);
      return;
    }

    try {
      const response = await startAttempt({ quizId }).unwrap();
      if (response.success && response.data) {
        message.success('Assessment started successfully');
        refetch();
        navigate(`/quiz-attempt/${response.data._id}`);
      }
    } catch (err: any) {
      console.error('Failed to start attempt:', err);
      message.error(err.data?.message || 'Failed to start assessment. Please try again.');
    }
  };

  const formatWindow = (end?: string) => {
    if (!end) return 'Always Available';
    const eDate = new Date(end);
    const opt: Intl.DateTimeFormatOptions = {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return eDate.toLocaleString('en-US', opt);
  };

  const columns = [
    {
      title: 'Assessment Name',
      key: 'title',
      render: (record: any) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{record.title}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {record.questionType === 'single' ? 'Single Choice (Select One)' : 'Multiple Choice (Select Multiple)'}
          </div>
        </div>
      ),
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (record: any) => <span>{record.duration} mins</span>,
    },
    {
      title: 'Status',
      key: 'status',
      render: (record: any) => {
        const isCompleted = record.status === 'Completed' || record.candidateAttempt?.status === 'Submitted' || record.candidateAttempt?.status === 'AutoSubmitted';
        if (isCompleted) {
          return <Tag color="warning" style={{ fontWeight: 600 }}>COMPLETED</Tag>;
        }
        if (record.status === 'Live') {
          if (record.candidateAttempt?.status === 'InProgress') {
            return <Tag color="processing" style={{ fontWeight: 600 }}>IN PROGRESS</Tag>;
          }
          return <Tag color="success" style={{ fontWeight: 600 }}>LIVE</Tag>;
        }
        if (record.status === 'Scheduled') {
          return <Tag color="blue" style={{ fontWeight: 600 }}>SCHEDULED</Tag>;
        }
        return <Tag color="default" style={{ fontWeight: 600 }}>{record.status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Closing Time',
      key: 'closing',
      render: (record: any) => <span>{formatWindow(record.endTime)}</span>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (record: any) => {
        const isCompleted = record.status === 'Completed' || record.candidateAttempt?.status === 'Submitted' || record.candidateAttempt?.status === 'AutoSubmitted';
        
        if (isCompleted) {
          const attemptId = record.candidateAttempt?.id;
          return (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                if (attemptId) {
                  setSelectedAttemptId(attemptId);
                  setIsDrawerOpen(true);
                } else {
                  message.info('You did not attempt this quiz. No grade report is available.');
                }
              }}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: 'var(--secondary-2)',
                borderColor: 'var(--secondary-2)',
              }}
            >
              View Results
            </Button>
          );
        }

        if (record.status === 'Live') {
          const isInProgress = record.candidateAttempt?.status === 'InProgress';
          return (
            <Button
              type="primary"
              size="small"
              loading={isStarting}
              onClick={() => handleStartAttempt(record._id, record.candidateAttempt)}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: isInProgress ? 'var(--primary-2)' : 'var(--secondary-2)',
                borderColor: isInProgress ? 'var(--primary-2)' : 'var(--secondary-2)',
              }}
            >
              {isInProgress ? 'Resume' : 'Start Assessment'}
            </Button>
          );
        }

        return (
          <Button size="small" disabled style={{ fontSize: '11px' }}>
            Not Available
          </Button>
        );
      },
    },
  ];

  if (quizzesLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Spin size="large" tip="Loading candidate workspace..." />
      </div>
    );
  }

  return (
    <div data-testid="candidate-dashboard">
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Title level={2} style={{ color: 'var(--text-main)', margin: 0 }}>Candidate Dashboard</Title>
          <Text type="secondary" style={{ color: 'var(--text-muted)' }}>Overview of your assigned assessments, schedule calendars, and grading scores</Text>
        </Col>
      </Row>

      {/* Metrics Cards Grid */}
      <Row gutter={[20, 20]} style={{ marginBottom: '24px' }}>
        {[
          { title: 'Total Assigned Quizzes', value: quizzes.length, icon: 'nav-dashboard', color: 'var(--primary-2)' },
          { title: 'Live Assessments', value: liveQuizzes.length, icon: 'nav-analytics', color: 'var(--color-success)' },
          { title: 'Upcoming Schedules', value: scheduledQuizzes.length, icon: 'timer', color: 'var(--color-primary)' },
          { title: 'Completed Quizzes', value: completedQuizzes.length, icon: 'check-circle', color: 'var(--tertiary-2)' },
        ].map((card, idx) => (
          <Col xs={24} sm={12} lg={6} key={idx}>
            <Card
              bordered={false}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
              }}
              styles={{ body: { padding: '20px' } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>{card.title}</Text>
                  <Title level={3} style={{ margin: '4px 0 0 0', fontWeight: 700, color: 'var(--text-main)' }}>{card.value}</Title>
                </div>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--neutral-0)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.color,
                }}>
                  <Icon name={card.icon as any} size={20} />
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* My Assessments Card */}
      <Card
        title="My Assessments"
        bordered={false}
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
        }}
      >
        <Table
          dataSource={quizzes}
          columns={columns}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="middle"
          style={{ backgroundColor: 'transparent' }}
        />
      </Card>

      {/* Assessment Attempt Report Drawer */}
      <Drawer
        title={<span style={{ fontWeight: 700 }}>Assessment Attempt Report</span>}
        placement="right"
        width={720}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedAttemptId(null);
        }}
        open={isDrawerOpen}
        destroyOnClose
      >
        {selectedAttemptId && <DetailedAttemptReport attemptId={selectedAttemptId} />}
      </Drawer>
    </div>
  );
};

export default CandidateDashboard;
