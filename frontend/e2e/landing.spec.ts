import { test, expect } from '@playwright/test';

// The landing page only renders its primary "Create invoice" action once the
// persisted wallet store reports a connected wallet. Seed that persisted state
// so the action is testable without going through the Freighter connect flow.
const CONNECTED_WALLET_STATE = {
  state: {
    publicKey: 'G' + 'A'.repeat(55),
    balance: '0',
    connected: true,
  },
  version: 0,
};

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

  test('shows the Create invoice primary action', async ({ page }) => {
    await page.addInitScript((walletState) => {
      window.localStorage.setItem('wallet-storage', JSON.stringify(walletState));
    }, CONNECTED_WALLET_STATE);

    await page.goto('/');

    await expect(
      page.getByRole('button', { name: 'Create invoice' }),
    ).toBeVisible();
  });
});
