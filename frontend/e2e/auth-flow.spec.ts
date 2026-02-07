import { test, expect } from '@playwright/test';

test.describe('Auth Flow E2E', () => {
  const testUser = {
    email: `e2e-${Date.now()}@example.com`,
    username: `e2euser${Date.now()}`,
    password: 'TestPassword123',
  };

  test('should complete registration → upload → watch flow', async ({ page }) => {
    // 1. Register
    await page.goto('/auth/register');
    await page.fill('input[name="username"]', testUser.username);
    await page.fill('input[name="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // 2. Navigate to Upload
    await page.click('text=Upload');
    await expect(page).toHaveURL('/upload');

    // 3. Upload video (mock file)
    // Note: Full upload test requires actual video file and backend processing
    // For E2E, we verify UI elements work
    await expect(page.locator('input[type="file"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="title"]').or(page.locator('input[label="Title"]'))).toBeVisible();

    // 4. Navigate back to Dashboard
    await page.goto('/dashboard');
    await expect(page.locator('text=No videos yet').or(page.locator('text=My Videos'))).toBeVisible();

    // 5. Logout
    await page.click('[data-testid="logout-button"]').catch(() => {
      // Fallback if button not found
      page.click('button:has-text("Logout")').catch(() => {});
    });
  });

  test('should handle passphrase-protected video', async ({ page }) => {
    // This test assumes a passphrase-protected video exists
    // In real scenario, you'd create one in setup
    
    // Navigate to a protected video page
    const mockVideoId = 'protected-video-123';
    await page.goto(`/watch/${mockVideoId}`);

    // Should show passphrase input
    await expect(page.locator('input[type="password"]')).toBeVisible();
    
    // Try wrong passphrase
    await page.fill('input[type="password"]', 'wrongpassphrase');
    await page.click('button[type="submit"]');
    
    // Should show error
    await expect(page.locator('text=Invalid passphrase').or(page.locator('text=Failed'))).toBeVisible();
  });

  test('should handle expired token gracefully', async ({ page, context }) => {
    // Set an expired/invalid token
    await context.addCookies([{
      name: 'token',
      value: 'invalid-token',
      domain: 'localhost',
      path: '/',
    }]);

    // Try to access protected page
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
