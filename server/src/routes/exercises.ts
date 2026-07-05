import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncRoute } from '../http.js';

export const exercisesRouter = Router();

export const muscleGroups = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes',
  'core', 'forearms', 'calves', 'full_body', 'cardio', 'other',
] as const;

const exerciseBase = z.object({
  name: z.string().min(1).max(100),
  muscleGroup: z.enum(muscleGroups).optional(),
  equipment: z.string().max(50).nullish(),
  notes: z.string().max(500).nullish(),
  archived: z.boolean().optional(),
});

exercisesRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const includeArchived = req.query.includeArchived === 'true';
    const exercises = await prisma.exercise.findMany({
      where: { userId: req.user!.id, ...(includeArchived ? {} : { archived: false }) },
      orderBy: [{ muscleGroup: 'asc' }, { name: 'asc' }],
    });
    res.json(exercises);
  }),
);

exercisesRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const body = exerciseBase.parse(req.body);
    const exercise = await prisma.exercise.create({
      data: { ...body, userId: req.user!.id },
    });
    res.status(201).json(exercise);
  }),
);

exercisesRouter.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const body = exerciseBase.partial().parse(req.body);
    const { count } = await prisma.exercise.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: body,
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    const exercise = await prisma.exercise.findUnique({ where: { id: req.params.id } });
    res.json(exercise);
  }),
);

// Deleting removes the exercise from any splits (cascade); logged workout sets
// keep their denormalised exerciseName, so history is untouched.
exercisesRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const { count } = await prisma.exercise.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  }),
);
