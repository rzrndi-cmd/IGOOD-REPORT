import { openIgoodPage, closeIgoodPage, seedLocalStorage } from '../tests/igood-test-utils.mjs';
import assert from 'assert';

async function run() {
  const { browser, page } = await openIgoodPage();
  try {
    // Seed sample data:
    // - iPhone 18 Pro in stock (Cost: 10.000.000, Sell: 15.000.000)
    // - Sold via Tukar Tambah with trade-in phone value: 10.000.000
    // - Net cash received: 5.000.000
    await page.evaluate(() => {
      localStorage.setItem('igood_mode', 'admin');
    });

    await seedLocalStorage(page, {
      igood_device_stock: [
        {
          code: 'PINTX-2911',
          category: 'iphone',
          brand: 'Apple',
          model: 'iPhone 18 Pro',
          storage: '256GB',
          color: 'Desert Titanium',
          condition: 'Bekas',
          warranty: 'INT',
          imei: '359999999999999',
          cost: 10000000,
          sell: 15000000,
          status: 'Sold',
          purchaseDate: '2026-08-01',
          acquisition: 'PB',
          createdAt: '2026-08-01T00:00:00Z'
        },
        {
          code: 'PINTX-9988',
          category: 'iphone',
          brand: 'Apple',
          model: 'iPhone 18 Pro Max',
          storage: '128GB',
          color: 'Natural Titanium',
          condition: 'Bekas',
          warranty: 'INT',
          imei: '358888888888888',
          cost: 10000000,
          sell: 0,
          status: 'Available',
          purchaseDate: '2026-08-30',
          acquisition: 'TT',
          createdAt: '2026-08-30T10:00:00Z'
        }
      ],
      igood_transactions: [
        {
          id: 'TRX-TT-01',
          date: '2026-08-30',
          shift: 'Pagi',
          category: 'tukar_tambah',
          code: 'PINTX-2911',
          stockRefCode: 'PINTX-2911',
          itemName: 'Apple - iPhone 18 Pro - 256GB - Warna: Desert Titanium - Ex-Inter (TT: Apple iPhone 18 Pro Max 128GB)',
          storage: '256GB',
          color: 'Desert Titanium',
          condition: 'Bekas',
          warranty: 'INT',
          imei: '359999999999999',
          cost: 10000000,
          newUnitSellPrice: 15000000,
          tradeInCost: 10000000,
          tradeInBrand: 'Apple',
          tradeInModel: 'iPhone 18 Pro Max',
          tradeInStorage: '128GB',
          tradeInColor: 'Natural Titanium',
          tradeInCondition: 'Bekas',
          tradeInWarranty: 'INT',
          tradeInImei: '358888888888888',
          tradeInCode: 'PINTX-9988',
          sell: 5000000, // Net cash received
          bonusAccessories: [],
          bonusCost: 0,
          paymentMethod: 'transfer',
          buyerName: 'Budi Santoso',
          buyerWa: '081234567890',
          buyerPhone: '081234567890',
          salesName: 'Admin',
          createdAt: '2026-08-30T10:00:00Z'
        }
      ]
    });

    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // 1. TEST: Pusat Rekap Penjualan (Admin > Rekap Penjualan > Unit Sales)
    console.log('--- TEST 1: Rekap Penjualan Center ---');
    await page.evaluate(() => window.switchPage('page-admin'));
    await page.click('.admin-tab[data-panel="admin-sales-recap"]');
    await page.waitForTimeout(500);

    // Open modal detail for TRX-TT-01
    await page.evaluate(() => {
      window.openRecapDetailModal('unit', 'TRX-TT-01', '2026-08');
    });
    await page.waitForTimeout(500);

    // Read financial content inside detail modal
    const finHtml = await page.evaluate(() => document.getElementById('modalRecapDetailFinancialContent')?.innerText || '');
    console.log('Modal Financial Content:\n', finHtml);

    assert(finHtml.includes('Rp 15.000.000'), 'Harga Jual Unit should be Rp 15.000.000');
    assert(finHtml.includes('Rp 10.000.000'), 'Modal HPP Unit should be Rp 10.000.000');
    assert(finHtml.includes('Rp 5.000.000'), 'Laba Riil should be positive Rp 5.000.000');
    assert(!finHtml.includes('Rp -5.000.000'), 'Laba Riil must NOT be minus!');

    await page.evaluate(() => window.closeRecapDetailModal());
    await page.waitForTimeout(300);

    // 2. TEST: Dashboard Metrics
    console.log('--- TEST 2: Dashboard Metrics ---');
    await page.evaluate(() => {
      window.switchPage('page-daily-report');
      if (window.refreshDashboard) window.refreshDashboard();
    });
    await page.waitForTimeout(500);

    const totalRev = await page.evaluate(() => document.getElementById('metricTotalRevenue')?.textContent);
    const totalProfit = await page.evaluate(() => document.getElementById('metricTotalProfit')?.textContent);
    const totalCOGS = await page.evaluate(() => document.getElementById('metricTotalCOGS')?.textContent);

    console.log('Dashboard Revenue:', totalRev, 'COGS:', totalCOGS, 'Profit:', totalProfit);
    assert(totalRev.includes('15.000.000'), 'Dashboard Revenue should be Rp 15.000.000');
    assert(totalCOGS.includes('10.000.000'), 'Dashboard COGS should be Rp 10.000.000');
    assert(totalProfit.includes('5.000.000'), 'Dashboard Profit should be Rp 5.000.000');

    // 3. TEST: Rekap Bulanan Admin
    console.log('--- TEST 3: Rekap Bulanan Admin ---');
    await page.evaluate(() => {
      window.switchPage('page-admin');
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.toggle('active', p.id === 'admin-monthly'));
    });
    await page.fill('#monthlyDetailMonthPicker', '2026-08');
    await page.dispatchEvent('#monthlyDetailMonthPicker', 'change');
    await page.waitForTimeout(500);

    const kpiRevenue = await page.evaluate(() => document.getElementById('monthlyDetailKpiRevenue')?.textContent);
    const kpiProfit = await page.evaluate(() => document.getElementById('monthlyDetailKpiProfit')?.textContent);
    console.log('Monthly Detail Revenue:', kpiRevenue, 'Profit:', kpiProfit);

    assert(kpiRevenue.includes('15.000.000'), 'Monthly Detail Revenue should be Rp 15.000.000');
    assert(kpiProfit.includes('5.000.000'), 'Monthly Detail Profit should be Rp 5.000.000');

    // Take screenshot of detail modal
    await page.click('.admin-tab[data-panel="admin-sales-recap"]');
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      window.openRecapDetailModal('unit', 'TRX-TT-01', '2026-08');
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'verified_trade_in_profit_fixed.png' });

    console.log('ALL TRADE-IN PROFIT & RECAP TESTS PASSED SUCCESSFULLY!');
  } finally {
    await closeIgoodPage(browser);
  }
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
