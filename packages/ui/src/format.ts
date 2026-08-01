// lodash + date-fns are imported here on purpose: this module is pulled into the
// CLIENT bundle, which is what gives build-mcp's duplicate detection something to
// find once apps/regressed pins a different lodash major.
import round from 'lodash/round';
import { format, addDays } from 'date-fns';

const EPOCH = new Date(2026, 0, 1);

export function formatDistance(km: number): string {
  return `${round(km, 1)} km`;
}

export function formatGain(metres: number): string {
  return `${round(metres / 1000, 2)} km gain`;
}

export function formatOpened(offsetDays: number): string {
  return format(addDays(EPOCH, offsetDays), 'MMM d, yyyy');
}
