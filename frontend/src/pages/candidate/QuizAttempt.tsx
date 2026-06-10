import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useGetAttemptDetailsQuery,
  useGetQuestionsQuery,
  useSaveAnswersMutation,
  useSubmitAttemptMutation
} from '../../services/api';
import type { Quiz } from '../../services/api';
import Card from '../../components/molecules/Card/Card';
import Button from '../../components/atoms/Button/Button';
import Spinner from '../../components/atoms/Spinner/Spinner';
import Alert from '../../components/atoms/Alert/Alert';
import Modal from '../../components/molecules/Modal/Modal';
import Tag from '../../components/atoms/Tag/Tag';
import Icon from '../../components/atoms/Icon/Icon';
import message from '../../utils/message';

export const QuizAttempt: React.FC = () => {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number[]>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const { data: attemptResponse, isLoading: attemptLoading, error: attemptError } = useGetAttemptDetailsQuery(attemptId || '', { skip: !attemptId });
  const attempt = attemptResponse?.data;

  const quizId = typeof attempt?.quizId === 'object' ? attempt?.quizId._id : attempt?.quizId;
  const { data: questionsResponse, isLoading: questionsLoading } = useGetQuestionsQuery(quizId || '', { skip: !quizId });
  const questions = questionsResponse?.data || [];

  const [saveAnswers] = useSaveAnswersMutation();
  const [submitAttempt, { isLoading: isSubmitting }] = useSubmitAttemptMutation();

  const handleAutoSubmit = useCallback(async () => {
    if (!attemptId) return;
    try {
      await submitAttempt({ attemptId, answers: selectedAnswers }).unwrap();
      setIsSuccessModalOpen(true);
    } catch (err) {
      console.error('Auto submit failed:', err);
    }
  }, [attemptId, selectedAnswers, submitAttempt]);

  // Load existing answers on start
  useEffect(() => {
    if (attempt && attempt.answers) {
      const answersMap: Record<string, number[]> = {};
      Object.entries(attempt.answers).forEach(([qId, val]) => {
        answersMap[qId] = val;
      });
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedAnswers(answersMap);
    }
  }, [attempt]);

  // Timer logic
  useEffect(() => {
    if (!attempt || !attemptResponse || attempt.status !== 'InProgress') return;

    const quizDuration = typeof attempt.quizId === 'object' ? (attempt.quizId as Quiz).duration : 30; // default 30
    const startedAt = new Date(attempt.startedAt).getTime();
    const durationMs = quizDuration * 60 * 1000;
    const endMs = startedAt + durationMs;

    let timer: ReturnType<typeof setInterval> | undefined = undefined;

    const tick = () => {
      const now = new Date().getTime();
      const remainingSecs = Math.max(0, Math.floor((endMs - now) / 1000));
      setTimeLeft(remainingSecs);

      if (remainingSecs <= 0) {
        if (timer) clearInterval(timer);
        handleAutoSubmit();
      }
    };

    tick(); // run initial
    timer = setInterval(tick, 1000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [attempt, attemptResponse, handleAutoSubmit]);

  // Tab switching warning proctor
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && attempt?.status === 'InProgress') {
        message.warning('PROCTOR WARNING: Tab switching is proctored! Please remain on the assessment screen.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [attempt]);

  const handleSelectOption = (questionId: string, optionIdx: number, isMulti: boolean) => {
    const currentSelected = selectedAnswers[questionId] || [];

    if (isMulti) {
      const nextSelected = currentSelected.includes(optionIdx)
        ? currentSelected.filter((idx) => idx !== optionIdx)
        : [...currentSelected, optionIdx];
      setSelectedAnswers({ ...selectedAnswers, [questionId]: nextSelected });
    } else {
      setSelectedAnswers({ ...selectedAnswers, [questionId]: [optionIdx] });
    }
  };

  const handleSaveAndNext = async () => {
    if (!attemptId) return;
    try {
      await saveAnswers({ attemptId, answers: selectedAnswers }).unwrap();
      if (currentIdx < questions.length - 1) {
        setCurrentIdx(currentIdx + 1);
      }
    } catch {
      message.error('Failed to auto-save selected answers.');
    }
  };

  const handleSaveAndPrev = async () => {
    if (!attemptId) return;
    try {
      await saveAnswers({ attemptId, answers: selectedAnswers }).unwrap();
      if (currentIdx > 0) {
        setCurrentIdx(currentIdx - 1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleManualSubmit = async () => {
    if (!attemptId) return;
    try {
      await submitAttempt({ attemptId, answers: selectedAnswers }).unwrap();
      setIsSubmitModalOpen(false);
      setIsSuccessModalOpen(true);
    } catch (err: unknown) {
      const errPayload = err as { data?: { message?: string } };
      message.error(errPayload.data?.message || 'Submission failed');
    }
  };

  if (attemptLoading || questionsLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--bg-base)' }}>
        <Spinner size="large" tip="Entering secure proctored environment..." />
      </div>
    );
  }

  if (attemptError || !attempt) {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '40px auto' }}>
        <Alert message="Authentication Error" description="Unable to load proctored session details." type="error" showIcon />
      </div>
    );
  }

  if (attempt.status !== 'InProgress') {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '40px auto', textAlign: 'center' }}>
        <Card bordered>
          <div style={{ color: 'var(--color-success)', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
            <Icon name="check" size={48} />
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-main)' }}>Assessment Completed</h2>
          <p style={{ marginTop: '8px', color: 'var(--text-muted)' }}>This attempt has already been submitted.</p>
          <Button variant="primary" onClick={() => navigate('/upcoming')} style={{ marginTop: '20px' }}>
            Go to Assessments
          </Button>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const isMultiSelect = typeof attempt.quizId === 'object' ? (attempt.quizId as Quiz).questionType === 'multi' : false;

  const formatTimeLeft = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isTimerUrgent = timeLeft < 60;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-base)', padding: '24px', fontFamily: 'var(--font-family)' }}>
      {/* Test Environment Header */}
      <Card bordered bodyStyle={{ padding: '12px 16px' }} style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--text-main)', fontSize: '18px', fontWeight: 700 }}>
              {typeof attempt.quizId === 'object' ? (attempt.quizId as Quiz).title : 'Assessment'}
            </h2>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px' }}>SECURE PROCTORED MODE ACTIVE</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Clock timer */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '6px',
                backgroundColor: isTimerUrgent ? 'var(--danger-0)' : 'var(--bg-surface-hover)',
                border: `1px solid ${isTimerUrgent ? 'var(--color-error)' : 'var(--border-color)'}`,
                color: isTimerUrgent ? 'var(--color-error)' : 'var(--text-main)',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              <Icon name="timer" size={18} color={isTimerUrgent ? 'var(--color-error)' : 'currentColor'} />
              <span>{formatTimeLeft(timeLeft)}</span>
            </div>

            <Button variant="danger" onClick={() => setIsSubmitModalOpen(true)} style={{ fontWeight: 600 }}>
              End Test
            </Button>
          </div>
        </div>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Left Side: Question Pane */}
        <div style={{ gridColumn: 'span 2' }}>
          {currentQuestion ? (
            <Card
              bordered
              bodyStyle={{ padding: '24px', minHeight: '400px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-muted)' }}>
                    Question {currentIdx + 1} of {questions.length}
                  </span>
                  <Tag color="processing">{isMultiSelect ? 'Multi-Select MCQ' : 'Single MCQ'}</Tag>
                </div>

                <h3 style={{ marginBottom: '24px', fontSize: '17px', color: 'var(--text-main)', lineHeight: '24px', fontWeight: 600 }}>
                  {currentQuestion.question}
                </h3>

                {/* Option choices list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                  {currentQuestion.options.map((opt: string, idx: number) => {
                    const isSelected = (selectedAnswers[currentQuestion._id] || []).includes(idx);
                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectOption(currentQuestion._id, idx, isMultiSelect)}
                        style={{
                          padding: '16px 20px',
                          borderRadius: '8px',
                          border: `2px solid ${isSelected ? 'var(--primary-2)' : 'var(--border-color)'}`,
                          backgroundColor: isSelected ? 'var(--primary-0)' : 'var(--bg-surface-hover)',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: isMultiSelect ? '4px' : '50%',
                            border: `2px solid ${isSelected ? 'var(--primary-2)' : 'var(--neutral-4)'}`,
                            backgroundColor: isSelected ? 'var(--primary-2)' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            fontSize: '10px',
                            flexShrink: 0,
                          }}
                        >
                          {isSelected && '✓'}
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{opt}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bottom Navigation Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '20px',
                  marginTop: 'auto',
                }}
              >
                <Button variant="secondary" disabled={currentIdx === 0} onClick={handleSaveAndPrev} style={{ fontWeight: 600 }}>
                  Previous
                </Button>

                {currentIdx < questions.length - 1 ? (
                  <Button variant="primary" onClick={handleSaveAndNext} style={{ fontWeight: 600 }}>
                    Save & Next
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => setIsSubmitModalOpen(true)} style={{ backgroundColor: 'var(--secondary-2)', borderColor: 'var(--secondary-2)', fontWeight: 600 }}>
                    Submit Quiz
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <Card bordered>
              <Spinner size="medium" tip="Loading question..." />
            </Card>
          )}
        </div>

        {/* Right Side: Navigator Pane */}
        <div>
          <Card title="Question Navigator" bordered>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '24px' }}>
              {questions.map((q, idx) => {
                const isAnswered = (selectedAnswers[q._id] || []).length > 0;
                const isActive = idx === currentIdx;

                let btnBg = 'transparent';
                let btnBorder = 'var(--border-color)';
                let btnColor = 'var(--text-main)';

                if (isAnswered) {
                  btnBg = 'var(--primary-2)';
                  btnBorder = 'var(--primary-2)';
                  btnColor = '#fff';
                }
                if (isActive) {
                  btnBorder = 'var(--color-warning)';
                  if (!isAnswered) {
                    btnBg = 'var(--tertiary-0)';
                    btnColor = 'var(--color-warning)';
                  }
                }

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      saveAnswers({ attemptId: attemptId || '', answers: selectedAnswers });
                      setCurrentIdx(idx);
                    }}
                    style={{
                      height: '42px',
                      borderRadius: '6px',
                      border: `2px solid ${btnBorder}`,
                      backgroundColor: btnBg,
                      color: btnColor,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s',
                      fontFamily: 'var(--font-family)',
                    }}
                  >
                    Q{idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Grid Legend labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: 'var(--primary-2)' }} />
                <span style={{ color: 'var(--text-muted)' }}>Answered questions</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '2px solid var(--color-warning)', backgroundColor: 'var(--tertiary-0)' }} />
                <span style={{ color: 'var(--text-muted)' }}>Currently active question</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', border: '2px solid var(--border-color)' }} />
                <span style={{ color: 'var(--text-muted)' }}>Unanswered questions</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Manual Submit Confirmation Dialog */}
      <Modal
        title="Submit Assessment"
        open={isSubmitModalOpen}
        onCancel={() => setIsSubmitModalOpen(false)}
        footer={[
          <Button key="back" variant="secondary" onClick={() => setIsSubmitModalOpen(false)}>Resume Test</Button>,
          <Button key="submit" variant="primary" loading={isSubmitting} onClick={handleManualSubmit} style={{ backgroundColor: 'var(--secondary-2)', borderColor: 'var(--secondary-2)', fontWeight: 600 }}>
            Yes, Submit Quiz
          </Button>
        ]}
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ marginBottom: '12px', color: 'var(--text-main)' }}>Are you sure you want to end your test and submit your answers?</p>
          <div style={{ padding: '8px 12px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '6px', fontSize: '12px', color: 'var(--text-main)' }}>
            <div>Total Questions: <strong>{questions.length}</strong></div>
            <div>Answered: <strong>{Object.values(selectedAnswers).filter(a => a.length > 0).length}</strong></div>
            <div>Unanswered: <strong>{questions.length - Object.values(selectedAnswers).filter(a => a.length > 0).length}</strong></div>
          </div>
        </div>
      </Modal>

      {/* Post-Submit Overlay success modal */}
      <Modal
        open={isSuccessModalOpen}
        footer={null}
        width={440}
        destroyOnClose
      >
        <div style={{ textAlign: 'center', padding: '24px 12px', fontFamily: 'var(--font-family)' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--secondary-0)',
              color: 'var(--color-success)',
              fontSize: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              fontWeight: 'bold',
            }}
          >
            ✓
          </div>
          <h3 style={{ color: 'var(--text-main)', marginBottom: '8px', fontSize: '18px', fontWeight: 700 }}>Thank You!</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '20px', marginBottom: '24px' }}>
            Thank you for completing the assessment. Your answers have been successfully logged.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Button
              variant="primary"
              size="large"
              block
              onClick={() => {
                setIsSuccessModalOpen(false);
                navigate('/dashboard');
              }}
              style={{ fontWeight: 600 }}
            >
              Check Dashboard
            </Button>
            <Button
              variant="secondary"
              size="large"
              block
              onClick={() => {
                const instructorEmail = typeof attempt.quizId === 'object' && typeof (attempt.quizId as Quiz).instructorId === 'object'
                  ? ((attempt.quizId as Quiz).instructorId as { email: string }).email
                  : 'instructor@quizarena.com';
                message.info(`You can reach your instructor at: ${instructorEmail}`);
              }}
              style={{ fontWeight: 600 }}
            >
              Reach Instructor
            </Button>
            <Button
              variant="text"
              size="large"
              block
              onClick={() => {
                setIsSuccessModalOpen(false);
                navigate('/dashboard');
              }}
              style={{ color: 'var(--text-muted)', fontWeight: 500 }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default QuizAttempt;
