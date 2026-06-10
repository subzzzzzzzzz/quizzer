import React, { useState } from 'react';
import { useGetQuizzesQuery, useCancelQuizMutation, useUpdateQuizMutation } from '../../services/api';
import type { Quiz } from '../../services/api';
import Card from '../../components/molecules/Card/Card';
import Input from '../../components/atoms/Input/Input';
import Button from '../../components/atoms/Button/Button';
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
    let dotColor = '#94a3b8';
    let textColor = '#64748b';

    switch (status) {
      case 'Live':
        dotColor = '#16a34a';
        textColor = '#16a34a';
        break;
      case 'Scheduled':
        dotColor = '#2563eb';
        textColor = '#2563eb';
        break;
      case 'Draft':
        dotColor = '#d97706';
        textColor = '#d97706';
        break;
      case 'Cancelled':
        dotColor = '#dc2626';
        textColor = '#dc2626';
        break;
      case 'Completed':
        dotColor = '#4b5563';
        textColor = '#4b5563';
        break;
      default:
        break;
    }

    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: textColor, fontWeight: 600 }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor, display: 'inline-block' }} />
        {status}
      </span>
    );
  };

  const renderReadinessTags = (record: Quiz) => {
    const qCount = record.questionCount || 0;
    const pCount = record.participantCount || 0;

    const qReady = qCount > 0;
    const pReady = pCount > 0;

    const qBg = qReady ? '#e2f9eb' : '#fee2e2';
    const qColor = qReady ? '#1e7e34' : '#991b1b';
    const qBorder = qReady ? '1px solid #1e7e34' : '1px solid #991b1b';

    const pBg = pReady ? '#e2f9eb' : '#fee2e2';
    const pColor = pReady ? '#1e7e34' : '#991b1b';
    const pBorder = pReady ? '1px solid #1e7e34' : '1px solid #991b1b';

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{
          backgroundColor: qBg,
          color: qColor,
          border: qBorder,
          borderRadius: '20px',
          padding: '2px 10px',
          fontSize: '11px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>{qReady ? '✓' : '✗'}</span>
          <span>Questions</span>
        </span>

        <span style={{
          backgroundColor: pBg,
          color: pColor,
          border: pBorder,
          borderRadius: '20px',
          padding: '2px 10px',
          fontSize: '11px',
          fontWeight: 600,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>{pReady ? '✓' : '✗'}</span>
          <span>Participants</span>
        </span>
      </div>
    );
  };

  const formatScheduledDate = (record: Quiz) => {
    if (record.status === 'Draft' || !record.startTime) return '—';
    const d = new Date(record.startTime);
    if (isNaN(d.getTime())) return '—';

    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;

    return `${day} ${month} ${year} - ${hours}:${minutes} ${ampm}`;
  };

  const columns: ColumnType<Quiz>[] = [
    {
      title: 'QUIZ TITLE',
      key: 'title',
      render: (_, record) => (
        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{record.title}</span>
      ),
    },
    {
      title: 'STATUS',
      key: 'status',
      dataIndex: 'status',
      render: (status) => getStatusTag(String(status)),
    },
    {
      title: 'SCHEDULED',
      key: 'schedule',
      render: (_, record) => {
        const canEditSchedule = record.status === 'Draft' || record.status === 'Scheduled';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: '#475569' }}>
              {formatScheduledDate(record)}
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
      title: 'READINESS',
      key: 'readiness',
      render: (_, record) => renderReadinessTags(record),
    },
    {
      title: 'ACTION',
      key: 'action',
      render: (_, record) => {
        const canCancel = record.status === 'Live' || record.status === 'Scheduled';
        return (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Button
              variant="secondary"
              size="small"
              onClick={() => navigate(`/quizzes/${record._id}/edit`)}
              disabled={record.status === 'Completed' || record.status === 'Cancelled'}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                color: '#374151',
                backgroundColor: '#ffffff',
                padding: '4px 12px'
              }}
            >
              Edit
            </Button>
            {canCancel && (
              <Button
                variant="text"
                size="small"
                onClick={() => handleCancelClick(record._id)}
                style={{ fontSize: '11px', fontWeight: 600, color: 'var(--danger-2)' }}
              >
                Cancel
              </Button>
            )}
            {record.status === 'Completed' && (
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
          <h2 style={{ color: 'var(--text-heading)', margin: 0, fontSize: '22px', fontWeight: 700 }}>Update Quizzes</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Draft & Scheduled - Readiness Indicators</p>
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

      <Card
        title={<span style={{ fontWeight: 700, fontSize: '15px' }}>All Quizzes</span>}
        extra={
          <Input
            placeholder="Search draft & scheduled..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '240px', fontSize: '12px' }}
            prefix={<Icon name="search" size={12} style={{ opacity: 0.5 }} />}
          />
        }
        bordered
      >
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
