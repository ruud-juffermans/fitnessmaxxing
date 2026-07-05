import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncRoute } from '../http.js';

export const splitsRouter = Router();

const splitExerciseInclude = {
  exercises: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      exercise: { select: { id: true, name: true, muscleGroup: true, equipment: true, archived: true } },
    },
  },
} as const;

const prescriptionBase = z.object({
  targetSets: z.number().int().min(1).max(20),
  targetReps: z.number().int().min(1).max(200),
  targetWeight: z.number().min(0).max(2000).nullish(),
  restSeconds: z.number().int().min(0).max(3600).nullish(),
  notes: z.string().max(300).nullish(),
  sortOrder: z.number().int().optional(),
});

// PATCH /api/splits/exercises/:id — edit a prescription. Declared before /:id
// routes so the static segment wins.
splitsRouter.patch(
  '/exercises/:id',
  asyncRoute(async (req, res) => {
    const body = prescriptionBase.partial().parse(req.body);
    const { count } = await prisma.splitExercise.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: body,
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    const item = await prisma.splitExercise.findUnique({
      where: { id: req.params.id },
      include: splitExerciseInclude.exercises.include,
    });
    res.json(item);
  }),
);

// DELETE /api/splits/exercises/:id — remove an exercise from a split.
splitsRouter.delete(
  '/exercises/:id',
  asyncRoute(async (req, res) => {
    const { count } = await prisma.splitExercise.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  }),
);

// GET /api/splits/:id — a split with its full prescription.
splitsRouter.get(
  '/:id',
  asyncRoute(async (req, res) => {
    const split = await prisma.split.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      include: { ...splitExerciseInclude, plan: { select: { id: true, name: true } } },
    });
    if (!split) return res.status(404).json({ error: 'Not found' });
    res.json(split);
  }),
);

splitsRouter.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const body = z
      .object({ name: z.string().min(1).max(100), sortOrder: z.number().int() })
      .partial()
      .parse(req.body);
    const { count } = await prisma.split.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: body,
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    const split = await prisma.split.findUnique({
      where: { id: req.params.id },
      include: splitExerciseInclude,
    });
    res.json(split);
  }),
);

splitsRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const { count } = await prisma.split.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  }),
);

// POST /api/splits/:id/exercises — add an exercise (with prescription) to a split.
splitsRouter.post(
  '/:id/exercises',
  asyncRoute(async (req, res) => {
    const body = prescriptionBase.extend({ exerciseId: z.string().uuid() }).parse(req.body);

    const split = await prisma.split.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      select: {
        id: true,
        exercises: { select: { sortOrder: true }, orderBy: { sortOrder: 'desc' }, take: 1 },
      },
    });
    if (!split) return res.status(404).json({ error: 'Not found' });

    // Guard against attaching another user's exercise.
    const exercise = await prisma.exercise.findFirst({
      where: { id: body.exerciseId, userId: req.user!.id },
      select: { id: true },
    });
    if (!exercise) return res.status(400).json({ error: 'Unknown exercise' });

    const item = await prisma.splitExercise.create({
      data: {
        splitId: split.id,
        exerciseId: body.exerciseId,
        userId: req.user!.id,
        targetSets: body.targetSets,
        targetReps: body.targetReps,
        targetWeight: body.targetWeight ?? null,
        restSeconds: body.restSeconds ?? null,
        notes: body.notes ?? null,
        sortOrder: body.sortOrder ?? (split.exercises[0]?.sortOrder ?? 0) + 10,
      },
      include: splitExerciseInclude.exercises.include,
    });
    res.status(201).json(item);
  }),
);
