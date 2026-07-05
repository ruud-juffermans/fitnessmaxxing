import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncRoute } from '../http.js';

export const plansRouter = Router();

const planBase = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullish(),
  sortOrder: z.number().int().optional(),
  archived: z.boolean().optional(),
});

// GET /api/plans — all plans with their splits (and per-split exercise counts).
plansRouter.get(
  '/',
  asyncRoute(async (req, res) => {
    const includeArchived = req.query.includeArchived === 'true';
    const plans = await prisma.workoutPlan.findMany({
      where: { userId: req.user!.id, ...(includeArchived ? {} : { archived: false }) },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        splits: {
          orderBy: { sortOrder: 'asc' },
          include: { _count: { select: { exercises: true } } },
        },
      },
    });
    res.json(plans);
  }),
);

plansRouter.post(
  '/',
  asyncRoute(async (req, res) => {
    const body = planBase.parse(req.body);
    const plan = await prisma.workoutPlan.create({
      data: { ...body, userId: req.user!.id },
      include: { splits: { include: { _count: { select: { exercises: true } } } } },
    });
    res.status(201).json(plan);
  }),
);

plansRouter.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const body = planBase.partial().parse(req.body);
    const { count } = await prisma.workoutPlan.updateMany({
      where: { id: req.params.id, userId: req.user!.id },
      data: body,
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    const plan = await prisma.workoutPlan.findUnique({
      where: { id: req.params.id },
      include: {
        splits: {
          orderBy: { sortOrder: 'asc' },
          include: { _count: { select: { exercises: true } } },
        },
      },
    });
    res.json(plan);
  }),
);

plansRouter.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const { count } = await prisma.workoutPlan.deleteMany({
      where: { id: req.params.id, userId: req.user!.id },
    });
    if (count === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).end();
  }),
);

// POST /api/plans/:id/splits — add a day to a plan.
plansRouter.post(
  '/:id/splits',
  asyncRoute(async (req, res) => {
    const body = z
      .object({ name: z.string().min(1).max(100), sortOrder: z.number().int().optional() })
      .parse(req.body);

    const plan = await prisma.workoutPlan.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
      select: { id: true, splits: { select: { sortOrder: true }, orderBy: { sortOrder: 'desc' }, take: 1 } },
    });
    if (!plan) return res.status(404).json({ error: 'Not found' });

    const split = await prisma.split.create({
      data: {
        name: body.name,
        planId: plan.id,
        userId: req.user!.id,
        sortOrder: body.sortOrder ?? (plan.splits[0]?.sortOrder ?? 0) + 10,
      },
      include: { _count: { select: { exercises: true } } },
    });
    res.status(201).json(split);
  }),
);
