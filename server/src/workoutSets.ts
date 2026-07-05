// Pure helper: expand a split's prescription into the WorkoutSet rows a new
// workout starts with. Kept free of Prisma so it can be unit-tested.

export interface PrescriptionExercise {
  exerciseId: string;
  exerciseName: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number | null;
}

export interface PlannedSet {
  exerciseId: string;
  exerciseName: string;
  sortOrder: number;
  setNumber: number;
  targetReps: number;
  targetWeight: number | null;
}

// Sets are ordered exercise-by-exercise (the order you train), numbered 1..N
// within each exercise. sortOrder is a single global sequence with gaps so
// extra sets can be inserted later without renumbering.
export function buildSetsFromSplit(exercises: PrescriptionExercise[]): PlannedSet[] {
  const sets: PlannedSet[] = [];
  let sortOrder = 10;
  for (const e of exercises) {
    for (let n = 1; n <= e.targetSets; n += 1) {
      sets.push({
        exerciseId: e.exerciseId,
        exerciseName: e.exerciseName,
        sortOrder,
        setNumber: n,
        targetReps: e.targetReps,
        targetWeight: e.targetWeight,
      });
      sortOrder += 10;
    }
  }
  return sets;
}

// The next setNumber for an exercise within an existing workout (for the
// "add a set" action).
export function nextSetNumber(existing: Array<{ exerciseName: string; setNumber: number }>, exerciseName: string): number {
  let max = 0;
  for (const s of existing) {
    if (s.exerciseName === exerciseName && s.setNumber > max) max = s.setNumber;
  }
  return max + 1;
}
