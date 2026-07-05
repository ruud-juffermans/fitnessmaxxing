// Small display formatters shared across pages.

export function fmtWeight(kg: number | null | undefined): string {
  if (kg == null) return '—';
  return `${Number.isInteger(kg) ? kg : kg.toFixed(1)} kg`;
}

// Volume numbers get large fast; compact them for cards and chips.
export function fmtVolume(kg: number): string {
  if (kg >= 10000) return `${(kg / 1000).toFixed(1)}k kg`;
  return `${Math.round(kg)} kg`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function fmtDuration(startIso: string, endIso: string): string {
  const mins = Math.max(0, Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000));
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
