import React, { useState } from 'react';
import { useGetQuizzesQuery, useGetGlobalAnalyticsQuery } from '../../services/api';
import { Table, Tag, Input, Space, Button, Card, Row, Col, Typography, Spin, Modal } from 'antd';
import Icon from '../../components/ui/Icon/Icon';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import AdminQuizResults from '../admin/AdminQuizResults';

const { Title, Text } = Typography;

export const InstructorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState('');
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);

  const { user } = useSelector((state: RootState) => state.auth);
  const { data: quizzesResponse, isLoading: quizzesLoading } = useGetQuizzesQuery();
  const { data: analyticsResponse, isLoading: analyticsLoading } = useGetGlobalAnalyticsQuery();

  const quizzes = quizzesResponse?.data || [];
  const analytics = analyticsResponse?.data;

  // Filter quizzes created by this instructor
  const instructorQuizzes = quizzes.filter((q) => {
    const instId = typeof q.instructorId === 'object' ? q.instructorId?._id : q.instructorId;
    return instId === user?.id;
  });

  const filteredQuizzes = instructorQuizzes.filter((q) =>
    q.title.toLowerCase().includes(searchText.toLowerCase())
  );

  // Status Color Mapper
  const getStatusTag = (status: string) => {
    switch (status) {
      case 'Live':
        return <Tag color="success" style={{ fontWeight: 600 }}>LIVE</Tag>;
      case 'Scheduled':
        return <Tag color="processing" style={{ fontWeight: 600 }}>SCHEDULED</Tag>;
      case 'Draft':
        return <Tag color="default" style={{ fontWeight: 600 }}>DRAFT</Tag>;
      case 'Completed':
        return <Tag color="warning" style={{ fontWeight: 600 }}>COMPLETED</Tag>;
      case 'Cancelled':
        return <Tag color="error" style={{ fontWeight: 600 }}>CANCELLED</Tag>;
      default:
        return <Tag color="default" style={{ fontWeight: 600 }}>{status.toUpperCase()}</Tag>;
    }
  };

  const formatWindow = (start?: string, end?: string) => {
    if (!start || !end) return 'Not Scheduled';
    const sDate = new Date(start);
    const eDate = new Date(end);
    const opt: Intl.DateTimeFormatOptions = {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    return `${sDate.toLocaleString('en-US', opt)} - ${eDate.toLocaleString('en-US', opt)}`;
  };

  const columns = [
    {
      title: 'Quiz Title',
      key: 'title',
      render: (record: any) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{record.title}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {record.questionType === 'single' ? 'Single Choice (Select One)' : 'Multiple Choice (Select Multiple)'}
          </div>
        </div>
      ),
    },
    {
      title: 'Duration',
      key: 'duration',
      render: (record: any) => <span>{record.duration} mins</span>,
    },
    {
      title: 'Status',
      key: 'status',
      dataIndex: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: 'Schedule Window',
      key: 'window',
      render: (record: any) => <span>{formatWindow(record.startTime, record.endTime)}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Space size="middle">
          {(record.status === 'Draft' || record.status === 'Scheduled' || record.status === 'Live') && (
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/quizzes/${record._id}/edit`)}
              style={{ padding: 0, fontWeight: 500 }}
            >
              Edit
            </Button>
          )}
          {record.status === 'Completed' && (
            <Button
              type="primary"
              size="small"
              onClick={() => {
                setSelectedQuizId(record._id);
                setIsResultsModalOpen(true);
              }}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: 'var(--secondary-2)',
                borderColor: 'var(--secondary-2)',
              }}
            >
              View Results
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // SVG Donut Calculations for Instructor's Quizzes
  const totalQuizzesCount = instructorQuizzes.length;
  const liveCount = instructorQuizzes.filter(q => q.status === 'Live').length;
  const completedCount = instructorQuizzes.filter(q => q.status === 'Completed').length;
  const draftCount = instructorQuizzes.filter(q => q.status === 'Draft').length;
  const scheduledCount = instructorQuizzes.filter(q => q.status === 'Scheduled').length;
  const cancelledCount = instructorQuizzes.filter(q => q.status === 'Cancelled').length;

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

  const getPctStr = (count: number) => {
    if (totalQuizzesCount === 0) return '0%';
    return `${Math.round((count / totalQuizzesCount) * 100)}%`;
  };

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
        <Spin size="large" tip="Loading instructor workspace..." />
      </div>
    );
  }

  return (
    <div data-testid="instructor-dashboard">
      <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Title level={2} style={{ color: 'var(--text-main)', margin: 0 }}>Instructor Dashboard</Title>
          <Text type="secondary" style={{ color: 'var(--text-muted)' }}>Monitor quiz creations, drafts, schedules, and active attempts</Text>
        </Col>
      </Row>

      {/* Metrics Cards Grid */}
      <Row gutter={[20, 20]} style={{ marginBottom: '24px' }}>
        {[
          { title: 'My Quizzes', value: analytics?.quizzes?.total || 0, icon: 'nav-dashboard', color: 'var(--primary-2)' },
          { title: 'Draft Quizzes', value: analytics?.quizzes?.draft || 0, icon: 'nav-quiz', color: 'var(--tertiary-2)' },
          { title: 'Live Now', value: analytics?.quizzes?.live || 0, icon: 'nav-analytics', color: 'var(--color-success)' },
          { title: 'Total Assigned Candidates', value: analytics?.users?.candidates || 0, icon: 'user-profile', color: 'var(--primary-3)' },
        ].map((card, idx) => (
          <Col xs={24} sm={12} lg={6} key={idx}>
            <Card
              bordered={false}
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
              }}
              styles={{ body: { padding: '20px' } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted)' }}>{card.title}</Text>
                  <Title level={3} style={{ margin: '4px 0 0 0', fontWeight: 700, color: 'var(--text-main)' }}>{card.value}</Title>
                </div>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--neutral-0)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: card.color,
                }}>
                  <Icon name={card.icon as any} size={20} />
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[24, 24]}>
        {/* Statistics Card (Donut Chart) */}
        <Col xs={24} lg={8}>
          <Card
            title="My Quiz Statistics"
            bordered={false}
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              height: '100%',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', marginTop: '12px' }}>
              <svg width="130" height="130" viewBox="0 0 42 42">
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
                    Quizzes
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
                  <span style={{ color: 'var(--text-muted)', width: '40px', textAlign: 'right', fontWeight: 600 }}>{getPctStr(item.count)}</span>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* My Quizzes Table Card */}
        <Col xs={24} lg={16}>
          <Card
            title="My Quizzes"
            extra={
              <Space>
                <Input
                  placeholder="Search quiz title..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{ width: '220px', borderRadius: '6px' }}
                  prefix={<Icon name="nav-dashboard" size={14} style={{ opacity: 0.5 }} />}
                />
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
              </Space>
            }
            bordered={false}
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
            }}
          >
            <Table
              dataSource={filteredQuizzes}
              columns={columns}
              rowKey="_id"
              loading={quizzesLoading}
              pagination={{ pageSize: 5 }}
              size="middle"
              style={{ backgroundColor: 'transparent' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Completed Quiz Results Modal */}
      {selectedQuizId && (
        <Modal
          title={null}
          open={isResultsModalOpen}
          closable={false}
          onCancel={() => {
            setIsResultsModalOpen(false);
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
