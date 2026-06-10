import React, { useState } from 'react';
import { useGetQuizzesQuery, useGetGlobalAnalyticsQuery } from '../../services/api';
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
import AdminQuizResults from './AdminQuizResults';

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

const formatScheduledTime = (start?: string) => {
  if (!start) return '—';
  const date = new Date(start);
  const day = String(date.getDate()).padStart(2, '0');
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day} ${month} ${year} - ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);

  const { data: quizzesResponse, isLoading: quizzesLoading } = useGetQuizzesQuery();
  const { data: analyticsResponse, isLoading: analyticsLoading } = useGetGlobalAnalyticsQuery();

  const quizzes = quizzesResponse?.data || [];
  const analytics = analyticsResponse?.data;

  const filteredQuizzes = quizzes.filter((q) =>
    q.title.toLowerCase().includes(searchText.toLowerCase()) ||
    (typeof q.instructorId !== 'string' && q.instructorId?.name.toLowerCase().includes(searchText.toLowerCase()))
  );

  // Status Color Mapper
  const getStatusTag = (status: string) => {
    switch (status) {
      case 'Live':
        return <Tag color="success">LIVE</Tag>;
      case 'Scheduled':
        return <Tag color="processing">SCHEDULED</Tag>;
      case 'Draft':
        return <Tag color="default">DRAFT</Tag>;
      case 'Completed':
        return <Tag color="warning">COMPLETED</Tag>;
      case 'Cancelled':
        return <Tag color="error">CANCELLED</Tag>;
      default:
        return <Tag color="default">{status.toUpperCase()}</Tag>;
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
      title: 'SCHEDULED TIME',
      key: 'window',
      render: (_, record) => (
        <span>{formatScheduledTime(record.startTime)}</span>
      ),
    },
    {
      title: 'STATUS',
      key: 'status',
      dataIndex: 'status',
      render: (status) => getStatusTag(String(status)),
    },
    {
      title: 'ACTION',
      key: 'actions',
      render: (_, record) => {
        if (record.status === 'Completed') {
          return (
            <Button
              variant="primary"
              size="small"
              onClick={() => {
                setSelectedQuizId(record._id);
                setIsResultsModalOpen(true);
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
        if (record.status === 'Draft' || record.status === 'Scheduled') {
          return (
            <Button
              variant="primary"
              size="small"
              onClick={() => navigate(`/quizzes/${record._id}/edit`)}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: 'var(--primary-2)',
                borderColor: 'var(--primary-2)',
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

  // SVG Donut Calculations
  const totalQuizzesCount = analytics?.quizzes?.total || 0;
  const liveCount = analytics?.quizzes?.live || 0;
  const completedCount = analytics?.quizzes?.completed || 0;
  const draftCount = analytics?.quizzes?.draft || 0;
  const scheduledCount = analytics?.quizzes?.scheduled || 0;
  const cancelledCount = analytics?.quizzes?.cancelled || 0;

  const pLive = totalQuizzesCount > 0 ? (liveCount / totalQuizzesCount) * 100 : 0;
  const pCompleted = totalQuizzesCount > 0 ? (completedCount / totalQuizzesCount) * 100 : 0;
  const pDraft = totalQuizzesCount > 0 ? (draftCount / totalQuizzesCount) * 100 : 0;
  const pScheduled = totalQuizzesCount > 0 ? (scheduledCount / totalQuizzesCount) * 100 : 0;
  const pCancelled = totalQuizzesCount > 0 ? (cancelledCount / totalQuizzesCount) * 100 : 0;

  const offsetLive = 25;
  const offsetCompleted = offsetLive - pLive;
  const offsetDraft = offsetCompleted - pCompleted;
  const offsetScheduled = offsetDraft - pDraft;
  const offsetCancelled = offsetScheduled - pScheduled;



  const legendItems = [
    { label: 'Live', count: liveCount, color: 'var(--secondary-2)' },
    { label: 'Scheduled', count: scheduledCount, color: 'var(--primary-2)' },
    { label: 'Completed', count: completedCount, color: 'var(--tertiary-2)' },
    { label: 'Draft', count: draftCount, color: 'var(--neutral-5)' },
    { label: 'Cancelled', count: cancelledCount, color: 'var(--danger-2)' },
  ];

  if (quizzesLoading || analyticsLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
        <Spinner size="large" tip="Loading admin workspace..." />
      </div>
    );
  }

  return (
    <div data-testid="admin-dashboard">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ color: 'var(--text-heading)', margin: 0, fontSize: '22px', fontWeight: 700 }}>Admin Dashboard</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0 0' }}>Platform overview — Completed quizzes now show View Result</p>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '24px' }}>
        {/* Left card: Donut chart */}
        <Card bordered bodyStyle={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', justifyContent: 'center' }}>
            <svg width="110" height="110" viewBox="0 0 42 42">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--border-color)" strokeWidth="4px" />
              {totalQuizzesCount > 0 && (
                <>
                  {pLive > 0 && (
                    <circle
                      cx="21" cy="21" r="15.915" fill="transparent"
                      stroke="var(--secondary-2)" strokeWidth="4px"
                      strokeDasharray={`${pLive} ${100 - pLive}`}
                      strokeDashoffset={offsetLive}
                    />
                  )}
                  {pCompleted > 0 && (
                    <circle
                      cx="21" cy="21" r="15.915" fill="transparent"
                      stroke="var(--tertiary-2)" strokeWidth="4px"
                      strokeDasharray={`${pCompleted} ${100 - pCompleted}`}
                      strokeDashoffset={offsetCompleted}
                    />
                  )}
                  {pDraft > 0 && (
                    <circle
                      cx="21" cy="21" r="15.915" fill="transparent"
                      stroke="var(--neutral-5)" strokeWidth="4px"
                      strokeDasharray={`${pDraft} ${100 - pDraft}`}
                      strokeDashoffset={offsetDraft}
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
                  quizzes
                </text>
              </g>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {legendItems.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', fontSize: '11px', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: item.color, display: 'inline-block' }} />
                  <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Right cards grid: 2x2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {[
            { title: 'COMPLETED', value: completedCount, color: 'var(--secondary-2)' },
            { title: 'SCHEDULED', value: scheduledCount, color: 'var(--primary-2)' },
            { title: 'DRAFT', value: draftCount, color: 'var(--tertiary-2)' },
            { title: 'CANCELLED', value: cancelledCount, color: 'var(--danger-2)' },
          ].map((card, idx) => (
            <Card bordered key={idx} bodyStyle={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h3 style={{ margin: 0, fontWeight: 700, color: card.color, fontSize: '26px', lineHeight: '32px' }}>{card.value}</h3>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', marginTop: '2px' }}>{card.title}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Quizzes List Table */}
      <div style={{ marginBottom: '24px' }}>
        <Card
          title="All Quizzes"
          extra={
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <Input
                placeholder="Search quiz title or instructor..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: '240px' }}
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

      {/* Admin Completed Quiz Results Modal */}
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
          showHeader={false}
          bodyStyle={{ padding: 0 }}
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

export default AdminDashboard;
