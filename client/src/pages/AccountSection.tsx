import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { accountDashboardUrl } from '../api';
import { useAuth } from '../auth';
import { Button, Input, Muted } from '../components/ui';

// "Account" panel for the Settings page. For a guest it offers a "create your
// account" form (claiming the trial data); for a real user it shows the
// signed-in identity. Password changes live in the central account app.
// Matches Settings' Section style.
export function AccountSection() {
  const { user } = useAuth();
  return (
    <>
      {user?.isGuest ? <ConvertSection /> : <SignedInSection />}
      <Muted>
        Manage your profile, password and active sessions on your{' '}
        <a href={accountDashboardUrl()}>ruudjuffermans account</a> — one account for all apps.
      </Muted>
    </>
  );
}

// Upgrade a guest into a real account, keeping all of their existing data.
function ConvertSection() {
  const { convert } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
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
      await convert({ email, password, name: name || undefined });
      // On success the user is no longer a guest, so this panel swaps to the
      // normal account view on the next render.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section>
      <SectionTitle>Create your account</SectionTitle>
      <Muted>You're using a guest account. Add an email and password to keep your plans and workout history.</Muted>

      <Form onSubmit={onSubmit}>
        {error && <Msg $error>{error}</Msg>}
        <Grid>
          <Input
            type="text"
            placeholder="Name (optional)"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            type="email"
            placeholder="Email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
          <Input
            type="password"
            placeholder="Confirm password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </Button>
        </Grid>
      </Form>
    </Section>
  );
}

function SignedInSection() {
  const { user } = useAuth();
  return (
    <Section>
      <SectionTitle>Account</SectionTitle>
      <Muted>Signed in as {user?.email}</Muted>
    </Section>
  );
}

const Section = styled.section`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.space.lg};
  margin-bottom: ${({ theme }) => theme.space.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: ${({ theme }) => theme.space.md};
  }
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  margin: 0 0 ${({ theme }) => theme.space.md};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  margin-top: ${({ theme }) => theme.space.md};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: ${({ theme }) => theme.space.sm};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const Msg = styled.div<{ $error?: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme, $error }) => ($error ? theme.colors.danger : theme.colors.success)};
`;
