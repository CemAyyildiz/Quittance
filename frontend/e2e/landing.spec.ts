import { test, expect } from '@playwright/test';

test.describe('Landing page smoke', () => {
  test('loads the landing page and shows the app name', async ({ page }) => {
    const response = await page.goto('/');

    // Verify the page responds with a 200 status (no server-side crash).
    expect(response?.status()).toBe(200);

    // The page title should be set (Next.js default or custom).
    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);

    // Confirm real page content rendered (not just a blank shell).
    await expect(page.getByText('Quittance').first()).toBeVisible();
  });
});
