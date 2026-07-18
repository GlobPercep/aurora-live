export type DataMode = 'loading' | 'live' | 'cached' | 'stale' | 'demo' | 'error';

export interface AuroraPoint { lon: number; lat: number; value: number }
export interface AuroraData { observationTime: string; forecastTime: string; points: AuroraPoint[]; retrievedAt: string }
export interface KpPoint { time: string; value: number }
export interface SolarWindPoint { time: string; speed: number | null; density: number | null; bt: number | null; bz: number | null }
export interface SpaceWeatherData { kp: KpPoint[]; wind: SolarWindPoint[]; retrievedAt: string }
export interface FeedState<T> { data: T | null; mode: DataMode; error?: string; nextRefresh?: string }
export type Hemisphere = 'both' | 'north' | 'south';
export interface VisualSettings { opacity: number; brightness: number; motion: number; hemisphere: Hemisphere; grid: boolean; twilight: boolean; subsolar: boolean; reducedMotion: boolean; lowPower: boolean }
export interface LocationPoint { name: string; lat: number; lon: number }
