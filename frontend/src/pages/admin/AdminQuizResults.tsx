import React, { useState } from 'react';
import { useGetQuizAnalyticsQuery, useGetAttemptReportQuery } from '../../services/api';
import Table from '../../components/organisms/Table/Table';
import type { ColumnType } from '../../components/organisms/Table/Table';
import Input from '../../components/atoms/Input/Input';
import Spinner from '../../components/atoms/Spinner/Spinner';
import Button from '../../components/atoms/Button/Button';
import Modal from '../../components/molecules/Modal/Modal';
import Alert from '../../components/atoms/Alert/Alert';
import Icon from '../../components/atoms/Icon/Icon';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

interface AdminQuizResultsProps {
  quizId: string;
  onClose?: () => void;
}

interface ParticipantDetail {
  userId: string;
  name: string;
  email: string;
  status: 'NotStarted' | 'InProgress' | 'Submitted' | 'AutoSubmitted';
  score: number;
  timeTaken: number | null;
  submittedAt: string | null;
  attemptId: string | null;
  seqId: string;
}

export const AdminQuizResults: React.FC<AdminQuizResultsProps> = ({ quizId, onClose }) => {
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === 'admin';

  const [searchText, setSearchText] = useState('');
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { data: analyticsResponse, isLoading, error } = useGetQuizAnalyticsQuery(quizId);
  const analytics = analyticsResponse?.data;

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px 0', backgroundColor: 'var(--bg-surface)', borderRadius: '12px' }}>
        <Spinner size="large" tip="Loading analytics..." />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', borderRadius: '12px', position: 'relative' }}>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="close"
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-surface-hover)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              zIndex: 10,
            }}
          >
            <Icon name="x-close" size={14} />
          </button>
        )}
        <Alert
          message="Error"
          description="Failed to load quiz results and analytics."
          type="error"
          showIcon
        />
      </div>
    );
  }

  const maxScore = analytics.quiz.maxScore || 1;
  const completedParticipants = (analytics.participants || []).filter(
    (p) => p.status === 'Submitted' || p.status === 'AutoSubmitted'
  );
  const totalCompleted = completedParticipants.length;

  // 5 Brackets logic matching CSS Advanced Selectors UI
  let b1 = 0; // >90%
  let b2 = 0; // 80-90%
  let b3 = 0; // 60-80%
  let b4 = 0; // 50-60%
  let b5 = 0; // <50%

  completedParticipants.forEach((p) => {
    const pct = (p.score / maxScore) * 100;
    if (pct > 90) b1++;
    else if (pct >= 80) b2++;
    else if (pct >= 60) b3++;
    else if (pct >= 50) b4++;
    else b5++;
  });

  const p1 = totalCompleted > 0 ? (b1 / totalCompleted) * 100 : 0;
  const p2 = totalCompleted > 0 ? (b2 / totalCompleted) * 100 : 0;
  const p3 = totalCompleted > 0 ? (b3 / totalCompleted) * 100 : 0;
  const p4 = totalCompleted > 0 ? (b4 / totalCompleted) * 100 : 0;
  const p5 = totalCompleted > 0 ? (b5 / totalCompleted) * 100 : 0;

  // Offsets for clockwise top start (circumference 100)
  const offset1 = 25;
  const offset2 = 25 - p1;
  const offset3 = 25 - p1 - p2;
  const offset4 = 25 - p1 - p2 - p3;
  const offset5 = 25 - p1 - p2 - p3 - p4;

  const getPctStr = (val: number) => {
    if (totalCompleted === 0) return '0%';
    const percentageVal = Math.round((val / totalCompleted) * 100);
    return `${percentageVal}%`;
  };

  // Sort participants by score descending so they form a leaderboard
  const sortedParticipants = [...(analytics.participants || [])].sort((a, b) => b.score - a.score);
  
  // Map sequence ID STU001, STU002...
  const participantsWithIds: ParticipantDetail[] = sortedParticipants.map((p, index) => ({
    ...p,
    seqId: `STU${String(index + 1).padStart(3, '0')}`
  }));

  const filteredParticipants = participantsWithIds.filter(
    (p) =>
      p.name.toLowerCase().includes(searchText.toLowerCase()) ||
      p.email.toLowerCase().includes(searchText.toLowerCase()) ||
      p.seqId.toLowerCase().includes(searchText.toLowerCase())
  );

  // Formatting completion date
  const formattedDate = analytics.quiz.endTime 
    ? new Date(analytics.quiz.endTime).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    : 'N/A';

  const baseColumns: ColumnType<ParticipantDetail>[] = [
    {
      title: 'STU. ID',
      dataIndex: 'seqId',
      key: 'seqId',
      render: (value) => <span style={{ color: '#64748b', fontWeight: 600, fontSize: '11px' }}>{String(value)}</span>,
    },
    {
      title: 'NAME',
      key: 'name',
      render: (_, record) => {
        const initials = record.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();
        const colorThemes = [
          { bg: '#e0f2fe', text: '#0369a1' },
          { bg: '#dcfce7', text: '#15803d' },
          { bg: '#fef3c7', text: '#b45309' },
          { bg: '#e0e7ff', text: '#4338ca' },
          { bg: '#ffe4e6', text: '#be123c' },
          { bg: '#f3e8ff', text: '#6d28d9' }
        ];
        const charCodeSum = record.name.split('').reduce((sum: number, char: string) => sum + char.charCodeAt(0), 0);
        const theme = colorThemes[charCodeSum % colorThemes.length];

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: theme.bg,
              color: theme.text,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '10px',
              fontWeight: 700,
            }}>
              {initials}
            </div>
            <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '12px' }}>{record.name}</span>
          </div>
        );
      }
    },
    {
      title: 'SCORE',
      key: 'score',
      render: (_, record) => {
        if (record.status !== 'Submitted' && record.status !== 'AutoSubmitted') {
          return <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>;
        }
        const pct = (record.score / maxScore) * 100;
        let bg = '#fee2e2';
        let color = '#991b1b';
        if (pct >= 90) { bg = '#e2f9eb'; color = '#1e7e34'; }
        else if (pct >= 60) { bg = '#fff3cd'; color = '#856404'; }

        return (
          <span style={{
            backgroundColor: bg,
            color: color,
            padding: '2px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            display: 'inline-block'
          }}>
            {record.score}/{maxScore}
          </span>
        );
      }
    },
    {
      title: '%',
      key: 'percentage',
      render: (_, record) => {
        if (record.status !== 'Submitted' && record.status !== 'AutoSubmitted') {
          return <span style={{ color: '#94a3b8', fontSize: '12px' }}>-</span>;
        }
        const pct = Math.round((record.score / maxScore) * 100);
        return <span style={{ color: '#475569', fontWeight: 600, fontSize: '12px' }}>{pct}%</span>;
      }
    }
  ];

  const columns = isAdmin ? baseColumns : [
    ...baseColumns,
    {
      title: 'ACTION',
      key: 'action',
      render: (_, record: ParticipantDetail) => (
        <Button
          size="small"
          disabled={!record.attemptId}
          onClick={() => {
            setSelectedAttemptId(record.attemptId);
            setIsDrawerOpen(true);
          }}
          style={{
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            color: 'var(--text-main)',
            backgroundColor: 'var(--bg-surface)'
          }}
        >
          View Details
        </Button>
      ),
    }
  ];

  const legendItems = [
    { label: '>90%', count: b1, color: '#10b981', percent: p1 },
    { label: '80-90%', count: b2, color: '#3b82f6', percent: p2 },
    { label: '60-80%', count: b3, color: '#f97316', percent: p3 },
    { label: '50-60%', count: b4, color: '#f87171', percent: p4 },
    { label: '<50%', count: b5, color: '#ef4444', percent: p5 },
  ];

  const formattedAvg = Number(analytics.metrics.avgScore).toFixed(1).replace('.0', '');

  return (
    <div style={{
      padding: '24px',
      position: 'relative',
      fontFamily: 'Inter, system-ui, sans-serif',
      backgroundColor: 'var(--bg-surface)',
      borderRadius: '12px'
    }}>
      {/* 1. Header with custom close button */}
      <div style={{
        margin: '-24px -24px 24px -24px',
        padding: '16px 24px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'var(--bg-surface)'
      }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 4px 0' }}>
            {analytics.quiz.title} — Results
          </h2>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 600 }}>
            <span>#Q{analytics.quiz.id.slice(-4).toUpperCase()}</span>
            <span>-</span>
            <span>Completed {formattedDate}</span>
            <span>-</span>
            <span>{analytics.metrics.assignedCount} participants</span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="close"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-surface-hover)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--neutral-2)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'; }}
          >
            <Icon name="x-close" size={14} />
          </button>
        )}
      </div>

      {/* 2. Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'TOTAL STUDENTS', value: `${analytics.metrics.assignedCount}`, color: 'var(--primary-2)' },
          { label: 'AVG SCORE', value: `${formattedAvg}/${analytics.quiz.maxScore}`, color: 'var(--secondary-2)' },
          { label: 'HIGHEST', value: `${analytics.metrics.highestScore}/${analytics.quiz.maxScore}`, color: 'var(--secondary-2)' },
          { label: 'LOWEST', value: `${analytics.metrics.lowestScore}/${analytics.quiz.maxScore}`, color: 'var(--danger-2)' },
        ].map((item, idx) => (
          <div key={idx} style={{
            backgroundColor: 'var(--neutral-1)',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <span style={{ fontSize: '20px', fontWeight: 800, color: item.color, lineHeight: 1.1 }}>{item.value}</span>
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>{item.label}</span>
          </div>
        ))}
      </div>

      {/* 3. Distribution & Students Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '32px' }}>
        {/* Left distribution panel */}
        <div style={{ borderRight: '1px solid var(--border-color)', paddingRight: '24px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 16px 0' }}>Score Distribution</h3>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
            <svg width="130" height="130" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--border-color)" strokeWidth="4" />
              {totalCompleted > 0 && (
                <>
                  {p1 > 0 && (
                    <circle
                      cx="21" cy="21" r="15.915" fill="transparent"
                      stroke="#10b981" strokeWidth="4"
                      strokeDasharray={`${p1} ${100 - p1}`}
                      strokeDashoffset={offset1}
                    />
                  )}
                  {p2 > 0 && (
                    <circle
                      cx="21" cy="21" r="15.915" fill="transparent"
                      stroke="#3b82f6" strokeWidth="4"
                      strokeDasharray={`${p2} ${100 - p2}`}
                      strokeDashoffset={offset2}
                    />
                  )}
                  {p3 > 0 && (
                    <circle
                      cx="21" cy="21" r="15.915" fill="transparent"
                      stroke="#f97316" strokeWidth="4"
                      strokeDasharray={`${p3} ${100 - p3}`}
                      strokeDashoffset={offset3}
                    />
                  )}
                  {p4 > 0 && (
                    <circle
                      cx="21" cy="21" r="15.915" fill="transparent"
                      stroke="#f87171" strokeWidth="4"
                      strokeDasharray={`${p4} ${100 - p4}`}
                      strokeDashoffset={offset4}
                    />
                  )}
                  {p5 > 0 && (
                    <circle
                      cx="21" cy="21" r="15.915" fill="transparent"
                      stroke="#ef4444" strokeWidth="4"
                      strokeDasharray={`${p5} ${100 - p5}`}
                      strokeDashoffset={offset5}
                    />
                  )}
                </>
              )}
              <g className="chart-text">
                <text x="50%" y="46%" dominantBaseline="middle" textAnchor="middle" fill="var(--text-main)" fontSize="7" fontWeight="bold">
                  {totalCompleted}
                </text>
                <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle" fill="var(--text-muted)" fontSize="3.5" fontWeight="500">
                  students
                </text>
              </g>
            </svg>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            {legendItems.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', fontSize: '11px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: item.color, marginRight: '8px', display: 'inline-block' }} />
                <span style={{ color: 'var(--text-muted)', flexGrow: 1, fontWeight: 500 }}>{item.label}</span>
                <span style={{ fontWeight: 600, color: 'var(--text-main)', width: '30px', textAlign: 'right' }}>{item.count}</span>
                <span style={{ color: 'var(--text-muted)', width: '40px', textAlign: 'right', fontWeight: 600 }}>{getPctStr(item.count)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right student table panel */}
        <div style={{ paddingLeft: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Students</h3>
            <Input
              placeholder="Search student name or ID..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '220px', fontSize: '12px' }}
              prefix={<Icon name="search" size={12} style={{ opacity: 0.5 }} />}
            />
          </div>

          <Table
            dataSource={filteredParticipants}
            columns={columns as ColumnType<unknown>[]}
            rowKey="userId"
            pagination={{ pageSize: 5 }}
            size="small"
          />
        </div>
      </div>

      {/* Nested Modal */}
      <Modal
        title="Student Detailed Attempt Report"
        width={720}
        open={isDrawerOpen}
        onCancel={() => {
          setIsDrawerOpen(false);
          setSelectedAttemptId(null);
        }}
        footer={null}
        destroyOnClose
      >
        {selectedAttemptId && <DetailedAttemptDrawer attemptId={selectedAttemptId} />}
      </Modal>
    </div>
  );
};

// DetailedAttemptDrawer component loading a single attempt's Q-by-Q details
const DetailedAttemptDrawer: React.FC<{ attemptId: string }> = ({ attemptId }) => {
  const { data: reportResponse, isLoading, error } = useGetAttemptReportQuery(attemptId);
  const report = reportResponse?.data;

  if (isLoading) return <Spinner size="medium" tip="Loading report details..." style={{ display: 'block', margin: '40px auto' }} />;
  if (error || !report) return <Alert message="Error loading detailed report" type="error" />;

  const formatAnswers = (indices: number[], options: string[]) => {
    if (indices.length === 0) return <span style={{ color: 'var(--text-muted)' }}>No Answer Selected</span>;
    return indices.map(idx => options[idx]).join(', ');
  };

  return (
    <div>
      {/* Student metadata */}
      <div style={{
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: 'var(--bg-base)',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Candidate</div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-main)', marginTop: '4px' }}>{report.candidate.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{report.candidate.email}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>Final Grade</div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary-2)', marginTop: '4px' }}>
              {report.attempt.score} / {report.summary.totalQuestions} ({report.summary.percentage}%)
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Spent {Math.floor((report.attempt.timeTaken || 0) / 60)}m {(report.attempt.timeTaken || 0) % 60}s
            </div>
          </div>
        </div>
      </div>

      <h4 style={{ marginBottom: '16px', fontSize: '15px', fontWeight: 700 }}>Question by Question Review</h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {report.details.map((item, index) => (
          <div
            key={index}
            style={{
              border: `1px solid ${item.isCorrect ? 'var(--secondary-1)' : 'var(--danger-1)'}`,
              backgroundColor: item.isCorrect ? 'var(--secondary-0)' : 'var(--danger-0)',
              borderRadius: '8px',
              padding: '12px 16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-main)' }}>Question {index + 1}</span>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: item.isCorrect ? 'var(--secondary-3)' : 'var(--danger-3)',
                backgroundColor: item.isCorrect ? 'var(--secondary-0)' : 'var(--danger-0)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: `1px solid ${item.isCorrect ? 'var(--secondary-1)' : 'var(--danger-1)'}`
              }}>
                {item.isCorrect ? 'Correct' : 'Incorrect'}
              </span>
            </div>
            
            <p style={{ fontWeight: 600, fontSize: '13px', marginBottom: '12px', color: 'var(--text-main)' }}>{item.question}</p>

            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px', borderLeft: `2px solid ${item.isCorrect ? 'var(--secondary-1)' : 'var(--danger-1)'}` }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Selected Answer: </span>
                <span style={{ fontWeight: 700, color: item.isCorrect ? 'var(--secondary-3)' : 'var(--danger-3)' }}>
                  {formatAnswers(item.candidateAnswers, item.options)}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Correct Answer: </span>
                <span style={{ fontWeight: 700, color: 'var(--secondary-3)' }}>
                  {formatAnswers(item.correctAnswers, item.options)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminQuizResults;
