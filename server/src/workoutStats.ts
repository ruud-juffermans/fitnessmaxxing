// Pure stats computations over completed workouts/sets. Kept free of Prisma so
// they can be unit-tested; the /api/stats route feeds them plain rows.

export interface StatSet {
  exerciseName: string;
  muscleGroup: string | null;
  reps: number | null;
  weight: number | null;
  completedAt: Date | null;
}

export interface StatWorkout {
  startedAt: Date;
  completedAt: Date | null;
  sets: StatSet[];
}

// Volume of a single set: reps x weight. Bodyweight/unweighted sets count 0
// volume but still count as completed sets.
export function setVolume(s: StatSet): number {
  if (!s.completedAt || s.reps == null || s.weight == null) return 0;
  return s.reps * s.weight;
}

export interface WeekBucket {
  weekStart: string; // YYYY-MM-DD (Monday)
  workouts: number;
  sets: number;
  volume: number;
}

// Monday of the week containing d, as a YYYY-MM-DD string (UTC-based; day
// bucketing precision is fine for charts).
export function mondayOf(d: Date): string {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay(); // 0 = Sun
  const diff = day === 0 ? 6 : day - 1;
  date.setUTCDate(date.getUTCDate() - diff);
  return date.toISOString().slice(0, 10);
}

// Buckets the trailing `weeks` weeks (oldest first, current week last), zeros
// included so charts have a continuous axis.
export function weeklyBuckets(workouts: StatWorkout[], weeks: number, now = new Date()): WeekBucket[] {
  const buckets = new Map<string, WeekBucket>();
  const cursor = new Date(now);
  for (let i = 0; i < weeks; i += 1) {
    const key = mondayOf(cursor);
    buckets.set(key, { weekStart: key, workouts: 0, sets: 0, volume: 0 });
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }

  for (const w of workouts) {
    if (!w.completedAt) continue;
    const key = mondayOf(w.startedAt);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.workouts += 1;
    for (const s of w.sets) {
      if (!s.completedAt) continue;
      bucket.sets += 1;
      bucket.volume += setVolume(s);
    }
  }

  return [...buckets.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

export interface MuscleGroupStat {
  muscleGroup: string;
  sets: number;
  volume: number;
}

export function muscleGroupBreakdown(workouts: StatWorkout[]): MuscleGroupStat[] {
  const groups = new Map<string, MuscleGroupStat>();
  for (const w of workouts) {
    for (const s of w.sets) {
      if (!s.completedAt) continue;
      const key = s.muscleGroup ?? 'other';
      const entry = groups.get(key) ?? { muscleGroup: key, sets: 0, volume: 0 };
      entry.sets += 1;
      entry.volume += setVolume(s);
      groups.set(key, entry);
    }
  }
  return [...groups.values()].sort((a, b) => b.sets - a.sets);
}

export interface PersonalRecord {
  exerciseName: string;
  weight: number;
  reps: number;
  date: string; // YYYY-MM-DD
}

// Best (heaviest, ties broken by reps) completed set per exercise.
export function personalRecords(workouts: StatWorkout[], limit = 10): PersonalRecord[] {
  const best = new Map<string, PersonalRecord>();
  for (const w of workouts) {
    for (const s of w.sets) {
      if (!s.completedAt || s.weight == null || s.reps == null) continue;
      const current = best.get(s.exerciseName);
      if (!current || s.weight > current.weight || (s.weight === current.weight && s.reps > current.reps)) {
        best.set(s.exerciseName, {
          exerciseName: s.exerciseName,
          weight: s.weight,
          reps: s.reps,
          date: w.startedAt.toISOString().slice(0, 10),
        });
      }
    }
  }
  return [...best.values()].sort((a, b) => b.weight - a.weight).slice(0, limit);
}
