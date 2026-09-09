import { chromium } from 'playwright';

async function testServiceKeluarModalEdit() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 470, height: 800 } });

  await page.goto('http://localhost:3000/', { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  // Setup sample completed service order
  await page.evaluate(() => {
    save(DB_KEYS.technicians, [
      { name: 'PRAS', createdAt: new Date().toISOString() },
      { name: 'Budi', createdAt: new Date().toISOString() }
    ]);

    const sampleOrder = {
      code: 'SRV-TEST-001',
      buyerName: 'Ahmad Pelanggan',
      buyerWa: '081234567890',
      itemName: 'iPhone 11 Pro',
      complaint: 'Ganti LCD & Baterai',
      technician: 'PRAS',
      status: 'Selesai',
      paymentStatus: 'Dibayar',
      paidAmount: 850000,
      paidDate: today(),
      dateIn: today(),
      sparepartCost: 0,
      serviceFee: 0,
      technicianCost: 0,
      paymentMethod: 'cash',
      shift: 'shift pagi',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    saveServiceOrders([sampleOrder]);
    upsertServiceTransaction(sampleOrder);

    switchPage('page-admin');
    activeServiceOrderFilter = 'keluar';
    renderServiceOrders();
  });
  await page.waitForTimeout(600);

  // Click on the accordion card to expand it
  await page.click('#service-card-SRV-TEST-001 .stock-card-header');
  await page.waitForTimeout(400);

  // Fill in Sparepart Cost and Service Fee
  await page.fill('#serviceKeluarPartCost-SRV-TEST-001', '350000');
  await page.fill('#serviceKeluarServiceFee-SRV-TEST-001', '100000');
  await page.selectOption('#serviceKeluarTech-SRV-TEST-001', 'Budi');
  await page.waitForTimeout(300);

  // Check live total modal
  const totalModalText = await page.textContent('#serviceKeluarTotalModal-SRV-TEST-001');
  console.log('Live Total Modal Text:', totalModalText);

  // Click Simpan Modal
  await page.click('#service-card-SRV-TEST-001 button[title="Simpan Perubahan Modal"]');
  await page.waitForTimeout(500);

  // Verify stored values
  const verification = await page.evaluate(() => {
    const orders = loadServiceOrders();
    const order = orders.find(o => o.code === 'SRV-TEST-001');
    const transactions = loadTransactions();
    const tx = transactions.find(t => t.code === 'SRV-TEST-001');

    return {
      orderSparepart: order.sparepartCost,
      orderFee: order.serviceFee,
      orderTotalCost: order.technicianCost,
      orderTech: order.technician,
      txCost: tx.cost,
      txFee: tx.fee,
      txSparepart: tx.sparepartCost,
      txServiceFee: tx.serviceFee,
      txTech: tx.technician
    };
  });

  console.log('Verification Result:', JSON.stringify(verification, null, 2));

  // Expand again to take screenshot
  await page.click('#service-card-SRV-TEST-001 .stock-card-header');
  await page.waitForTimeout(300);
  await page.screenshot({ path: 'C:/Users/DilanAlma/.gemini/antigravity-ide/brain/c2f3da6a-ca8c-4f7c-ad0f-1870c12e7f39/verified_service_keluar_modal_edit.png' });

  await browser.close();
}

testServiceKeluarModalEdit().catch(console.error);
