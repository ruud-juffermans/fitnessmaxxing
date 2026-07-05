import { useEffect, useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Button, Card, H1, Input, Muted, PageHeader, TextArea } from '../components/ui';
import type { WorkoutPlan } from '../types';

// All workout plans. Each plan is a set of splits ("Back & Biceps", ...);
// click through to edit its days and prescriptions.
export function Plans() {
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);

  async function reload() {
    try {
      setPlans(await api.listPlans());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load plans.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.createPlan({ name: name.trim(), description: description.trim() || null });
      setName('');
      setDescription('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create plan.');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(plan: WorkoutPlan) {
    if (!window.confirm(`Delete "${plan.name}" and its splits? Logged workouts are kept.`)) return;
    await api.deletePlan(plan.id);
    await reload();
  }

  return (
    <div>
      <PageHeader>
        <H1>Plans</H1>
        <Muted>{plans.length} plan{plans.length === 1 ? '' : 's'}</Muted>
      </PageHeader>

      <CreateCard as="form" onSubmit={onCreate}>
        <CreateGrid>
          <Input
            placeholder='Plan name, e.g. "3-Day Split"'
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <TextArea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={1}
          />
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create plan'}
          </Button>
        </CreateGrid>
      </CreateCard>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      {loading ? (
        <Muted>Loading…</Muted>
      ) : plans.length === 0 ? (
        <Muted>No plans yet — create your first one above.</Muted>
      ) : (
        <Grid>
          {plans.map((plan) => (
            <PlanCard key={plan.id}>
              <PlanTop>
                <div>
                  <PlanName to={`/plans/${plan.id}`}>{plan.name}</PlanName>
                  {plan.description && <Desc>{plan.description}</Desc>}
                </div>
                <SmallBtn variant="danger" onClick={() => onDelete(plan)}>
                  Delete
                </SmallBtn>
              </PlanTop>
              <SplitChips>
                {plan.splits.length === 0 ? (
                  <Muted>No splits yet</Muted>
                ) : (
                  plan.splits.map((s, i) => (
                    <SplitChip key={s.id}>
                      <em>Day {i + 1}</em> {s.name}
                      <span>{s._count.exercises} exercises</span>
                    </SplitChip>
                  ))
                )}
              </SplitChips>
              <CardFooter>
                <Button as={Link} to={`/plans/${plan.id}`}>
                  Edit plan
                </Button>
              </CardFooter>
            </PlanCard>
          ))}
        </Grid>
      )}
    </div>
  );
}

const CreateCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.space.lg};
`;

const CreateGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr auto;
  gap: ${({ theme }) => theme.space.sm};
  align-items: start;

  textarea {
    min-height: 42px;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space.lg};

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const PlanCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
`;

const PlanTop = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
  align-items: start;
`;

const PlanName = styled(Link)`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none !important;

  &:hover {
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const Desc = styled.p`
  margin: ${({ theme }) => theme.space.xs} 0 0;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const SplitChips = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
`;

const SplitChip = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.medium};

  em {
    font-style: normal;
    color: ${({ theme }) => theme.colors.primary};
    font-size: ${({ theme }) => theme.fontSizes.xs};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  span {
    margin-left: auto;
    color: ${({ theme }) => theme.colors.textFaint};
    font-weight: ${({ theme }) => theme.fontWeights.regular};
    font-size: ${({ theme }) => theme.fontSizes.xs};
  }
`;

const CardFooter = styled.div`
  margin-top: auto;
`;

const SmallBtn = styled(Button)`
  min-height: 30px;
  padding: 4px 10px;
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const ErrorMsg = styled.div`
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: ${({ theme }) => theme.space.md};
`;
