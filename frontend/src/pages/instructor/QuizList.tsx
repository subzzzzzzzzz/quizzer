import React, { useState } from 'react';
import { useGetQuizzesQuery, useCancelQuizMutation, useUpdateQuizMutation } from '../../services/api';
import type { Quiz } from '../../services/api';
import Card from '../../components/molecules/Card/Card';
import Input from '../../components/atoms/Input/Input';
import Button from '../../components/atoms/Button/Button';
import Tag from '../../components/atoms/Tag/Tag';
import Modal from '../../components/molecules/Modal/Modal';
import Checkbox from '../../components/atoms/Checkbox/Checkbox';
import Alert from '../../components/atoms/Alert/Alert';
import Table from '../../components/organisms/Table/Table';
import type { ColumnType } from '../../components/organisms/Table/Table';
import Icon from '../../components/atoms/Icon/Icon';
import { useNavigate } from 'react-router-dom';
import AdminQuizResults from '../admin/AdminQuizResults';
import message from '../../utils/message';
import FormField from '../../components/molecules/FormField/FormField';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

export const QuizList: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const [searchText, setSearchText] = useState('');
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [quizToCancel, setQuizToCancel] = useState<string | null>(null);
  const [consentChecked, setConsentChecked] = useState(false);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [quickScheduleQuiz, setQuickScheduleQuiz] = useState<Quiz | null>(null);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [updateQuiz, { isLoading: isUpdatingQuiz }] = useUpdateQuizMutation();

  const openQuickSchedule = (quiz: Quiz) => {
    setQuickScheduleQuiz(quiz);
    setStartTime(quiz.startTime ? quiz.startTime.substring(0, 16) : '');
    setEndTime(quiz.endTime ? quiz.endTime.substring(0, 16) : '');
  };

  const handleQuickScheduleSave = async () => {
    if (!quickScheduleQuiz) return;
    try {
      await updateQuiz({
        id: quickScheduleQuiz._id,
        body: { startTime, endTime }
      }).unwrap();
      message.success('Schedule updated successfully');
      setQuickScheduleQuiz(null);
      refetch();
    } catch (err: unknown) {
      const errPayload = err as { data?: { message?: string } };
      message.error(errPayload.data?.message || 'Failed to update schedule');
    }
  };

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
    } catch (err: unknown) {
      const errPayload = err as { data?: { message?: string } };
      message.error(errPayload.data?.message || 'Failed to cancel quiz');
    }
  };

  const filteredQuizzes = quizzes.filter((q) =>
    q.title.toLowerCase().includes(searchText.toLowerCase())
  );

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'Live':
        return <Tag color="success">LIVE</Tag>;
      case 'Scheduled':
        return <Tag color="processing">SCHEDULED</Tag>;
      case 'Draft':
        return <Tag color="default">DRAFT</Tag>;
      case 'Cancelled':
        return <Tag color="error">CANCELLED</Tag>;
      case 'Completed':
        return <Tag color="warning">COMPLETED</Tag>;
      default:
        return <Tag color="default">{status.toUpperCase()}</Tag>;
    }
  };

  const columns: ColumnType<Quiz>[] = [
    {
      title: 'Quiz Title',
      key: 'title',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{record.title}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {record.questionType === 'multi' ? 'Multiple Choice (Select All)' : 'Single Choice (Select One)'}
          </div>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      dataIndex: 'status',
      render: (status) => getStatusTag(String(status)),
    },
    {
      title: 'Questions Ready',
      key: 'questionsReady',
      render: (_, record) => {
        const count = record.questionCount || 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: count > 0 ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 700 }}>
              {count > 0 ? '✓' : '✗'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({count} questions)</span>
          </div>
        );
      },
    },
    {
      title: 'Participants Ready',
      key: 'participantsReady',
      render: (_, record) => {
        const count = record.participantCount || 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: count > 0 ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 700 }}>
              {count > 0 ? '✓' : '✗'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({count} candidates)</span>
          </div>
        );
      },
    },
    {
      title: 'Schedule Window',
      key: 'schedule',
      render: (_, record) => {
        const canEditSchedule = record.status === 'Draft' || record.status === 'Scheduled';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px' }}>
              {record.startTime && record.endTime ? (
                <>
                  {new Date(record.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                  <br />
                  {new Date(record.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                </>
              ) : (
                'Not Scheduled'
              )}
            </span>
            {canEditSchedule && (
              <button
                type="button"
                onClick={() => openQuickSchedule(record)}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: 'var(--primary-2)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s',
                }}
                title="Quick Schedule"
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--neutral-2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Icon name="calendar" size={14} />
              </button>
            )}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const isDraft = record.status === 'Draft';
        const isScheduled = record.status === 'Scheduled';
        const isLive = record.status === 'Live';
        const isCompleted = record.status === 'Completed';

        return (
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              variant="secondary"
              size="small"
              onClick={() => navigate(`/quizzes/${record._id}/edit`)}
              disabled={isCompleted || record.status === 'Cancelled'}
              style={{ fontSize: '11px', fontWeight: 600 }}
            >
              {isDraft ? 'Configure' : 'Edit'}
            </Button>

            {(isScheduled || isLive) && (
              <Button
                variant="text"
                size="small"
                onClick={() => handleCancelClick(record._id)}
                style={{ fontSize: '11px', fontWeight: 600, color: 'var(--danger-2)' }}
              >
                Cancel
              </Button>
            )}

            {isCompleted && (
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
                  backgroundColor: 'var(--secondary-2)',
                  borderColor: 'var(--secondary-2)',
                }}
              >
                View Analytics
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h2 style={{ color: 'var(--text-main)', margin: 0, fontSize: '22px', fontWeight: 700 }}>Quizzes Editor</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Manage assessment drafts, configure questions, enroll students, and publish assessments.</p>
        </div>
        {user?.role !== 'instructor' && (
          <Button
            variant="primary"
            onClick={() => navigate('/quizzes/create')}
            style={{
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Icon name="plus" size={16} /> Create Quiz
          </Button>
        )}
      </div>

      <Card bordered>
        <div style={{ marginBottom: '16px' }}>
          <Input
            placeholder="Search quiz title..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '320px' }}
            prefix={<Icon name="search" size={14} style={{ opacity: 0.5 }} />}
          />
        </div>

        <Table
          dataSource={filteredQuizzes}
          columns={columns as ColumnType<unknown>[]}
          rowKey="_id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
          size="middle"
        />
      </Card>

      {/* Cancel Confirmation Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger-2)' }}>
            <Icon name="alert-triangle" size={20} />
            <span>Cancel Quiz Confirmation</span>
          </div>
        }
        open={cancelModalVisible}
        onCancel={() => setCancelModalVisible(false)}
        footer={[
          <Button key="back" variant="secondary" onClick={() => setCancelModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="submit"
            variant="danger"
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
          <p style={{ marginBottom: '16px', lineHeight: '20px', color: 'var(--text-main)' }}>
            Cancelling this quiz will result in the following immediate consequences:
          </p>
          <ul style={{ paddingLeft: '20px', marginBottom: '20px', lineHeight: '22px', color: 'var(--text-main)' }}>
            <li>The status will be permanently updated to <strong style={{ color: 'var(--danger-2)' }}>CANCELLED</strong>.</li>
            <li>No candidate will be able to start or continue attempts.</li>
            <li>Any active attempts will be locked and cannot be submitted.</li>
          </ul>

          <Checkbox
            checked={consentChecked}
            onChange={(checked) => setConsentChecked(checked)}
          >
            <span style={{ fontSize: '13px', lineHeight: '18px', display: 'block', color: 'var(--text-main)' }}>
              I understand the consequences and confirm that I want to cancel this quiz permanently.
            </span>
          </Checkbox>
        </div>
      </Modal>

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

      {/* Quick Schedule Modal */}
      {quickScheduleQuiz && (
        <Modal
          title={
            <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-main)' }}>
              Quick Schedule: {quickScheduleQuiz.title}
            </span>
          }
          open={!!quickScheduleQuiz}
          onCancel={() => setQuickScheduleQuiz(null)}
          footer={[
            <Button
              key="cancel"
              variant="secondary"
              onClick={() => setQuickScheduleQuiz(null)}
            >
              Cancel
            </Button>,
            <Button
              key="save"
              variant="primary"
              loading={isUpdatingQuiz}
              onClick={handleQuickScheduleSave}
            >
              Save Schedule
            </Button>
          ]}
          width={480}
          destroyOnClose
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '12px 0' }}>
            <FormField label="Start Time" required>
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={{ width: '100%' }}
              />
            </FormField>
            <FormField label="End Time" required>
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={{ width: '100%' }}
              />
            </FormField>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default QuizList;
