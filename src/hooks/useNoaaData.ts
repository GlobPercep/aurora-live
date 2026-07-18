import { useCallback, useEffect, useRef, useState } from 'react';
import type { AuroraData, FeedState, SpaceWeatherData } from '../types';
import { cacheGet, cacheSet } from '../lib/cache';
import { combineSpaceWeather, NOAA, parseAurora } from '../lib/noaa';
import { freshness } from '../lib/assessment';

const jitter = (base: number) => base * (0.9 + Math.random() * 0.2);
const request = async (url: string, signal: AbortSignal): Promise<unknown> => {
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`NOAA returned ${response.status}`);
  return response.json();
};

export function useNoaaData() {
  const [aurora, setAurora] = useState<FeedState<AuroraData>>({ data: null, mode: 'loading' });
  const [weather, setWeather] = useState<FeedState<SpaceWeatherData>>({ data: null, mode: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const controllers = useRef<AbortController[]>([]);

  const loadAurora = useCallback(async (manual = false) => {
    const controller = new AbortController(); controllers.current.push(controller); if (manual) setRefreshing(true);
    const nextRefresh = new Date(Date.now() + jitter(5 * 60_000)).toISOString();
    try {
      const parsed = parseAurora(await request(NOAA.aurora, controller.signal)); await cacheSet('aurora', parsed);
      setAurora({ data: parsed, mode: freshness(parsed.forecastTime) === 'stale' ? 'stale' : 'live', nextRefresh });
    } catch (error) {
      const cached = await cacheGet<AuroraData>('aurora');
      setAurora(cached ? { data: cached, mode: freshness(cached.forecastTime) === 'stale' ? 'stale' : 'cached', error: 'NOAA is temporarily unavailable', nextRefresh } : { data: null, mode: 'error', error: error instanceof Error ? error.message : 'Aurora feed unavailable', nextRefresh });
    } finally { if (manual) setRefreshing(false); }
  }, []);

  const loadWeather = useCallback(async (manual = false) => {
    const controller = new AbortController(); controllers.current.push(controller); if (manual) setRefreshing(true);
    const nextRefresh = new Date(Date.now() + jitter(2 * 60_000)).toISOString();
    try {
      const [kp, wind] = await Promise.all([request(NOAA.kp, controller.signal), request(NOAA.wind, controller.signal)]);
      const parsed = combineSpaceWeather(kp, wind); await cacheSet('weather', parsed);
      const latest = parsed.wind.at(-1)?.time ?? parsed.retrievedAt;
      setWeather({ data: parsed, mode: freshness(latest) === 'stale' ? 'stale' : 'live', nextRefresh });
    } catch (error) {
      const cached = await cacheGet<SpaceWeatherData>('weather');
      const latest = cached?.wind.at(-1)?.time ?? cached?.retrievedAt ?? '';
      setWeather(cached ? { data: cached, mode: freshness(latest) === 'stale' ? 'stale' : 'cached', error: 'NOAA is temporarily unavailable', nextRefresh } : { data: null, mode: 'error', error: error instanceof Error ? error.message : 'Space-weather feeds unavailable', nextRefresh });
    } finally { if (manual) setRefreshing(false); }
  }, []);

  const refresh = useCallback(() => { void Promise.all([loadAurora(true), loadWeather(true)]); }, [loadAurora, loadWeather]);

  const showDemo = useCallback(() => {
    const now = new Date().toISOString(); const points = [];
    for (let lon = -180; lon < 180; lon += 4) for (const lat of [-78, -74, -70, -66, 66, 70, 74, 78]) points.push({ lon, lat, value: Math.round(Math.max(0, 26 - Math.abs(Math.abs(lat) - 70) * 5 + 10 * Math.sin((lon + 30) * Math.PI / 90))) });
    setAurora({ data: { observationTime: now, forecastTime: now, points, retrievedAt: now }, mode: 'demo' });
  }, []);

  useEffect(() => {
    void loadAurora(); void loadWeather();
    const auroraTimer = window.setInterval(loadAurora, jitter(5 * 60_000)); const weatherTimer = window.setInterval(loadWeather, jitter(2 * 60_000));
    return () => { window.clearInterval(auroraTimer); window.clearInterval(weatherTimer); controllers.current.forEach((controller) => controller.abort()); };
  }, [loadAurora, loadWeather]);

  return { aurora, weather, refreshing, refresh, showDemo };
}
