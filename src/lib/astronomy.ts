export type LightState = 'day' | 'civil twilight' | 'nautical twilight' | 'astronomical twilight' | 'night';

const rad = Math.PI / 180;
export function sunDeclination(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0); const day = (date.getTime() - start) / 86400000;
  return -23.44 * Math.cos((360 / 365 * (day + 10)) * rad);
}

export function subsolarLongitude(date: Date): number {
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  return (12 - utcHours) * 15;
}

export function solarElevation(date: Date, lat: number, lon: number): number {
  const dec = sunDeclination(date) * rad; const latitude = lat * rad;
  const hourAngle = (lon - subsolarLongitude(date)) * rad;
  return Math.asin(Math.sin(latitude) * Math.sin(dec) + Math.cos(latitude) * Math.cos(dec) * Math.cos(hourAngle)) / rad;
}

export function classifyLight(elevation: number): LightState {
  if (elevation >= 0) return 'day'; if (elevation >= -6) return 'civil twilight'; if (elevation >= -12) return 'nautical twilight';
  if (elevation >= -18) return 'astronomical twilight'; return 'night';
}

export function moonIllumination(date: Date): number {
  const synodicMonth = 29.53058867; const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const phase = ((date.getTime() - knownNewMoon) / 86400000 % synodicMonth + synodicMonth) % synodicMonth / synodicMonth;
  return (1 - Math.cos(phase * Math.PI * 2)) / 2;
}

export function nextAstronomicalDarkness(from: Date, lat: number, lon: number): Date | null {
  for (let minutes = 0; minutes <= 48 * 60; minutes += 30) {
    const candidate = new Date(from.getTime() + minutes * 60_000);
    if (solarElevation(candidate, lat, lon) < -18) return candidate;
  }
  return null;
}
