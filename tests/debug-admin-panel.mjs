import { openIgoodPage, closeIgoodPage } from './igood-test-utils.mjs';

async function run() {
  const { browser, page } = await openIgoodPage();
  try {
    await page.click('#btnHomeAdmin');
    await page.waitForSelector('#adminPinModal.open', { timeout: 1500 });
    await page.fill('#adminPinInput', 'igoodrame');
    await page.click('#btnVerifyAdminAuth');
    await page.waitForSelector('#page-admin.active', { timeout: 1500 });

    await page.click('.admin-tab[data-panel="admin-employees"]');
    await page.waitForTimeout(300);

    const result = await page.evaluate(() => {
      const el = document.getElementById('admin-employees');
      const p = el?.parentElement;
      return {
        parentId: p?.id,
        parentTag: p?.tagName,
        parentClasses: p?.className,
        parentDisplay: p ? window.getComputedStyle(p).display : null,
        grandParentId: p?.parentElement?.id,
        grandParentClasses: p?.parentElement?.className,
        grandParentDisplay: p?.parentElement ? window.getComputedStyle(p.parentElement).display : null,
      };
    });
    console.log('Parent Info:', result);
  } finally {
    await closeIgoodPage(browser);
  }
}

run().catch(console.error);
