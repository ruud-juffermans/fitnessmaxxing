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

const base = import.meta.env.VITE_API_URL ?? '';

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
    credentials: 'include',
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

export const auth = {
  register: (data: { email: string; password: string; name?: string }) => post<{ ok: true }>('/api/auth/register', data),
  verifyEmail: (token: string) => post<{ ok: true }>('/api/auth/verify-email', { token }),
  resendVerification: (email: string) => post<{ ok: true }>('/api/auth/resend-verification', { email }),
  login: (data: { email: string; password: string }) => post<{ user: AuthUser }>('/api/auth/login', data),
  guest: () => post<{ user: AuthUser }>('/api/auth/guest'),
  convert: (data: { email: string; password: string; name?: string }) => post<{ user: AuthUser }>('/api/auth/convert', data),
  logout: () => post<{ ok: true }>('/api/auth/logout'),
  me: () => request<{ user: AuthUser }>('/api/auth/me'),
  forgotPassword: (email: string) => post<{ ok: true }>('/api/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; password: string }) => post<{ ok: true }>('/api/auth/reset-password', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    post<{ ok: true }>('/api/auth/change-password', data),
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
    request<Exercise[]>(`/api/exercises${includeArchived ? '?includeArchived=true' : ''}`),
  createExercise: (data: ExerciseInput) => post<Exercise>('/api/exercises', data),
  updateExercise: (id: string, data: Partial<ExerciseInput>) => patch<Exercise>(`/api/exercises/${id}`, data),
  deleteExercise: (id: string) => del(`/api/exercises/${id}`),

  // Plans + splits
  listPlans: (includeArchived = false) =>
    request<WorkoutPlan[]>(`/api/plans${includeArchived ? '?includeArchived=true' : ''}`),
  createPlan: (data: { name: string; description?: string | null }) => post<WorkoutPlan>('/api/plans', data),
  updatePlan: (id: string, data: Partial<{ name: string; description: string | null; sortOrder: number; archived: boolean }>) =>
    patch<WorkoutPlan>(`/api/plans/${id}`, data),
  deletePlan: (id: string) => del(`/api/plans/${id}`),
  createSplit: (planId: string, data: { name: string; sortOrder?: number }) =>
    post<SplitSummary>(`/api/plans/${planId}/splits`, data),

  getSplit: (id: string) => request<SplitDetail>(`/api/splits/${id}`),
  updateSplit: (id: string, data: Partial<{ name: string; sortOrder: number }>) =>
    patch<SplitDetail>(`/api/splits/${id}`, data),
  deleteSplit: (id: string) => del(`/api/splits/${id}`),
  addSplitExercise: (splitId: string, data: PrescriptionInput & { exerciseId: string }) =>
    post<SplitExercise>(`/api/splits/${splitId}/exercises`, data),
  updateSplitExercise: (id: string, data: Partial<PrescriptionInput>) =>
    patch<SplitExercise>(`/api/splits/exercises/${id}`, data),
  removeSplitExercise: (id: string) => del(`/api/splits/exercises/${id}`),

  // Workouts
  listWorkouts: (limit = 50) => request<Workout[]>(`/api/workouts?limit=${limit}`),
  getActiveWorkout: () => request<Workout | null>('/api/workouts/active'),
  getWorkout: (id: string) => request<Workout>(`/api/workouts/${id}`),
  startWorkout: (data: { splitId?: string; name?: string }) => post<Workout>('/api/workouts', data),
  updateWorkout: (id: string, data: Partial<{ name: string; notes: string | null }>) =>
    patch<Workout>(`/api/workouts/${id}`, data),
  finishWorkout: (id: string) => post<Workout>(`/api/workouts/${id}/finish`),
  deleteWorkout: (id: string) => del(`/api/workouts/${id}`),
  addWorkoutSet: (
    workoutId: string,
    data: { exerciseId?: string; exerciseName?: string; targetReps?: number | null; targetWeight?: number | null },
  ) => post<WorkoutSet>(`/api/workouts/${workoutId}/sets`, data),
  updateWorkoutSet: (
    workoutId: string,
    setId: string,
    data: Partial<{ reps: number | null; weight: number | null; completed: boolean }>,
  ) => patch<WorkoutSet>(`/api/workouts/${workoutId}/sets/${setId}`, data),
  deleteWorkoutSet: (workoutId: string, setId: string) => del(`/api/workouts/${workoutId}/sets/${setId}`),

  // Stats
  getStats: () => request<Stats>('/api/stats'),
};

export const admin = {
  listUsers: (search?: string) =>
    request<{ users: AdminUser[] }>(`/api/admin/users${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  suspend: (id: string) => post<{ ok: true }>(`/api/admin/users/${id}/suspend`),
  unsuspend: (id: string) => post<{ ok: true }>(`/api/admin/users/${id}/unsuspend`),
  deleteUser: (id: string) => request<{ ok: true }>(`/api/admin/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id: string) => post<{ ok: true }>(`/api/admin/users/${id}/reset-password`),
  verifyEmail: (id: string) => post<{ ok: true }>(`/api/admin/users/${id}/verify-email`),
  revokeSessions: (id: string) => post<{ ok: true }>(`/api/admin/users/${id}/revoke-sessions`),
};
