# Penjualan dan Report Harian Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a white-blue Igood cashier flow where sales are entered by category, saved locally, and automatically generate a daily WhatsApp report.

**Architecture:** Keep the current static Capacitor app structure, but introduce a transaction-first data model in `app.js`. `Penjualan` writes normalized transactions to localStorage; `Report Harian`, Dashboard, and stock state derive from those transactions. Keep root files and `www` files synchronized because Capacitor packages `www`.

**Tech Stack:** Static HTML/CSS/JavaScript, localStorage, Chart.js, XLSX, Capacitor Android, Playwright browser checks via temporary local test runner.

---

## File Structure

- Modify `index.html`: replace the current Sales page with Penjualan, add Report Harian page, update bottom navigation, add stock fields for category and condition.
- Modify `app.js`: add transaction model helpers, local date helper, safe render helpers, sale form rendering, daily report rendering, stock apply/revert logic, dashboard migration from reports to transactions.
- Modify `style.css`: replace dark glass theme with white-blue theme and add sale/report component styles.
- Modify `www/index.html`, `www/app.js`, `www/style.css`: keep these identical to root source before Android sync.
- Create `tests/igood-test-utils.mjs`: browser test helpers.
- Create `tests/penjualan-report-harian.test.mjs`: regression tests for the new flow.
- Modify `package.json`: add test scripts only; do not add runtime dependencies.

Because this workspace has no `.git` folder, replace commit steps with a checkpoint note and file hash check.

---

### Task 1: Add Browser Regression Test Harness

**Files:**
- Create: `tests/igood-test-utils.mjs`
- Create: `tests/penjualan-report-harian.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Create test helper module**

Create `tests/igood-test-utils.mjs`:

```js
import { chromium } from 'playwright';

export async function openIgoodPage() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  return { browser, page };
}

export async function closeIgoodPage(browser) {
  await browser.close();
}

export async function seedLocalStorage(page, data) {
  await page.evaluate((payload) => {
    for (const [key, value] of Object.entries(payload)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }, data);
}

export async function readLocalStorage(page, key) {
  return page.evaluate((storageKey) => JSON.parse(localStorage.getItem(storageKey) || '[]'), key);
}

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}
```

- [ ] **Step 2: Create failing end-to-end tests for the approved behavior**

Create `tests/penjualan-report-harian.test.mjs`:

```js
import {
  assert,
  closeIgoodPage,
  openIgoodPage,
  readLocalStorage,
  seedLocalStorage,
} from './igood-test-utils.mjs';

async function testUnitIphoneCreatesDailyReport() {
  const { browser, page } = await openIgoodPage();
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
  await page.selectOption('#salePaymentMethod', 'cash');
  await page.click('#btnSaveSale');

  const transactions = await readLocalStorage(page, 'igood_transactions');
  assert(transactions.length === 1, 'one transaction should be saved');
  assert(transactions[0].buyerName === 'Budi', 'buyer name should be saved');
  assert(transactions[0].buyerWa === '08123456789', 'buyer WA should be saved');

  await page.click('#bottomNav .nav-item[data-tab="page-daily-report"]');
  const reportText = await page.textContent('#dailyReportWhatsappText');
  assert(reportText.includes('UNIT IPHONE'), 'report should include Unit iPhone section');
  assert(reportText.includes('Budi | 08123456789'), 'report should show buyer and WA on one line');
  assert(!reportText.toLowerCase().includes('modal'), 'report should not show modal');
  assert(!reportText.toLowerCase().includes('profit'), 'report should not show profit');
  await closeIgoodPage(browser);
}

async function testSplitPaymentMustEqualSellPrice() {
  const { browser, page } = await openIgoodPage();
  await seedLocalStorage(page, {
    igood_device_stock: [{
      code: 'PB-IBX-I151-001',
      category: 'iphone',
      brand: 'Apple',
      model: 'iPhone 15',
      storage: '128GB',
      color: 'Blue',
      condition: 'New',
      cost: 9000000,
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
  await page.selectOption('#salePaymentMethod', 'split');
  await page.fill('#saleSplitCash', '300000');
  await page.fill('#saleSplitTransfer', '300000');
  await page.fill('#saleSplitCredit', '0');
  await page.click('#btnSaveSale');
  const transactions = await readLocalStorage(page, 'igood_transactions');
  assert(transactions.length === 0, 'invalid split payment should not save a transaction');
  const toastText = await page.textContent('#toastContainer');
  assert(toastText.includes('Split payment'), 'invalid split should show an error toast');
  await closeIgoodPage(browser);
}

async function testAccessoryOversellIsRejected() {
  const { browser, page } = await openIgoodPage();
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
  await page.click('#btnSaveSale');
  const transactions = await readLocalStorage(page, 'igood_transactions');
  const accessories = await readLocalStorage(page, 'igood_acc_stock');
  assert(transactions.length === 0, 'oversold accessory should not save a transaction');
  assert(accessories[0].qty === 1, 'stock should remain unchanged after rejected sale');
  await closeIgoodPage(browser);
}

async function testVoidTransactionRestoresStock() {
  const { browser, page } = await openIgoodPage();
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
  await page.click('#btnSaveSale');
  await page.click('#bottomNav .nav-item[data-tab="page-daily-report"]');
  await page.evaluate(() => { window.confirm = () => true; });
  await page.click('.btn-void-transaction');
  const transactions = await readLocalStorage(page, 'igood_transactions');
  const devices = await readLocalStorage(page, 'igood_device_stock');
  assert(transactions.length === 0, 'void should remove transaction');
  assert(devices[0].status === 'Available', 'void should restore unit stock');
  await closeIgoodPage(browser);
}

const tests = [
  testUnitIphoneCreatesDailyReport,
  testSplitPaymentMustEqualSellPrice,
  testAccessoryOversellIsRejected,
  testVoidTransactionRestoresStock,
];

for (const test of tests) {
  await test();
  console.log(`PASS ${test.name}`);
}
```

- [ ] **Step 3: Add npm test scripts**

Modify `package.json` scripts to include:

```json
{
  "scripts": {
    "sync": "npx cap sync",
    "open:android": "npx cap open android",
    "build:android": "npx cap sync android",
    "test:logic": "node tests/penjualan-report-harian.test.mjs"
  }
}
```

- [ ] **Step 4: Run test to verify it fails before implementation**

Run:

```powershell
$env:PW = Join-Path $env:TEMP 'igood-playwright-check\node_modules\playwright'
npm run test:logic
```

Expected before implementation: FAIL because selectors such as `[data-sale-type="unit_iphone"]`, `#saleBuyerName`, and `#dailyReportWhatsappText` do not exist.

- [ ] **Step 5: Checkpoint**

Run:

```powershell
Get-FileHash package.json,tests\igood-test-utils.mjs,tests\penjualan-report-harian.test.mjs
```

Expected: hashes are printed. No git commit is possible in this workspace.

---

### Task 2: Add Transaction Data Helpers and Local Date Logic

**Files:**
- Modify: `app.js`
- Modify: `www/app.js`
- Test: `tests/penjualan-report-harian.test.mjs`

- [ ] **Step 1: Add transaction storage key**

In `DB_KEYS`, add:

```js
transactions: 'igood_transactions',
```

- [ ] **Step 2: Replace UTC today helper with local date helper**

Replace:

```js
function today() { return new Date().toISOString().slice(0, 10); }
```

with:

```js
function today() {
    const dt = new Date();
    const year = dt.getFullYear();
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
```

- [ ] **Step 3: Add safe text and transaction helpers after `today()`**

Insert:

```js
function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[ch]));
}

function normalizePhoneWa(value) {
    return String(value || '').replace(/[^\d+]/g, '').trim();
}

function newTransactionId() {
    return `TRX-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function loadTransactions() {
    return load(DB_KEYS.transactions);
}

function saveTransactions(transactions) {
    save(DB_KEYS.transactions, transactions);
}

function paymentLabel(method) {
    if (method === 'cash') return 'Cash';
    if (method === 'transfer') return 'Transfer';
    if (method === 'kredit') return 'Kredit';
    if (method === 'split') return 'Split';
    return '-';
}

function paymentTotals(tx) {
    if (tx.paymentMethod === 'split') {
        return {
            cash: Number(tx.splitCash) || 0,
            transfer: Number(tx.splitTransfer) || 0,
            kredit: Number(tx.splitCredit) || 0,
        };
    }
    const sell = Number(tx.sell) || 0;
    return {
        cash: tx.paymentMethod === 'cash' ? sell : 0,
        transfer: tx.paymentMethod === 'transfer' ? sell : 0,
        kredit: tx.paymentMethod === 'kredit' ? sell : 0,
    };
}

function transactionPaymentTotal(tx) {
    const totals = paymentTotals(tx);
    return totals.cash + totals.transfer + totals.kredit;
}

function transactionCategoryLabel(category) {
    const labels = {
        unit_iphone: 'UNIT IPHONE',
        unit_android: 'UNIT ANDROID',
        accessory: 'AKSESORIS',
        service: 'SERVICE',
        other: 'LAIN-LAIN',
    };
    return labels[category] || 'LAIN-LAIN';
}
```

- [ ] **Step 4: Add duplicate-safe code sequence helper near code generators**

Insert before `nextDeviceCode`:

```js
function nextSequenceFromPrefix(existingCodes, prefix) {
    const maxSeq = existingCodes.reduce((max, code) => {
        if (!code || !code.startsWith(`${prefix}-`)) return max;
        const match = String(code).match(/-(\d+)$/);
        if (!match) return max;
        return Math.max(max, Number(match[1]) || 0);
    }, 0);
    return String(maxSeq + 1).padStart(3, '0');
}
```

Replace `nextDeviceCode`, `nextAccCode`, and `nextServiceCode` with:

```js
function nextDeviceCode(acquisition, warranty, model, storage, category = 'iphone', brand = '') {
    const acq = acquisition || 'PB';
    const war = warranty || 'INT';
    const mdl = category === 'android' ? androidModelToCode(brand, model) : modelToCode(model || '');
    const sto = storageMap[storage] || '0';
    const prefix = `${acq}-${war}-${mdl}${sto}`;
    const devices = load(DB_KEYS.devices);
    return `${prefix}-${nextSequenceFromPrefix(devices.map(d => d.code), prefix)}`;
}

function nextAccCode(category) {
    const accs = load(DB_KEYS.accessories);
    return category + nextSequenceFromPrefix(accs.map(a => a.code), category).slice(-3);
}

function nextServiceCode() {
    const svcs = load(DB_KEYS.serviceCatalog);
    return 'S' + nextSequenceFromPrefix(svcs.map(s => s.code), 'S').slice(-3);
}
```

- [ ] **Step 5: Fix iPhone SE and Android code mapping**

Replace `modelToCode` with:

```js
function modelToCode(modelStr) {
    const m = String(modelStr || '').trim();
    const lower = m.toLowerCase();
    if (m.startsWith('iPad')) {
        if (m.includes('Pro')) return 'PP';
        if (m.includes('Air')) return 'PA';
        if (m.includes('Mini')) return 'PM';
        return 'PD';
    }
    const seMatch = m.match(/iPhone\s+SE\s*(\d+)?/i);
    if (seMatch) return `ISE${seMatch[1] || ''}`;
    const match = m.match(/iPhone\s+(\d+)/i);
    if (!match) return 'I0';
    const num = match[1];
    if (lower.includes('pro max')) return `I${num}PM`;
    if (lower.includes('pro')) return `I${num}P`;
    if (lower.includes('plus')) return `I${num}L`;
    if (lower.includes('mini')) return `I${num}N`;
    return `I${num}`;
}

function androidModelToCode(brand, model) {
    const brandPart = String(brand || 'AND').replace(/[^a-z0-9]/gi, '').slice(0, 3).toUpperCase() || 'AND';
    const modelPart = String(model || 'UNIT').replace(/[^a-z0-9]/gi, '').slice(0, 5).toUpperCase() || 'UNIT';
    return `${brandPart}-${modelPart}`;
}
```

- [ ] **Step 6: Run tests**

Run:

```powershell
node --check app.js
$env:PW = Join-Path $env:TEMP 'igood-playwright-check\node_modules\playwright'
npm run test:logic
```

Expected after this task: `node --check` passes, browser test still fails because UI is not implemented.

- [ ] **Step 7: Mirror app.js to www**

Run after verifying root `app.js`:

```powershell
Copy-Item app.js www\app.js -Force
```

Expected: `Get-FileHash app.js,www\app.js` shows identical hashes.

---

### Task 3: Build Penjualan and Report Harian Page Shell

**Files:**
- Modify: `index.html`
- Modify: `www/index.html`
- Test: `tests/penjualan-report-harian.test.mjs`

- [ ] **Step 1: Replace the current `page-sales` contents with Penjualan shell**

In `index.html`, replace the full current `<main id="page-sales" class="page-content active">` block with:

```html
<main id="page-sales" class="page-content active">
    <div class="page-title-row">
        <div>
            <h2>Penjualan</h2>
            <p>Input transaksi sesuai kategori barang atau jasa.</p>
        </div>
    </div>

    <div class="card">
        <div class="form-grid">
            <div class="field">
                <label>Tanggal</label>
                <input type="date" id="saleDate" required>
            </div>
            <div class="field">
                <label>Shift</label>
                <select id="saleShift" required>
                    <option value="shift pagi & malam">Pagi & Malam</option>
                    <option value="shift pagi">Pagi</option>
                    <option value="shift malam">Malam</option>
                </select>
            </div>
        </div>
    </div>

    <div class="sales-tabs" role="tablist">
        <button type="button" class="sale-tab active" data-sale-type="unit_iphone">Unit iPhone</button>
        <button type="button" class="sale-tab" data-sale-type="unit_android">Unit Android</button>
        <button type="button" class="sale-tab" data-sale-type="accessory">Aksesoris</button>
        <button type="button" class="sale-tab" data-sale-type="service">Service</button>
        <button type="button" class="sale-tab" data-sale-type="other">Lain-lain</button>
    </div>

    <div id="salesFormMount"></div>
</main>
```

- [ ] **Step 2: Add Report Harian page after Penjualan page**

Insert after `</main>` for `page-sales`:

```html
<section id="page-daily-report" class="page-content">
    <div class="page-title-row">
        <div>
            <h2>Report Harian</h2>
            <p>Rekap otomatis dari transaksi penjualan tersimpan.</p>
        </div>
    </div>

    <div class="card">
        <div class="form-grid">
            <div class="field">
                <label>Tanggal</label>
                <input type="date" id="dailyReportDate">
            </div>
            <div class="field">
                <label>Shift</label>
                <select id="dailyReportShift">
                    <option value="all">Semua Shift</option>
                    <option value="shift pagi & malam">Pagi & Malam</option>
                    <option value="shift pagi">Pagi</option>
                    <option value="shift malam">Malam</option>
                </select>
            </div>
        </div>
    </div>

    <div id="dailyReportSummary" class="report-summary-grid"></div>

    <div class="card">
        <div class="card-head">
            <h2><i class="ri-whatsapp-line"></i> Teks WhatsApp</h2>
            <span class="badge badge-ok">Auto</span>
        </div>
        <div class="wa-preview" id="dailyReportWhatsappText"></div>
        <button type="button" id="btnCopyDailyReportWa" class="btn btn-primary">
            <i class="ri-file-copy-line"></i> Copy Report WA
        </button>
    </div>

    <div class="card">
        <div class="card-head">
            <h2><i class="ri-list-check-2"></i> Data Transaksi</h2>
        </div>
        <div id="dailyReportTransactionList" class="transaction-list"></div>
    </div>
</section>
```

- [ ] **Step 3: Update bottom navigation**

Replace current bottom nav with:

```html
<nav id="bottomNav" class="bottom-nav sales-only">
    <button class="nav-item active" data-tab="page-sales"><i class="ri-shopping-bag-3-line"></i><span>Penjualan</span></button>
    <button class="nav-item" data-tab="page-daily-report"><i class="ri-whatsapp-line"></i><span>Report</span></button>
    <button class="nav-item" data-tab="page-dashboard"><i class="ri-dashboard-3-line"></i><span>Dashboard</span></button>
    <button class="nav-item" data-tab="page-admin"><i class="ri-settings-4-line"></i><span>Admin</span></button>
</nav>
```

- [ ] **Step 4: Mirror HTML to www**

Run:

```powershell
Copy-Item index.html www\index.html -Force
```

- [ ] **Step 5: Run tests**

Run:

```powershell
node --check app.js
$env:PW = Join-Path $env:TEMP 'igood-playwright-check\node_modules\playwright'
npm run test:logic
```

Expected after this task: tests fail because sales form behavior is not implemented yet, but selectors for navigation and page shells exist.

---

### Task 4: Implement Penjualan Form Rendering and Save Flow

**Files:**
- Modify: `app.js`
- Modify: `www/app.js`
- Test: `tests/penjualan-report-harian.test.mjs`

- [ ] **Step 1: Add active sale type state near repeater state**

Add near current page state variables:

```js
let activeSaleType = 'unit_iphone';
```

- [ ] **Step 2: Add sale form renderer functions**

Insert before the old repeater form section:

```js
function availableUnitsByCategory(category) {
    return load(DB_KEYS.devices).filter(d => d.status === 'Available' && (d.category || 'iphone') === category);
}

function renderBuyerFields() {
    return `
        <div class="form-grid">
            <div class="field"><label>Nama Pembeli</label><input type="text" id="saleBuyerName" placeholder="Nama pembeli" required></div>
            <div class="field"><label>No. WA Pembeli</label><input type="tel" id="saleBuyerWa" placeholder="08xxxxxxxxxx" required></div>
        </div>`;
}

function renderPaymentFields() {
    return `
        <div class="form-grid">
            <div class="field"><label>Harga Jual Rp</label><input type="number" id="saleSellPrice" min="0" placeholder="Harga jual" required></div>
            <div class="field"><label>Bayar</label><select id="salePaymentMethod"><option value="cash">Cash</option><option value="transfer">Transfer</option><option value="kredit">Kredit</option><option value="split">Split</option></select></div>
        </div>
        <div class="split-row" id="saleSplitPanel">
            <div class="field"><label>Cash Rp</label><input type="number" id="saleSplitCash" min="0" value="0"></div>
            <div class="field"><label>Transfer Rp</label><input type="number" id="saleSplitTransfer" min="0" value="0"></div>
            <div class="field"><label>Kredit Rp</label><input type="number" id="saleSplitCredit" min="0" value="0"></div>
        </div>`;
}

function renderUnitSaleForm(category) {
    const units = availableUnitsByCategory(category);
    const options = units.map(d => `<option value="${esc(d.code)}">${esc(d.code)} | ${esc(d.model)} ${esc(d.storage)} ${esc(d.condition || '')}</option>`).join('');
    const emptyOption = units.length ? '<option value="">Pilih unit ready</option>' : '<option value="">Tidak ada stok ready</option>';
    document.getElementById('salesFormMount').innerHTML = `
        <div class="card">
            <div class="card-head"><h2>${category === 'iphone' ? 'Unit iPhone' : 'Unit Android'}</h2></div>
            ${renderBuyerFields()}
            <div class="form-grid">
                <div class="field"><label>Kode Unit</label><select id="saleUnitCode">${emptyOption}${options}</select></div>
                <div class="field"><label>Detail Unit</label><input type="text" id="saleItemName" readonly></div>
            </div>
            ${renderPaymentFields()}
            <button type="button" id="btnSaveSale" class="btn btn-primary"><i class="ri-save-3-line"></i> Simpan Penjualan</button>
        </div>`;
    bindSaleFormEvents();
    updateSelectedUnitDetail();
}

function renderAccessorySaleForm() {
    const accs = load(DB_KEYS.accessories).filter(a => a.qty > 0);
    const options = accs.map(a => `<option value="${esc(a.code)}">${esc(a.code)} | ${esc(a.name)} | Stok ${esc(a.qty)}</option>`).join('');
    document.getElementById('salesFormMount').innerHTML = `
        <div class="card">
            <div class="card-head"><h2>Aksesoris</h2></div>
            ${renderBuyerFields()}
            <div class="form-grid">
                <div class="field"><label>Kode Aksesoris</label><select id="saleAccessoryCode"><option value="">Pilih aksesoris</option>${options}</select></div>
                <div class="field"><label>Qty</label><input type="number" id="saleQuantity" min="1" value="1"></div>
            </div>
            <div class="field"><label>Nama Aksesoris</label><input type="text" id="saleItemName" readonly></div>
            ${renderPaymentFields()}
            <button type="button" id="btnSaveSale" class="btn btn-primary"><i class="ri-save-3-line"></i> Simpan Penjualan</button>
        </div>`;
    bindSaleFormEvents();
    updateSelectedAccessoryDetail();
}

function renderServiceSaleForm() {
    const svcs = load(DB_KEYS.serviceCatalog);
    const techs = load(DB_KEYS.technicians);
    const svcOptions = svcs.map(s => `<option value="${esc(s.code)}">${esc(s.code)} | ${esc(s.name)}</option>`).join('');
    const techOptions = techs.map(t => `<option value="${esc(t.name)}">${esc(t.name)}</option>`).join('');
    document.getElementById('salesFormMount').innerHTML = `
        <div class="card">
            <div class="card-head"><h2>Service</h2></div>
            ${renderBuyerFields()}
            <div class="form-grid">
                <div class="field"><label>Kode Service</label><select id="saleServiceCode"><option value="">Pilih service</option>${svcOptions}</select></div>
                <div class="field"><label>Teknisi</label><select id="saleTechnician"><option value="">Pilih teknisi</option>${techOptions}</select></div>
            </div>
            <div class="field"><label>Nama Service</label><input type="text" id="saleItemName" readonly></div>
            <input type="hidden" id="saleServiceFee" value="0">
            ${renderPaymentFields()}
            <button type="button" id="btnSaveSale" class="btn btn-primary"><i class="ri-save-3-line"></i> Simpan Penjualan</button>
        </div>`;
    bindSaleFormEvents();
    updateSelectedServiceDetail();
}

function renderOtherSaleForm() {
    document.getElementById('salesFormMount').innerHTML = `
        <div class="card">
            <div class="card-head"><h2>Lain-lain</h2></div>
            ${renderBuyerFields()}
            <div class="field"><label>Keterangan</label><input type="text" id="saleItemName" placeholder="Keterangan penjualan"></div>
            ${renderPaymentFields()}
            <button type="button" id="btnSaveSale" class="btn btn-primary"><i class="ri-save-3-line"></i> Simpan Penjualan</button>
        </div>`;
    bindSaleFormEvents();
}
```

- [ ] **Step 3: Add selected item detail binders**

Insert after renderers:

```js
function updateSelectedUnitDetail() {
    const code = document.getElementById('saleUnitCode')?.value || '';
    const unit = load(DB_KEYS.devices).find(d => d.code === code);
    const nameInput = document.getElementById('saleItemName');
    const priceInput = document.getElementById('saleSellPrice');
    if (!nameInput) return;
    if (!unit) {
        nameInput.value = '';
        return;
    }
    nameInput.value = `${unit.model || ''} ${unit.storage || ''} ${unit.color || ''} ${unit.condition || ''}`.trim();
    if (priceInput && !priceInput.value) priceInput.value = unit.sell || unit.soldPrice || '';
}

function updateSelectedAccessoryDetail() {
    const code = document.getElementById('saleAccessoryCode')?.value || '';
    const acc = load(DB_KEYS.accessories).find(a => a.code === code);
    const nameInput = document.getElementById('saleItemName');
    const priceInput = document.getElementById('saleSellPrice');
    if (!nameInput) return;
    if (!acc) {
        nameInput.value = '';
        return;
    }
    nameInput.value = acc.name || '';
    if (priceInput && !priceInput.value) priceInput.value = acc.sell || '';
}

function updateSelectedServiceDetail() {
    const code = document.getElementById('saleServiceCode')?.value || '';
    const svc = load(DB_KEYS.serviceCatalog).find(s => s.code === code);
    const nameInput = document.getElementById('saleItemName');
    const priceInput = document.getElementById('saleSellPrice');
    const feeInput = document.getElementById('saleServiceFee');
    if (!nameInput) return;
    if (!svc) {
        nameInput.value = '';
        if (feeInput) feeInput.value = '0';
        return;
    }
    nameInput.value = svc.name || '';
    if (priceInput && !priceInput.value) priceInput.value = svc.sell || '';
    if (feeInput) feeInput.value = svc.cost || 0;
}

function toggleSplitPanel() {
    const payment = document.getElementById('salePaymentMethod')?.value;
    document.getElementById('saleSplitPanel')?.classList.toggle('show', payment === 'split');
}
```

- [ ] **Step 4: Add sale form event binding**

Insert:

```js
function bindSaleFormEvents() {
    document.getElementById('saleUnitCode')?.addEventListener('change', updateSelectedUnitDetail);
    document.getElementById('saleAccessoryCode')?.addEventListener('change', updateSelectedAccessoryDetail);
    document.getElementById('saleServiceCode')?.addEventListener('change', updateSelectedServiceDetail);
    document.getElementById('salePaymentMethod')?.addEventListener('change', toggleSplitPanel);
    document.getElementById('btnSaveSale')?.addEventListener('click', saveCurrentSale);
    toggleSplitPanel();
}

function renderActiveSaleForm() {
    if (activeSaleType === 'unit_iphone') renderUnitSaleForm('iphone');
    if (activeSaleType === 'unit_android') renderUnitSaleForm('android');
    if (activeSaleType === 'accessory') renderAccessorySaleForm();
    if (activeSaleType === 'service') renderServiceSaleForm();
    if (activeSaleType === 'other') renderOtherSaleForm();
}

document.querySelectorAll('.sale-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.sale-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        activeSaleType = tab.dataset.saleType;
        renderActiveSaleForm();
    });
});
```

- [ ] **Step 5: Add transaction validation, stock apply, and save**

Insert:

```js
function collectCurrentSale() {
    const sell = Number(document.getElementById('saleSellPrice')?.value) || 0;
    const paymentMethod = document.getElementById('salePaymentMethod')?.value || 'cash';
    const tx = {
        id: newTransactionId(),
        date: document.getElementById('saleDate')?.value || today(),
        shift: document.getElementById('saleShift')?.value || 'shift pagi & malam',
        category: activeSaleType,
        code: '',
        itemName: (document.getElementById('saleItemName')?.value || '').trim(),
        condition: '',
        buyerName: (document.getElementById('saleBuyerName')?.value || '').trim(),
        buyerWa: normalizePhoneWa(document.getElementById('saleBuyerWa')?.value || ''),
        quantity: Number(document.getElementById('saleQuantity')?.value) || 1,
        sell,
        cost: 0,
        fee: 0,
        paymentMethod,
        splitCash: Number(document.getElementById('saleSplitCash')?.value) || 0,
        splitTransfer: Number(document.getElementById('saleSplitTransfer')?.value) || 0,
        splitCredit: Number(document.getElementById('saleSplitCredit')?.value) || 0,
        stockRefCode: '',
        createdAt: new Date().toISOString(),
    };

    if (activeSaleType === 'unit_iphone' || activeSaleType === 'unit_android') {
        const unit = load(DB_KEYS.devices).find(d => d.code === document.getElementById('saleUnitCode')?.value);
        if (unit) {
            tx.code = unit.code;
            tx.itemName = `${unit.model || ''} ${unit.storage || ''} ${unit.color || ''} ${unit.condition || ''}`.trim();
            tx.condition = unit.condition || '';
            tx.cost = Number(unit.cost) || 0;
            tx.stockRefCode = unit.code;
        }
    }

    if (activeSaleType === 'accessory') {
        const acc = load(DB_KEYS.accessories).find(a => a.code === document.getElementById('saleAccessoryCode')?.value);
        if (acc) {
            tx.code = acc.code;
            tx.itemName = acc.name || '';
            tx.cost = (Number(acc.cost) || 0) * tx.quantity;
            tx.sell = sell * tx.quantity;
            tx.stockRefCode = acc.code;
        }
    }

    if (activeSaleType === 'service') {
        const svc = load(DB_KEYS.serviceCatalog).find(s => s.code === document.getElementById('saleServiceCode')?.value);
        if (svc) {
            tx.code = svc.code;
            tx.itemName = svc.name || '';
            tx.fee = Number(document.getElementById('saleServiceFee')?.value) || 0;
            tx.technician = document.getElementById('saleTechnician')?.value || '';
        }
    }

    return tx;
}

function validateTransaction(tx) {
    if (!tx.date) return 'Tanggal wajib diisi';
    if (!tx.buyerName) return 'Nama pembeli wajib diisi';
    if (!tx.buyerWa) return 'No. WA pembeli wajib diisi';
    if (!tx.itemName) return 'Item penjualan wajib diisi';
    if (tx.sell <= 0) return 'Harga jual wajib lebih dari 0';
    if (tx.paymentMethod === 'split' && transactionPaymentTotal(tx) !== tx.sell) return 'Split payment harus sama dengan harga jual';
    if ((tx.category === 'unit_iphone' || tx.category === 'unit_android') && !tx.stockRefCode) return 'Pilih unit dari stok ready';
    if (tx.category === 'accessory') {
        const acc = load(DB_KEYS.accessories).find(a => a.code === tx.stockRefCode);
        if (!acc) return 'Pilih aksesoris dari stok';
        if (tx.quantity > (Number(acc.qty) || 0)) return `Stok aksesoris hanya ${acc.qty}`;
    }
    return '';
}

function applyTransactionStock(tx) {
    if (tx.category === 'unit_iphone' || tx.category === 'unit_android') {
        const devices = load(DB_KEYS.devices);
        const unit = devices.find(d => d.code === tx.stockRefCode);
        if (unit) {
            unit.status = 'Sold';
            unit.soldDate = tx.date;
            unit.soldPrice = tx.sell;
        }
        save(DB_KEYS.devices, devices);
    }
    if (tx.category === 'accessory') {
        const accs = load(DB_KEYS.accessories);
        const acc = accs.find(a => a.code === tx.stockRefCode);
        if (acc) acc.qty = Math.max(0, (Number(acc.qty) || 0) - tx.quantity);
        save(DB_KEYS.accessories, accs);
    }
}

function saveCurrentSale() {
    const tx = collectCurrentSale();
    const error = validateTransaction(tx);
    if (error) {
        toast(error, 'err');
        return;
    }
    const transactions = loadTransactions();
    transactions.push(tx);
    saveTransactions(transactions);
    applyTransactionStock(tx);
    toast('Penjualan berhasil disimpan');
    renderActiveSaleForm();
    renderDailyReport();
}
```

- [ ] **Step 6: Initialize sale page**

After setting default dates, add:

```js
document.getElementById('saleDate').value = today();
document.getElementById('dailyReportDate').value = today();
renderActiveSaleForm();
```

- [ ] **Step 7: Run tests**

Run:

```powershell
node --check app.js
$env:PW = Join-Path $env:TEMP 'igood-playwright-check\node_modules\playwright'
npm run test:logic
```

Expected after this task: tests for saving sale, split validation, and accessory oversell pass; Report Harian and void tests still fail if report rendering is not implemented.

- [ ] **Step 8: Mirror app.js to www**

Run:

```powershell
Copy-Item app.js www\app.js -Force
```

---

### Task 5: Implement Report Harian Rendering, WhatsApp Text, and Void

**Files:**
- Modify: `app.js`
- Modify: `www/app.js`
- Test: `tests/penjualan-report-harian.test.mjs`

- [ ] **Step 1: Add report filtering helpers**

Insert before Dashboard section:

```js
function getDailyReportTransactions() {
    const date = document.getElementById('dailyReportDate')?.value || today();
    const shift = document.getElementById('dailyReportShift')?.value || 'all';
    return loadTransactions()
        .filter(tx => tx.date === date)
        .filter(tx => shift === 'all' || tx.shift === shift)
        .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
}

function groupTransactionsByCategory(transactions) {
    return transactions.reduce((grouped, tx) => {
        if (!grouped[tx.category]) grouped[tx.category] = [];
        grouped[tx.category].push(tx);
        return grouped;
    }, {});
}

function reportTotals(transactions) {
    return transactions.reduce((totals, tx) => {
        const payment = paymentTotals(tx);
        totals.cash += payment.cash;
        totals.transfer += payment.transfer;
        totals.kredit += payment.kredit;
        totals.grand += payment.cash + payment.transfer + payment.kredit;
        return totals;
    }, { cash: 0, transfer: 0, kredit: 0, grand: 0 });
}
```

- [ ] **Step 2: Add WhatsApp text generator**

Insert:

```js
function buildDailyReportWhatsappText(transactions) {
    const date = document.getElementById('dailyReportDate')?.value || today();
    const shift = document.getElementById('dailyReportShift')?.value || 'all';
    const groups = groupTransactionsByCategory(transactions);
    const order = ['unit_iphone', 'unit_android', 'accessory', 'service', 'other'];
    const lines = [];
    lines.push('*LAPORAN HARIAN IGOOD*');
    lines.push(`Tanggal: ${fmtDate(date)}`);
    lines.push(`Shift: ${shift === 'all' ? 'Semua Shift' : shift}`);

    order.forEach(category => {
        const items = groups[category] || [];
        if (!items.length) return;
        lines.push('');
        lines.push(`*${transactionCategoryLabel(category)}*`);
        items.forEach((tx, index) => {
            const qtyText = tx.category === 'accessory' ? ` x${tx.quantity}` : '';
            const conditionText = tx.condition ? ` ${tx.condition}` : '';
            lines.push(`${index + 1}. ${tx.code || '-'} | ${tx.itemName}${conditionText}${qtyText}`);
            lines.push(`   ${tx.buyerName || '-'} | ${tx.buyerWa || '-'}`);
            lines.push(`   Jual: ${fmtRp(tx.sell)}`);
            lines.push(`   Bayar: ${paymentLabel(tx.paymentMethod)}`);
        });
    });

    const totals = reportTotals(transactions);
    lines.push('');
    lines.push('*TOTAL*');
    lines.push(`Cash: ${fmtRp(totals.cash)}`);
    lines.push(`Transfer: ${fmtRp(totals.transfer)}`);
    lines.push(`Kredit: ${fmtRp(totals.kredit)}`);
    lines.push(`Grand Total: ${fmtRp(totals.grand)}`);
    return lines.join('\n');
}
```

- [ ] **Step 3: Add stock revert logic and void transaction**

Insert:

```js
function revertTransactionStock(tx) {
    if (tx.category === 'unit_iphone' || tx.category === 'unit_android') {
        const devices = load(DB_KEYS.devices);
        const unit = devices.find(d => d.code === tx.stockRefCode);
        if (unit) {
            unit.status = 'Available';
            delete unit.soldDate;
            delete unit.soldPrice;
        }
        save(DB_KEYS.devices, devices);
    }
    if (tx.category === 'accessory') {
        const accs = load(DB_KEYS.accessories);
        const acc = accs.find(a => a.code === tx.stockRefCode);
        if (acc) acc.qty = (Number(acc.qty) || 0) + (Number(tx.quantity) || 0);
        save(DB_KEYS.accessories, accs);
    }
}

window.voidTransaction = function (id) {
    if (!confirm('Hapus transaksi dan kembalikan stok?')) return;
    const transactions = loadTransactions();
    const tx = transactions.find(item => item.id === id);
    if (tx) revertTransactionStock(tx);
    saveTransactions(transactions.filter(item => item.id !== id));
    renderDailyReport();
    renderActiveSaleForm();
    refreshAllAdminPanels();
    toast('Transaksi dibatalkan');
};
```

- [ ] **Step 4: Add daily report renderer**

Insert:

```js
function renderDailyReport() {
    const transactions = getDailyReportTransactions();
    const totals = reportTotals(transactions);
    document.getElementById('dailyReportSummary').innerHTML = `
        <div class="metric"><div class="metric-data"><h4>Cash</h4><div class="val">${fmtRp(totals.cash)}</div></div></div>
        <div class="metric"><div class="metric-data"><h4>Transfer</h4><div class="val">${fmtRp(totals.transfer)}</div></div></div>
        <div class="metric"><div class="metric-data"><h4>Kredit</h4><div class="val">${fmtRp(totals.kredit)}</div></div></div>
        <div class="metric"><div class="metric-data"><h4>Total</h4><div class="val">${fmtRp(totals.grand)}</div></div></div>`;
    document.getElementById('dailyReportWhatsappText').textContent = buildDailyReportWhatsappText(transactions);

    const list = document.getElementById('dailyReportTransactionList');
    if (!transactions.length) {
        list.innerHTML = '<div class="empty-state">Belum ada transaksi pada filter ini.</div>';
        return;
    }
    list.innerHTML = transactions.map(tx => `
        <div class="transaction-item">
            <div>
                <strong>${esc(transactionCategoryLabel(tx.category))}</strong>
                <p>${esc(tx.code || '-')} | ${esc(tx.itemName)}</p>
                <p>${esc(tx.buyerName)} | ${esc(tx.buyerWa)}</p>
            </div>
            <div class="transaction-actions">
                <span>${fmtRp(tx.sell)}</span>
                <button type="button" class="btn-del btn-void-transaction" onclick="voidTransaction('${esc(tx.id)}')"><i class="ri-delete-bin-6-line"></i></button>
            </div>
        </div>`).join('');
}
```

- [ ] **Step 5: Bind report controls**

Insert near other event listeners:

```js
document.getElementById('dailyReportDate')?.addEventListener('change', renderDailyReport);
document.getElementById('dailyReportShift')?.addEventListener('change', renderDailyReport);
document.getElementById('btnCopyDailyReportWa')?.addEventListener('click', () => {
    const text = document.getElementById('dailyReportWhatsappText').textContent;
    navigator.clipboard.writeText(text).then(() => toast('Report WA berhasil disalin'));
});
```

Update `switchPage(tabId)`:

```js
if (tabId === 'page-daily-report') renderDailyReport();
```

- [ ] **Step 6: Run tests**

Run:

```powershell
node --check app.js
$env:PW = Join-Path $env:TEMP 'igood-playwright-check\node_modules\playwright'
npm run test:logic
```

Expected after this task: all tests in `penjualan-report-harian.test.mjs` pass.

- [ ] **Step 7: Mirror app.js to www**

Run:

```powershell
Copy-Item app.js www\app.js -Force
```

---

### Task 6: Update Admin Stock for iPhone, Android, and Condition

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `www/index.html`
- Modify: `www/app.js`
- Test: `tests/penjualan-report-harian.test.mjs`

- [ ] **Step 1: Add stock category, brand, and condition fields in Admin device form**

In `index.html`, add these fields inside `newDeviceStockForm` before the model field:

```html
<div class="form-grid">
    <div class="field">
        <label>Kategori Unit</label>
        <select id="stockDeviceCategory" required>
            <option value="iphone">Unit iPhone</option>
            <option value="android">Unit Android</option>
        </select>
    </div>
    <div class="field">
        <label>Kondisi</label>
        <select id="stockDeviceCondition" required>
            <option value="New">New</option>
            <option value="Bekas">Bekas</option>
        </select>
    </div>
</div>
<div class="field">
    <label>Brand</label>
    <input type="text" id="stockDeviceBrand" placeholder="Apple / Samsung / Xiaomi">
</div>
```

- [ ] **Step 2: Update submit new device logic**

In `newDeviceStockForm` submit handler, read new fields:

```js
const category = document.getElementById('stockDeviceCategory').value;
const condition = document.getElementById('stockDeviceCondition').value;
const brand = document.getElementById('stockDeviceBrand').value.trim() || (category === 'iphone' ? 'Apple' : '');
```

Replace code generation:

```js
const code = manualCode || nextDeviceCode(acq, warranty, model, storage, category, brand);
```

Add properties to device:

```js
category, brand, condition,
```

- [ ] **Step 3: Update renderDeviceStock table labels**

In `renderDeviceStock()`, use escaped values and include category/condition in the model cell:

```js
<td>${esc(d.brand || '')} ${esc(d.model)} ${esc(d.storage)} ${esc(d.color)} <span class="badge badge-info">${esc(d.condition || '-')}</span></td>
```

Use escaped delete button argument:

```js
<td><button class="btn-del" onclick="deleteDevice('${esc(d.code)}')"><i class="ri-delete-bin-6-line"></i></button></td>
```

- [ ] **Step 4: Mirror HTML and JS to www**

Run:

```powershell
Copy-Item index.html www\index.html -Force
Copy-Item app.js www\app.js -Force
```

- [ ] **Step 5: Run tests**

Run:

```powershell
node --check app.js
$env:PW = Join-Path $env:TEMP 'igood-playwright-check\node_modules\playwright'
npm run test:logic
```

Expected: tests pass and Android unit stock can be seeded and sold.

---

### Task 7: Migrate Dashboard and Legacy Reports to Transactions

**Files:**
- Modify: `app.js`
- Modify: `www/app.js`

- [ ] **Step 1: Add transaction source helper for dashboard**

Insert:

```js
function dashboardTransactionsForRange(range) {
    let transactions = loadTransactions();
    if (!transactions.length) {
        transactions = legacyReportsToTransactions(load(DB_KEYS.reports));
    }
    if (range === 'today') {
        transactions = transactions.filter(tx => tx.date === today());
    } else if (range === '7days') {
        const d7Date = new Date();
        d7Date.setDate(d7Date.getDate() - 7);
        const d7 = `${d7Date.getFullYear()}-${String(d7Date.getMonth() + 1).padStart(2, '0')}-${String(d7Date.getDate()).padStart(2, '0')}`;
        transactions = transactions.filter(tx => tx.date >= d7);
    } else if (range === 'month') {
        const month = today().slice(0, 7);
        transactions = transactions.filter(tx => tx.date?.startsWith(month));
    }
    return transactions;
}

function legacyReportsToTransactions(reports) {
    const transactions = [];
    reports.forEach(report => {
        (report.units || []).forEach(item => transactions.push({
            id: `LEG-${report.id}-U-${transactions.length}`,
            date: report.date,
            shift: report.shift,
            category: 'unit_iphone',
            code: item.code,
            itemName: item.model,
            condition: '',
            buyerName: '-',
            buyerWa: '-',
            quantity: 1,
            sell: item.sell || 0,
            cost: item.cost || 0,
            fee: 0,
            paymentMethod: item.pay || 'cash',
            splitCash: item.splitCash || 0,
            splitTransfer: item.splitTf || 0,
            splitCredit: item.splitKr || 0,
            createdAt: report.createdAt,
        }));
        (report.accs || []).forEach(item => transactions.push({
            id: `LEG-${report.id}-A-${transactions.length}`,
            date: report.date,
            shift: report.shift,
            category: 'accessory',
            code: item.code,
            itemName: item.name,
            condition: '',
            buyerName: '-',
            buyerWa: '-',
            quantity: item.qty || 1,
            sell: item.sell || 0,
            cost: item.cost || 0,
            fee: 0,
            paymentMethod: item.pay || 'cash',
            createdAt: report.createdAt,
        }));
        (report.services || []).forEach(item => transactions.push({
            id: `LEG-${report.id}-S-${transactions.length}`,
            date: report.date,
            shift: report.shift,
            category: 'service',
            code: item.code,
            itemName: item.name,
            condition: '',
            buyerName: '-',
            buyerWa: '-',
            quantity: 1,
            sell: item.sell || 0,
            cost: 0,
            fee: item.fee || 0,
            technician: item.tech || '',
            paymentMethod: item.pay || 'cash',
            createdAt: report.createdAt,
        }));
        (report.others || []).forEach(item => transactions.push({
            id: `LEG-${report.id}-O-${transactions.length}`,
            date: report.date,
            shift: report.shift,
            category: 'other',
            code: '',
            itemName: item.name,
            condition: '',
            buyerName: '-',
            buyerWa: '-',
            quantity: 1,
            sell: item.sell || 0,
            cost: 0,
            fee: 0,
            paymentMethod: item.pay || 'cash',
            createdAt: report.createdAt,
        }));
    });
    return transactions;
}
```

- [ ] **Step 2: Update `refreshDashboard()` to use transactions**

Inside `refreshDashboard()`, replace:

```js
let reports = load(DB_KEYS.reports);
```

and range filtering with:

```js
const transactions = dashboardTransactionsForRange(range);
```

Replace the current `reports.forEach` aggregation block inside `refreshDashboard()` with:

```js
transactions.forEach(tx => {
    const totals = paymentTotals(tx);
    const revenue = totals.cash + totals.transfer + totals.kredit;
    totalRev += revenue;
    payCash += totals.cash;
    payTf += totals.transfer;
    payKredit += totals.kredit;
    const dateKey = tx.date || 'unknown';
    dailyMap[dateKey] = (dailyMap[dateKey] || 0) + revenue;

    if (tx.category === 'unit_iphone' || tx.category === 'unit_android') {
        catUnit += revenue;
        totalCOGS += tx.cost || 0;
    } else if (tx.category === 'accessory') {
        catAcc += revenue;
        totalCOGS += tx.cost || 0;
    } else if (tx.category === 'service') {
        catSvc += revenue;
        totalCOGS += tx.fee || 0;
        if (tx.technician) {
            if (!techMap[tx.technician]) techMap[tx.technician] = { jobs: 0, revenue: 0, fee: 0 };
            techMap[tx.technician].jobs++;
            techMap[tx.technician].revenue += revenue;
            techMap[tx.technician].fee += tx.fee || 0;
        }
    } else {
        catOth += revenue;
    }
});
```

- [ ] **Step 3: Run checks**

Run:

```powershell
node --check app.js
$env:PW = Join-Path $env:TEMP 'igood-playwright-check\node_modules\playwright'
npm run test:logic
```

Expected: tests pass.

- [ ] **Step 4: Mirror app.js to www**

Run:

```powershell
Copy-Item app.js www\app.js -Force
```

---

### Task 8: Apply White-Blue UI Theme

**Files:**
- Modify: `style.css`
- Modify: `www/style.css`
- Test: browser screenshot

- [ ] **Step 1: Replace root color variables**

In `style.css`, replace `:root` color values with:

```css
:root {
    --font-main: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --bg-base: #f5f9ff;
    --bg-surface: #ffffff;
    --bg-card: #f8fbff;
    --bg-card-hover: #eef6ff;
    --bg-input: #ffffff;
    --border: #d8e6f7;
    --border-focus: #2563eb;
    --primary: #2563eb;
    --primary-light: #3b82f6;
    --primary-glow: rgba(37, 99, 235, 0.10);
    --primary-shadow: rgba(37, 99, 235, 0.22);
    --success: #059669;
    --success-glow: rgba(5, 150, 105, 0.10);
    --warning: #d97706;
    --warning-glow: rgba(217, 119, 6, 0.10);
    --danger: #dc2626;
    --danger-glow: rgba(220, 38, 38, 0.10);
    --info: #0284c7;
    --info-glow: rgba(2, 132, 199, 0.10);
    --text: #0f172a;
    --text-secondary: #475569;
    --text-dim: #64748b;
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --r-sm: 8px;
    --r-md: 12px;
    --r-lg: 16px;
    --r-xl: 20px;
    --shadow-sm: 0 2px 8px rgba(15, 23, 42, 0.06);
    --shadow-md: 0 8px 24px rgba(15, 23, 42, 0.08);
    --shadow-lg: 0 18px 44px rgba(15, 23, 42, 0.12);
    --shadow-glow: 0 0 0 rgba(37, 99, 235, 0);
}
```

- [ ] **Step 2: Replace dark body/header/nav styling**

Set:

```css
body {
    font-family: var(--font-main);
    background: var(--bg-base);
    color: var(--text);
    line-height: 1.6;
    min-height: 100vh;
    min-height: 100dvh;
    overflow-x: hidden;
    padding-top: var(--safe-top);
    padding-bottom: calc(74px + var(--safe-bottom));
}

.app-header {
    background: rgba(255, 255, 255, 0.94);
    border-bottom: 1px solid var(--border);
    box-shadow: var(--shadow-sm);
}

.brand-icon {
    background: var(--primary);
    border-radius: 10px;
    box-shadow: 0 6px 18px var(--primary-shadow);
}

.brand-text h1 {
    background: none;
    -webkit-text-fill-color: var(--text);
    color: var(--text);
}

.bottom-nav {
    background: rgba(255, 255, 255, 0.96);
    border-top: 1px solid var(--border);
    box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.08);
}
```

- [ ] **Step 3: Add sales/report component styles**

Append before utility helpers:

```css
.page-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
}

.page-title-row h2 {
    font-size: 22px;
    line-height: 1.2;
    color: var(--text);
}

.page-title-row p {
    color: var(--text-secondary);
    font-size: 13px;
}

.sales-tabs {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding: 2px 0 12px;
}

.sale-tab {
    border: 1px solid var(--border);
    background: #fff;
    color: var(--text-secondary);
    border-radius: 999px;
    padding: 9px 12px;
    font: 700 12px var(--font-main);
    white-space: nowrap;
}

.sale-tab.active {
    background: var(--primary);
    border-color: var(--primary);
    color: #fff;
    box-shadow: 0 8px 20px var(--primary-shadow);
}

.report-summary-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 14px;
}

.transaction-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.transaction-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: var(--r-md);
    background: var(--bg-card);
}

.transaction-item p {
    margin-top: 2px;
    color: var(--text-secondary);
    font-size: 12px;
}

.transaction-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: right;
    font-weight: 800;
}

.empty-state {
    padding: 18px;
    text-align: center;
    color: var(--text-secondary);
    border: 1px dashed var(--border);
    border-radius: var(--r-md);
    background: var(--bg-card);
}
```

- [ ] **Step 4: Adjust preview panel for white-blue theme**

Replace `.wa-preview` block with:

```css
.wa-preview {
    background: #f8fbff;
    border: 1px solid var(--border);
    border-left: 4px solid var(--primary);
    border-radius: var(--r-md);
    padding: 14px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
    color: #0f5132;
    white-space: pre-wrap;
    overflow-x: auto;
    max-height: 360px;
    user-select: text;
    -webkit-user-select: text;
}
```

- [ ] **Step 5: Mirror CSS to www**

Run:

```powershell
Copy-Item style.css www\style.css -Force
```

- [ ] **Step 6: Take visual screenshot**

Run:

```powershell
$env:PW = Join-Path $env:TEMP 'igood-playwright-check\node_modules\playwright'
node -e "const { chromium } = require(process.env.PW); (async()=>{ const browser=await chromium.launch({channel:'chrome',headless:true}); const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true}); await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'}); await page.screenshot({path:'tmp-igood-white-blue.png',fullPage:false}); await browser.close(); })();"
```

Expected: screenshot shows white-blue UI with readable text and no dark glass theme.

---

### Task 9: Final Sync, APK Build, and Verification

**Files:**
- Modify generated Android assets through Capacitor sync
- Modify root APK: `Igood-Report.apk`

- [ ] **Step 1: Verify root and www hashes match**

Run:

```powershell
Get-FileHash index.html,app.js,style.css,www\index.html,www\app.js,www\style.css | Format-Table -AutoSize
```

Expected: `index.html` equals `www\index.html`, `app.js` equals `www\app.js`, and `style.css` equals `www\style.css`.

- [ ] **Step 2: Run all browser tests**

Run:

```powershell
$env:PW = Join-Path $env:TEMP 'igood-playwright-check\node_modules\playwright'
npm run test:logic
```

Expected: all tests print `PASS`.

- [ ] **Step 3: Run syntax checks**

Run:

```powershell
node --check app.js
node --check www\app.js
```

Expected: exit code 0, no syntax errors.

- [ ] **Step 4: Sync Capacitor assets**

Run:

```powershell
npm run build:android
```

Expected: Capacitor copies `www` assets into `android\app\src\main\assets\public`.

- [ ] **Step 5: Build Android with Java 21**

Run:

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:Path="$env:JAVA_HOME\bin;$env:Path"
.\gradlew.bat assembleDebug
```

Working directory:

```text
D:\Project\Report Keuangan - Igood\android
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 6: Copy APK to root**

Run:

```powershell
Copy-Item -LiteralPath 'android\app\build\outputs\apk\debug\app-debug.apk' -Destination 'Igood-Report.apk' -Force
Get-FileHash Igood-Report.apk,android\app\build\outputs\apk\debug\app-debug.apk | Format-Table -AutoSize
```

Expected: both APK hashes match.

- [ ] **Step 7: Verify APK contains updated markers**

Run:

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$apk = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path 'Igood-Report.apk'))
try {
  $checks = @{
    'assets/public/index.html'='page-daily-report'
    'assets/public/app.js'='igood_transactions'
    'assets/public/style.css'='--bg-base: #f5f9ff'
  }
  foreach($name in $checks.Keys){
    $entry = $apk.GetEntry($name)
    if(-not $entry){ throw "$name missing" }
    $reader = New-Object System.IO.StreamReader($entry.Open())
    $text = $reader.ReadToEnd()
    $reader.Close()
    if(-not $text.Contains($checks[$name])){ throw "$name missing marker $($checks[$name])" }
    "$name OK"
  }
} finally {
  $apk.Dispose()
}
```

Expected: all three asset markers print `OK`.

---

## Self-Review

Spec coverage:

- Menu Penjualan with sub menu categories: Task 3 and Task 4.
- Report Harian automatic from sales transactions: Task 5.
- Buyer name and WA shown as `Nama | No WA`: Task 5.
- Modal/profit hidden from WhatsApp report: Task 5 test and generator.
- Unit Android, New/Bekas condition, and profit storage: Task 4 and Task 6.
- White-blue theme: Task 8.
- Logic audit fixes: Task 2, Task 4, Task 5, Task 7.
- Android APK rebuild: Task 9.

Incomplete-marker scan:

- No incomplete markers are used.
- Commands and expected results are specified for every verification step.

Type consistency:

- Transaction categories are consistently `unit_iphone`, `unit_android`, `accessory`, `service`, and `other`.
- Buyer fields are consistently `buyerName` and `buyerWa`.
- Transaction storage is consistently `igood_transactions`.
