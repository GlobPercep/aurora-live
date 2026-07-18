# Aurora Live

Aurora Live is a cinematic, installable visualization of Earth’s current auroral environment, powered by official NOAA Space Weather Prediction Center data. It opens directly on a 3D Earth, projects the latest OVATION grid over both hemispheres, explains current Kp and solar-wind conditions, and gives cautious local viewing guidance without claiming that an aurora is guaranteed.

## Product highlights

- Live 3D Earth with drag, wheel and pinch controls, current sun-facing illumination, atmosphere, stars, forecast points, twilight guides and quick global/polar/local views.
- Explicit `live`, `cached`, `stale`, `demo`, `loading`, and `unavailable` states. Current measurements are never fabricated and missing values are never displayed as zero.
- “Could I see it?” flow using opt-in browser geolocation, manual coordinates, or polar-city presets. Precise coordinates remain on the device.
- Local solar elevation, twilight class, Moon illumination, direction guidance, nearest forecast intensity, freshness and next astronomical-darkness window.
- Kp, solar-wind speed, density, Bt and Bz cards with cautious explanations and accessible text equivalents for the compact charts.
- First-class phone layout with a persistent globe, bottom sheet, safe-area-aware navigation and large touch controls.
- Accessible 2D forecast summary and full conditions interface if WebGL is unavailable.
- PWA manifest, icons, standalone mode, offline application shell, safe in-app update notice and IndexedDB last-known-valid feed cache.

## Technology

React 19, strict TypeScript, Vite 8, Three.js, Vitest and Playwright. The runtime is frontend-only because NOAA’s selected public endpoints support browser access; no server, database, secret, account or proxy is required.

## Architecture

```text
src/
├── components/       Globe, sparklines and data-state UI
├── hooks/            independent jittered NOAA refresh lifecycle
├── lib/
│   ├── noaa.ts       runtime validation and normalization adapters
│   ├── cache.ts      IndexedDB last-known-valid data
│   ├── geo.ts        coordinates, distance and nearest-grid lookup
│   ├── astronomy.ts  Sun, twilight, Moon and darkness calculations
│   └── assessment.ts transparent viewing guidance and freshness
├── App.tsx            responsive product interface
└── styles.css         design system and responsive layouts
```

The globe uses one Earth mesh, shared atmosphere/twilight materials, one point geometry for all visible OVATION samples, a capped device-pixel ratio and deterministic star geometry. Low-power mode reduces geometry and pixel density. NOAA requests occur only on independent timers, never in the render loop; requests are abortable on teardown.

## Local development

Requires Node 22+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173`. Browser geolocation usually works on localhost. NOAA network access is optional for rendering Earth; a first-launch outage shows a clear unavailable state and optional fictional demo.

## Build and testing

```bash
pnpm build
pnpm test
pnpm exec playwright install chromium  # once per machine
pnpm test:e2e
```

Unit coverage includes schema changes, embedded headers, null/string handling, invalid coordinate rejection, longitude wraparound, Cartesian conversion, nearest-grid lookup, Sun/twilight boundaries, Moon phase, freshness, trends, formatting and viewing guidance. Browser tests mock all NOAA requests and cover initial Earth/status, manual location, assessment, hemisphere and reduced-motion settings, mobile navigation, unavailable/demo states and the manifest.

## NOAA sources and refresh policy

See [DATA_SOURCES.md](./DATA_SOURCES.md) for every endpoint, its observed response structure, validators, refresh frequency, cache policy, failure behavior and the deprecated endpoint discovered during implementation.

- OVATION: about 5 minutes, ±10% jitter.
- Kp + solar wind: about 2 minutes, ±10% jitter.
- Last fully validated normalized responses: IndexedDB.
- Feed age: fresh ≤15 minutes, aging ≤60 minutes, stale afterward.

Retrieval time, source/measurement time, data age, next scheduled refresh and status are shown in the interface. Local forecast snapshots are not presented as a NOAA historical archive.

## Coordinate and assessment conventions

NOAA OVATION longitudes are normalized from 0–360 to −180–180. Three.js uses a unit sphere with +Y north. `latLonToCartesian` documents and tests the conversion. The nearest forecast grid point is selected by great-circle angular distance, including antimeridian wraparound.

Viewing guidance uses only visible inputs: the nearest OVATION intensity, locally calculated solar elevation/twilight, and forecast staleness. Daylight and civil twilight cap the result at Limited. Categories are Unfavorable, Limited, Possible, Promising and Strong potential. Clouds are not included. The result is guidance, not a visibility probability or guarantee.

## Scientific limitations

OVATION is a modeled aurora forecast, not a live camera. Animated glow is decorative interpretation and does not imply measured motion. Kp is broad and retrospective; one solar-wind measurement cannot determine local visibility. Weather, terrain, light pollution and rapid changes matter. The client-side Sun and Moon formulas are suitable for consumer guidance, not navigation or observatory-grade ephemerides. NOAA remains authoritative.

## Privacy and accessibility

There are no accounts, analytics, ads, trackers or server-side location storage. Geolocation is requested only after pressing “Use my current location.” Manual coordinates and saved preferences stay in local storage and can be forgotten. The app includes semantic controls, strong focus states, text status labels, reduced motion, chart descriptions, touch-sized actions and a usable non-WebGL path.

## PWA installation

- iPhone/iPad: Safari Share → **Add to Home Screen**.
- Android: use the browser’s **Install app** action; a native prompt appears in Aurora Live when supported.
- Chrome/Edge desktop: select Install in the address bar or browser menu.

Production must be served over HTTPS for service workers and installability. The service worker uses network-first navigation/assets with a cached shell fallback. IndexedDB independently retains validated NOAA data.

## Deployment

The app is static and deployment-ready. `netlify.toml` includes the production build, output directory, safe permissions and a no-cache service-worker header.

Netlify:

```bash
netlify deploy --build --prod
```

Vercel: import this directory, use `pnpm build`, and publish `dist`. Cloudflare Pages: use the same command/output. GitHub Pages works with the relative Vite base; publish `dist` from an Actions workflow. No environment variables are required.

After deployment, verify NOAA requests in the production browser, installability, offline reload, and the cached/stale labels. Generate a QR code from the final HTTPS URL only after that URL exists.

## Assets and attribution

- Space-weather data and OVATION forecast: NOAA SWPC, U.S. Government data.
- Earth texture: NASA Visible Earth / Blue Marble, public-domain U.S. Government imagery; bundled locally so rendering does not depend on a hotlink.
- Aurora Live wordmark and icons: original SVG/CSS artwork created for this project.
- Stars, atmosphere, twilight guides and aurora rendering: procedural Three.js artwork.

## Troubleshooting and known limitations

- **Unavailable:** NOAA could not be reached and no valid cache exists. Retry or use the clearly labeled fictional demo.
- **Stale:** data is older than the freshness window; it remains visible for context, not as current information.
- **No globe:** WebGL initialization failed. Conditions, location assessment, source links and 2D forecast summary remain available.
- **Location denied:** enter latitude/longitude or choose a preset. Place-name geocoding is intentionally omitted to avoid an extra service and privacy policy.
- **Install not offered:** use platform instructions; private browsing, HTTP and some embedded browsers do not permit installation.
- Forecast history is limited to recent official Kp/wind products. Aurora snapshots are not accumulated or presented as a complete NOAA archive.
