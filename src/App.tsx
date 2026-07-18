import { useEffect, useMemo, useState } from 'react';
import { Globe } from './components/Globe';
import { Sparkline } from './components/Sparkline';
import { StatusBadge } from './components/StatusBadge';
import { useNoaaData } from './hooks/useNoaaData';
import type { LocationPoint, VisualSettings } from './types';
import { assessViewing, formatValue, freshness, trend } from './lib/assessment';
import { classifyLight, moonIllumination, nextAstronomicalDarkness, solarElevation } from './lib/astronomy';
import { bearingToPole, nearestAurora } from './lib/geo';
import { NOAA } from './lib/noaa';

type Tab = 'live' | 'location' | 'conditions' | 'learn' | 'settings';
const presets: LocationPoint[] = [
  { name: 'Fairbanks, Alaska', lat: 64.84, lon: -147.72 }, { name: 'Reykjavík, Iceland', lat: 64.15, lon: -21.94 },
  { name: 'Tromsø, Norway', lat: 69.65, lon: 18.96 }, { name: 'Yellowknife, Canada', lat: 62.45, lon: -114.38 },
  { name: 'Hobart, Tasmania', lat: -42.88, lon: 147.33 }, { name: 'Dunedin, New Zealand', lat: -45.88, lon: 170.50 },
];
const defaultSettings: VisualSettings = { opacity: .72, brightness: 1, motion: .55, hemisphere: 'both', grid: false, twilight: true, subsolar: false, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, lowPower: false };

const relativeTime = (time?: string) => {
  if (!time) return 'Unknown'; const minutes = Math.max(0, Math.round((Date.now() - Date.parse(time)) / 60000));
  return minutes < 1 ? 'moments ago' : minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} hr ago`;
};
const untilTime = (time: string) => { const minutes = Math.max(0, Math.round((Date.parse(time) - Date.now()) / 60000)); return minutes < 60 ? `in ${minutes} min` : `in ${Math.round(minutes / 60)} hr`; };
const clock = (time?: string) => time ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(time)) : '—';

export default function App() {
  const { aurora, weather, refreshing, refresh, showDemo } = useNoaaData();
  const [tab, setTab] = useState<Tab>('live'); const [settings, setSettings] = useState<VisualSettings>(() => ({ ...defaultSettings, ...JSON.parse(localStorage.getItem('aurora-settings') ?? '{}') }));
  const [location, setLocation] = useState<LocationPoint | null>(() => JSON.parse(localStorage.getItem('aurora-location') ?? 'null') as LocationPoint | null);
  const [lat, setLat] = useState(location?.lat.toString() ?? ''); const [lon, setLon] = useState(location?.lon.toString() ?? ''); const [locationError, setLocationError] = useState('');
  const [view, setView] = useState('global'); const [webgl, setWebgl] = useState(true); const [online, setOnline] = useState(navigator.onLine); const [installPrompt, setInstallPrompt] = useState<Event | null>(null); const [updateAvailable, setUpdateAvailable] = useState(false);
  const latestWind = weather.data?.wind.at(-1); const latestKp = weather.data?.kp.at(-1); const selectedAurora = location && aurora.data ? nearestAurora(aurora.data.points, location.lat, location.lon) : null;
  const light = location ? classifyLight(solarElevation(new Date(), location.lat, location.lon)) : null;
  const nextDarkness = location ? nextAstronomicalDarkness(new Date(), location.lat, location.lon) : null;
  const assessment = location && light ? assessViewing(selectedAurora?.value ?? null, light, aurora.mode === 'stale' || aurora.mode === 'error') : null;
  const maxIntensity = useMemo(() => aurora.data ? Math.max(...aurora.data.points.map((point) => point.value)) : null, [aurora.data]);

  useEffect(() => { localStorage.setItem('aurora-settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { const update = () => setOnline(navigator.onLine); const notifyUpdate = () => setUpdateAvailable(true); addEventListener('online', update); addEventListener('offline', update); addEventListener('aurora-update-available', notifyUpdate); const capture = (event: Event) => { event.preventDefault(); setInstallPrompt(event); }; addEventListener('beforeinstallprompt', capture); return () => { removeEventListener('online', update); removeEventListener('offline', update); removeEventListener('aurora-update-available', notifyUpdate); removeEventListener('beforeinstallprompt', capture); }; }, []);
  const applyUpdate = async () => { const registration = await navigator.serviceWorker.getRegistration(); registration?.waiting?.postMessage('SKIP_WAITING'); navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true }); };
  const patchSetting = <K extends keyof VisualSettings>(key: K, value: VisualSettings[K]) => setSettings((old) => ({ ...old, [key]: value }));

  const saveCoordinates = () => {
    const latitude = Number(lat); const longitude = Number(lon); if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) { setLocationError('Enter latitude from −90 to 90 and longitude from −180 to 180.'); return; }
    const next = { name: `${Math.abs(latitude).toFixed(2)}°${latitude >= 0 ? 'N' : 'S'}, ${Math.abs(longitude).toFixed(2)}°${longitude >= 0 ? 'E' : 'W'}`, lat: latitude, lon: longitude }; setLocation(next); localStorage.setItem('aurora-location', JSON.stringify(next)); setLocationError(''); setView('location');
  };
  const locate = () => {
    setLocationError(''); if (!navigator.geolocation) { setLocationError('Location is not supported by this browser. Enter coordinates instead.'); return; }
    navigator.geolocation.getCurrentPosition((position) => { const next = { name: 'My location', lat: position.coords.latitude, lon: position.coords.longitude }; setLocation(next); setLat(next.lat.toFixed(4)); setLon(next.lon.toFixed(4)); localStorage.setItem('aurora-location', JSON.stringify(next)); setView('location'); }, () => setLocationError('Location permission was not granted. You can enter coordinates or choose a city.'), { timeout: 8000, maximumAge: 600000 });
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [{ id: 'live', label: 'Live', icon: '◉' }, { id: 'location', label: 'My location', icon: '⌖' }, { id: 'conditions', label: 'Conditions', icon: '⌁' }, { id: 'learn', label: 'Learn', icon: '?' }, { id: 'settings', label: 'Settings', icon: '⚙' }];
  return <main className="app">
    <a className="skip-link" href="#main-panel">Skip to conditions</a>
    {!online && <div className="offline-banner" role="status">You’re offline. Showing the most recently validated data stored on this device.</div>}
    {updateAvailable && <div className="update-banner" role="status">A new version is ready. <button onClick={applyUpdate}>Update safely</button></div>}
    <header className="topbar">
      <button className="brand" onClick={() => setTab('live')} aria-label="Aurora Live home"><span className="mark"><i/><i/><i/></span><span><b>AURORA</b> LIVE</span></button>
      <nav aria-label="Primary navigation">{tabs.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>
      <div className="top-actions"><StatusBadge mode={aurora.mode} /><button className="icon-btn" onClick={refresh} disabled={refreshing} aria-label="Refresh all NOAA data">{refreshing ? '···' : '↻'}</button></div>
    </header>

    <section className="stage">
      {webgl ? <Globe data={aurora.data} settings={settings} location={location} view={view} onWebgl={setWebgl} /> : <div className="fallback"><span>2D MODE</span><h1>Your browser can’t display the interactive globe.</h1><p>The current NOAA conditions and location guidance remain fully available.</p></div>}
      <div className="globe-caption"><span>{aurora.mode === 'demo' ? 'FICTIONAL DEMO' : 'NOAA OVATION FORECAST'}</span><strong>{maxIntensity === null ? 'Waiting for validated forecast' : `Peak grid intensity ${maxIntensity}/100`}</strong><small>{aurora.data ? `Forecast ${clock(aurora.data.forecastTime)} · retrieved ${relativeTime(aurora.data.retrievedAt)}` : 'Earth is ready while data connects'}</small></div>
      <div className="view-dock" aria-label="Earth viewpoints"><button className={view === 'global' ? 'active' : ''} onClick={() => setView('global')}>Global</button><button className={view === 'arctic' ? 'active' : ''} onClick={() => setView('arctic')}>Arctic</button><button className={view === 'antarctic' ? 'active' : ''} onClick={() => setView('antarctic')}>Antarctic</button><button className={view === 'bestNorth' ? 'active' : ''} onClick={() => setView('bestNorth')}>N best</button><button className={view === 'bestSouth' ? 'active' : ''} onClick={() => setView('bestSouth')}>S best</button>{location && <button className={view === 'location' ? 'active' : ''} onClick={() => setView('location')}>My location</button>}</div>
      <div className="legend" aria-label="Aurora forecast intensity legend"><span>Forecast intensity</span><div><i/><i/><i/><i/><i/></div><small>0</small><small>25</small><small>50</small><small>75</small><small>100</small></div>
    </section>

    <aside key={tab} id="main-panel" className={`panel sheet ${tab}`} aria-label={`${tabs.find((item) => item.id === tab)?.label} panel`}>
      <div className="sheet-handle" />
      {tab === 'live' && <div className="panel-content">
        <div className="panel-title"><div><p className="eyebrow">RIGHT NOW</p><h1>Earth’s magnetic sky</h1></div><StatusBadge mode={aurora.mode} /></div>
        {aurora.mode === 'error' && <div className="alert error"><b>NOAA forecast unavailable</b><p>{aurora.error}. No current measurements are being shown.</p><div><button onClick={refresh}>Try again</button><button className="quiet" onClick={showDemo}>View fictional demo</button></div></div>}
        {aurora.mode === 'stale' && <div className="alert"><b>Forecast data is stale</b><p>Kept visible for context, but it should not be treated as current.</p></div>}
        {aurora.mode === 'demo' && <div className="alert demo"><b>Fictional demonstration</b><p>These values do not describe current conditions. Refresh to reconnect to NOAA.</p></div>}
        <div className="metric-grid">
          <article className="metric hero-metric"><div><span>Planetary Kp</span><small>{latestKp ? clock(latestKp.time) : 'NOAA measurement'}</small></div><strong>{latestKp ? latestKp.value.toFixed(1) : '—'}</strong><em>{trend(weather.data?.kp.slice(-4).map((p) => p.value) ?? []) ?? 'no trend'}</em><Sparkline label="Recent Kp" values={weather.data?.kp.slice(-16).map((p) => p.value) ?? []} /></article>
          <article className="metric"><span>Solar wind</span><strong>{formatValue(latestWind?.speed ?? null)}</strong><small>km/s · {latestWind ? relativeTime(latestWind.time) : 'unavailable'}</small></article>
          <article className="metric"><span>IMF Bz</span><strong className={(latestWind?.bz ?? 0) < 0 ? 'favorable' : ''}>{formatValue(latestWind?.bz ?? null, 1)}</strong><small>nT · southward is negative</small></article>
        </div>
        <button className="primary wide" onClick={() => setTab('location')}>⌖ Could I see it?</button>
        <details className="explain"><summary>What am I seeing?</summary><p>NOAA OVATION is a modeled aurora forecast—not a live camera. The flowing glow is a visual interpretation of forecast intensity; it does not add measurements or predict motion. Darkness, cloud, terrain and light pollution all affect visibility.</p></details>
        <AccessibleSummary data={aurora.data} mode={aurora.mode} />
      </div>}

      {tab === 'location' && <div className="panel-content">
        <div className="panel-title"><div><p className="eyebrow">LOCAL VIEWING</p><h1>Could I see it?</h1></div>{location && <button className="quiet small" onClick={() => { setLocation(null); localStorage.removeItem('aurora-location'); }}>Forget</button>}</div>
        {!location ? <><p className="intro">Your coordinates stay on this device and are only compared locally with NOAA’s grid.</p><button className="primary wide" onClick={locate}>Use my current location</button><div className="or"><span>or enter coordinates</span></div><div className="coordinate-grid"><label>Latitude<input inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="64.84" /></label><label>Longitude<input inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} placeholder="−147.72" /></label></div><button className="secondary wide" onClick={saveCoordinates}>Check this location</button>{locationError && <p className="form-error" role="alert">{locationError}</p>}<div className="preset-list"><span>Polar city presets</span>{presets.map((preset) => <button key={preset.name} onClick={() => { setLocation(preset); setLat(String(preset.lat)); setLon(String(preset.lon)); localStorage.setItem('aurora-location', JSON.stringify(preset)); setView('location'); }}>{preset.name}</button>)}</div></> : <>
          <div className={`assessment ${assessment?.category.toLowerCase().replace(' ', '-')}`}><span>{location.name}</span><h2>{assessment?.category}</h2><p>{assessment?.summary}</p></div>
          <dl className="fact-list"><div><dt>Local light</dt><dd>{light}</dd></div><div><dt>Forecast intensity</dt><dd>{selectedAurora ? `${Math.round(selectedAurora.value)}/100` : 'Unavailable'}</dd></div><div><dt>Look</dt><dd>{bearingToPole(location.lat)}</dd></div><div><dt>Moon illuminated</dt><dd>{Math.round(moonIllumination(new Date()) * 100)}%</dd></div><div><dt>Next astronomical darkness</dt><dd>{nextDarkness ? `${untilTime(nextDarkness.toISOString())} · ${clock(nextDarkness.toISOString())}` : 'Not within 48 hours'}</dd></div><div><dt>Forecast freshness</dt><dd>{aurora.data ? `${freshness(aurora.data.forecastTime)} · ${relativeTime(aurora.data.forecastTime)}` : 'Unavailable'}</dd></div></dl>
          <div className="reasons">{assessment?.reasons.map((reason) => <p key={reason}><i/> {reason}</p>)}</div><p className="caveat">Guidance is not a promise of visibility. Clouds, light pollution, terrain and rapid space-weather changes are not included.</p><button className="secondary wide" onClick={() => setLocation(null)}>Check another place</button>
        </>}
      </div>}

      {tab === 'conditions' && <div className="panel-content">
        <div className="panel-title"><div><p className="eyebrow">SPACE WEATHER</p><h1>Current conditions</h1></div><StatusBadge mode={weather.mode} /></div>
        <Condition label="Planetary Kp" value={latestKp ? latestKp.value.toFixed(2) : null} unit="index 0–9" description="Higher Kp generally corresponds to broader geomagnetic activity." values={weather.data?.kp.slice(-24).map((p) => p.value) ?? []} />
        <Condition label="Solar-wind speed" value={latestWind?.speed ?? null} unit="km/s" description="Faster solar wind can contribute to stronger geomagnetic activity." values={weather.data?.wind.slice(-30).flatMap((p) => p.speed === null ? [] : [p.speed]) ?? []} />
        <div className="condition-row"><Condition label="Density" value={latestWind?.density ?? null} unit="p/cm³" description="How many protons occupy each cubic centimetre." compact /><Condition label="IMF strength" value={latestWind?.bt ?? null} unit="nT" description="Total interplanetary magnetic-field magnitude." compact /></div>
        <Condition label="Bz component" value={latestWind?.bz ?? null} unit="nT" description="Sustained southward (negative) Bz can favor energy transfer into Earth’s magnetic environment." values={weather.data?.wind.slice(-30).flatMap((p) => p.bz === null ? [] : [p.bz]) ?? []} color="#83c8ff" />
        <p className="source-note">Latest wind measurement: {latestWind ? `${clock(latestWind.time)} (${relativeTime(latestWind.time)})` : 'unavailable'}. Source: <a href={NOAA.wind} target="_blank" rel="noreferrer">NOAA SWPC</a>.</p>
      </div>}

      {tab === 'learn' && <div className="panel-content"><div className="panel-title"><div><p className="eyebrow">FIELD NOTES</p><h1>Read the magnetic sky</h1></div></div><div className="learn-list">
        <details open><summary><span>01</span>What makes an aurora?</summary><p>Charged particles guided by Earth’s magnetic field collide with gases high in the atmosphere. Oxygen commonly produces green light; other emissions can appear at different altitudes.</p></details>
        <details><summary><span>02</span>What does Kp mean?</summary><p>Kp summarizes geomagnetic disturbance on a 0–9 scale. Higher values often expand auroral activity toward lower latitudes, but Kp alone cannot predict a local sighting.</p></details>
        <details><summary><span>03</span>Solar wind & Bz</summary><p>Solar wind carries the Sun’s magnetic field past Earth. A sustained southward Bz orientation can connect more effectively with Earth’s field.</p></details>
        <details><summary><span>04</span>Why darkness matters</summary><p>Even strong aurora can be washed out by daylight, twilight, the Moon or city light. The local guidance always weighs the Sun’s elevation.</p></details>
        <details><summary><span>05</span>Eyes versus cameras</summary><p>Phone cameras collect light longer than your eyes, so they may reveal richer color. A model forecast is different again: it estimates activity and is not a photograph.</p></details>
      </div><div className="authority"><span>AUTHORITATIVE SOURCE</span><p>Underlying forecast and measurements come from the U.S. NOAA Space Weather Prediction Center.</p><a href="https://www.swpc.noaa.gov/" target="_blank" rel="noreferrer">Visit NOAA SWPC ↗</a></div></div>}

      {tab === 'settings' && <div className="panel-content"><div className="panel-title"><div><p className="eyebrow">VISUALIZATION</p><h1>Tune your view</h1></div></div>
        <label className="range-label"><span>Aurora opacity <b>{Math.round(settings.opacity * 100)}%</b></span><input type="range" min="0.15" max="1" step="0.05" value={settings.opacity} onChange={(e) => patchSetting('opacity', Number(e.target.value))} /></label>
        <label className="range-label"><span>Aurora brightness <b>{Math.round(settings.brightness * 100)}%</b></span><input type="range" min="0.5" max="1.5" step="0.1" value={settings.brightness} onChange={(e) => patchSetting('brightness', Number(e.target.value))} /></label>
        <label className="range-label"><span>Animation intensity <b>{Math.round(settings.motion * 100)}%</b></span><input type="range" min="0" max="1" step="0.1" value={settings.motion} onChange={(e) => patchSetting('motion', Number(e.target.value))} disabled={settings.reducedMotion} /></label>
        <fieldset><legend>Hemisphere</legend><div className="segment">{(['both', 'north', 'south'] as const).map((value) => <button key={value} className={settings.hemisphere === value ? 'active' : ''} onClick={() => patchSetting('hemisphere', value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div></fieldset>
        <Toggle label="Forecast-grid overlay" checked={settings.grid} onChange={(value) => patchSetting('grid', value)} /><Toggle label="Twilight bands" checked={settings.twilight} onChange={(value) => patchSetting('twilight', value)} /><Toggle label="Subsolar point" checked={settings.subsolar} onChange={(value) => patchSetting('subsolar', value)} /><Toggle label="Reduced motion" hint="Stops auto-rotation and decorative movement" checked={settings.reducedMotion} onChange={(value) => patchSetting('reducedMotion', value)} /><Toggle label="Low-power mode" hint="Reduces pixel density and forecast points" checked={settings.lowPower} onChange={(value) => patchSetting('lowPower', value)} />
        <div className="install-card"><b>Install Aurora Live</b><p>Use Aurora Live like an app, with the latest validated data available offline.</p>{installPrompt ? <button className="secondary" onClick={() => (installPrompt as Event & { prompt: () => void }).prompt()}>Install app</button> : <small>iPhone/iPad: Share → Add to Home Screen. Android/Desktop: use your browser’s Install option.</small>}</div>
      </div>}
    </aside>

    <footer className="data-strip"><div><span>DATA</span><StatusBadge mode={aurora.mode} /></div><div><small>Forecast time</small><b>{aurora.data ? clock(aurora.data.forecastTime) : 'Waiting'}</b></div><div><small>Next refresh</small><b>{aurora.nextRefresh ? clock(aurora.nextRefresh) : 'Scheduling'}</b></div><button onClick={refresh} disabled={refreshing}>Refresh now ↻</button></footer>
    <nav className="mobile-nav" aria-label="Mobile navigation">{tabs.map((item) => <button key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}><span>{item.icon}</span>{item.label}</button>)}</nav>
  </main>;
}

function Condition({ label, value, unit, description, values = [], color, compact = false }: { label: string; value: number | string | null; unit: string; description: string; values?: number[]; color?: string; compact?: boolean }) {
  return <article className={`condition ${compact ? 'compact' : ''}`}><div><span>{label}</span><strong>{typeof value === 'number' ? formatValue(value, 1) : value ?? 'Unavailable'} <small>{value !== null ? unit : ''}</small></strong><p>{description}</p></div>{!compact && <Sparkline label={`Recent ${label}`} values={values} color={color} />}</article>;
}
function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="toggle"><span>{label}{hint && <small>{hint}</small>}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i /></label>; }
function AccessibleSummary({ data, mode }: { data: ReturnType<typeof useNoaaData>['aurora']['data']; mode: string }) {
  const north = data?.points.filter((p) => p.lat > 0).reduce((max, p) => Math.max(max, p.value), 0); const south = data?.points.filter((p) => p.lat < 0).reduce((max, p) => Math.max(max, p.value), 0);
  return <section className="accessible-summary"><h2>2D forecast summary</h2><p>Status: {mode}. {data ? `Maximum validated grid intensity is ${north}/100 in the north and ${south}/100 in the south.` : 'No validated forecast grid is available.'}</p></section>;
}
