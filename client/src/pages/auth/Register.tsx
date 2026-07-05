import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import { auth as authApi } from '../../api';
import { useAuth } from '../../auth';
import { Button, Input } from '../../components/ui';
import { AuthShell, Field, FormStack, Alert } from './AuthShell';

export function Register() {
  const navigate = useNavigate();
  const { guest } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
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
      setGuestBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setBusy(true);
    try {
      await authApi.register({ email, password, name: name || undefined });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthShell
        title="Check your email"
        footer={<span>Already verified? <Link to="/login">Sign in</Link></span>}
      >
        <Alert $variant="success">
          We've sent a verification link to <strong>{email}</strong>. Click it to activate your account,
          then sign in.
        </Alert>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Track your training. Verify your email to get started."
      footer={<span>Already have an account? <Link to="/login">Sign in</Link></span>}
    >
      <FormStack onSubmit={onSubmit}>
        {error && <Alert $variant="error">{error}</Alert>}
        <Field>
          Name <span style={{ opacity: 0.6 }}>(optional)</span>
          <Input type="text" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field>
          Email
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field>
          Password <span style={{ opacity: 0.6 }}>(min 8 characters)</span>
          <Input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Creating…' : 'Create account'}
        </Button>
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
