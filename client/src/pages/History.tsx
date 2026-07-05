import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { api } from '../api';
import { Button, H1, Muted, PageHeader } from '../components/ui';
import { fmtDate, fmtDuration, fmtVolume, fmtWeight } from '../format';
import type { Workout, WorkoutSet } from '../types';

// Past workouts, newest first; expand one to see every logged set.
export function History() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function reload() {
    try {
      const all = await api.listWorkouts(100);
      setWorkouts(all.filter((w) => w.completedAt));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load history.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  async function onDelete(w: Workout) {
    if (!window.confirm(`Delete the "${w.name}" workout from ${fmtDate(w.startedAt)}?`)) return;
    await api.deleteWorkout(w.id);
    await reload();
  }

  return (
    <div>
      <PageHeader>
        <H1>History</H1>
        <Muted>{workouts.length} workout{workouts.length === 1 ? '' : 's'}</Muted>
      </PageHeader>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      {loading ? (
        <Muted>Loading…</Muted>
      ) : workouts.length === 0 ? (
        <Muted>No finished workouts yet. Your log will appear here.</Muted>
      ) : (
        <List>
          {workouts.map((w) => (
            <WorkoutRow key={w.id}>
              <RowMain onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}>
                <div>
                  <strong>{w.name}</strong>
                  <Muted>
                    {fmtDate(w.startedAt)}
                    {w.completedAt ? ` · ${fmtDuration(w.startedAt, w.completedAt)}` : ''}
                  </Muted>
                </div>
                <RowStats>
                  <Stat>
                    <em>{w.sets.filter((s) => s.completedAt).length}</em> sets
                  </Stat>
                  <Stat>
                    <em>{fmtVolume(volumeOf(w.sets))}</em> volume
                  </Stat>
                  <Chevron $open={expandedId === w.id}>▾</Chevron>
                </RowStats>
              </RowMain>

              {expandedId === w.id && (
                <Detail>
                  {groupSets(w.sets).map(([exercise, sets]) => (
                    <DetailGroup key={exercise}>
                      <strong>{exercise}</strong>
                      <SetsLine>
                        {sets.map((s) => (
                          <SetChip key={s.id} $skipped={!s.completedAt}>
                            {s.completedAt
                              ? `${s.reps ?? '—'} × ${s.weight != null ? fmtWeight(s.weight) : 'bw'}`
                              : 'skipped'}
                          </SetChip>
                        ))}
                      </SetsLine>
                    </DetailGroup>
                  ))}
                  <DetailFooter>
                    <Button variant="danger" onClick={() => onDelete(w)}>
                      Delete workout
                    </Button>
                  </DetailFooter>
                </Detail>
              )}
            </WorkoutRow>
          ))}
        </List>
      )}
    </div>
  );
}

function volumeOf(sets: WorkoutSet[]): number {
  return sets.reduce((sum, s) => (s.completedAt && s.reps != null && s.weight != null ? sum + s.reps * s.weight : sum), 0);
}

function groupSets(sets: WorkoutSet[]): Array<[string, WorkoutSet[]]> {
  const byExercise = new Map<string, WorkoutSet[]>();
  for (const s of [...sets].sort((a, b) => a.sortOrder - b.sortOrder || a.setNumber - b.setNumber)) {
    const list = byExercise.get(s.exerciseName) ?? [];
    list.push(s);
    byExercise.set(s.exerciseName, list);
  }
  return [...byExercise.entries()];
}

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`;

const WorkoutRow = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.xs};
  overflow: hidden;
`;

const RowMain = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
  width: 100%;
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  color: inherit;

  strong {
    display: block;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: ${({ theme }) => theme.fontSizes.lg};
  }
`;

const RowStats = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.lg};
  flex-shrink: 0;
`;

const Stat = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};

  em {
    display: block;
    font-style: normal;
    color: ${({ theme }) => theme.colors.text};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
    font-size: ${({ theme }) => theme.fontSizes.md};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    &:last-of-type {
      display: none;
    }
  }
`;

const Chevron = styled.span<{ $open: boolean }>`
  color: ${({ theme }) => theme.colors.textFaint};
  transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
  transition: transform ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};
`;

const Detail = styled.div`
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
`;

const DetailGroup = styled.div`
  strong {
    display: block;
    font-size: ${({ theme }) => theme.fontSizes.sm};
    margin-bottom: ${({ theme }) => theme.space.xs};
  }
`;

const SetsLine = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.xs};
`;

const SetChip = styled.span<{ $skipped?: boolean }>`
  padding: 2px 10px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme, $skipped }) => ($skipped ? 'transparent' : theme.colors.surfaceAlt)};
  color: ${({ theme, $skipped }) => ($skipped ? theme.colors.textFaint : theme.colors.text)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const DetailFooter = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const ErrorMsg = styled.div`
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: ${({ theme }) => theme.space.md};
`;
