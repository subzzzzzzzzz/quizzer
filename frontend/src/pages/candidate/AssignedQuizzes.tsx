import React, { useState, useEffect } from 'react';
import { useGetQuizzesQuery, useStartAttemptMutation } from '../../services/api';
import type { Quiz } from '../../services/api';
import Card from '../../components/molecules/Card/Card';
import Button from '../../components/atoms/Button/Button';
import Tag from '../../components/atoms/Tag/Tag';
import Spinner from '../../components/atoms/Spinner/Spinner';
import Alert from '../../components/atoms/Alert/Alert';
import Table from '../../components/organisms/Table/Table';
import type { ColumnType } from '../../components/organisms/Table/Table';
import { useNavigate } from 'react-router-dom';
import message from '../../utils/message';
import Icon from '../../components/atoms/Icon/Icon';
import Modal from '../../components/molecules/Modal/Modal';
import Checkbox from '../../components/atoms/Checkbox/Checkbox';

const CountdownTimer: React.FC<{ targetTime: string; label: string; onExpire?: () => void }> = ({ targetTime, label, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState(() => {
    const difference = +new Date(targetTime) - +new Date();
    if (difference <= 0) return '00:00:00';
    
    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference / 1000 / 60) % 60);
    const seconds = Math.floor((difference / 1000) % 60);
    
    return [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0'),
    ].join(':');
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +new Date(targetTime) - +new Date();
      if (difference <= 0) return '00:00:00';
      
      const hours = Math.floor(difference / (1000 * 60 * 60));
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      
      return [
        hours.toString().padStart(2, '0'),
        minutes.toString().padStart(2, '0'),
        seconds.toString().padStart(2, '0'),
      ].join(':');
    };

    const interval = setInterval(() => {
      const updated = calculateTimeLeft();
      setTimeLeft(updated);
      if (updated === '00:00:00' && onExpire) {
        onExpire();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTime, onExpire]);

  return <span>{label}: {timeLeft}</span>;
};

export const AssignedQuizzes: React.FC = () => {
  const { data: quizzesResponse, isLoading, error } = useGetQuizzesQuery();
  const [startAttempt, { isLoading: isStarting }] = useStartAttemptMutation();
  const navigate = useNavigate();

  const [selectedQuizForInstructions, setSelectedQuizForInstructions] = useState<Quiz | null>(null);
  const [preTestConsent, setPreTestConsent] = useState(false);

  if (isLoading) {
    return <Spinner size="large" style={{ display: 'block', margin: '100px auto' }} data-testid="loading-spinner" />;
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

  const handleStartClick = (quiz: Quiz) => {
    if (quiz.candidateAttempt?.status === 'InProgress') {
      navigate(`/quiz-attempt/${quiz.candidateAttempt.id}`);
    } else {
      setSelectedQuizForInstructions(quiz);
      setPreTestConsent(false);
    }
  };

  const handleStartConfirm = async () => {
    if (!selectedQuizForInstructions) return;
    const quizId = selectedQuizForInstructions._id;
    setSelectedQuizForInstructions(null);
    try {
      const response = await startAttempt({ quizId }).unwrap();
      if (response.success && response.data) {
        navigate(`/quiz-attempt/${response.data._id}`);
      }
    } catch (err: unknown) {
      console.error('Start attempt error:', err);
      const errPayload = err as { data?: { message?: string } };
      message.error(errPayload.data?.message || 'Failed to start attempt');
    }
  };

  const columns: ColumnType<Quiz>[] = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (value, record) => (
        <div>
          <span style={{ fontWeight: 600 }}>{String(value)}</span>
          {record.candidateAttempt?.status === 'InProgress' && (
            <Tag color="processing" style={{ marginLeft: '8px' }}>IN PROGRESS</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Duration (mins)',
      dataIndex: 'duration',
      key: 'duration',
      render: (value) => <span>{String(value)}</span>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => {
        const isInProgress = record.candidateAttempt?.status === 'InProgress';
        const isLive = record.status === 'Live';
        return (
          <Button
            variant="primary"
            loading={isStarting && selectedQuizForInstructions?._id === record._id}
            disabled={!isLive && !isInProgress}
            onClick={() => handleStartClick(record)}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Cards Grid for active and upcoming quizzes */}
      {upcomingQuizzes.length > 0 && (
        <div>
          <h3 style={{ color: 'var(--text-main)', fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
            Active & Upcoming Assessments
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
            {upcomingQuizzes.map((quiz) => {
              const isLive = quiz.status === 'Live';
              const isInProgress = quiz.candidateAttempt?.status === 'InProgress';
              const timerTarget = isLive ? quiz.endTime : quiz.startTime;
              const timerLabel = isLive ? 'Ends in' : 'Starts in';

              return (
                <Card
                  key={quiz._id}
                  bordered
                  bodyStyle={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}
                  style={{ display: 'flex', flexDirection: 'column' }}
                >
                  <div style={{ flexGrow: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '15px', lineHeight: '20px' }}>{quiz.title}</span>
                      <Tag color={isLive ? 'success' : 'processing'}>
                        {isLive ? 'LIVE' : 'SCHEDULED'}
                      </Tag>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 16px 0', lineHeight: '18px' }}>
                      {quiz.description || 'No description provided.'}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name="timer" size={14} />
                        <span>Duration: {quiz.duration} mins</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name="nav-quiz" size={14} />
                        <span>Questions: {quiz.questionCount || 0}</span>
                      </div>
                      {timerTarget && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isLive ? 'var(--color-success)' : 'var(--primary-2)', fontWeight: 600 }}>
                          <Icon name="stopwatch" size={14} />
                          <CountdownTimer targetTime={timerTarget} label={timerLabel} onExpire={() => {}} />
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    disabled={!isLive}
                    onClick={() => handleStartClick(quiz)}
                    style={{
                      width: '100%',
                      fontWeight: 600,
                      backgroundColor: !isLive ? 'var(--neutral-3)' : isInProgress ? 'var(--primary-2)' : 'var(--secondary-2)',
                      borderColor: !isLive ? 'var(--neutral-3)' : isInProgress ? 'var(--primary-2)' : 'var(--secondary-2)',
                    }}
                  >
                    {isInProgress ? 'Resume Attempt' : isLive ? 'Start Attempt' : 'Not Started Yet'}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Table List */}
      <Card title="Upcoming Assigned Quizzes" data-testid="assigned-quizzes-card" bordered>
        <Table dataSource={upcomingQuizzes} columns={columns as ColumnType<unknown>[]} rowKey="_id" />
      </Card>

      {/* Pre-test Instructions & Consent Modal */}
      {selectedQuizForInstructions && (
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Icon name="nav-quiz" size={20} />
              <span style={{ fontWeight: 700, fontSize: '16px' }}>
                Instructions & Consent: {selectedQuizForInstructions.title}
              </span>
            </div>
          }
          open={!!selectedQuizForInstructions}
          onCancel={() => setSelectedQuizForInstructions(null)}
          footer={[
            <Button
              key="cancel"
              variant="secondary"
              onClick={() => setSelectedQuizForInstructions(null)}
            >
              Cancel
            </Button>,
            <Button
              key="begin"
              variant="primary"
              disabled={!preTestConsent}
              loading={isStarting}
              onClick={handleStartConfirm}
              style={{
                backgroundColor: !preTestConsent ? 'var(--neutral-3)' : 'var(--secondary-2)',
                borderColor: !preTestConsent ? 'var(--neutral-3)' : 'var(--secondary-2)',
                fontWeight: 600
              }}
            >
              Begin Assessment
            </Button>
          ]}
          width={540}
          destroyOnClose
        >
          <div style={{ padding: '12px 0', color: 'var(--text-main)', lineHeight: '20px' }}>
            <Alert
              message="Attention Required"
              description="Please review the rules and confirm your environment settings before starting."
              type="warning"
              showIcon
              style={{ marginBottom: '16px', borderRadius: '6px' }}
            />
            
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>1. General Rules</h4>
            <ul style={{ paddingLeft: '20px', margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              <li><strong>Time Limit:</strong> {selectedQuizForInstructions.duration} minutes.</li>
              <li>Once started, the assessment cannot be paused or stopped.</li>
              <li>Navigating away from the window or losing focus is monitored.</li>
            </ul>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>2. Network Connection Warning</h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Make sure you have a highly stable internet connection. Network outages or disconnections might lock your attempt or result in loss of progress.
            </p>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>3. Auto-submit Policy</h4>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              When the time limit is reached, your current choices will be automatically submitted, and your session will close.
            </p>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <Checkbox
                checked={preTestConsent}
                onChange={(checked) => setPreTestConsent(checked)}
              >
                <span style={{ fontSize: '13px', fontWeight: 500, userSelect: 'none' }}>
                  I have read the rules, network warning, and auto-submit notice, and I consent to start this attempt.
                </span>
              </Checkbox>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AssignedQuizzes;
