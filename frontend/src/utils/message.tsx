/* eslint-disable react-refresh/only-export-components */
import React from 'react';
import { createRoot } from 'react-dom/client';
import './message.scss';
import Icon from '../components/atoms/Icon/Icon';

interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  content: string;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ id, type, content, onClose }) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 3000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const getIconName = () => {
    switch (type) {
      case 'success':
        return 'check-circle';
      case 'error':
        return 'alert-cancel';
      case 'warning':
        return 'alert-triangle';
      default:
        return 'help-circle';
    }
  };

  return (
    <div className={`custom-toast custom-toast--${type}`}>
      <span className="toast-icon">
        <Icon name={getIconName()} size={16} />
      </span>
      <span className="toast-content">{content}</span>
    </div>
  );
};

class MessageManager {
  private containerId = 'custom-toast-container';
  private root: ReturnType<typeof createRoot> | null = null;
  private toasts: Array<{ id: string; type: 'success' | 'error' | 'warning' | 'info'; content: string }> = [];

  private ensureContainer() {
    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      document.body.appendChild(container);
    }
    if (!this.root) {
      this.root = createRoot(container);
    }
  }

  private render() {
    this.ensureContainer();
    this.root?.render(
      <div className="toast-list">
        {this.toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            type={toast.type}
            content={toast.content}
            onClose={(id) => this.remove(id)}
          />
        ))}
      </div>
    );
  }

  private add(type: 'success' | 'error' | 'warning' | 'info', content: string) {
    const id = Math.random().toString(36).substring(2, 9);
    this.toasts.push({ id, type, content });
    this.render();
  }

  private remove(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.render();
  }

  public success(content: string) {
    this.add('success', content);
  }

  public error(content: string) {
    this.add('error', content);
  }

  public warning(content: string) {
    this.add('warning', content);
  }

  public info(content: string) {
    this.add('info', content);
  }
}

export const message = new MessageManager();
export default message;
