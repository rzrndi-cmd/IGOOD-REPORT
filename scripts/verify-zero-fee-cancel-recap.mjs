import { openIgoodPage, closeIgoodPage, stopIgoodTestServer } from '../tests/igood-test-utils.mjs';
import { strict as assert } from 'assert';

async function run() {
  const { browser, page } = await openIgoodPage();
  await page.evaluate(() => {
    localStorage.setItem('igood_mode', 'admin');
    localStorage.setItem('igood_service_orders', JSON.stringify([
      {
        id: 'SRV-TEST-CANCEL-01',
        code: 'SRV-2026-C01',
        dateIn: '2026-08-10',
        cancelDate: '2026-08-25',
        buyerName: 'Pak Wahyu',
        buyerWa: '081234567890',
        itemName: 'Samsung A52',
        complaint: 'Mati Total (IC Rusak Parah)',
        technician: 'Agus Teknisi',
        status: 'Cancel',
        paymentStatus: 'Cancel tanpa biaya',
        paidAmount: 0,
        cancelAmount: 0,
        sparepartCost: 50000,
        serviceFee: 0,
        technicianCost: 50000,
        createdAt: '2026-08-10T10:00:00Z',
        updatedAt: '2026-08-25T15:00:00Z'
      },
      {
        id: 'SRV-TEST-CANCEL-02',
        code: 'SRV-2026-C02',
        dateIn: '2026-08-12',
        cancelDate: '2026-08-28',
        buyerName: 'Ibu Ratna',
        buyerWa: '081299998888',
        itemName: 'iPhone 11',
        complaint: 'Ganti Kamera (Batal karena mahal)',
        technician: 'Budi Teknisi',
        status: 'Cancel',
        paymentStatus: 'Cancel tanpa biaya',
        paidAmount: 0,
        cancelAmount: 0,
        sparepartCost: 0,
        serviceFee: 0,
        technicianCost: 0,
        createdAt: '2026-08-12T10:00:00Z',
        updatedAt: '2026-08-28T16:00:00Z'
      }
    ]));
  });

  await page.reload({ waitUntil: 'networkidle' });

  // Open Admin Center -> Rekap Penjualan
  await page.evaluate(() => window.switchPage('page-admin'));
  await page.click('.admin-tab[data-panel="admin-sales-recap"]');
  await page.waitForTimeout(500);

  // Set month to 2026-08 via #recapMonthPicker
  await page.fill('#recapMonthPicker', '2026-08');
  await page.dispatchEvent('#recapMonthPicker', 'change');
  await page.waitForTimeout(300);

  // Click Jasa Servis category card
  await page.click('.recap-cat-card[data-recap-cat="services"]');
  await page.waitForTimeout(500);

  // Check data from getSalesRecapData()
  const recapData = await page.evaluate(() => window.getSalesRecapData());
  console.log('Recap serviceList count:', recapData.serviceList.length);
  assert(recapData.serviceList.length === 2, 'Expected 2 cancelled services in recap');

  const srv1 = recapData.serviceList.find(s => s.code === 'SRV-2026-C01');
  assert(srv1, 'SRV-2026-C01 should exist in recap');
  assert(srv1.fee === 0, 'SRV-2026-C01 fee should be 0');
  assert(srv1.status === 'Cancel', 'SRV-2026-C01 status should be Cancel');
  assert(srv1.sparepartCost === 50000, 'SRV-2026-C01 sparepartCost should be 50000');
  assert(srv1.profit === -50000, 'SRV-2026-C01 profit should be -50000 (cost incurred)');

  const srv2 = recapData.serviceList.find(s => s.code === 'SRV-2026-C02');
  assert(srv2, 'SRV-2026-C02 should exist in recap');
  assert(srv2.fee === 0, 'SRV-2026-C02 fee should be 0');
  assert(srv2.status === 'Cancel', 'SRV-2026-C02 status should be Cancel');
  assert(srv2.cost === 0, 'SRV-2026-C02 cost should be 0');
  assert(srv2.profit === 0, 'SRV-2026-C02 profit should be 0');

  // Verify rendering on the page
  const pageText = await page.textContent('#recapListServices');
  console.log('recapListServices contains SRV-2026-C01:', pageText.includes('SRV-2026-C01'));
  console.log('recapListServices contains SRV-2026-C02:', pageText.includes('SRV-2026-C02'));
  assert(pageText.includes('SRV-2026-C01'), 'Page should render SRV-2026-C01');
  assert(pageText.includes('SRV-2026-C02'), 'Page should render SRV-2026-C02');

  // Click row to open modal
  await page.click('.recap-item-row:has-text("SRV-2026-C01")');
  await page.waitForTimeout(300);

  const modalTitle = await page.textContent('#modalRecapDetailTitle');
  const modalFinancial = await page.textContent('#modalRecapDetailFinancialContent');
  console.log('Modal title:', modalTitle);
  console.log('Modal financial:', modalFinancial);

  assert(modalTitle.includes('Samsung A52'), 'Modal title should show Samsung A52');
  assert(modalFinancial.includes('Rp 0'), 'Modal should show Total Bayar Rp 0');
  assert(modalFinancial.includes('50.000'), 'Modal should show Modal Sparepart 50.000');

  await page.screenshot({ path: 'verified_zero_fee_cancel_modal.png' });
  console.log('Screenshot saved: verified_zero_fee_cancel_modal.png');

  await closeIgoodPage(browser);
  await stopIgoodTestServer();
  console.log('Zero-fee service cancel verification SUCCESS!');
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
