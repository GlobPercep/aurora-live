import { describe, expect, it } from 'vitest';
import { normalizeLongitude, parseAurora, parseKp, parseWind } from './noaa';

describe('NOAA adapters', () => {
  it('validates and normalizes an OVATION response', () => {
    const coordinates = Array.from({ length: 120 }, (_, i) => [i % 360, (i % 90) - 45, i % 101]);
    const parsed = parseAurora({ 'Observation Time': '2026-07-18T12:00:00Z', 'Forecast Time': '2026-07-18T13:00:00Z', coordinates }, '2026-07-18T12:05:00Z');
    expect(parsed.points).toHaveLength(120); expect(parsed.points[0]).toEqual({ lon: 0, lat: -45, value: 0 });
  });
  it('rejects invalid OVATION metadata and too few coordinates', () => {
    expect(() => parseAurora({ coordinates: [] })).toThrow();
    expect(() => parseAurora({ 'Observation Time': '2026-07-18', 'Forecast Time': '2026-07-18', coordinates: [[0, 70, 10]] })).toThrow(/too few/);
  });
  it('filters invalid coordinates and string-encoded values', () => {
    const valid = Array.from({ length: 101 }, () => ['359', '70', '25']); const parsed = parseAurora({ 'Observation Time': '2026-07-18', 'Forecast Time': '2026-07-18', coordinates: [...valid, [500, 100, -2], null] });
    expect(parsed.points).toHaveLength(101); expect(parsed.points[0]).toEqual({ lon: -1, lat: 70, value: 25 });
  });
  it('parses object Kp rows, preserving valid zero and rejecting missing values', () => {
    expect(parseKp([{ time_tag: '2026-07-18T12:00:00', Kp: '0' }, { time_tag: 'bad', Kp: null }])).toEqual([{ time: '2026-07-18T12:00:00.000Z', value: 0 }]);
  });
  it('handles embedded solar-wind headers, nulls, strings and extra columns', () => {
    const parsed = parseWind([['time_tag', 'speed', 'density', 'bz', 'bt', 'extra'], ['2026-07-18T12:00:00Z', '401.2', null, '-3.4', 5.2, 'ignored']]);
    expect(parsed[0]).toEqual({ time: '2026-07-18T12:00:00.000Z', speed: 401.2, density: null, bz: -3.4, bt: 5.2 });
  });
  it('rejects changed table schemas', () => expect(() => parseWind([['time'], ['2026-07-18']])).toThrow(/missing required/));
  it('wraps longitude consistently', () => { expect(normalizeLongitude(359)).toBe(-1); expect(normalizeLongitude(-181)).toBe(179); expect(normalizeLongitude(180)).toBe(-180); });
});
