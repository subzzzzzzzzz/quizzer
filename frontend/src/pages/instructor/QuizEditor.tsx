import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import {
  useGetQuizByIdQuery,
  useCreateQuizMutation,
  useUpdateQuizMutation,
  usePublishQuizMutation,
  useGetQuestionsQuery,
  useAddQuestionMutation,
  useEditQuestionMutation,
  useDeleteQuestionMutation,
  useBulkImportQuestionsMutation,
  useGetParticipantsQuery,
  useAddParticipantsMutation,
  useRemoveParticipantMutation,
  useCancelQuizMutation
} from '../../services/api';
import type { Quiz, Question, Participant } from '../../services/api';
import Card from '../../components/molecules/Card/Card';
import Button from '../../components/atoms/Button/Button';
import Input from '../../components/atoms/Input/Input';
import FormField from '../../components/molecules/FormField/FormField';
import Modal from '../../components/molecules/Modal/Modal';
import Checkbox from '../../components/atoms/Checkbox/Checkbox';
import Alert from '../../components/atoms/Alert/Alert';
import Table from '../../components/organisms/Table/Table';
import type { ColumnType } from '../../components/organisms/Table/Table';
import Popconfirm from '../../components/molecules/Popconfirm/Popconfirm';
import Spinner from '../../components/atoms/Spinner/Spinner';
import Icon from '../../components/atoms/Icon/Icon';
import Tag from '../../components/atoms/Tag/Tag';
import message from '../../utils/message';

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

const getInstructorStatusTag = (status: string) => {
  switch (status) {
    case 'Live':
      return (
        <Tag color="success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--secondary-2)' }} />
          Live
        </Tag>
      );
    case 'Scheduled':
      return (
        <Tag color="processing" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--primary-2)' }} />
          Scheduled
        </Tag>
      );
    case 'Draft':
      return <Tag color="warning">Draft</Tag>;
    case 'Completed':
      return <Tag color="default">Completed</Tag>;
    case 'Cancelled':
      return <Tag color="error">Cancelled</Tag>;
    default:
      return <Tag color="default">{status}</Tag>;
  }
};

const formatSubHeaderTime = (start?: string) => {
  if (!start) return 'Not scheduled';
  const date = new Date(start);
  if (isNaN(date.getTime())) return 'Not scheduled';
  const day = date.getDate();
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day} ${month} ${year} - ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

export const QuizEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'details' | 'questions' | 'participants'>(
    user?.role === 'instructor' ? 'questions' : 'details'
  );

  useEffect(() => {
    if (!isEditMode && user?.role === 'instructor') {
      message.error('Instructors are not authorized to create quizzes.');
      navigate('/dashboard');
    }
  }, [isEditMode, user, navigate]);

  const { data: quizResponse, isLoading: quizLoading, refetch: refetchQuiz } = useGetQuizByIdQuery(id || '', { skip: !isEditMode });
  const quiz = quizResponse?.data;

  const [createQuiz, { isLoading: isCreating }] = useCreateQuizMutation();
  const [updateQuiz, { isLoading: isUpdating }] = useUpdateQuizMutation();
  const [publishQuiz, { isLoading: isPublishing }] = usePublishQuizMutation();
  const [cancelQuiz, { isLoading: isCancelling }] = useCancelQuizMutation();

  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  const [tempDate, setTempDate] = useState('');
  const [tempTime, setTempTime] = useState('');
  const [isEditScheduleOpen, setIsEditScheduleOpen] = useState(false);

  const handleUpdateScheduleTime = async () => {
    if (!tempDate || !tempTime) {
      message.error('Please select date and time');
      return;
    }
    const combinedDateTime = new Date(`${tempDate}T${tempTime}`);
    if (isNaN(combinedDateTime.getTime())) {
      message.error('Invalid Date or Time selection');
      return;
    }
    const startTimeISO = combinedDateTime.toISOString();
    const d = quiz?.duration || 30;
    const endTimeISO = new Date(combinedDateTime.getTime() + Math.max(d, 120) * 60000).toISOString();

    try {
      await updateQuiz({
        id: quiz?._id || '',
        body: { startTime: startTimeISO, endTime: endTimeISO }
      }).unwrap();
      message.success('Schedule updated successfully');
      refetchQuiz();
      setIsEditScheduleOpen(false);
    } catch (err: unknown) {
      const errPayload = err as { data?: { message?: string } };
      message.error(errPayload.data?.message || 'Failed to update schedule');
    }
  };

  if (!isEditMode && user?.role === 'instructor') {
    return null;
  }

  const handleCancelConfirm = async () => {
    if (!id) return;
    try {
      await cancelQuiz(id).unwrap();
      message.success('Quiz cancelled successfully');
      setCancelModalVisible(false);
      refetchQuiz();
      if (isAdmin) {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      const errPayload = err as { data?: { message?: string } };
      message.error(errPayload.data?.message || 'Failed to cancel quiz');
    }
  };

  const handleSaveDetails = async (values: Partial<Quiz>) => {
    try {
      if (isEditMode && id) {
        await updateQuiz({ id, body: values }).unwrap();
        message.success('Quiz details updated successfully');
        refetchQuiz();
        if (isAdmin) {
          navigate('/dashboard');
        }
      } else {
        const res = await createQuiz(values).unwrap();
        message.success('Quiz created successfully');
        if (isAdmin) {
          navigate('/dashboard');
        } else {
          navigate(`/quizzes/${res.data._id}/edit`);
        }
      }
    } catch (err: unknown) {
      const errPayload = err as { data?: { message?: string } };
      message.error(errPayload.data?.message || 'Failed to save quiz details');
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    try {
      await publishQuiz(id).unwrap();
      message.success('Quiz published and scheduled successfully');
      refetchQuiz();
    } catch (err: unknown) {
      const errPayload = err as { data?: { message?: string } };
      message.error(errPayload.data?.message || 'Failed to publish quiz');
    }
  };

  if (isEditMode && quizLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px' }}>
        <Spinner size="large" tip="Loading editor..." />
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {user?.role === 'instructor' ? (
            <>
              <span style={{ cursor: 'pointer' }} onClick={() => navigate('/quizzes')}>Update Quizzes</span>
              <span>&gt;</span>
              <span style={{ color: 'var(--primary-2)', fontWeight: 500 }}>
                {isEditMode ? `Edit Quiz - ${getQuizCode(quiz?.title || '', 'instructor')}` : 'Create Quiz'}
              </span>
            </>
          ) : (
            <>
              <span style={{ cursor: 'pointer' }} onClick={() => navigate(isAdmin ? '/dashboard' : '/quizzes')}>Dashboard</span>
              <span>&gt;</span>
              <span style={{ color: 'var(--primary-2)', fontWeight: 500 }}>{isEditMode ? 'Edit Quiz' : 'Create Quiz'}</span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ color: 'var(--text-heading)', margin: 0, fontSize: '22px', fontWeight: 700 }}>
              {isEditMode && user?.role === 'instructor' ? 'Edit Quiz' : isEditMode ? `Edit Quiz: ${quiz?.title}` : 'Create New Quiz'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
              {isEditMode ? 'Configure settings, add questions, enroll participants, and schedule testing window' : 'Set basic details to begin your draft'}
            </p>
          </div>
          {isEditMode && quiz && user?.role === 'instructor' ? (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Button
                variant="secondary"
                onClick={() => navigate('/quizzes')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-main)',
                  backgroundColor: 'var(--bg-surface)',
                  padding: '6px 16px',
                  borderRadius: '6px',
                }}
              >
                <Icon name="arrow-left" size={14} /> Back to Quiz List
              </Button>
              {quiz.status !== 'Cancelled' && quiz.status !== 'Completed' && (
                <Button
                  variant="secondary"
                  onClick={() => { setConsentChecked(false); setCancelModalVisible(true); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 600,
                    borderColor: 'var(--danger-2)',
                    color: 'var(--danger-2)',
                    backgroundColor: 'var(--bg-surface)',
                    padding: '6px 16px',
                    borderRadius: '6px',
                  }}
                >
                  <Icon name="alert-cancel" size={14} /> Cancel Quiz
                </Button>
              )}
              <Button
                variant="primary"
                onClick={handlePublish}
                loading={isPublishing}
                disabled={!quiz.questionCount || quiz.questionCount === 0 || !quiz.participantCount || quiz.participantCount === 0 || !quiz.startTime || quiz.status !== 'Draft'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontWeight: 600,
                  backgroundColor: (!quiz.questionCount || quiz.questionCount === 0 || !quiz.participantCount || quiz.participantCount === 0 || !quiz.startTime || quiz.status !== 'Draft')
                    ? 'var(--neutral-3)'
                    : 'var(--secondary-2)',
                  borderColor: (!quiz.questionCount || quiz.questionCount === 0 || !quiz.participantCount || quiz.participantCount === 0 || !quiz.startTime || quiz.status !== 'Draft')
                    ? 'var(--neutral-3)'
                    : 'var(--secondary-2)',
                  color: '#ffffff',
                  padding: '6px 16px',
                  borderRadius: '6px',
                }}
              >
                <Icon name="publish" size={14} /> Publish
              </Button>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => navigate(isAdmin ? '/dashboard' : '/quizzes')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon name="arrow-left" size={14} /> Back to {isAdmin ? 'Dashboard' : 'List'}
            </Button>
          )}
        </div>
      </div>

      {isEditMode && quiz && user?.role === 'instructor' && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '16px 24px',
            marginBottom: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: '2px' }}>
              {getQuizCode(quiz.title, 'instructor')}
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-heading)' }}>
              {quiz.title}
            </h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div
              onClick={() => {
                if (quiz.startTime) {
                  const dateObj = new Date(quiz.startTime);
                  if (!isNaN(dateObj.getTime())) {
                    const yyyy = dateObj.getFullYear();
                    const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                    const dd = String(dateObj.getDate()).padStart(2, '0');
                    setTempDate(`${yyyy}-${mm}-${dd}`);

                    const hh = String(dateObj.getHours()).padStart(2, '0');
                    const min = String(dateObj.getMinutes()).padStart(2, '0');
                    setTempTime(`${hh}:${min}`);
                  }
                } else {
                  setTempDate('');
                  setTempTime('');
                }
                setIsEditScheduleOpen(!isEditScheduleOpen);
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                backgroundColor: 'var(--bg-base)',
                padding: '6px 12px',
                borderRadius: '20px',
                border: isEditScheduleOpen ? '1px solid var(--primary-2)' : '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Icon name="calendar" size={14} />
              <span>{formatSubHeaderTime(quiz.startTime)}</span>
              <Icon name="edit-pencil" size={12} style={{ color: 'var(--primary-2)', marginLeft: '2px' }} />
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', backgroundColor: 'var(--bg-base)', padding: '6px 12px', borderRadius: '20px', border: '1px solid var(--border-color)' }}>
              <Icon name="time" size={14} />
              <span>{quiz.duration} min</span>
            </div>
            {getInstructorStatusTag(quiz.status)}
          </div>
        </div>
      )}

      {isEditMode && quiz && user?.role === 'instructor' && isEditScheduleOpen && (
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '20px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icon name="calendar" size={18} color="var(--primary-2)" />
              <strong style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: 700 }}>Update Schedule Time</strong>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Changes apply after Publish</span>
          </div>

          {/* Body */}
          <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '180px' }}>
              <FormField label="Date" required>
                <Input
                  type="date"
                  value={tempDate}
                  prefix={<Icon name="calendar" size={16} />}
                  onChange={(e) => setTempDate(e.target.value)}
                />
              </FormField>
              <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '4px', textTransform: 'uppercase' }}>DD MMM YYYY</div>
            </div>

            <div style={{ flex: 1, minWidth: '180px' }}>
              <FormField label="Time" required>
                <Input
                  type="time"
                  value={tempTime}
                  prefix={<Icon name="time" size={16} />}
                  onChange={(e) => setTempTime(e.target.value)}
                />
              </FormField>
              <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginTop: '4px', textTransform: 'uppercase' }}>HH:MM AM/PM</div>
            </div>

            {/* Preview Box */}
            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600, marginBottom: '6px' }}>Preview</div>
              <div
                style={{
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 16px',
                  backgroundColor: 'rgba(82, 196, 26, 0.08)',
                  border: '1px solid var(--color-success, #52c41a)',
                  color: 'var(--color-success, #52c41a)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                {tempDate && tempTime
                  ? formatSubHeaderTime(`${tempDate}T${tempTime}`)
                  : 'Select Date & Time'}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                variant="secondary"
                onClick={() => setIsEditScheduleOpen(false)}
                style={{
                  fontWeight: 600,
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-main)',
                  backgroundColor: 'var(--bg-base)',
                  padding: '8px 20px',
                  borderRadius: '6px',
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateScheduleTime}
                loading={isUpdating}
                style={{
                  fontWeight: 600,
                  backgroundColor: 'var(--primary-2)',
                  borderColor: 'var(--primary-2)',
                  color: '#ffffff',
                  padding: '8px 20px',
                  borderRadius: '6px',
                }}
              >
                Update Time
              </Button>
            </div>
          </div>
        </div>
      )}

      {isEditMode && quiz && (
        <div style={{ marginBottom: '20px' }}>
          {user?.role === 'instructor' && quiz.status === 'Draft' && (
            <Alert
              message={
                <div>
                  <strong style={{ display: 'block', fontSize: '14px', marginBottom: '6px', color: 'var(--text-main)' }}>
                    {(quiz.questionCount && quiz.questionCount > 0 && quiz.participantCount && quiz.participantCount > 0 && quiz.startTime)
                      ? 'Quiz is ready to be published!'
                      : 'This quiz cannot be scheduled yet'}
                  </strong>
                  <div style={{ display: 'flex', gap: '16px', fontSize: '12px', alignItems: 'center' }}>
                    <span style={{ color: (quiz.questionCount && quiz.questionCount > 0) ? 'var(--color-success)' : 'var(--danger-2)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                      <span style={{ fontSize: '14px' }}>{quiz.questionCount && quiz.questionCount > 0 ? '✓' : '✗'}</span>
                      {quiz.questionCount || 0} questions added
                    </span>
                    <span style={{ color: (quiz.participantCount && quiz.participantCount > 0) ? 'var(--color-success)' : 'var(--danger-2)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                      <span style={{ fontSize: '14px' }}>{quiz.participantCount && quiz.participantCount > 0 ? '✓' : '✗'}</span>
                      {quiz.participantCount && quiz.participantCount > 0 ? `${quiz.participantCount} participants added` : 'No participants — switch to Participants tab'}
                    </span>
                    <span style={{ color: quiz.startTime ? 'var(--color-success)' : 'var(--danger-2)', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                      <span style={{ fontSize: '14px' }}>{quiz.startTime ? '✓' : '✗'}</span>
                      {quiz.startTime ? 'Schedule time set' : 'No schedule time set — click edit icon on date pill'}
                    </span>
                  </div>
                </div>
              }
              type={(quiz.questionCount && quiz.questionCount > 0 && quiz.participantCount && quiz.participantCount > 0 && quiz.startTime) ? 'success' : 'warning'}
              showIcon
              style={{ borderRadius: '10px' }}
            />
          )}
          {user?.role !== 'instructor' && quiz.status === 'Draft' && (
            <Alert
              message={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
                  <span>
                    <strong>Status: Draft.</strong> To schedule and publish this quiz, you must add at least <strong>1 question</strong> and <strong>1 participant</strong>.
                  </span>
                  {quiz.questionCount && quiz.questionCount > 0 && quiz.participantCount && quiz.participantCount > 0 && quiz.startTime && (
                    <Button variant="primary" size="small" onClick={handlePublish} loading={isPublishing} style={{ backgroundColor: 'var(--secondary-2)', borderColor: 'var(--secondary-2)' }}>
                      Publish Quiz
                    </Button>
                  )}
                </div>
              }
              type={quiz.questionCount && quiz.questionCount > 0 && quiz.participantCount && quiz.participantCount > 0 ? 'success' : 'warning'}
              showIcon
            />
          )}
          {quiz.status === 'Scheduled' && (
            <Alert
              message={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
                  <span>Status: Scheduled. Edits only take effect once you click Re-publish.</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button size="small" variant="primary" onClick={handlePublish} loading={isPublishing} style={{ backgroundColor: 'var(--tertiary-2)', borderColor: 'var(--tertiary-2)' }}>
                      Re-publish
                    </Button>
                    <Button size="small" variant="secondary" onClick={() => { setConsentChecked(false); setCancelModalVisible(true); }} style={{ color: 'var(--danger-2)' }}>
                      Cancel Quiz
                    </Button>
                  </div>
                </div>
              }
              type="info"
              showIcon
            />
          )}
          {quiz.status === 'Live' && (
            <Alert
              message={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
                  <span>Status: Live. Assessment is currently active.</span>
                  <Button size="small" variant="secondary" onClick={() => { setConsentChecked(false); setCancelModalVisible(true); }} style={{ color: 'var(--danger-2)' }}>
                    Cancel Quiz
                  </Button>
                </div>
              }
              type="success"
              showIcon
            />
          )}
        </div>
      )}

      {isEditMode ? (
        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          {/* Custom Tabs selector */}
          {!isAdmin && (
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '24px', gap: '24px' }}>
              {(user?.role === 'instructor'
                ? [
                    { key: 'questions', label: 'Questions' },
                    { key: 'participants', label: 'Participants' }
                  ]
                : [
                    { key: 'details', label: 'Duration' },
                    { key: 'questions', label: 'Questions' },
                    { key: 'participants', label: 'Participants' }
                  ]
              ).map(tab => {
                const isSelected = activeTab === tab.key;
                const count = tab.key === 'questions' ? (quiz?.questionCount || 0) : (quiz?.participantCount || 0);
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as 'details' | 'questions' | 'participants')}
                    style={{
                      border: 'none',
                      background: 'none',
                      padding: '12px 4px',
                      fontSize: '14px',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? 'var(--primary-2)' : 'var(--text-muted)',
                      borderBottom: isSelected ? '2px solid var(--primary-2)' : '2px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontFamily: 'var(--font-family)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{tab.label}</span>
                    {user?.role === 'instructor' && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isSelected ? 'var(--primary-2)' : 'var(--neutral-3)',
                          color: isSelected ? '#ffffff' : 'var(--text-muted)',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          fontSize: '10px',
                          fontWeight: 600,
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div>
            {activeTab === 'details' && (
              <DetailsTab
                quiz={quiz}
                onSave={handleSaveDetails}
                isSaving={isUpdating}
                isEditMode={isEditMode}
                onCancelClick={() => { setConsentChecked(false); setCancelModalVisible(true); }}
              />
            )}
            {activeTab === 'questions' && !isAdmin && <QuestionsTab quizId={id || ''} questionType={quiz?.questionType} />}
            {activeTab === 'participants' && !isAdmin && <ParticipantsTab quizId={id || ''} />}
          </div>
        </div>
      ) : (
        <Card bordered>
          <DetailsTab
            onSave={handleSaveDetails}
            isSaving={isCreating}
            isEditMode={isEditMode}
          />
        </Card>
      )}

      {/* Cancel Confirmation Modal */}
      <Modal
        title={<span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-main)' }}>Cancel Quiz Confirmation</span>}
        open={cancelModalVisible}
        onCancel={() => setCancelModalVisible(false)}
        footer={[
          <Button
            key="back"
            variant="secondary"
            onClick={() => setCancelModalVisible(false)}
          >
            No, keep it
          </Button>,
          <Button
            key="submit"
            variant="danger"
            disabled={isAdmin && !consentChecked}
            loading={isCancelling}
            onClick={handleCancelConfirm}
          >
            Yes, Cancel Quiz
          </Button>,
        ]}
        width={480}
        destroyOnClose
      >
        <div style={{ padding: '12px 0' }}>
          <Alert
            message="Warning"
            description="This action will immediately terminate the quiz and prevent further attempts. This cannot be undone."
            type="warning"
            showIcon
            style={{ marginBottom: '16px', borderRadius: '6px' }}
          />
          {isAdmin ? (
            <Checkbox
              checked={consentChecked}
              onChange={(checked) => setConsentChecked(checked)}
              style={{ color: 'var(--text-main)', fontSize: '13px' }}
            >
              I understand that cancelling this quiz is permanent and will notify assigned candidates.
            </Checkbox>
          ) : (
            <p style={{ color: 'var(--text-main)', fontSize: '13px' }}>
              Are you sure you want to permanently cancel this quiz?
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
};

// --- SUB-COMPONENT: DETAILS TAB ---
const DetailsTab: React.FC<{
  quiz?: Quiz;
  onSave: (values: Partial<Quiz>) => void;
  isSaving: boolean;
  isEditMode: boolean;
  onCancelClick?: () => void;
}> = ({ quiz, onSave, isSaving, isEditMode, onCancelClick }) => {
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);
  const isAdmin = user?.role === 'admin';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState<number | ''>('');
  const [questionType, setQuestionType] = useState<'single' | 'multi'>('single');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const [titleError, setTitleError] = useState<string | undefined>(undefined);
  const [durationError, setDurationError] = useState<string | undefined>(undefined);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title || '');
      setDescription(quiz.description || '');
      setDuration(quiz.duration || '');
      setQuestionType(quiz.questionType || 'single');
      if (quiz.startTime) {
        const dateObj = new Date(quiz.startTime);
        if (!isNaN(dateObj.getTime())) {
          const yyyy = dateObj.getFullYear();
          const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
          const dd = String(dateObj.getDate()).padStart(2, '0');
          setScheduleDate(`${yyyy}-${mm}-${dd}`);

          const hh = String(dateObj.getHours()).padStart(2, '0');
          const min = String(dateObj.getMinutes()).padStart(2, '0');
          setScheduleTime(`${hh}:${min}`);
        }
      } else {
        setScheduleDate('');
        setScheduleTime('');
      }
    }
  }, [quiz]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;

    if (!title.trim()) {
      setTitleError('Please enter quiz title');
      valid = false;
    } else {
      setTitleError(undefined);
    }

    if (duration === '' || duration <= 0) {
      setDurationError('Please enter a valid duration');
      valid = false;
    } else {
      setDurationError(undefined);
    }

    if (!valid) return;

    let startTimeISO: string | undefined = undefined;
    let endTimeISO: string | undefined = undefined;

    if (scheduleDate && scheduleTime) {
      const combinedDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      if (!isNaN(combinedDateTime.getTime())) {
        startTimeISO = combinedDateTime.toISOString();
        const d = duration ? Number(duration) : 30;
        endTimeISO = new Date(combinedDateTime.getTime() + Math.max(d, 120) * 60000).toISOString();
      }
    }

    onSave({
      title,
      description,
      duration: Number(duration),
      questionType,
      startTime: startTimeISO,
      endTime: endTimeISO,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '24px' }}>
        * All fields are mandatory
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Row 1: Title */}
        <div style={{ gridColumn: 'span 2' }}>
          <FormField label="Quiz Title" error={titleError} required>
            <Input
              placeholder="e.g. CSS Advanced Selectors"
              value={title}
              prefix={<Icon name="edit" size={16} />}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(undefined);
              }}
            />
          </FormField>
        </div>

        {/* Row 2: Schedule Date & Schedule Time */}
        <div style={{ gridColumn: 'span 1' }}>
          <FormField label="Schedule Date" required>
            <Input
              type="date"
              value={scheduleDate}
              prefix={<Icon name="calendar" size={16} />}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
          </FormField>
        </div>
        <div style={{ gridColumn: 'span 1' }}>
          <FormField label="Schedule Time" required>
            <Input
              type="time"
              value={scheduleTime}
              prefix={<Icon name="time" size={16} />}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
          </FormField>
        </div>

        {/* Row 3: Duration & Question Type */}
        <div style={{ gridColumn: 'span 1' }}>
          <FormField label="Duration" error={durationError} required>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Input
                type="number"
                min={1}
                placeholder="30"
                value={duration}
                prefix={<Icon name="time" size={16} />}
                onChange={(e) => {
                  setDuration(e.target.value === '' ? '' : Number(e.target.value));
                  if (durationError) setDurationError(undefined);
                }}
                style={{ flexGrow: 1 }}
              />
              <span style={{ color: 'var(--text-muted)', fontSize: '13px', whiteSpace: 'nowrap' }}>minutes</span>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '6px' }}>
              Time allowed for participants to complete the quiz
            </div>
          </FormField>
        </div>

        <div style={{ gridColumn: 'span 1' }}>
          <FormField label="Question Type" required>
            <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
              {/* Single Select Card */}
              <div
                onClick={() => setQuestionType('single')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: questionType === 'single'
                    ? '2px solid var(--primary-2)'
                    : '1px solid var(--border-color)',
                  backgroundColor: questionType === 'single'
                    ? 'rgba(83, 74, 183, 0.06)'
                    : 'var(--bg-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon
                  name={questionType === 'single' ? 'radio-selected' : 'radio-unselected'}
                  size={18}
                  color={questionType === 'single' ? 'var(--primary-2)' : 'var(--text-muted)'}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Single Select</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>One correct answer</span>
                </div>
              </div>

              {/* Multi Select Card */}
              <div
                onClick={() => setQuestionType('multi')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: questionType === 'multi'
                    ? '2px solid var(--primary-2)'
                    : '1px solid var(--border-color)',
                  backgroundColor: questionType === 'multi'
                    ? 'rgba(83, 74, 183, 0.06)'
                    : 'var(--bg-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon
                  name={questionType === 'multi' ? 'radio-selected' : 'radio-unselected'}
                  size={18}
                  color={questionType === 'multi' ? 'var(--primary-2)' : 'var(--text-muted)'}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main)' }}>Multi Select</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Multiple correct answers</span>
                </div>
              </div>
            </div>
          </FormField>
        </div>
      </div>

      <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate(isAdmin ? '/dashboard' : '/quizzes')}
          style={{
            fontWeight: 600,
            padding: '8px 24px',
            borderRadius: '6px',
            borderColor: 'var(--border-color)',
            color: 'var(--text-main)',
            backgroundColor: 'var(--bg-base)',
          }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={isSaving}
          aria-label="Save Configuration"
          style={{
            backgroundColor: 'var(--primary-2)',
            borderColor: 'var(--primary-2)',
            color: '#ffffff',
            fontWeight: 600,
            padding: '8px 24px',
            borderRadius: '6px',
          }}
        >
          {isEditMode ? 'Save Configuration' : 'Submit Quiz'}
        </Button>
        {isEditMode && quiz && (quiz.status === 'Scheduled' || quiz.status === 'Live') && onCancelClick && (
          <Button
            type="button"
            variant="danger"
            onClick={onCancelClick}
            style={{ fontWeight: 600, padding: '8px 24px', borderRadius: '6px' }}
          >
            Cancel Quiz
          </Button>
        )}
      </div>
    </form>
  );
};

// --- SUB-COMPONENT: QUESTIONS TAB ---
const QuestionsTab: React.FC<{ quizId: string; questionType?: string }> = ({ quizId }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [csvModalVisible, setCsvModalVisible] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  
  // Custom manual form states
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState<number[]>([]);

  // CSV Drag and drop file reading states
  const [csvContent, setCsvContent] = useState<Partial<Question>[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const { data: questionsResponse, isLoading, refetch } = useGetQuestionsQuery(quizId);
  const [addQuestion, { isLoading: isAdding }] = useAddQuestionMutation();
  const [editQuestion, { isLoading: isEditing }] = useEditQuestionMutation();
  const [deleteQuestion] = useDeleteQuestionMutation();
  const [bulkImport, { isLoading: isBulkLoading }] = useBulkImportQuestionsMutation();

  const questions = questionsResponse?.data || [];

  const handleOpenModal = (q?: Question) => {
    setSelectedQuestion(q || null);
    if (q) {
      setQuestionText(q.question);
      setOptionA(q.options[0] || '');
      setOptionB(q.options[1] || '');
      setOptionC(q.options[2] || '');
      setOptionD(q.options[3] || '');
      setCorrectAnswers(q.correctAnswers || []);
    } else {
      setQuestionText('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setCorrectAnswers([]);
    }
    setModalVisible(true);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || !optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      message.error('Please fill in all question text and option fields');
      return;
    }
    if (correctAnswers.length === 0) {
      message.error('Please select at least one correct option');
      return;
    }

    const payload = {
      quizId,
      question: questionText,
      options: [optionA, optionB, optionC, optionD],
      correctAnswers,
    };

    try {
      if (selectedQuestion) {
        await editQuestion({ id: selectedQuestion._id, body: payload }).unwrap();
        message.success('Question updated successfully');
      } else {
        await addQuestion(payload).unwrap();
        message.success('Question added successfully');
      }
      setModalVisible(false);
      refetch();
    } catch (err: unknown) {
      const errPayload = err as { data?: { message?: string } };
      message.error(errPayload.data?.message || 'Failed to save question');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteQuestion(id).unwrap();
      message.success('Question deleted');
      refetch();
    } catch {
      message.error('Failed to delete question');
    }
  };

  const handleCheckboxChange = (index: number, checked: boolean) => {
    if (checked) {
      setCorrectAnswers([...correctAnswers, index]);
    } else {
      setCorrectAnswers(correctAnswers.filter(i => i !== index));
    }
  };

  // CSV Drag and drop file reading
  const handleCSVParse = (file: File) => {
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const parsedQuestions: Partial<Question>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
        if (parts.length < 6) continue;

        const questionTextParsed = parts[0].replace(/^"|"$/g, '');
        const optionsParsed = parts.slice(1, 5).map(o => o.replace(/^"|"$/g, '').trim());
        const ansString = parts[5].replace(/^"|"$/g, '').trim();

        const correctAnsArray: number[] = [];
        const ansTokens = ansString.split(/[;|]/);
        ansTokens.forEach(t => {
          const val = t.toUpperCase().trim();
          if (val === 'A') correctAnsArray.push(0);
          else if (val === 'B') correctAnsArray.push(1);
          else if (val === 'C') correctAnsArray.push(2);
          else if (val === 'D') correctAnsArray.push(3);
          else if (!isNaN(Number(val))) correctAnsArray.push(Number(val));
        });

        if (correctAnsArray.length > 0) {
          parsedQuestions.push({
            question: questionTextParsed,
            options: optionsParsed,
            correctAnswers: correctAnsArray,
          });
        }
      }
      setCsvContent(parsedQuestions);
      message.success(`Successfully parsed ${parsedQuestions.length} questions from CSV`);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        handleCSVParse(file);
      } else {
        message.error('Please upload a CSV file only');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleCSVParse(e.target.files[0]);
    }
  };

  const handleImportCSV = async () => {
    if (csvContent.length === 0) return;
    try {
      await bulkImport({ quizId, questions: csvContent as Question[] }).unwrap();
      message.success(`Staged ${csvContent.length} questions imported successfully`);
      setCsvModalVisible(false);
      setCsvContent([]);
      setCsvFileName('');
      refetch();
    } catch (err: unknown) {
      const errPayload = err as { data?: { message?: string } };
      message.error(errPayload.data?.message || 'Failed to import CSV');
    }
  };

  const columns: ColumnType<Question>[] = [
    {
      title: 'Question text',
      dataIndex: 'question',
      key: 'question',
      render: (value) => <span style={{ fontWeight: 600 }}>{String(value)}</span>,
    },
    {
      title: 'Options list',
      key: 'options',
      render: (_, record) => (
        <ol style={{ paddingLeft: '20px', fontSize: '12px', margin: 0 }}>
          {record.options.map((opt: string, idx: number) => {
            const isCorrect = record.correctAnswers?.includes(idx);
            return (
              <li key={idx} style={{ color: isCorrect ? 'var(--color-success)' : 'inherit', fontWeight: isCorrect ? 600 : 'normal' }}>
                {opt} {isCorrect && '✓'}
              </li>
            );
          })}
        </ol>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" size="small" onClick={() => handleOpenModal(record)}>Edit</Button>
          <Popconfirm title="Delete question?" onConfirm={() => handleDelete(record._id)}>
            <Button size="small" variant="text" style={{ color: 'var(--danger-2)', padding: 0 }}>Delete</Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: '13px' }}>Assessments Questions List ({questions.length})</span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" onClick={() => setCsvModalVisible(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="upload" size={14} /> Import CSV File
          </Button>
          <Button variant="primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Icon name="plus" size={14} /> Add Question
          </Button>
        </div>
      </div>

      <Table dataSource={questions} columns={columns} rowKey="_id" loading={isLoading} pagination={false} size="middle" />

      {/* Manual Add/Edit Question Modal */}
      <Modal
        title={selectedQuestion ? 'Edit Question' : 'Add Question'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="close" variant="secondary" onClick={() => setModalVisible(false)}>Cancel</Button>,
          <Button key="save" variant="primary" loading={isAdding || isEditing} onClick={handleSaveQuestion}>Save</Button>
        ]}
        destroyOnClose
      >
        <form onSubmit={handleSaveQuestion}>
          <FormField label="Question Text" required>
            <Input.TextArea
              rows={3}
              placeholder="Enter your question here..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            />
          </FormField>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            {[
              { label: 'Option A', key: 'optionA', val: optionA, set: setOptionA },
              { label: 'Option B', key: 'optionB', val: optionB, set: setOptionB },
              { label: 'Option C', key: 'optionC', val: optionC, set: setOptionC },
              { label: 'Option D', key: 'optionD', val: optionD, set: setOptionD },
            ].map((opt) => (
              <FormField key={opt.key} label={opt.label} required>
                <Input
                  id={opt.key}
                  placeholder="Option value"
                  value={opt.val}
                  onChange={(e) => opt.set(e.target.value)}
                />
              </FormField>
            ))}
          </div>

          <FormField label="Correct Options (Select one or more)" required>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[0, 1, 2, 3].map(idx => (
                <Checkbox
                  key={idx}
                  checked={correctAnswers.includes(idx)}
                  onChange={(checked) => handleCheckboxChange(idx, checked)}
                >
                  Option {String.fromCharCode(65 + idx)}
                </Checkbox>
              ))}
            </div>
          </FormField>
        </form>
      </Modal>

      {/* CSV Import Modal */}
      <Modal
        title="Upload CSV Questions"
        open={csvModalVisible}
        onCancel={() => setCsvModalVisible(false)}
        footer={[
          <Button key="close" variant="secondary" onClick={() => setCsvModalVisible(false)}>Cancel</Button>,
          <Button key="import" variant="primary" disabled={csvContent.length === 0} loading={isBulkLoading} onClick={handleImportCSV}>
            Import {csvContent.length > 0 ? csvContent.length : ''} Questions
          </Button>
        ]}
        destroyOnClose
      >
        <div style={{ padding: '12px 0' }}>
          {/* Custom Dropzone Uploader */}
          <div
            className={`custom-dropzone ${dragActive ? 'custom-dropzone--active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('question-csv-file')?.click()}
            style={{
              border: '2px dashed var(--border-color)',
              borderRadius: '8px',
              padding: '32px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: dragActive ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="file"
              id="question-csv-file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
            <div style={{ color: 'var(--primary-2)', marginBottom: '12px' }}>
              <Icon name="upload" size={40} />
            </div>
            <p style={{ fontWeight: 600, fontSize: '14px', margin: '0 0 4px 0', color: 'var(--text-main)' }}>
              Drag & drop your questions CSV file here, or click to browse
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              Supported columns: <strong>question, optionA, optionB, optionC, optionD, correctAnswer</strong>
            </p>
          </div>

          {csvFileName && (
            <div style={{ marginTop: '16px', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
              <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>Staged File: </strong>
              <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>{csvFileName} ({csvContent.length} questions detected)</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

// --- SUB-COMPONENT: PARTICIPANTS TAB ---
const ParticipantsTab: React.FC<{ quizId: string }> = ({ quizId }) => {
  const [emailInput, setEmailInput] = useState('');
  const [csvModalVisible, setCsvModalVisible] = useState(false);
  const [csvEmails, setCsvEmails] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const { data: participantsResponse, isLoading, refetch } = useGetParticipantsQuery(quizId);
  const [addParticipants, { isLoading: isAdding }] = useAddParticipantsMutation();
  const [removeParticipant] = useRemoveParticipantMutation();

  const participants = participantsResponse?.data || [];

  const handleAddInline = async () => {
    if (!emailInput) return;
    try {
      const res = await addParticipants({ quizId, emails: [emailInput] }).unwrap();
      if (res.data.importedCount > 0) {
        message.success(`${emailInput} assigned successfully`);
        setEmailInput('');
        refetch();
      } else {
        message.warning(`Email not assigned. Is the email registered as candidate?`);
      }
    } catch (err: unknown) {
      const errPayload = err as { data?: { message?: string } };
      message.error(errPayload.data?.message || 'Failed to add participant');
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await removeParticipant(id).unwrap();
      message.success('Participant removed');
      refetch();
    } catch {
      message.error('Failed to remove participant');
    }
  };

  const handleCSVParse = (file: File) => {
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const emails: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        if (line.includes('@')) {
          emails.push(line.replace(/^"|"$/g, '').trim());
        }
      }
      const filtered = emails.filter(email => email.toLowerCase() !== 'email');
      setCsvEmails(filtered);
      message.success(`Found ${filtered.length} email addresses in CSV`);
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.endsWith('.csv')) {
        handleCSVParse(file);
      } else {
        message.error('Please upload a CSV file only');
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleCSVParse(e.target.files[0]);
    }
  };

  const handleImportCSV = async () => {
    if (csvEmails.length === 0) return;
    try {
      const res = await addParticipants({ quizId, emails: csvEmails }).unwrap();
      message.success(`Successfully imported ${res.data.importedCount} participants. (${res.data.unregisteredCount} unregistered emails ignored)`);
      setCsvModalVisible(false);
      setCsvEmails([]);
      setCsvFileName('');
      refetch();
    } catch {
      message.error('Failed to import CSV');
    }
  };

  const columns: ColumnType<Participant>[] = [
    {
      title: 'Name',
      key: 'name',
      render: (_, record) => <span style={{ fontWeight: 600 }}>{record.userId.name}</span>,
    },
    {
      title: 'Email Address',
      key: 'email',
      render: (_, record) => <span>{record.userId.email}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Popconfirm title="Remove participant from quiz?" onConfirm={() => handleRemove(record._id)}>
          <Button size="small" variant="text" style={{ color: 'var(--danger-2)', padding: 0 }}>Remove</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
        <span style={{ fontWeight: 600, fontSize: '13px' }}>Assigned Candidates List ({participants.length})</span>
        <Button variant="secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => setCsvModalVisible(true)}>
          <Icon name="upload" size={14} /> Import Participants CSV
        </Button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', maxWidth: '500px' }}>
        <Input
          placeholder="Enter candidate email (e.g. sara@company.com)"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddInline();
          }}
          style={{ borderRadius: '6px' }}
        />
        <Button variant="primary" onClick={handleAddInline} loading={isAdding}>
          Assign
        </Button>
      </div>

      <Table dataSource={participants} columns={columns as ColumnType<unknown>[]} rowKey="_id" loading={isLoading} pagination={{ pageSize: 5 }} size="middle" />

      {/* CSV upload modal */}
      <Modal
        title="Upload Participants CSV"
        open={csvModalVisible}
        onCancel={() => setCsvModalVisible(false)}
        footer={[
          <Button key="close" variant="secondary" onClick={() => setCsvModalVisible(false)}>Cancel</Button>,
          <Button key="import" variant="primary" disabled={csvEmails.length === 0} loading={isAdding} onClick={handleImportCSV}>
            Import {csvEmails.length > 0 ? csvEmails.length : ''} Candidates
          </Button>
        ]}
        destroyOnClose
      >
        <div style={{ padding: '12px 0' }}>
          {/* Custom Dropzone Uploader */}
          <div
            className={`custom-dropzone ${dragActive ? 'custom-dropzone--active' : ''}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('participant-csv-file')?.click()}
            style={{
              border: '2px dashed var(--border-color)',
              borderRadius: '8px',
              padding: '32px 16px',
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: dragActive ? 'var(--bg-surface-hover)' : 'var(--bg-surface)',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="file"
              id="participant-csv-file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleFileInputChange}
            />
            <div style={{ color: 'var(--primary-2)', marginBottom: '12px' }}>
              <Icon name="upload" size={40} />
            </div>
            <p style={{ fontWeight: 600, fontSize: '14px', margin: '0 0 4px 0', color: 'var(--text-main)' }}>
              Drag & drop your participants CSV here, or click to browse
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              File should contain a list of email addresses, one per line (with optional email header)
            </p>
          </div>

          {csvFileName && (
            <div style={{ marginTop: '16px', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '6px', backgroundColor: 'var(--bg-surface)' }}>
              <strong style={{ fontSize: '12px', color: 'var(--text-main)' }}>Staged File: </strong>
              <span style={{ fontSize: '12px', color: 'var(--text-main)' }}>{csvFileName} ({csvEmails.length} emails detected)</span>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default QuizEditor;
