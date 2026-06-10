import React, { useState } from 'react';
import { useGetQuizzesQuery, useGetQuizAnalyticsQuery } from '../../services/api';
import type { Quiz } from '../../services/api';
import Card from '../../components/molecules/Card/Card';
import Button from '../../components/atoms/Button/Button';
import Table from '../../components/organisms/Table/Table';
import type { ColumnType } from '../../components/organisms/Table/Table';
import Spinner from '../../components/atoms/Spinner/Spinner';
import Alert from '../../components/atoms/Alert/Alert';
import Modal from '../../components/molecules/Modal/Modal';
import Input from '../../components/atoms/Input/Input';
import Icon from '../../components/atoms/Icon/Icon';
import AdminQuizResults from '../admin/AdminQuizResults';

const AvgScoreCell: React.FC<{ quizId: string }> = ({ quizId }) => {
  const { data: analyticsResponse } = useGetQuizAnalyticsQuery(quizId);
  const analytics = analyticsResponse?.data;
  if (!analytics) return <span style={{ color: '#94a3b8' }}>-</span>;

  const avgScore = analytics.metrics.avgScore;
  const maxScore = analytics.quiz.maxScore || 1;
  const pct = (avgScore / maxScore) * 100;

  let bg = '#fee2e2';
  let color = '#991b1b';
  if (pct >= 70) {
    bg = '#e2f9eb';
    color = '#1e7e34';
  } else if (pct >= 50) {
    bg = '#fef3c7';
    color = '#78350f';
  }

  // Format avgScore: e.g. 7.8/10
  const formattedAvg = avgScore.toFixed(1).replace('.0', '');

  return (
    <span
      style={{
        backgroundColor: bg,
        color: color,
        padding: '2px 8px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 700,
        display: 'inline-block',
      }}
    >
      {formattedAvg}/{maxScore}
    </span>
  );
};

const formatCompletedDate = (dateString?: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';

  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const hoursStr = String(hours).padStart(2, '0');

  return `${day} ${month} ${year} - ${hoursStr}:${minutes} ${ampm}`;
};

export const AnalyticsDashboard: React.FC = () => {
  const { data: quizzesResponse, isLoading, error } = useGetQuizzesQuery();
  const quizzes = quizzesResponse?.data || [];

  const completedQuizzes = quizzes.filter(q => q.status === 'Completed');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const filteredQuizzes = completedQuizzes.filter(q => {
    const code = q._id.slice(-4).toLowerCase();
    const matchesSearch =
      q.title.toLowerCase().includes(searchText.toLowerCase()) ||
      `#q${code}`.includes(searchText.toLowerCase()) ||
      code.includes(searchText.toLowerCase());
    return matchesSearch;
  });

  const columns: ColumnType<Quiz>[] = [
    {
      title: 'ID',
      key: 'quizIdCode',
      render: (_, record) => {
        const lastFour = record._id.slice(-4).toUpperCase();
        return <span style={{ color: '#64748b', fontWeight: 600, fontSize: '11px' }}>#Q{lastFour}</span>;
      },
    },
    {
      title: 'QUIZ TITLE',
      dataIndex: 'title',
      key: 'title',
      render: (value) => <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{String(value)}</span>,
    },
    {
      title: 'COMPLETED DATE',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (value) => (
        <span style={{ color: '#475569', fontSize: '12px' }}>
          {formatCompletedDate(value ? String(value) : undefined)}
        </span>
      ),
    },
    {
      title: 'PARTICIPANTS',
      dataIndex: 'participantCount',
      key: 'participantCount',
      render: (value) => <span style={{ color: '#475569', fontSize: '12px', fontWeight: 500 }}>{Number(value || 0)}</span>,
    },
    {
      title: 'AVG SCORE',
      key: 'avgScore',
      render: (_, record) => <AvgScoreCell quizId={record._id} />,
    },
    {
      title: 'RESULTS',
      key: 'results',
      render: (_, record) => (
        <Button
          variant="primary"
          size="small"
          onClick={() => {
            setSelectedQuizId(record._id);
            setIsAnalyticsModalOpen(true);
          }}
          style={{
            fontSize: '11px',
            fontWeight: 600,
            borderRadius: '6px',
            backgroundColor: '#1e3a8a', // Deep blue color matching mockup
            borderColor: '#1e3a8a',
            padding: '4px 12px',
          }}
        >
          View Result
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px' }}>
        <Spinner size="large" tip="Loading analytics..." />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message="Failed to load completed quiz analytics." style={{ margin: '24px' }} />;
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text-heading)', margin: 0, fontSize: '22px', fontWeight: 700 }}>Analytics</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
          Results from all completed quizzes assigned to you
        </p>
      </div>

      <Card
        title={<span style={{ fontWeight: 700, fontSize: '15px' }}>Completed Quizzes</span>}
        extra={
          <Input
            placeholder="Search quizzes..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '220px', fontSize: '12px' }}
            prefix={<Icon name="search" size={12} style={{ opacity: 0.5 }} />}
          />
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

      {/* Quiz Analytics Modal Popup */}
      {selectedQuizId && (
        <Modal
          open={isAnalyticsModalOpen}
          onCancel={() => {
            setIsAnalyticsModalOpen(false);
            setSelectedQuizId(null);
          }}
          footer={null}
          width={960}
          style={{ top: 20 }}
          destroyOnClose
          showHeader={false}
          bodyStyle={{ padding: 0 }}
        >
          <AdminQuizResults
            quizId={selectedQuizId}
            onClose={() => {
              setIsAnalyticsModalOpen(false);
              setSelectedQuizId(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
};

export default AnalyticsDashboard;

