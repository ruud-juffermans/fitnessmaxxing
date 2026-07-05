import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../db.js';
import { asyncRoute } from '../http.js';
import { buildSetsFromSplit, nextSetNumber } from '../workoutSets.js';

export const workoutsRouter = Router();

const setsInclude = {
  sets: {
    orderBy: [{ sortOrder: 'asc' }, { setNumber: 'asc' }],
  },
} satisfies Prisma.WorkoutInclude;

// GET /api/workouts — history, newest first. ?limit caps the page (default 50).
workoutsRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const workouts = await prisma.workout.findMany({
      where: { userId: req.user!.id },
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: setsInclude,
    });
    res.json(workouts);
  }),
);

// GET /api/workouts/active — the most recent unfinished workout, or null.
workoutsRouter.get(
  '/active',
  asyncRoute(async (req, res) => {
    const workout = await prisma.workout.findFirst({
      where: { userId: req.user!.id, completedAt: null },
      orderBy: { startedAt: 'desc' },
      include: setsInclude,
    });
    res.json(workout);
  }),
);

// POST /api/workouts — start a workout. With splitId the split's prescription
// is copied in as planned sets; without it you get an empty ad-hoc session.
workoutsRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const body = z
      .object({ splitId: z.string().uuid().optional(), name: z.string().min(1).max(100).optional() })
      .parse(req.body);

    let name = body.name ?? 'Workout';
    let planId: string | null = null;
    let plannedSets: ReturnType<typeof buildSetsFromSplit> = [];

    if (body.splitId) {
      const split = await prisma.split.findFirst({
        where: { id: body.splitId, userId: req.user!.id },
        include: {
          exercises: {
            orderBy: { sortOrder: 'asc' },
            include: { exercise: { select: { id: true, name: true } } },
          },
        },
      });
      if (!split) return res.status(400).json({ error: 'Unknown split' });
      name = body.name ?? split.name;
      planId = split.planId;
      plannedSets = buildSetsFromSplit(
        split.exercises.map((se) => ({
          exerciseId: se.exercise.id,
          exerciseName: se.exercise.name,
          targetSets: se.targetSets,
          targetReps: se.targetReps,
          targetWeight: se.targetWeight,
        })),
      );
    }

    const workout = await prisma.workout.create({
      data: {
        userId: req.user!.id,
        splitId: body.splitId ?? null,
        planId,
        name,
        sets: {
          create: plannedSets.map((s) => ({ ...s, userId: req.user!.id })),
        },
      },
      include: setsInclude,
    });
    res.status(201).json(workout);
  }),
);

// GET /api/workouts/:id — full detail.
workoutsRouter.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const workout = await prisma.workout.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: setsInclude,
    });
    if (!workout) return res.status(404).json({ error: 'Not found' });
    res.json(workout);
  }),
);

workoutsRouter.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const body = z
      .object({ name: z.string().min(1).max(100), notes: z.string().max(1000).nullable() })
      .partial()
      .parse(req.body);
    const { count } = await prisma.workout.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: body,
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    const workout = await prisma.workout.findUnique({ where: { id: req.params.id }, include: setsInclude });
    res.json(workout);
  }),
);

// POST /api/workouts/:id/finish — close the session. Untouched planned sets
// stay in the log as skipped (no completedAt), which is useful history too.
workoutsRouter.post(
  '/:id/finish',
  asyncRoute(async (req, res) => {
    const { count } = await prisma.workout.updateMany({
      where: { id: req.params.id, userId: req.user!.id, completedAt: null },
      data: { completedAt: new Date() },
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    const workout = await prisma.workout.findUnique({ where: { id: req.params.id }, include: setsInclude });
    res.json(workout);
  }),
);

// DELETE /api/workouts/:id — discard a session (sets cascade).
workoutsRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const { count } = await prisma.workout.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  }),
);

// POST /api/workouts/:id/sets — add an extra set. Either for an exercise from
// the catalogue (exerciseId) or free-form by name (ad-hoc workouts).
workoutsRouter.post(
  '/:id/sets',
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        exerciseId: z.string().uuid().optional(),
        exerciseName: z.string().min(1).max(100).optional(),
        targetReps: z.number().int().min(1).max(200).nullish(),
        targetWeight: z.number().min(0).max(2000).nullish(),
      })
      .refine((b) => b.exerciseId || b.exerciseName, { message: 'exerciseId or exerciseName is required' })
      .parse(req.body);

    const workout = await prisma.workout.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { sets: { select: { exerciseName: true, setNumber: true, sortOrder: true } } },
    });
    if (!workout) return res.status(404).json({ error: 'Not found' });

    let exerciseId: string | null = null;
    let exerciseName = body.exerciseName ?? '';
    if (body.exerciseId) {
      const exercise = await prisma.exercise.findFirst({
        where: { id: body.exerciseId, userId: req.user!.id },
        select: { id: true, name: true },
      });
      if (!exercise) return res.status(400).json({ error: 'Unknown exercise' });
      exerciseId = exercise.id;
      exerciseName = exercise.name;
    }

    const maxSort = workout.sets.reduce((m, s) => Math.max(m, s.sortOrder), 0);
    const set = await prisma.workoutSet.create({
      data: {
        workoutId: workout.id,
        userId: req.user!.id,
        exerciseId,
        exerciseName,
        setNumber: nextSetNumber(workout.sets, exerciseName),
        sortOrder: maxSort + 10,
        targetReps: body.targetReps ?? null,
        targetWeight: body.targetWeight ?? null,
      },
    });
    res.status(201).json(set);
  }),
);

// PATCH /api/workouts/:id/sets/:setId — log a set. `completed` toggles the
// done flag; reps/weight record what was actually lifted.
workoutsRouter.patch(
  '/:id/sets/:setId',
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        reps: z.number().int().min(0).max(1000).nullable(),
        weight: z.number().min(0).max(2000).nullable(),
        completed: z.boolean(),
      })
      .partial()
      .parse(req.body);

    const { completed, ...rest } = body;
    const { count } = await prisma.workoutSet.updateMany({
      where: { id: req.params.setId, workoutId: req.params.id, userId: req.user!.id },
      data: {
        ...rest,
        ...(completed === undefined ? {} : { completedAt: completed ? new Date() : null }),
      },
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    const set = await prisma.workoutSet.findUnique({ where: { id: req.params.setId } });
    res.json(set);
  }),
);

workoutsRouter.delete(
  '/:id/sets/:setId',
  asyncRoute(async (req, res) => {
    const { count } = await prisma.workoutSet.deleteMany({
      where: { id: req.params.setId, workoutId: req.params.id, userId: req.user!.id },
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  }),
);
