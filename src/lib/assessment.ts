import type { LightState } from './astronomy';

export type ViewingCategory = 'Unfavorable' | 'Limited' | 'Possible' | 'Promising' | 'Strong potential';
export interface Assessment { category: ViewingCategory; summary: string; reasons: string[] }

export function assessViewing(intensity: number | null, light: LightState, stale: boolean): Assessment {
  if (intensity === null) return { category: 'Unfavorable', summary: 'No validated local forecast value is available.', reasons: ['Aurora data unavailable'] };
  const darkness = light === 'night' ? 3 : light === 'astronomical twilight' ? 2 : light === 'nautical twilight' ? 1 : 0;
  const strength = intensity >= 50 ? 4 : intensity >= 30 ? 3 : intensity >= 15 ? 2 : intensity >= 5 ? 1 : 0;
  const score = Math.min(7, darkness + strength - (stale ? 1 : 0));
  let category: ViewingCategory = score >= 7 ? 'Strong potential' : score >= 5 ? 'Promising' : score >= 3 ? 'Possible' : score >= 1 ? 'Limited' : 'Unfavorable';
  // A strong model signal cannot overcome sunlight: cap daylight guidance.
  if (light === 'day' || light === 'civil twilight') category = strength > 0 ? 'Limited' : 'Unfavorable';
  const reasons = [`NOAA forecast intensity near location: ${Math.round(intensity)}/100`, `Local light: ${light}`, stale ? 'Forecast data is stale' : 'Forecast freshness is acceptable'];
  return { category, reasons, summary: `${category}: ${intensity >= 15 ? 'elevated' : 'low'} forecast intensity and ${light}. Cloud conditions are not included.` };
}

export function freshness(timestamp: string, now = Date.now()): 'fresh' | 'aging' | 'stale' {
  const age = now - Date.parse(timestamp); if (age <= 15 * 60_000) return 'fresh'; if (age <= 60 * 60_000) return 'aging'; return 'stale';
}

export function trend(values: number[]): 'rising' | 'falling' | 'steady' | null {
  if (values.length < 2) return null; const delta = values.at(-1)! - values[0]; return delta > 0.25 ? 'rising' : delta < -0.25 ? 'falling' : 'steady';
}

export const formatValue = (value: number | null, digits = 0): string => value === null || !Number.isFinite(value) ? 'Unavailable' : value.toFixed(digits);
