import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';
import { useLoginMutation } from '../../services/api';
import Button from '../../components/atoms/Button/Button';
import Input from '../../components/atoms/Input/Input';
import Alert from '../../components/atoms/Alert/Alert';
import FormField from '../../components/molecules/FormField/FormField';
import message from '../../utils/message';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let valid = true;
    if (!email.trim()) {
      setEmailError('Please enter your email address');
      valid = false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Please enter a valid email address');
      valid = false;
    } else {
      setEmailError(undefined);
    }

    if (!password) {
      setPasswordError('Please enter your password');
      valid = false;
    } else {
      setPasswordError(undefined);
    }

    if (!valid) return;

    try {
      const response = await login({ email, password }).unwrap();
      if (response.success && response.data) {
        dispatch(setCredentials(response.data));
        message.success(`Welcome back, ${response.data.name}!`);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      console.error('Login error:', err);
      const errPayload = err as { data?: { message?: string } };
      setErrorMsg(errPayload.data?.message || 'Invalid email or password. Please try again.');
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
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>
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

      <form onSubmit={handleSubmit}>
        <FormField
          label="Email address"
          error={emailError}
          required
        >
          <Input
            type="email"
            placeholder="aryan@company.com"
            size="large"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(undefined);
            }}
          />
        </FormField>

        <FormField
          label="Password"
          error={passwordError}
          required
        >
          <Input.Password
            placeholder="••••••••"
            size="large"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (passwordError) setPasswordError(undefined);
            }}
          />
        </FormField>

        <div style={{ marginTop: '32px', marginBottom: '16px' }}>
          <Button
            type="submit"
            size="large"
            block
            loading={isLoading}
          >
            Sign In
          </Button>
        </div>
      </form>

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
