import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// Mock localStorage and browser environment
const storage = {};
globalThis.localStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};

globalThis.window = {
    addEventListener: () => {},
    localStorage: globalThis.localStorage
};

globalThis.document = {
    body: { classList: { add: () => {}, remove: () => {}, contains: () => false } },
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({
        getContext: () => ({
            font: '',
            measureText: (txt) => ({ width: txt.length * 8 }),
            fillRect: () => {},
            fillText: () => {},
        }),
        toDataURL: () => 'data:image/png;base64,mockPngBase64'
    })
};

globalThis.$ = (id) => null;
globalThis.esc = (str) => String(str || '');
globalThis.today = () => '2026-08-29';
globalThis.fmtDate = (d) => d;
globalThis.fmtRp = (num) => `Rp ${Number(num || 0).toLocaleString('id-ID')}`;
globalThis.cleanRp = (val) => Number(String(val || '').replace(/[^0-9]/g, '')) || 0;
globalThis.paymentLabel = (m) => m ? m.toUpperCase() : 'CASH';
globalThis.transactionCategoryLabel = (cat) => cat;
globalThis.bonusAccessoriesText = () => '';
globalThis.loadTransactions = () => [];
globalThis.loadPreorders = () => [];
globalThis.readObject = () => null;
globalThis.DB_KEYS = { thermalPrinter: 'igood_thermal_printer' };

// Load receipt.js
const receiptCode = fs.readFileSync(path.join(rootDir, 'js', 'receipt.js'), 'utf8');
const receiptFn = new Function(receiptCode + `
return {
    getReceiptPaperWidth,
    setReceiptPaperWidth,
    getReceiptCharWidth,
    receiptDivider,
    wrapReceiptText,
    receiptCenter,
    receiptLine,
    receiptTransactionText,
    serviceOrderReceiptText,
};`);

const receiptModule = receiptFn();

console.log('--- Testing Garansi Toko & Multi-Width Receipt Module ---');

// Test 1: Paper Width and Character Width Defaults & Toggles
{
    receiptModule.setReceiptPaperWidth(58);
    assert.strictEqual(receiptModule.getReceiptPaperWidth(), 58, 'Paper width should be 58');
    assert.strictEqual(receiptModule.getReceiptCharWidth(58), 32, 'Char width for 58mm should be 32');
    assert.strictEqual(receiptModule.receiptDivider(32).length, 32, 'Divider for 58mm should be 32 chars');

    receiptModule.setReceiptPaperWidth(80);
    assert.strictEqual(receiptModule.getReceiptPaperWidth(), 80, 'Paper width should be 80');
    assert.strictEqual(receiptModule.getReceiptCharWidth(80), 48, 'Char width for 80mm should be 48');
    assert.strictEqual(receiptModule.receiptDivider(48).length, 48, 'Divider for 80mm should be 48 chars');
    console.log('✓ Test 1 Passed: Sizing toggles (58mm vs 80mm) function correctly');
}

// Test 2: Receipt Transaction with Garansi Toko (Numeric -> '30 Hari')
{
    const items = [
        {
            receiptCode: 'RC-20260829-001',
            buyerName: 'Ahmad',
            buyerWa: '08123456789',
            salesName: 'Budi',
            date: '2026-08-29',
            category: 'unit_iphone',
            itemName: 'iPhone 13 128GB Midnight',
            condition: 'Bekas',
            warranty: 'IBX',
            storeWarranty: '30 Hari',
            imei: '358901234567890',
            quantity: 1,
            unitSell: 8500000,
            sell: 8500000,
            paymentMethod: 'cash',
            paidAmount: 8500000,
            changeAmount: 0,
            createdAt: '2026-08-29T10:00:00Z'
        }
    ];

    const receipt58 = receiptModule.receiptTransactionText(items, 'STRUK TRANSAKSI', 32);
    assert(receipt58.includes('Garansi Toko: 30 Hari'), 'Receipt 58mm must include Garansi Toko: 30 Hari');
    assert(receipt58.includes('Garansi: Resmi Ibox'), 'Receipt 58mm must include unit warranty');
    assert(receipt58.includes('Kondisi: Ex'), 'Receipt 58mm must include condition');

    const receipt80 = receiptModule.receiptTransactionText(items, 'STRUK TRANSAKSI', 48);
    assert(receipt80.includes('Garansi Toko: 30 Hari'), 'Receipt 80mm must include Garansi Toko: 30 Hari');
    console.log('✓ Test 2 Passed: Transaction receipt prints Garansi Toko properly for 58mm and 80mm');
}

// Test 3: Receipt Transaction without Garansi Toko (empty or strip '-')
{
    const items = [
        {
            receiptCode: 'RC-20260829-002',
            buyerName: 'Siti',
            buyerWa: '08987654321',
            salesName: 'Budi',
            date: '2026-08-29',
            category: 'accessory',
            itemName: 'Charger 20W Original',
            storeWarranty: '-',
            quantity: 1,
            unitSell: 250000,
            sell: 250000,
            paymentMethod: 'cash',
            paidAmount: 250000,
            changeAmount: 0,
            createdAt: '2026-08-29T11:00:00Z'
        }
    ];

    const receipt = receiptModule.receiptTransactionText(items, 'STRUK TRANSAKSI', 32);
    assert(!receipt.includes('Garansi Toko'), 'Receipt must NOT include Garansi Toko when set to - or empty');
    console.log('✓ Test 3 Passed: Optional Garansi Toko is omitted when set to - / blank');
}

// Test 4: Service Order Receipt with Garansi Toko
{
    const order = {
        code: 'SVC-20260829-001',
        buyerName: 'Dewi',
        buyerWa: '08567890123',
        salesName: 'Teknisi Andi',
        dateIn: '2026-08-29',
        itemName: 'iPhone 11',
        complaint: 'Ganti Baterai',
        note: 'Baterai Hippo',
        storeWarranty: '90 Hari',
        paidAmount: 350000,
        paymentMethod: 'transfer',
        status: 'Selesai',
        createdAt: '2026-08-29T09:00:00Z'
    };

    const serviceReceipt = receiptModule.serviceOrderReceiptText(order, 'STRUK SERVICE SELESAI', 32);
    assert(serviceReceipt.includes('Garansi Toko: 90 Hari'), 'Service receipt must include Garansi Toko: 90 Hari');
    console.log('✓ Test 4 Passed: Service receipt includes Garansi Toko');
}

console.log('\nAll 4 receipt warranty & multi-width tests PASSED successfully!\n');
