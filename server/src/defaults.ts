import { MuscleGroup } from '@prisma/client';
import { prisma } from './db.js';

// Starter content provisioned for every brand-new account: a compact exercise
// catalogue covering the common lifts, plus one example 3-day split plan so the
// core flow (plan -> split -> start workout -> log sets) is demonstrable on
// day one. (The seed script additionally generates workout history for the
// demo account.)

interface ExerciseSeed {
  key: string;
  name: string;
  muscleGroup: MuscleGroup;
  equipment?: string;
}

interface SplitExerciseSeed {
  exercise: string; // ExerciseSeed.key
  sets: number;
  reps: number;
  weight?: number; // kg, starting suggestion
  rest?: number; // seconds
}

interface SplitSeed {
  name: string;
  exercises: SplitExerciseSeed[];
}

const defaultExercises: ExerciseSeed[] = [
  // Chest
  { key: 'bench', name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
  { key: 'incline-db', name: 'Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell' },
  { key: 'fly', name: 'Chest Fly', muscleGroup: 'chest', equipment: 'machine' },
  { key: 'pushup', name: 'Push-up', muscleGroup: 'chest', equipment: 'bodyweight' },
  // Back
  { key: 'deadlift', name: 'Deadlift', muscleGroup: 'back', equipment: 'barbell' },
  { key: 'pullup', name: 'Pull-up', muscleGroup: 'back', equipment: 'bodyweight' },
  { key: 'lat-pulldown', name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'machine' },
  { key: 'row', name: 'Barbell Row', muscleGroup: 'back', equipment: 'barbell' },
  { key: 'cable-row', name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'cable' },
  // Shoulders
  { key: 'ohp', name: 'Overhead Press', muscleGroup: 'shoulders', equipment: 'barbell' },
  { key: 'lateral-raise', name: 'Lateral Raise', muscleGroup: 'shoulders', equipment: 'dumbbell' },
  { key: 'face-pull', name: 'Face Pull', muscleGroup: 'shoulders', equipment: 'cable' },
  // Arms
  { key: 'curl', name: 'Barbell Curl', muscleGroup: 'biceps', equipment: 'barbell' },
  { key: 'hammer-curl', name: 'Hammer Curl', muscleGroup: 'biceps', equipment: 'dumbbell' },
  { key: 'pushdown', name: 'Triceps Pushdown', muscleGroup: 'triceps', equipment: 'cable' },
  { key: 'oh-extension', name: 'Overhead Triceps Extension', muscleGroup: 'triceps', equipment: 'dumbbell' },
  // Legs
  { key: 'squat', name: 'Squat', muscleGroup: 'legs', equipment: 'barbell' },
  { key: 'leg-press', name: 'Leg Press', muscleGroup: 'legs', equipment: 'machine' },
  { key: 'rdl', name: 'Romanian Deadlift', muscleGroup: 'legs', equipment: 'barbell' },
  { key: 'leg-curl', name: 'Leg Curl', muscleGroup: 'legs', equipment: 'machine' },
  { key: 'leg-extension', name: 'Leg Extension', muscleGroup: 'legs', equipment: 'machine' },
  { key: 'calf-raise', name: 'Calf Raise', muscleGroup: 'calves', equipment: 'machine' },
  // Core
  { key: 'plank', name: 'Plank', muscleGroup: 'core', equipment: 'bodyweight' },
  { key: 'crunch', name: 'Crunch', muscleGroup: 'core', equipment: 'bodyweight' },
];

const defaultPlan: { name: string; description: string; splits: SplitSeed[] } = {
  name: '3-Day Split',
  description: 'A classic push / pull / legs starting point. Adjust the weights to your level.',
  splits: [
    {
      name: 'Chest & Triceps',
      exercises: [
        { exercise: 'bench', sets: 4, reps: 8, weight: 60, rest: 120 },
        { exercise: 'incline-db', sets: 3, reps: 10, weight: 20, rest: 90 },
        { exercise: 'fly', sets: 3, reps: 12, weight: 40, rest: 60 },
        { exercise: 'pushdown', sets: 3, reps: 12, weight: 25, rest: 60 },
        { exercise: 'oh-extension', sets: 3, reps: 10, weight: 12, rest: 60 },
      ],
    },
    {
      name: 'Back & Biceps',
      exercises: [
        { exercise: 'deadlift', sets: 3, reps: 5, weight: 100, rest: 180 },
        { exercise: 'lat-pulldown', sets: 4, reps: 10, weight: 55, rest: 90 },
        { exercise: 'row', sets: 3, reps: 8, weight: 50, rest: 90 },
        { exercise: 'cable-row', sets: 3, reps: 10, weight: 50, rest: 60 },
        { exercise: 'curl', sets: 3, reps: 10, weight: 25, rest: 60 },
        { exercise: 'hammer-curl', sets: 3, reps: 12, weight: 10, rest: 60 },
      ],
    },
    {
      name: 'Legs & Shoulders',
      exercises: [
        { exercise: 'squat', sets: 4, reps: 8, weight: 80, rest: 150 },
        { exercise: 'rdl', sets: 3, reps: 10, weight: 60, rest: 120 },
        { exercise: 'leg-press', sets: 3, reps: 12, weight: 120, rest: 90 },
        { exercise: 'calf-raise', sets: 4, reps: 15, weight: 60, rest: 45 },
        { exercise: 'ohp', sets: 4, reps: 8, weight: 35, rest: 120 },
        { exercise: 'lateral-raise', sets: 3, reps: 15, weight: 8, rest: 45 },
      ],
    },
  ],
};

// Create the default catalogue and plan for a freshly registered user. Runs in
// a single transaction so an account never ends up half-provisioned.
export async function provisionDefaults(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const exerciseIds = new Map<string, string>();
    for (const e of defaultExercises) {
      const created = await tx.exercise.create({
        data: { name: e.name, muscleGroup: e.muscleGroup, equipment: e.equipment, userId },
      });
      exerciseIds.set(e.key, created.id);
    }

    const plan = await tx.workoutPlan.create({
      data: { name: defaultPlan.name, description: defaultPlan.description, sortOrder: 10, userId },
    });

    let splitOrder = 10;
    for (const s of defaultPlan.splits) {
      const split = await tx.split.create({
        data: { name: s.name, planId: plan.id, sortOrder: splitOrder, userId },
      });
      splitOrder += 10;

      let exerciseOrder = 10;
      for (const se of s.exercises) {
        const exerciseId = exerciseIds.get(se.exercise);
        if (!exerciseId) throw new Error(`Unknown exercise "${se.exercise}" in split "${s.name}"`);
        await tx.splitExercise.create({
          data: {
            splitId: split.id,
            exerciseId,
            sortOrder: exerciseOrder,
            targetSets: se.sets,
            targetReps: se.reps,
            targetWeight: se.weight ?? null,
            restSeconds: se.rest ?? null,
            userId,
          },
        });
        exerciseOrder += 10;
      }
    }
  });
}
