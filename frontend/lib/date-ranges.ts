/** Date-range math behind the admin Reports page's presets -- pulled out of the page component so
 * it can be unit tested without rendering React, since a bug here directly skews real earnings
 * figures the shop owner reads. */

/** Formats using LOCAL date components, not toISOString()'s UTC conversion -- the preset dates
 * below are built from local-time constructors (new Date(year, 0, 1), etc.), so formatting through
 * UTC could silently roll "This Year" or "All Time" back by a day for anyone in a negative UTC
 * offset (all of the Americas): local midnight Jan 1 is still Dec 31 in UTC. Keeping both halves in
 * local time makes "this year" mean the viewer's own calendar year, which is what they'd expect. */
export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export interface ReportPreset {
  label: string;
  from: () => Date;
  to: () => Date;
}

export const REPORT_PRESETS: ReportPreset[] = [
  { label: 'Today', from: () => daysAgo(0), to: () => daysAgo(0) },
  { label: 'Last 7 Days', from: () => daysAgo(6), to: () => daysAgo(0) },
  { label: 'Last 30 Days', from: () => daysAgo(29), to: () => daysAgo(0) },
  { label: 'Last 90 Days', from: () => daysAgo(89), to: () => daysAgo(0) },
  { label: 'This Year', from: () => new Date(new Date().getFullYear(), 0, 1), to: () => daysAgo(0) },
  { label: 'All Time', from: () => new Date(2020, 0, 1), to: () => daysAgo(0) }
];
