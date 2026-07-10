export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  isGuest: boolean;
  role: 'user' | 'admin';
}

export const MUSCLE_GROUPS = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes',
  'core', 'forearms', 'calves', 'full_body', 'cardio', 'other',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  legs: 'Legs',
  glutes: 'Glutes',
  core: 'Core',
  forearms: 'Forearms',
  calves: 'Calves',
  full_body: 'Full body',
  cardio: 'Cardio',
  other: 'Other',
};

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment: string | null;
  notes: string | null;
  archived: boolean;
  createdAt: string;
}

export interface SplitSummary {
  id: string;
  planId: string;
  name: string;
  sortOrder: number;
  _count: { exercises: number };
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
  archived: boolean;
  createdAt: string;
  splits: SplitSummary[];
}

export interface SplitExercise {
  id: string;
  splitId: string;
  exerciseId: string;
  sortOrder: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number | null;
  restSeconds: number | null;
  notes: string | null;
  exercise: Pick<Exercise, 'id' | 'name' | 'muscleGroup' | 'equipment' | 'archived'>;
}

export interface SplitDetail {
  id: string;
  planId: string;
  name: string;
  sortOrder: number;
  exercises: SplitExercise[];
  plan?: { id: string; name: string };
}

export interface WorkoutSet {
  id: string;
  workoutId: string;
  exerciseId: string | null;
  exerciseName: string;
  sortOrder: number;
  setNumber: number;
  targetReps: number | null;
  targetWeight: number | null;
  reps: number | null;
  weight: number | null;
  completedAt: string | null;
}

export interface Workout {
  id: string;
  planId: string | null;
  splitId: string | null;
  name: string;
  notes: string | null;
  startedAt: string;
  completedAt: string | null;
  sets: WorkoutSet[];
}

export interface WeekBucket {
  weekStart: string;
  workouts: number;
  sets: number;
  volume: number;
}

export interface MuscleGroupStat {
  muscleGroup: string;
  sets: number;
  volume: number;
}

export interface PersonalRecord {
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
}

export interface Stats {
  totalWorkouts: number;
  totalSets: number;
  totalVolume: number;
  weeks: WeekBucket[];
  muscleGroups: MuscleGroupStat[];
  personalRecords: PersonalRecord[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  isGuest: boolean;
  role: 'user' | 'admin';
  disabledAt: string | null;
  createdAt: string;
  // Platform-wide activity counts (one user row serves all maxxing apps).
  _count: { journalEntries: number; workouts: number; habits: number };
}
