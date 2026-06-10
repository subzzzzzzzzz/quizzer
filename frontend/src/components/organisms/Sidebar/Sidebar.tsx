import React from 'react';
import './Sidebar.scss';

export interface SidebarMenuItem {
  key: string;
  icon: React.ReactNode;
  label: React.ReactNode;
  active: boolean;
}

export interface SidebarProps {
  collapsed: boolean;
  menuItems: SidebarMenuItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  user: { name: string; role: string } | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  menuItems,
  activeKey,
  onSelect,
  user,
}) => {
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <aside className={`custom-sidebar ${collapsed ? 'custom-sidebar--collapsed' : ''}`}>
      {/* Brand Logo section */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">Q</div>
        {!collapsed && <span className="sidebar-brand-name">QuizArena</span>}
      </div>

      {/* Navigation menu list */}
      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          {menuItems.map((item) => (
            <li
              key={item.key}
              className={`sidebar-menu-item ${item.key === activeKey ? 'sidebar-menu-item--active' : ''}`}
              onClick={() => onSelect(item.key)}
            >
              <span className="sidebar-menu-icon">{item.icon}</span>
              {!collapsed && <span className="sidebar-menu-label">{item.label}</span>}
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer Profile card info */}
      {user && (
        <div className="sidebar-profile-footer">
          {!collapsed ? (
            <div className="profile-widget">
              <div className="profile-avatar">{getInitials(user.name)}</div>
              <div className="profile-info">
                <span className="profile-name">{user.name}</span>
                <span className="profile-role">{user.role}</span>
              </div>
            </div>
          ) : (
            <div className="profile-avatar-collapsed">
              <div className="profile-avatar">{getInitials(user.name)}</div>
            </div>
          )}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
