import { describe, expect, it } from 'vitest';
import { classifyLight, moonIllumination, nextAstronomicalDarkness, solarElevation, subsolarLongitude, sunDeclination } from './astronomy';
import { assessViewing, formatValue, freshness, trend } from './assessment';
import { haversine, latLonToCartesian, nearestAurora } from './geo';

describe('geographic utilities', () => {
  it('converts poles and equator to unit Cartesian coordinates', () => { expect(latLonToCartesian(90, 0)).toEqual(expect.arrayContaining([expect.closeTo(0), expect.closeTo(1), expect.closeTo(0)])); expect(Math.hypot(...latLonToCartesian(0, 0))).toBeCloseTo(1); });
  it('finds nearest grid point across longitude wraparound', () => { expect(nearestAurora([{ lat: 70, lon: 179, value: 42 }, { lat: 70, lon: 0, value: 1 }], 70, -179)?.value).toBe(42); expect(haversine(70, 179, 70, -179)).toBeLessThan(.02); });
});
describe('Sun, twilight and Moon', () => {
  it('puts the subsolar point near Greenwich at equinox noon', () => { const date = new Date('2026-03-20T12:00:00Z'); expect(subsolarLongitude(date)).toBeCloseTo(0); expect(sunDeclination(date)).toBeGreaterThan(-1); expect(sunDeclination(date)).toBeLessThan(1); expect(solarElevation(date, 0, 0)).toBeGreaterThan(88); });
  it('classifies exact twilight boundaries', () => { expect(classifyLight(0)).toBe('day'); expect(classifyLight(-6)).toBe('civil twilight'); expect(classifyLight(-12)).toBe('nautical twilight'); expect(classifyLight(-18)).toBe('astronomical twilight'); expect(classifyLight(-18.01)).toBe('night'); });
  it('calculates bounded moon illumination and the next darkness window', () => { expect(moonIllumination(new Date('2000-01-06T18:14:00Z'))).toBeCloseTo(0); expect(moonIllumination(new Date('2000-01-21T12:00:00Z'))).toBeGreaterThan(.99); expect(nextAstronomicalDarkness(new Date('2026-03-20T12:00:00Z'), 0, 0)).not.toBeNull(); });
});
describe('assessment and formatting', () => {
  it('never gives daylight a favorable result', () => expect(assessViewing(100, 'day', false).category).toBe('Limited'));
  it('rewards darkness and penalizes stale data transparently', () => { expect(assessViewing(50, 'night', false).category).toBe('Strong potential'); expect(assessViewing(50, 'night', true).category).toBe('Promising'); });
  it('handles freshness boundaries', () => { const now = Date.parse('2026-07-18T12:00:00Z'); expect(freshness('2026-07-18T11:45:00Z', now)).toBe('fresh'); expect(freshness('2026-07-18T11:44:59Z', now)).toBe('aging'); expect(freshness('2026-07-18T10:59:59Z', now)).toBe('stale'); });
  it('calculates trends and never formats missing as zero', () => { expect(trend([1, 1.5])).toBe('rising'); expect(trend([2, 1])).toBe('falling'); expect(formatValue(null)).toBe('Unavailable'); expect(formatValue(0)).toBe('0'); });
});
