import { addDays, startOfWeek, subDays } from 'date-fns';

const DAYS_IN_WEEK = 7;
const MONDAY_TO_THURSDAY = 3;

export function formatNewsWeek(date: string): string {
  if (!date) return '';

  const lastCoveredDay = subDays(new Date(date), 1);
  const thursday = addDays(startOfWeek(lastCoveredDay, { weekStartsOn: 1 }), MONDAY_TO_THURSDAY);
  const weekOfMonth = Math.ceil(thursday.getDate() / DAYS_IN_WEEK);

  return `${thursday.getFullYear()}년 ${thursday.getMonth() + 1}월 ${weekOfMonth}주차`;
}
