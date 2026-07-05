import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { Button, Card, H1, Input, Muted, PageHeader, Select } from '../components/ui';
import { fmtWeight } from '../format';
import type { Exercise, Workout as WorkoutType, WorkoutPlan, WorkoutSet } from '../types';

// The training screen. Without an active workout it offers every split of
// every plan (plus an empty session); with one it is the set-by-set logger.
export function Workout() {
  const [workout, setWorkout] = useState<WorkoutType | null>(null);
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [catalogue, setCatalogue] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getActiveWorkout(), api.listPlans(), api.listExercises()])
      .then(([active, allPlans, exercises]) => {
        setWorkout(active);
        setPlans(allPlans);
        setCatalogue(exercises.filter((e) => !e.archived));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Muted>Loading…</Muted>;

  return workout ? (
    <ActiveWorkout
      workout={workout}
      catalogue={catalogue}
      onChange={setWorkout}
      onDone={() => setWorkout(null)}
      error={error}
      setError={setError}
    />
  ) : (
    <StartWorkout plans={plans} onStarted={setWorkout} error={error} setError={setError} />
  );
}

/* ------------------------------ start screen ------------------------------ */

function StartWorkout({
  plans,
  onStarted,
  error,
  setError,
}: {
  plans: WorkoutPlan[];
  onStarted: (w: WorkoutType) => void;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);

  async function start(splitId?: string) {
    setBusyId(splitId ?? 'empty');
    setError(null);
    try {
      onStarted(await api.startWorkout(splitId ? { splitId } : {}));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start workout.');
      setBusyId(null);
    }
  }

  const plansWithSplits = plans.filter((p) => p.splits.length > 0);

  return (
    <div>
      <PageHeader>
        <H1>Start a workout</H1>
        <Muted>Pick a split, then log every set.</Muted>
      </PageHeader>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      {plansWithSplits.length === 0 ? (
        <Card>
          <Muted>
            You have no splits yet. <Link to="/plans">Create a plan</Link> with splits like "Back &
            Biceps", fill them with exercises, and start training from here.
          </Muted>
        </Card>
      ) : (
        plansWithSplits.map((plan) => (
          <PlanBlock key={plan.id}>
            <PlanTitle>{plan.name}</PlanTitle>
            <SplitGrid>
              {plan.splits.map((s, i) => (
                <SplitStartCard key={s.id} onClick={() => start(s.id)} disabled={busyId !== null}>
                  <em>Day {i + 1}</em>
                  <strong>{s.name}</strong>
                  <Muted>{s._count.exercises} exercises</Muted>
                  <StartHint>{busyId === s.id ? 'Starting…' : 'Start →'}</StartHint>
                </SplitStartCard>
              ))}
            </SplitGrid>
          </PlanBlock>
        ))
      )}

      <EmptyRow>
        <Muted>Not following a plan today?</Muted>
        <Button onClick={() => start()} disabled={busyId !== null}>
          {busyId === 'empty' ? 'Starting…' : 'Start an empty workout'}
        </Button>
      </EmptyRow>
    </div>
  );
}

/* ------------------------------ active logger ------------------------------ */

function ActiveWorkout({
  workout,
  catalogue,
  onChange,
  onDone,
  error,
  setError,
}: {
  workout: WorkoutType;
  catalogue: Exercise[];
  onChange: (w: WorkoutType) => void;
  onDone: () => void;
  error: string | null;
  setError: (e: string | null) => void;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [addExerciseId, setAddExerciseId] = useState('');
  const [, tick] = useState(0);

  // Re-render every 30s so the elapsed timer stays fresh.
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const groups = useMemo(() => {
    const byExercise = new Map<string, WorkoutSet[]>();
    for (const s of [...workout.sets].sort((a, b) => a.sortOrder - b.sortOrder || a.setNumber - b.setNumber)) {
      const list = byExercise.get(s.exerciseName) ?? [];
      list.push(s);
      byExercise.set(s.exerciseName, list);
    }
    return [...byExercise.entries()];
  }, [workout.sets]);

  const doneCount = workout.sets.filter((s) => s.completedAt).length;
  const total = workout.sets.length;
  const elapsedMin = Math.max(0, Math.round((Date.now() - new Date(workout.startedAt).getTime()) / 60000));

  function patchSetLocal(setId: string, patch: Partial<WorkoutSet>) {
    onChange({
      ...workout,
      sets: workout.sets.map((s) => (s.id === setId ? { ...s, ...patch } : s)),
    });
  }

  async function saveSet(set: WorkoutSet, patch: { reps?: number | null; weight?: number | null; completed?: boolean }) {
    // Optimistic local update; reconcile with the server response.
    patchSetLocal(set.id, {
      ...(patch.reps !== undefined ? { reps: patch.reps } : {}),
      ...(patch.weight !== undefined ? { weight: patch.weight } : {}),
      ...(patch.completed !== undefined ? { completedAt: patch.completed ? new Date().toISOString() : null } : {}),
    });
    try {
      const saved = await api.updateWorkoutSet(workout.id, set.id, patch);
      patchSetLocal(set.id, saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save set.');
    }
  }

  // Checking a set off with empty reps assumes the target was hit — one tap
  // logs the common case; type only when you deviated.
  async function toggleDone(set: WorkoutSet) {
    const completing = !set.completedAt;
    const patch: { completed: boolean; reps?: number | null; weight?: number | null } = { completed: completing };
    if (completing && set.reps == null && set.targetReps != null) patch.reps = set.targetReps;
    if (completing && set.weight == null && set.targetWeight != null) patch.weight = set.targetWeight;
    await saveSet(set, patch);
  }

  async function addSet(exerciseName: string, sets: WorkoutSet[]) {
    const last = sets[sets.length - 1];
    try {
      const created = await api.addWorkoutSet(workout.id, {
        ...(last?.exerciseId ? { exerciseId: last.exerciseId } : { exerciseName }),
        targetReps: last?.targetReps ?? null,
        targetWeight: last?.targetWeight ?? null,
      });
      onChange({ ...workout, sets: [...workout.sets, created] });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add set.');
    }
  }

  async function removeSet(set: WorkoutSet) {
    onChange({ ...workout, sets: workout.sets.filter((s) => s.id !== set.id) });
    try {
      await api.deleteWorkoutSet(workout.id, set.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove set.');
    }
  }

  async function addExercise() {
    if (!addExerciseId) return;
    try {
      const created = await api.addWorkoutSet(workout.id, { exerciseId: addExerciseId });
      onChange({ ...workout, sets: [...workout.sets, created] });
      setAddExerciseId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add exercise.');
    }
  }

  async function finish() {
    const skipped = total - doneCount;
    if (skipped > 0 && !window.confirm(`${skipped} set${skipped === 1 ? '' : 's'} not logged. Finish anyway?`)) return;
    setBusy(true);
    try {
      await api.finishWorkout(workout.id);
      onDone();
      navigate('/history');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not finish workout.');
      setBusy(false);
    }
  }

  async function discard() {
    if (!window.confirm('Discard this workout and everything logged in it?')) return;
    setBusy(true);
    try {
      await api.deleteWorkout(workout.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not discard workout.');
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader>
        <div>
          <H1>{workout.name}</H1>
          <Muted>
            Started {elapsedMin < 1 ? 'just now' : `${elapsedMin} min ago`} · {doneCount}/{total} sets done
          </Muted>
        </div>
        <HeaderActions>
          <Button variant="danger" onClick={discard} disabled={busy}>
            Discard
          </Button>
          <Button variant="primary" onClick={finish} disabled={busy}>
            Finish workout
          </Button>
        </HeaderActions>
      </PageHeader>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      <ProgressTrack>
        <ProgressFill $pct={total === 0 ? 0 : (doneCount / total) * 100} $complete={total > 0 && doneCount === total} />
      </ProgressTrack>

      {groups.map(([exerciseName, sets]) => (
        <ExerciseCard key={exerciseName}>
          <ExerciseHeader>
            <strong>{exerciseName}</strong>
            {sets[0]?.targetReps != null && (
              <Muted>
                target {sets.length} × {sets[0].targetReps}
                {sets[0].targetWeight != null ? ` @ ${fmtWeight(sets[0].targetWeight)}` : ''}
              </Muted>
            )}
          </ExerciseHeader>
          <SetList>
            {sets.map((set) => (
              <SetRow key={set.id} $done={!!set.completedAt}>
                <SetNum>#{set.setNumber}</SetNum>
                <SetField>
                  <span>reps{set.targetReps != null ? ` (${set.targetReps})` : ''}</span>
                  <SetInput
                    type="number"
                    min={0}
                    placeholder={set.targetReps != null ? String(set.targetReps) : '—'}
                    value={set.reps ?? ''}
                    onChange={(e) =>
                      patchSetLocal(set.id, { reps: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    onBlur={(e) => saveSet(set, { reps: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </SetField>
                <SetField>
                  <span>kg{set.targetWeight != null ? ` (${set.targetWeight})` : ''}</span>
                  <SetInput
                    type="number"
                    min={0}
                    step="0.5"
                    placeholder={set.targetWeight != null ? String(set.targetWeight) : '—'}
                    value={set.weight ?? ''}
                    onChange={(e) =>
                      patchSetLocal(set.id, { weight: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    onBlur={(e) => saveSet(set, { weight: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </SetField>
                <DoneBtn
                  $done={!!set.completedAt}
                  onClick={() => toggleDone(set)}
                  aria-label={set.completedAt ? 'Mark set as not done' : 'Mark set as done'}
                >
                  ✓
                </DoneBtn>
                <RemoveBtn onClick={() => removeSet(set)} aria-label="Remove set">
                  ×
                </RemoveBtn>
              </SetRow>
            ))}
          </SetList>
          <AddSetBtn variant="ghost" onClick={() => addSet(exerciseName, sets)}>
            + Add set
          </AddSetBtn>
        </ExerciseCard>
      ))}

      <AddExerciseCard>
        <Select value={addExerciseId} onChange={(e) => setAddExerciseId(e.target.value)}>
          <option value="">Add another exercise…</option>
          {catalogue.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.name}
            </option>
          ))}
        </Select>
        <Button onClick={addExercise} disabled={!addExerciseId}>
          Add
        </Button>
      </AddExerciseCard>
    </div>
  );
}

/* --------------------------------- styles --------------------------------- */

const HeaderActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.sm};
`;

const PlanBlock = styled.div`
  margin-bottom: ${({ theme }) => theme.space.xl};
`;

const PlanTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  margin: 0 0 ${({ theme }) => theme.space.md};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const SplitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: ${({ theme }) => theme.space.md};
`;

const SplitStartCard = styled.button`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space.xs};
  text-align: left;
  padding: ${({ theme }) => theme.space.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  cursor: pointer;
  transition: transform ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    box-shadow ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  em {
    font-style: normal;
    font-size: ${({ theme }) => theme.fontSizes.xs};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${({ theme }) => theme.colors.primary};
    font-weight: ${({ theme }) => theme.fontWeights.semibold};
  }

  strong {
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: ${({ theme }) => theme.fontSizes.lg};
  }

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: ${({ theme }) => theme.shadows.md};
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`;

const StartHint = styled.span`
  margin-top: ${({ theme }) => theme.space.xs};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const EmptyRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  margin-top: ${({ theme }) => theme.space.lg};
`;

const ProgressTrack = styled.div`
  height: 8px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.colors.border};
  overflow: hidden;
  margin-bottom: ${({ theme }) => theme.space.xl};
`;

const ProgressFill = styled.div<{ $pct: number; $complete: boolean }>`
  height: 100%;
  width: ${({ $pct }) => $pct}%;
  background: ${({ theme, $complete }) => ($complete ? theme.colors.success : theme.colors.gradientPrimary)};
  border-radius: inherit;
  transition: width ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.ease};
`;

const ExerciseCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.space.md};
`;

const ExerciseHeader = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
  margin-bottom: ${({ theme }) => theme.space.md};

  strong {
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: ${({ theme }) => theme.fontSizes.lg};
  }
`;

const SetList = styled.div`
  display: flex;
  flex-direction: column;
`;

const SetRow = styled.div<{ $done: boolean }>`
  display: flex;
  align-items: end;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.sm} 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  opacity: ${({ $done }) => ($done ? 0.75 : 1)};
`;

const SetNum = styled.span`
  width: 34px;
  color: ${({ theme }) => theme.colors.textFaint};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  padding-bottom: 9px;
`;

const SetField = styled.label`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textFaint};
`;

const SetInput = styled(Input)`
  width: 92px;
  min-height: 38px;
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.sm};

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    width: 76px;
  }
`;

const DoneBtn = styled.button<{ $done: boolean }>`
  width: 38px;
  height: 38px;
  margin-left: auto;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme, $done }) => ($done ? theme.colors.success : theme.colors.borderStrong)};
  background: ${({ theme, $done }) => ($done ? theme.colors.success : 'transparent')};
  color: ${({ theme, $done }) => ($done ? '#fff' : theme.colors.textFaint)};
  font-size: 16px;
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  cursor: pointer;
  transition: transform ${({ theme }) => theme.motion.normal} ${({ theme }) => theme.motion.spring},
    background-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease},
    border-color ${({ theme }) => theme.motion.fast} ${({ theme }) => theme.motion.ease};

  &:active {
    transform: scale(0.9);
  }
`;

const RemoveBtn = styled.button`
  width: 30px;
  height: 38px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textFaint};
  font-size: 18px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.colors.danger};
  }
`;

const AddSetBtn = styled(Button)`
  margin-top: ${({ theme }) => theme.space.sm};
  min-height: 34px;
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const AddExerciseCard = styled(Card)`
  display: flex;
  gap: ${({ theme }) => theme.space.sm};

  select {
    flex: 1;
  }
`;

const ErrorMsg = styled.div`
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  margin-bottom: ${({ theme }) => theme.space.md};
`;
