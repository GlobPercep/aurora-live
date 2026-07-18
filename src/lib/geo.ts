import type { AuroraPoint } from '../types';

export function latLonToCartesian(lat: number, lon: number, radius = 1): [number, number, number] {
  const phi = (90 - lat) * Math.PI / 180; const theta = (lon + 180) * Math.PI / 180;
  return [-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta)];
}

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180; const dLat = (lat2 - lat1) * rad; const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearestAurora(points: AuroraPoint[], lat: number, lon: number): AuroraPoint | null {
  let best: AuroraPoint | null = null; let distance = Infinity;
  for (const point of points) { const next = haversine(lat, lon, point.lat, point.lon); if (next < distance) { distance = next; best = point; } }
  return best;
}

export function bearingToPole(lat: number): string {
  if (Math.abs(lat) > 66) return 'Look across the darkest northern sky, away from city lights';
  return lat >= 0 ? 'Look low toward the north' : 'Look low toward the south';
}
