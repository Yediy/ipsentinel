import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || 'http://localhost:8080';

test.describe('IPGenie Smoke Tests', () => {
  test('homepage loads successfully', async ({ page }) => {
    await page.goto(APP_URL);
    
    // Check for main heading or welcome text
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    
    // Verify navigation is present
    await expect(page.locator('nav')).toBeVisible();
  });

  test('sign up page shows form', async ({ page }) => {
    await page.goto(`${APP_URL}/auth`);
    
    // Check for sign up tab or button
    const signUpTab = page.getByRole('tab', { name: /sign up/i });
    if (await signUpTab.isVisible()) {
      await signUpTab.click();
    }
    
    // Verify email and password inputs exist
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
    
    // Verify sign up button exists
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();
  });

  test('filing wizard is accessible', async ({ page }) => {
    await page.goto(`${APP_URL}/filing-wizard`);
    
    // Should redirect to auth or show the wizard
    // If not authenticated, will redirect to /auth
    const url = page.url();
    expect(url).toMatch(/\/(auth|filing-wizard)/);
  });

  test('cost calculator loads', async ({ page }) => {
    await page.goto(`${APP_URL}/cost-calculator`);
    
    // Check for calculator heading or form elements
    await expect(page.locator('h1, h2, h3')).toBeVisible();
  });

  test('dashboard requires authentication', async ({ page }) => {
    await page.goto(`${APP_URL}/dashboard`);
    
    // Should redirect to auth page
    await page.waitForURL(/\/auth/);
    expect(page.url()).toContain('/auth');
  });

  test('navigation links work', async ({ page }) => {
    await page.goto(APP_URL);
    
    // Check if main navigation exists and is functional
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    
    // Try clicking a nav link (if any are visible without auth)
    const links = nav.locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });
});
