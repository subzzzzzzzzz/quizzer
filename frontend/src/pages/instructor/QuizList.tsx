import React, { useState } from 'react';
import { useGetQuizzesQuery, useCancelQuizMutation } from '../../services/api';
import { Table, Tag, Input, Space, Button, Card, Row, Col, Typography, message, Modal, Checkbox, Alert } from 'antd';
import Icon from '../../components/ui/Icon/Icon';
import { useNavigate } from 'react-router-dom';
import AdminQuizResults from '../admin/AdminQuizResults';

const { Title, Text } = Typography;
[]
export const QuizList: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [quizToCancel, setQuizToCancel] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  const { data: quizzesResponse, isLoading, refetch } = useGetQuizzesQuery();
  const [cancelQuiz, { isLoading: isCancelling }] = useCancelQuizMutation();

  const quizzes = quizzesResponse?.data || [];

  const handleCancelClick = (id: string) => {
    setQuizToCancel(id);
    setConsentChecked(false);
    setCancelModalVisible(true);
  };

  const handleCancelConfirm = async () => {
    if (!quizToCancel) return;
    try {
      await cancelQuiz(quizToCancel).unwrap();
      message.success('Quiz cancelled successfully');
      setCancelModalVisible(false);
      setQuizToCancel(null);
      refetch();
    } catch (err: any) {
      message.error(err.data?.message || 'Failed to cancel quiz');
    }
  };

  const filteredQuizzes = quizzes.filter((q) =>
    q.title.toLowerCase().includes(searchText.toLowerCase())
  );

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'Live':
        return <Tag color="success" style={{ fontWeight: 600 }}>LIVE</Tag>;
      case 'Scheduled':
        return <Tag color="processing" style={{ fontWeight: 600 }}>SCHEDULED</Tag>;
      case 'Draft':
        return <Tag color="default" style={{ fontWeight: 600 }}>DRAFT</Tag>;
      case 'Cancelled':
        return <Tag color="error" style={{ fontWeight: 600 }}>CANCELLED</Tag>;
      case 'Completed':
        return <Tag color="warning" style={{ color: 'var(--tertiary-3)', backgroundColor: 'var(--tertiary-0)', borderColor: 'var(--tertiary-1)', fontWeight: 600 }}>COMPLETED</Tag>;
      default:
        return <Tag>{status.toUpperCase()}</Tag>;
    }
  };

  const columns = [
    {
      title: 'Quiz Title',
      dataIndex: 'title',
      key: 'title',
      render: (text: string, record: any) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{text}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{record.questionType === 'multi' ? 'Multiple Choice (Select All)' : 'Single Choice (Select One)'}</div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Questions Ready',
      key: 'questionsReady',
      render: (record: any) => {
        const count = (record as any).questionCount || 0;
        return (
          <Space>
            <span style={{ color: count > 0 ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 700 }}>
              {count > 0 ? '✓' : '✗'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({count} questions)</span>
          </Space>
        );
      },
    },
    {
      title: 'Participants Ready',
      key: 'participantsReady',
      render: (record: any) => {
        const count = (record as any).participantCount || 0;
        return (
          <Space>
            <span style={{ color: count > 0 ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 700 }}>
              {count > 0 ? '✓' : '✗'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({count} candidates)</span>
          </Space>
        );
      },
    },
    {
      title: 'Schedule Window',
      key: 'schedule',
      render: (record: any) => (
        <span style={{ fontSize: '12px' }}>
          {record.startTime ? (
            <>
              {new Date(record.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
              <br />
              {new Date(record.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
            </>
          ) : (
            'Not Scheduled'
          )}
        </span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => {
        const isDraft = record.status === 'Draft';
        const isScheduled = record.status === 'Scheduled';
        const isLive = record.status === 'Live';
        const isCompleted = record.status === 'Completed';

        return (
          <Space>
            <Button
              type="default"
              size="small"
              onClick={() => navigate(`/quizzes/${record._id}/edit`)}
              disabled={isCompleted || record.status === 'Cancelled'}
              style={{ fontSize: '11px', fontWeight: 600 }}
            >
              {isDraft ? 'Configure' : 'Edit'}
            </Button>

            {(isScheduled || isLive) && (
              <Button
                type="text"
                danger
                size="small"
                onClick={() => handleCancelClick(record._id)}
                style={{ fontSize: '11px', fontWeight: 600 }}
              >
                Cancel
              </Button>
            )}

            {isCompleted && (
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
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col span={24} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ color: 'var(--text-main)', margin: 0 }}>Quizzes Editor</Title>
            <Text type="secondary" style={{ color: 'var(--text-muted)' }}>Manage assessment drafts, configure questions, enroll students, and publish assessments.</Text>
          </div>
          <Button
            type="primary"
            onClick={() => navigate('/quizzes/create')}
            style={{
              borderRadius: '6px',
              backgroundColor: 'var(--primary-2)',
              borderColor: 'var(--primary-2)',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Icon name="plus" size={16} /> Create Quiz
          </Button>
        </Col>
      </Row>

      <Card
        bordered={false}
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
        }}
      >
        <Input
          placeholder="Search quiz title..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ width: '320px', marginBottom: '16px', borderRadius: '6px' }}
          prefix={<Icon name="nav-dashboard" size={14} style={{ opacity: 0.5 }} />}
        />

        <Table
          dataSource={filteredQuizzes}
          columns={columns}
          rowKey="_id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </Card>

      {/* Cancel Confirmation Modal matching Page 21, 22, 51, 52 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-error)' }}>
            <Icon name="alert-triangle" size={20} />
            <span>Cancel Quiz Confirmation</span>
          </div>
        }
        open={cancelModalVisible}
        onCancel={() => setCancelModalVisible(false)}
        footer={[
          <Button key="back" onClick={() => setCancelModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="submit"
            type="primary"
            danger
            loading={isCancelling}
            disabled={!consentChecked}
            onClick={handleCancelConfirm}
            style={{ fontWeight: 600 }}
          >
            Yes, Cancel Quiz
          </Button>,
        ]}
        destroyOnClose
      >
        <div style={{ padding: '12px 0' }}>
          <Alert
            message="Warning: This action is permanent and irreversible!"
            type="warning"
            showIcon
            style={{ marginBottom: '16px', borderRadius: '6px' }}
          />
          <p style={{ marginBottom: '16px', lineHeight: '20px' }}>
            Cancelling this quiz will result in the following immediate consequences:
          </p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px', lineHeight: '22px' }}>
            <li>The status will be permanently updated to <strong style={{ color: 'var(--color-error)' }}>CANCELLED</strong>.</li>
            <li>No candidate will be able to start or continue attempts.</li>
            <li>Any active attempts will be locked and cannot be submitted.</li>
          </ul>

          <Checkbox
            checked={consentChecked}
            onChange={(e) => setConsentChecked(e.target.checked)}
            style={{ display: 'flex', alignItems: 'flex-start' }}
          >
            <span style={{ fontSize: '13px', lineHeight: '18px', display: 'block' }}>
              I understand the consequences and confirm that I want to cancel this quiz permanently.
            </span>
          </Checkbox>
        </div>
      </Modal>

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

export default QuizList;
