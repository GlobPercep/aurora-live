import type { AuroraData, AuroraPoint, KpPoint, SolarWindPoint, SpaceWeatherData } from '../types';

export const NOAA = {
  aurora: 'https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',
  kp: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
  wind: 'https://services.swpc.noaa.gov/products/geospace/propagated-solar-wind-1-hour.json',
} as const;

const finite = (value: unknown): number | null => {
  if (value === null || value === '' || value === undefined) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
};

const iso = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const time = Date.parse(value.endsWith('Z') ? value : `${value}Z`);
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
};

export function parseAurora(raw: unknown, retrievedAt = new Date().toISOString()): AuroraData {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Aurora response is not an object');
  const record = raw as Record<string, unknown>;
  const observationTime = iso(record['Observation Time']);
  const forecastTime = iso(record['Forecast Time']);
  if (!observationTime || !forecastTime || !Array.isArray(record.coordinates)) throw new Error('Aurora response metadata is invalid');
  const points: AuroraPoint[] = [];
  for (const row of record.coordinates) {
    if (!Array.isArray(row) || row.length < 3) continue;
    const lon = finite(row[0]); const lat = finite(row[1]); const value = finite(row[2]);
    if (lon === null || lat === null || value === null || lon < 0 || lon > 360 || lat < -90 || lat > 90 || value < 0 || value > 100) continue;
    points.push({ lon: normalizeLongitude(lon), lat, value });
  }
  if (points.length < 100) throw new Error('Aurora response contains too few valid coordinates');
  return { observationTime, forecastTime, points, retrievedAt };
}

export function parseKp(raw: unknown): KpPoint[] {
  if (!Array.isArray(raw)) throw new Error('Kp response is not an array');
  const points: KpPoint[] = [];
  for (const row of raw) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const entry = row as Record<string, unknown>; const time = iso(entry.time_tag); const value = finite(entry.Kp);
    if (time && value !== null && value >= 0 && value <= 9) points.push({ time, value });
  }
  if (!points.length) throw new Error('Kp response has no valid measurements');
  return points;
}

export function parseWind(raw: unknown): SolarWindPoint[] {
  if (!Array.isArray(raw) || raw.length < 2 || !Array.isArray(raw[0])) throw new Error('Solar-wind response is not a table');
  const headers = (raw[0] as unknown[]).map(String);
  const required = ['time_tag', 'speed', 'density', 'bz', 'bt'];
  if (!required.every((key) => headers.includes(key))) throw new Error('Solar-wind response is missing required columns');
  const index = Object.fromEntries(headers.map((name, i) => [name, i]));
  const points: SolarWindPoint[] = [];
  for (const unknownRow of raw.slice(1)) {
    if (!Array.isArray(unknownRow)) continue;
    const time = iso(unknownRow[index.time_tag]); if (!time) continue;
    points.push({ time, speed: finite(unknownRow[index.speed]), density: finite(unknownRow[index.density]), bz: finite(unknownRow[index.bz]), bt: finite(unknownRow[index.bt]) });
  }
  if (!points.length) throw new Error('Solar-wind response has no valid measurements');
  return points;
}

export function combineSpaceWeather(kpRaw: unknown, windRaw: unknown, retrievedAt = new Date().toISOString()): SpaceWeatherData {
  return { kp: parseKp(kpRaw), wind: parseWind(windRaw), retrievedAt };
}

export function normalizeLongitude(lon: number): number { return ((lon + 180) % 360 + 360) % 360 - 180; }
