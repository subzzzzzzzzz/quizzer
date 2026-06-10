import React, { useState } from 'react';
import { useGetQuizzesQuery } from '../../services/api';
import type { Quiz } from '../../services/api';
import Card from '../../components/molecules/Card/Card';
import Button from '../../components/atoms/Button/Button';
import Input from '../../components/atoms/Input/Input';
import Tag from '../../components/atoms/Tag/Tag';
import Spinner from '../../components/atoms/Spinner/Spinner';
import Modal from '../../components/molecules/Modal/Modal';
import Table from '../../components/organisms/Table/Table';
import type { ColumnType } from '../../components/organisms/Table/Table';
import Icon from '../../components/atoms/Icon/Icon';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import AdminQuizResults from '../admin/AdminQuizResults';


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

const formatInstructorScheduledTime = (start?: string) => {
  if (!start) return '—';
  const date = new Date(start);
  const day = String(date.getDate()).padStart(2, '0');
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day} ${month} - ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
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

export const InstructorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);

  const { user } = useSelector((state: RootState) => state.auth);
  const { data: quizzesResponse, isLoading: quizzesLoading } = useGetQuizzesQuery();

  const quizzes = quizzesResponse?.data || [];

  // Filter quizzes created by this instructor or by admin users
  const instructorQuizzes = quizzes.filter((q) => {
    const inst = q.instructorId;
    if (typeof inst === 'object' && inst !== null) {
      return inst._id === user?.id || (inst as any).role === 'admin';
    }
    return inst === user?.id;
  });

  const filteredQuizzes = instructorQuizzes.filter((q) =>
    q.title.toLowerCase().includes(searchText.toLowerCase())
  );

  const columns: ColumnType<Quiz>[] = [
    {
      title: 'ID',
      key: 'id',
      render: (_, record) => (
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
          {getQuizCode(record.title, 'instructor')}
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
      title: 'SCHEDULED TIME',
      key: 'window',
      render: (_, record) => (
        <span>{formatInstructorScheduledTime(record.startTime)}</span>
      ),
    },
    {
      title: 'STATUS',
      key: 'status',
      dataIndex: 'status',
      render: (status) => getInstructorStatusTag(String(status)),
    },
    {
      title: 'ACTION',
      key: 'actions',
      render: (_, record) => {
        if (record.status === 'Draft' || record.status === 'Scheduled') {
          return (
            <Button
              variant="secondary"
              size="small"
              onClick={() => navigate(`/quizzes/${record._id}/edit`)}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--text-main)',
                backgroundColor: 'var(--bg-base)',
                borderColor: 'var(--border-color)',
                padding: '4px 12px',
                minWidth: '60px',
              }}
            >
              Edit
            </Button>
          );
        }
        return <span style={{ color: 'var(--text-muted)' }}>—</span>;
      },
    },
  ];

  // SVG Donut Calculations for Instructor's Quizzes (Completed, Scheduled, Cancelled)
  const completedCount = instructorQuizzes.filter(q => q.status === 'Completed').length;
  const scheduledCount = instructorQuizzes.filter(q => q.status === 'Scheduled').length;
  const cancelledCount = instructorQuizzes.filter(q => q.status === 'Cancelled').length;
  const totalQuizzesCount = completedCount + scheduledCount + cancelledCount;

  const pCompleted = totalQuizzesCount > 0 ? (completedCount / totalQuizzesCount) * 100 : 0;
  const pScheduled = totalQuizzesCount > 0 ? (scheduledCount / totalQuizzesCount) * 100 : 0;
  const pCancelled = totalQuizzesCount > 0 ? (cancelledCount / totalQuizzesCount) * 100 : 0;

  const offsetCompleted = 25;
  const offsetScheduled = offsetCompleted - pCompleted;
  const offsetCancelled = offsetScheduled - pScheduled;

  const legendItems = [
    { label: 'Completed', count: completedCount, color: 'var(--secondary-2)' },
    { label: 'Scheduled', count: scheduledCount, color: 'var(--primary-2)' },
    { label: 'Cancelled', count: cancelledCount, color: 'var(--danger-2)' },
  ];

  const getTodayDateStr = () => {
    const date = new Date();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const month = months[date.getMonth()];
    return `${date.getDate()} ${month} ${date.getFullYear()}`;
  };

  if (quizzesLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Spinner size="large" tip="Loading instructor workspace..." />
      </div>
    );
  }

  return (
    <div data-testid="instructor-dashboard">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text-heading)', margin: 0, fontSize: '22px', fontWeight: 700 }}>Instructor Dashboard</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Your quiz activity for today</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', alignItems: 'start' }}>
        {/* Statistics Card (Donut Chart) */}
        <div>
          <Card bordered>
            <div style={{ padding: '4px' }}>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)' }}>Today's Quiz Status</h3>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', marginBottom: '20px' }}>{getTodayDateStr()}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', marginTop: '12px' }}>
              <svg width="130" height="130" viewBox="0 0 42 42">
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--border-color)" strokeWidth="4px" />
                {totalQuizzesCount > 0 && (
                  <>
                    {pCompleted > 0 && (
                      <circle
                        cx="21" cy="21" r="15.915" fill="transparent"
                        stroke="var(--secondary-2)" strokeWidth="4px"
                        strokeDasharray={`${pCompleted} ${100 - pCompleted}`}
                        strokeDashoffset={offsetCompleted}
                      />
                    )}
                    {pScheduled > 0 && (
                      <circle
                        cx="21" cy="21" r="15.915" fill="transparent"
                        stroke="var(--primary-2)" strokeWidth="4px"
                        strokeDasharray={`${pScheduled} ${100 - pScheduled}`}
                        strokeDashoffset={offsetScheduled}
                      />
                    )}
                    {pCancelled > 0 && (
                      <circle
                        cx="21" cy="21" r="15.915" fill="transparent"
                        stroke="var(--danger-2)" strokeWidth="4px"
                        strokeDasharray={`${pCancelled} ${100 - pCancelled}`}
                        strokeDashoffset={offsetCancelled}
                      />
                    )}
                  </>
                )}
                <g>
                  <text x="50%" y="46%" dominantBaseline="middle" textAnchor="middle" fill="var(--text-main)" fontSize="7" fontWeight="bold">
                    {totalQuizzesCount}
                  </text>
                  <text x="50%" y="62%" dominantBaseline="middle" textAnchor="middle" fill="var(--text-muted)" fontSize="3.5" fontWeight="500">
                    My Quizzes
                  </text>
                </g>
              </svg>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {legendItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color, marginRight: '8px', display: 'inline-block' }} />
                  <span style={{ color: 'var(--text-main)', flexGrow: 1, fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)', width: '30px', textAlign: 'right' }}>{item.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* My Quizzes Table Card */}
        <div>
          <Card
            title="My Quizzes"
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
              loading={quizzesLoading}
              pagination={{ pageSize: 5 }}
              size="middle"
            />
          </Card>
        </div>
      </div>

      {/* Completed Quiz Results Modal */}
      {selectedQuizId && (
        <Modal
          open={isResultsModalOpen}
          onCancel={() => {
            setIsResultsModalOpen(false);
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
              setIsResultsModalOpen(false);
              setSelectedQuizId(null);
            }}
          />
        </Modal>
      )}

    </div>
  );
};

export default InstructorDashboard;
