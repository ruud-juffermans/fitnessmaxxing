import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { auth as authApi } from '../../api';
import { Button, Input } from '../../components/ui';
import { AuthShell, Field, FormStack, Alert } from './AuthShell';

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      await authApi.resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthShell title="Invalid link" footer={<Link to="/forgot-password">Request a new link</Link>}>
        <Alert $variant="error">This password reset link is missing or malformed.</Alert>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="Password updated" footer={<Link to="/login">Sign in</Link>}>
        <Alert $variant="success">Your password has been reset. You can now sign in with it.</Alert>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" footer={<span>Back to <Link to="/login">sign in</Link></span>}>
      <FormStack onSubmit={onSubmit}>
        {error && <Alert $variant="error">{error}</Alert>}
        <Field>
          New password <span style={{ opacity: 0.6 }}>(min 8 characters)</span>
          <Input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Field>
          Confirm new password
          <Input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Reset password'}
        </Button>
      </FormStack>
    </AuthShell>
  );
}
