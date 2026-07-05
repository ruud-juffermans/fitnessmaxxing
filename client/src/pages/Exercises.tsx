import { useEffect, useMemo, useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { api } from '../api';
import { Button, Card, H1, Input, Muted, PageHeader, Select } from '../components/ui';
import { MUSCLE_GROUPS, MUSCLE_GROUP_LABELS, type Exercise, type MuscleGroup } from '../types';

// The user's exercise catalogue: everything splits and workouts pick from.
export function Exercises() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<'' | MuscleGroup>('');

  // Add form
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>('chest');
  const [equipment, setEquipment] = useState('');
  const [busy, setBusy] = useState(false);

  async function reload() {
    try {
      setExercises(await api.listExercises(true));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load exercises.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  const visible = useMemo(
    () =>
      exercises.filter(
        (e) =>
          (!groupFilter || e.muscleGroup === groupFilter) &&
          (!search || e.name.toLowerCase().includes(search.toLowerCase())),
      ),
    [exercises, search, groupFilter],
  );

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.createExercise({ name: name.trim(), muscleGroup, equipment: equipment.trim() || null });
      setName('');
      setEquipment('');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add exercise.');
    } finally {
      setBusy(false);
    }
  }

  async function onToggleArchived(ex: Exercise) {
    await api.updateExercise(ex.id, { archived: !ex.archived });
    await reload();
  }

  async function onDelete(ex: Exercise) {
    if (!window.confirm(`Delete "${ex.name}"? It is removed from any splits; logged workouts keep their history.`)) return;
    await api.deleteExercise(ex.id);
    await reload();
  }

  return (
    <div>
      <PageHeader>
        <H1>Exercises</H1>
        <Muted>{exercises.filter((e) => !e.archived).length} in your catalogue</Muted>
      </PageHeader>

      <AddCard as="form" onSubmit={onCreate}>
        <AddGrid>
          <Input placeholder="Exercise name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Select value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value as MuscleGroup)}>
            {MUSCLE_GROUPS.map((g) => (
              <option key={g} value={g}>
                {MUSCLE_GROUP_LABELS[g]}
              </option>
            ))}
          </Select>
          <Input placeholder="Equipment (optional)" value={equipment} onChange={(e) => setEquipment(e.target.value)} />
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Adding…' : 'Add exercise'}
          </Button>
        </AddGrid>
      </AddCard>

      {error && <ErrorMsg>{error}</ErrorMsg>}

      <Toolbar>
        <Input
          type="search"
          placeholder="Search exercises"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value as '' | MuscleGroup)}>
          <option value="">All muscle groups</option>
          {MUSCLE_GROUPS.map((g) => (
            <option key={g} value={g}>
              {MUSCLE_GROUP_LABELS[g]}
            </option>
          ))}
        </Select>
      </Toolbar>

      {loading ? (
        <Muted>Loading…</Muted>
      ) : visible.length === 0 ? (
        <Muted>No exercises match.</Muted>
      ) : (
        <List>
          {visible.map((ex) => (
            <ExerciseRow key={ex.id} $archived={ex.archived}>
              <div>
                <strong>{ex.name}</strong>
                <Meta>
                  <GroupTag>{MUSCLE_GROUP_LABELS[ex.muscleGroup]}</GroupTag>
                  {ex.equipment && <Muted>{ex.equipment}</Muted>}
                  {ex.archived && <Muted>archived</Muted>}
                </Meta>
              </div>
              <RowActions>
                <SmallBtn onClick={() => onToggleArchived(ex)}>{ex.archived ? 'Restore' : 'Archive'}</SmallBtn>
                <SmallBtn variant="danger" onClick={() => onDelete(ex)}>
                  Delete
                </SmallBtn>
              </RowActions>
            </ExerciseRow>
          ))}
        </List>
      )}
    </div>
  );
}

const AddCard = styled(Card)`
  margin-bottom: ${({ theme }) => theme.space.lg};
`;

const AddGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr auto;
  gap: ${({ theme }) => theme.space.sm};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const Toolbar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.sm};
  margin-bottom: ${({ theme }) => theme.space.lg};

  input {
    flex: 1;
    max-width: 340px;
  }
`;

const List = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space.sm};

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const ExerciseRow = styled.div<{ $archived?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
  opacity: ${({ $archived }) => ($archived ? 0.55 : 1)};
`;

const Meta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  margin-top: 2px;
`;

const GroupTag = styled.span`
  display: inline-block;
  padding: 1px 9px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: ${({ theme }) => theme.fontWeights.medium};
`;

const RowActions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.xs};
  flex-shrink: 0;
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
