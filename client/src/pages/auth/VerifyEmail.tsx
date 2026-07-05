import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { auth as authApi } from '../../api';
import { AuthShell, Alert } from './AuthShell';

type Status = 'pending' | 'success' | 'error';

export function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [status, setStatus] = useState<Status>('pending');
  const [message, setMessage] = useState('');
  // Guard against React 18 StrictMode double-invocation consuming the token twice.
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing or malformed.');
      return;
    }
    authApi
      .verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(err instanceof Error ? err.message : 'Verification failed.');
      });
  }, [token]);

  return (
    <AuthShell
      title={status === 'success' ? 'Email verified' : status === 'error' ? 'Verification failed' : 'Verifying…'}
      footer={status === 'error'
        ? <span>Need a new link? <Link to="/login">Sign in</Link> to resend.</span>
        : <Link to="/login">Continue to sign in</Link>}
    >
      {status === 'pending' && <Alert $variant="success">Confirming your email address…</Alert>}
      {status === 'success' && <Alert $variant="success">Your email is confirmed. You can now sign in.</Alert>}
      {status === 'error' && <Alert $variant="error">{message}</Alert>}
    </AuthShell>
  );
}
