import { test, expect } from '@playwright/test';

// A path that is not matched by any route in `app/`, so Next.js renders
// the branded `app/not-found.tsx` page.
const MISSING_ROUTE = '/this-route-does-not-exist-404-smoke';

test.describe('Custom 404 page smoke', () => {
  test('renders the branded not-found page for an unknown route', async ({ page }) => {
    const response = await page.goto(MISSING_ROUTE);

    // Unknown routes must answer with a real 404, not a soft 200.
    expect(response?.status()).toBe(404);

    // Confirm the custom copy rendered (not the Next.js default 404 shell).
    await expect(page.getByText('Error 404')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'This page could not be found.' }),
    ).toBeVisible();

    // The recovery link is present and points back to the landing page.
    const homeLink = page.getByRole('link', { name: 'Go to home' });
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAttribute('href', '/');
  });

  test('the "Go to home" link returns to the landing page', async ({ page }) => {
    await page.goto(MISSING_ROUTE);

    await page.getByRole('link', { name: 'Go to home' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Quittance').first()).toBeVisible();
  });
});
