import { test, expect } from '@playwright/test';

test.describe('Feedback page smoke', () => {
  test('renders the feedback form with the expected fields', async ({ page }) => {
    const response = await page.goto('/feedback');

    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { name: 'Feedback' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Useful' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'OK' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Confusing' })).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /I connected Freighter/i })).toBeVisible();

    const messageField = page.getByLabel('What should we improve?');
    await expect(messageField).toBeVisible();
    expect(await messageField.evaluate((element) => (element as HTMLTextAreaElement).required)).toBe(
      true,
    );

    await expect(page.getByRole('button', { name: 'Send feedback' })).toBeVisible();
  });

  test('shows validation feedback when required fields are missing', async ({ page }) => {
    await page.goto('/feedback');

    await page.getByRole('button', { name: 'Useful' }).click();

    await page.locator('form').evaluate((form) => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await expect(page.getByText('Please rate the product and leave a short note')).toBeVisible();
  });
});