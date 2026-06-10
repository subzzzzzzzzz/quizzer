import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';
import { useLoginMutation } from '../../services/api';
import { Form, Input, Button, Alert, message } from 'antd';

export const LoginPage: React.FC = () => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setErrorMsg(null);
    try {
      const response = await login(values).unwrap();
      if (response.success && response.data) {
        dispatch(setCredentials(response.data));
        message.success(`Welcome back, ${response.data.name}!`);
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMsg(err.data?.message || 'Invalid email or password. Please try again.');
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--bg-base)', padding: '0', borderRadius: '12px' }}>
      {/* Custom capsule tab selector */}
      <div
        style={{
          display: 'flex',
          backgroundColor: 'var(--bg-surface-hover)',
          borderRadius: '8px',
          padding: '4px',
          marginBottom: '28px',
          border: '1px solid var(--border-color)',
        }}
      >
        <button
          type="button"
          onClick={() => navigate('/login')}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            backgroundColor: 'var(--primary-2)',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => navigate('/signup')}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            color: 'var(--text-muted)',
            fontWeight: 500,
            fontSize: '13px',
            cursor: 'pointer',
            textAlign: 'center',
          }}
        >
          Sign Up
        </button>
      </div>

      {/* Left-aligned title */}
      <div style={{ textAlign: 'left', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
          Welcome back
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Sign in to access your quizzes
        </p>
      </div>

      {errorMsg && (
        <Alert
          message={errorMsg}
          type="error"
          showIcon
          closable
          onClose={() => setErrorMsg(null)}
          style={{ marginBottom: '20px', borderRadius: '8px' }}
        />
      )}

      <Form name="login_form" layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item
          name="email"
          label={<span style={{ fontWeight: 500, fontSize: '12px', color: 'var(--text-main)' }}>Email address</span>}
          rules={[
            { required: true, message: 'Please enter your email address' },
            { type: 'email', message: 'Please enter a valid email address' },
          ]}
        >
          <Input
            placeholder="aryan@company.com"
            size="large"
            style={{
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)',
              height: '42px',
            }}
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={<span style={{ fontWeight: 500, fontSize: '12px', color: 'var(--text-main)' }}>Password</span>}
          rules={[{ required: true, message: 'Please enter your password' }]}
        >
          <Input.Password
            placeholder="••••••••"
            size="large"
            style={{
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)',
              height: '42px',
            }}
          />
        </Form.Item>

        <Form.Item style={{ marginTop: '32px', marginBottom: '16px' }}>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={isLoading}
            style={{
              borderRadius: '8px',
              height: '44px',
              fontWeight: 600,
              backgroundColor: 'var(--primary-2)',
              borderColor: 'var(--primary-2)',
            }}
          >
            Sign In
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
        Don't have an account?{' '}
        <Link to="/signup" style={{ color: 'var(--primary-2)', fontWeight: 600, textDecoration: 'none' }}>
          Sign up
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;
