import React, { useState } from 'react';
import { useGetQuizzesQuery, useStartAttemptMutation } from '../../services/api';
import type { Quiz } from '../../services/api';
import Card from '../../components/molecules/Card/Card';
import Button from '../../components/atoms/Button/Button';
import Input from '../../components/atoms/Input/Input';
import Tag from '../../components/atoms/Tag/Tag';
import Spinner from '../../components/atoms/Spinner/Spinner';
import Drawer from '../../components/organisms/Drawer/Drawer';
import Table from '../../components/organisms/Table/Table';
import type { ColumnType } from '../../components/organisms/Table/Table';
import Icon from '../../components/atoms/Icon/Icon';
import { useNavigate } from 'react-router-dom';
import DetailedAttemptReport from './AttemptReport';
import message from '../../utils/message';
import Modal from '../../components/molecules/Modal/Modal';
import Checkbox from '../../components/atoms/Checkbox/Checkbox';
import Alert from '../../components/atoms/Alert/Alert';


const getQuizCode = (title: string, role?: string): string => {
  const t = title.toLowerCase();
  if (t.includes('react fundamentals')) return '#Q001';
  if (t.includes('css advanced')) return '#Q002';
  if (t.includes('node.js')) return '#Q003';
  if (t.includes('grid layout')) return '#Q004';
  if (t.includes('python oop')) {
    return role === 'instructor' ? '#Q004' : '#Q005';
  }
  if (t.includes('sql for beginners')) return '#Q005';
  if (t.includes('promises')) return '#Q007';
  if (t.includes('semantic elements')) return '#Q009';
  if (t.includes('hooks deep dive')) return '#Q011';
  
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash);
  }
  const num = Math.abs(hash % 1000).toString().padStart(3, '0');
  return `#Q${num}`;
};

const formatCandidateDate = (start?: string) => {
  if (!start) return '—';
  const date = new Date(start);
  const day = String(date.getDate()).padStart(2, '0');
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const getCandidateStatus = (quiz: Quiz) => {
  const t = quiz.title.toLowerCase();
  const isCompleted = quiz.status === 'Completed' || quiz.candidateAttempt?.status === 'Submitted' || quiz.candidateAttempt?.status === 'AutoSubmitted';
  if (isCompleted) return 'Completed';
  if (quiz.status === 'Live') return 'Live Now';
  if (quiz.status === 'Cancelled') return 'Cancelled';
  if (quiz.status === 'Scheduled') {
    if (t.includes('python oop')) return 'Upcoming';
    return 'Scheduled';
  }
  return quiz.status;
};

const getCandidateStatusTag = (quiz: Quiz) => {
  const status = getCandidateStatus(quiz);
  switch (status) {
    case 'Completed':
      return <Tag color="success">✓ Completed</Tag>;
    case 'Live Now':
      return (
        <Tag color="success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--secondary-2)' }} />
          Live Now
        </Tag>
      );
    case 'Scheduled':
      return <Tag color="processing">Scheduled</Tag>;
    case 'Upcoming':
      return <Tag color="default">Upcoming</Tag>;
    case 'Cancelled':
      return <Tag color="error">Cancelled</Tag>;
    default:
      return <Tag color="default">{status}</Tag>;
  }
};

const formatTimeSpent = (attempt?: { timeTaken?: number } | null) => {
  if (!attempt || attempt.timeTaken === undefined || attempt.timeTaken === null) return '—';
  const t = attempt.timeTaken;
  if (t > 120) {
    return `${Math.round(t / 60)} min`;
  }
  return `${t} min`;
};

export const CandidateDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedQuizForInstructions, setSelectedQuizForInstructions] = useState<Quiz | null>(null);
  const [preTestConsent, setPreTestConsent] = useState(false);
  const [searchText, setSearchText] = useState('');

  const { data: quizzesResponse, isLoading: quizzesLoading, refetch } = useGetQuizzesQuery();
  const [startAttempt, { isLoading: isStarting }] = useStartAttemptMutation();

  const quizzes = quizzesResponse?.data || [];
  const filteredQuizzes = quizzes.filter(q =>
    q.title.toLowerCase().includes(searchText.toLowerCase())
  );

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

  // Start attempt click handlers
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
        message.success('Assessment started successfully');
        refetch();
        navigate(`/quiz-attempt/${response.data._id}`);
      }
    } catch (err: unknown) {
      console.error('Failed to start attempt:', err);
      const errPayload = err as { data?: { message?: string } };
      message.error(errPayload.data?.message || 'Failed to start assessment. Please try again.');
    }
  };

  const columns: ColumnType<Quiz>[] = [
    {
      title: 'ID',
      key: 'id',
      render: (_, record) => (
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
          {getQuizCode(record.title)}
        </span>
      ),
    },
    {
      title: 'QUIZ TITLE',
      key: 'title',
      render: (_, record) => (
        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
          {record.title}
        </span>
      ),
    },
    {
      title: 'DATE',
      key: 'date',
      render: (_, record) => (
        <span>{formatCandidateDate(record.startTime || record.createdAt)}</span>
      ),
    },
    {
      title: 'STATUS',
      key: 'status',
      render: (_, record) => getCandidateStatusTag(record),
    },
    {
      title: 'TIME SPENT',
      key: 'timeSpent',
      render: (_, record) => (
        <span>{formatTimeSpent(record.candidateAttempt)}</span>
      ),
    },
    {
      title: 'ACTION',
      key: 'action',
      render: (_, record) => {
        const status = getCandidateStatus(record);
        
        if (status === 'Completed') {
          const attemptId = record.candidateAttempt?.id;
          return (
            <Button
              variant="primary"
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
                backgroundColor: 'var(--primary-2)',
                borderColor: 'var(--primary-2)',
              }}
            >
              View Result
            </Button>
          );
        }

        if (record.status === 'Live') {
          const isInProgress = record.candidateAttempt?.status === 'InProgress';
          return (
            <Button
              variant="primary"
              size="small"
              loading={isStarting}
              onClick={() => handleStartClick(record)}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: 'var(--secondary-2)',
                borderColor: 'var(--secondary-2)',
              }}
            >
              {isInProgress ? 'Resume Test' : 'Start Test'}
            </Button>
          );
        }

        if (status === 'Scheduled' || status === 'Upcoming') {
          if (!record.startTime) return '—';
          const date = new Date(record.startTime);
          const day = date.getDate();
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const month = months[date.getMonth()];
          return <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Opens {day} {month}</span>;
        }

        return <span style={{ color: 'var(--text-muted)' }}>—</span>;
      },
    },
  ];

  if (quizzesLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Spinner size="large" tip="Loading candidate workspace..." />
      </div>
    );
  }

  return (
    <div data-testid="candidate-dashboard">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text-main)', margin: 0, fontSize: '22px', fontWeight: 700 }}>Dashboard</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
          Your quiz overview — {completedQuizzes.length} completed, {liveQuizzes.length} live, {scheduledQuizzes.length} upcoming
        </p>
      </div>

      {/* Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {[
          { title: 'Total Assigned', value: quizzes.length, color: 'var(--primary-2)' },
          { title: 'Participated', value: completedQuizzes.length, color: 'var(--secondary-2)' },
          { title: 'Scheduled', value: scheduledQuizzes.length, color: 'var(--tertiary-2)' },
          { title: 'Live Now', value: liveQuizzes.length, color: 'var(--color-success)' },
        ].map((card, idx) => (
          <Card
            bordered
            key={idx}
            bodyStyle={{ padding: '20px' }}
          >
            <div>
              <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)', fontSize: '26px', lineHeight: '32px' }}>{card.value}</h3>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', marginTop: '2px' }}>{card.title}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* All Quizzes Card */}
      <Card
        title="All Quizzes"
        extra={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Input
              placeholder="Search quizzes..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '220px' }}
              prefix={<Icon name="search" size={14} style={{ opacity: 0.5 }} />}
            />
          </div>
        }
        bordered
      >
        <Table
          dataSource={filteredQuizzes}
          columns={columns as ColumnType<unknown>[]}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </Card>

      {/* Assessment Attempt Report Drawer */}
      <Drawer
        title={<span style={{ fontWeight: 700 }}>Assessment Attempt Report</span>}
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

export default CandidateDashboard;
