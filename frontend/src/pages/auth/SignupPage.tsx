import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';
import { useSignupMutation } from '../../services/api';
import { Form, Input, Button, Alert, message } from 'antd';

export const SignupPage: React.FC = () => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [signup, { isLoading }] = useSignupMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Password requirements checklist matching the mockup
  const requirements = [
    { label: 'At least 8 characters', test: (pw: string) => pw.length >= 8 },
    { label: 'One uppercase letter (A-Z)', test: (pw: string) => /[A-Z]/.test(pw) },
    { label: 'One lowercase letter (a-z)', test: (pw: string) => /[a-z]/.test(pw) },
    { label: 'One number (0-9)', test: (pw: string) => /\d/.test(pw) },
    { label: 'One symbol (!@#$...)', test: (pw: string) => /[\W_]/.test(pw) },
  ];

  const onFinish = async (values: any) => {
    setErrorMsg(null);
    try {
      const response = await signup(values).unwrap();
      if (response.success && response.data) {
        dispatch(setCredentials(response.data));
        message.success(`Account created! Welcome, ${response.data.name}!`);
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setErrorMsg(err.data?.message || 'Registration failed. Email might already be in use.');
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
            backgroundColor: 'transparent',
            color: 'var(--text-muted)',
            fontWeight: 500,
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
            backgroundColor: 'var(--primary-2)',
            color: '#FFFFFF',
            fontWeight: 600,
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
          Create your account
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Join QuizArena and start your journey
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

      {/* role is candidate by default for registrations, elevated by admin if needed */}
      <Form name="signup_form" layout="vertical" onFinish={onFinish} requiredMark={false} initialValues={{ role: 'candidate' }}>
        <Form.Item
          name="name"
          label={<span style={{ fontWeight: 500, fontSize: '12px', color: 'var(--text-main)' }}>Full Name</span>}
          rules={[{ required: true, message: 'Please enter your full name' }]}
        >
          <Input
            placeholder="Aryan Kumar"
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

        {/* Hidden role input to keep it functional while matching design */}
        <Form.Item name="role" style={{ display: 'none' }}>
          <Input type="hidden" />
        </Form.Item>

        <Form.Item
          name="password"
          label={<span style={{ fontWeight: 500, fontSize: '12px', color: 'var(--text-main)' }}>Password</span>}
          rules={[
            { required: true, message: 'Please enter your password' },
            { min: 8, message: 'Password must be at least 8 characters' },
          ]}
        >
          <Input.Password
            placeholder="••••••••"
            size="large"
            value={passwordValue}
            onChange={(e) => setPasswordValue(e.target.value)}
            style={{
              borderRadius: '8px',
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-main)',
              height: '42px',
            }}
          />
        </Form.Item>

        {/* Real-time checklist */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--bg-surface-hover)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            marginBottom: '24px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {requirements.map((req, i) => {
              const met = req.test(passwordValue);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                  <span style={{ color: met ? 'var(--color-success)' : 'var(--neutral-4)', fontWeight: 'bold', fontSize: '13px', transition: 'color 0.2s' }}>
                    {met ? '✓' : '○'}
                  </span>
                  <span style={{ color: met ? 'var(--text-main)' : 'var(--text-muted)', transition: 'color 0.2s' }}>
                    {req.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <Form.Item style={{ marginTop: '24px', marginBottom: '16px' }}>
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
            Create Account &rarr;
          </Button>
        </Form.Item>
      </Form>

      <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--primary-2)', fontWeight: 600, textDecoration: 'none' }}>
          Sign in
        </Link>
      </div>
    </div>
  );
};

export default SignupPage;
