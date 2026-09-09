/**
 * IGOOD REPORT - Daily Report & Export Module
 */

    function renderDailyReport() {
        if (!$('dailyReportWhatsappText')) return;
        const transactions = getDailyReportTransactions();
        const totals = reportTotals(transactions);
        if ($('dailyReportSummary')) {
            $('dailyReportSummary').innerHTML = `
                <div class="metric"><div class="metric-data"><h4>Cash</h4><div class="val">${fmtRp(totals.cash)}</div></div></div>
                <div class="metric"><div class="metric-data"><h4>Transfer</h4><div class="val">${fmtRp(totals.transfer)}</div></div></div>
                <div class="metric"><div class="metric-data"><h4>Kredit</h4><div class="val">${fmtRp(totals.kredit)}</div></div></div>
                <div class="metric"><div class="metric-data"><h4>Total</h4><div class="val">${fmtRp(totals.grand)}</div></div></div>`;
        }
        $('dailyReportWhatsappText').textContent = buildDailyReportWhatsappText(transactions);

        const list = $('dailyReportTransactionList');
        if (!list) return;
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
                    ${tx.salesName ? `<p>Sales: ${esc(tx.salesName)}</p>` : ''}
                    ${bonusAccessoriesText(tx) ? `<p>Bonus: ${esc(bonusAccessoriesText(tx))}</p>` : ''}
                    ${tx.serviceStatus ? `<p>Status: ${esc(tx.serviceStatus)}</p>` : ''}
                </div>
                <div class="transaction-actions">
                    <span>${fmtRp(tx.sell)}</span>
                    <button type="button" class="btn-receipt" onclick="printTransactionReceiptFromHistory('${esc(tx.id)}')" title="Cetak / Bagikan Struk"><i class="ri-receipt-line"></i></button>
                    ${tx.isVirtual ? '' : `<button type="button" class="btn-del btn-void-transaction" onclick="voidTransaction('${esc(tx.id)}')" title="Void Transaksi"><i class="ri-delete-bin-6-line"></i></button>`}
                </div>
            </div>`).join('');
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

    function dashboardTransactionsForRange(range) {
        let transactions = loadTransactions();
        if (!transactions.length) transactions = legacyReportsToTransactions(load(DB_KEYS.reports));
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

    function dashboardMonthlyTransactions(monthValue) {
        const month = monthValue || today().slice(0, 7);
        let transactions = loadTransactions();
        if (!transactions.length) transactions = legacyReportsToTransactions(load(DB_KEYS.reports));
        return transactions
            .filter(tx => String(tx.date || '').startsWith(month))
            .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    }

    function renderMonthlyRecap() {
        const monthInput = $('monthlyRecapMonth');
        const tbody = $('monthlyRecapTableBody');
        const summary = $('monthlyRecapSummary');
        if (!monthInput || !tbody || !summary) return;
        if (!monthInput.value) monthInput.value = today().slice(0, 7);
        const transactions = dashboardMonthlyTransactions(monthInput.value);
        const total = transactions.reduce((sum, tx) => sum + transactionPaymentTotal(tx), 0);
        summary.textContent = `${transactions.length} transaksi | ${fmtRp(total)}`;
        if (!transactions.length) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-dim" style="text-align:center;">Tidak ada data</td></tr>';
            return;
        }
        tbody.innerHTML = transactions.map(tx => {
            const userLine = `${tx.buyerName || '-'} | ${tx.buyerWa || '-'}`;
            return `<tr>
                <td data-label="Tanggal" class="text-sm">${esc(fmtDate(tx.date))}</td>
                <td data-label="Kode" class="mono text-sm">${esc(tx.code || '-')}</td>
                <td data-label="Kategori" class="text-sm">${esc(transactionCategoryLabel(tx.category))}</td>
                <td data-label="Item" class="text-sm">${esc(tx.itemName || '-')}</td>
                <td data-label="User" class="text-sm">${esc(userLine)}</td>
                <td data-label="Sales" class="text-sm">${esc(tx.salesName || '-')}</td>
                <td data-label="Qty">${Number(tx.quantity) || 1}</td>
                <td data-label="Total" class="mono price text-sm">${esc(fmtRp(transactionPaymentTotal(tx)))}</td>
                <td data-label="Pay" class="text-sm">${esc(paymentLabel(tx.paymentMethod))}</td>
            </tr>`;
        }).join('');
    }

    function refreshDashboard() {
        if (!$('dashboardRangeFilter')) return;
        const transactions = dashboardTransactionsForRange($('dashboardRangeFilter').value);
        let totalRev = 0, totalCOGS = 0;
        let payCash = 0, payTf = 0, payKredit = 0;
        let catUnit = 0, catAcc = 0, catSvc = 0, catOth = 0;
        const dailyMap = {};
        const salesMap = {};

        transactions.forEach(tx => {
            const totals = paymentTotals(tx);
            const revenue = totals.cash + totals.transfer + totals.kredit;
            totalRev += revenue;
            payCash += totals.cash;
            payTf += totals.transfer;
            payKredit += totals.kredit;
            dailyMap[tx.date || 'unknown'] = (dailyMap[tx.date || 'unknown'] || 0) + revenue;
            if (tx.category === 'unit_iphone' || tx.category === 'unit_android' || tx.category === 'tukar_tambah') {
                catUnit += revenue;
                const tradeInAdj = tx.category === 'tukar_tambah' ? (Number(tx.tradeInCost) || 0) : 0;
                totalCOGS += Math.max(0, (tx.cost || 0) - tradeInAdj) + (tx.bonusCost || 0);
                const salesName = (tx.salesName || '').trim() || 'Tanpa Sales';
                if (!salesMap[salesName]) salesMap[salesName] = { units: 0 };
                salesMap[salesName].units += Number(tx.quantity) || 1;
            } else if (tx.category === 'accessory') {
                catAcc += revenue;
                totalCOGS += tx.cost || 0;
            } else if (tx.category === 'service') {
                catSvc += revenue;
                totalCOGS += tx.fee || 0;
            } else {
                catOth += revenue;
            }
        });

        $('metricTotalRevenue').textContent = fmtRp(totalRev);
        $('metricTotalProfit').textContent = fmtRp(totalRev - totalCOGS);
        $('metricTotalCOGS').textContent = fmtRp(totalCOGS);
        $('metricInventoryValue').textContent = fmtRp(load(DB_KEYS.devices).filter(d => d.status === 'Available').reduce((sum, d) => sum + (d.cost || 0), 0));

        const sortedDates = Object.keys(dailyMap).sort();
        if (window.Chart) {
            if (chartRevenue) chartRevenue.destroy();
            chartRevenue = new Chart($('revenueTrendChart'), {
                type: 'line',
                data: { labels: sortedDates.map(fmtDate), datasets: [{ data: sortedDates.map(d => dailyMap[d]), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.12)', fill: true, tension: 0.35 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } },
            });
            if (chartPayment) chartPayment.destroy();
            chartPayment = new Chart($('paymentMethodChart'), {
                type: 'doughnut',
                data: { labels: ['Cash', 'Transfer', 'Kredit'], datasets: [{ data: [payCash, payTf, payKredit], backgroundColor: ['#059669', '#2563eb', '#d97706'], borderWidth: 0 }] },
                options: { responsive: true, maintainAspectRatio: false },
            });
            if (chartCategory) chartCategory.destroy();
            chartCategory = new Chart($('categoryBreakdownChart'), {
                type: 'bar',
                data: { labels: ['Unit', 'Aksesoris', 'Service', 'Lainnya'], datasets: [{ data: [catUnit, catAcc, catSvc, catOth], backgroundColor: ['#2563eb', '#059669', '#d97706', '#0284c7'], borderRadius: 8 }] },
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } } },
            });
        }

        const salesTbody = $('salesPerformanceTableBody');
        if (salesTbody) {
            const entries = Object.entries(salesMap).sort((a, b) => b[1].units - a[1].units || a[0].localeCompare(b[0]));
            salesTbody.innerHTML = entries.length
                ? entries.map(([name, data]) => `<tr><td>${esc(name)}</td><td>${data.units}</td></tr>`).join('')
                : '<tr><td colspan="2" class="text-dim" style="text-align:center;">Tidak ada data</td></tr>';
        }
        renderMonthlyRecap();
    }



    function loadJsPdfLibrary() {
        return new Promise((resolve, reject) => {
            if (window.jspdf) {
                resolve(window.jspdf);
                return;
            }

            function loadFromCdn() {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                script.onload = () => {
                    const scriptTable = document.createElement('script');
                    scriptTable.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
                    scriptTable.onload = () => resolve(window.jspdf);
                    scriptTable.onerror = reject;
                    document.head.appendChild(scriptTable);
                };
                script.onerror = reject;
                document.head.appendChild(script);
            }

            // Try local files first
            const script = document.createElement('script');
            script.src = 'jspdf.umd.min.js';
            script.onload = () => {
                const scriptTable = document.createElement('script');
                scriptTable.src = 'jspdf.plugin.autotable.min.js';
                scriptTable.onload = () => resolve(window.jspdf);
                scriptTable.onerror = () => {
                    console.warn('Local autoTable failed, trying CDN...');
                    loadFromCdn();
                };
                document.head.appendChild(scriptTable);
            };
            script.onerror = () => {
                console.warn('Local jsPDF failed, trying CDN...');
                loadFromCdn();
            };
            document.head.appendChild(script);
        });
    }

    function openPdfExportModal() {
        const modal = $('pdfExportModal');
        if (!modal) return;

        if ($('pdfReportDate')) $('pdfReportDate').value = today();
        
        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if ($('pdfReportMonth')) $('pdfReportMonth').value = currentMonthStr;

        activePdfTab = 'harian';
        updatePdfTabUI();
        renderPdfExportPreview();
        modal.classList.add('open');
    }

    function updatePdfTabUI() {
        document.querySelectorAll('.pdf-tab').forEach(tab => {
            if (tab.dataset.tab === activePdfTab) {
                tab.classList.remove('btn-ghost');
                tab.classList.add('btn-primary');
            } else {
                tab.classList.remove('btn-primary');
                tab.classList.add('btn-ghost');
            }
        });

        const dateContainer = $('pdfReportDate')?.parentElement;
        const monthContainer = $('pdfReportMonth')?.parentElement;

        if (activePdfTab === 'harian') {
            if (dateContainer) dateContainer.style.display = 'block';
            if (monthContainer) monthContainer.style.display = 'none';
        } else {
            if (dateContainer) dateContainer.style.display = 'none';
            if (monthContainer) monthContainer.style.display = 'block';
        }
    }

    function renderPdfExportPreview() {
        const container = $('pdfExportPreviewContainer');
        if (!container) return;

        const date = $('pdfReportDate')?.value || today();
        const month = $('pdfReportMonth')?.value || '';

        if (activePdfTab === 'harian') {
            container.innerHTML = getDailyReportData(date);
        } else if (activePdfTab === 'bulanan-unit') {
            container.innerHTML = getMonthlyUnitData(month);
        } else if (activePdfTab === 'bulanan-acc') {
            container.innerHTML = getMonthlyAccData(month);
        } else if (activePdfTab === 'bulanan-service') {
            container.innerHTML = getMonthlyServiceData(month);
        }
    }

    function getDailyReportData(date) {
        const txs = loadTransactions().filter(tx => tx.date === date);
        let totalCost = 0;
        let totalSell = 0;
        let totalProfit = 0;

        let html = `
            <h4 style="font-size: 13px; color: var(--text); margin-bottom: 8px;">Laporan Penjualan Harian: ${fmtDate(date)}</h4>
            <table id="pdfPreviewTable" style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px;">
                <thead>
                    <tr style="background: #f4f7fc; border-bottom: 2px solid var(--border);">
                        <th style="padding: 6px 8px; text-align: left; border: 1px solid var(--border);">No</th>
                        <th style="padding: 6px 8px; text-align: left; border: 1px solid var(--border);">Kategori</th>
                        <th style="padding: 6px 8px; text-align: left; border: 1px solid var(--border);">Kode</th>
                        <th style="padding: 6px 8px; text-align: left; border: 1px solid var(--border);">Item</th>
                        <th style="padding: 6px 8px; text-align: center; border: 1px solid var(--border);">Qty</th>
                        <th style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">Modal</th>
                        <th style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">Jual</th>
                        <th style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">Keuntungan</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (!txs.length) {
            html += `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 20px; border: 1px solid var(--border);">Tidak ada transaksi pada tanggal ini.</td></tr></tbody></table>`;
            return html;
        }

        txs.forEach((tx, idx) => {
            let cost = 0;
            let sell = getTxNetSell(tx);
            
            if (tx.category === 'unit_iphone' || tx.category === 'unit_android' || tx.category === 'tukar_tambah') {
                const tradeInAdj = tx.category === 'tukar_tambah' ? (Number(tx.tradeInCost) || 0) : 0;
                cost = Math.max(0, (tx.cost || 0) - tradeInAdj) + (tx.bonusCost || 0);
            } else if (tx.category === 'accessory') {
                cost = tx.cost || 0;
            } else if (tx.category === 'service') {
                cost = tx.fee || 0;
            } else {
                cost = 0;
            }

            const profit = sell - cost;
            totalCost += cost;
            totalSell += sell;
            totalProfit += profit;

            html += `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 6px 8px; border: 1px solid var(--border);">${idx + 1}</td>
                    <td style="padding: 6px 8px; border: 1px solid var(--border);">${esc(transactionCategoryLabel(tx.category))}</td>
                    <td style="padding: 6px 8px; border: 1px solid var(--border);" class="mono">${esc(tx.code || '-')}</td>
                    <td style="padding: 6px 8px; border: 1px solid var(--border);">${esc(tx.itemName)}</td>
                    <td style="padding: 6px 8px; text-align: center; border: 1px solid var(--border);">${tx.quantity || 1}</td>
                    <td style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">${fmtRp(cost)}</td>
                    <td style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">${fmtRp(sell)}</td>
                    <td style="padding: 6px 8px; text-align: right; border: 1px solid var(--border); color: ${profit >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 600;">${fmtRp(profit)}</td>
                </tr>
            `;
        });

        html += `
                <tr style="background: #edf4ff; font-weight: bold; border-top: 2px solid var(--border);">
                    <td colspan="5" style="padding: 8px; text-align: right; border: 1px solid var(--border);">TOTAL:</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid var(--border);">${fmtRp(totalCost)}</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid var(--border);">${fmtRp(totalSell)}</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid var(--border); color: ${totalProfit >= 0 ? 'var(--primary)' : 'var(--danger)'};">${fmtRp(totalProfit)}</td>
                </tr>
            </tbody>
        </table>`;

        return html;
    }

    function getMonthlyUnitData(month) {
        const txs = loadTransactions().filter(tx => {
            return (tx.date || '').startsWith(month) && 
                   ['unit_iphone', 'unit_android', 'tukar_tambah'].includes(tx.category);
        });

        let totalCost = 0;
        let totalSell = 0;
        let totalProfit = 0;

        let html = `
            <h4 style="font-size: 13px; color: var(--text); margin-bottom: 8px;">Laporan Bulanan Keuntungan Unit HP: ${month}</h4>
            <table id="pdfPreviewTable" style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px;">
                <thead>
                    <tr style="background: #f4f7fc; border-bottom: 2px solid var(--border);">
                        <th style="padding: 6px 8px; text-align: left; border: 1px solid var(--border);">No</th>
                        <th style="padding: 6px 8px; text-align: left; border: 1px solid var(--border);">Tanggal</th>
                        <th style="padding: 6px 8px; text-align: left; border: 1px solid var(--border);">Kode</th>
                        <th style="padding: 6px 8px; text-align: left; border: 1px solid var(--border);">Model HP</th>
                        <th style="padding: 6px 8px; text-align: left; border: 1px solid var(--border);">Kondisi</th>
                        <th style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">Modal</th>
                        <th style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">Jual</th>
                        <th style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">Keuntungan</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (!txs.length) {
            html += `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 20px; border: 1px solid var(--border);">Tidak ada transaksi unit pada bulan ini.</td></tr></tbody></table>`;
            return html;
        }

        txs.forEach((tx, idx) => {
            const tradeInAdj = tx.category === 'tukar_tambah' ? (Number(tx.tradeInCost) || 0) : 0;
            const cost = Math.max(0, (tx.cost || 0) - tradeInAdj) + (tx.bonusCost || 0);
            const sell = Number(tx.sell) || 0; // Use full sell price in monthly unit calculations
            const profit = sell - cost;
            
            totalCost += cost;
            totalSell += sell;
            totalProfit += profit;

            html += `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 6px 8px; border: 1px solid var(--border);">${idx + 1}</td>
                    <td style="padding: 6px 8px; border: 1px solid var(--border);">${fmtDate(tx.date)}</td>
                    <td style="padding: 6px 8px; border: 1px solid var(--border);" class="mono">${esc(tx.code || '-')}</td>
                    <td style="padding: 6px 8px; border: 1px solid var(--border);">${esc(tx.itemName)}</td>
                    <td style="padding: 6px 8px; border: 1px solid var(--border);">${esc(tx.condition || 'Bekas')}</td>
                    <td style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">${fmtRp(cost)}</td>
                    <td style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">${fmtRp(sell)}</td>
                    <td style="padding: 6px 8px; text-align: right; border: 1px solid var(--border); color: ${profit >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 600;">${fmtRp(profit)}</td>
                </tr>
            `;
        });

        html += `
                <tr style="background: #edf4ff; font-weight: bold; border-top: 2px solid var(--border);">
                    <td colspan="5" style="padding: 8px; text-align: right; border: 1px solid var(--border);">TOTAL:</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid var(--border);">${fmtRp(totalCost)}</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid var(--border);">${fmtRp(totalSell)}</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid var(--border); color: ${totalProfit >= 0 ? 'var(--primary)' : 'var(--danger)'};">${fmtRp(totalProfit)}</td>
                </tr>
            </tbody>
        </table>`;

        return html;
    }

    function getMonthlyAccData(month) {
        const txs = loadTransactions().filter(tx => {
            return (tx.date || '').startsWith(month) && tx.category === 'accessory';
        });

        const grouped = {};
        txs.forEach(tx => {
            const key = tx.itemName || 'Lainnya';
            if (!grouped[key]) {
                grouped[key] = {
                    name: key,
                    qty: 0,
                    cost: 0,
                    sell: 0,
                };
            }
            grouped[key].qty += Number(tx.quantity) || 1;
            grouped[key].cost += Number(tx.cost) || 0;
            grouped[key].sell += Number(tx.sell) || 0;
        });

        let totalQty = 0;
        let totalCost = 0;
        let totalSell = 0;
        let totalProfit = 0;

        let html = `
            <h4 style="font-size: 13px; color: var(--text); margin-bottom: 8px;">Laporan Bulanan Keuntungan Aksesoris: ${month}</h4>
            <table id="pdfPreviewTable" style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px;">
                <thead>
                    <tr style="background: #f4f7fc; border-bottom: 2px solid var(--border);">
                        <th style="padding: 6px 8px; text-align: left; border: 1px solid var(--border);">No</th>
                        <th style="padding: 6px 8px; text-align: left; border: 1px solid var(--border);">Nama Aksesoris</th>
                        <th style="padding: 6px 8px; text-align: center; border: 1px solid var(--border);">Qty Terjual</th>
                        <th style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">Total Modal</th>
                        <th style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">Total Jual</th>
                        <th style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">Total Keuntungan</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const items = Object.values(grouped);
        if (!items.length) {
            html += `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 20px; border: 1px solid var(--border);">Tidak ada transaksi aksesoris pada bulan ini.</td></tr></tbody></table>`;
            return html;
        }

        items.forEach((item, idx) => {
            const profit = item.sell - item.cost;
            totalQty += item.qty;
            totalCost += item.cost;
            totalSell += item.sell;
            totalProfit += profit;

            html += `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 6px 8px; border: 1px solid var(--border);">${idx + 1}</td>
                    <td style="padding: 6px 8px; border: 1px solid var(--border);">${esc(item.name)}</td>
                    <td style="padding: 6px 8px; text-align: center; border: 1px solid var(--border);">${item.qty}</td>
                    <td style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">${fmtRp(item.cost)}</td>
                    <td style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">${fmtRp(item.sell)}</td>
                    <td style="padding: 6px 8px; text-align: right; border: 1px solid var(--border); color: ${profit >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 600;">${fmtRp(profit)}</td>
                </tr>
            `;
        });

        html += `
                <tr style="background: #edf4ff; font-weight: bold; border-top: 2px solid var(--border);">
                    <td colspan="2" style="padding: 8px; text-align: right; border: 1px solid var(--border);">TOTAL:</td>
                    <td style="padding: 8px; text-align: center; border: 1px solid var(--border);">${totalQty}</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid var(--border);">${fmtRp(totalCost)}</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid var(--border);">${fmtRp(totalSell)}</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid var(--border); color: ${totalProfit >= 0 ? 'var(--primary)' : 'var(--danger)'};">${fmtRp(totalProfit)}</td>
                </tr>
            </tbody>
        </table>`;

        return html;
    }

    function getMonthlyServiceData(month) {
        const txs = loadTransactions().filter(tx => {
            return (tx.date || '').startsWith(month) && tx.category === 'service';
        });

        let totalCost = 0;
        let totalSell = 0;
        let totalProfit = 0;

        let html = `
            <h4 style="font-size: 13px; color: var(--text); margin-bottom: 8px;">Laporan Bulanan Keuntungan Jasa Service: ${month}</h4>
            <table id="pdfPreviewTable" style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px;">
                <thead>
                    <tr style="background: #f4f7fc; border-bottom: 2px solid var(--border);">
                        <th style="padding: 6px 8px; text-align: left; border: 1px solid var(--border);">No</th>
                        <th style="padding: 6px 8px; text-align: left; border: 1px solid var(--border);">Tanggal</th>
                        <th style="padding: 6px 8px; text-align: left; border: 1px solid var(--border);">Kode</th>
                        <th style="padding: 6px 8px; text-align: left; border: 1px solid var(--border);">Layanan</th>
                        <th style="padding: 6px 8px; text-align: left; border: 1px solid var(--border);">Teknisi</th>
                        <th style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">Fee Teknisi (Modal)</th>
                        <th style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">Jual Jasa</th>
                        <th style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">Keuntungan</th>
                    </tr>
                </thead>
                <tbody>
        `;

        if (!txs.length) {
            html += `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 20px; border: 1px solid var(--border);">Tidak ada transaksi service pada bulan ini.</td></tr></tbody></table>`;
            return html;
        }

        txs.forEach((tx, idx) => {
            const cost = Number(tx.fee) || 0;
            const sell = Number(tx.sell) || 0;
            const profit = sell - cost;
            
            totalCost += cost;
            totalSell += sell;
            totalProfit += profit;

            html += `
                <tr style="border-bottom: 1px solid var(--border);">
                    <td style="padding: 6px 8px; border: 1px solid var(--border);">${idx + 1}</td>
                    <td style="padding: 6px 8px; border: 1px solid var(--border);">${fmtDate(tx.date)}</td>
                    <td style="padding: 6px 8px; border: 1px solid var(--border);" class="mono">${esc(tx.code || '-')}</td>
                    <td style="padding: 6px 8px; border: 1px solid var(--border);">${esc(tx.itemName.replace(/^Service Keluar -\s*/i, ''))}</td>
                    <td style="padding: 6px 8px; border: 1px solid var(--border);">${esc(tx.technician || '-')}</td>
                    <td style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">${fmtRp(cost)}</td>
                    <td style="padding: 6px 8px; text-align: right; border: 1px solid var(--border);">${fmtRp(sell)}</td>
                    <td style="padding: 6px 8px; text-align: right; border: 1px solid var(--border); color: ${profit >= 0 ? 'var(--success)' : 'var(--danger)'}; font-weight: 600;">${fmtRp(profit)}</td>
                </tr>
            `;
        });

        html += `
                <tr style="background: #edf4ff; font-weight: bold; border-top: 2px solid var(--border);">
                    <td colspan="5" style="padding: 8px; text-align: right; border: 1px solid var(--border);">TOTAL:</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid var(--border);">${fmtRp(totalCost)}</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid var(--border);">${fmtRp(totalSell)}</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid var(--border); color: ${totalProfit >= 0 ? 'var(--primary)' : 'var(--danger)'};">${fmtRp(totalProfit)}</td>
                </tr>
            </tbody>
        </table>`;

        return html;
    }

    async function downloadPdfReport() {
        const date = $('pdfReportDate')?.value || today();
        const month = $('pdfReportMonth')?.value || '';
        
        if (activePdfTab === 'bulanan-unit') {
            if (!month) {
                toast('Pilih bulan laporan terlebih dahulu', 'err');
                return;
            }
            await exportMonthlyUnitPdf(month);
            return;
        }
        
        let title = '';
        let filename = '';

        if (activePdfTab === 'harian') {
            title = `Laporan Harian Penjualan - ${fmtDate(date)}`;
            filename = `laporan-harian-${date}`;
        } else if (activePdfTab === 'bulanan-unit') {
            title = `Laporan Bulanan Keuntungan Unit HP - ${month}`;
            filename = `laporan-bulanan-unit-${month}`;
        } else if (activePdfTab === 'bulanan-acc') {
            title = `Laporan Bulanan Keuntungan Aksesoris - ${month}`;
            filename = `laporan-bulanan-aksesoris-${month}`;
        } else if (activePdfTab === 'bulanan-service') {
            title = `Laporan Bulanan Keuntungan Service - ${month}`;
            filename = `laporan-bulanan-service-${month}`;
        }

        const previewContainer = $('pdfExportPreviewContainer');
        if (!previewContainer || !previewContainer.querySelector('#pdfPreviewTable')) {
            toast('Tidak ada data untuk diunduh', 'err');
            return;
        }

        let rowCount = 0;
        if (activePdfTab === 'harian') {
            rowCount = loadTransactions().filter(tx => tx.date === date).length;
        } else if (activePdfTab === 'bulanan-unit') {
            rowCount = loadTransactions().filter(tx => (tx.date || '').startsWith(month) && ['unit_iphone', 'unit_android', 'tukar_tambah'].includes(tx.category)).length;
        } else if (activePdfTab === 'bulanan-acc') {
            const txs = loadTransactions().filter(tx => (tx.date || '').startsWith(month) && tx.category === 'accessory');
            const grouped = {};
            txs.forEach(tx => {
                const key = tx.itemName || 'Lainnya';
                grouped[key] = true;
            });
            rowCount = Object.keys(grouped).length;
        } else if (activePdfTab === 'bulanan-service') {
            rowCount = loadTransactions().filter(tx => (tx.date || '').startsWith(month) && tx.category === 'service').length;
        }

        if (rowCount === 0) {
            toast('Tidak ada data untuk periode ini', 'err');
            return;
        }

        toast('Memproses pembuatan PDF...', 'info');

        try {
            await loadJsPdfLibrary();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'pt', 'a4');
            
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(37, 99, 235);
            doc.text(`IGOOD FINANCES`, 40, 40);
            
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(title, 40, 58);
            doc.text(`Dicetak pada: ${fmtDate(today())} | ${new Date().toLocaleTimeString('id-ID')}`, 40, 72);
            
            doc.autoTable({
                html: '#pdfPreviewTable',
                startY: 90,
                styles: { fontSize: 8, cellPadding: 5 },
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                footStyles: { fillColor: [237, 244, 255], textColor: 37, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [250, 251, 252] },
                margin: { left: 40, right: 40 }
            });
            
            const finalFilename = `${filename}.pdf`;
            const nativePlugin = receiptNativePlugin();
            if (nativePlugin) {
                const base64 = (doc.output('datauristring') || '').split('base64,')[1] || '';
                openNativePdfModal(finalFilename, base64);
            } else {
                doc.save(finalFilename);
                toast('Laporan PDF berhasil diunduh');
            }
            window.__igoodLastPdfExport = { filename: finalFilename, rows: rowCount, title };
        } catch (e) {
            console.error('jsPDF failed, fallback to native printing:', e);
            window.__igoodLastPdfExport = { filename: `${filename}.pdf`, rows: rowCount, title };
            const printContent = previewContainer.innerHTML;
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
                    <html>
                        <head>
                            <title>${title}</title>
                            <style>
                                body { font-family: 'Helvetica', sans-serif; padding: 25px; color: #0f172a; }
                                h1 { font-size: 16px; margin: 0 0 5px 0; color: #2563eb; }
                                p { font-size: 10px; margin: 2px 0; color: #64748b; }
                                table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; }
                                th, td { border: 1px solid #cddbf3; padding: 6px 8px; text-align: left; }
                                th { background-color: #2563eb; color: white; font-weight: bold; }
                                tr:nth-child(even) { background-color: #fafbfc; }
                                tr[style*="font-weight: bold"] { background-color: #edf4ff !important; font-weight: bold; }
                            </style>
                        </head>
                        <body onload="window.print(); setTimeout(() => window.close(), 500);">
                            <h1>IGOOD FINANCES</h1>
                            <p>${title}</p>
                            <p>Dicetak pada: ${fmtDate(today())}</p>
                            ${printContent}
                        </body>
                    </html>
                `);
                printWindow.document.close();
                toast('Membuka dialog cetak PDF browser');
            } else {
                toast('Gagal membuka print window. Cek blocker pop-up browser.', 'err');
            }
        }
    }

    function snakeToCamel(value) {
        return String(value).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    function mapSimpleCatalogFromSupabase(row) {
        const item = {};
        Object.keys(row || {}).forEach(key => {
            item[snakeToCamel(key)] = row[key];
        });
        return item;
    }

    function mapDeviceFromSupabase(row) {
        return {
            code: row.code,
            category: row.category || 'iphone',
            brand: row.brand || '',
            model: row.model || '',
            storage: row.storage || '',
            color: row.color || '',
            condition: row.condition || '',
            acquisition: row.acquisition || '',
            warranty: row.warranty || '',
            supplier: row.supplier || '',
            purchaseDate: row.purchase_date || '',
            cost: Number(row.cost) || 0,
            status: row.status || 'Available',
            soldDate: row.sold_date || '',
            soldPrice: Number(row.sold_price) || 0,
            imei: row.imei || '',
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
        };
    }

    function mapAccessoryFromSupabase(row) {
        return {
            code: row.code,
            category: row.category || '',
            brand: row.brand || '',
            name: row.name || '',
            qty: Number(row.qty) || 0,
            cost: Number(row.cost) || 0,
            totalCost: (Number(row.total_cost) || 0) || ((Number(row.qty) || 0) * (Number(row.cost) || 0)),
            sell: Number(row.sell) || 0,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
        };
    }

    function mapTransactionFromSupabase(row) {
        return {
            id: row.id,
            date: row.date || today(),
            shift: row.shift || '',
            category: row.category || '',
            code: row.code || '',
            itemName: row.item_name || '',
            condition: row.condition || '',
            buyerName: row.buyer_name || '',
            buyerWa: row.buyer_wa || '',
            salesName: row.sales_name || '',
            quantity: Number(row.quantity) || 1,
            sell: Number(row.sell) || 0,
            cost: Number(row.cost) || 0,
            bonusCost: Number(row.bonus_cost) || 0,
            bonusAccessories: Array.isArray(row.bonus_accessories) ? row.bonus_accessories : [],
            fee: Number(row.fee) || 0,
            paymentMethod: row.payment_method || 'cash',
            splitCash: Number(row.split_cash) || 0,
            splitTransfer: Number(row.split_transfer) || 0,
            splitCredit: Number(row.split_credit) || 0,
            technician: row.technician || '',
            stockRefCode: row.stock_ref_code || '',
            preorderCode: row.preorder_code || '',
            serviceOrderCode: row.service_order_code || '',
            serviceStatus: row.service_status || '',
            status: row.service_status || '',
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
            jasaCategory: row.jasa_metadata?.jasaCategory || '',
            jasaUnitName: row.jasa_metadata?.jasaUnitName || '',
            jasaImei: row.jasa_metadata?.jasaImei || '',
            jasaWarranty: row.jasa_metadata?.jasaWarranty || '',
            jasaNote: row.jasa_metadata?.jasaNote || '',
            icloudFullName: row.jasa_metadata?.icloudFullName || '',
            icloudDob: row.jasa_metadata?.icloudDob || '',
            icloudEmail: row.jasa_metadata?.icloudEmail || '',
            icloudPhone: row.jasa_metadata?.icloudPhone || '',
            icloudPassword: row.jasa_metadata?.icloudPassword || '',
        };
    }

    function mapExpenseFromSupabase(row) {
        return {
            id: row.id,
            date: row.date || today(),
            month: row.month || (row.date || today()).slice(0, 7),
            category: row.category || 'lainnya',
            description: row.description || '',
            amount: Number(row.amount) || 0,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
        };
    }

    function mapServiceOrderFromSupabase(row) {
        return {
            code: row.code,
            dateIn: row.date_in || today(),
            shift: row.shift || '',
            buyerName: row.buyer_name || '',
            buyerWa: row.buyer_wa || '',
            itemName: row.item_name || '',
            complaint: row.complaint || '',
            note: row.note || '',
            technician: row.technician || '',
            status: row.status || 'Masuk',
            paymentStatus: row.payment_status || 'Belum dibayar',
            paidAmount: Number(row.paid_amount) || 0,
            paymentMethod: row.payment_method || '',
            splitCash: Number(row.split_cash) || 0,
            splitTransfer: Number(row.split_transfer) || 0,
            splitCredit: Number(row.split_credit) || 0,
            paidDate: row.paid_date || '',
            processDate: row.process_date || '',
            cancelAmount: Number(row.cancel_amount) || 0,
            cancelDate: row.cancel_date || '',
            technicianCost: Number(row.technician_cost) || 0,
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
        };
    }

    function mapPreorderFromSupabase(row) {
        return {
            code: row.code,
            date: row.date || today(),
            shift: row.shift || '',
            buyerName: row.buyer_name || '',
            buyerWa: row.buyer_wa || '',
            salesName: row.sales_name || '',
            requestedItem: row.requested_item || '',
            note: row.note || '',
            dpAmount: Number(row.dp_amount) || 0,
            paymentMethod: row.payment_method || 'cash',
            splitCash: Number(row.split_cash) || 0,
            splitTransfer: Number(row.split_transfer) || 0,
            splitCredit: Number(row.split_credit) || 0,
            cost: Number(row.cost) || 0,
            status: row.status || 'Preorder',
            readyDate: row.ready_date || '',
            doneDate: row.done_date || '',
            cancelDate: row.cancel_date || '',
            linkedUnitCode: row.linked_unit_code || '',
            linkedTransactionId: row.linked_transaction_id || '',
            createdAt: row.created_at || new Date().toISOString(),
            updatedAt: row.updated_at || new Date().toISOString(),
        };
    }

    function mergeByKey(localItems, remoteItems, key) {
        const map = new Map();
        (localItems || []).forEach(item => item?.[key] && map.set(item[key], item));
        (remoteItems || []).forEach(item => {
            if (!item?.[key]) return;
            const existing = map.get(item[key]);
            if (existing && existing.updatedAt && item.updatedAt) {
                if (new Date(existing.updatedAt) >= new Date(item.updatedAt)) {
                    return;
                }
            }
            map.set(item[key], item);
        });
        return [...map.values()];
    }

    function writeSyncLog(message, type = 'text') {
        const terminal = $('syncLogTerminal');
        if (!terminal) return;
        const now = new Date();
        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        entry.textContent = `[${timeStr}] ${message}`;
        terminal.appendChild(entry);
        terminal.scrollTop = terminal.scrollHeight;
    }

