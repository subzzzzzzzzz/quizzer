import React, { useState } from 'react';
import { useGetQuizzesQuery, useStartAttemptMutation, useGetAttemptReportQuery } from '../../services/api';
import type { Quiz } from '../../services/api';
import Card from '../../components/molecules/Card/Card';
import Button from '../../components/atoms/Button/Button';
import Input from '../../components/atoms/Input/Input';
import Tag from '../../components/atoms/Tag/Tag';
import Spinner from '../../components/atoms/Spinner/Spinner';
import Table from '../../components/organisms/Table/Table';
import type { ColumnType } from '../../components/organisms/Table/Table';
import Icon from '../../components/atoms/Icon/Icon';
import { useNavigate } from 'react-router-dom';
import message from '../../utils/message';
import Modal from '../../components/molecules/Modal/Modal';
import Checkbox from '../../components/atoms/Checkbox/Checkbox';
import Alert from '../../components/atoms/Alert/Alert';


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

const formatCandidateDate = (start?: string) => {
  if (!start) return '—';
  const date = new Date(start);
  const day = String(date.getDate()).padStart(2, '0');
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const getCandidateStatus = (quiz: Quiz) => {
  const t = quiz.title.toLowerCase();
  const isCompleted = quiz.status === 'Completed' || quiz.candidateAttempt?.status === 'Submitted' || quiz.candidateAttempt?.status === 'AutoSubmitted';
  if (isCompleted) return 'Completed';
  if (quiz.status === 'Live') return 'Live Now';
  if (quiz.status === 'Cancelled') return 'Cancelled';
  if (quiz.status === 'Scheduled') {
    if (t.includes('python oop')) return 'Upcoming';
    return 'Scheduled';
  }
  return quiz.status;
};

const getCandidateStatusTag = (quiz: Quiz) => {
  const status = getCandidateStatus(quiz);
  switch (status) {
    case 'Completed':
      return <Tag color="success">✓ Completed</Tag>;
    case 'Live Now':
      return (
        <Tag color="success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--secondary-2)' }} />
          Live Now
        </Tag>
      );
    case 'Scheduled':
      return <Tag color="processing">Scheduled</Tag>;
    case 'Upcoming':
      return <Tag color="default">Upcoming</Tag>;
    case 'Cancelled':
      return <Tag color="error">Cancelled</Tag>;
    default:
      return <Tag color="default">{status}</Tag>;
  }
};

export const formatTimeSpent = (attempt?: { timeTaken?: number } | null) => {
  if (!attempt || attempt.timeTaken === undefined || attempt.timeTaken === null) return '—';
  const t = attempt.timeTaken;
  if (t < 60) {
    return `${t} sec`;
  }
  const mins = Math.floor(t / 60);
  const secs = t % 60;
  if (secs === 0) {
    return `${mins} min`;
  }
  return `${mins} min ${secs} sec`;
};


const getStudentId = (email: string): string => {
  if (email === 'candidate@quizarena.com') return 'STU001';
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idNum = Math.abs(hash % 100).toString().padStart(3, '0');
  return `STU${idNum}`;
};

const CandidateResultModal: React.FC<{
  attemptId: string;
  open: boolean;
  onClose: () => void;
}> = ({ attemptId, open, onClose }) => {
  const { data: reportResponse, isLoading, error } = useGetAttemptReportQuery(attemptId, { skip: !attemptId });
  const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
  const [filterMode, setFilterMode] = useState<'all' | 'correct' | 'incorrect'>('all');

  if (!open) return null;

  if (isLoading) {
    return (
      <Modal open={open} onCancel={onClose} footer={null} width={500}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
          <Spinner size="large" tip="Loading report..." />
        </div>
      </Modal>
    );
  }

  if (error || !reportResponse?.data) {
    return (
      <Modal open={open} onCancel={onClose} footer={null} width={500}>
        <div style={{ padding: '20px' }}>
          <Alert type="error" message="Failed to load results report" showIcon />
        </div>
      </Modal>
    );
  }

  const report = reportResponse.data;
  const quizTitle = typeof report.attempt.quizId === 'object' ? (report.attempt.quizId as any).title : 'Assessment';
  
  const formatMMSS = (sec?: number) => {
    if (sec === undefined || sec === null) return '00:00';
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const correctCount = report.summary.correctCount;
  const skippedCount = report.details.filter((d: any) => !d.candidateAnswers || d.candidateAnswers.length === 0).length;
  const incorrectCount = report.summary.totalQuestions - correctCount - skippedCount;
  const percentage = report.summary.percentage;

  let feedbackText = 'Good effort!';
  let feedbackColor = '#d97706';
  let feedbackBg = '#fef3c7';
  let feedbackBorder = '1px solid rgba(217, 119, 6, 0.25)';
  let scoreBoxBg = 'linear-gradient(180deg, var(--neutral-1) 0%, rgba(217, 119, 6, 0.08) 100%)';

  if (percentage >= 90) {
    feedbackText = 'Excellent!';
    feedbackColor = '#16a34a';
    feedbackBg = '#e2f9eb';
    feedbackBorder = '1px solid rgba(22, 163, 74, 0.25)';
    scoreBoxBg = 'linear-gradient(180deg, var(--neutral-1) 0%, rgba(22, 163, 74, 0.08) 100%)';
  } else if (percentage >= 75) {
    feedbackText = 'Great job!';
    feedbackColor = '#16a34a';
    feedbackBg = '#e2f9eb';
    feedbackBorder = '1px solid rgba(22, 163, 74, 0.25)';
    scoreBoxBg = 'linear-gradient(180deg, var(--neutral-1) 0%, rgba(22, 163, 74, 0.08) 100%)';
  } else if (percentage >= 40) {
    feedbackText = 'Good effort!';
    feedbackColor = '#d97706';
    feedbackBg = '#fef3c7';
    feedbackBorder = '1px solid rgba(217, 119, 6, 0.25)';
    scoreBoxBg = 'linear-gradient(180deg, var(--neutral-1) 0%, rgba(217, 119, 6, 0.08) 100%)';
  } else {
    feedbackText = 'Keep practicing!';
    feedbackColor = '#dc2626';
    feedbackBg = '#fee2e2';
    feedbackBorder = '1px solid rgba(220, 38, 38, 0.25)';
    scoreBoxBg = 'linear-gradient(180deg, var(--neutral-1) 0%, rgba(220, 38, 38, 0.08) 100%)';
  }

  const formatDateCompleted = (iso?: string) => {
    if (!iso) return '';
    const dateObj = new Date(iso);
    if (isNaN(dateObj.getTime())) return '';
    const day = dateObj.getDate();
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = months[dateObj.getMonth()];
    return `Completed ${day} ${month} ${dateObj.getFullYear()}`;
  };

  if (viewMode === 'summary') {
    return (
      <Modal open={open} onCancel={onClose} footer={null} showHeader={false} width={560}>
        <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', padding: '20px 24px 16px 24px', margin: '0 -24px 0 -24px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 4px 0' }}>
                {quizTitle} — My Result
              </h3>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                {getQuizCode(quizTitle)} · {formatDateCompleted(report.attempt.submittedAt)}
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close Modal"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-surface-hover)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
              }}
            >
              <Icon name="x-close" size={14} />
            </button>
          </div>

          <div style={{ padding: '28px 24px 20px 24px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', margin: '0 -24px 0 -24px', background: scoreBoxBg }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.75px' }}>
              Total Score
            </div>
            <div style={{ margin: '8px 0', display: 'inline-flex', alignItems: 'baseline', justifyContent: 'center' }}>
              <span style={{ fontSize: '56px', fontWeight: 800, color: 'var(--primary-2)', lineHeight: '1' }}>{report.attempt.score}</span>
              <span style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-muted)', marginLeft: '4px' }}>/{report.summary.totalQuestions}</span>
            </div>
            <div>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: 700,
                color: feedbackColor,
                backgroundColor: feedbackBg,
                border: feedbackBorder,
                padding: '6px 14px',
                borderRadius: '20px',
              }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: feedbackColor }}
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 15 15" />
                </svg>
                {percentage}% · {feedbackText}
              </span>
            </div>
          </div>

          <div style={{ padding: '24px 0', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { label: 'CORRECT', value: correctCount, color: '#16a34a' },
              { label: 'INCORRECT', value: incorrectCount, color: '#ef4444' },
              { label: 'SKIPPED', value: skippedCount, color: 'var(--text-muted)' },
              { label: 'TIME SPENT', value: formatMMSS(report.attempt.timeTaken), color: 'var(--text-main)' }
            ].map((stat, idx) => (
              <div key={idx} style={{
                backgroundColor: 'var(--neutral-1)',
                border: '1px solid var(--border-color)',
                borderRadius: '10px',
                padding: '16px 8px',
                textAlign: 'center',
              }}>
                <div style={{ fontSize: '22px', fontWeight: 800, color: stat.color, marginBottom: '4px', lineHeight: '1.2' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px 16px 24px', margin: '0 -24px -24px -24px', backgroundColor: 'var(--neutral-0)' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>
              Each correct answer = 1 mark · No negative marking
            </span>
            <Button
              variant="primary"
              onClick={() => setViewMode('detailed')}
              style={{
                backgroundColor: 'var(--primary-2)',
                borderColor: 'var(--primary-2)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '12px',
                padding: '8px 16px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '2px' }}>
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              View Detailed Result
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  const filteredDetails = report.details.filter((q: any) => {
    if (filterMode === 'correct') return q.isCorrect;
    if (filterMode === 'incorrect') return !q.isCorrect;
    return true;
  });

  return (
    <Modal open={open} onCancel={onClose} footer={null} showHeader={false} width={800}>
      <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', padding: '16px 24px', margin: '0 -24px 20px -24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => setViewMode('summary')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-surface)',
                cursor: 'pointer',
                transition: 'all 0.2s',
                height: '38px',
              }}
            >
              <span style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: 1 }}>←</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: '1.1' }}>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>My</span>
                <span style={{ fontSize: '11px', color: 'var(--text-main)', fontWeight: 700 }}>Result</span>
              </div>
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-heading)', margin: 0, lineHeight: 1.2 }}>
                {quizTitle} — Detailed View
              </h3>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                {report.candidate.name} · {getStudentId(report.candidate.email)} · Score: {report.attempt.score}/{report.summary.totalQuestions} ({percentage}%)
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              onClick={() => setFilterMode(filterMode === 'correct' ? 'all' : 'correct')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px 4px 6px',
                borderRadius: '24px',
                border: filterMode === 'correct' ? '1.5px solid #16a34a' : '1px solid rgba(22, 163, 74, 0.3)',
                backgroundColor: filterMode === 'correct' ? '#e2f9eb' : 'transparent',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.2s',
                height: '32px',
              }}
            >
              <span style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#16a34a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 700,
              }}>
                ✓
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#16a34a' }}>{correctCount}</span>
                <span style={{ fontSize: '8px', fontWeight: 600, color: 'rgba(22, 163, 74, 0.8)', textTransform: 'lowercase' }}>correct</span>
              </div>
            </div>

            <div
              onClick={() => setFilterMode(filterMode === 'incorrect' ? 'all' : 'incorrect')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px 4px 6px',
                borderRadius: '24px',
                border: filterMode === 'incorrect' ? '1.5px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.3)',
                backgroundColor: filterMode === 'incorrect' ? '#fee2e2' : 'transparent',
                cursor: 'pointer',
                userSelect: 'none',
                transition: 'all 0.2s',
                height: '32px',
              }}
            >
              <span style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 700,
              }}>
                ✗
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#ef4444' }}>{incorrectCount}</span>
                <span style={{ fontSize: '8px', fontWeight: 600, color: 'rgba(239, 68, 68, 0.8)', textTransform: 'lowercase' }}>incorrect</span>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close Modal"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-surface-hover)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                marginLeft: '8px',
              }}
            >
              <Icon name="x-close" size={14} />
            </button>
          </div>
        </div>

        <div style={{
          maxHeight: '60vh',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          padding: '4px 24px 12px 24px',
          margin: '0 -24px 0 -24px',
        }}>
          {filteredDetails.map((item: any, index: number) => {
            const isQuestionCorrect = item.isCorrect;
            return (
              <div
                key={index}
                style={{
                  border: isQuestionCorrect ? '1px solid var(--border-color)' : '1px solid var(--danger-1)',
                  backgroundColor: isQuestionCorrect ? 'var(--bg-surface)' : 'var(--danger-0)',
                  borderRadius: '12px',
                  padding: '20px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', gap: '16px', flexGrow: 1 }}>
                  {/* Question ID */}
                  <span style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    width: '20px',
                    flexShrink: 0,
                    textAlign: 'right',
                    marginTop: '2px',
                  }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>

                  {/* Question Content */}
                  <div style={{ flexGrow: 1 }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text-heading)',
                      marginBottom: '16px',
                      lineHeight: '1.4',
                    }}>
                      {item.question}
                    </div>

                    {/* Options Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '12px 24px',
                    }}>
                      {item.options.map((opt: string, optIdx: number) => {
                        const isSelected = item.candidateAnswers.includes(optIdx);
                        const isCorrectAnswer = item.correctAnswers.includes(optIdx);

                        let labelColor = 'var(--text-main)';
                        let suffix = '';
                        let radio = null;

                        if (isQuestionCorrect) {
                          if (isSelected) {
                            labelColor = '#16a34a';
                            radio = (
                              <span style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                border: '2px solid #16a34a',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                <span style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: '#16a34a',
                                }} />
                              </span>
                            );
                          } else {
                            radio = (
                              <span style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                border: '2px solid var(--neutral-4)',
                                display: 'inline-block',
                                flexShrink: 0,
                              }} />
                            );
                          }
                        } else {
                          // Question is incorrect
                          if (isSelected) {
                            labelColor = '#ef4444';
                            suffix = ' - Your answer';
                            radio = (
                              <span style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                border: '2px solid #ef4444',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}>
                                <span style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: '#ef4444',
                                }} />
                              </span>
                            );
                          } else if (isCorrectAnswer) {
                            labelColor = '#16a34a';
                            suffix = ' - Correct';
                            radio = (
                              <span style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                border: '2px solid #16a34a',
                                display: 'inline-block',
                                flexShrink: 0,
                              }} />
                            );
                          } else {
                            radio = (
                              <span style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                border: '2px solid var(--neutral-4)',
                                display: 'inline-block',
                                flexShrink: 0,
                              }} />
                            );
                          }
                        }

                        return (
                          <div
                            key={optIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              fontSize: '13px',
                              color: labelColor,
                              fontWeight: (isSelected || isCorrectAnswer) ? 600 : 400,
                            }}
                          >
                            {radio}
                            <span>
                              {opt}
                              {suffix && (
                                <span style={{
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  opacity: 0.85,
                                  marginLeft: '4px',
                                }}>
                                  {suffix}
                                </span>
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Status Icon Column */}
                <div style={{ display: 'flex', alignItems: 'flex-start', paddingTop: '2px' }}>
                  {isQuestionCorrect ? (
                    <span style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#e2f9eb',
                      color: '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: '1px solid rgba(22, 163, 74, 0.25)',
                    }}>
                      ✓
                    </span>
                  ) : (
                    <span style={{
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#fee2e2',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: '1px solid rgba(220, 38, 38, 0.25)',
                    }}>
                      ✗
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

export const CandidateDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedQuizForInstructions, setSelectedQuizForInstructions] = useState<Quiz | null>(null);
  const [preTestConsent, setPreTestConsent] = useState(false);
  const [searchText, setSearchText] = useState('');

  const { data: quizzesResponse, isLoading: quizzesLoading, refetch } = useGetQuizzesQuery();
  const [startAttempt, { isLoading: isStarting }] = useStartAttemptMutation();

  const quizzes = quizzesResponse?.data || [];
  const filteredQuizzes = quizzes.filter(q =>
    q.title.toLowerCase().includes(searchText.toLowerCase())
  );

  // Categorize quizzes
  const liveQuizzes = quizzes.filter(
    (q) =>
      q.status === 'Live' &&
      q.candidateAttempt?.status !== 'Submitted' &&
      q.candidateAttempt?.status !== 'AutoSubmitted'
  );

  const scheduledQuizzes = quizzes.filter((q) => q.status === 'Scheduled');

  const completedQuizzes = quizzes.filter(
    (q) =>
      q.status === 'Completed' ||
      q.candidateAttempt?.status === 'Submitted' ||
      q.candidateAttempt?.status === 'AutoSubmitted'
  );

  // Start attempt click handlers
  const handleStartClick = (quiz: Quiz) => {
    if (quiz.candidateAttempt?.status === 'InProgress') {
      navigate(`/quiz-attempt/${quiz.candidateAttempt.id}`);
    } else {
      setSelectedQuizForInstructions(quiz);
      setPreTestConsent(false);
    }
  };

  const handleStartConfirm = async () => {
    if (!selectedQuizForInstructions) return;
    const quizId = selectedQuizForInstructions._id;
    setSelectedQuizForInstructions(null);
    try {
      const response = await startAttempt({ quizId }).unwrap();
      if (response.success && response.data) {
        message.success('Assessment started successfully');
        refetch();
        navigate(`/quiz-attempt/${response.data._id}`);
      }
    } catch (err: unknown) {
      console.error('Failed to start attempt:', err);
      const errPayload = err as { data?: { message?: string } };
      message.error(errPayload.data?.message || 'Failed to start assessment. Please try again.');
    }
  };

  const columns: ColumnType<Quiz>[] = [
    {
      title: 'ID',
      key: 'id',
      render: (_, record) => (
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
          {getQuizCode(record.title)}
        </span>
      ),
    },
    {
      title: 'QUIZ TITLE',
      key: 'title',
      render: (_, record) => (
        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
          {record.title}
        </span>
      ),
    },
    {
      title: 'DATE',
      key: 'date',
      render: (_, record) => (
        <span>{formatCandidateDate(record.startTime || record.createdAt)}</span>
      ),
    },
    {
      title: 'STATUS',
      key: 'status',
      render: (_, record) => getCandidateStatusTag(record),
    },
    {
      title: 'TIME SPENT',
      key: 'timeSpent',
      render: (_, record) => (
        <span>{formatTimeSpent(record.candidateAttempt)}</span>
      ),
    },
    {
      title: 'ACTION',
      key: 'action',
      render: (_, record) => {
        const status = getCandidateStatus(record);
        
        if (status === 'Completed') {
          const attemptId = record.candidateAttempt?.id;
          return (
            <Button
              variant="primary"
              size="small"
              onClick={() => {
                if (attemptId) {
                  setSelectedAttemptId(attemptId);
                  setIsDrawerOpen(true);
                } else {
                  message.info('You did not attempt this quiz. No grade report is available.');
                }
              }}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: 'var(--primary-2)',
                borderColor: 'var(--primary-2)',
              }}
            >
              View Result
            </Button>
          );
        }

        if (record.status === 'Live') {
          const isInProgress = record.candidateAttempt?.status === 'InProgress';
          return (
            <Button
              variant="primary"
              size="small"
              loading={isStarting}
              onClick={() => handleStartClick(record)}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: 'var(--secondary-2)',
                borderColor: 'var(--secondary-2)',
              }}
            >
              {isInProgress ? 'Resume Test' : 'Start Test'}
            </Button>
          );
        }

        if (status === 'Scheduled' || status === 'Upcoming') {
          if (!record.startTime) return '—';
          const date = new Date(record.startTime);
          const day = date.getDate();
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const month = months[date.getMonth()];
          return <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Opens {day} {month}</span>;
        }

        return <span style={{ color: 'var(--text-muted)' }}>—</span>;
      },
    },
  ];

  if (quizzesLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Spinner size="large" tip="Loading candidate workspace..." />
      </div>
    );
  }

  return (
    <div data-testid="candidate-dashboard">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text-heading)', margin: 0, fontSize: '22px', fontWeight: 700 }}>Dashboard</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>
          Your quiz overview — {completedQuizzes.length} completed, {liveQuizzes.length} live, {scheduledQuizzes.length} upcoming
        </p>
      </div>

      {/* Metrics Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        {[
          { title: 'Total Assigned', value: quizzes.length, color: 'var(--primary-2)' },
          { title: 'Participated', value: completedQuizzes.length, color: 'var(--secondary-2)' },
          { title: 'Scheduled', value: scheduledQuizzes.length, color: 'var(--tertiary-2)' },
          { title: 'Live Now', value: liveQuizzes.length, color: 'var(--color-success)' },
        ].map((card, idx) => (
          <Card
            bordered
            key={idx}
            bodyStyle={{ padding: '20px' }}
          >
            <div>
              <h3 style={{ margin: 0, fontWeight: 700, color: 'var(--text-heading)', fontSize: '26px', lineHeight: '32px' }}>{card.value}</h3>
              <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-muted)', marginTop: '2px' }}>{card.title}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* All Quizzes Card */}
      <Card
        title="All Quizzes"
        extra={
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <Input
              placeholder="Search quizzes..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: '220px' }}
              prefix={<Icon name="search" size={14} style={{ opacity: 0.5 }} />}
            />
          </div>
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

      {/* Assessment Attempt Report Modal Popup */}
      {selectedAttemptId && (
        <CandidateResultModal
          attemptId={selectedAttemptId}
          open={isDrawerOpen}
          onClose={() => {
            setIsDrawerOpen(false);
            setSelectedAttemptId(null);
          }}
        />
      )}

      {/* Pre-test Instructions & Consent Modal */}
      {selectedQuizForInstructions && (
        <Modal
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main)' }}>
              <Icon name="nav-quiz" size={20} />
              <span style={{ fontWeight: 700, fontSize: '16px' }}>
                Instructions & Consent: {selectedQuizForInstructions.title}
              </span>
            </div>
          }
          open={!!selectedQuizForInstructions}
          onCancel={() => setSelectedQuizForInstructions(null)}
          footer={[
            <Button
              key="cancel"
              variant="secondary"
              onClick={() => setSelectedQuizForInstructions(null)}
            >
              Cancel
            </Button>,
            <Button
              key="begin"
              variant="primary"
              disabled={!preTestConsent}
              loading={isStarting}
              onClick={handleStartConfirm}
              style={{
                backgroundColor: !preTestConsent ? 'var(--neutral-3)' : 'var(--secondary-2)',
                borderColor: !preTestConsent ? 'var(--neutral-3)' : 'var(--secondary-2)',
                fontWeight: 600
              }}
            >
              Begin Assessment
            </Button>
          ]}
          width={540}
          destroyOnClose
        >
          <div style={{ padding: '12px 0', color: 'var(--text-main)', lineHeight: '20px' }}>
            <Alert
              message="Attention Required"
              description="Please review the rules and confirm your environment settings before starting."
              type="warning"
              showIcon
              style={{ marginBottom: '16px', borderRadius: '6px' }}
            />
            
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>1. General Rules</h4>
            <ul style={{ paddingLeft: '20px', margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              <li><strong>Time Limit:</strong> {selectedQuizForInstructions.duration} minutes.</li>
              <li>Once started, the assessment cannot be paused or stopped.</li>
              <li>Navigating away from the window or losing focus is monitored.</li>
            </ul>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>2. Network Connection Warning</h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Make sure you have a highly stable internet connection. Network outages or disconnections might lock your attempt or result in loss of progress.
            </p>

            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>3. Auto-submit Policy</h4>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              When the time limit is reached, your current choices will be automatically submitted, and your session will close.
            </p>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <Checkbox
                checked={preTestConsent}
                onChange={(checked) => setPreTestConsent(checked)}
              >
                <span style={{ fontSize: '13px', fontWeight: 500, userSelect: 'none' }}>
                  I have read the rules, network warning, and auto-submit notice, and I consent to start this attempt.
                </span>
              </Checkbox>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CandidateDashboard;
