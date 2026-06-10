import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminQuizResults from '../admin/AdminQuizResults';
import { Button } from 'antd';
import Icon from '../../components/ui/Icon/Icon';

export const QuizAnalyticsDetail: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  if (!quizId) return <div>No quiz selected.</div>;

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <Button onClick={() => navigate('/analytics')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Icon name="arrow-left" size={14} /> Back to Analytics
        </Button>
      </div>
      <AdminQuizResults quizId={quizId} onClose={() => navigate('/analytics')} />
    </div>
  );
};

export default QuizAnalyticsDetail;
