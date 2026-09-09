// Targeted test for Report Harian menu & single sale flow
import assert from 'node:assert';

// Mock browser globals
globalThis.window = {
    IGOOD_SUPABASE: {
        url: 'https://jnwdoucyjwhkqxrztubm.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impud2RvdWN5andoa3F4cnp0dWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzU0NzIsImV4cCI6MjA5NjQ1MTQ3Mn0.mQ5-WX_IFGhi4c_C0cEXFEZnjDO1yDAqvHZOaqGAJ4c'
    }
};

const storageMap = new Map();
globalThis.localStorage = {
    getItem: (k) => storageMap.get(k) || null,
    setItem: (k, v) => storageMap.set(k, String(v)),
    removeItem: (k) => storageMap.delete(k),
    clear: () => storageMap.clear()
};

const domElements = {
    dailyReportDate: { value: '2026-08-29' },
    dailyReportShift: { value: 'all' },
    dailyReportSummary: { innerHTML: '' },
    dailyReportWhatsappText: { textContent: '' },
    dailyReportTransactionList: { innerHTML: '' }
};

globalThis.document = {
    getElementById: (id) => domElements[id] || null,
    body: { classList: { contains: () => false } }
};

import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';

// Evaluate modules in order in global context
['js/utils.js', 'js/storage.js', 'js/service.js', 'js/sales.js', 'js/daily-report.js'].forEach(file => {
    const code = fs.readFileSync(path.resolve(file), 'utf8');
    vm.runInThisContext(code);
});

console.log('=== TEST: REPORT HARIAN - 1x PENJUALAN ===');

// 1. Create exactly 1 sale transaction
const testSale = {
    id: `TRX-TEST-${Date.now()}`,
    date: '2026-08-29',
    shift: 'shift pagi & malam',
    category: 'unit_iphone',
    code: 'PB-IBX-I15P-001',
    itemName: 'Apple iPhone 15 Pro 128GB',
    condition: 'Bekas',
    buyerName: 'Budi Santoso',
    buyerWa: '081234567890',
    salesName: 'Owner',
    quantity: 1,
    sell: 14500000,
    cost: 13000000,
    bonusCost: 0,
    bonusAccessories: [],
    fee: 0,
    paymentMethod: 'cash',
    splitCash: 0,
    splitTransfer: 0,
    splitCredit: 0,
    storeWarranty: '30 Hari',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
};

saveTransactions([testSale]);
console.log('1. Single sale saved locally to transactions cache.');

// 2. Test getDailyReportTransactions
const dailyTxs = getDailyReportTransactions();
assert.strictEqual(dailyTxs.length, 1, 'Should find 1 transaction for today');
assert.strictEqual(dailyTxs[0].id, testSale.id, 'Transaction ID should match');
console.log('2. getDailyReportTransactions() successfully retrieved the sale.');

// 3. Test reportTotals
const totals = reportTotals(dailyTxs);
assert.strictEqual(totals.cash, 14500000, 'Cash total should be 14,500,000');
assert.strictEqual(totals.grand, 14500000, 'Grand total should be 14,500,000');
console.log(`3. reportTotals() correct: Cash = ${totals.cash}, Grand = ${totals.grand}`);

// 4. Test WhatsApp report text generation
const waText = buildDailyReportWhatsappText(dailyTxs);
assert.ok(waText.includes('LAPORAN HARIAN IGOOD'), 'WA text should include title');
assert.ok(waText.includes('Apple iPhone 15 Pro 128GB'), 'WA text should include item name');
assert.ok(waText.includes('Budi Santoso'), 'WA text should include buyer name');
assert.ok(waText.includes('14.500.000'), 'WA text should include formatted price');
console.log('4. buildDailyReportWhatsappText() generated complete report:');
console.log('--------------------------------------------------');
console.log(waText);
console.log('--------------------------------------------------');

// 5. Test renderDailyReport DOM update
renderDailyReport();
assert.ok(domElements.dailyReportSummary.innerHTML.includes('14.500.000'), 'Summary HTML should contain 14.500.000');
assert.ok(domElements.dailyReportWhatsappText.textContent.includes('Budi Santoso'), 'WA text element should contain buyer');
console.log('5. renderDailyReport() updated DOM summary and transaction list successfully.');

console.log('\n✅ SEMUA TES MENU REPORT HARIAN BERHASIL 100%!');
