import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { provisionDefaults } from '../src/defaults.js';
import { buildSetsFromSplit } from '../src/workoutSets.js';

const prisma = new PrismaClient();

// A ready-to-use, email-verified demo account that owns all seeded data so you
// can log in immediately after seeding. Override via env vars.
const DEMO_EMAIL = (process.env.SEED_USER_EMAIL ?? 'demo@fitnessmaxxing.local').toLowerCase();
const DEMO_PASSWORD = process.env.SEED_USER_PASSWORD ?? 'password123';

// Four weeks of history: the plan's splits in rotation, Mon/Wed/Fri, every set
// completed with a little week-over-week progression so Stats has something to
// show.
async function seedHistory(userId: string): Promise<void> {
  const plan = await prisma.workoutPlan.findFirst({
    where: { userId },
    include: {
      splits: {
        orderBy: { sortOrder: 'asc' },
        include: {
          exercises: {
            orderBy: { sortOrder: 'asc' },
            include: { exercise: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });
  if (!plan || plan.splits.length === 0) return;

  const now = new Date();
  let rotation = 0;
  for (let week = 4; week >= 1; week -= 1) {
    for (const dayOffset of [0, 2, 4]) {
      // Mon/Wed/Fri
      const start = new Date(now.getTime() - (week * 7 - dayOffset) * 24 * 60 * 60 * 1000);
      start.setHours(18, 0, 0, 0);
      if (start >= now) continue;

      const split = plan.splits[rotation % plan.splits.length];
      rotation += 1;

      const progression = (5 - week) * 2.5; // +2.5 kg per elapsed week
      const planned = buildSetsFromSplit(
        split.exercises.map((se) => ({
          exerciseId: se.exercise.id,
          exerciseName: se.exercise.name,
          targetSets: se.targetSets,
          targetReps: se.targetReps,
          targetWeight: se.targetWeight,
        })),
      );

      await prisma.workout.create({
        data: {
          userId,
          planId: plan.id,
          splitId: split.id,
          name: split.name,
          startedAt: start,
          completedAt: new Date(start.getTime() + 65 * 60 * 1000),
          sets: {
            create: planned.map((s, i) => ({
              ...s,
              userId,
              reps: Math.max(1, (s.targetReps ?? 8) - (i % 3 === 2 ? 1 : 0)), // last sets a rep short
              weight: s.targetWeight != null ? s.targetWeight + progression : null,
              completedAt: new Date(start.getTime() + (i + 1) * 3 * 60 * 1000),
            })),
          },
        },
      });
    }
  }
}

async function main(): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    console.log(`Seed: demo user ${DEMO_EMAIL} already exists, skipping.`);
    return;
  }

  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12),
      name: 'Demo',
      emailVerified: true,
    },
  });
  await provisionDefaults(user.id);
  await seedHistory(user.id);
  console.log(`Seed: created demo user ${DEMO_EMAIL} with starter plan + 4 weeks of workout history.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
