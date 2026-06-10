import React, { useState } from 'react';
import { Outlet, Navigate, useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { logoutUser } from '../store/slices/authSlice';
import { toggleTheme } from '../store/slices/themeSlice';
import { api, useLogoutMutation } from '../services/api';
import Icon from '../components/atoms/Icon/Icon';
import Sidebar from '../components/organisms/Sidebar/Sidebar';
import type { SidebarMenuItem } from '../components/organisms/Sidebar/Sidebar';
import Header from '../components/organisms/Header/Header';

export const MainLayout: React.FC = () => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const { isDark } = useSelector((state: RootState) => state.theme);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutApi] = useLogoutMutation();

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

  const getSidebarMenuItems = (): SidebarMenuItem[] => {
    const role = user.role;
    const path = location.pathname;

    const items: SidebarMenuItem[] = [
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
          key: 'create-quiz',
          icon: <Icon name="create-quiz" />,
          label: <Link to="/quizzes/create">Create Quiz</Link>,
          active: path === '/quizzes/create',
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

  const menuItems = getSidebarMenuItems();
  const activeKey = menuItems.find((item) => item.active)?.key || 'dashboard';

  const handleSidebarSelect = (key: string) => {
    if (key === 'dashboard') navigate('/dashboard');
    else if (key === 'create-quiz') navigate('/quizzes/create');
    else if (key === 'quizzes') navigate('/quizzes');
    else if (key === 'analytics') navigate('/analytics');
    else if (key === 'access') navigate('/access');
    else if (key === 'upcoming') navigate('/upcoming');

    if (window.innerWidth < 768) {
      setCollapsed(true);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: 'var(--bg-base)' }}>
      {/* Mobile Sidebar backdrop overlay */}
      {!collapsed && typeof window !== 'undefined' && window.innerWidth < 768 && (
        <div
          onClick={() => setCollapsed(true)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(1px)',
            zIndex: 999,
          }}
        />
      )}

      {/* Custom Sidebar organism */}
      <Sidebar
        collapsed={collapsed}
        menuItems={menuItems}
        activeKey={activeKey}
        onSelect={handleSidebarSelect}
        user={user}
      />

      {/* Main Content Pane */}
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden' }}>
        {/* Custom Header organism */}
        <Header
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed(!collapsed)}
          isDark={isDark}
          onToggleTheme={() => dispatch(toggleTheme())}
          user={user}
          onLogout={handleLogout}
        />

        {/* Page Content viewport */}
        <main
          style={{
            padding: '24px',
            margin: 0,
            flexGrow: 1,
            overflowY: 'auto',
            backgroundColor: 'var(--bg-base)',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
