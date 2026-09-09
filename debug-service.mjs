import { openIgoodPage, closeIgoodPage, seedLocalStorage } from './tests/igood-test-utils.mjs';
async function run() {
  const { browser, page } = await openIgoodPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await seedLocalStorage(page, {
    igood_service_orders: [{
      code: 'SV-0001', dateIn: '2026-06-08', buyerName: 'Budi', buyerWa: '08123456789',
      itemName: 'iPhone 13', complaint: 'LCD blank', status: 'Masuk',
      paymentStatus: 'Belum dibayar', paidAmount: 0, createdAt: '2026-06-08T09:00:00Z'
    }]
  });
  await page.evaluate(() => localStorage.setItem('igood_mode', 'admin'));
  await page.reload({ waitUntil: 'networkidle' });
  console.log('Active page:', await page.evaluate(() => document.querySelector('.page-content.active')?.id));
  await page.click('[data-tab="page-admin"]');
  console.log('Active page after admin click:', await page.evaluate(() => document.querySelector('.page-content.active')?.id));
  
  const kelolaTabs = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-panel="admin-group-kelola-servis"]')];
    return els.map(e => ({ id: e.id, className: e.className, visible: e.offsetParent !== null }));
  });
  console.log('kelola-servis tabs:', JSON.stringify(kelolaTabs));
  
  if (kelolaTabs.length > 0) {
    await page.click('[data-panel="admin-group-kelola-servis"]');
    console.log('Clicked kelola-servis');
  }
  
  const serviceFilters = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-sidebar-service-filter]')];
    return els.map(e => ({
      filter: e.dataset.sidebarServiceFilter,
      visible: e.offsetParent !== null,
      className: e.className
    }));
  });
  console.log('service-filter buttons:', JSON.stringify(serviceFilters));
  
  await closeIgoodPage(browser);
}
run().catch(console.error);
