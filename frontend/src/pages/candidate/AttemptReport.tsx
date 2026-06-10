import React from 'react';
import { useGetAttemptReportQuery } from '../../services/api';
import { Card, Row, Col, Typography, Spin, Alert, Tag } from 'antd';

const { Text, Title } = Typography;

interface DetailedAttemptReportProps {
  attemptId: string;
}

export const DetailedAttemptReport: React.FC<DetailedAttemptReportProps> = ({ attemptId }) => {
  const { data: reportResponse, isLoading, error } = useGetAttemptReportQuery(attemptId);
  const report = reportResponse?.data;

  if (isLoading) return <Spin size="medium" style={{ display: 'block', margin: '40px auto' }} />;
  if (error || !report) return <Alert message="Error loading detailed report" type="error" />;

  const formatAnswers = (indices: number[], options: string[]) => {
    if (indices.length === 0) return <span style={{ color: 'var(--text-muted)' }}>No Answer Selected</span>;
    return indices.map(idx => options[idx]).join(', ');
  };

  return (
    <div>
      {/* Student metadata */}
      <Card size="small" style={{ marginBottom: '24px', backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }}>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Text type="secondary">Candidate</Text>
            <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-main)' }}>{report.candidate.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{report.candidate.email}</div>
          </Col>
          <Col span={12} style={{ textAlign: 'right' }}>
            <Text type="secondary">Final Grade</Text>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--primary-2)' }}>
              {report.attempt.score} / {report.summary.totalQuestions} ({report.summary.percentage}%)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Spent {Math.floor((report.attempt.timeTaken || 0) / 60)}m {(report.attempt.timeTaken || 0) % 60}s
            </div>
          </Col>
        </Row>
      </Card>

      <Title level={4} style={{ marginBottom: '16px', color: 'var(--text-main)' }}>Question by Question Review</Title>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {report.details.map((item, index) => (
          <Card
            key={index}
            size="small"
            style={{
              borderColor: item.isCorrect ? 'var(--color-success)' : 'var(--color-error)',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>Question {index + 1}</span>
              <Tag color={item.isCorrect ? 'success' : 'error'}>
                {item.isCorrect ? 'Correct' : 'Incorrect'}
              </Tag>
            </div>
            
            <p style={{ fontWeight: 500, fontSize: '13px', marginBottom: '12px', color: 'var(--text-main)' }}>{item.question}</p>

            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', paddingLeft: '8px', borderLeft: '2px solid rgba(0,0,0,0.1)' }}>
              <div>
                <Text type="secondary">Selected Answer: </Text>
                <span style={{ fontWeight: 600, color: item.isCorrect ? 'var(--color-success)' : 'var(--color-error)' }}>
                  {formatAnswers(item.candidateAnswers, item.options)}
                </span>
              </div>
              <div>
                <Text type="secondary">Correct Answer: </Text>
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
