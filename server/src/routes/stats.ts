import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncRoute } from '../http.js';
import {
  weeklyBuckets,
  muscleGroupBreakdown,
  personalRecords,
  setVolume,
  type StatWorkout,
} from '../workoutStats.js';

export const statsRouter = Router();

// GET /api/stats — dashboard numbers: lifetime totals, a 12-week trend,
// muscle-group breakdown (last 30 days) and personal records.
statsRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const rows = await prisma.workout.findMany({
      where: { userId: req.user!.id, completedAt: { not: null } },
      orderBy: { startedAt: 'asc' },
      select: {
        startedAt: true,
        completedAt: true,
        sets: {
          select: {
            exerciseName: true,
            reps: true,
            weight: true,
            completedAt: true,
            exercise: { select: { muscleGroup: true } },
          },
        },
      },
    });

    const workouts: StatWorkout[] = rows.map((w) => ({
      startedAt: w.startedAt,
      completedAt: w.completedAt,
      sets: w.sets.map((s) => ({
        exerciseName: s.exerciseName,
        muscleGroup: s.exercise?.muscleGroup ?? null,
        reps: s.reps,
        weight: s.weight,
        completedAt: s.completedAt,
      })),
    }));

    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recent = workouts.filter((w) => w.startedAt >= monthAgo);

    let totalSets = 0;
    let totalVolume = 0;
    for (const w of workouts) {
      for (const s of w.sets) {
        if (!s.completedAt) continue;
        totalSets += 1;
        totalVolume += setVolume(s);
      }
    }

    res.json({
      totalWorkouts: workouts.length,
      totalSets,
      totalVolume,
      weeks: weeklyBuckets(workouts, 12, now),
      muscleGroups: muscleGroupBreakdown(recent),
      personalRecords: personalRecords(workouts, 10),
    });
  }),
);
