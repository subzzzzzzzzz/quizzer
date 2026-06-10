import React from 'react';
import { screen, fireEvent, render, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Alert from '../components/atoms/Alert/Alert';
import Checkbox from '../components/atoms/Checkbox/Checkbox';
import Icon, { IconName, svgRegistry } from '../components/atoms/Icon/Icon';
import Input from '../components/atoms/Input/Input';
import Dropdown from '../components/molecules/Dropdown/Dropdown';
import FormField from '../components/molecules/FormField/FormField';
import Modal from '../components/molecules/Modal/Modal';
import Popconfirm from '../components/molecules/Popconfirm/Popconfirm';
import Drawer from '../components/organisms/Drawer/Drawer';
import Header from '../components/organisms/Header/Header';
import Sidebar from '../components/organisms/Sidebar/Sidebar';
import Table, { ColumnType } from '../components/organisms/Table/Table';
import message from '../utils/message';

describe('Additional Component Branch Coverage Tests', () => {
  it('Alert close and fallback type', () => {
    const handleClose = vi.fn();
    // With onClose
    render(<Alert message="Msg" closable onClose={handleClose} showIcon type="info" />);
    const btn = screen.getAllByRole('button')[0];
    fireEvent.click(btn);
    expect(handleClose).toHaveBeenCalled();

    // Without onClose
    render(<Alert message="Msg2" closable showIcon type="warning" />);
    const btn2 = screen.getAllByRole('button')[0];
    fireEvent.click(btn2);

    const { container } = render(<Alert message="Msg" showIcon type={"invalid" as any} />);
    expect(container).toBeInTheDocument();
  });

  it('Checkbox toggles and disabled', () => {
    const handleChange = vi.fn();
    render(<Checkbox onChange={handleChange}>Check me</Checkbox>);
    const input = screen.getByRole('checkbox');
    fireEvent.click(input);
    expect(handleChange).toHaveBeenCalledWith(true);

    const { container } = render(<Checkbox disabled>Disabled check</Checkbox>);
    expect(container.firstChild).toHaveClass('checkbox-label-wrapper--disabled');

    // Without onChange
    render(<Checkbox>No onChange check</Checkbox>);
    fireEvent.click(screen.getByLabelText('No onChange check'));
  });

  it('Icon renders all shapes', () => {
    const iconNames: IconName[] = [
      'alert-cancel', 'alert-triangle', 'book-open', 'calendar', 'check-circle',
      'chevron-down', 'chevron-left', 'chevron-right', 'clock', 'edit', 'eye',
      'eye-off', 'file-text', 'help-circle', 'lock', 'logout', 'mail', 'menu',
      'more-vertical', 'plus', 'search', 'settings', 'spinner', 'stopwatch',
      'theme-moon', 'theme-sun', 'theme-toggle', 'timer', 'trash', 'upload',
      'user-group', 'user-profile', 'x-cancel', 'x-close', 'chart-donut-students',
      'chart-line-score', 'chart-donut-quizzes', 'logo-layers', 'logo-qa',
      'dashboard', 'create-quiz', 'participant', 'instructor', 'time', 'user',
      'warning', 'close'
    ];
    iconNames.forEach(name => {
      const { container, unmount } = render(<Icon name={name} title="Test Title" />);
      expect(container.querySelector('svg')).toBeInTheDocument();
      unmount();
    });

    // 2. Test fallback paths by clearing svgRegistry
    const backup = { ...svgRegistry };
    Object.keys(svgRegistry).forEach(key => {
      delete svgRegistry[key];
    });

    try {
      const fallbacks: IconName[] = [
        'dashboard', 'analytics', 'logout', 'create-quiz', 'participant', 'instructor', 'check'
      ];
      fallbacks.forEach(name => {
        const { container, unmount } = render(<Icon name={name} />);
        expect(container.querySelector('svg')).toBeInTheDocument();
        unmount();
      });
      // also test default fallback (returns empty svg but container wraps it)
      const { container, unmount } = render(<Icon name={'non-existent-icon-name' as any} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
      unmount();
    } finally {
      // restore svgRegistry
      Object.assign(svgRegistry, backup);
    }
  });

  it('Input components branch coverage', () => {
    render(<Input.Password placeholder="Enter password" />);
    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toHaveAttribute('type', 'password');
    const toggleBtn = screen.getByRole('button');
    fireEvent.click(toggleBtn);
    expect(input).toHaveAttribute('type', 'text');
    fireEvent.click(toggleBtn);
    expect(input).toHaveAttribute('type', 'password');

    // Test disabled states to hit branch classes
    render(<Input disabled placeholder="Disabled base" />);
    render(<Input.Password disabled placeholder="Disabled pwd" />);
    render(<Input.TextArea disabled placeholder="Disabled txt" />);
  });

  it('Dropdown behavior', () => {
    const handleMenuClick = vi.fn();
    const { container } = render(
      <Dropdown
        menu={{ items: [{ key: '1', label: 'Item 1' }], onClick: handleMenuClick }}
        trigger={['click', 'hover']}
      >
        <button>Trigger</button>
      </Dropdown>
    );

    const trigger = screen.getByText('Trigger');
    
    // Hover triggers
    fireEvent.mouseEnter(container.firstChild as HTMLElement);
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    fireEvent.mouseLeave(container.firstChild as HTMLElement);
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();

    // Click trigger
    fireEvent.click(trigger);
    expect(screen.getByText('Item 1')).toBeInTheDocument();

    // Outside click
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();

    // Re-open and select item
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText('Item 1'));
    expect(handleMenuClick).toHaveBeenCalledWith({ key: '1' });
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();

    // Click inside open dropdown
    fireEvent.click(trigger);
    fireEvent.mouseDown(container.firstChild as HTMLElement);
    expect(screen.getByText('Item 1')).toBeInTheDocument();

    // Dropdown with child having no onClick handler
    render(
      <Dropdown menu={{ items: [] }}>
        <span data-testid="span-trig">Span</span>
      </Dropdown>
    );
    fireEvent.click(screen.getByTestId('span-trig'));
  });

  it('FormField child non-react element', () => {
    render(<FormField label="Field">Plain text child</FormField>);
    expect(screen.getByText('Plain text child')).toBeInTheDocument();
  });

  it('Modal backdrop click and default footer', () => {
    const handleCancel = vi.fn();
    const { container } = render(
      <Modal open onCancel={handleCancel} title="Modal Title">
        <div>Modal Content</div>
      </Modal>
    );
    
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('OK')).toBeInTheDocument();

    // Click backdrop
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(handleCancel).toHaveBeenCalled();
  });

  it('Popconfirm full behavior', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();
    const { container, rerender, unmount } = render(
      <Popconfirm
        title="Confirm action?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      >
        <button>Pop</button>
      </Popconfirm>
    );

    const trigger = screen.getByText('Pop');
    fireEvent.click(trigger);
    expect(screen.getByText('Confirm action?')).toBeInTheDocument();

    // Click inside Popconfirm container
    fireEvent.mouseDown(container.firstChild as HTMLElement);
    expect(screen.getByText('Confirm action?')).toBeInTheDocument();

    // Cancel click
    fireEvent.click(screen.getByText('No'));
    expect(handleCancel).toHaveBeenCalled();
    expect(screen.queryByText('Confirm action?')).not.toBeInTheDocument();

    // Re-open and confirm click
    fireEvent.click(trigger);
    fireEvent.click(screen.getByText('Yes'));
    expect(handleConfirm).toHaveBeenCalled();

    // Re-open and click outside
    fireEvent.click(trigger);
    fireEvent.mouseDown(document.body);
    expect(screen.queryByText('Confirm action?')).not.toBeInTheDocument();

    // Test with danger & loading
    rerender(
      <Popconfirm
        title="Confirm action?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        okButtonProps={{ danger: true, loading: true }}
      >
        <button>Pop</button>
      </Popconfirm>
    );
    fireEvent.click(trigger);
    expect(screen.getByText('Yes')).toBeInTheDocument();

    // Clean up
    unmount();

    // Without onCancel prop
    const { unmount: unmount2 } = render(
      <Popconfirm title="No Cancel" onConfirm={() => {}}>
        <button>Pop no cancel</button>
      </Popconfirm>
    );
    fireEvent.click(screen.getByText('Pop no cancel'));
    fireEvent.click(screen.getByText('No'));
    unmount2();
  });

  it('Drawer backdrop click and custom width', () => {
    const handleClose = vi.fn();
    const { container, rerender } = render(
      <Drawer open onClose={handleClose} title="Drawer Title" width="50%">
        <div>Content</div>
      </Drawer>
    );
    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalled();

    // Click drawer body (not backdrop)
    rerender(
      <Drawer open onClose={handleClose}>
        <div data-testid="drawer-inner">Inner Body</div>
      </Drawer>
    );
    fireEvent.click(screen.getByTestId('drawer-inner'));
    expect(handleClose).toHaveBeenCalledTimes(1); // not incremented
  });

  it('Header layout and initials', () => {
    const handleToggleCollapsed = vi.fn();
    const handleToggleTheme = vi.fn();
    const handleLogout = vi.fn();

    const { container, rerender } = render(
      <Header
        collapsed={false}
        onToggleCollapsed={handleToggleCollapsed}
        isDark={false}
        onToggleTheme={handleToggleTheme}
        user={{ name: 'Admin', role: 'admin' }}
        onLogout={handleLogout}
      />
    );

    expect(screen.getByText('AD')).toBeInTheDocument();
    
    // Toggle Collapse
    fireEvent.click(screen.getByText('⛌'));
    expect(handleToggleCollapsed).toHaveBeenCalled();

    // Toggle Theme
    const switchBar = container.querySelector('.theme-switch-bar') as HTMLElement;
    fireEvent.click(switchBar);
    expect(handleToggleTheme).toHaveBeenCalled();

    // Dropdown logout
    fireEvent.click(screen.getByText('Admin'));
    fireEvent.click(screen.getByText('Sign Out'));
    expect(handleLogout).toHaveBeenCalled();

    // Collapsed header
    rerender(
      <Header
        collapsed={true}
        onToggleCollapsed={handleToggleCollapsed}
        isDark={true}
        onToggleTheme={handleToggleTheme}
        user={null}
        onLogout={handleLogout}
      />
    );
    expect(screen.getByText('☰')).toBeInTheDocument();
  });

  it('Sidebar actions', () => {
    const handleSelect = vi.fn();
    const { rerender } = render(
      <Sidebar
        collapsed={false}
        menuItems={[{ key: 'dash', label: 'Dash', icon: <span>D</span>, active: false }]}
        activeKey=""
        onSelect={handleSelect}
        user={{ name: 'User', role: 'instructor' }}
      />
    );

    expect(screen.getByText('US')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Dash'));
    expect(handleSelect).toHaveBeenCalledWith('dash');

    // Collapsed sidebar with user
    rerender(
      <Sidebar
        collapsed={true}
        menuItems={[]}
        activeKey=""
        onSelect={handleSelect}
        user={{ name: 'Admin', role: 'admin' }}
      />
    );
    expect(screen.getByText('AD')).toBeInTheDocument();
  });

  it('Table full features', () => {
    const columns: ColumnType<any>[] = [
      { title: 'Col A', key: 'a', dataIndex: 'a' },
      { title: 'Col B', key: 'b', dataIndex: 'b' }
    ];
    const data = [
      { _id: '1', a: 'Val A1', b: { nested: 'obj1' } },
      { _id: '2', a: 'Val A2', b: 'Val B2' },
      { _id: '3', a: 'Val A3', b: 'Val B3' }
    ];

    // Case 1: no pagination, function rowKey, object data index cell
    const { rerender } = render(
      <Table
        dataSource={data}
        columns={columns}
        pagination={false}
        rowKey={(record) => record._id}
      />
    );
    expect(screen.getByText('{"nested":"obj1"}')).toBeInTheDocument();

    // Case 2: default pagination, index rowKey fallback
    rerender(
      <Table
        dataSource={data}
        columns={columns}
        pagination={{ pageSize: 2 }}
        rowKey="non_existent"
      />
    );
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    
    // Go next
    const nextBtn = screen.getAllByRole('button')[1];
    fireEvent.click(nextBtn);
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();

    // Try going next when already at max
    fireEvent.click(nextBtn);

    // Go prev
    const prevBtn = screen.getAllByRole('button')[0];
    fireEvent.click(prevBtn);
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    // Try going prev when already at page 1
    fireEvent.click(prevBtn);

    // Case 3: default pagination parameters (pageSize default to 5)
    rerender(
      <Table
        dataSource={data}
        columns={columns}
        pagination={{}}
      />
    );

    // Case 4: Undefined data cells
    rerender(
      <Table
        dataSource={[{ _id: '99' }]}
        columns={[{ title: 'Col X', key: 'x', dataIndex: 'x' }]}
        pagination={false}
      />
    );
  });

  it('Message manager', () => {
    vi.useFakeTimers();
    act(() => {
      message.success('Success message');
    });
    act(() => {
      message.warning('Warning message');
    });
    act(() => {
      message.info('Info message');
    });
    act(() => {
      message.error('Error message');
    });
    
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
