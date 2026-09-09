import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function run() {
    console.log('--- STARTING SERVICE RECAP VERIFICATION TEST ---');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();

    // Catch errors
    page.on('console', msg => {
        if (msg.type() === 'error') console.log('BROWSER ERROR:', msg.text());
    });

    const fileUrl = 'file:///' + path.join(rootDir, 'index.html').replace(/\\/g, '/');
    await page.goto(fileUrl);
    await page.waitForLoadState('networkidle');

    // 1. Setup local storage test data
    await page.evaluate(() => {
        const todayStr = window.today ? window.today() : new Date().toISOString().slice(0, 10);
        const thisMonth = todayStr.slice(0, 7);

        // Technicians
        localStorage.setItem('technicians', JSON.stringify(['Agus Teknisi', 'Budi Service']));

        // Service order keluar
        const serviceOrders = [
            {
                id: 'srv-test-101',
                code: 'SRV-2026-001',
                status: 'keluar',
                dateIn: todayStr,
                paidDate: todayStr,
                buyerName: 'Pak Hendra',
                buyerWa: '081234567890',
                brand: 'Apple',
                model: 'iPhone 13 Pro',
                itemName: 'iPhone 13 Pro (Ganti LCD)',
                complaint: 'LCD Pecah & Garis Hijau',
                technician: 'Agus Teknisi',
                paymentMethod: 'transfer',
                paidAmount: 1250000,
                sparepartCost: 750000,
                serviceFee: 150000,
                cost: 900000,
                createdAt: new Date().toISOString()
            }
        ];
        if (window.saveServiceOrders) window.saveServiceOrders(serviceOrders);
        localStorage.setItem('igood_service_orders', JSON.stringify(serviceOrders));
        localStorage.setItem('service_orders', JSON.stringify(serviceOrders));

        // Transaction for this service
        const txs = [
            {
                id: 'tx-srv-101',
                code: 'TX-SRV-001',
                serviceOrderCode: 'SRV-2026-001',
                category: 'service_keluar',
                date: todayStr,
                buyerName: 'Pak Hendra',
                buyerWa: '081234567890',
                itemName: 'iPhone 13 Pro (Ganti LCD)',
                complaint: 'LCD Pecah & Garis Hijau',
                technician: 'Agus Teknisi',
                paymentMethod: 'transfer',
                sell: 1250000,
                sparepartCost: 750000,
                serviceFee: 150000,
                cost: 900000,
                fee: 900000,
                createdAt: new Date().toISOString()
            }
        ];
        if (window.saveTransactions) window.saveTransactions(txs);
        localStorage.setItem('igood_transactions', JSON.stringify(txs));
        localStorage.setItem('transactions', JSON.stringify(txs));

        // Auth
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('activeRole', 'admin');
    });

    await page.reload();
    await page.waitForTimeout(1000);

    // Navigate to Admin Center
    console.log('1. Navigating to Admin Center...');
    await page.evaluate(() => window.switchPage('page-admin'));
    await page.waitForSelector('#page-admin.active, .admin-container', { timeout: 3000 });

    // Open Rekap Penjualan tab
    console.log('2. Opening Rekap Penjualan tab...');
    await page.click('.admin-tab[data-panel="admin-sales-recap"]');
    await page.waitForSelector('#admin-sales-recap.active', { timeout: 3000 });
    await page.waitForTimeout(500);

    // Click on Service category card in recap
    console.log('3. Clicking on Rekap Jasa Servis card...');
    await page.click('.recap-cat-card[data-recap-cat="services"]');
    await page.waitForTimeout(800);

    // Verify service list row
    const srvRow = page.locator('#recapListServices .recap-item-row').first();
    await srvRow.waitFor({ timeout: 5000 });
    const srvText = await srvRow.innerText();
    console.log('Found Service Row in Recap:', srvText.replace(/\n+/g, ' | '));

    // Click to open detail modal
    console.log('4. Clicking service row to open detail modal...');
    await srvRow.click();
    await page.waitForSelector('#modalRecapDetail.open', { timeout: 3000 });
    await page.waitForTimeout(500);

    // Get modal contents text
    const titleText = await page.textContent('#modalRecapDetailTitle');
    const heroPriceText = await page.textContent('#modalRecapDetailHeroPrice');
    const heroProfitText = await page.textContent('#modalRecapDetailHeroProfit');
    const finContent = await page.textContent('#modalRecapDetailFinancialContent');
    console.log('Modal Title:', titleText);
    console.log('Hero Price:', heroPriceText);
    console.log('Hero Profit:', heroProfitText);
    console.log('Financial Content:', finContent.replace(/\s+/g, ' '));

    // Screenshot of service detail modal
    const modalShotPath = path.join(rootDir, 'verified_service_recap_modal.png');
    await page.screenshot({ path: modalShotPath });
    console.log('Saved modal screenshot to:', modalShotPath);

    // Close detail modal
    await page.click('#modalRecapDetail .modal-recap-close-btn, #modalRecapDetail button:has-text("Tutup")');
    await page.waitForTimeout(500);

    // Go to Dashboard tab
    console.log('5. Navigating to Admin Dashboard tab...');
    await page.click('.admin-tab[data-panel="admin-dashboard"]');
    await page.waitForSelector('#admin-dashboard.active', { timeout: 3000 });
    await page.waitForTimeout(800);

    // Verify Rekap Bulanan table in dashboard
    const dashSrvRow = page.locator('#monthlyRecapTableBody .dashboard-recap-row').first();
    await dashSrvRow.waitFor({ timeout: 5000 });
    const dashRowText = await dashSrvRow.innerText();
    console.log('Found Service Row in Dashboard Recap:', dashRowText.replace(/\n+/g, ' | '));

    // Click row in Dashboard to verify detail modal opens
    console.log('6. Clicking service row in Dashboard table...');
    await dashSrvRow.click();
    await page.waitForSelector('#modalRecapDetail.open', { timeout: 3000 });
    await page.waitForTimeout(500);

    const dashModalShotPath = path.join(rootDir, 'verified_dashboard_service_modal.png');
    await page.screenshot({ path: dashModalShotPath });
    console.log('Saved dashboard modal screenshot to:', dashModalShotPath);

    await browser.close();
    console.log('--- ALL VERIFICATIONS PASSED SUCCESSFULLY! ---');
}

run().catch(err => {
    console.error('Test Failed:', err);
    process.exit(1);
});
