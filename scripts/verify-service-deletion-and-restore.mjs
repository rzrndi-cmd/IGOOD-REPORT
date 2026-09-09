import { openIgoodPage, closeIgoodPage, stopIgoodTestServer } from '../tests/igood-test-utils.mjs';
import { strict as assert } from 'assert';

async function run() {
  const { browser, page } = await openIgoodPage();

  await page.evaluate(() => {
    localStorage.setItem('igood_mode', 'admin');
    localStorage.setItem('igood_service_orders', JSON.stringify([
      {
        id: 'SRV-TEST-01',
        code: 'SRV-TEST-01',
        dateIn: '2026-08-10',
        processDate: '2026-08-15',
        paidDate: '2026-08-15',
        buyerName: 'Andi Selesai',
        buyerWa: '081111111',
        itemName: 'iPhone 12 Pro',
        complaint: 'Ganti Baterai',
        technician: 'Agus Teknisi',
        status: 'Selesai',
        paymentStatus: 'Dibayar',
        paidAmount: 350000,
        paymentMethod: 'cash',
        sparepartCost: 150000,
        serviceFee: 50000,
        technicianCost: 200000,
        createdAt: '2026-08-10T10:00:00Z',
        updatedAt: '2026-08-15T15:00:00Z'
      },
      {
        id: 'SRV-TEST-02',
        code: 'SRV-TEST-02',
        dateIn: '2026-08-12',
        cancelDate: '2026-08-16',
        buyerName: 'Budi Batal',
        buyerWa: '082222222',
        itemName: 'Samsung S21',
        complaint: 'Mati Total',
        technician: 'Budi Teknisi',
        status: 'Cancel',
        paymentStatus: 'Dibayar',
        paidAmount: 50000,
        cancelAmount: 50000,
        paymentMethod: 'transfer',
        sparepartCost: 0,
        serviceFee: 0,
        technicianCost: 0,
        createdAt: '2026-08-12T10:00:00Z',
        updatedAt: '2026-08-16T16:00:00Z'
      },
      {
        id: 'SRV-TEST-03',
        code: 'SRV-TEST-03',
        dateIn: '2026-08-20',
        buyerName: 'Citra Masuk',
        buyerWa: '083333333',
        itemName: 'Xiaomi Redmi Note 10',
        complaint: 'LCD Pecah',
        technician: '',
        status: 'Masuk',
        paymentStatus: 'Belum dibayar',
        paidAmount: 0,
        createdAt: '2026-08-20T10:00:00Z'
      }
    ]));

    localStorage.setItem('igood_transactions', JSON.stringify([
      {
        id: 'TRX-SRV-01',
        date: '2026-08-15',
        category: 'service',
        code: 'SRV-TEST-01',
        serviceOrderCode: 'SRV-TEST-01',
        itemName: 'Service Selesai - iPhone 12 Pro',
        buyerName: 'Andi Selesai',
        sell: 350000,
        cost: 150000,
        fee: 50000,
        paymentMethod: 'cash',
        createdAt: '2026-08-15T15:00:00Z'
      }
    ]));
  });

  page.on('dialog', async dialog => {
    console.log('Dialog auto-accepted:', dialog.message());
    await dialog.accept();
  });

  await page.reload({ waitUntil: 'networkidle' });

  // 1. TEST: Deleting service transaction in Report Harian reverts service order back to 'Masuk'
  console.log('--- TEST 1: Void service in Daily Report ---');
  await page.evaluate(() => {
    window.switchPage('page-daily-report');
    window.executeVoidTransaction('TRX-SRV-01');
  });
  await page.waitForTimeout(500);

  // Check service order status in localStorage
  const ordersAfterVoid = await page.evaluate(() => JSON.parse(localStorage.getItem('igood_service_orders') || '[]'));
  const order01 = ordersAfterVoid.find(o => o.code === 'SRV-TEST-01');
  console.log('Order 01 status after void:', order01?.status);
  console.log('Order 01 paymentStatus after void:', order01?.paymentStatus);
  assert.strictEqual(order01?.status, 'Masuk', 'Order 01 should be reverted to Masuk');
  assert.strictEqual(order01?.paymentStatus, 'Belum dibayar', 'Order 01 paymentStatus should be Belum dibayar');
  assert.strictEqual(order01?.paidAmount, 0, 'Order 01 paidAmount should be 0');

  // 2. TEST: Restore service order from Admin Service Keluar / Cancel
  console.log('--- TEST 2: Restore service order from Admin Service Cancel ---');
  await page.evaluate(() => window.switchPage('page-admin'));
  await page.click('[data-panel="admin-group-kelola-servis"]');
  await page.click('[data-sidebar-service-filter="cancel"]');
  await page.waitForTimeout(500);

  // Click restore button for SRV-TEST-02
  await page.click('#service-card-SRV-TEST-02 .stock-card-header');
  await page.waitForTimeout(300);
  await page.click('#service-card-SRV-TEST-02 button:has-text("Kembalikan ke Masuk")');
  await page.waitForTimeout(300);

  // Modal should be open
  const restoreModalOpen = await page.evaluate(() => document.getElementById('modalRestoreServiceOrder')?.classList.contains('open'));
  assert.strictEqual(restoreModalOpen, true, 'Restore modal should be open');

  // Confirm restore
  await page.click('#btnConfirmRestoreServiceOrder');
  await page.waitForTimeout(500);

  const ordersAfterRestore = await page.evaluate(() => JSON.parse(localStorage.getItem('igood_service_orders') || '[]'));
  const order02 = ordersAfterRestore.find(o => o.code === 'SRV-TEST-02');
  console.log('Order 02 status after restore:', order02?.status);
  assert.strictEqual(order02?.status, 'Masuk', 'Order 02 should be reverted to Masuk');
  assert.strictEqual(order02?.paidAmount, 0, 'Order 02 paidAmount should be 0');

  // 3. TEST: Permanent delete service order from Admin Service Masuk
  console.log('--- TEST 3: Permanently delete service order from Service Masuk ---');
  await page.click('[data-panel="admin-group-kelola-servis"]');
  await page.click('[data-sidebar-service-filter="masuk"]');
  await page.waitForTimeout(500);

  // Click delete button on SRV-TEST-03
  await page.click('#service-card-SRV-TEST-03 .stock-card-header');
  await page.waitForTimeout(300);
  await page.click('#service-card-SRV-TEST-03 button:has-text("Hapus")');
  await page.waitForTimeout(300);

  // Modal delete should be open
  const deleteModalOpen = await page.evaluate(() => document.getElementById('modalDeleteServiceOrder')?.classList.contains('open'));
  assert.strictEqual(deleteModalOpen, true, 'Delete modal should be open');

  // Confirm delete
  await page.click('#btnConfirmDeleteServiceOrder');
  await page.waitForTimeout(500);

  const ordersAfterDelete = await page.evaluate(() => JSON.parse(localStorage.getItem('igood_service_orders') || '[]'));
  const order03 = ordersAfterDelete.find(o => o.code === 'SRV-TEST-03');
  console.log('Order 03 exists after delete:', !!order03);
  assert.strictEqual(order03, undefined, 'Order 03 should be deleted completely');

  await page.screenshot({ path: 'verified_service_delete_and_restore.png' });
  console.log('Screenshot saved: verified_service_delete_and_restore.png');

  await closeIgoodPage(browser);
  await stopIgoodTestServer();
  console.log('ALL SERVICE DELETION & RESTORATION TESTS PASSED!');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
