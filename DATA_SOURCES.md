# Aurora Live data sources

Aurora Live reads only public products from the U.S. [NOAA Space Weather Prediction Center](https://www.swpc.noaa.gov/). No API key, user account, proxy, analytics service, or private location endpoint is used.

## OVATION aurora forecast

- Endpoint: `https://services.swpc.noaa.gov/json/ovation_aurora_latest.json`
- Purpose: latest northern and southern auroral forecast grid.
- Observed response: an object containing `Observation Time`, `Forecast Time`, `Data Format`, and a `coordinates` array whose rows are `[longitude, latitude, aurora]`.
- Validation: both timestamps must parse; rows must contain finite longitude 0–360, latitude −90–90, and intensity 0–100; invalid rows are skipped; fewer than 100 valid rows rejects the entire response. Longitudes are normalized to −180–180.
- Refresh: every approximately five minutes with ±10% client jitter.
- Cache: the last fully validated normalized response is stored in IndexedDB. It is shown as cached or stale when the network fails.
- Failure: first-launch failure is labeled unavailable and offers retry or an explicitly fictional demo. Demo data is never cached or labeled current.
- Attribution: NOAA SWPC / OVATION.

## NOAA planetary K index

- Endpoint: `https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json`
- Purpose: recent three-hour planetary Kp values and trend.
- Observed response: an array of objects with `time_tag`, numeric `Kp`, `a_running`, and `station_count`.
- Validation: rows need a valid timestamp and finite Kp in the inclusive 0–9 range. Missing values are skipped. Extra fields are ignored.
- Refresh: approximately every two minutes as part of the space-weather refresh, with ±10% jitter (the source itself changes more slowly).
- Cache/failure: combined with validated solar-wind history in the `weather` IndexedDB entry; cached/stale state is explicit.
- Attribution: NOAA SWPC.

## Propagated solar wind

- Endpoint: `https://services.swpc.noaa.gov/products/geospace/propagated-solar-wind-1-hour.json`
- Purpose: recent solar-wind speed, proton density, total IMF strength Bt, and Bz.
- Observed response: a table encoded as arrays. The first row is the header: `time_tag`, `speed`, `density`, `temperature`, `bx`, `by`, `bz`, `bt`, `vx`, `vy`, `vz`, `propagated_time_tag`.
- Validation: the adapter discovers columns from the embedded header and requires `time_tag`, `speed`, `density`, `bz`, and `bt`. Each measurement must have a valid timestamp; missing numeric cells become `null`, never zero; extra columns are ignored. An empty validated result rejects the response.
- Refresh: approximately every two minutes with ±10% jitter.
- Cache/failure: last validated combined weather response in IndexedDB; stale data remains visible with a stale label.
- Attribution: NOAA SWPC.

### Endpoint discovery note

The product brief suggested `products/solar-wind/` endpoints. They returned HTTP 404 during implementation on 2026-07-18. Aurora Live therefore uses NOAA’s current `products/geospace/propagated-solar-wind-1-hour.json` table after inspecting its live schema. There is no arbitrary URL forwarding.

## Locally calculated values

Sun declination, subsolar longitude, solar elevation, civil/nautical/astronomical twilight, approximate next astronomical darkness, and Moon illumination are calculated on-device. They are not NOAA observations. Viewing guidance combines the nearest valid OVATION grid value, local light state, and forecast freshness. Cloud cover, terrain, light pollution, and local weather are not included.
