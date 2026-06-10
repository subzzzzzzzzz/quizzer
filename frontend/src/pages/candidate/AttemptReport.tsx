import React from 'react';
import { useGetAttemptReportQuery } from '../../services/api';
import type { Quiz } from '../../services/api';
import Card from '../../components/molecules/Card/Card';
import Spinner from '../../components/atoms/Spinner/Spinner';
import Alert from '../../components/atoms/Alert/Alert';
import Tag from '../../components/atoms/Tag/Tag';

interface DetailedAttemptReportProps {
  attemptId: string;
}

export const DetailedAttemptReport: React.FC<DetailedAttemptReportProps> = ({ attemptId }) => {
  const { data: reportResponse, isLoading, error } = useGetAttemptReportQuery(attemptId);
  const report = reportResponse?.data;

  if (isLoading) return <Spinner size="medium" style={{ display: 'block', margin: '40px auto' }} />;
  if (error || !report) return <Alert message="Error loading detailed report" type="error" />;

  const formatAnswers = (indices: number[], options: string[]) => {
    if (indices.length === 0) return <span style={{ color: 'var(--text-muted)' }}>No Answer Selected</span>;
    return indices.map(idx => options[idx]).join(', ');
  };

  return (
    <div>
      {/* Center High-Fidelity Score Hero Header */}
      <div style={{
        textAlign: 'center',
        padding: '28px 20px',
        borderRadius: '12px',
        background: 'linear-gradient(135deg, var(--primary-2) 0%, var(--primary-3) 100%)',
        color: '#fff',
        marginBottom: '20px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        fontFamily: 'var(--font-family)',
      }}>
        <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9, fontWeight: 600 }}>Assessment Score</div>
        <div style={{ fontSize: '40px', fontWeight: 800, margin: '6px 0' }}>
          {report.summary.percentage}%
        </div>
        <div style={{ fontSize: '14px', fontWeight: 600, opacity: 0.95 }}>
          {report.attempt.score} / {report.summary.totalQuestions} Points
        </div>
      </div>

      {/* Student metadata */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 4px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Candidate:</span>{' '}
          <strong style={{ color: 'var(--text-main)', fontSize: '13px' }}>{report.candidate.name}</strong>{' '}
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>({report.candidate.email})</span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Quiz:</span>{' '}
          <strong style={{ color: 'var(--text-main)', fontSize: '13px' }}>
            {typeof report.attempt.quizId === 'object' ? (report.attempt.quizId as Quiz).title : 'Assessment'}
          </strong>
        </div>
      </div>

      {/* Metrics Grid Slots */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <Card bordered bodyStyle={{ padding: '12px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Correct Answers</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-success)', marginTop: '4px' }}>
            {report.summary.correctCount}
          </div>
        </Card>
        <Card bordered bodyStyle={{ padding: '12px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Incorrect Answers</div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--danger-2)', marginTop: '4px' }}>
            {report.summary.incorrectCount}
          </div>
        </Card>
        <Card bordered bodyStyle={{ padding: '12px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>Time Spent</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary-2)', marginTop: '6px' }}>
            {Math.floor((report.attempt.timeTaken || 0) / 60)}m {(report.attempt.timeTaken || 0) % 60}s
          </div>
        </Card>
      </div>

      <h4 style={{ marginBottom: '16px', color: 'var(--text-main)', fontSize: '15px', fontWeight: 700 }}>Question by Question Review</h4>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {report.details.map((item, index) => (
          <Card
            key={index}
            bordered
            bodyStyle={{ padding: '12px 16px' }}
            style={{
              borderColor: item.isCorrect ? 'var(--color-success)' : 'var(--color-error)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '13px' }}>Question {index + 1}</span>
              <Tag color={item.isCorrect ? 'success' : 'error'}>
                {item.isCorrect ? 'Correct' : 'Incorrect'}
              </Tag>
            </div>
            
            <p style={{ fontWeight: 500, fontSize: '13px', marginBottom: '12px', color: 'var(--text-main)' }}>{item.question}</p>

            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px', borderLeft: '2px solid var(--border-color)' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Selected Answer: </span>
                <span style={{ fontWeight: 600, color: item.isCorrect ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {formatAnswers(item.candidateAnswers, item.options)}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Correct Answer: </span>
                <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                  {formatAnswers(item.correctAnswers, item.options)}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DetailedAttemptReport;
