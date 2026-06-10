import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../store/slices/authSlice';
import { useSignupMutation } from '../../services/api';
import Button from '../../components/atoms/Button/Button';
import Input from '../../components/atoms/Input/Input';
import Alert from '../../components/atoms/Alert/Alert';
import FormField from '../../components/molecules/FormField/FormField';
import message from '../../utils/message';

export const SignupPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    let valid = true;
    if (!name.trim()) {
      setNameError('Please enter your full name');
      valid = false;
    } else {
      setNameError(undefined);
    }

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
    } else if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      valid = false;
    } else {
      setPasswordError(undefined);
    }

    if (!valid) return;

    try {
      const response = await signup({ name, email, password, role: 'candidate' }).unwrap();
      if (response.success && response.data) {
        dispatch(setCredentials(response.data));
        message.success(`Account created! Welcome, ${response.data.name}!`);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      console.error('Signup error:', err);
      const errPayload = err as { data?: { message?: string } };
      setErrorMsg(errPayload.data?.message || 'Registration failed. Email might already be in use.');
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
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '4px' }}>
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

      <form onSubmit={handleSubmit}>
        <FormField
          label="Full Name"
          error={nameError}
          required
        >
          <Input
            placeholder="Aryan Kumar"
            size="large"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError(undefined);
            }}
          />
        </FormField>

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
              const met = req.test(password);
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

        <div style={{ marginTop: '24px', marginBottom: '16px' }}>
          <Button
            type="submit"
            size="large"
            block
            loading={isLoading}
          >
            Create Account &rarr;
          </Button>
        </div>
      </form>

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
