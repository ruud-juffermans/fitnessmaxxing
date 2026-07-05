import styled from 'styled-components';
import { useAuth } from '../auth';
import { H1, Muted, PageHeader } from '../components/ui';
import { AccountSection } from './AccountSection';

export function Settings() {
  const { user } = useAuth();

  return (
    <div>
      <PageHeader>
        <H1>Settings</H1>
        {!user?.isGuest && <Muted>{user?.email}</Muted>}
      </PageHeader>

      <AccountSection />

      <About>
        <Muted>
          fitnessmaxxing — plan your splits, log every set. Manage your exercise catalogue on the
          Exercises page and your workout plans on the Plans page.
        </Muted>
      </About>
    </div>
  );
}

const About = styled.div`
  margin-top: ${({ theme }) => theme.space.xl};
`;
