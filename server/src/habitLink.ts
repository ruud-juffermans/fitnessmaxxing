// Pushes daily workout activity to habitmaxxing so habits linked to
// `fitness_workout` auto-complete there. Fire-and-forget: habit tracking must
// never break or slow down workout logging, so failures are only logged.
// Accounts are matched by email; both env vars empty disables the integration.
const baseUrl = process.env.HABITMAXXING_URL?.trim().replace(/\/+$/, '');
const token = process.env.HABITMAXXING_INTEGRATIONS_TOKEN?.trim();

// Habit entries are keyed by local calendar day, so events must carry the date
// in the app timezone — a workout finished at 00:30 CEST is "today", not the
// UTC "yesterday".
const APP_TZ = process.env.APP_TZ || 'Europe/Amsterdam';

export function localDateOf(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Tell habitmaxxing whether `date` has a finished workout for this user.
 * active=true checks the linked habit(s) for that day, false unchecks them.
 */
export function notifyHabitApp(email: string, date: string, active: boolean): void {
  if (!baseUrl || !token) return;
  fetch(`${baseUrl}/api/integrations/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Service-Token': token },
    body: JSON.stringify({ source: 'fitness_workout', email, date, active }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        console.error(`[habit-link] event rejected: ${res.status} ${body}`);
      }
    })
    .catch((err) => console.error('[habit-link] event failed:', err));
}
