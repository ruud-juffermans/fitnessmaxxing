import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { api } from '../api';
import { Card, H1, Muted, PageHeader } from '../components/ui';
import { fmtVolume, fmtWeight } from '../format';
import { MUSCLE_GROUP_LABELS, type MuscleGroup, type Stats as StatsType } from '../types';

export function Stats() {
  const [stats, setStats] = useState<StatsType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load stats.'));
  }, []);

  const maxWeekVolume = useMemo(
    () => Math.max(1, ...(stats?.weeks.map((w) => w.volume) ?? [1])),
    [stats],
  );
  const maxGroupSets = useMemo(
    () => Math.max(1, ...(stats?.muscleGroups.map((g) => g.sets) ?? [1])),
    [stats],
  );

  if (error) return <ErrorMsg>{error}</ErrorMsg>;
  if (!stats) return <Muted>Loading…</Muted>;

  return (
    <div>
      <PageHeader>
        <H1>Stats</H1>
      </PageHeader>

      <Tiles>
        <Tile>
          <em>{stats.totalWorkouts}</em>
          <span>workouts</span>
        </Tile>
        <Tile>
          <em>{stats.totalSets}</em>
          <span>sets logged</span>
        </Tile>
        <Tile>
          <em>{fmtVolume(stats.totalVolume)}</em>
          <span>total volume</span>
        </Tile>
      </Tiles>

      <Section>
        <SectionTitle>Volume — last 12 weeks</SectionTitle>
        <ChartRow>
          {stats.weeks.map((w) => (
            <BarCol key={w.weekStart} title={`${w.weekStart}: ${w.workouts} workouts, ${fmtVolume(w.volume)}`}>
              <BarTrack>
                <Bar $pct={(w.volume / maxWeekVolume) * 100} />
              </BarTrack>
              <BarLabel>{w.weekStart.slice(5)}</BarLabel>
            </BarCol>
          ))}
        </ChartRow>
      </Section>

      <Grid>
        <Section>
          <SectionTitle>Muscle groups — last 30 days</SectionTitle>
          {stats.muscleGroups.length === 0 ? (
            <Muted>No sets logged in the last 30 days.</Muted>
          ) : (
            <GroupList>
              {stats.muscleGroups.map((g) => (
                <GroupRow key={g.muscleGroup}>
                  <span>{MUSCLE_GROUP_LABELS[g.muscleGroup as MuscleGroup] ?? g.muscleGroup}</span>
                  <GroupTrack>
                    <GroupFill $pct={(g.sets / maxGroupSets) * 100} />
                  </GroupTrack>
                  <Muted>{g.sets} sets</Muted>
                </GroupRow>
              ))}
            </GroupList>
          )}
        </Section>

        <Section>
          <SectionTitle>Personal records</SectionTitle>
          {stats.personalRecords.length === 0 ? (
            <Muted>Log weighted sets to start tracking PRs.</Muted>
          ) : (
            <PrList>
              {stats.personalRecords.map((pr) => (
                <PrRow key={pr.exerciseName}>
                  <strong>{pr.exerciseName}</strong>
                  <PrValue>
                    {fmtWeight(pr.weight)} × {pr.reps}
                  </PrValue>
                  <Muted>{pr.date}</Muted>
                </PrRow>
              ))}
            </PrList>
          )}
        </Section>
      </Grid>
    </div>
  );
}

const Tiles = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: ${({ theme }) => theme.space.md};
  margin-bottom: ${({ theme }) => theme.space.lg};

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
  }
`;

const Tile = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 2px;

  em {
    font-style: normal;
    font-family: ${({ theme }) => theme.fonts.heading};
    font-size: ${({ theme }) => theme.fontSizes.xxl};
    font-weight: ${({ theme }) => theme.fontWeights.bold};
    background: ${({ theme }) => theme.colors.gradientPrimary};
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: transparent;
  }

  span {
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: ${({ theme }) => theme.fontSizes.sm};
  }
`;

const Section = styled(Card)`
  margin-bottom: ${({ theme }) => theme.space.lg};
`;

const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.fontSizes.lg};
  margin: 0 0 ${({ theme }) => theme.space.lg};
`;

const ChartRow = styled.div`
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: ${({ theme }) => theme.space.xs};
  align-items: end;
`;

const BarCol = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  min-width: 0;
`;

const BarTrack = styled.div`
  width: 100%;
  height: 120px;
  display: flex;
  align-items: flex-end;
  background: ${({ theme }) => theme.colors.surfaceAlt};
  border-radius: ${({ theme }) => theme.radii.sm};
  overflow: hidden;
`;

const Bar = styled.div<{ $pct: number }>`
  width: 100%;
  height: ${({ $pct }) => Math.max($pct, 1)}%;
  background: ${({ theme }) => theme.colors.gradientPrimary};
  border-radius: ${({ theme }) => theme.radii.sm} ${({ theme }) => theme.radii.sm} 0 0;
`;

const BarLabel = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.textFaint};
  white-space: nowrap;
  overflow: hidden;
  max-width: 100%;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space.lg};

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const GroupList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`;

const GroupRow = styled.div`
  display: grid;
  grid-template-columns: 92px 1fr auto;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const GroupTrack = styled.div`
  height: 10px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.surfaceAlt};
  overflow: hidden;
`;

const GroupFill = styled.div<{ $pct: number }>`
  height: 100%;
  width: ${({ $pct }) => Math.max($pct, 2)}%;
  background: ${({ theme }) => theme.colors.gradientPrimary};
  border-radius: inherit;
`;

const PrList = styled.div`
  display: flex;
  flex-direction: column;
`;

const PrRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.sm} 0;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.fontSizes.sm};

  &:first-child {
    border-top: none;
  }

  strong {
    flex: 1;
  }
`;

const PrValue = styled.span`
  font-weight: ${({ theme }) => theme.fontWeights.semibold};
  color: ${({ theme }) => theme.colors.primary};
`;

const ErrorMsg = styled.div`
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;
