import styled from 'styled-components';
import { accountDashboardUrl } from '../api';
import { useAuth } from '../auth';
import { Muted } from '../components/ui';

// "Account" panel for the Settings page. Shows the signed-in identity; all
// account management (guest conversion, password, profile, sessions) lives in
// the central account app. Matches Settings' Section style.
export function AccountSection() {
  const { user } = useAuth();
  return (
    <>
      <Section>
        {user?.isGuest ? (
          <>
            <SectionTitle>You're browsing as a guest</SectionTitle>
            <Muted>
              Guest sessions are temporary and their data is eventually cleaned up.{' '}
              <a href={accountDashboardUrl()}>Create your account</a> to keep your plans and
              workout history.
            </Muted>
          </>
        ) : (
          <>
            <SectionTitle>Account</SectionTitle>
            <Muted>Signed in as {user?.email}</Muted>
          </>
        )}
      </Section>
      <Muted>
        Manage your profile, password and active sessions on your{' '}
        <a href={accountDashboardUrl()}>ruudjuffermans account</a> — one account for all apps.
      </Muted>
    </>
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
