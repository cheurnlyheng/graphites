import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { toISODate, daysAgo, REPORT_PRESETS } from './date-ranges';

// A fixed "now" so every assertion below is deterministic regardless of when the suite runs.
const FIXED_NOW = new Date('2026-06-15T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('toISODate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(toISODate(new Date('2026-06-15T12:00:00Z'))).toBe('2026-06-15');
  });
});

describe('daysAgo', () => {
  it('returns today for 0', () => {
    expect(toISODate(daysAgo(0))).toBe('2026-06-15');
  });

  it('subtracts the given number of calendar days', () => {
    expect(toISODate(daysAgo(6))).toBe('2026-06-09');
    expect(toISODate(daysAgo(29))).toBe('2026-05-17');
  });

  it('rolls back across a month boundary correctly', () => {
    vi.setSystemTime(new Date('2026-03-02T12:00:00Z'));
    expect(toISODate(daysAgo(5))).toBe('2026-02-25');
  });
});

describe('REPORT_PRESETS', () => {
  function findPreset(label: string) {
    const preset = REPORT_PRESETS.find((p) => p.label === label);
    if (!preset) throw new Error(`Missing preset: ${label}`);
    return preset;
  }

  it('"Today" spans a single day', () => {
    const preset = findPreset('Today');
    expect(toISODate(preset.from())).toBe('2026-06-15');
    expect(toISODate(preset.to())).toBe('2026-06-15');
  });

  it('"Last 7 Days" is inclusive of today (6 days back through today = 7 days)', () => {
    const preset = findPreset('Last 7 Days');
    expect(toISODate(preset.from())).toBe('2026-06-09');
    expect(toISODate(preset.to())).toBe('2026-06-15');
  });

  it('"Last 30 Days" spans 29 days back through today', () => {
    const preset = findPreset('Last 30 Days');
    expect(toISODate(preset.from())).toBe('2026-05-17');
    expect(toISODate(preset.to())).toBe('2026-06-15');
  });

  it('"This Year" starts on January 1st of the current year', () => {
    const preset = findPreset('This Year');
    expect(toISODate(preset.from())).toBe('2026-01-01');
    expect(toISODate(preset.to())).toBe('2026-06-15');
  });

  it('"All Time" starts from a fixed early date, not a rolling window', () => {
    const preset = findPreset('All Time');
    expect(toISODate(preset.from())).toBe('2020-01-01');
  });
});
