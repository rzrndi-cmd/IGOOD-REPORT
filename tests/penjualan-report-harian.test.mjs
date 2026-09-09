import {
  assert,
  closeIgoodPage,
  openIgoodPage,
  readLocalStorage,
  seedLocalStorage,
  setSalesName,
  stopIgoodTestServer,
} from './igood-test-utils.mjs';

async function withIgoodPage(testBody) {
  const { browser, page } = await openIgoodPage();
  page.setDefaultTimeout(15000);
  page.on('dialog', async dialog => {
    try { await dialog.accept(); } catch (_) {}
  });
  try {
    await page.evaluate(() => window.switchPage('page-sales'));
    await testBody(page);
  } finally {
    await closeIgoodPage(browser);
  }
}

async function waitForLocalStorageLength(page, key, expectedLength) {
  await page.waitForFunction(([storageKey, length]) => {
    const items = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(items) && items.length === length;
  }, [key, expectedLength], { timeout: 1500 });
}

async function waitForDeviceStatus(page, code, expectedStatus) {
  await page.waitForFunction(([deviceCode, status]) => {
    const devices = JSON.parse(localStorage.getItem('igood_device_stock') || '[]');
    return devices.some((device) => device.code === deviceCode && device.status === status);
  }, [code, expectedStatus], { timeout: 1500 });
}

async function waitForAccessoryQty(page, code, expectedQty) {
  await page.waitForFunction(([accessoryCode, qty]) => {
    const accessories = JSON.parse(localStorage.getItem('igood_acc_stock') || '[]');
    return accessories.some((accessory) => accessory.code === accessoryCode && Number(accessory.qty) === qty);
  }, [code, expectedQty], { timeout: 1500 });
}

async function waitForToastIncludes(page, text) {
  await page.waitForFunction((expectedText) => {
    return document.querySelector('#toastContainer')?.textContent?.includes(expectedText);
  }, text, { timeout: 1500 });
}

async function clickVoidTransaction(page) {
  await page.evaluate(() => {
    const txs = JSON.parse(localStorage.getItem('igood_transactions') || '[]');
    if (txs.length && window.executeVoidTransaction) {
      window.executeVoidTransaction(txs[0].id);
    }
  });
}

async function closeReceiptPopup(page) {
  if (await page.locator('#receiptModal.open').count()) {
    await page.click('#btnCloseReceipt');
  }
}

async function testMainNavigationUsesSalesServiceDailyReportOnly() {
  await withIgoodPage(async (page) => {
    const navLabels = await page.$$eval('#bottomNav .nav-item', items => items.map(item => item.textContent.trim()));
    assert(JSON.stringify(navLabels) === JSON.stringify(['Penjualan', 'Service', 'Report Harian', 'ADMIN CENTER']), 'bottom nav should show Penjualan, Service, Report Harian, and ADMIN CENTER');
    assert(!navLabels.includes('Dashboard'), 'dashboard should not be a bottom nav item');

    await page.click('[data-main-nav="service"]');
    assert(await page.locator('#page-sales.active').count() === 1, 'service main nav should use the sales/service work page');
    assert(await page.locator('[data-service-sale-mode="masuk"]').count() === 1, 'service main nav should show Service Masuk');
    assert(await page.locator('[data-service-sale-mode="keluar"]').count() === 1, 'service main nav should show Service Keluar');
    assert(await page.locator('[data-service-sale-mode="cancel"]').count() === 1, 'service main nav should show Service Cancel');

    await page.click('[data-tab="page-daily-report"]');
    assert(await page.locator('#page-daily-report.active').count() === 1, 'Report Harian nav should open daily report page');

    assert(await page.locator('[data-admin-shortcut][data-tab="page-dashboard"]').count() === 0, 'dashboard header shortcut should be removed');
    assert(await page.locator('[data-admin-shortcut][data-tab="page-admin"]').count() === 0, 'admin header shortcut should be removed');
  });
}

async function testSalesFlowUsesMainMenuTilesAndCartReview() {
  await withIgoodPage(async (page) => {
    const navPosition = await page.$eval('#bottomNav', element => getComputedStyle(element).position);
    assert(navPosition !== 'fixed', 'main menu should be border tiles in content, not a fixed bottom menu bar');
    assert(await page.locator('#bottomNav.main-menu-grid').count() === 1, 'main menu should use tile grid styling');

    const mainLabels = await page.$$eval('#bottomNav .nav-item', items => items.map(item => item.textContent.trim()));
    assert(JSON.stringify(mainLabels) === JSON.stringify(['Penjualan', 'Service', 'Report Harian', 'ADMIN CENTER']), 'main menu tile labels should include ADMIN CENTER');

    assert(await page.locator('.sales-category-grid').count() === 1, 'sales item categories should use a border tile grid');
    const categoryLabels = await page.$$eval('.sales-category-grid .sale-tab', items => items.map(item => item.textContent.trim()));
    assert(JSON.stringify(categoryLabels) === JSON.stringify(['iPhone', 'Android', 'Aksesoris', 'Tukar Tambah', 'Preorder Ready', 'Pre Order', 'Order Jasa', 'Lain-lain']), 'sales category tiles should contain iPhone, Android, Aksesoris, Tukar Tambah, Preorder Ready, Pre Order, Order Jasa, and Lain-lain');
    assert(await page.locator('#saleCartItemEditor').count() === 0, 'sales page should not show item form before choosing a category');

    await page.click('[data-sale-type="accessory"]');
    assert(await page.locator('#salesItemModal.open').count() === 1, 'selected sales category should open item editor in a popup');
    assert(await page.locator('#saleCartItemEditor').count() === 1, 'selected sales category popup should contain item editor connected to cart');
    const cartHeading = await page.textContent('[data-cart-review-title]');
    assert(cartHeading.includes('Review Keranjang'), 'cart section should explicitly be a review before payment');
    assert(await page.locator('#btnSaveSale').count() === 1, 'sales flow should keep save sale action after cart review/payment');
  });
}

async function testNewMenuAndCartUseOpaqueSolidSurfaces() {
  await withIgoodPage(async (page) => {
    const assertOpaqueSurface = async (selector, label) => {
      const surface = await page.$eval(selector, (element) => {
        const style = getComputedStyle(element);
        const color = style.backgroundColor;
        const rgba = color.match(/rgba?\(([^)]+)\)/)?.[1].split(',').map(part => part.trim()) || [];
        const alpha = rgba.length === 4 ? Number(rgba[3]) : 1;
        return {
          color,
          alpha,
          backdropFilter: style.backdropFilter || 'none',
          webkitBackdropFilter: style.webkitBackdropFilter || 'none',
        };
      });
      assert(surface.color !== 'rgba(0, 0, 0, 0)', `${label} should not have transparent background`);
      assert(surface.alpha === 1, `${label} should use opaque background, got ${surface.color}`);
      assert(surface.backdropFilter === 'none' || surface.backdropFilter === '', `${label} should not use backdrop-filter`);
      assert(surface.webkitBackdropFilter === 'none' || surface.webkitBackdropFilter === '', `${label} should not use webkit backdrop-filter`);
    };

    await assertOpaqueSurface('#bottomNav .nav-item', 'main menu tile');
    await assertOpaqueSurface('#bottomNav .nav-item.active', 'active main menu tile');
    await assertOpaqueSurface('.card', 'main form card');
    await assertOpaqueSurface('.sale-tab', 'sales category tile');
    await assertOpaqueSurface('.sale-tab.active', 'active sales category tile');

    await seedLocalStorage(page, {
      igood_device_stock: [{
        code: 'IP-OPAQUE-01',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        color: 'Midnight',
        condition: 'Bekas',
        cost: 5200000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
    });
    await page.reload({ waitUntil: 'networkidle' });

    await page.click('[data-sale-type="unit_iphone"]');
    await assertOpaqueSurface('#salesItemModal .modal-box', 'sales item modal panel');
    await page.fill('#saleBuyerName', 'Opaque Buyer');
    await page.fill('#saleBuyerWa', '081234500000');
    await page.selectOption('#saleUnitCode', 'IP-OPAQUE-01');
    await page.fill('#saleSellPrice', '6800000');
    await page.click('#btnAddCartItem');

    await page.evaluate(() => {
      const cartButton = document.getElementById('btnHeaderCart');
      if (cartButton) cartButton.style.display = 'flex';
    });
    await assertOpaqueSurface('#btnHeaderCart', 'header cart button');
    await page.click('#btnHeaderCart');
    await assertOpaqueSurface('#salesCartModal .cart-drawer-box', 'cart drawer panel');
    await assertOpaqueSurface('#salesCartModalMount .mini-panel', 'cart drawer item panel');

    await page.click('#btnDrawerSelesaikanPembayaran');
    await assertOpaqueSurface('#drawerPaymentPanel', 'cart drawer payment panel');

    await page.click('#btnCloseSalesCartModal');
    await page.click('[data-main-nav="service"]');
    // Segmented tabs were removed from service page in previous step
    // await assertOpaqueSurface('.segmented-tabs', 'service segmented tabs');
    // await assertOpaqueSurface('.segmented-tab.active', 'active service segmented tab');
  });
}

async function testSalesPopupCartPaymentReceiptAndServiceUxCorrections() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_device_stock: [{
        code: 'IP-R1M-01',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        color: 'Midnight',
        condition: 'Bekas',
        cost: 5200000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-sale-type="unit_iphone"]');
    assert(await page.locator('#salesItemModal.open').count() === 1, 'iPhone item form should open in popup');
    assert(await page.locator('#salesItemModal #saleCartType').count() === 0, 'iPhone popup should not show category selector');
    assert(await page.locator('#salesItemModal #salePreorderCode').count() === 0, 'iPhone popup should not show preorder selector');
    await page.fill('#saleBuyerName', 'Budi');
    await page.fill('#saleBuyerWa', '08123456789');
    await page.selectOption('#saleUnitCode', 'IP-R1M-01');
    await page.fill('#saleSellPrice', '6800000');
    await page.click('#btnAddCartItem');
    assert(await page.locator('#salesItemModal.open').count() === 0, 'Tambah Item should close popup after adding to cart');
    assert((await page.textContent('#saleCartBody')).includes('iPhone 13'), 'Tambah Item should put item into cart');

    await page.click('[data-cart-remove]');
    assert(!(await page.textContent('#saleCartBody')).includes('iPhone 13'), 'cart remove button should delete item from cart');
    assert((await page.textContent('#saleCartCount')) === '0', 'cart count should update after remove');

    await page.selectOption('#salePaymentMethod', 'transfer');
    assert(await page.locator('#salePaidAmount').count() === 0, 'transfer payment should not show received money field');
    assert(await page.locator('#saleChangeAmount').count() === 0, 'transfer payment should not show change field');
    await page.selectOption('#salePaymentMethod', 'cash');
    assert(await page.locator('#salePaidAmount').count() === 1, 'cash payment should show received money field');
    await page.selectOption('#salePaymentMethod', 'split');
    assert(await page.locator('#salePaidAmount').count() === 1, 'split payment should show received money field');

    await page.click('[data-sale-type="unit_iphone"]');
    await page.selectOption('#saleUnitCode', 'IP-R1M-01');
    await page.fill('#saleSellPrice', '6800000');
    await page.click('#btnAddCartItem');
    await page.selectOption('#salePaymentMethod', 'cash');
    await page.click('#btnSaveSale');
    await page.waitForFunction(() => document.querySelector('#receiptModal')?.classList.contains('open'), null, { timeout: 1500 });
    const receiptButtons = await page.$$eval('#receiptModal .btn-row button', buttons => buttons.map(button => button.textContent.trim()));
    assert(JSON.stringify(receiptButtons) === JSON.stringify(['Tutup', 'Bagikan', 'Cetak']), 'receipt popup should show Tutup, Bagikan, and Cetak buttons');

    await page.click('#btnCloseReceipt');
    await page.click('[data-main-nav="service"]');
    assert(await page.locator('#page-sales.active').count() === 1, 'service main menu should open service page');
    assert(await page.locator('[data-sale-type="unit_iphone"]:visible').count() === 0, 'service page should not show sales category tiles');
    assert(await page.locator('[data-service-sale-mode="masuk"]').count() === 1, 'service page should show only service menus');
  });
}

async function testUnitIphoneCreatesDailyReport() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_device_stock: [{
        code: 'PB-IBX-I131-001',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        color: 'Midnight',
        condition: 'Bekas',
        cost: 5200000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-sale-type="unit_iphone"]');
    await page.fill('#saleBuyerName', 'Budi');
    await page.fill('#saleBuyerWa', '08123456789');
    await page.selectOption('#saleUnitCode', 'PB-IBX-I131-001');
    await page.fill('#saleSellPrice', '6800000');
    await page.click('#btnAddCartItem');
    await page.selectOption('#salePaymentMethod', 'cash');
    await page.click('#btnSaveSale');
    await waitForLocalStorageLength(page, 'igood_transactions', 1);
    await closeReceiptPopup(page);

    const transactions = await readLocalStorage(page, 'igood_transactions');
    assert(transactions.length === 1, 'one transaction should be saved');
    assert(transactions[0].buyerName === 'Budi', 'buyer name should be saved');
    assert(transactions[0].buyerWa === '08123456789', 'buyer WA should be saved');

    await page.click('[data-tab="page-daily-report"]');
    const reportText = await page.textContent('#dailyReportWhatsappText');
    assert(reportText.includes('UNIT IPHONE'), 'report should include Unit iPhone section');
    assert(reportText.includes('Budi | 08123456789'), 'report should show buyer and WA on one line');
    assert(!reportText.toLowerCase().includes('modal'), 'report should not show modal');
    assert(!reportText.toLowerCase().includes('profit'), 'report should not show profit');
  });
}

async function testSplitPaymentMustEqualSellPrice() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_device_stock: [{
        code: 'PB-IBX-I151-001',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 15',
        storage: '128GB',
        color: 'Blue',
        condition: 'New',
        cost: 500000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-sale-type="unit_iphone"]');
    await page.fill('#saleBuyerName', 'Rina');
    await page.fill('#saleBuyerWa', '082222222222');
    await page.selectOption('#saleUnitCode', 'PB-IBX-I151-001');
    await page.fill('#saleSellPrice', '1000000');
    await page.click('#btnAddCartItem');
    await page.selectOption('#salePaymentMethod', 'split');
    await page.fill('#saleSplitCash', '300000');
    await page.fill('#saleSplitTransfer', '300000');
    await page.fill('#saleSplitCredit', '0');
    await page.click('#btnSaveSale');
    await waitForToastIncludes(page, 'Split payment');
    const transactions = await readLocalStorage(page, 'igood_transactions');
    assert(transactions.length === 0, 'invalid split payment should not save a transaction');
    const toastText = await page.textContent('#toastContainer');
    assert(toastText.includes('Split payment'), 'invalid split should show an error toast');
  });
}

async function testAccessoryOversellIsRejected() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_acc_stock: [{
        code: 'A001',
        category: 'A',
        brand: 'APL',
        name: 'Adaptor 20W',
        qty: 1,
        cost: 100000,
        sell: 200000,
        createdAt: '2026-06-01T00:00:00Z',
      }],
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-sale-type="accessory"]');
    await page.fill('#saleBuyerName', 'Andi');
    await page.fill('#saleBuyerWa', '083333333333');
    await page.selectOption('#saleAccessoryCode', 'A001');
    await page.fill('#saleQuantity', '3');
    await page.click('#btnAddCartItem');
    await page.click('#btnSaveSale');
    await page.waitForTimeout(100);
    const transactions = await readLocalStorage(page, 'igood_transactions');
    const accessories = await readLocalStorage(page, 'igood_acc_stock');
    assert(transactions.length === 0, 'oversold accessory should not save a transaction');
    assert(accessories[0].qty === 1, 'stock should remain unchanged after rejected sale');
  });
}

async function testVoidTransactionRestoresStock() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_device_stock: [{
        code: 'PB-IBX-I141-001',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 14',
        storage: '128GB',
        color: 'Purple',
        condition: 'Bekas',
        cost: 7000000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-sale-type="unit_iphone"]');
    await page.fill('#saleBuyerName', 'Sari');
    await page.fill('#saleBuyerWa', '084444444444');
    await page.selectOption('#saleUnitCode', 'PB-IBX-I141-001');
    await page.fill('#saleSellPrice', '8000000');
    await page.click('#btnAddCartItem');
    await page.click('#btnSaveSale');
    await waitForLocalStorageLength(page, 'igood_transactions', 1);
    await closeReceiptPopup(page);
    await page.evaluate(() => window.switchPage('page-daily-report'));
    await clickVoidTransaction(page);
    await waitForLocalStorageLength(page, 'igood_transactions', 0);
    await waitForDeviceStatus(page, 'PB-IBX-I141-001', 'Available');
    const transactions = await readLocalStorage(page, 'igood_transactions');
    const devices = await readLocalStorage(page, 'igood_device_stock');
    assert(transactions.length === 0, 'void should remove transaction');
    assert(devices[0].status === 'Available', 'void should restore unit stock');
  });
}

async function testDeviceCodeAutoGenerationAndImeiValidation() {
  await withIgoodPage(async (page) => {
    await page.evaluate(() => {
      localStorage.setItem('igood_mode', 'admin');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-tab="page-admin"]');
    await page.click('#btnAddNewDevice');
    await page.selectOption('#stockDeviceCategory', 'iphone');
    await page.selectOption('#stockDeviceCondition', 'Bekas');
    await page.fill('#stockDeviceModel', 'iPhone 13');
    await page.selectOption('#stockDeviceStorage', '128GB');
    await page.fill('.batch-device-color', 'Midnight');
    await page.selectOption('#stockDeviceWarranty', 'IBX');
    await page.fill('#stockDeviceCost', '5200000');
    
    // Attempt submit without IMEI
    await page.click('#newDeviceStockForm button[type="submit"]');
    await waitForToastIncludes(page, 'IMEI unit baris 1 wajib diisi!');

    // Fill IMEI and verify auto-generated code field
    await page.fill('.batch-device-imei', '358888888888888');
    assert(await page.inputValue('.batch-device-code') === 'PIBXX-8888', 'code should auto-generate PIBXX-8888');

    // Submit successfully
    await page.click('#newDeviceStockForm button[type="submit"]');
    await waitForLocalStorageLength(page, 'igood_device_stock', 1);

    const devices = await readLocalStorage(page, 'igood_device_stock');
    assert(devices[0].code === 'PIBXX-8888', 'saved device code should be auto-generated PIBXX-8888');
    assert(devices[0].imei === '358888888888888', 'saved device should store IMEI');
  });
}

async function testAccessoryInputCanCalculateUnitCostFromTotalCost() {
  await withIgoodPage(async (page) => {
    await page.evaluate(() => {
      localStorage.setItem('igood_mode', 'admin');
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-tab="page-admin"]');
    await page.click('[data-panel="admin-accessories"]');
    await page.click('#btnAddNewAcc');
    await page.selectOption('#stockAccCategory', 'T');
    await page.fill('#stockAccModel', 'Tempered Glass iPhone 13');
    await page.fill('#stockAccQty', '10');
    await page.selectOption('#stockAccCostMode', 'total');
    await page.fill('#stockAccTotalCost', '500000');
    await page.fill('#stockAccSell', '100000');
    await page.click('#newAccStockForm button[type="submit"]');
    await waitForLocalStorageLength(page, 'igood_acc_stock', 1);

    const accessories = await readLocalStorage(page, 'igood_acc_stock');
    assert(accessories[0].qty === 10, 'accessory qty should be saved');
    assert(accessories[0].cost === 50000, 'unit cost should be calculated from total cost divided by qty');
    assert(accessories[0].totalCost === 500000, 'total cost should be saved for reference');
  });
}

async function testUnitSaleSavesSalesNameAndBonusAccessories() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_device_stock: [{
        code: 'IP-R1M-01',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        color: 'Midnight',
        condition: 'Bekas',
        cost: 5200000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
      igood_acc_stock: [
        { code: 'TG001', category: 'TG', brand: 'APL', name: 'Tempered Glass iPhone 13', qty: 3, cost: 50000, sell: 100000, createdAt: '2026-06-01T00:00:00Z' },
        { code: 'SC001', category: 'SC', brand: 'APL', name: 'Softcase iPhone 13', qty: 2, cost: 40000, sell: 80000, createdAt: '2026-06-01T00:00:00Z' },
      ],
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-sale-type="unit_iphone"]');
    await page.fill('#saleBuyerName', 'Budi');
    await page.fill('#saleBuyerWa', '08123456789');
    await setSalesName(page, '#saleSalesName', 'Dilan');
    await page.selectOption('#saleUnitCode', 'IP-R1M-01');
    await page.fill('#saleSellPrice', '6800000');
    await page.selectOption('#saleBonusAccessoryCode0', 'TG001');
    await page.fill('#saleBonusQuantity0', '1');
    await page.click('#btnAddBonusAccessory');
    await page.selectOption('#saleBonusAccessoryCode1', 'SC001');
    await page.fill('#saleBonusQuantity1', '1');
    await page.click('#btnAddCartItem');
    await page.click('#btnSaveSale');
    await waitForLocalStorageLength(page, 'igood_transactions', 1);
    await waitForAccessoryQty(page, 'TG001', 2);
    await waitForAccessoryQty(page, 'SC001', 1);

    const transactions = await readLocalStorage(page, 'igood_transactions');
    assert(transactions[0].salesName === 'Dilan', 'unit transaction should save sales name');
    assert(transactions[0].bonusCost === 90000, 'bonus cost should use accessory modal only');
    assert(transactions[0].bonusAccessories.length === 2, 'bonus accessories should be stored');
    assert(transactions[0].bonusAccessories[0].name === 'Tempered Glass iPhone 13', 'bonus accessory name should be stored');

    await page.evaluate(() => localStorage.setItem('igood_mode', 'admin'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-tab="page-admin"]');
    await page.click('[data-panel="admin-dashboard"]');
    assert((await page.textContent('#metricTotalCOGS')).includes('Rp 5.290.000'), 'dashboard COGS should include unit cost plus bonus accessory modal');
    assert((await page.textContent('#metricTotalProfit')).includes('Rp 1.510.000'), 'dashboard profit should subtract bonus accessory modal');

    await page.click('[data-tab="page-daily-report"]');
    const reportText = await page.textContent('#dailyReportWhatsappText');
    assert(reportText.includes('Sales: Dilan'), 'WA report should show sales name');
    assert(reportText.includes('Bonus: Tempered Glass iPhone 13 x1, Softcase iPhone 13 x1'), 'WA report should show bonus list');
    assert(!reportText.toLowerCase().includes('modal'), 'WA report should not show modal');
    assert(!reportText.toLowerCase().includes('profit'), 'WA report should not show profit');

    await clickVoidTransaction(page);
    await waitForLocalStorageLength(page, 'igood_transactions', 0);
    await waitForAccessoryQty(page, 'TG001', 3);
    await waitForAccessoryQty(page, 'SC001', 2);
  });
}

async function testBonusAccessoryRowsCanBeRemoved() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_device_stock: [{
        code: 'IP-R1M-01',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        color: 'Midnight',
        condition: 'Bekas',
        cost: 5200000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
      igood_acc_stock: [
        { code: 'TG001', category: 'TG', brand: 'APL', name: 'Tempered Glass', qty: 3, cost: 50000, sell: 100000, createdAt: '2026-06-01T00:00:00Z' },
        { code: 'SC001', category: 'SC', brand: 'APL', name: 'Softcase', qty: 2, cost: 40000, sell: 80000, createdAt: '2026-06-01T00:00:00Z' },
      ],
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-sale-type="unit_iphone"]');
    await page.click('#btnAddBonusAccessory');
    assert(await page.locator('.bonus-accessory-row').count() === 2, 'adding bonus should create a second row');
    assert(await page.locator('[data-remove-bonus-row]').count() >= 1, 'bonus rows should have remove buttons');
    await page.click('[data-remove-bonus-row="1"]');
    assert(await page.locator('.bonus-accessory-row').count() === 1, 'remove bonus should delete the selected row');
  });
}

async function testSalesFormDraftSurvivesTabSwitch() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_device_stock: [{
        code: 'IP-R1M-01',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        color: 'Midnight',
        condition: 'Bekas',
        cost: 5200000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-sale-type="unit_iphone"]');
    await page.fill('#saleBuyerName', 'Draft User');
    await page.fill('#saleBuyerWa', '081111111111');
    await page.selectOption('#saleUnitCode', 'IP-R1M-01');
    await page.fill('#saleSellPrice', '6800000');
    await page.click('#btnCloseSalesItemModal');
    await page.click('[data-tab="page-daily-report"]');
    await page.click('[data-tab="page-sales"]');
    await page.click('[data-sale-type="unit_iphone"]');
    assert(await page.inputValue('#saleBuyerName') === 'Draft User', 'buyer draft should be restored after switching menu');
    assert(await page.inputValue('#saleBuyerWa') === '081111111111', 'WA draft should be restored after switching menu');
    assert(await page.inputValue('#saleSellPrice') === '6.800.000', 'price draft should be restored after switching menu');
  });
}

async function testAdminCanEditReportAndCatalogData() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_transactions: [{
        id: 'TRX-EDIT',
        date: '2026-06-08',
        shift: 'shift pagi',
        category: 'accessory',
        code: 'TG001',
        itemName: 'Tempered Glass',
        buyerName: 'Salah',
        buyerWa: '0800000000',
        quantity: 1,
        sell: 100000,
        cost: 50000,
        paymentMethod: 'cash',
        createdAt: '2026-06-08T09:00:00Z',
      }],
      igood_device_stock: [{
        code: 'IP-R1M-01',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        color: 'Midnight',
        condition: 'Bekas',
        cost: 5200000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
      igood_acc_stock: [{ code: 'TG001', category: 'TG', brand: 'APL', name: 'Tempered Glass', qty: 3, cost: 50000, sell: 100000, createdAt: '2026-06-01T00:00:00Z' }],
      igood_service_catalog: [{ code: 'S001', name: 'Ganti LCD', cost: 300000, sell: 450000, createdAt: '2026-06-01T00:00:00Z' }],
      igood_other_catalog: [{ code: 'O001', name: 'Admin', sell: 50000, note: 'lama', createdAt: '2026-06-01T00:00:00Z' }],
    });
    await page.evaluate(() => {
      localStorage.setItem('igood_mode', 'admin');
      localStorage.setItem('igood_active_employee', JSON.stringify({ id: '1', name: 'Owner', role: 'Super Admin' }));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const answers = ['Benar', '08123456789', 'Tempered Glass Ori', '150000', 'cash', 'iPhone 13 Pro', '256GB', 'Blue', 'Bekas', '6200000', 'Available', '359999999999999', 'Tempered Clear', '5', '60000', '120000', 'Admin Baru', '75000', 'baru'];
      window.prompt = () => answers.shift();
    });
    await page.click('[data-tab="page-admin"]');
    await page.click('.admin-tab[data-panel="admin-history"]');
    assert(await page.locator('[data-edit-transaction="TRX-EDIT"]').count() === 1, 'report rows should have edit buttons');
    await page.click('[data-edit-transaction="TRX-EDIT"]');
    let transactions = await readLocalStorage(page, 'igood_transactions');
    assert(transactions[0].buyerName === 'Benar', 'admin edit should update transaction buyer');
    assert(transactions[0].sell === 150000, 'admin edit should update transaction amount');

    await page.click('.admin-tab[data-panel="admin-devices"]');
    await page.click('[data-edit-device="IP-R1M-01"]');
    const devices = await readLocalStorage(page, 'igood_device_stock');
    assert(devices[0].model === 'iPhone 13 Pro', 'admin edit should update device model');
    assert(devices[0].cost === 6200000, 'admin edit should update device cost');

    await page.click('.admin-tab[data-panel="admin-accessories"]');
    await page.selectOption('#filterAccStatus', 'all');
    await page.click('[data-edit-acc="TG001"]');
    const accessories = await readLocalStorage(page, 'igood_acc_stock');
    assert(accessories[0].name === 'Tempered Clear', 'admin edit should update accessory name');
    assert(accessories[0].qty === 5, 'admin edit should update accessory qty');

    await page.click('.admin-tab[data-panel="admin-other"]');
    await page.click('[data-edit-other="O001"]');
    const others = await readLocalStorage(page, 'igood_other_catalog');
    assert(others[0].name === 'Admin Baru', 'admin edit should update other catalog');
    assert(others[0].sell === 75000, 'admin edit should update other catalog price');
  });
}

async function testExportsUsePdfDownload() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_transactions: [{
        id: 'TRX-PDF',
        date: '2026-06-08',
        shift: 'shift pagi',
        category: 'accessory',
        code: 'TG001',
        itemName: 'Tempered Glass',
        buyerName: 'Budi',
        buyerWa: '08123456789',
        quantity: 1,
        sell: 100000,
        cost: 50000,
        paymentMethod: 'cash',
        createdAt: '2026-06-08T09:00:00Z',
      }],
    });
    await page.evaluate(() => {
      localStorage.setItem('igood_mode', 'admin');
      window.confirm = () => false;
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-tab="page-admin"]');
    await page.click('[data-panel="admin-history"]');
    assert(await page.locator('#btnExportAllReportsPdf').count() === 1, 'reports export should be PDF button');
    assert(await page.locator('#btnExportAllReportsExcel').count() === 0, 'reports export should not expose Excel button');
    await page.click('#btnExportAllReportsPdf');
    await page.fill('#pdfReportDate', '2026-06-08');
    await page.click('#btnDownloadReportPdf');
    await page.waitForFunction(() => window.__igoodLastPdfExport);
    const exported = await page.evaluate(() => window.__igoodLastPdfExport);
    assert(exported?.filename?.endsWith('.pdf'), 'PDF export should create a .pdf download');
    assert(exported?.rows === 1, 'PDF export should include report rows');
  });
}

async function testMonthlyReportsPanelOpsiAAndB() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_transactions: [{
        id: 'TRX-MONTHLY-1',
        date: '2026-06-08',
        shift: 'shift pagi',
        category: 'accessory',
        code: 'TG001',
        itemName: 'Tempered Glass',
        buyerName: 'Budi',
        buyerWa: '08123456789',
        quantity: 1,
        sell: 100000,
        cost: 50000,
        paymentMethod: 'cash',
        createdAt: '2026-06-08T09:00:00Z',
      }, {
        id: 'TRX-MONTHLY-2',
        date: '2026-06-15',
        shift: 'shift malam',
        category: 'unit_iphone',
        code: 'IP-001',
        itemName: 'iPhone 13',
        buyerName: 'Budi',
        buyerWa: '08123456789',
        quantity: 1,
        sell: 8000000,
        cost: 7000000,
        paymentMethod: 'transfer',
        createdAt: '2026-06-15T10:00:00Z',
      }],
    });
    await page.evaluate(() => {
      localStorage.setItem('igood_mode', 'admin');
      window.confirm = () => false;
    });
    await page.reload({ waitUntil: 'networkidle' });
    
    // Switch to Laporan Bulanan panel
    await page.click('[data-tab="page-admin"]');
    await page.evaluate(() => {
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.toggle('active', p.id === 'admin-monthly'));
    });
    
    // 1. Select June 2026 in the month picker
    await page.fill('#monthlyDetailMonthPicker', '2026-06');
    await page.dispatchEvent('#monthlyDetailMonthPicker', 'change');
    
    // 2. Verify KPI cards in Opsi B
    const revKpi = await page.textContent('#monthlyDetailKpiRevenue');
    const costKpi = await page.textContent('#monthlyDetailKpiCost');
    const profitKpi = await page.textContent('#monthlyDetailKpiProfit');
    const txCountKpi = await page.textContent('#monthlyDetailKpiTxCount');
    assert(revKpi.includes('Rp 8.100.000'), 'Opsi B KPI should show correct total revenue');
    assert(costKpi.includes('Rp 7.050.000'), 'Opsi B KPI should show correct total cost');
    assert(profitKpi.includes('Rp 1.050.000'), 'Opsi B KPI should show correct total profit');
    assert(txCountKpi === '2', 'Opsi B KPI should show correct transaction count');

    // 3. Verify search filter works
    await page.fill('#searchMonthlyDetail', 'iPhone 13');
    const filteredText = await page.textContent('#monthlyDetailTableBody');
    assert(filteredText.includes('iPhone 13'), 'Filtered table should display matching item');
    assert(!filteredText.includes('Tempered Glass'), 'Filtered table should hide non-matching item');
    
    // Clear search
    await page.fill('#searchMonthlyDetail', '');
    
    // 4. Test PDF export in Opsi B
    await page.click('#btnExportMonthlyPdf');
    await page.waitForFunction(() => window.__igoodLastPdfExport);
    const exported = await page.evaluate(() => window.__igoodLastPdfExport);
    assert(exported?.filename?.includes('laporan-bulanan-2026-06'), 'PDF export should create correct monthly filename');
    assert(exported?.rows === 2, 'PDF export should include all report rows');
  });
}


async function testReceiptPopupAppearsAfterSavingSalesAndService() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_device_stock: [{
        code: 'IP-R1M-01',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        color: 'Midnight',
        condition: 'Bekas',
        cost: 5200000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
      igood_acc_stock: [{ code: 'TG001', category: 'TG', brand: 'APL', name: 'Tempered Glass', qty: 8, cost: 50000, sell: 100000, createdAt: '2026-06-01T00:00:00Z' }],
      igood_other_catalog: [{ code: 'O001', name: 'Admin', sell: 50000, note: '', createdAt: '2026-06-01T00:00:00Z' }],
      igood_service_orders: [{
        code: 'SV-0001',
        dateIn: '2026-06-08',
        buyerName: 'Rudi',
        buyerWa: '085555555555',
        itemName: 'iPhone 11',
        complaint: 'LCD blank',
        technician: '',
        status: 'Masuk',
        paymentStatus: 'Belum dibayar',
        paidAmount: 0,
        paymentMethod: '',
        technicianCost: 0,
        createdAt: '2026-06-08T09:00:00Z',
      }],
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => {
      window.__printCalled = false;
      window.print = () => { window.__printCalled = true; };
    });

    await page.click('[data-sale-type="unit_iphone"]');
    await page.fill('#saleBuyerName', 'Budi');
    await page.fill('#saleBuyerWa', '08123456789');
    await setSalesName(page, '#saleSalesName', 'Dilan');
    await page.selectOption('#saleUnitCode', 'IP-R1M-01');
    await page.fill('#saleSellPrice', '6800000');
    await page.click('#btnAddCartItem');
    await page.click('#btnSaveSale');
    await page.waitForFunction(() => document.querySelector('#receiptModal')?.classList.contains('open'), null, { timeout: 1500 });
    let receiptText = await page.textContent('#receiptPreview');
    assert(receiptText.includes('STRUK TRANSAKSI'), 'unit sale should show transaction receipt popup');
    assert(receiptText.includes('IGOOD ID APPLE STORE KEBUMEN'), 'receipt should use the configured store name');
    assert(/No\. RC-\d{8}-\d{3}/.test(receiptText), 'receipt should use the generated receipt number');
    assert(receiptText.includes('Kasir : Dilan'), 'receipt should show sales name as cashier');
    assert(receiptText.includes('Total QTY : 1'), 'receipt should show total quantity');
    assert(receiptText.includes('Sub Total'), 'receipt should show subtotal row');
    assert(receiptText.includes('Bayar (Cash)'), 'receipt should show payment method like the reference');
    assert(receiptText.includes('Terima kasih telah berbelanja di toko kami'), 'receipt should show store thank-you footer');
    assert(receiptText.includes('IP-R1M-01'), 'unit receipt should show code');
    assert(receiptText.includes('Budi | 08123456789'), 'unit receipt should show buyer and WA');
    assert(receiptText.includes('Rp 6.800.000'), 'unit receipt should show total');
    assert(await page.locator('#btnPrintReceipt').count() === 1, 'receipt should have print button');
    assert(await page.locator('#btnDownloadReceiptPdf').count() === 0, 'receipt should not show PDF save button');
    await page.click('#btnPrintReceipt');
    assert(await page.evaluate(() => window.__printCalled === true), 'print receipt should call browser print');
    await page.click('#btnCloseReceipt');

    await page.click('[data-sale-type="service"]');
    await page.click('[data-service-sale-mode="masuk"]');
    await page.fill('#saleBuyerName', 'Ari');
    await page.fill('#saleBuyerWa', '086666666666');
    await page.fill('#saleServiceDevice', 'Samsung A52');
    await page.fill('#saleServiceComplaint', 'Mati total');
    await page.click('#btnSaveServiceIntake');
    await page.waitForFunction(() => document.querySelector('#receiptModal')?.classList.contains('open'), null, { timeout: 1500 });
    receiptText = await page.textContent('#receiptPreview');
    assert(receiptText.includes('STRUK SERVICE MASUK'), 'service intake should show service receipt popup');
    assert(receiptText.includes('SV-0002'), 'service intake receipt should show generated service code');
    await page.click('#btnCloseReceipt');

    await page.click('[data-service-sale-mode="keluar"]');
    await page.selectOption('#saleServiceOrderCode', 'SV-0001');
    await page.fill('#saleServicePaymentAmount', '450000');
    await page.click('#btnSaveServiceOutcome');
    await page.waitForFunction(() => document.querySelector('#receiptModal')?.classList.contains('open'), null, { timeout: 1500 });
    receiptText = await page.textContent('#receiptPreview');
    assert(receiptText.includes('STRUK SERVICE KELUAR'), 'service keluar should show receipt popup');
    assert(receiptText.includes('SV-0001'), 'service keluar receipt should show service code');
    assert(receiptText.includes('Rp 450.000'), 'service keluar receipt should show payment');
  });
}

async function testReceiptPrintUsesNativeBridgeWhenAvailable() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_device_stock: [{
        code: 'IP-R1M-01',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        color: 'Midnight',
        condition: 'Bekas',
        cost: 5200000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => {
      window.confirm = () => true;
      window.print = undefined;
      window.__nativeReceiptPrintPayload = null;
      window.Capacitor = {
        Plugins: {
          IgoodReceipt: {
            printReceipt: async (payload) => {
              window.__nativeReceiptPrintPayload = payload;
              return { ok: true };
            },
          },
        },
      };
    });

    await page.click('[data-sale-type="unit_iphone"]');
    await page.fill('#saleBuyerName', 'Budi');
    await page.fill('#saleBuyerWa', '08123456789');
    await setSalesName(page, '#saleSalesName', 'Dilan');
    await page.selectOption('#saleUnitCode', 'IP-R1M-01');
    await page.fill('#saleSellPrice', '6800000');
    await page.click('#btnAddCartItem');
    await page.click('#btnSaveSale');
    await page.waitForFunction(() => document.querySelector('#receiptModal')?.classList.contains('open'), null, { timeout: 1500 });

    assert(await page.locator('#btnDownloadReceiptPdf').count() === 0, 'receipt popup should not expose PDF button');

    await page.click('#btnPrintReceipt');
    const printPayload = await page.evaluate(() => window.__nativeReceiptPrintPayload);
    assert(printPayload?.title === 'STRUK TRANSAKSI', 'receipt print button should pass title to native bridge');
    assert(printPayload?.html?.includes('IGOOD ID APPLE STORE KEBUMEN'), 'receipt print button should pass printable receipt HTML to native bridge');
  });
}

async function testReceiptPrintUsesSelectedThermalPrinterWhenConfigured() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_device_stock: [{
        code: 'IP-R1M-01',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        color: 'Midnight',
        condition: 'Bekas',
        cost: 5200000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
      igood_thermal_printer: {
        name: 'Printer Thermal 58',
        address: '00:11:22:33:44:55',
        width: 58,
      },
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.evaluate(() => {
      window.__thermalPrintPayload = null;
      window.__nativeReceiptPrintPayload = null;
      window.Capacitor = {
        Plugins: {
          IgoodReceipt: {
            printThermalReceipt: async (payload) => {
              window.__thermalPrintPayload = payload;
              return { ok: true, printer: payload.address };
            },
            printReceipt: async (payload) => {
              window.__nativeReceiptPrintPayload = payload;
              return { ok: true };
            },
          },
        },
      };
    });

    await page.click('[data-sale-type="unit_iphone"]');
    await page.fill('#saleBuyerName', 'Budi');
    await page.fill('#saleBuyerWa', '08123456789');
    await setSalesName(page, '#saleSalesName', 'Dilan');
    await page.selectOption('#saleUnitCode', 'IP-R1M-01');
    await page.fill('#saleSellPrice', '6800000');
    await page.click('#btnAddCartItem');
    await page.click('#btnSaveSale');
    await page.waitForFunction(() => document.querySelector('#receiptModal')?.classList.contains('open'), null, { timeout: 1500 });

    await page.click('#btnPrintReceipt');
    const thermalPayload = await page.evaluate(() => window.__thermalPrintPayload);
    const printPayload = await page.evaluate(() => window.__nativeReceiptPrintPayload);
    assert(thermalPayload?.address === '00:11:22:33:44:55', 'thermal print should use saved printer address');
    assert(thermalPayload?.width === 58, 'thermal print should use saved paper width');
    assert(thermalPayload?.text?.includes('IGOOD ID APPLE STORE KEBUMEN'), 'thermal print should send receipt text');
    assert(printPayload === null, 'thermal print should not fall back to Android print dialog when direct print succeeds');
  });
}

async function testMultiItemCartSharesOneReceiptAndShowsStoreStyleReceipt() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_device_stock: [{
        code: 'IP-R1M-01',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        color: 'Midnight',
        condition: 'Bekas',
        cost: 5200000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
      igood_acc_stock: [{ code: 'TG001', category: 'TG', brand: 'APL', name: 'Tempered Glass', qty: 8, cost: 50000, sell: 100000, createdAt: '2026-06-01T00:00:00Z' }],
      igood_other_catalog: [{ code: 'O001', name: 'Admin', sell: 50000, note: '', createdAt: '2026-06-01T00:00:00Z' }],
    });
    await page.reload({ waitUntil: 'networkidle' });

    await page.click('[data-sale-type="unit_iphone"]');
    await page.fill('#saleBuyerName', 'Budi');
    await page.fill('#saleBuyerWa', '08123456789');
    await setSalesName(page, '#saleSalesName', 'Dilan');
    await page.selectOption('#saleUnitCode', 'IP-R1M-01');
    await page.fill('#saleSellPrice', '6800000');
    await page.click('#btnAddCartItem');

    await page.click('[data-sale-type="accessory"]');
    await page.selectOption('#saleAccessoryCode', 'TG001');
    await page.fill('#saleQuantity', '2');
    await page.fill('#saleSellPrice', '100000');
    await page.click('#btnAddCartItem');

    await page.click('[data-sale-type="other"]');
    await page.fill('#saleItemName', 'Admin');
    await page.fill('#saleQuantity', '1');
    await page.fill('#saleSellPrice', '50000');
    await page.click('#btnAddCartItem');

    await page.fill('#salePaidAmount', '7100000');
    await page.selectOption('#salePaymentMethod', 'cash');
    await page.click('#btnSaveSale');

    await waitForLocalStorageLength(page, 'igood_transactions', 3);
    await page.waitForFunction(() => document.querySelector('#receiptModal')?.classList.contains('open'), null, { timeout: 1500 });
    const receiptText = await page.textContent('#receiptPreview');
    assert(receiptText.includes('IGOOD ID APPLE STORE KEBUMEN'), 'store name should be shown in receipt');
    assert((receiptText.match(/kebumen/gi) || []).length === 1, 'Kebumen should appear once in receipt header');
    assert(receiptText.includes('Total QTY : 4'), 'receipt should total all item quantities');
    assert(receiptText.includes('Sub Total'), 'receipt should show subtotal row');
    assert(receiptText.includes('Bayar (Cash)'), 'receipt should show cash payment line');
    assert(receiptText.includes('Kembali'), 'receipt should show change line');

    const transactions = await readLocalStorage(page, 'igood_transactions');
    assert(transactions.length === 3, 'multi item cart should save one transaction row per item');
    assert(new Set(transactions.map(tx => tx.receiptCode)).size === 1, 'all saved rows should share one receipt code');
    assert(transactions.some(tx => tx.category === 'unit_iphone'), 'receipt should include unit item row');
    assert(transactions.some(tx => tx.category === 'accessory'), 'receipt should include accessory row');
    assert(transactions.some(tx => tx.category === 'other'), 'receipt should include other row');
  });
}

async function testPreorderDpCreatesAdminRequestAndCanBeLinkedToUnitSale() {
  await withIgoodPage(async (page) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    await seedLocalStorage(page, {
      igood_device_stock: [{
        code: 'IP-R1M-01',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        color: 'Midnight',
        condition: 'Bekas',
        cost: 5200000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
    });
    await page.reload({ waitUntil: 'networkidle' });
    // Remove any stale overlays that could intercept handleBackButton
    await page.evaluate(() => {
      document.querySelectorAll('.payment-confirm-overlay').forEach(el => el.remove());
    });
    // Navigate directly to home page
    await page.evaluate(() => window.handleBackButton());
    await page.waitForSelector('#page-home.active', { timeout: 5000 });
    await page.click('#btnHomeSales');
    await page.click('.sale-tab[data-sale-type="preorder"]');
    assert(await page.textContent('#salesItemModalMount .card-head h2') === 'Pre Order', 'preorder form title should not mention DP');
    await page.fill('#saleBuyerName', 'Budi');
    await page.fill('#saleBuyerWa', '08123456789');
    await setSalesName(page, '#preorderSalesName', 'Dilan');
    await page.fill('#preorderItemRequest', 'iPhone 13 128GB Midnight');
    await page.fill('#saleSellPrice', '1000000');
    await page.selectOption('#salePaymentMethod', 'transfer');
    await page.click('#btnSavePreorder');
    await waitForLocalStorageLength(page, 'igood_preorder_requests', 1);
    await waitForLocalStorageLength(page, 'igood_transactions', 1);
    await closeReceiptPopup(page);

    let preorders = await readLocalStorage(page, 'igood_preorder_requests');
    let transactions = await readLocalStorage(page, 'igood_transactions');
    assert(preorders[0].code === 'PO-0001', 'preorder request should generate sequential PO code');
    assert(preorders[0].status === 'Preorder', 'new preorder request should start as Preorder');
    assert(preorders[0].buyerName === 'Budi', 'preorder should save buyer name');
    assert(preorders[0].buyerWa === '08123456789', 'preorder should save buyer WA');
    assert(preorders[0].salesName === 'Dilan', 'preorder should save sales name');
    assert(preorders[0].requestedItem === 'iPhone 13 128GB Midnight', 'preorder should save requested unit');
    assert(preorders[0].dpAmount === 1000000, 'preorder should store DP amount');
    assert(transactions[0].category === 'preorder_dp', 'DP should be recorded as preorder DP transaction');
    assert(transactions[0].code === 'PO-0001', 'DP transaction should use preorder code');
    assert(transactions[0].sell === 1000000, 'DP transaction should store DP nominal');

    await page.click('[data-tab="page-daily-report"]');
    const reportText = await page.textContent('#dailyReportWhatsappText');
    assert(reportText.includes('DP PREORDER'), 'daily report should include preorder DP section');
    assert(reportText.includes('PO-0001'), 'daily report should include preorder code');
    assert(!reportText.toLowerCase().includes('modal'), 'preorder report should not show modal');
    assert(!reportText.toLowerCase().includes('profit'), 'preorder report should not show profit');

    await page.evaluate(() => localStorage.setItem('igood_mode', 'admin'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-tab="page-admin"]');
    assert(await page.locator('[data-panel="admin-preorders"]').count() === 1, 'admin should have preorder request menu');
    await page.click('[data-panel="admin-preorders"]');
    const adminText = await page.textContent('#preorderRequestsTableBody');
    assert(adminText.includes('PO-0001'), 'admin preorder table should show preorder code');
    assert(adminText.includes('Budi'), 'admin preorder table should show buyer');
    assert(adminText.includes('Preorder'), 'admin preorder table should show preorder status');
    await page.fill('#preorderCost-PO-0001', '5200000');
    await page.fill('#preorderImei-PO-0001', '351234567890123');
    await page.selectOption('#preorderStatus-PO-0001', 'Ready');
    await page.click('[data-preorder-action="save"][data-code="PO-0001"]');
    await page.waitForFunction(() => {
      const items = JSON.parse(localStorage.getItem('igood_preorder_requests') || '[]');
      return items[0]?.status === 'Ready' && items[0]?.cost === 5200000;
    }, null, { timeout: 1500 });

    await page.click('[data-tab="page-sales"]');
    await page.click('[data-sale-type="preorder_ready"]');
    await page.waitForSelector('#salesItemModalMount:has-text("PO-0001")');
    const modalText = await page.textContent('#salesItemModalMount');
    assert(modalText.includes('PO-0001'), 'preorder ready list should show PO-0001');
    assert(modalText.includes('Budi'), 'preorder ready list should show buyer Budi');
    
    // Click Proses Jual
    await page.click('.btn-process-preorder[data-code="PO-0001"]');
    
    // Verify pre-filled buyer details
    const buyerNameVal = await page.inputValue('#saleBuyerName');
    const buyerWaVal = await page.inputValue('#saleBuyerWa');
    assert(buyerNameVal === 'Budi', 'buyer name should be pre-filled to Budi');
    assert(buyerWaVal === '08123456789', 'buyer WA should be pre-filled to 08123456789');

    await page.click('#btnSaveSale');
    await waitForLocalStorageLength(page, 'igood_transactions', 2);
    await waitForDeviceStatus(page, 'IP-R1M-01', 'Sold');
    
    preorders = await readLocalStorage(page, 'igood_preorder_requests');
    transactions = await readLocalStorage(page, 'igood_transactions');
    assert(preorders[0].status === 'Done', 'preorder should be marked Done after successful checkout');
    assert(preorders[0].linkedUnitCode === 'IP-R1M-01', 'preorder should store sold unit code');
    assert(transactions[1].preorderCode === 'PO-0001', 'sale transaction should store linked preorder code');
  });
}

async function testDashboardShowsSalesPerformanceForUnitSalesOnly() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_transactions: [
        {
          id: 'TRX-U1',
          date: '2026-06-08',
          shift: 'shift pagi & malam',
          category: 'unit_iphone',
          code: 'IP-R1M-01',
          itemName: 'iPhone 13 128GB Midnight',
          buyerName: 'Budi',
          buyerWa: '08123456789',
          salesName: 'Dilan',
          quantity: 1,
          sell: 6800000,
          cost: 5200000,
          fee: 0,
          paymentMethod: 'cash',
          createdAt: '2026-06-08T09:00:00Z',
        },
        {
          id: 'TRX-U2',
          date: '2026-06-08',
          shift: 'shift pagi & malam',
          category: 'unit_android',
          code: 'AN-I1B-01',
          itemName: 'Samsung A55 128GB Black',
          buyerName: 'Rina',
          buyerWa: '082222222222',
          salesName: 'Dilan',
          quantity: 1,
          sell: 4200000,
          cost: 3500000,
          fee: 0,
          paymentMethod: 'transfer',
          createdAt: '2026-06-08T10:00:00Z',
        },
        {
          id: 'TRX-U3',
          date: '2026-06-08',
          shift: 'shift pagi & malam',
          category: 'unit_iphone',
          code: 'IP-I2W-01',
          itemName: 'iPhone 14 256GB White',
          buyerName: 'Ari',
          buyerWa: '083333333333',
          salesName: 'Sari',
          quantity: 1,
          sell: 8500000,
          cost: 7600000,
          fee: 0,
          paymentMethod: 'cash',
          createdAt: '2026-06-08T11:00:00Z',
        },
        {
          id: 'TRX-S1',
          date: '2026-06-08',
          shift: 'shift pagi & malam',
          category: 'service',
          code: 'SV-0001',
          itemName: 'Service Keluar - iPhone 11 LCD',
          buyerName: 'Rudi',
          buyerWa: '085555555555',
          salesName: 'Dilan',
          quantity: 1,
          sell: 450000,
          cost: 0,
          fee: 300000,
          paymentMethod: 'cash',
          technician: 'Teknisi A',
          createdAt: '2026-06-08T12:00:00Z',
        },
      ],
    });
    await page.evaluate(() => localStorage.setItem('igood_mode', 'admin'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-tab="page-admin"]');
    await page.click('[data-panel="admin-dashboard"]');
    await page.selectOption('#dashboardRangeFilter', 'all');

    const heading = await page.textContent('#salesPerformanceCard h3');
    const tableText = await page.textContent('#salesPerformanceTableBody');
    assert(heading.includes('Performa Sales'), 'dashboard should rename technician performance to sales performance');
    assert(tableText.includes('Dilan'), 'sales performance should include sales name');
    assert(tableText.includes('2'), 'sales performance should count two unit sales for Dilan');
    assert(tableText.includes('Sari'), 'sales performance should include second sales name');
    assert(tableText.includes('1'), 'sales performance should count one unit sale for Sari');
    assert(!tableText.includes('Teknisi A'), 'sales performance should not include service technician');
    assert(!tableText.includes('Rp'), 'sales performance should not show revenue, modal, fee, or profit');
  });
}

async function testDashboardMonthlyRecapShowsAllSalesForSelectedMonth() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_transactions: [
        {
          id: 'TRX-M1',
          date: '2026-06-01',
          shift: 'shift pagi',
          category: 'unit_iphone',
          code: 'IP-R1M-01',
          itemName: 'iPhone 13 128GB Midnight',
          buyerName: 'Budi',
          buyerWa: '08123456789',
          salesName: 'Dilan',
          quantity: 1,
          sell: 6800000,
          cost: 5200000,
          paymentMethod: 'cash',
          createdAt: '2026-06-01T09:00:00Z',
        },
        {
          id: 'TRX-M2',
          date: '2026-06-02',
          shift: 'shift malam',
          category: 'accessory',
          code: 'TG001',
          itemName: 'Tempered Glass iPhone 13',
          buyerName: 'Rina',
          buyerWa: '082222222222',
          quantity: 2,
          sell: 200000,
          cost: 100000,
          paymentMethod: 'transfer',
          createdAt: '2026-06-02T10:00:00Z',
        },
        {
          id: 'TRX-M3',
          date: '2026-06-03',
          shift: 'shift pagi & malam',
          category: 'service',
          code: 'SV-0001',
          itemName: 'Service Keluar - iPhone 11 LCD',
          buyerName: 'Rudi',
          buyerWa: '085555555555',
          quantity: 1,
          sell: 450000,
          fee: 300000,
          paymentMethod: 'cash',
          serviceStatus: 'Keluar',
          createdAt: '2026-06-03T11:00:00Z',
        },
        {
          id: 'TRX-M4',
          date: '2026-05-30',
          shift: 'shift pagi',
          category: 'other',
          code: 'OTH-001',
          itemName: 'Biaya Admin',
          buyerName: 'Ari',
          buyerWa: '083333333333',
          quantity: 1,
          sell: 50000,
          paymentMethod: 'cash',
          createdAt: '2026-05-30T09:00:00Z',
        },
      ],
    });
    await page.evaluate(() => localStorage.setItem('igood_mode', 'admin'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-tab="page-admin"]');
    await page.click('[data-panel="admin-dashboard"]');
    assert(await page.locator('#monthlyRecapMonth').count() === 1, 'dashboard should have monthly recap month picker');
    await page.fill('#monthlyRecapMonth', '2026-06');

    const heading = await page.textContent('#monthlyRecapCard h3');
    const tableText = await page.textContent('#monthlyRecapTableBody');
    const summaryText = await page.textContent('#monthlyRecapSummary');
    assert(heading.includes('Rekap Bulanan'), 'dashboard should show monthly recap menu');
    assert(tableText.includes('IP-R1M-01'), 'monthly recap should include unit sales code');
    assert(tableText.includes('TG001'), 'monthly recap should include accessory sales code');
    assert(tableText.includes('SV-0001'), 'monthly recap should include service sales code');
    assert(tableText.includes('Budi | 08123456789'), 'monthly recap should show buyer name and WA');
    assert(tableText.includes('Dilan'), 'monthly recap should show sales name when present');
    assert(!tableText.includes('OTH-001'), 'monthly recap should exclude sales from other months');
    assert(!tableText.toLowerCase().includes('modal'), 'monthly recap should not show modal columns');
    assert(!tableText.toLowerCase().includes('profit'), 'monthly recap should not show profit columns');
    assert(summaryText.includes('3 transaksi'), 'monthly recap should summarize transaction count');
    assert(summaryText.includes('Rp 7.450.000'), 'monthly recap should summarize monthly revenue');
  });
}

async function testSalesServiceMenuCompletesAndCancelsExistingServiceOrders() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_service_orders: [
        {
          code: 'SV-0001',
          dateIn: '2026-06-08',
          buyerName: 'Rudi',
          buyerWa: '085555555555',
          itemName: 'iPhone 11',
          complaint: 'LCD blank',
          technician: 'Teknisi A',
          processDate: '2026-06-09',
          status: 'Proses',
          paymentStatus: 'Belum dibayar',
          paidAmount: 0,
          paymentMethod: '',
          technicianCost: 0,
          createdAt: '2026-06-08T09:00:00Z',
        },
        {
          code: 'SV-0002',
          dateIn: '2026-06-08',
          buyerName: 'Ari',
          buyerWa: '086666666666',
          itemName: 'Samsung A52',
          complaint: 'Mati total',
          technician: '',
          status: 'Masuk',
          paymentStatus: 'Belum dibayar',
          paidAmount: 0,
          paymentMethod: '',
          technicianCost: 0,
          createdAt: '2026-06-08T10:00:00Z',
        },
      ],
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-sale-type="service"]');
    assert(await page.locator('[data-service-sale-mode="masuk"]').count() === 1, 'service sales form should have Service Masuk button');
    assert(await page.locator('[data-service-sale-mode="keluar"]').count() === 1, 'service sales form should have Service Keluar button');
    assert(await page.locator('[data-service-sale-mode="cancel"]').count() === 1, 'service sales form should have Service Cancel button');

    await page.click('[data-service-sale-mode="keluar"]');
    await page.selectOption('#saleServiceOrderCode', 'SV-0001');
    assert(await page.locator('#saleServicePaymentMethod').count() === 0, 'service outcome modal should not show payment method field');
    await page.fill('#saleServicePaymentAmount', '450000');
    await page.click('#btnSaveServiceOutcome');
    await waitForLocalStorageLength(page, 'igood_transactions', 1);
    await closeReceiptPopup(page);

    let serviceOrders = await readLocalStorage(page, 'igood_service_orders');
    let transactions = await readLocalStorage(page, 'igood_transactions');
    assert(serviceOrders.find(order => order.code === 'SV-0001')?.status === 'Selesai', 'service keluar from sales should mark order done');
    assert(transactions[0].code === 'SV-0001', 'service keluar transaction should use service code');
    assert(transactions[0].serviceStatus === 'Keluar', 'service keluar transaction should be marked Keluar');

    await page.click('[data-service-sale-mode="cancel"]');
    await page.selectOption('#saleServiceOrderCode', 'SV-0002');
    assert(await page.locator('#saleServicePaymentMethod').count() === 0, 'service cancel modal should not show payment method field');
    await page.fill('#saleServicePaymentAmount', '75000');
    await page.click('#btnSaveServiceOutcome');
    await waitForLocalStorageLength(page, 'igood_transactions', 2);
    await closeReceiptPopup(page);

    serviceOrders = await readLocalStorage(page, 'igood_service_orders');
    transactions = await readLocalStorage(page, 'igood_transactions');
    assert(serviceOrders.find(order => order.code === 'SV-0002')?.status === 'Cancel', 'service cancel from sales should mark order cancelled');
    assert(serviceOrders.find(order => order.code === 'SV-0002')?.cancelAmount === 75000, 'service cancel should store inspection fee');
    assert(transactions[1].code === 'SV-0002', 'service cancel transaction should use service code');
    assert(transactions[1].serviceStatus === 'Cancel', 'service cancel transaction should be marked Cancel');
  });
}

async function testAdminServicePanelStacksTechnicianAboveCatalog() {
  await withIgoodPage(async (page) => {
    await page.evaluate(() => localStorage.setItem('igood_mode', 'admin'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-tab="page-admin"]');
    
    // Check technician section in admin-technicians panel
    await page.click('[data-panel="admin-group-kelola-servis"]');
    await page.click('.admin-sub-tab[data-panel="admin-technicians"]');
    const technicianBox = await page.locator('#adminTechniciansSection').boundingBox();
    assert(technicianBox, 'technician section should exist in admin-technicians panel');
    
    // Verify service catalog section is removed
    await page.click('[data-panel="admin-group-kelola-servis"]');
    await page.click('[data-sidebar-service-filter="masuk"]');
    const catalogCount = await page.locator('#adminServiceCatalogSection').count();
    assert(catalogCount === 0, 'service catalog section should be completely removed from admin-services panel');
  });
}

async function testAdminServicePanelHasSeparateMenusForMasukKeluarCancel() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_service_orders: [
        {
          code: 'SV-0001',
          dateIn: '2026-06-08',
          buyerName: 'Budi',
          buyerWa: '08123456789',
          itemName: 'iPhone 13',
          complaint: 'LCD blank',
          status: 'Masuk',
          paymentStatus: 'Belum dibayar',
          paidAmount: 0,
          createdAt: '2026-06-08T09:00:00Z',
        },
        {
          code: 'SV-0002',
          dateIn: '2026-06-08',
          buyerName: 'Rina',
          buyerWa: '082222222222',
          itemName: 'Samsung A55',
          complaint: 'Ganti baterai',
          status: 'Selesai',
          paymentStatus: 'Dibayar',
          paidAmount: 450000,
          createdAt: '2026-06-08T10:00:00Z',
        },
        {
          code: 'SV-0003',
          dateIn: '2026-06-08',
          buyerName: 'Ari',
          buyerWa: '083333333333',
          itemName: 'iPhone 11',
          complaint: 'Mati total',
          status: 'Cancel',
          paymentStatus: 'Dibayar',
          paidAmount: 75000,
          createdAt: '2026-06-08T11:00:00Z',
        },
      ],
    });
    await page.evaluate(() => localStorage.setItem('igood_mode', 'admin'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-tab="page-admin"]');
    await page.click('[data-panel="admin-group-kelola-servis"]');
    await page.click('[data-sidebar-service-filter="masuk"]');

    assert(await page.locator('[data-sidebar-service-filter="masuk"]').count() >= 1, 'service panel should have Service Masuk menu');
    assert(await page.locator('[data-sidebar-service-filter="keluar"]').count() >= 1, 'service panel should have Service Keluar menu');
    assert(await page.locator('[data-sidebar-service-filter="cancel"]').count() >= 1, 'service panel should have Service Cancel menu');

    let tableText = await page.textContent('#serviceOrdersTableBody');
    assert(tableText.includes('SV-0001'), 'Service Masuk menu should show incoming service orders');
    assert(!tableText.includes('SV-0002'), 'Service Masuk menu should hide completed service orders');
    assert(!tableText.includes('SV-0003'), 'Service Masuk menu should hide cancelled service orders');

    await page.click('[data-panel="admin-group-kelola-servis"]');
    await page.click('[data-sidebar-service-filter="keluar"]');
    tableText = await page.textContent('#serviceOrdersTableBody');
    assert(tableText.includes('SV-0002'), 'Service Keluar menu should show completed service orders');
    assert(!tableText.includes('SV-0001'), 'Service Keluar menu should hide incoming service orders');
    assert(!tableText.includes('SV-0003'), 'Service Keluar menu should hide cancelled service orders');

    await page.click('[data-panel="admin-group-kelola-servis"]');
    await page.click('[data-sidebar-service-filter="cancel"]');
    tableText = await page.textContent('#serviceOrdersTableBody');
    assert(tableText.includes('SV-0003'), 'Service Cancel menu should show cancelled service orders');
    assert(!tableText.includes('SV-0001'), 'Service Cancel menu should hide incoming service orders');
    assert(!tableText.includes('SV-0002'), 'Service Cancel menu should hide completed service orders');
  });
}

async function testAdminCanSetServiceProcessDateAndTechnician() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_technicians: [{ name: 'Teknisi A', createdAt: '2026-06-01T00:00:00Z' }],
      igood_service_orders: [{
        code: 'SV-0001',
        dateIn: '2026-06-08',
        buyerName: 'Rudi',
        buyerWa: '085555555555',
        itemName: 'iPhone 11',
        complaint: 'LCD blank',
        technician: '',
        status: 'Masuk',
        paymentStatus: 'Belum dibayar',
        paidAmount: 0,
        paymentMethod: '',
        technicianCost: 0,
        createdAt: '2026-06-08T09:00:00Z',
      }],
    });
    await page.evaluate(() => localStorage.setItem('igood_mode', 'admin'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-tab="page-admin"]');
    await page.click('[data-panel="admin-group-kelola-servis"]');
    await page.click('[data-sidebar-service-filter="masuk"]');
    await page.selectOption('#serviceOrderTechnician-SV-0001', 'Teknisi A');
    await page.fill('#serviceOrderServiceFee-SV-0001', '350000');
    await page.click('[data-service-action="save-cost"][data-code="SV-0001"]');
    await page.waitForFunction(() => {
      const orders = JSON.parse(localStorage.getItem('igood_service_orders') || '[]');
      return orders[0]?.technician === 'Teknisi A' && orders[0]?.serviceFee === 350000 && orders[0]?.technicianCost === 350000;
    }, null, { timeout: 1500 });

    const serviceOrders = await readLocalStorage(page, 'igood_service_orders');
    assert(serviceOrders[0].technician === 'Teknisi A', 'admin should save assigned technician');
    assert(serviceOrders[0].serviceFee === 350000, 'admin should save technician service fee');
    assert(serviceOrders[0].technicianCost === 350000, 'admin should save total technician modal cost');
  });
}

async function testServiceIntakeCreatesOrderWithoutSalesTransaction() {
  await withIgoodPage(async (page) => {
    await page.click('[data-sale-type="service"]');
    await page.click('[data-service-sale-mode="masuk"]');
    assert(!(await page.locator('#saleTechnician').count()), 'sales service intake should not expose technician selection');
    await page.fill('#saleBuyerName', 'Rudi');
    await page.fill('#saleBuyerWa', '085555555555');
    await page.fill('#saleServiceDevice', 'iPhone 11');
    await page.fill('#saleServiceComplaint', 'LCD blank');
    await page.click('#btnSaveServiceIntake');
    await waitForLocalStorageLength(page, 'igood_service_orders', 1);

    const serviceOrders = await readLocalStorage(page, 'igood_service_orders');
    const transactions = await readLocalStorage(page, 'igood_transactions');
    assert(transactions.length === 0, 'service intake should not create daily sales transaction yet');
    assert(serviceOrders[0].code === 'SV-0001', 'service intake should create sequential service code');
    assert(serviceOrders[0].buyerName === 'Rudi', 'service intake should save buyer name');
    assert(serviceOrders[0].buyerWa === '085555555555', 'service intake should save buyer WA');
    assert(serviceOrders[0].itemName === 'iPhone 11', 'service intake should save serviced item');
    assert(serviceOrders[0].complaint === 'LCD blank', 'service intake should save complaint');
    assert(serviceOrders[0].status === 'Masuk', 'new service order should start as Masuk');
    assert(serviceOrders[0].paymentStatus === 'Belum dibayar', 'new service order should not be paid yet');
    assert(!serviceOrders[0].technician, 'technician should remain empty on sales intake');

    await closeReceiptPopup(page);
    await page.click('[data-tab="page-daily-report"]');
    const reportText = await page.textContent('#dailyReportWhatsappText');
    assert(reportText.includes('SV-0001'), 'daily report WA text should include virtual service intake code');
    assert(reportText.includes('Service Masuk - iPhone 11 - LCD blank'), 'daily report WA text should include service intake description');
    assert(reportText.includes('Status: Masuk'), 'daily report WA text should show status Masuk');
  });
}

async function testAdminCompletesServicePaymentAndLaterCost() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_technicians: [{ name: 'Teknisi A', createdAt: '2026-06-01T00:00:00Z' }],
      igood_service_orders: [{
        code: 'SV-0001',
        dateIn: '2026-06-08',
        buyerName: 'Rudi',
        buyerWa: '085555555555',
        itemName: 'iPhone 11',
        complaint: 'LCD blank',
        technician: '',
        status: 'Masuk',
        paymentStatus: 'Belum dibayar',
        paidAmount: 0,
        paymentMethod: '',
        splitCash: 0,
        splitTransfer: 0,
        splitCredit: 0,
        technicianCost: 0,
        createdAt: '2026-06-08T09:00:00Z',
      }],
    });

    // 1. Admin assigns technician, sparepart cost, and service fee in Admin Center -> Service Masuk
    await page.evaluate(() => localStorage.setItem('igood_mode', 'admin'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-tab="page-admin"]');
    await page.click('[data-panel="admin-group-kelola-servis"]');
    await page.click('[data-sidebar-service-filter="masuk"]');
    await page.selectOption('#serviceOrderTechnician-SV-0001', 'Teknisi A');
    await page.fill('#serviceOrderSparepartCost-SV-0001', '200000');
    await page.fill('#serviceOrderServiceFee-SV-0001', '100000');
    await page.click('[data-service-action="save-cost"][data-code="SV-0001"]');
    await page.waitForFunction(() => {
      const orders = JSON.parse(localStorage.getItem('igood_service_orders') || '[]');
      return orders[0]?.technician === 'Teknisi A' && orders[0]?.sparepartCost === 200000 && orders[0]?.serviceFee === 100000 && orders[0]?.technicianCost === 300000;
    }, null, { timeout: 1500 });

    // 2. Cashier completes service via Service Keluar in Sales menu
    await page.click('[data-tab="page-sales"]');
    await page.click('[data-sale-type="service"]');
    await page.click('[data-service-sale-mode="keluar"]');
    await page.selectOption('#saleServiceOrderCode', 'SV-0001');
    await page.fill('#saleServicePaymentAmount', '450000');
    await page.click('#btnSaveServiceOutcome');
    await waitForLocalStorageLength(page, 'igood_transactions', 1);
    await closeReceiptPopup(page);

    let serviceOrders = await readLocalStorage(page, 'igood_service_orders');
    let transactions = await readLocalStorage(page, 'igood_transactions');
    assert(serviceOrders[0].technician === 'Teknisi A', 'service should retain assigned technician');
    assert(serviceOrders[0].sparepartCost === 200000, 'service should retain sparepart cost');
    assert(serviceOrders[0].serviceFee === 100000, 'service should retain service fee');
    assert(serviceOrders[0].technicianCost === 300000, 'service should retain total technician modal cost');
    assert(serviceOrders[0].status === 'Selesai', 'paid service should become selesai');
    assert(serviceOrders[0].paymentStatus === 'Dibayar', 'paid service should become dibayar');
    assert(serviceOrders[0].paidAmount === 450000, 'service order should store user payment');
    assert(transactions[0].category === 'service', 'service payment should create service transaction');
    assert(transactions[0].code === 'SV-0001', 'service transaction should use the same service code');
    assert(transactions[0].sell === 450000, 'service transaction should store paid amount');
    assert(transactions[0].fee === 300000, 'service transaction profit should use assigned modal cost');
  });
}

async function testAdminCancelsServiceWithInspectionFeeCreatesRevenue() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_service_orders: [{
        code: 'SV-0002',
        dateIn: '2026-06-08',
        buyerName: 'Ari',
        buyerWa: '086666666666',
        itemName: 'Samsung A52',
        complaint: 'Mati total',
        technician: '',
        status: 'Masuk',
        paymentStatus: 'Belum dibayar',
        paidAmount: 0,
        paymentMethod: '',
        splitCash: 0,
        splitTransfer: 0,
        splitCredit: 0,
        technicianCost: 0,
        createdAt: '2026-06-08T10:00:00Z',
      }],
    });
    // Cashier cancels service with inspection fee via Service Cancel
    await page.click('[data-sale-type="service"]');
    await page.click('[data-service-sale-mode="cancel"]');
    await page.selectOption('#saleServiceOrderCode', 'SV-0002');
    await page.fill('#saleServicePaymentAmount', '75000');
    await page.click('#btnSaveServiceOutcome');
    await waitForLocalStorageLength(page, 'igood_transactions', 1);
    await closeReceiptPopup(page);

    const serviceOrders = await readLocalStorage(page, 'igood_service_orders');
    const transactions = await readLocalStorage(page, 'igood_transactions');
    assert(serviceOrders[0].status === 'Cancel', 'cancelled service should store Cancel status');
    assert(serviceOrders[0].paymentStatus === 'Dibayar', 'cancel with inspection fee should be marked paid');
    assert(serviceOrders[0].paidAmount === 75000, 'cancel inspection fee should be stored on service order');
    assert(serviceOrders[0].cancelAmount === 75000, 'cancel fee should be stored separately');
    assert(transactions[0].category === 'service', 'cancel inspection fee should create service transaction');
    assert(transactions[0].code === 'SV-0002', 'cancel transaction should use the same service code');
    assert(transactions[0].sell === 75000, 'cancel transaction should store inspection fee revenue');
    assert(transactions[0].serviceStatus === 'Cancel', 'cancel transaction should be marked as cancelled service');

    await page.click('[data-tab="page-daily-report"]');
    const reportText = await page.textContent('#dailyReportWhatsappText');
    assert(reportText.includes('SV-0002'), 'daily report should include cancelled service code when there is a fee');
    assert(reportText.includes('Status: Cancel'), 'daily report should show cancelled service status');
    assert(reportText.includes('Rp 75.000'), 'daily report should include inspection fee amount');
  });
}

async function testAdminCancelsServiceWithZeroFeeCreatesVirtualReportEntry() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_service_orders: [{
        code: 'SV-0003',
        dateIn: '2026-06-08',
        buyerName: 'Rian',
        buyerWa: '087777777777',
        itemName: 'Redmi Note 10',
        complaint: 'Ganti baterai',
        technician: '',
        status: 'Masuk',
        paymentStatus: 'Belum dibayar',
        paidAmount: 0,
        paymentMethod: '',
        splitCash: 0,
        splitTransfer: 0,
        splitCredit: 0,
        technicianCost: 0,
        createdAt: '2026-06-08T11:00:00Z',
      }],
    });
    // Cashier cancels service with zero fee via Service Cancel
    await page.click('[data-sale-type="service"]');
    await page.click('[data-service-sale-mode="cancel"]');
    await page.selectOption('#saleServiceOrderCode', 'SV-0003');
    await page.fill('#saleServicePaymentAmount', '0');
    await page.click('#btnSaveServiceOutcome');
    await closeReceiptPopup(page);

    const serviceOrders = await readLocalStorage(page, 'igood_service_orders');
    const transactions = await readLocalStorage(page, 'igood_transactions');
    assert(serviceOrders[0].status === 'Cancel', 'service should be status Cancel');
    assert(transactions.length === 0, 'zero fee cancel should NOT create a transaction record in igood_transactions');

    await page.click('[data-tab="page-daily-report"]');
    const reportText = await page.textContent('#dailyReportWhatsappText');
    assert(reportText.includes('SV-0003'), 'daily report WA text should include cancelled zero fee service code');
    assert(reportText.includes('Cancel Service - Redmi Note 10 - Ganti baterai'), 'daily report WA text should include cancellation title');
    assert(reportText.includes('Status: Cancel'), 'daily report WA text should show status Cancel');
  });
}

async function testImeiInputSavingAndPrintingReceipt() {
  await withIgoodPage(async (page) => {
    await page.evaluate(() => localStorage.setItem('igood_mode', 'admin'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-tab="page-admin"]');
    await page.click('[data-panel="admin-devices"]');

    await page.click('#btnAddNewDevice');
    await page.selectOption('#stockDeviceCategory', 'iphone');
    await page.selectOption('#stockDeviceCondition', 'New');
    await page.fill('#stockDeviceModel', 'iPhone 16 Pro');
    await page.selectOption('#stockDeviceStorage', '256GB');
    await page.fill('.batch-device-color', 'Desert Titanium');
    await page.selectOption('#stockDeviceAcquisition', 'PB');
    await page.selectOption('#stockDeviceWarranty', 'IBX');
    await page.fill('#stockDeviceCost', '18000000');
    await page.fill('.batch-device-imei', '359999999999999');
    
    await page.click('#newDeviceStockForm button[type="submit"]');

    const devices = await readLocalStorage(page, 'igood_device_stock');
    const savedDevice = devices.find(d => d.code === 'PIBXN-9999');
    assert(savedDevice, 'device with custom code should be saved');
    assert(savedDevice.imei === '359999999999999', 'device IMEI should be saved');

    await page.click('[data-main-nav="sales"]');
    await page.click('[data-sale-type="unit_iphone"]');
    await page.fill('#saleBuyerName', 'Imei Buyer');
    await page.fill('#saleBuyerWa', '089999999999');
    await page.selectOption('#saleUnitCode', 'PIBXN-9999');
    await page.fill('#saleSellPrice', '21000000');
    await page.click('#btnAddCartItem');
    await page.selectOption('#salePaymentMethod', 'cash');
    
    await page.click('#btnSaveSale');
    await waitForLocalStorageLength(page, 'igood_transactions', 1);

    const transactions = await readLocalStorage(page, 'igood_transactions');
    assert(transactions[0].imei === '359999999999999', 'transaction should copy IMEI from stock device');

    const receiptText = await page.textContent('#receiptPreview');
    assert(receiptText.includes('IMEI   : 359999999999999'), 'receipt text should print IMEI');
    await closeReceiptPopup(page);
  });
}

async function testServiceCartDeletionAndValidation() {
  await withIgoodPage(async (page) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    // Clear service orders so we can assert exactly 1 was added
    await seedLocalStorage(page, { igood_service_orders: [] });
    await page.evaluate(() => document.body.classList.remove('testing-mode'));
    // Navigate to service section and open masuk modal
    await page.click('[data-main-nav="service"]');
    await page.click('[data-service-sale-mode="masuk"]');
    await page.waitForFunction(() => document.getElementById('salesItemModal')?.classList.contains('open'), { timeout: 5000 });
    // Wait for modal content to be injected via requestAnimationFrame
    await page.waitForFunction(() => !!document.getElementById('btnSaveServiceIntake'), { timeout: 5000 });
    await page.fill('#saleBuyerName', 'Pelanggan Service');
    await page.fill('#saleBuyerWa', '081234567890');
    await page.fill('#saleServiceDevice', 'iPhone XR');
    await page.fill('#saleServiceComplaint', 'Layar retak');
    
    await page.evaluate(() => document.getElementById('btnSaveServiceIntake')?.click());

    // Wait for modal to close
    await page.waitForFunction(() => !document.getElementById('salesItemModal')?.classList.contains('open'), { timeout: 5000 });
    
    await page.click('#btnHeaderCart');
    await page.waitForFunction(() => document.getElementById('salesCartModal')?.classList.contains('open'), { timeout: 5000 });
    
    let cartCount = await page.textContent('#headerCartCount');
    assert(cartCount.trim() === '1', 'service cart should have 1 item');
    
    await page.click('[data-cart-drawer-remove]');
    
    const emptyText = await page.textContent('#salesCartModalMount p');
    assert(emptyText.includes('kosong'), 'service cart should show empty message after deletion');
    
    await page.click('#btnCloseSalesCartModal');
    await page.waitForFunction(() => !document.getElementById('salesCartModal')?.classList.contains('open'), { timeout: 5000 });
    
    // Second service intake flow
    await page.click('[data-service-sale-mode="masuk"]');
    await page.waitForFunction(() => document.getElementById('salesItemModal')?.classList.contains('open'), { timeout: 5000 });
    // Wait for modal content to be injected
    await page.waitForFunction(() => !!document.getElementById('btnSaveServiceIntake'), { timeout: 5000 });
    await page.fill('#saleBuyerName', 'Pelanggan Service');
    await page.fill('#saleBuyerWa', '081234567890');
    await page.fill('#saleServiceDevice', 'iPhone XR');
    await page.fill('#saleServiceComplaint', 'Layar retak');
    await page.evaluate(() => document.getElementById('btnSaveServiceIntake')?.click());
    await page.waitForFunction(() => !document.getElementById('salesItemModal')?.classList.contains('open'), { timeout: 5000 });
    
    await page.click('#btnHeaderCart');
    await page.waitForFunction(() => document.getElementById('salesCartModal')?.classList.contains('open'), { timeout: 5000 });
    
    // Verify cart has 1 item, then save directly via exposed function
    const cartCountBeforeCheckout = await page.textContent('#headerCartCount');
    assert(cartCountBeforeCheckout.trim() === '1', 'service cart should have 1 item before checkout');
    
    await page.evaluate(() => {
      if (typeof window.__igoodSaveCartSale === 'function') {
        window.__igoodSaveCartSale(false);
      }
    });
    
    await page.waitForFunction(() => {
      const orders = JSON.parse(localStorage.getItem('igood_service_orders') || '[]');
      return orders.some(o => o.buyerName === 'Pelanggan Service' && o.itemName === 'iPhone XR');
    }, { timeout: 3000 });
    
    const serviceOrders = await readLocalStorage(page, 'igood_service_orders');
    const matchedOrder = serviceOrders.find(o => o.buyerName === 'Pelanggan Service');
    assert(matchedOrder, 'should save service order for Pelanggan Service');
    assert(matchedOrder.itemName === 'iPhone XR', 'saved service order should have correct device name');
    assert(matchedOrder.complaint === 'Layar retak', 'saved service order should have correct complaint');
  });
}

async function testTukarTambahFlow() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_device_stock: [{
        code: 'NEW-UNIT-TT',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        color: 'Midnight',
        condition: 'New',
        cost: 10000000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
    });
    await page.reload({ waitUntil: 'networkidle' });
    
    // Choose Tukar Tambah category
    await page.click('[data-sale-type="tukar_tambah"]');
    
    // Fill out general transaction fields
    await page.fill('#saleBuyerName', 'Toni');
    await page.fill('#saleBuyerWa', '08122334455');
    
    // Fill out unit baru
    await page.selectOption('#saleUnitCode', 'NEW-UNIT-TT');
    await page.fill('#saleSellPrice', '12000000');
    
    // Go to next slide
    await page.click('#btnNextTradeInSlide');
    
    // Fill out HP lama specs
    await page.selectOption('#tradeInUnitCategory', 'android');
    await page.fill('#tradeInBrand', 'Samsung');
    await page.fill('#tradeInModel', 'Galaxy S21');
    await page.selectOption('#tradeInStorage', '128GB');
    await page.fill('#tradeInColor', 'Phantom Gray');
    await page.selectOption('#tradeInCondition', 'Bekas');
    await page.selectOption('#tradeInWarranty', 'INT');
    await page.fill('#tradeInImei', '123456789012345');
    await page.fill('#tradeInCost', '3500000');
    
    // Add to cart
    await page.click('#btnAddCartItem');
    
    // Select payment method and save
    await page.selectOption('#salePaymentMethod', 'cash');
    await page.click('#btnSaveSale');
    
    // Wait for transaction to save
    await waitForLocalStorageLength(page, 'igood_transactions', 1);
    
    // Validate stored transaction details
    const transactions = await readLocalStorage(page, 'igood_transactions');
    assert(transactions.length === 1, 'transaction should be saved');
    assert(transactions[0].category === 'tukar_tambah', 'transaction category should be tukar_tambah');
    assert(Number(transactions[0].sell) === 8500000, 'sell price should be net price (12m - 3.5m)');
    assert(Number(transactions[0].newUnitSellPrice) === 12000000, 'newUnitSellPrice should be saved');
    assert(Number(transactions[0].tradeInCost) === 3500000, 'tradeInCost should be saved');
    
    // Validate device stock changes
    const devices = await readLocalStorage(page, 'igood_device_stock');
    const soldUnit = devices.find(d => d.code === 'NEW-UNIT-TT');
    assert(soldUnit && soldUnit.status === 'Sold', 'new unit status should be Sold');
    
    const tradeInUnit = devices.find(d => d.acquisition === 'TT');
    assert(tradeInUnit, 'trade-in unit should be added to device stock');
    assert(tradeInUnit.category === 'android', 'trade-in unit category should be android');
    assert(tradeInUnit.warranty === 'INT', 'trade-in unit warranty should be INT');
    assert(tradeInUnit.status === 'Available', 'trade-in unit status should be Available');
    assert(tradeInUnit.brand === 'Samsung', 'trade-in unit brand should be Samsung');
    assert(tradeInUnit.model === 'Galaxy S21', 'trade-in unit model should be Galaxy S21');
    assert(tradeInUnit.cost === 3500000, 'trade-in unit cost should match trade-in value');
    assert(tradeInUnit.imei === '123456789012345', 'trade-in unit IMEI should be saved');
    
    // Check receipt content
    const receiptText = await page.textContent('#receiptPreview');
    assert(receiptText.includes('Nilai HP Lama'), 'receipt should mention Nilai HP Lama');
    assert(receiptText.includes('Samsung Galaxy S21 128GB'), 'receipt should mention trade-in unit specs');
    
    await closeReceiptPopup(page);
    
    // Go to daily report and check WA summary
    await page.click('[data-tab="page-daily-report"]');
    const reportText = await page.textContent('#dailyReportWhatsappText');
    assert(reportText.includes('TUKAR TAMBAH'), 'WA report should mention TUKAR TAMBAH');
    assert(reportText.includes('Toni | 08122334455'), 'WA report should show buyer details');
    
    // Void the transaction
    await clickVoidTransaction(page);
    await waitForLocalStorageLength(page, 'igood_transactions', 0);
    
    // Verify stock reversion and deletion of trade-in unit
    const revertedDevices = await readLocalStorage(page, 'igood_device_stock');
    const revertedNewUnit = revertedDevices.find(d => d.code === 'NEW-UNIT-TT');
    assert(revertedNewUnit && revertedNewUnit.status === 'Available', 'voided transaction should revert new unit to Available');
    const revertedTradeInUnit = revertedDevices.find(d => d.acquisition === 'TT');
    assert(!revertedTradeInUnit, 'voided transaction should remove the trade-in unit from device stock');
  });
}

async function testTukarTambahNegativeSubtotalFlow() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_device_stock: [{
        code: 'NEW-UNIT-TT2',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        color: 'Midnight',
        condition: 'New',
        cost: 10000000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
    });
    await page.reload({ waitUntil: 'networkidle' });
    
    // Choose Tukar Tambah category
    await page.click('[data-sale-type="tukar_tambah"]');
    
    // Fill out general transaction fields
    await page.fill('#saleBuyerName', 'Lusi');
    await page.fill('#saleBuyerWa', '08122334455');
    
    // Fill out unit baru
    await page.selectOption('#saleUnitCode', 'NEW-UNIT-TT2');
    await page.fill('#saleSellPrice', '10000000');
    
    // Go to next slide
    await page.click('#btnNextTradeInSlide');
    
    // Fill out HP lama specs (more expensive)
    await page.selectOption('#tradeInUnitCategory', 'android');
    await page.fill('#tradeInBrand', 'Samsung');
    await page.fill('#tradeInModel', 'Galaxy S24 Ultra');
    await page.selectOption('#tradeInStorage', '256GB');
    await page.fill('#tradeInColor', 'Titanium Gray');
    await page.selectOption('#tradeInCondition', 'Bekas');
    await page.selectOption('#tradeInWarranty', 'IBX');
    await page.fill('#tradeInImei', '555556666677777');
    await page.fill('#tradeInCost', '12000000');
    
    // Add to cart
    await page.click('#btnAddCartItem');
    
    // Verify subtotal displays Selisih Kembalian (Kasir Berikan): Rp 2.000.000
    const subtotalText = await page.textContent('#saleCartSubtotal');
    assert(subtotalText.includes('Rp 2.000.000'), 'subtotal should show absolute refund value');
    const labelText = await page.textContent('#saleCartSubtotalLabel');
    assert(labelText.includes('Selisih Kembalian'), 'subtotal label should show Selisih Kembalian');
    
    // Select payment method and save
    await page.selectOption('#salePaymentMethod', 'cash');
    await page.click('#btnSaveSale');
    
    // Wait for transaction to save
    await waitForLocalStorageLength(page, 'igood_transactions', 1);
    
    // Validate stored transaction details
    const transactions = await readLocalStorage(page, 'igood_transactions');
    assert(transactions.length === 1, 'transaction should be saved');
    assert(Number(transactions[0].sell) === -2000000, 'sell price should be negative net price (10m - 12m)');
    assert(Number(transactions[0].newUnitSellPrice) === 10000000, 'newUnitSellPrice should be saved');
    assert(Number(transactions[0].tradeInCost) === 12000000, 'tradeInCost should be saved');
    
    // Validate device stock changes
    const devices = await readLocalStorage(page, 'igood_device_stock');
    const soldUnit = devices.find(d => d.code === 'NEW-UNIT-TT2');
    assert(soldUnit && soldUnit.status === 'Sold', 'new unit status should be Sold');
    
    const tradeInUnit = devices.find(d => d.acquisition === 'TT');
    assert(tradeInUnit, 'trade-in unit should be added to device stock');
    assert(tradeInUnit.category === 'android', 'trade-in unit category should be android');
    assert(tradeInUnit.warranty === 'IBX', 'trade-in unit warranty should be IBX (Resmi)');
    assert(tradeInUnit.cost === 12000000, 'trade-in unit cost should match trade-in value');
  });
}

async function testVoidPreorderReadySaleRestoresPreorderStatusAndStock() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_preorder_requests: [{
        code: 'PO-0001',
        date: '2026-06-18',
        buyerName: 'Budi',
        buyerWa: '08123456789',
        requestedItem: 'iPhone 13 128GB Midnight',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        color: 'Midnight',
        dpAmount: 1000000,
        cost: 5200000,
        status: 'Ready',
        linkedUnitCode: 'IP-LINKED-01',
        createdAt: '2026-06-18T00:00:00Z',
      }],
      igood_device_stock: [{
        code: 'IP-R1M-01',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 13',
        storage: '128GB',
        color: 'Midnight',
        condition: 'Bekas',
        cost: 5200000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }, {
        code: 'IP-LINKED-01',
        category: 'iphone',
        brand: 'Apple',
        model: 'iPhone 12',
        storage: '64GB',
        color: 'Black',
        condition: 'Bekas',
        cost: 4200000,
        status: 'Available',
        createdAt: '2026-06-01T00:00:00Z',
      }],
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.click('[data-main-nav="sales"]');

    // Process preorder ready sale
    await page.click('[data-sale-type="preorder_ready"]');
    await page.click('.btn-process-preorder[data-code="PO-0001"]');
    await page.click('#btnSaveSale');
    await waitForLocalStorageLength(page, 'igood_transactions', 1);
    await closeReceiptPopup(page);

    // Verify preorder is Done and device is Sold
    let preorders = await readLocalStorage(page, 'igood_preorder_requests');
    let devices = await readLocalStorage(page, 'igood_device_stock');
    assert(preorders[0].status === 'Done', 'preorder should be marked Done after checkout');
    assert(devices.find(d => d.code === 'IP-LINKED-01')?.status === 'Sold', 'linked device should be marked Sold');
    assert(devices.find(d => d.code === 'IP-R1M-01')?.status === 'Available', 'spec-matched device should stay Available when linked unit is available');

    // Void the transaction
    await page.evaluate(() => window.switchPage('page-daily-report'));
    await clickVoidTransaction(page);
    await waitForLocalStorageLength(page, 'igood_transactions', 0);
    await waitForDeviceStatus(page, 'IP-LINKED-01', 'Available');

    // Verify preorder is reverted to Ready with linkedUnitCode still set
    preorders = await readLocalStorage(page, 'igood_preorder_requests');
    devices = await readLocalStorage(page, 'igood_device_stock');
    assert(preorders[0].status === 'Ready', 'preorder should go back to Ready status');
    assert(preorders[0].linkedUnitCode === 'IP-LINKED-01', 'preorder should keep linkedUnitCode');
    assert(devices.find(d => d.code === 'IP-LINKED-01')?.status === 'Available', 'linked device status should be back to Available');
    assert(devices.find(d => d.code === 'IP-R1M-01')?.status === 'Available', 'spec-matched device should remain Available after void');
  });
}

async function testPreorderMonthlyReportConsolidation() {
  await withIgoodPage(async (page) => {
    await seedLocalStorage(page, {
      igood_transactions: [
        {
          id: 'TRX-PO-DP',
          date: '2026-06-01',
          shift: 'shift pagi',
          category: 'preorder_dp',
          code: 'PO-TEST-99',
          itemName: 'DP Pre Order - iPhone 13',
          buyerName: 'Robby',
          buyerWa: '081234567890',
          quantity: 1,
          sell: 1000000,
          cost: 0,
          paymentMethod: 'cash',
          createdAt: '2026-06-01T09:00:00Z',
        },
        {
          id: 'TRX-PO-SALE',
          date: '2026-06-02',
          shift: 'shift malam',
          category: 'unit_iphone',
          code: 'IP-TEST-99',
          preorderCode: 'PO-TEST-99',
          itemName: 'iPhone 13 128GB',
          buyerName: 'Robby',
          buyerWa: '081234567890',
          quantity: 1,
          sell: 7000000,
          cost: 5000000,
          paymentMethod: 'transfer',
          createdAt: '2026-06-02T10:00:00Z',
        }
      ],
      igood_preorder_requests: [
        {
          code: 'PO-TEST-99',
          date: '2026-06-01',
          shift: 'shift pagi',
          buyerName: 'Robby',
          buyerWa: '081234567890',
          requestedItem: 'iPhone 13',
          dpAmount: 1000000,
          status: 'Done',
        }
      ]
    });
    await page.evaluate(() => {
      localStorage.setItem('igood_mode', 'admin');
    });
    await page.reload({ waitUntil: 'networkidle' });

    // Switch to Laporan Bulanan panel
    await page.click('[data-tab="page-admin"]');
    await page.evaluate(() => {
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.toggle('active', p.id === 'admin-monthly'));
    });

    // 1. Select June 2026 in the month picker
    await page.fill('#monthlyDetailMonthPicker', '2026-06');
    await page.dispatchEvent('#monthlyDetailMonthPicker', 'change');

    // 3. Verify KPI cards in Opsi B (detail view)
    const revKpi = await page.textContent('#monthlyDetailKpiRevenue');
    const costKpi = await page.textContent('#monthlyDetailKpiCost');
    const profitKpi = await page.textContent('#monthlyDetailKpiProfit');
    const txCountKpi = await page.textContent('#monthlyDetailKpiTxCount');

    assert(revKpi.includes('Rp 7.000.000'), 'Opsi B KPI Revenue should show 7,000,000');
    assert(costKpi.includes('Rp 5.000.000'), 'Opsi B KPI Cost should show 5,000,000');
    assert(profitKpi.includes('Rp 2.000.000'), 'Opsi B KPI Profit should show 2,000,000');
    assert(txCountKpi === '1', 'Opsi B KPI Transaction count should show exactly 1 transaction');
  });
}

async function testOrderJasaICloudFlow() {
  await withIgoodPage(async (page) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    // 1. Click ORDER JASA menu on sales page
    await page.click('button[data-sale-type="order_jasa"]');

    // Click "Pembuatan iCloud" sub-tab
    await page.click('button[data-sale-type="order_jasa_icloud"]');

    // Verify modal is open with target title
    assert(await page.locator('#salesItemModal.open').count() === 1, 'iCloud tab click should open sales item modal popup');
    const modalTitle = await page.textContent('#salesItemModalMount h3');
    assert(modalTitle.includes('Jasa Pembuatan iCloud'), 'Modal title should display Jasa Pembuatan iCloud');

    // 2. Test validation: try to add without filling fields
    await page.click('#btnAddCartItem');
    await waitForToastIncludes(page, 'Nama Lengkap wajib diisi');

    // Fill Nama Lengkap
    await page.fill('#icloudFullName', 'Dilan Alma');
    await page.click('#btnAddCartItem');
    await waitForToastIncludes(page, 'Tanggal Lahir wajib diisi');

    // Fill DOB
    await page.fill('#icloudDob', '2000-01-01');
    await page.click('#btnAddCartItem');
    await waitForToastIncludes(page, 'Email Aktif wajib diisi');

    // Fill Email
    await page.fill('#icloudEmail', 'dilan@gmail.com');
    await page.click('#btnAddCartItem');
    await waitForToastIncludes(page, 'Nomor Telfon Aktif wajib diisi');

    // Fill Phone
    await page.fill('#icloudPhone', '081234567890');
    await page.click('#btnAddCartItem');
    await waitForToastIncludes(page, 'Kata Sandi wajib diisi');

    // Fill Password
    await page.fill('#icloudPassword', 'SandiRahasia123');
    await page.click('#btnAddCartItem');
    await waitForToastIncludes(page, 'Nominal wajib lebih dari 0');

    // Fill Sell Price
    await page.fill('#saleSellPrice', '150000');
    await page.click('#btnAddCartItem');

    // Fill checkout form details (after they are dynamically rendered in the cart form)
    await page.fill('#saleBuyerName', 'Pelanggan iCloud');
    await page.fill('#saleBuyerWa', '081234567891');
    await setSalesName(page, '#saleSalesName', 'Agung');

    // Save transaction
    await page.click('#btnSaveSale');

    // Verify receipt contains iCloud credentials
    await page.waitForSelector('#receiptModal.open');
    const receiptText = await page.textContent('#receiptPreview');
    assert(receiptText.includes('Nama   : Dilan Alma'), 'Receipt should list full name');
    assert(receiptText.includes('Email  : dilan@gmail.com'), 'Receipt should list email');
    assert(receiptText.includes('081234567890'), 'Receipt should list iCloud active phone');
    assert(receiptText.includes('SandiRahasia123'), 'Receipt should list password');

    // Verify Supabase mapping sanitization
    const transactions = await readLocalStorage(page, 'igood_transactions');
    const targetTx = transactions.find(t => t.category === 'order_jasa_icloud');
    assert(targetTx !== undefined, 'iCloud transaction must be stored locally');
    
    // Evaluate mapping result
    const mappedPayload = await page.evaluate((txObj) => {
      return window.mapTransactionForSupabase(txObj);
    }, targetTx);

    // Assert mapping does NOT contain private details
    assert(mappedPayload.buyer_name === '', 'Supabase mapped payload buyer_name must be empty');
    assert(mappedPayload.buyer_wa === '', 'Supabase mapped payload buyer_wa must be empty');
    assert(mappedPayload.item_name === 'Jasa Pembuatan iCloud', 'Supabase mapped payload item_name must be generic');
    assert(mappedPayload.code === '', 'Supabase mapped payload code must be empty');
    assert(mappedPayload.stock_ref_code === '', 'Supabase mapped payload stock_ref_code must be empty');
    assert(mappedPayload.sell === 150000, 'Supabase mapped payload sell price must be preserved');
    
    await closeReceiptPopup(page);
  });
}

async function testOrderJasaImeiMonitoringAndAdminStatus() {
  await withIgoodPage(async (page) => {
    // 1. Seed with an order_jasa transaction
    await seedLocalStorage(page, {
      igood_transactions: [
        {
          id: 'TX-OI-TEST',
          date: '2026-06-20',
          shift: 'shift pagi',
          category: 'order_jasa',
          code: 'OI-1234',
          itemName: 'Order Jasa IMEI - iPhone 14 Pro (Resmi) - 351234567891234',
          buyerName: 'Dilan',
          buyerWa: '081234567890',
          salesName: 'Agung',
          quantity: 1,
          sell: 500000,
          cost: 0,
          paymentMethod: 'cash',
          jasaCategory: 'iphone',
          jasaUnitName: 'iPhone 14 Pro',
          jasaImei: '351234567891234',
          jasaWarranty: 'Resmi',
          jasaNote: 'Segera diproses',
          status: 'Masuk',
          serviceStatus: 'Masuk',
          createdAt: '2026-06-20T10:00:00Z',
        }
      ]
    });
    await page.reload({ waitUntil: 'networkidle' });

    // 2. Click MONITORING IMEI menu on Menu Utama (Home)
    await page.evaluate(() => window.switchPage('page-home'));
    await page.click('#btnHomeMonitoringImei');

    // Check if Dilan's order is in monitoring table
    const monitoringBody = await page.textContent('#imeiMonitoringTableBody');
    assert(monitoringBody.includes('Dilan'), 'Monitoring status table should display buyer name Dilan');
    assert(monitoringBody.includes('351234567891234'), 'Monitoring status table should display IMEI');
    assert(monitoringBody.includes('Masuk'), 'Monitoring status table should show status Masuk');

    // 3. Switch to admin mode to change status
    await page.evaluate(() => {
      localStorage.setItem('igood_mode', 'admin');
    });
    await page.reload({ waitUntil: 'networkidle' });

    // Open Admin page, go to Order IMEI panel
    await page.click('[data-tab="page-admin"]');
    await page.click('[data-panel="admin-group-order-jasa"]');
    await page.click('[data-panel="admin-imei"]');

    // Verify Dilan's order is in admin table
    const adminImeiBody = await page.textContent('#adminImeiTableBody');
    assert(adminImeiBody.includes('Dilan'), 'Admin IMEI table should show Robby');
    assert(adminImeiBody.includes('351234567891234'), 'Admin IMEI table should show IMEI');

    // Change status dropdown to "On Progress"
    await page.selectOption('#adminImeiTableBody select', 'On Progress');
    await page.waitForTimeout(200); // Wait for save & render

    // Verify local storage is updated
    const transactions = await readLocalStorage(page, 'igood_transactions');
    const targetTx = transactions.find(t => t.id === 'TX-OI-TEST');
    assert(targetTx.status === 'On Progress', 'Transaction status in local storage should be updated to On Progress');

    // 4. Switch back to sales mode and check monitoring status
    await page.evaluate(() => {
      localStorage.setItem('igood_mode', 'sales');
    });
    await page.reload({ waitUntil: 'networkidle' });

    await page.evaluate(() => window.switchPage('page-home'));
    await page.click('#btnHomeMonitoringImei');

    const updatedMonitoringBody = await page.textContent('#imeiMonitoringTableBody');
    assert(updatedMonitoringBody.includes('On Progress'), 'Monitoring status table should now show updated status On Progress');
  });
}

export async function testEmployeeRBACAndPerformanceFlow() {
  await withIgoodPage(async (page) => {
    await page.evaluate(() => {
      window.currentMode = 'sales';
      localStorage.setItem('igood_mode', 'sales');
      if (typeof updateRoleBadge === 'function') updateRoleBadge();
      window.switchPage('page-sales');
    });

    // 1. Verify default startup is kasir mode (no login popup blocking)
    const nameText = await page.textContent('#activeEmployeeName');
    const roleText = await page.textContent('#activeEmployeeRole');
    assert(nameText === 'Kasir Toko', 'Active employee name should default to Kasir Toko');
    assert(roleText === 'Sales', 'Active employee role should default to Sales');
    assert(await page.locator('#loginOverlay.open').count() === 0, 'Login overlay should not block on startup');

    // 2. Click ADMIN CENTER in Menu Utama -> should prompt with Admin Login modal
    await page.evaluate(() => window.switchPage('page-home'));
    await page.click('#btnHomeAdmin');
    await page.waitForSelector('#adminPinModal.open', { timeout: 1500 });
    
    // Enter correct password for Owner (Super Admin)
    await page.fill('#adminPinInput', 'igoodrame');
    await page.click('#btnVerifyAdminAuth');
    await page.waitForSelector('#page-admin.active', { timeout: 1500 });
    const empTabCount = await page.locator('.admin-tab[data-panel="admin-employees"]').count();
    assert(empTabCount > 0, 'Data Pegawai tab should be present for Super Admin');

    // 3. Navigate to Data Pegawai panel and add employees
    await page.click('.admin-tab[data-panel="admin-employees"]');
    await page.waitForSelector('#admin-employees.active', { timeout: 1500 });

    // Add Admin Employee "Budi"
    await page.click('#btnAddNewEmployee');
    await page.fill('#employeeName', 'Budi');
    await page.selectOption('#employeeJobTitle', 'Selles');
    await page.selectOption('#employeeRole', 'Admin');
    await page.click('#employeeForm button[type="submit"]');
    await page.waitForTimeout(200);

    // Add Selles Employee "Chandra"
    await page.click('#btnAddNewEmployee');
    await page.fill('#employeeName', 'Chandra');
    await page.selectOption('#employeeJobTitle', 'Selles');
    await page.selectOption('#employeeRole', 'Selles');
    await page.click('#employeeForm button[type="submit"]');
    await page.waitForTimeout(200);

    // Verify both exist in local storage employee list
    const employees = await readLocalStorage(page, 'igood_employees');
    assert(employees.some(e => e.name === 'Budi' && e.role === 'Admin'), 'Budi should be saved as Admin');
    assert(employees.some(e => e.name === 'Chandra' && e.role === 'Selles'), 'Chandra should be saved as Selles');

    // 4. Test Exit Admin Mode -> back to Kasir
    await page.click('#btnExitAdminMode');
    await page.waitForSelector('#page-sales.active', { timeout: 1500 });
    assert((await page.textContent('#activeEmployeeName')) === 'Kasir Toko', 'Should return to Kasir Toko');

    // 5. Test Admin Login with Budi (Admin) & Wrong Password
    await page.click('[data-main-nav="admin"]');
    await page.waitForSelector('#adminPinModal.open', { timeout: 1500 });

    const budi = employees.find(e => e.name === 'Budi');
    await page.selectOption('#adminLoginUsername', budi.id);
    await page.fill('#adminPinInput', 'wrongpassword');
    await page.click('#btnVerifyAdminAuth');
    await page.waitForTimeout(200);
    assert(await page.locator('#adminPinModal.open').count() === 1, 'Admin modal should remain open on wrong password');

    // Correct login for Budi (Admin)
    await page.fill('#adminPinInput', 'ramebanget');
    await page.click('#btnVerifyAdminAuth');
    await page.waitForSelector('#page-admin.active', { timeout: 1500 });

    // Verify Active Bar shows Budi (Admin)
    const activeName = await page.textContent('#activeEmployeeName');
    const activeRole = await page.textContent('#activeEmployeeRole');
    assert(activeName === 'Budi', 'Active employee should be Budi');
    assert(activeRole === 'Admin', 'Active employee role should be Admin');

    // Verify restricted tabs are hidden for Admin
    const dashboardTabVisible = await page.locator('.admin-tab[data-panel="admin-dashboard"]').isVisible();
    const monthlyTabVisible = await page.locator('.admin-tab[data-panel="admin-monthly"]').isVisible();
    const expensesTabVisible = await page.locator('.admin-tab[data-panel="admin-expenses"]').isVisible();
    const historyTabVisible = await page.locator('.admin-tab[data-panel="admin-history"]').isVisible();
    const employeesTabVisible = await page.locator('.admin-tab[data-panel="admin-employees"]').isVisible();

    assert(!dashboardTabVisible, 'Dashboard tab should be hidden for Admin');
    assert(!monthlyTabVisible, 'Monthly Report tab should be hidden for Admin');
    assert(!expensesTabVisible, 'Expenses tab should be hidden for Admin');
    assert(!historyTabVisible, 'History tab should be hidden for Admin');
    assert(!employeesTabVisible, 'Employees tab should be hidden for Admin');

    // 6. Login as Selles (Chandra)
    await page.click('#btnChangeAccount');
    await page.waitForSelector('#loginOverlay.open', { timeout: 1500 });

    const chandra = employees.find(e => e.name === 'Chandra');
    await page.selectOption('#loginUserSelect', chandra.id);

    // Password field should be hidden
    const passIsVisibleSelles = await page.isVisible('#loginUserPasswordContainer');
    assert(!passIsVisibleSelles, 'Password field should be hidden for Selles');

    // Login directly
    await page.click('#btnLoginSubmit');
    await page.waitForSelector('#loginOverlay', { state: 'hidden', timeout: 1500 });

    // Verify active bar shows Chandra (Selles)
    const activeNameSelles = await page.textContent('#activeEmployeeName');
    assert(activeNameSelles === 'Chandra', 'Active employee should be Chandra');

    // Admin Center button and home tile should be hidden
    const adminBottomBtnVisible = await page.locator('[data-main-nav="admin"]').isVisible();
    const adminHomeTileVisible = await page.locator('#btnHomeAdmin').isVisible();
    assert(!adminBottomBtnVisible, 'Admin bottom nav button should be hidden for Selles');
    assert(!adminHomeTileVisible, 'Admin home tile should be hidden for Selles');

    // 7. Sales auto-fills sales name
    await page.click('#btnHomeSales');
    await page.waitForSelector('#page-sales.active', { timeout: 1500 });

    const saleSalesNameVal = await page.$eval('#saleSalesName', el => el.value);
    assert(saleSalesNameVal === 'Chandra', 'Sales name input should be auto-filled with active employee name Chandra');

    // 8. Beban Gaji Karyawan auto-fill
    // Login back as Super Admin Owner
    await page.click('#btnChangeAccount');
    await page.waitForSelector('#loginOverlay.open', { timeout: 1500 });
    
    const owner = employees.find(e => e.name === 'Owner');
    await page.selectOption('#loginUserSelect', owner.id);
    await page.fill('#loginUserPassword', 'igoodrame');
    await page.click('#btnLoginSubmit');
    await page.waitForSelector('#loginOverlay', { state: 'hidden', timeout: 1500 });

    // Go to Admin -> Expenses
    await page.click('[data-main-nav="admin"]');
    if (await page.locator('#adminPinModal.open').count() > 0) {
      await page.fill('#adminPinInput', 'igoodrame');
      await page.click('#btnVerifyAdminAuth');
    }
    await page.waitForSelector('#page-admin.active', { timeout: 1500 });
    await page.evaluate(() => {
      document.querySelectorAll('.admin-panel').forEach(p => p.classList.toggle('active', p.id === 'admin-expenses'));
    });

    await page.click('#btnShowExpenseForm');
    await page.selectOption('#expenseCategory', 'gaji');

    // Employee selection container should be visible
    const empSelectVisible = await page.isVisible('#expenseEmployeeContainer');
    assert(empSelectVisible, 'Employee selection container should be visible for salary category');

    // Select Budi
    await page.selectOption('#expenseEmployeeSelect', 'Budi');
    
    // Description should auto-fill
    const descVal = await page.inputValue('#expenseDescription');
    assert(descVal === 'Gaji Budi - Selles', 'Expense description should auto-fill with format "Gaji [Name] - [JobTitle]"');
  });
}

const tests = [
  testMainNavigationUsesSalesServiceDailyReportOnly,
  testSalesFlowUsesMainMenuTilesAndCartReview,
  testNewMenuAndCartUseOpaqueSolidSurfaces,
  testSalesPopupCartPaymentReceiptAndServiceUxCorrections,
  testUnitIphoneCreatesDailyReport,
  testSplitPaymentMustEqualSellPrice,
  testAccessoryOversellIsRejected,
  testVoidTransactionRestoresStock,
  testDeviceCodeAutoGenerationAndImeiValidation,
  testAccessoryInputCanCalculateUnitCostFromTotalCost,
  testUnitSaleSavesSalesNameAndBonusAccessories,
  testBonusAccessoryRowsCanBeRemoved,
  testSalesFormDraftSurvivesTabSwitch,
  testAdminCanEditReportAndCatalogData,
  testExportsUsePdfDownload,
  testReceiptPopupAppearsAfterSavingSalesAndService,
  testReceiptPrintUsesNativeBridgeWhenAvailable,
  testReceiptPrintUsesSelectedThermalPrinterWhenConfigured,
  testMultiItemCartSharesOneReceiptAndShowsStoreStyleReceipt,
  testPreorderDpCreatesAdminRequestAndCanBeLinkedToUnitSale,
  testDashboardShowsSalesPerformanceForUnitSalesOnly,
  testDashboardMonthlyRecapShowsAllSalesForSelectedMonth,
  testSalesServiceMenuCompletesAndCancelsExistingServiceOrders,
  testAdminServicePanelStacksTechnicianAboveCatalog,
  testAdminServicePanelHasSeparateMenusForMasukKeluarCancel,
  testAdminCanSetServiceProcessDateAndTechnician,
  testServiceIntakeCreatesOrderWithoutSalesTransaction,
  testAdminCompletesServicePaymentAndLaterCost,
  testAdminCancelsServiceWithInspectionFeeCreatesRevenue
];

// Split the rest of the tests to fit in list
export async function testManualOtherSaleItemFlow() {
  await withIgoodPage(async (page) => {
    // 1. Open Lain-lain category
    await page.click('[data-sale-type="other"]');
    await page.waitForSelector('#salesItemModal.open', { timeout: 1500 });

    // 2. Type custom manual item name and sell price directly into text input
    await page.fill('#saleItemName', 'Kabel Data Custom Type-C');
    await page.fill('#saleSellPrice', '75000');
    await page.fill('#saleQuantity', '2');

    // 4. Click Add to Cart
    await page.click('#btnAddCartItem');

    // 5. In testing mode, cart is visible on page or drawer
    const cartHtml = await page.innerHTML('#saleCartBody');
    assert(cartHtml.includes('Kabel Data Custom Type-C'), 'Cart should display manually typed item name');
    assert(cartHtml.includes('150.000'), 'Cart subtotal should correctly calculate 75.000 * 2 = 150.000');

    // 6. Complete checkout
    await page.fill('#saleBuyerName', 'Budi Santoso');
    await page.fill('#saleBuyerWa', '081234567890');
    await page.click('#btnSaveSale');
    await waitForLocalStorageLength(page, 'igood_transactions', 1);

    // 7. Verify transaction in local storage
    const transactions = await readLocalStorage(page, 'igood_transactions');
    const manualTx = transactions.find(t => t.itemName === 'Kabel Data Custom Type-C');
    assert(Boolean(manualTx), 'Transaction should be saved with manual item name');
    assert(manualTx.sell === 150000, 'Transaction sell price should be 150000');
    assert(manualTx.quantity === 2, 'Transaction quantity should be 2');
    assert(manualTx.buyerName === 'Budi Santoso', 'Transaction buyer name should match');
  });
}

export async function testCreditAgentSelectionAndSplitCreditFlow() {
  await withIgoodPage(async (page) => {
    // 1. Setup seed device
    await seedLocalStorage(page, {
      igood_device_stock: [
        { code: 'IP11-TEST', category: 'iphone', brand: 'Apple', model: 'iPhone 11', storage: '128GB', color: 'Black', condition: 'Second', cost: 5000000, status: 'Available', createdAt: '2026-08-20T00:00:00Z' },
        { code: 'IP12-TEST', category: 'iphone', brand: 'Apple', model: 'iPhone 12', storage: '128GB', color: 'Blue', condition: 'Second', cost: 7000000, status: 'Available', createdAt: '2026-08-20T00:00:00Z' }
      ],
      igood_acc_stock: [
        { code: 'KBL-01', category: 'K', brand: 'Apple', name: 'Kabel C-Lightning', qty: 10, cost: 30000, sell: 100000, createdAt: '2026-08-20T00:00:00Z' }
      ]
    });
    await page.reload({ waitUntil: 'networkidle' });

    // 2. Add iPhone 11 to cart with bonus accessory
    await page.click('[data-sale-type="unit_iphone"]');
    await page.waitForSelector('#salesItemModal.open', { timeout: 1500 });
    await page.selectOption('#saleUnitCode', 'IP11-TEST');
    await page.fill('#saleSellPrice', '6500000');
    await page.selectOption('#saleBonusAccessoryCode0', 'KBL-01');
    await page.fill('#saleBonusQuantity0', '1');
    await page.click('#btnAddCartItem');

    // 3. Select Credit payment and specify Kredivo
    await page.fill('#saleBuyerName', 'Andi Kredit');
    await page.fill('#saleBuyerWa', '081234567890');
    await page.selectOption('#salePaymentMethod', 'kredit');
    await page.fill('#saleCreditAgent', 'Kredivo');
    await page.click('#btnSaveSale');
    await waitForLocalStorageLength(page, 'igood_transactions', 1);
    await closeReceiptPopup(page);

    const txs1 = await readLocalStorage(page, 'igood_transactions');
    const tx1 = txs1[0];
    assert(tx1.paymentMethod === 'kredit', 'Payment method should be kredit');
    assert(tx1.creditAgent === 'Kredivo', 'Credit agent should be Kredivo');
    assert(tx1.bonusAccessories.length === 1, 'Bonus accessories should be saved');

    // 4. Second sale: iPhone 12 with Split payment (Cash 4jt + Kredit 5jt via SPayLater)
    await page.click('[data-sale-type="unit_iphone"]');
    await page.waitForSelector('#salesItemModal.open', { timeout: 1500 });
    await page.selectOption('#saleUnitCode', 'IP12-TEST');
    await page.fill('#saleSellPrice', '9000000');
    await page.click('#btnAddCartItem');

    await page.fill('#saleBuyerName', 'Citra Split');
    await page.fill('#saleBuyerWa', '089876543210');
    await page.selectOption('#salePaymentMethod', 'split');
    await page.fill('#saleSplitCash', '4000000');
    await page.fill('#saleSplitTransfer', '0');
    await page.fill('#saleSplitCredit', '5000000');
    await page.fill('#saleCreditAgent', 'SPayLater');
    await page.click('#btnSaveSale');
    await waitForLocalStorageLength(page, 'igood_transactions', 2);

    const txs2 = await readLocalStorage(page, 'igood_transactions');
    const tx2 = txs2.find(t => t.code === 'IP12-TEST' || t.stockRefCode === 'IP12-TEST');
    assert(tx2.paymentMethod === 'split', 'Payment method should be split');
    assert(tx2.splitCredit === 5000000, 'Split credit amount should match');
    assert(tx2.creditAgent === 'SPayLater', 'Credit agent for split should be SPayLater');
  });
}

export async function testUnifiedSalesRecapAndBonusTracking() {
  await withIgoodPage(async (page) => {
    // 1. Seed data with completed transactions and bonus
    const todayMonth = (new Date()).toISOString().slice(0, 7);
    await seedLocalStorage(page, {
      igood_device_stock: [
        { code: 'IP11-01', category: 'iphone', brand: 'Apple', model: 'iPhone 11', storage: '128GB', color: 'Black', condition: 'Second', cost: 5000000, status: 'Sold', createdAt: '2026-08-20T00:00:00Z' }
      ],
      igood_transactions: [
        {
          id: 'TX1',
          code: 'IP11-01',
          stockRefCode: 'IP11-01',
          category: 'unit_iphone',
          itemName: 'iPhone 11',
          date: `${todayMonth}-10`,
          cost: 5000000,
          sell: 6500000,
          paymentMethod: 'kredit',
          creditAgent: 'Kredivo',
          buyerName: 'Rian Santoso',
          salesName: 'Budi',
          bonusAccessories: [
            { code: 'ACC1', name: 'Case Slim Transparan', brand: 'Apple', cost: 50000, quantity: 1 }
          ]
        },
        {
          id: 'TX2',
          code: 'ACC-KB',
          category: 'accessory',
          itemName: 'Kabel Fast Charging',
          brand: 'Anker',
          date: `${todayMonth}-11`,
          cost: 40000,
          sell: 100000,
          quantity: 2,
          paymentMethod: 'cash',
          salesName: 'Budi'
        }
      ],
      igood_service_orders: [
        {
          id: 'SRV1',
          code: 'SRV-001',
          date: `${todayMonth}-05`,
          processedDate: `${todayMonth}-06`,
          status: 'keluar',
          brand: 'iPhone',
          model: '11 Pro',
          complaint: 'Ganti Baterai',
          customerName: 'Dina',
          technician: 'Fajar',
          paymentAmount: 400000,
          technicianCost: 250000
        }
      ]
    });
    await page.reload({ waitUntil: 'networkidle' });

    // 2. Open Admin Center -> Rekap Penjualan panel
    await page.evaluate(() => window.switchPage('page-admin'));
    await page.click('.admin-tab[data-panel="admin-sales-recap"]');
    await page.waitForSelector('#admin-sales-recap.active', { timeout: 1500 });

    // 3. Verify Executive KPI Cards
    // Total Revenue = 6.500.000 + 100.000 + 400.000 = 7.000.000
    // Total HPP = 5.000.000 + 40.000 + 250.000 = 5.290.000
    // Bonus Cost = 50.000
    // Net Profit = 7.000.000 - 5.290.000 - 50.000 = 1.660.000
    const revKpi = await page.textContent('#recapKpiRevenue');
    const costKpi = await page.textContent('#recapKpiCost');
    const bonusKpi = await page.textContent('#recapKpiBonusCost');
    const netProfitKpi = await page.textContent('#recapKpiNetProfit');

    assert(revKpi.includes('7.000.000'), 'Total omset should be 7.000.000');
    assert(costKpi.includes('5.290.000'), 'Total HPP should be 5.290.000');
    assert(bonusKpi.includes('50.000'), 'Bonus modal cost should be 50.000');
    assert(netProfitKpi.includes('1.660.000'), 'True Net Profit should be 1.660.000');

    // 4. Verify 6 Bordered Category Cards exist and show counts
    assert(await page.locator('.recap-cat-card[data-recap-cat="units"]').count() === 1, 'Units bordered card should exist');
    assert(await page.locator('.recap-cat-card[data-recap-cat="accessories"]').count() === 1, 'Accessories bordered card should exist');
    assert(await page.locator('.recap-cat-card[data-recap-cat="services"]').count() === 1, 'Services bordered card should exist');
    assert(await page.locator('.recap-cat-card[data-recap-cat="order-jasa"]').count() === 1, 'Order Jasa bordered card should exist');
    assert(await page.locator('.recap-cat-card[data-recap-cat="other"]').count() === 1, 'Other bordered card should exist');
    assert(await page.locator('.recap-cat-card[data-recap-cat="sales-perf"]').count() === 1, 'Sales perf bordered card should exist');

    const unitsBadge = await page.textContent('#recapBadgeUnitsCount');
    assert(unitsBadge.includes('1 Unit'), 'Units card badge should show 1 Unit');

    // 5. Open Rekap Unit HP -> Minimalist item list
    await page.click('.recap-cat-card[data-recap-cat="units"]');
    const unitList = await page.textContent('#recapListUnits');
    assert(unitList.includes('iPhone 11'), 'Units list should display iPhone 11');
    assert(unitList.includes('1.450.000'), 'Unit row should show true net profit of 1.450.000');

    // 6. Click Unit Row -> Verify Click-to-Detail Pop-up Modal opens
    await page.click('#recapListUnits .recap-item-row');
    await page.waitForSelector('#modalRecapDetail.open', { timeout: 1500 });

    const modalFinancial = await page.textContent('#modalRecapDetailFinancialContent');
    const modalPayment = await page.textContent('#modalRecapDetailPaymentContent');
    const modalStaff = await page.textContent('#modalRecapDetailStaffContent');
    const modalBonus = await page.textContent('#modalRecapDetailBonusList');

    assert(modalFinancial.includes('6.500.000'), 'Modal should show Sell price 6.500.000');
    assert(modalFinancial.includes('5.000.000'), 'Modal should show Unit cost 5.000.000');
    assert(modalFinancial.includes('50.000'), 'Modal should show Bonus cost 50.000');
    assert(modalFinancial.includes('1.450.000'), 'Modal should show True Net Profit 1.450.000');
    assert(modalPayment.includes('Kredivo'), 'Modal should show leasing agent Kredivo');
    assert(modalStaff.includes('Budi'), 'Modal should show Sales Budi');
    assert(modalBonus.includes('Case Slim Transparan'), 'Modal should list bonus item Case Slim Transparan');

    // Close detail modal
    await page.click('#btnCloseRecapDetail');

    // 7. Click Back to Categories -> Check Accessories Bonus
    await page.click('#btnBackToRecapCategories');
    await page.click('.recap-cat-card[data-recap-cat="accessories"]');
    await page.click('#btnRecapAccBonus');

    const bonusList = await page.textContent('#recapListAccBonus');
    assert(bonusList.includes('Case Slim Transparan'), 'Bonus list should show Case Slim Transparan');
    assert(bonusList.includes('iPhone 11 (IP11-01)'), 'Bonus list should link to parent iPhone 11 unit');

    // 8. Check Sales Performance Leaderboard
    await page.click('#btnBackToRecapCategories');
    await page.click('.recap-cat-card[data-recap-cat="sales-perf"]');
    const perfList = await page.textContent('#recapListSalesPerf');
    assert(perfList.includes('Budi'), 'Sales performance should show Budi');
    assert(perfList.includes('1 Unit'), 'Budi should have 1 Unit sold');
    assert(perfList.includes('50.000'), 'Budi should have 50.000 bonus cost recorded');
  });
}

tests.push(
  testOrderJasaICloudFlow,
  testOrderJasaImeiMonitoringAndAdminStatus,
  testPreorderMonthlyReportConsolidation,
  testEmployeeRBACAndPerformanceFlow,
  testManualOtherSaleItemFlow,
  testAdminCancelsServiceWithZeroFeeCreatesVirtualReportEntry,
  testImeiInputSavingAndPrintingReceipt,
  testServiceCartDeletionAndValidation,
  testTukarTambahFlow,
  testTukarTambahNegativeSubtotalFlow,
  testVoidPreorderReadySaleRestoresPreorderStatusAndStock,
  testMonthlyReportsPanelOpsiAAndB,
  testCreditAgentSelectionAndSplitCreditFlow,
  testUnifiedSalesRecapAndBonusTracking
);

try {
  const filter = process.env.IGOOD_TEST_FILTER || '';
  const selectedTests = filter ? tests.filter(test => test.name.includes(filter)) : tests;
  for (const test of selectedTests) {
    await test();
    console.log(`PASS ${test.name}`);
  }
} finally {
  await stopIgoodTestServer();
}
