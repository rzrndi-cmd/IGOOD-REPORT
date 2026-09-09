import {
  assert,
  closeIgoodPage,
  openIgoodPage,
  seedLocalStorage,
  stopIgoodTestServer,
} from './igood-test-utils.mjs';

async function testSalePushesTransactionToSupabaseWhenConfigured() {
  const { browser, page } = await openIgoodPage();
  page.setDefaultTimeout(15000);
  const captured = [];

  try {
    await page.route('https://example.supabase.co/rest/v1/**', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
            'access-control-allow-headers': 'apikey,authorization,content-type,prefer',
          },
          body: '',
        });
        return;
      }
      captured.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        body: request.postDataJSON(),
      });

      await route.fulfill({
        status: 201,
        headers: {
          'access-control-allow-origin': '*',
          'content-type': 'application/json',
        },
        body: JSON.stringify([]),
      });
    });

    await seedLocalStorage(page, {
      igood_supabase_config: {
        url: 'https://example.supabase.co/rest/v1/',
        key: 'sb_publishable_test_key',
      },
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

    await page.reload({ waitUntil: 'domcontentloaded' });
    if (await page.locator('#page-home.active').count()) {
      await page.click('#btnHomeSales');
    }
    await page.waitForSelector('[data-sale-type="unit_iphone"]', { timeout: 5000 });
    await page.click('[data-sale-type="unit_iphone"]');
    await page.waitForSelector('#saleBuyerName', { timeout: 5000 });
    await page.fill('#saleBuyerName', 'Budi');
    await page.fill('#saleBuyerWa', '08123456789');
    await page.selectOption('#saleUnitCode', 'PB-IBX-I131-001');
    await page.fill('#saleSellPrice', '6800000');
    await page.click('#btnAddCartItem');
    await page.click('#btnSaveSale');

    await page.waitForFunction(() => {
      return window.__igoodLastSupabaseSync?.ok === true;
    }, null, { timeout: 3000 });

    const transactionRequest = captured.find((request) => request.url.includes('/igood_transactions'));
    assert(transactionRequest, 'Supabase transaction insert should be called');
    assert(transactionRequest.method === 'POST', 'transaction sync should POST');
    assert(transactionRequest.headers.apikey === 'sb_publishable_test_key', 'apikey header should use configured key');
    assert(!transactionRequest.headers.authorization, 'publishable key should not be sent as bearer token');
    assert(transactionRequest.body.buyer_name === 'Budi', 'transaction sync should map buyer name');
    assert(transactionRequest.body.buyer_wa === '08123456789', 'transaction sync should map buyer WA');
    assert(transactionRequest.body.code === 'PB-IBX-I131-001', 'transaction sync should map unit code');
  } finally {
    await closeIgoodPage(browser);
  }
}

async function testServiceIntakePushesServiceOrderToSupabaseWhenConfigured() {
  const { browser, page } = await openIgoodPage();
  page.setDefaultTimeout(15000);

  try {
    await page.route('https://example.supabase.co/rest/v1/**', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
            'access-control-allow-headers': 'apikey,authorization,content-type,prefer',
          },
          body: '',
        });
        return;
      }
      await route.fulfill({
        status: 201,
        headers: {
          'access-control-allow-origin': '*',
          'content-type': 'application/json',
        },
        body: JSON.stringify([]),
      });
    });

    await seedLocalStorage(page, {
      igood_supabase_config: {
        url: 'https://example.supabase.co/rest/v1/',
        key: 'sb_publishable_test_key',
      },
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    const serviceOrderRequestPromise = page.waitForRequest((request) => {
      return request.url().includes('/igood_service_orders') && request.method() === 'POST';
    });

    await page.click('[data-sale-type="service"]');
    await page.click('[data-service-sale-mode="masuk"]');
    await page.fill('#saleBuyerName', 'Rudi');
    await page.fill('#saleBuyerWa', '085555555555');
    await page.fill('#saleServiceDevice', 'iPhone 11');
    await page.fill('#saleServiceComplaint', 'LCD blank');
    await page.click('#btnSaveServiceIntake');

    const request = await serviceOrderRequestPromise;
    const body = request.postDataJSON();
    assert(body.code === 'SV-0001', 'service order sync should map service code');
    assert(body.buyer_name === 'Rudi', 'service order sync should map buyer name');
    assert(body.buyer_wa === '085555555555', 'service order sync should map buyer WA');
    assert(body.item_name === 'iPhone 11', 'service order sync should map serviced item');
    assert(body.complaint === 'LCD blank', 'service order sync should map complaint');
    assert(body.status === 'Masuk', 'service order sync should map intake status');
  } finally {
    await closeIgoodPage(browser);
  }
}

async function testPreorderPushesRequestAndDpTransactionToSupabaseWhenConfigured() {
  const { browser, page } = await openIgoodPage();
  page.setDefaultTimeout(15000);
  const captured = [];

  try {
    await page.route('https://example.supabase.co/rest/v1/**', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
            'access-control-allow-headers': 'apikey,authorization,content-type,prefer',
          },
          body: '',
        });
        return;
      }
      captured.push({
        url: request.url(),
        method: request.method(),
        body: request.postDataJSON(),
      });

      await route.fulfill({
        status: 201,
        headers: {
          'access-control-allow-origin': '*',
          'content-type': 'application/json',
        },
        body: JSON.stringify([]),
      });
    });

    await seedLocalStorage(page, {
      igood_supabase_config: {
        url: 'https://example.supabase.co/rest/v1/',
        key: 'sb_publishable_test_key',
      },
    });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      document.querySelectorAll('.payment-confirm-overlay').forEach(el => el.remove());
    });
    await page.evaluate(() => window.handleBackButton());
    await page.waitForSelector('#page-home.active', { timeout: 5000 });
    await page.click('#btnHomeSales');
    await page.click('.sale-tab[data-sale-type="preorder"]');
    await page.fill('#saleBuyerName', 'Budi');
    await page.fill('#saleBuyerWa', '08123456789');
    await page.evaluate(() => {
      const s = document.querySelector('#preorderSalesName');
      if (s) {
        if (s.tagName === 'SELECT') {
          s.innerHTML += '<option value="Dilan" selected>Dilan</option>';
          s.value = 'Dilan';
        } else {
          s.value = 'Dilan';
        }
        s.dispatchEvent(new Event('change'));
      }
    });
    await page.fill('#preorderItemRequest', 'iPhone 13 128GB Midnight');
    await page.fill('#preorderBrand', 'iPhone');
    await page.fill('#preorderModel', 'iPhone 13');
    await page.fill('#saleSellPrice', '1000000');
    await page.click('#btnSavePreorder');

    await page.waitForFunction(() => {
      return window.__igoodLastSupabaseSync?.ok === true;
    }, null, { timeout: 3000 });

    const preorderRequest = captured.find((request) => request.url.includes('/igood_preorder_requests'));
    const transactionRequest = captured.find((request) => request.url.includes('/igood_transactions'));
    assert(preorderRequest, 'preorder request sync should POST to igood_preorder_requests');
    assert(preorderRequest.body.code === 'PO-0001', 'preorder sync should map PO code');
    assert(preorderRequest.body.buyer_name === 'Budi', 'preorder sync should map buyer');
    assert(preorderRequest.body.dp_amount === 1000000, 'preorder sync should map DP amount');
    assert(preorderRequest.body.status === 'Preorder', 'preorder sync should map initial status');
    assert(transactionRequest, 'preorder DP should also sync a transaction');
    assert(transactionRequest.body.category === 'preorder_dp', 'DP transaction sync should use preorder_dp category');
    assert(transactionRequest.body.preorder_code === 'PO-0001', 'DP transaction sync should map preorder code');
  } finally {
    await closeIgoodPage(browser);
  }
}

async function testEmbeddedSupabaseConfigUsesPublishKeyAndBackupMenuIsHidden() {
  const { browser, page } = await openIgoodPage();
  page.setDefaultTimeout(15000);
  const captured = [];

  try {
    await page.route('http://127.0.0.1:4173/url%20supabase.txt', async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
        body: [
          'Url : https://example.supabase.co/rest/v1/',
          'publish key : sb_publishable_embedded_key',
          'secret key : sb_secret_should_not_be_used',
          'service role : eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature',
        ].join('\n'),
      });
    });

    await page.route('https://example.supabase.co/rest/v1/**', async (route) => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: {
            'access-control-allow-origin': '*',
            'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
            'access-control-allow-headers': 'apikey,authorization,content-type,prefer',
          },
          body: '',
        });
        return;
      }
      captured.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers(),
        body: request.postDataJSON(),
      });

      await route.fulfill({
        status: 201,
        headers: {
          'access-control-allow-origin': '*',
          'content-type': 'application/json',
        },
        body: JSON.stringify([]),
      });
    });

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
    await page.evaluate(() => localStorage.removeItem('igood_supabase_config'));
    await page.reload({ waitUntil: 'domcontentloaded' });

    assert((await page.locator('[data-panel="admin-backup"]').count()) === 0, 'backup admin tab should not be rendered');
    assert((await page.locator('#admin-backup').count()) === 0, 'backup panel should not be rendered');

    await page.click('[data-sale-type="unit_iphone"]');
    await page.fill('#saleBuyerName', 'Budi');
    await page.fill('#saleBuyerWa', '08123456789');
    await page.selectOption('#saleUnitCode', 'IP-R1M-01');
    await page.fill('#saleSellPrice', '6800000');
    await page.click('#btnAddCartItem');
    await page.click('#btnSaveSale');

    await page.waitForFunction(() => {
      return window.__igoodLastSupabaseSync?.ok === true;
    }, null, { timeout: 3000 });

    const transactionRequest = captured.find((request) => request.url.includes('/igood_transactions'));
    assert(transactionRequest, 'embedded config should sync transaction');
    assert(transactionRequest.headers.apikey === 'sb_publishable_embedded_key', 'embedded config should use publish key');
    assert(!transactionRequest.headers.apikey.includes('secret'), 'embedded config should not use secret key');
  } finally {
    await closeIgoodPage(browser);
  }
}

try {
  await testSalePushesTransactionToSupabaseWhenConfigured();
  console.log('PASS testSalePushesTransactionToSupabaseWhenConfigured');
  await testServiceIntakePushesServiceOrderToSupabaseWhenConfigured();
  console.log('PASS testServiceIntakePushesServiceOrderToSupabaseWhenConfigured');
  await testPreorderPushesRequestAndDpTransactionToSupabaseWhenConfigured();
  console.log('PASS testPreorderPushesRequestAndDpTransactionToSupabaseWhenConfigured');
  await testEmbeddedSupabaseConfigUsesPublishKeyAndBackupMenuIsHidden();
  console.log('PASS testEmbeddedSupabaseConfigUsesPublishKeyAndBackupMenuIsHidden');
} finally {
  await stopIgoodTestServer();
}
