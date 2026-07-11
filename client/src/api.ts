import type {
  AdminUser,
  AuthUser,
  Exercise,
  MuscleGroup,
  SplitDetail,
  SplitExercise,
  SplitSummary,
  Stats,
  Workout,
  WorkoutPlan,
  WorkoutSet,
} from './types';

// The platform API (ruudjuffermans-server) — shared by all maxxing apps. One
// session cookie lives on this origin, so signing in on the account app signs
// you in here too.
const base = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

// The account app — the only place with auth UI. Unauthenticated visitors are
// sent there and come back via return_url (see redirectToLogin).
const accountUrl = (import.meta.env.VITE_ACCOUNT_URL ?? 'http://localhost:3004').replace(/\/$/, '');

// Hand off to the central login page, asking it to send the user back here.
// `app=fitness` labels the session and lets the login page brand the flow.
export function redirectToLogin(): void {
  const returnUrl = encodeURIComponent(window.location.href);
  window.location.assign(`${accountUrl}/login?return_url=${returnUrl}&app=fitness`);
}

// Deep link into the account dashboard (profile, sessions, sign out everywhere).
export function accountDashboardUrl(): string {
  return accountUrl;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    ...init,
    credentials: 'include', // session cookie
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let message = res.statusText;
    let code: string | undefined;
    const text = await res.text();
    if (text) {
      try {
        const parsed = JSON.parse(text);
        message = parsed.error ?? text;
        code = parsed.code;
      } catch {
        message = text;
      }
    }
    throw new ApiError(res.status, message, code);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) });
const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
const del = (path: string) => request<void>(path, { method: 'DELETE' });

// Account endpoints still used from inside the app: session check and
// sign-out. Registration, login, guest start/conversion, password reset and
// password change all live in the account app now.
export const auth = {
  logout: () => post<{ ok: true }>('/api/account/auth/logout'),
  me: () => request<{ user: AuthUser }>('/api/account/auth/me'),
};

export interface ExerciseInput {
  name: string;
  muscleGroup?: MuscleGroup;
  equipment?: string | null;
  notes?: string | null;
  archived?: boolean;
}

export interface PrescriptionInput {
  targetSets: number;
  targetReps: number;
  targetWeight?: number | null;
  restSeconds?: number | null;
  notes?: string | null;
  sortOrder?: number;
}

export const api = {
  // Exercises
  listExercises: (includeArchived = false) =>
    request<Exercise[]>(`/api/fitness/exercises${includeArchived ? '?includeArchived=true' : ''}`),
  createExercise: (data: ExerciseInput) => post<Exercise>('/api/fitness/exercises', data),
  updateExercise: (id: string, data: Partial<ExerciseInput>) => patch<Exercise>(`/api/fitness/exercises/${id}`, data),
  deleteExercise: (id: string) => del(`/api/fitness/exercises/${id}`),

  // Plans + splits
  listPlans: (includeArchived = false) =>
    request<WorkoutPlan[]>(`/api/fitness/plans${includeArchived ? '?includeArchived=true' : ''}`),
  createPlan: (data: { name: string; description?: string | null }) => post<WorkoutPlan>('/api/fitness/plans', data),
  updatePlan: (id: string, data: Partial<{ name: string; description: string | null; sortOrder: number; archived: boolean }>) =>
    patch<WorkoutPlan>(`/api/fitness/plans/${id}`, data),
  deletePlan: (id: string) => del(`/api/fitness/plans/${id}`),
  createSplit: (planId: string, data: { name: string; sortOrder?: number }) =>
    post<SplitSummary>(`/api/fitness/plans/${planId}/splits`, data),

  getSplit: (id: string) => request<SplitDetail>(`/api/fitness/splits/${id}`),
  updateSplit: (id: string, data: Partial<{ name: string; sortOrder: number }>) =>
    patch<SplitDetail>(`/api/fitness/splits/${id}`, data),
  deleteSplit: (id: string) => del(`/api/fitness/splits/${id}`),
  addSplitExercise: (splitId: string, data: PrescriptionInput & { exerciseId: string }) =>
    post<SplitExercise>(`/api/fitness/splits/${splitId}/exercises`, data),
  updateSplitExercise: (id: string, data: Partial<PrescriptionInput>) =>
    patch<SplitExercise>(`/api/fitness/splits/exercises/${id}`, data),
  removeSplitExercise: (id: string) => del(`/api/fitness/splits/exercises/${id}`),

  // Workouts
  listWorkouts: (limit = 50) => request<Workout[]>(`/api/fitness/workouts?limit=${limit}`),
  getActiveWorkout: () => request<Workout | null>('/api/fitness/workouts/active'),
  getWorkout: (id: string) => request<Workout>(`/api/fitness/workouts/${id}`),
  startWorkout: (data: { splitId?: string; name?: string }) => post<Workout>('/api/fitness/workouts', data),
  updateWorkout: (id: string, data: Partial<{ name: string; notes: string | null }>) =>
    patch<Workout>(`/api/fitness/workouts/${id}`, data),
  finishWorkout: (id: string) => post<Workout>(`/api/fitness/workouts/${id}/finish`),
  deleteWorkout: (id: string) => del(`/api/fitness/workouts/${id}`),
  addWorkoutSet: (
    workoutId: string,
    data: { exerciseId?: string; exerciseName?: string; targetReps?: number | null; targetWeight?: number | null },
  ) => post<WorkoutSet>(`/api/fitness/workouts/${workoutId}/sets`, data),
  updateWorkoutSet: (
    workoutId: string,
    setId: string,
    data: Partial<{ reps: number | null; weight: number | null; completed: boolean }>,
  ) => patch<WorkoutSet>(`/api/fitness/workouts/${workoutId}/sets/${setId}`, data),
  deleteWorkoutSet: (workoutId: string, setId: string) => del(`/api/fitness/workouts/${workoutId}/sets/${setId}`),

  // Stats
  getStats: () => request<Stats>('/api/fitness/stats'),
};

// Platform-wide user administration (one user table for all maxxing apps).
export const admin = {
  listUsers: (search?: string) =>
    request<{ users: AdminUser[] }>(`/api/account/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  suspend: (id: string) => post<{ ok: true }>(`/api/account/admin/users/${id}/suspend`),
  unsuspend: (id: string) => post<{ ok: true }>(`/api/account/admin/users/${id}/unsuspend`),
  deleteUser: (id: string) => request<{ ok: true }>(`/api/account/admin/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id: string) => post<{ ok: true }>(`/api/account/admin/users/${id}/reset-password`),
  verifyEmail: (id: string) => post<{ ok: true }>(`/api/account/admin/users/${id}/verify-email`),
  revokeSessions: (id: string) => post<{ ok: true }>(`/api/account/admin/users/${id}/revoke-sessions`),
};
