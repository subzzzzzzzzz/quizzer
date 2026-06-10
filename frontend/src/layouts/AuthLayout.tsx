import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import Icon from '../components/ui/Icon/Icon';

export const AuthLayout: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const isLoginPage = location.pathname === '/login' || location.pathname === '/';

  const rightPaneContent = isLoginPage
    ? {
        icon: <Icon name="logo-layers" size={32} />,
        title: 'Test your knowledge, track your growth',
        subtitle: 'Timed quizzes, instant results, and detailed analytics — all in one place.',
        features: [
          {
            icon: <Icon name="timer" size={16} />,
            text: 'Timed quizzes with auto-submit',
          },
          {
            icon: <Icon name="chart-line-score" size={16} />,
            text: 'Instant scores & detailed reports',
          },
          {
            icon: <Icon name="nav-dashboard" size={16} />,
            text: 'Personal analytics dashboard',
          },
        ],
      }
    : {
        icon: <Icon name="user-profile" size={32} />,
        title: 'Your account, your progress',
        subtitle: 'All your quizzes, scores, and analytics — saved and accessible anytime.',
        features: [
          {
            icon: <Icon name="nav-file" size={16} />,
            text: 'Access your assigned quizzes',
          },
          {
            icon: <Icon name="chart-line-score" size={16} />,
            text: 'Track your scores over time',
          },
          {
            icon: <Icon name="edit-pencil" size={16} />,
            text: 'Detailed per-question review',
          },
        ],
      };

  return (
    <div className="auth-container" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Left pane: dynamic auth forms */}
      <div
        className="auth-left"
        style={{
          flex: '0 0 40%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 24px',
          backgroundColor: 'var(--bg-base)',
        }}
      >
        <div style={{ width: '100%', maxWidth: '380px' }}>
          {/* Logo at the top left of left pane */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '20px',
              fontWeight: 700,
              color: 'var(--primary-4)',
              marginBottom: '32px',
            }}
          >
            {/* Logo Icon matching the screenshots */}
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Icon name="logo-layers" size={20} />
            </div>
            <span style={{ color: 'var(--primary-4)', fontWeight: 800 }}>QuizArena</span>
          </div>

          <Outlet />
        </div>
      </div>

      {/* Right pane: decorative pane */}
      <div
        className="auth-right"
        style={{
          flex: '0 0 60%',
          backgroundColor: 'var(--primary-4)',
          backgroundImage: 'linear-gradient(135deg, var(--primary-3) 0%, var(--primary-4) 100%)',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '40px 80px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Subtle background grids/elements */}
        <div
          style={{
            position: 'absolute',
            width: '450px',
            height: '450px',
            background: 'radial-gradient(circle, rgba(123,117,212,0.15) 0%, transparent 75%)',
            top: '-100px',
            right: '-100px',
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: '350px',
            height: '350px',
            background: 'radial-gradient(circle, rgba(29,158,117,0.1) 0%, transparent 75%)',
            bottom: '-50px',
            left: '-50px',
            borderRadius: '50%',
          }}
        />

        <div style={{ maxWidth: '480px', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Centered square icon with glassmorphism */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              marginBottom: '32px',
            }}
          >
            {rightPaneContent.icon}
          </div>

          <h2 style={{ fontSize: '26px', lineHeight: '36px', fontWeight: 700, marginBottom: '16px', color: '#fff' }}>
            {rightPaneContent.title}
          </h2>

          <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.7)', lineHeight: '22px', marginBottom: '40px', maxWidth: '400px' }}>
            {rightPaneContent.subtitle}
          </p>

          {/* Centered Feature Pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', alignItems: 'center' }}>
            {rightPaneContent.features.map((feature, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 20px',
                  borderRadius: '30px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  width: 'fit-content',
                  minWidth: '280px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', color: '#FFFFFF', opacity: 0.9 }}>
                  {feature.icon}
                </div>
                <span style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 500 }}>{feature.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CSS overrides for responsive layouts */}
      <style>{`
        @media (max-width: 900px) {
          .auth-right {
            display: none !important;
          }
          .auth-left {
            flex: 1 1 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default AuthLayout;
