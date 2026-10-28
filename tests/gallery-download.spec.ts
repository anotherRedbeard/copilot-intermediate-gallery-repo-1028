import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { mockPhotos } from '../src/lib/mock-photo-data';

test('all demo URLs resolve to available image assets', async ({ request }) => {
  for (const url of new Set(mockPhotos.map(photo => photo.url))) {
    const response = await request.get(url);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/');
    expect((await response.body()).length).toBeGreaterThan(0);
  }
});

for (const path of ['/', '/gallery']) {
  test(`keyboard download on ${path} uses the selected photo and leaves counts unchanged`, async ({ page }) => {
    await page.goto(path);
    const button = page.getByRole('button', { name: 'Download Sunset Landscape', exact: true });
    await button.focus();
    const downloadEvent = page.waitForEvent('download');
    await page.keyboard.press('Enter');
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toBe('Sunset-Landscape-1.svg');
    const file = await download.path();
    expect(await readFile(file!, 'utf8')).toContain('Sample sunset landscape');
    await expect(button).toBeEnabled();
    await expect(page.locator('.card-elevated').getByRole('alert')).toHaveCount(0);
    const card = page.locator('.card-elevated').filter({ has: button });
    await expect(card.getByText('45', { exact: true })).toBeVisible();
  });
}

test('pending state is isolated, blocks duplicates, resets after HTTP failure and permits retry', async ({ page }) => {
  await page.goto('/gallery');
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  let requests = 0;
  await page.route('**/samples/landscape.svg', async route => {
    requests++;
    await gate;
    await route.fulfill({ status: 404, body: 'missing' });
  });
  const button = page.getByRole('button', { name: 'Download Sunset Landscape', exact: true });
  await button.click();
  const pending = page.getByRole('button', { name: 'Downloading Sunset Landscape', exact: true });
  await expect(pending).toBeDisabled();
  await expect(page.getByRole('status').filter({ hasText: 'Preparing download for Sunset Landscape' })).toBeAttached();
  await expect(page.getByRole('button', { name: 'Download Portrait Study', exact: true })).toBeEnabled();
  await pending.evaluate(element => { (element as HTMLButtonElement).click(); });
  expect(requests).toBe(1);
  release();
  const alert = page.locator('.card-elevated').getByRole('alert');
  await expect(alert).toContainText('HTTP 404');
  await expect(page.getByRole('button', { name: 'Retry download for Sunset Landscape' })).toBeEnabled();
  await page.unroute('**/samples/landscape.svg');
  const downloadEvent = page.waitForEvent('download');
  await alert.getByRole('button', { name: 'Retry download', exact: true }).click();
  expect((await downloadEvent).suggestedFilename()).toBe('Sunset-Landscape-1.svg');
  await expect(alert).toHaveCount(0);
  await expect(button).toBeEnabled();
});

test('network failures show actionable CORS guidance without initiating a download', async ({ page }) => {
  await page.goto('/');
  let downloads = 0;
  page.on('download', () => downloads++);
  await page.route('**/samples/portrait.svg', route => route.abort('failed'));
  await page.getByRole('button', { name: 'Download Portrait Study', exact: true }).click();
  const alert = page.locator('.card-elevated').getByRole('alert');
  await expect(alert).toContainText('CORS');
  await expect(alert.getByRole('button', { name: 'Retry download' })).toBeVisible();
  expect(downloads).toBe(0);
});

test('download stays visible and touch accessible in mobile dark mode', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: 'dark',
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:3000/gallery');
  const button = page.getByRole('button', { name: 'Download Portrait Study', exact: true });
  await button.scrollIntoViewIfNeeded();
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  const downloadEvent = page.waitForEvent('download');
  await button.tap();
  expect((await downloadEvent).suggestedFilename()).toBe('Portrait-Study-2.svg');
  await context.close();
});
