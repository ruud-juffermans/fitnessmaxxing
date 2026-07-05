import { useEffect, useMemo, useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { Button, Card, H1, Input, Muted, PageHeader, Select } from '../components/ui';
import { MUSCLE_GROUP_LABELS, type Exercise, type SplitDetail, type WorkoutPlan } from '../types';

// Edit one plan: its splits (days) and each split's prescription — the
// exercises with their target sets x reps (and optional weight/rest).
export function PlanDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [catalogue, setCatalogue] = useState<Exercise[]>([]);
  const [selectedSplitId, setSelectedSplitId] = useState<string | null>(null);
  const [split, setSplit] = useState<SplitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newSplitName, setNewSplitName] = useState('');
  const [startBusy, setStartBusy] = useState(false);

  // Add-exercise form
  const [addExerciseId, setAddExerciseId] = useState('');
  const [addSets, setAddSets] = useState('3');
  const [addReps, setAddReps] = useState('10');
  const [addWeight, setAddWeight] = useState('');

  async function reloadPlan(keepSelection = true) {
    const plans = await api.listPlans(true);
    const found = plans.find((p) => p.id === id) ?? null;
    setPlan(found);
    if (found && (!keepSelection || !selectedSplitId)) {
      setSelectedSplitId(found.splits[0]?.id ?? null);
    }
    return found;
  }

  useEffect(() => {
    Promise.all([reloadPlan(false), api.listExercises().then(setCatalogue)])
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load plan.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!selectedSplitId) {
      setSplit(null);
      return;
    }
    api
      .getSplit(selectedSplitId)
      .then(setSplit)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load split.'));
  }, [selectedSplitId]);

  const availableExercises = useMemo(
    () => catalogue.filter((e) => !e.archived),
    [catalogue],
  );

  async function reloadSplit() {
    if (selectedSplitId) setSplit(await api.getSplit(selectedSplitId));
    await reloadPlan();
  }

  async function onAddSplit(e: FormEvent) {
    e.preventDefault();
    if (!plan || !newSplitName.trim()) return;
    const created = await api.createSplit(plan.id, { name: newSplitName.trim() });
    setNewSplitName('');
    await reloadPlan();
    setSelectedSplitId(created.id);
  }

  async function onRenameSplit(name: string) {
    if (!split || !name.trim() || name === split.name) return;
    await api.updateSplit(split.id, { name: name.trim() });
    await reloadSplit();
  }

  async function onDeleteSplit() {
    if (!split) return;
    if (!window.confirm(`Delete the "${split.name}" split?`)) return;
    await api.deleteSplit(split.id);
    setSelectedSplitId(null);
    const found = await reloadPlan(false);
    setSelectedSplitId(found?.splits[0]?.id ?? null);
  }

  async function onAddExercise(e: FormEvent) {
    e.preventDefault();
    if (!split || !addExerciseId) return;
    await api.addSplitExercise(split.id, {
      exerciseId: addExerciseId,
      targetSets: Number(addSets) || 3,
      targetReps: Number(addReps) || 10,
      targetWeight: addWeight === '' ? null : Number(addWeight),
    });
    setAddExerciseId('');
    await reloadSplit();
  }

  async function onPatchPrescription(itemId: string, patch: Record<string, number | null>) {
    await api.updateSplitExercise(itemId, patch);
    await reloadSplit();
  }

  async function onRemoveExercise(itemId: string) {
    await api.removeSplitExercise(itemId);
    await reloadSplit();
  }

  async function onStartWorkout() {
    if (!split) return;
    setStartBusy(true);
    try {
      await api.startWorkout({ splitId: split.id });
      navigate('/workout');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start workout.');
      setStartBusy(false);
    }
  }

  if (loading) return <Muted>Loading…</Muted>;
  if (!plan) {
    return (
      <div>
        <PageHeader>
          <H1>Plan not found</H1>
        </PageHeader>
        <Muted>
          This plan doesn't exist (anymore). <Link to="/plans">Back to plans</Link>
        </Muted>
      </div>
    );
  }

  return (
    <div>
      <PageHeader>
        <div>
          <Crumb to="/plans">← Plans</Crumb>
          <H1>{plan.name}</H1>
          {plan.description && <Muted>{plan.description}</Muted>}
        </div>
      </PageHeader>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      <SplitTabs>
        {plan.splits.map((s, i) => (
          <SplitTab key={s.id} $active={s.id === selectedSplitId} onClick={() => setSelectedSplitId(s.id)}>
            <em>Day {i + 1}</em>
            {s.name}
          </SplitTab>
        ))}
        <AddSplitForm onSubmit={onAddSplit}>
          <Input
            placeholder='New split, e.g. "Back & Biceps"'
            value={newSplitName}
            onChange={(e) => setNewSplitName(e.target.value)}
          />
          <Button type="submit">Add split</Button>
        </AddSplitForm>
      </SplitTabs>

      {split && (
        <SplitCard>
          <SplitHeader>
            <NameInput
              key={split.id}
              defaultValue={split.name}
              onBlur={(e) => onRenameSplit(e.target.value)}
              aria-label="Split name"
            />
            <SplitActions>
              <Button variant="primary" onClick={onStartWorkout} disabled={startBusy || split.exercises.length === 0}>
                {startBusy ? 'Starting…' : 'Start this workout'}
              </Button>
              <Button variant="danger" onClick={onDeleteSplit}>
                Delete split
              </Button>
            </SplitActions>
          </SplitHeader>

          {split.exercises.length === 0 ? (
            <Muted>No exercises yet — add the first one below.</Muted>
          ) : (
            <Table>
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th>Sets</th>
                  <th>Reps</th>
                  <th>Weight (kg)</th>
                  <th>Rest (s)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {split.exercises.map((item) => (
                  <tr key={item.id}>
                    <td data-label="Exercise">
                      <strong>{item.exercise.name}</strong>
                      <Muted> {MUSCLE_GROUP_LABELS[item.exercise.muscleGroup]}</Muted>
                    </td>
                    <td data-label="Sets">
                      <NumInput
                        key={`sets-${item.id}-${item.targetSets}`}
                        type="number"
                        min={1}
                        max={20}
                        defaultValue={item.targetSets}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v >= 1 && v !== item.targetSets) onPatchPrescription(item.id, { targetSets: v });
                        }}
                      />
                    </td>
                    <td data-label="Reps">
                      <NumInput
                        key={`reps-${item.id}-${item.targetReps}`}
                        type="number"
                        min={1}
                        max={200}
                        defaultValue={item.targetReps}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v >= 1 && v !== item.targetReps) onPatchPrescription(item.id, { targetReps: v });
                        }}
                      />
                    </td>
                    <td data-label="Weight">
                      <NumInput
                        key={`weight-${item.id}-${item.targetWeight}`}
                        type="number"
                        min={0}
                        step="0.5"
                        placeholder="—"
                        defaultValue={item.targetWeight ?? ''}
                        onBlur={(e) => {
                          const v = e.target.value === '' ? null : Number(e.target.value);
                          if (v !== item.targetWeight) onPatchPrescription(item.id, { targetWeight: v });
                        }}
                      />
                    </td>
                    <td data-label="Rest">
                      <NumInput
                        key={`rest-${item.id}-${item.restSeconds}`}
                        type="number"
                        min={0}
                        step={15}
                        placeholder="—"
                        defaultValue={item.restSeconds ?? ''}
                        onBlur={(e) => {
                          const v = e.target.value === '' ? null : Number(e.target.value);
                          if (v !== item.restSeconds) onPatchPrescription(item.id, { restSeconds: v });
                        }}
                      />
                    </td>
                    <td>
                      <SmallBtn variant="danger" onClick={() => onRemoveExercise(item.id)}>
                        Remove
                      </SmallBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}

          <AddExerciseForm onSubmit={onAddExercise}>
            <Select value={addExerciseId} onChange={(e) => setAddExerciseId(e.target.value)} required>
              <option value="">Add an exercise…</option>
              {availableExercises.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.name} ({MUSCLE_GROUP_LABELS[ex.muscleGroup]})
                </option>
              ))}
            </Select>
            <LabeledNum>
              <span>Sets</span>
              <NumInput type="number" min={1} max={20} value={addSets} onChange={(e) => setAddSets(e.target.value)} />
            </LabeledNum>
            <LabeledNum>
              <span>Reps</span>
              <NumInput type="number" min={1} max={200} value={addReps} onChange={(e) => setAddReps(e.target.value)} />
            </LabeledNum>
            <LabeledNum>
              <span>Kg</span>
              <NumInput
                type="number"
                min={0}
                step="0.5"
                placeholder="—"
                value={addWeight}
                onChange={(e) => setAddWeight(e.target.value)}
              />
            </LabeledNum>
            <Button type="submit" variant="primary" disabled={!addExerciseId}>
              Add
            </Button>
          </AddExerciseForm>
          <Muted>
            Missing an exercise? Add it to your <Link to="/exercises">catalogue</Link> first.
          </Muted>
        </SplitCard>
      )}
    </div>
  );
}

const Crumb = styled(Link)`
  display: inline-block;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: ${({ theme }) => theme.space.xs};
`;

const SplitTabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
  align-items: center;
  margin-bottom: ${({ theme }) => theme.space.lg};
`;

const SplitTab = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: ${({ theme }) => theme.space.sm} ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $active }) => ($active ? theme.colors.primarySoft : theme.colors.surface)};
  color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.text)};
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  cursor: pointer;

  em {
    font-style: normal;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: ${({ theme }) => theme.colors.textFaint};
  }
`;

const AddSplitForm = styled.form`
  display: flex;
  gap: ${({ theme }) => theme.space.xs};
  margin-left: auto;

  input {
    min-width: 210px;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    margin-left: 0;
    width: 100%;

    input {
      flex: 1;
    }
  }
`;

const SplitCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
`;

const SplitHeader = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.md};
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
`;

const NameInput = styled(Input)`
  font-family: ${({ theme }) => theme.fonts.heading};
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: ${({ theme }) => theme.fontWeights.bold};
  background: transparent;
  border-color: transparent;
  max-width: 340px;

  &:hover:not(:focus) {
    border-color: ${({ theme }) => theme.colors.border};
  }
`;

const SplitActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.sm};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  th {
    text-align: left;
    color: ${({ theme }) => theme.colors.textMuted};
    font-weight: ${({ theme }) => theme.fontWeights.medium};
    padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.sm};
  }

  td {
    padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.sm};
    border-top: 1px solid ${({ theme }) => theme.colors.border};
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    thead {
      display: none;
    }

    tr {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: ${({ theme }) => theme.space.xs};
      padding: ${({ theme }) => theme.space.sm} 0;
      border-top: 1px solid ${({ theme }) => theme.colors.border};
    }

    td {
      border: none;
      padding: 0;
    }

    td[data-label='Exercise'] {
      grid-column: 1 / -1;
    }

    td[data-label]::before {
      content: attr(data-label);
      display: block;
      font-size: ${({ theme }) => theme.fontSizes.xs};
      color: ${({ theme }) => theme.colors.textFaint};
    }

    td[data-label='Exercise']::before {
      display: none;
    }
  }
`;

const NumInput = styled(Input)`
  width: 84px;
  min-height: 36px;
  padding: ${({ theme }) => theme.space.xs} ${({ theme }) => theme.space.sm};
`;

const AddExerciseForm = styled.form`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
  align-items: end;
  padding-top: ${({ theme }) => theme.space.md};
  border-top: 1px dashed ${({ theme }) => theme.colors.borderStrong};

  select {
    flex: 1;
    min-width: 220px;
  }
`;

const LabeledNum = styled.label`
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
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
