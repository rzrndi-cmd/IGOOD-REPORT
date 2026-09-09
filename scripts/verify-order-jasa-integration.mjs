import { openIgoodPage, closeIgoodPage, seedLocalStorage } from '../tests/igood-test-utils.mjs';
import assert from 'assert';

async function run() {
  const { browser, page } = await openIgoodPage();
  try {
    await page.evaluate(() => {
      localStorage.setItem('igood_mode', 'admin');
    });

    // Seed 3 types of Order Jasa:
    // 1. Regular IMEI Unlock / Registrasi (order_jasa)
    // 2. IMEI Bea Cukai (order_jasa_beacukai)
    // 3. iCloud Service (order_jasa_icloud)
    await seedLocalStorage(page, {
      igood_transactions: [
        {
          id: 'TRX-JASA-01',
          date: '2026-08-30',
          shift: 'Pagi',
          category: 'order_jasa',
          code: 'OJ-IMEI-01',
          itemName: 'Unlock IMEI iPhone 11',
          imei: '351111111111111',
          sell: 500000,
          cost: 300000,
          paymentMethod: 'cash',
          buyerName: 'Ahmad Jasa',
          buyerWa: '081111111111',
          buyerPhone: '081111111111',
          salesName: 'Admin',
          createdAt: '2026-08-30T09:00:00Z'
        },
        {
          id: 'TRX-JASA-02',
          date: '2026-08-30',
          shift: 'Pagi',
          category: 'order_jasa_beacukai',
          code: 'OJ-BC-02',
          itemName: 'Registrasi IMEI Bea Cukai iPhone 14 Pro',
          imei: '352222222222222',
          sell: 1200000,
          cost: 800000,
          paymentMethod: 'transfer',
          buyerName: 'Bima Bea Cukai',
          buyerWa: '082222222222',
          buyerPhone: '082222222222',
          salesName: 'Admin',
          createdAt: '2026-08-30T10:00:00Z'
        },
        {
          id: 'TRX-JASA-03',
          date: '2026-08-30',
          shift: 'Malam',
          category: 'order_jasa_icloud',
          code: 'OJ-IC-03',
          itemName: 'Pembuatan / Bypass iCloud iPad Pro',
          imei: '353333333333333',
          sell: 750000,
          cost: 250000,
          paymentMethod: 'cash',
          buyerName: 'Citra iCloud',
          buyerWa: '083333333333',
          buyerPhone: '083333333333',
          salesName: 'Admin',
          createdAt: '2026-08-30T14:00:00Z'
        }
      ]
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // 1. TEST: Report Harian
    console.log('--- TEST 1: Report Harian ---');
    await page.evaluate(() => {
      window.switchPage('page-daily-report');
      const dInput = document.getElementById('dailyReportDate');
      if (dInput) dInput.value = '2026-08-30';
      const sInput = document.getElementById('dailyReportShift');
      if (sInput) sInput.value = 'all';
      if (window.renderDailyReport) window.renderDailyReport();
    });
    await page.waitForTimeout(500);

    const waText = await page.evaluate(() => document.getElementById('dailyReportWhatsappText')?.textContent || '');
    console.log('WA Report includes OJ-IMEI-01:', waText.includes('OJ-IMEI-01'));
    console.log('WA Report includes OJ-BC-02:', waText.includes('OJ-BC-02'));
    console.log('WA Report includes OJ-IC-03:', waText.includes('OJ-IC-03'));
    assert(waText.includes('OJ-IMEI-01') || waText.includes('Unlock IMEI iPhone 11'), 'WA text should include order jasa');
    assert(waText.includes('OJ-BC-02') || waText.includes('Registrasi IMEI Bea Cukai'), 'WA text should include beacukai');
    assert(waText.includes('OJ-IC-03') || waText.includes('iCloud iPad Pro'), 'WA text should include icloud');

    const txListText = await page.evaluate(() => document.getElementById('dailyReportTransactionList')?.innerText || '');
    assert(txListText.includes('Unlock IMEI iPhone 11'), 'Daily report list should show Order Jasa IMEI');
    assert(txListText.includes('Registrasi IMEI Bea Cukai iPhone 14 Pro'), 'Daily report list should show Bea Cukai');
    assert(txListText.includes('Pembuatan / Bypass iCloud iPad Pro'), 'Daily report list should show iCloud');

    // 2. TEST: Dashboard Metrics & Monthly Table
    console.log('--- TEST 2: Dashboard Metrics & Monthly Table ---');
    await page.evaluate(() => {
      if (window.refreshDashboard) window.refreshDashboard();
      if (window.renderMonthlyRecap) window.renderMonthlyRecap();
    });
    await page.waitForTimeout(500);

    const totalRev = await page.evaluate(() => document.getElementById('metricTotalRevenue')?.textContent);
    const totalProfit = await page.evaluate(() => document.getElementById('metricTotalProfit')?.textContent);
    const totalCOGS = await page.evaluate(() => document.getElementById('metricTotalCOGS')?.textContent);
    console.log('Dashboard - Total Rev:', totalRev, 'COGS:', totalCOGS, 'Profit:', totalProfit);

    // Total Rev: 500k + 1.2M + 750k = 2.450.000
    // Total COGS: 300k + 800k + 250k = 1.350.000
    // Total Profit: 2.450.000 - 1.350.000 = 1.100.000
    assert(totalRev.includes('2.450.000'), 'Dashboard revenue should be 2.450.000');
    assert(totalCOGS.includes('1.350.000'), 'Dashboard COGS should be 1.350.000');
    assert(totalProfit.includes('1.100.000'), 'Dashboard profit should be 1.100.000');

    const monthlyRecapRows = await page.evaluate(() => document.getElementById('monthlyRecapTableBody')?.innerText || '');
    assert(monthlyRecapRows.includes('Unlock IMEI iPhone 11'), 'Dashboard monthly recap table should list order jasa');
    assert(monthlyRecapRows.includes('Registrasi IMEI Bea Cukai'), 'Dashboard monthly recap table should list beacukai');
    assert(monthlyRecapRows.includes('iCloud iPad Pro'), 'Dashboard monthly recap table should list icloud');

    // 3. TEST: Pusat Rekap Penjualan (Admin > Rekap Penjualan)
    console.log('--- TEST 3: Pusat Rekap Penjualan ---');
    await page.evaluate(() => window.switchPage('page-admin'));
    await page.click('.admin-tab[data-panel="admin-sales-recap"]');
    await page.waitForTimeout(500);

    // Switch to Order Jasa tab in Rekap Penjualan
    await page.click('.recap-cat-card[data-recap-cat="order-jasa"]');
    await page.waitForTimeout(500);

    const jasaListText = await page.evaluate(() => document.getElementById('recapListOrderJasa')?.innerText || '');
    console.log('Order Jasa List in Rekap:\n', jasaListText);
    assert(jasaListText.includes('Unlock IMEI iPhone 11'), 'Rekap list should contain Unlock IMEI');
    assert(jasaListText.includes('Registrasi IMEI Bea Cukai iPhone 14 Pro'), 'Rekap list should contain Bea Cukai');
    assert(jasaListText.includes('Pembuatan / Bypass iCloud iPad Pro'), 'Rekap list should contain iCloud');

    // Open detail modal for TRX-JASA-02
    await page.evaluate(() => {
      window.openRecapDetailModal('order-jasa', 'TRX-JASA-02', '2026-08');
    });
    await page.waitForTimeout(500);

    const modalFin = await page.evaluate(() => document.getElementById('modalRecapDetailFinancialContent')?.innerText || '');
    console.log('Modal Detail Financial Content for TRX-JASA-02:\n', modalFin);
    assert(modalFin.includes('1.200.000'), 'Tarif Jasa should be Rp 1.200.000');
    assert(modalFin.includes('800.000'), 'Modal Server should be Rp 800.000');
    assert(modalFin.includes('400.000'), 'Laba Bersih should be Rp 400.000');

    await page.screenshot({ path: 'verified_order_jasa_integration.png' });
    console.log('ALL ORDER JASA INTEGRATION TESTS PASSED 100%!');
  } finally {
    await closeIgoodPage(browser);
  }
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
