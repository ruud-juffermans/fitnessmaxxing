import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  setVolume,
  mondayOf,
  weeklyBuckets,
  muscleGroupBreakdown,
  personalRecords,
  type StatWorkout,
} from './workoutStats.js';

const done = (over: Partial<StatWorkout['sets'][number]> = {}) => ({
  exerciseName: 'Bench Press',
  muscleGroup: 'chest',
  reps: 8,
  weight: 60,
  completedAt: new Date('2026-07-01T10:00:00Z'),
  ...over,
});

test('setVolume is reps x weight for completed sets, 0 otherwise', () => {
  assert.equal(setVolume(done()), 480);
  assert.equal(setVolume(done({ completedAt: null })), 0);
  assert.equal(setVolume(done({ weight: null })), 0);
  assert.equal(setVolume(done({ reps: null })), 0);
});

test('mondayOf maps any weekday to that week\'s Monday', () => {
  assert.equal(mondayOf(new Date('2026-07-01T12:00:00Z')), '2026-06-29'); // Wed
  assert.equal(mondayOf(new Date('2026-06-29T00:00:00Z')), '2026-06-29'); // Mon
  assert.equal(mondayOf(new Date('2026-07-05T23:59:00Z')), '2026-06-29'); // Sun
});

test('weeklyBuckets zero-fills trailing weeks and only counts completed work', () => {
  const workouts: StatWorkout[] = [
    {
      startedAt: new Date('2026-07-01T10:00:00Z'),
      completedAt: new Date('2026-07-01T11:00:00Z'),
      sets: [done(), done({ completedAt: null })],
    },
    // Unfinished workout: ignored entirely.
    { startedAt: new Date('2026-07-02T10:00:00Z'), completedAt: null, sets: [done()] },
  ];

  const buckets = weeklyBuckets(workouts, 4, new Date('2026-07-05T12:00:00Z'));
  assert.equal(buckets.length, 4);
  assert.equal(buckets[buckets.length - 1].weekStart, '2026-06-29');
  assert.equal(buckets[buckets.length - 1].workouts, 1);
  assert.equal(buckets[buckets.length - 1].sets, 1);
  assert.equal(buckets[buckets.length - 1].volume, 480);
  // Older weeks exist but are zero.
  assert.equal(buckets[0].workouts, 0);
});

test('muscleGroupBreakdown groups completed sets and sorts by count', () => {
  const workouts: StatWorkout[] = [
    {
      startedAt: new Date('2026-07-01T10:00:00Z'),
      completedAt: new Date('2026-07-01T11:00:00Z'),
      sets: [
        done(),
        done(),
        done({ exerciseName: 'Squat', muscleGroup: 'legs', weight: 80 }),
        done({ muscleGroup: null, completedAt: null }),
      ],
    },
  ];
  const groups = muscleGroupBreakdown(workouts);
  assert.deepEqual(
    groups.map((g) => [g.muscleGroup, g.sets]),
    [
      ['chest', 2],
      ['legs', 1],
    ],
  );
});

test('personalRecords keeps the heaviest set per exercise, reps break ties', () => {
  const workouts: StatWorkout[] = [
    {
      startedAt: new Date('2026-06-01T10:00:00Z'),
      completedAt: new Date('2026-06-01T11:00:00Z'),
      sets: [done({ weight: 60, reps: 8 }), done({ weight: 65, reps: 5 })],
    },
    {
      startedAt: new Date('2026-07-01T10:00:00Z'),
      completedAt: new Date('2026-07-01T11:00:00Z'),
      sets: [done({ weight: 65, reps: 6 }), done({ exerciseName: 'Squat', weight: 100, reps: 5 })],
    },
  ];
  const prs = personalRecords(workouts);
  assert.deepEqual(
    prs.map((p) => [p.exerciseName, p.weight, p.reps, p.date]),
    [
      ['Squat', 100, 5, '2026-07-01'],
      ['Bench Press', 65, 6, '2026-07-01'],
    ],
  );
});
