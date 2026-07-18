import { expect, test } from '@playwright/test';

const aurora = { 'Observation Time': '2026-07-18T13:00:00Z', 'Forecast Time': '2026-07-18T14:00:00Z', coordinates: Array.from({ length: 200 }, (_, i) => [i % 360, i % 2 ? 70 : -70, i % 60]) };
const kp = Array.from({ length: 12 }, (_, i) => ({ time_tag: `2026-07-18T${String(i + 2).padStart(2, '0')}:00:00`, Kp: 2 + i / 10 }));
const wind = [['time_tag', 'speed', 'density', 'temperature', 'bx', 'by', 'bz', 'bt'], ['2026-07-18T13:58:00Z', 417, 5.2, 70000, 1, 2, -3.5, 5.1]];
test.beforeEach(async ({ page }) => { await page.route('https://services.swpc.noaa.gov/**', async (route) => { const url = route.request().url(); await route.fulfill({ json: url.includes('ovation') ? aurora : url.includes('k-index') ? kp : wind }); }); });

test('loads Earth, status, location assessment and controls', async ({ page }) => {
  await page.goto('/'); await expect(page.getByText('Earth’s magnetic sky')).toBeVisible(); await expect(page.getByLabel(/Interactive 3D Earth/)).toBeVisible();
  await page.getByRole('button', { name: /Could I see it/ }).click(); await page.getByLabel('Latitude').fill('64.84'); await page.getByLabel('Longitude').fill('-147.72'); await page.getByRole('button', { name: 'Check this location' }).click(); await expect(page.locator('.fact-list').getByText('Forecast intensity')).toBeVisible();
  await page.locator('nav:visible').getByRole('button', { name: /Settings/ }).click(); await page.getByText('Reduced motion').click(); await expect(page.getByRole('checkbox', { name: /Reduced motion/ })).toBeChecked(); await page.getByRole('button', { name: 'North' }).click(); await expect(page.getByRole('button', { name: 'North' })).toHaveClass(/active/);
});
test('PWA manifest and responsive navigation are accessible', async ({ page }) => { await page.goto('/'); await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', './manifest.webmanifest'); await page.locator('nav:visible').getByRole('button', { name: /Conditions/ }).click(); await expect(page.getByText('Current conditions')).toBeVisible(); });
test('shows an understandable unavailable state and demo label', async ({ page }) => { await page.unrouteAll(); await page.route('https://services.swpc.noaa.gov/**', (route) => route.abort()); await page.goto('/'); await expect(page.getByText('NOAA forecast unavailable')).toBeVisible(); await page.getByRole('button', { name: 'View fictional demo' }).click(); await expect(page.getByText('Fictional demonstration')).toBeVisible(); });
