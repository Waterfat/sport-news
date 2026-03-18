import { test as base } from '@playwright/test';

export const test = base.extend<{
  verifyAfterReload: (assertions: () => Promise<void>) => Promise<void>;
}>({
  verifyAfterReload: async ({ page }, use) => {
    const verify = async (assertions: () => Promise<void>) => {
      // First verify immediately after action
      await assertions();
      // Then reload and verify again
      await page.reload();
      await page.waitForLoadState('networkidle');
      await assertions();
    };
    await use(verify);
  },
});

export { expect } from '@playwright/test';
