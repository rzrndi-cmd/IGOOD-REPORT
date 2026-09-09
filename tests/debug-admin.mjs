import { openIgoodPage, closeIgoodPage } from './igood-test-utils.mjs';

async function run() {
  const { browser, page } = await openIgoodPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.error('PAGE ERROR:', err));

  try {
    await page.evaluate(() => {
      console.log('Testing click listener on btnHomeAdmin:');
      const btn = document.getElementById('btnHomeAdmin');
      console.log('btnHomeAdmin element:', Boolean(btn));
      btn.click();
    });

    await page.waitForTimeout(500);

    const modalState = await page.evaluate(() => {
      const modal = document.getElementById('adminPinModal');
      return {
        className: modal?.className,
        styleDisplay: modal ? window.getComputedStyle(modal).display : null,
        currentMode: window.currentMode
      };
    });
    console.log('Modal State after evaluate click:', modalState);
  } finally {
    await closeIgoodPage(browser);
  }
}

run().catch(console.error);
