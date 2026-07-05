import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth';
import { auth as authApi, ApiError } from '../../api';
import { Button, Input } from '../../components/ui';
import { AuthShell, Field, FormStack, Alert } from './AuthShell';

export function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { login, guest } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [resent, setResent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);

  async function onGuest() {
    setError(null);
    setGuestBusy(true);
    try {
      await guest();
      navigate('/workout', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start a guest session.');
    } finally {
      setGuestBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsVerify(false);
    setBusy(true);
    try {
      await login(email, password);
      const next = params.get('next');
      navigate(next && next.startsWith('/') ? next : '/workout', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.code === 'EMAIL_NOT_VERIFIED') {
        setNeedsVerify(true);
      }
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setResent(false);
    try {
      await authApi.resendVerification(email);
      setResent(true);
    } catch {
      setResent(true); // response is intentionally generic
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your fitnessmaxxing account."
      footer={<span>No account? <Link to="/register">Create one</Link></span>}
    >
      <FormStack onSubmit={onSubmit}>
        {error && <Alert $variant="error">{error}</Alert>}
        {needsVerify && (
          <Alert $variant="success">
            {resent
              ? 'Verification email sent — check your inbox.'
              : <>Need a new verification link? <a href="#" onClick={(e) => { e.preventDefault(); resend(); }}>Resend it</a>.</>}
          </Alert>
        )}
        <Field>
          Email
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field>
          Password
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
        <Link to="/forgot-password" style={{ fontSize: 14, textAlign: 'center' }}>Forgot your password?</Link>
        <Divider>or</Divider>
        <Button type="button" onClick={onGuest} disabled={guestBusy}>
          {guestBusy ? 'Setting up…' : 'Try it as a guest'}
        </Button>
      </FormStack>
    </AuthShell>
  );
}

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${({ theme }) => theme.colors.border};
  }
`;
