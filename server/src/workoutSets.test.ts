import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSetsFromSplit, nextSetNumber } from './workoutSets.js';

test('buildSetsFromSplit expands each exercise into numbered sets in order', () => {
  const sets = buildSetsFromSplit([
    { exerciseId: 'a', exerciseName: 'Bench Press', targetSets: 3, targetReps: 8, targetWeight: 60 },
    { exerciseId: 'b', exerciseName: 'Chest Fly', targetSets: 2, targetReps: 12, targetWeight: null },
  ]);

  assert.equal(sets.length, 5);
  assert.deepEqual(
    sets.map((s) => [s.exerciseName, s.setNumber]),
    [
      ['Bench Press', 1],
      ['Bench Press', 2],
      ['Bench Press', 3],
      ['Chest Fly', 1],
      ['Chest Fly', 2],
    ],
  );
  // Global sortOrder strictly increases with gaps for later insertion.
  for (let i = 1; i < sets.length; i += 1) {
    assert.ok(sets[i].sortOrder > sets[i - 1].sortOrder);
  }
  assert.equal(sets[0].targetReps, 8);
  assert.equal(sets[0].targetWeight, 60);
  assert.equal(sets[4].targetWeight, null);
});

test('buildSetsFromSplit with no exercises yields no sets', () => {
  assert.deepEqual(buildSetsFromSplit([]), []);
});

test('nextSetNumber continues from the highest existing set of that exercise', () => {
  const existing = [
    { exerciseName: 'Squat', setNumber: 1 },
    { exerciseName: 'Squat', setNumber: 2 },
    { exerciseName: 'Leg Press', setNumber: 4 },
  ];
  assert.equal(nextSetNumber(existing, 'Squat'), 3);
  assert.equal(nextSetNumber(existing, 'Leg Press'), 5);
  assert.equal(nextSetNumber(existing, 'Deadlift'), 1);
});
