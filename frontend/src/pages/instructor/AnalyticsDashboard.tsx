import React, { useState } from 'react';
import { useGetQuizzesQuery } from '../../services/api';
import { Table, Button, Card, Typography, Spin, Alert, Modal } from 'antd';
import AdminQuizResults from '../admin/AdminQuizResults';

const { Title, Text } = Typography;

export const AnalyticsDashboard: React.FC = () => {
  const { data: quizzesResponse, isLoading, error } = useGetQuizzesQuery();
  const quizzes = quizzesResponse?.data || [];

  const completedQuizzes = quizzes.filter(q => q.status === 'Completed');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  const columns = [
    {
      title: 'Assessment Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: 'Question Type',
      dataIndex: 'questionType',
      key: 'questionType',
      render: (type: string) => (type === 'multi' ? 'Multi-Select MCQ' : 'Single MCQ'),
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      render: (min: number) => `${min} mins`,
    },
    {
      title: 'Date Completed',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (dateStr?: string) => (dateStr ? new Date(dateStr).toLocaleDateString([], { dateStyle: 'medium' }) : '-'),
    },
    {
      title: 'Enrolled Candidates',
      dataIndex: 'participantCount',
      key: 'participantCount',
      render: (count?: number) => `${count || 0} candidates`,
    },
    {
      title: 'Action',
      key: 'action',
      render: (record: any) => (
        <Button
          type="primary"
          size="small"
          onClick={() => {
            setSelectedQuizId(record._id);
            setIsAnalyticsModalOpen(true);
          }}
          style={{
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: 'var(--secondary-2)',
            borderColor: 'var(--secondary-2)',
          }}
        >
          View Analytics
        </Button>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px' }}>
        <Spin size="large" tip="Loading analytics..." />
      </div>
    );
  }

  if (error) {
    return <Alert type="error" message="Failed to load completed quiz analytics." style={{ margin: '24px' }} />;
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ color: 'var(--text-main)', margin: 0 }}>Completed Quizzes Analytics</Title>
        <Text type="secondary" style={{ color: 'var(--text-muted)' }}>Analyze score distributions, leaderboards, and candidate performance grades.</Text>
      </div>

      <Card
        bordered={false}
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
        }}
      >
        <Table
          dataSource={completedQuizzes}
          columns={columns}
          rowKey="_id"
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </Card>

      {/* Quiz Analytics Modal Popup */}
      {selectedQuizId && (
        <Modal
          title={null}
          open={isAnalyticsModalOpen}
          closable={false}
          onCancel={() => {
            setIsAnalyticsModalOpen(false);
            setSelectedQuizId(null);
          }}
          footer={null}
          width={960}
          style={{ top: 20 }}
          styles={{ body: { padding: 0 } }}
          destroyOnClose
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
