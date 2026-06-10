import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { logoutUser } from '../store/slices/authSlice';
import { toggleTheme } from '../store/slices/themeSlice';
import { api, useLogoutMutation } from '../services/api';
import Icon from '../components/ui/Icon/Icon';
import { Button, Layout, Menu, Dropdown } from 'antd';

const { Header, Sider, Content } = Layout;

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const MainLayout: React.FC = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { isDark } = useSelector((state: RootState) => state.theme);
  const [collapsed, setCollapsed] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutApi] = useLogoutMutation();

  const dropdownItems = [
    {
      key: 'logout',
      label: 'Sign Out',
      danger: true,
      icon: <Icon name="logout" size={14} />,
    },
  ];

  const handleDropdownClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      handleLogout();
    }
  };

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Theme configuration on load
  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDark]);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
      dispatch(logoutUser());
      dispatch(api.util.resetApiState()); // Clear RTK Query cache
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const getSidebarMenu = () => {
    const role = user.role;
    const path = location.pathname;

    const items = [
      {
        key: 'dashboard',
        icon: <Icon name="nav-dashboard" />,
        label: <Link to="/dashboard">Dashboard</Link>,
        active: path === '/dashboard' || path === '/',
      },
    ];

    if (role === 'admin') {
      items.push(
        {
          key: 'quizzes',
          icon: <Icon name="nav-quiz" />,
          label: <Link to="/quizzes">Create Quiz</Link>,
          active: path.startsWith('/quizzes'),
        },
        {
          key: 'access',
          icon: <Icon name="nav-instructor" />,
          label: <Link to="/access">Access Management</Link>,
          active: path === '/access',
        }
      );
    }

    if (role === 'instructor') {
      items.push(
        {
          key: 'quizzes',
          icon: <Icon name="edit-pencil" />,
          label: <Link to="/quizzes">Update Quizzes</Link>,
          active: path.startsWith('/quizzes'),
        },
        {
          key: 'analytics',
          icon: <Icon name="nav-analytics" />,
          label: <Link to="/analytics">Analytics</Link>,
          active: path.startsWith('/analytics'),
        }
      );
    }

    if (role === 'candidate') {
      items.push(
        {
          key: 'upcoming',
          icon: <Icon name="nav-quiz" />,
          label: <Link to="/upcoming">Upcoming Quizzes</Link>,
          active: path === '/upcoming' || path.startsWith('/quiz-attempt'),
        }
      );
    }

    return items;
  };

  const menuItems = getSidebarMenu();
  const activeKey = menuItems.find((item) => item.active)?.key || 'dashboard';

  // Format date time
  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
      {/* Sidebar Navigation */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        theme={isDark ? 'dark' : 'light'}
        style={{
          borderRight: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-surface)',
          zIndex: 10,
        }}
      >
        <div
          style={{
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '0 24px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '18px',
              fontWeight: 'bold',
              flexShrink: 0,
            }}
          >
            Q
          </div>
          {!collapsed && (
            <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-main)' }}>QuizArena</span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: 'calc(100vh - 64px)',
            paddingBottom: '16px',
          }}
        >
          <Menu
            theme={isDark ? 'dark' : 'light'}
            mode="inline"
            selectedKeys={[activeKey]}
            onClick={({ key }) => {
              if (key === 'dashboard') navigate('/dashboard');
              else if (key === 'quizzes') navigate('/quizzes');
              else if (key === 'analytics') navigate('/analytics');
              else if (key === 'access') navigate('/access');
              else if (key === 'upcoming') navigate('/upcoming');
            }}
            style={{
              borderRight: 0,
              paddingTop: '16px',
              backgroundColor: 'transparent',
            }}
            items={menuItems.map((item) => ({
              key: item.key,
              icon: item.icon,
              label: item.label,
            }))}
          />

          {/* Bottom Sidebar Profile widget */}
          {!collapsed ? (
            <div style={{ padding: '0 16px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden',
                }}
              >
                {/* Avatar Initials circle */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--secondary-0)',
                    color: 'var(--secondary-2)',
                    fontWeight: 700,
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textTransform: 'uppercase',
                    flexShrink: 0,
                  }}
                >
                  {getInitials(user.name)}
                </div>

                {/* Name & Role */}
                <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: '13px',
                      color: 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      lineHeight: '16px',
                    }}
                  >
                    {user.name}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      textTransform: 'capitalize',
                      lineHeight: '14px',
                      marginTop: '2px',
                    }}
                  >
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '0 8px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--secondary-0)',
                  color: 'var(--secondary-2)',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textTransform: 'uppercase',
                }}
              >
                {getInitials(user.name)}
              </div>
            </div>
          )}
        </div>
      </Sider>

      {/* Main Content Layout */}
      <Layout style={{ height: '100vh', overflow: 'hidden' }}>
        {/* Top Header */}
        <Header
          style={{
            padding: '0 24px',
            backgroundColor: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '64px',
            lineHeight: 'normal',
          }}
        >
          {/* Collapse toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Button
              type="text"
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '16px',
                width: '40px',
                height: '40px',
                color: 'var(--text-main)',
              }}
            >
              {collapsed ? '☰' : '⛌'}
            </Button>
          </div>

          {/* User profile, badges, clock & DarkMode toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Custom Theme Toggle matching Figma/Screenshot */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '4px' }}>
              <Icon
                name="theme-sun"
                size={14}
                style={{
                  color: isDark ? 'var(--text-muted)' : 'var(--text-main)',
                  transition: 'color 0.2s',
                }}
              />
              <div
                onClick={() => dispatch(toggleTheme())}
                style={{
                  width: '42px',
                  height: '22px',
                  borderRadius: '11px',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border-color)',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  display: 'inline-block',
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    position: 'absolute',
                    top: '2px',
                    left: isDark ? '22px' : '2px',
                    transition: 'left 0.2s ease-in-out',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  }}
                >
                  <Icon
                    name={isDark ? 'theme-moon' : 'theme-sun'}
                    size={11}
                    style={{
                      color: isDark ? 'var(--primary-2)' : '#64748b',
                      transition: 'color 0.2s',
                    }}
                  />
                </div>
              </div>
              <Icon
                name="theme-moon"
                size={14}
                style={{
                  color: isDark ? 'var(--text-main)' : 'var(--text-muted)',
                  transition: 'color 0.2s',
                }}
              />
            </div>

            {/* Live Clock display */}
            <div style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', gap: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{formattedTime}</span>
              <span>•</span>
              <span>{formattedDate}</span>
            </div>

            {/* Profile Avatar and roles info with Dropdown */}
            <Dropdown menu={{ items: dropdownItems, onClick: handleDropdownClick }} trigger={['click']}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '4px 14px 4px 4px',
                  borderRadius: '24px',
                  backgroundColor: 'var(--bg-surface-hover)',
                  border: '1px solid var(--border-color)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                {/* Avatar circle */}
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--secondary-0)',
                    color: 'var(--secondary-2)',
                    fontWeight: 700,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textTransform: 'uppercase',
                  }}
                >
                  {getInitials(user.name)}
                </div>

                {/* Name */}
                <span style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-main)' }}>
                  {user.name}
                </span>

                {/* Down chevron */}
                <Icon name="chevron-down" size={10} style={{ color: 'var(--text-muted)' }} />
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Page View Wrapper */}
        <Content
          style={{
            padding: '24px',
            margin: 0,
            minHeight: 280,
            overflowY: 'auto',
            backgroundColor: 'var(--bg-base)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
