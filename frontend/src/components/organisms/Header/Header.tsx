import React, { useEffect, useState } from 'react';
import './Header.scss';
import Icon from '../../atoms/Icon/Icon';
import Dropdown from '../../molecules/Dropdown/Dropdown';

export interface HeaderProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
  user: { name: string; role: string } | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  collapsed,
  onToggleCollapsed,
  isDark,
  onToggleTheme,
  user,
  onLogout,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock tick trigger
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

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
      onLogout();
    }
  };

  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formattedDate = currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <header className="custom-header">
      {/* Sider Collapse Trigger */}
      <div className="header-left">
        <button type="button" className="header-collapse-toggle" onClick={onToggleCollapsed}>
          {collapsed ? '☰' : '⛌'}
        </button>
      </div>

      {/* Clock, Theme Switch, Profile info */}
      <div className="header-right">
        {/* Toggle Theme Widget */}
        <div className="theme-toggle-widget">
          <Icon name="theme-sun" size={14} className={`theme-icon ${!isDark ? 'theme-icon--active' : ''}`} />
          <div className="theme-switch-bar" onClick={onToggleTheme} style={{ cursor: 'pointer' }}>
            <div className={`theme-switch-slider ${isDark ? 'theme-switch-slider--dark' : ''}`}>
              <Icon name={isDark ? 'theme-moon' : 'theme-sun'} size={11} className="slider-icon" />
            </div>
          </div>
          <Icon name="theme-moon" size={14} className={`theme-icon ${isDark ? 'theme-icon--active' : ''}`} />
        </div>

        {/* Live Clock Display */}
        <div className="live-clock-display">
          <span className="clock-time">{formattedTime}</span>
          <span className="clock-divider">•</span>
          <span className="clock-date">{formattedDate}</span>
        </div>

        {/* Profile Dropdown Widget */}
        {user && (
          <Dropdown menu={{ items: dropdownItems, onClick: handleDropdownClick }} trigger={['click']}>
            <div className="profile-dropdown-trigger">
              <div className="profile-trigger-avatar">{getInitials(user.name)}</div>
              <span className="profile-trigger-name">{user.name}</span>
              <Icon name="chevron-down" size={10} className="profile-trigger-chevron" />
            </div>
          </Dropdown>
        )}
      </div>
    </header>
  );
};

export default Header;
