import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import MainLayout from '../layouts/MainLayout';

// Pages
import LoginPage from '../pages/auth/LoginPage';
import SignupPage from '../pages/auth/SignupPage';
import Dashboard from '../pages/Dashboard';
import AccessManagement from '../pages/admin/AccessManagement';
import QuizList from '../pages/instructor/QuizList';
import QuizEditor from '../pages/instructor/QuizEditor';
import AnalyticsDashboard from '../pages/instructor/AnalyticsDashboard';
import QuizAnalyticsDetail from '../pages/instructor/QuizAnalyticsDetail';
import AssignedQuizzes from '../pages/candidate/AssignedQuizzes';
import QuizAttempt from '../pages/candidate/QuizAttempt';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      {/* Protected Main Routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        
        {/* Admin only */}
        <Route path="/access" element={<AccessManagement />} />

        {/* Instructor only */}
        <Route path="/quizzes" element={<QuizList />} />
        <Route path="/quizzes/create" element={<QuizEditor />} />
        <Route path="/quizzes/:id/edit" element={<QuizEditor />} />
        <Route path="/analytics" element={<AnalyticsDashboard />} />
        <Route path="/analytics/quiz/:quizId" element={<QuizAnalyticsDetail />} />

        {/* Candidate only */}
        <Route path="/upcoming" element={<AssignedQuizzes />} />
      </Route>

      {/* Proctor Attempt Mode (Outside Standard MainLayout to maximize screen real estate and proctored focus) */}
      <Route path="/quiz-attempt/:attemptId" element={<QuizAttempt />} />

      {/* Catch-all redirection */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRouter;
