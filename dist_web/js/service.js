/**
 * IGOOD REPORT - Service Orders & Technician Workflow Module
 */
    function validateServiceIntake(order) {
        if (!order.dateIn) return 'Tanggal service wajib diisi';
        if (!order.buyerName) return 'Nama user wajib diisi';
        if (!order.buyerWa) return 'No. WA user wajib diisi';
        if (!order.itemName) return 'Barang service wajib diisi';
        if (!order.complaint) return 'Keluhan service wajib diisi';
        return '';
    }

    function saveServiceIntake(shouldPrint = true) {
        const order = collectServiceIntake();
        const error = validateServiceIntake(order);
        if (error) {
            toast(error, 'err');
            return;
        }
        const serviceOrders = loadServiceOrders();
        serviceOrders.push(order);
        saveServiceOrders(serviceOrders);
        queueRecordSupabaseSync('serviceOrders', order);
        toast(`Service masuk ${order.code} disimpan`);
        clearSalesDraft('service', 'masuk');
        closeSalesItemModal();
        renderActiveSaleForm(true);
        refreshAllAdminPanels();
        if (shouldPrint) {
            showServiceReceipt(order, 'STRUK SERVICE MASUK');
        }
    }

    function addServiceIntakeToCart(e) {
        const order = collectServiceIntake();
        const error = validateServiceIntake(order);
        if (error) {
            toast(error, 'err');
            return false;
        }
        
        const item = {
            id: `CART-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            category: 'service_masuk',
            date: order.dateIn,
            shift: order.shift,
            buyerName: order.buyerName,
            buyerWa: order.buyerWa,
            salesName: ($('saleSalesName')?.value || '').trim(),
            paymentMethod: '',
            quantity: 1,
            sell: 0,
            unitSell: 0,
            cost: 0,
            fee: 0,
            itemName: `Service Masuk - ${serviceOrderItemName(order)}`.trim(),
            code: order.code,
            serviceOrderData: order,
            createdAt: order.createdAt
        };
        
        activeServiceCart.push(item);
        saveSalesDraft();
        isAddingToCart = true;
        try {
            closeSalesItemModal();
        } finally {
            isAddingToCart = false;
        }
        
        if (!isTestingMode() && e) {
            let x = e.clientX;
            let y = e.clientY;
            if (!x || !y) {
                const rect = e.currentTarget?.getBoundingClientRect() || { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
                x = rect.left + rect.width / 2;
                y = rect.top + rect.height / 2;
            }
            animateFlyToCart(x, y);
        }
        
        renderActiveSaleForm(true);
        updateHeaderCartBadge();
        toast('Service masuk ditambahkan ke keranjang');
        return true;
    }

    function addServiceOutcomeToCart(e) {
        const values = serviceOutcomeValuesFromSales();
        if (!values.code) {
            toast('Pilih kode service dahulu', 'err');
            return false;
        }
        const orders = loadServiceOrders();
        const order = orders.find(item => item.code === values.code);
        if (!order) {
            toast('Kode service tidak ditemukan', 'err');
            return false;
        }
        if (activeServiceSaleMode === 'keluar' && values.paidAmount <= 0) {
            toast('Nominal pembayaran service wajib diisi', 'err');
            return false;
        }
        
        const updatedOrder = { ...order };
        updatedOrder.paymentMethod = values.paymentMethod;
        updatedOrder.paidAmount = values.paidAmount;
        const parts = servicePaymentParts(values.paidAmount, updatedOrder.paymentMethod);
        updatedOrder.splitCash = parts.splitCash;
        updatedOrder.splitTransfer = parts.splitTransfer;
        updatedOrder.splitCredit = parts.splitCredit;
        
        if (activeServiceSaleMode === 'cancel') {
            updatedOrder.status = 'Cancel';
            updatedOrder.paymentStatus = values.paidAmount > 0 ? 'Dibayar' : 'Cancel tanpa biaya';
            updatedOrder.cancelAmount = values.paidAmount;
            updatedOrder.cancelDate = today();
            updatedOrder.paidDate = values.paidAmount > 0 ? today() : '';
        } else {
            updatedOrder.status = 'Selesai';
            updatedOrder.paymentStatus = 'Dibayar';
            updatedOrder.paidDate = today();
            updatedOrder.cancelAmount = 0;
            updatedOrder.cancelDate = '';
        }
        updatedOrder.updatedAt = new Date().toISOString();
        
        const cat = activeServiceSaleMode === 'cancel' ? 'service_cancel' : 'service_keluar';
        const item = {
            id: `CART-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            category: cat,
            date: today(),
            shift: $('saleShift')?.value || 'shift pagi & malam',
            buyerName: updatedOrder.buyerName || '',
            buyerWa: updatedOrder.buyerWa || '',
            salesName: ($('saleSalesName')?.value || '').trim(),
            paymentMethod: values.paymentMethod,
            quantity: 1,
            sell: values.paidAmount,
            unitSell: values.paidAmount,
            cost: 0,
            fee: Number(updatedOrder.technicianCost) || 0,
            itemName: `${cat === 'service_cancel' ? 'Cancel Service' : 'Service Keluar'} - ${serviceOrderItemName(updatedOrder)}`.trim(),
            code: updatedOrder.code,
            serviceOrderData: updatedOrder,
            createdAt: updatedOrder.updatedAt
        };
        
        activeServiceCart.push(item);
        saveSalesDraft();
        isAddingToCart = true;
        try {
            closeSalesItemModal();
        } finally {
            isAddingToCart = false;
        }
        
        if (!isTestingMode() && e) {
            let x = e.clientX;
            let y = e.clientY;
            if (!x || !y) {
                const rect = e.currentTarget?.getBoundingClientRect() || { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
                x = rect.left + rect.width / 2;
                y = rect.top + rect.height / 2;
            }
            animateFlyToCart(x, y);
        }
        
        renderActiveSaleForm(true);
        updateHeaderCartBadge();
        toast(`${cat === 'service_cancel' ? 'Service cancel' : 'Service keluar'} ditambahkan ke keranjang`);
        return true;
    }

    function saveCurrentSale(shouldPrint = true) {
        if (activeSaleType === 'service' || activeSaleType.startsWith('service')) {
            saveServiceIntake(shouldPrint);
            return;
        }
        saveCartSale(shouldPrint);
    }

    function getDailyReportTransactions() {
        const date = $('dailyReportDate')?.value || today();
        const shift = $('dailyReportShift')?.value || 'all';
        const txs = loadTransactions()
            .filter(tx => String(tx.date || '').slice(0, 10) === date)
            .filter(tx => shift === 'all' || tx.shift === shift || (shift === 'shift pagi & malam' && (!tx.shift || tx.shift === 'shift pagi & malam')));

        const serviceOrders = loadServiceOrders();
        const virtualTxs = [];
        serviceOrders.forEach(order => {
            const orderDateIn = String(order.dateIn || '').slice(0, 10);
            const orderCancelDate = String(order.cancelDate || '').slice(0, 10);
            const orderProcessDate = String(order.processDate || '').slice(0, 10);

            // 1. Service Masuk
            if (orderDateIn === date && (shift === 'all' || order.shift === shift)) {
                virtualTxs.push({
                    id: `VIRT-IN-${order.code}`,
                    date: order.dateIn,
                    shift: order.shift,
                    category: 'service',
                    code: order.code,
                    itemName: `Service Masuk - ${serviceOrderItemName(order)}`.trim(),
                    buyerName: order.buyerName || '',
                    buyerWa: order.buyerWa || '',
                    quantity: 1,
                    sell: 0,
                    cost: 0,
                    fee: 0,
                    paymentMethod: '',
                    splitCash: 0,
                    splitTransfer: 0,
                    splitCredit: 0,
                    technician: order.technician || '',
                    serviceOrderCode: order.code,
                    serviceStatus: 'Masuk',
                    isVirtual: true,
                    createdAt: order.createdAt
                });
            }
            // 2. Service Cancel (fallback if no physical transaction exists for this code in txs)
            if (order.status === 'Cancel' && orderCancelDate === date && (shift === 'all' || order.shift === shift)) {
                const exists = txs.some(tx => tx.category === 'service' && tx.code === order.code);
                if (!exists) {
                    virtualTxs.push({
                        id: `VIRT-CANCEL-${order.code}`,
                        date: order.cancelDate,
                        shift: order.shift,
                        category: 'service',
                        code: order.code,
                        itemName: `Cancel Service - ${serviceOrderItemName(order)}`.trim(),
                        buyerName: order.buyerName || '',
                        buyerWa: order.buyerWa || '',
                        quantity: 1,
                        sell: Number(order.paidAmount) || 0,
                        cost: 0,
                        fee: Number(order.technicianCost) || 0,
                        paymentMethod: order.paymentMethod || '',
                        splitCash: order.splitCash || 0,
                        splitTransfer: order.splitTransfer || 0,
                        splitCredit: order.splitCredit || 0,
                        technician: order.technician || '',
                        serviceOrderCode: order.code,
                        serviceStatus: 'Cancel',
                        isVirtual: true,
                        createdAt: order.updatedAt || order.createdAt
                    });
                }
            }
            // 3. Service Keluar (fallback if no physical transaction exists for this code in txs)
            if (order.status === 'Selesai' && orderProcessDate === date && (shift === 'all' || order.shift === shift)) {
                const exists = txs.some(tx => tx.category === 'service' && tx.code === order.code);
                if (!exists) {
                    virtualTxs.push({
                        id: `VIRT-OUT-${order.code}`,
                        date: order.processDate,
                        shift: order.shift,
                        category: 'service',
                        code: order.code,
                        itemName: `Service Keluar - ${serviceOrderItemName(order)}`.trim(),
                        buyerName: order.buyerName || '',
                        buyerWa: order.buyerWa || '',
                        quantity: 1,
                        sell: Number(order.paidAmount) || 0,
                        cost: 0,
                        fee: Number(order.technicianCost) || 0,
                        paymentMethod: order.paymentMethod || 'cash',
                        splitCash: order.splitCash || 0,
                        splitTransfer: order.splitTransfer || 0,
                        splitCredit: order.splitCredit || 0,
                        technician: order.technician || '',
                        serviceOrderCode: order.code,
                        serviceStatus: 'Keluar',
                        isVirtual: true,
                        createdAt: order.updatedAt || order.createdAt
                    });
                }
            }
        });

        const allTxs = [...txs, ...virtualTxs];
        return allTxs.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
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

    function buildDailyReportWhatsappText(transactions) {
        const date = $('dailyReportDate')?.value || today();
        const shift = $('dailyReportShift')?.value || 'all';
        transactions = (transactions || []).map(tx => (tx.category === 'tukar_tambah' && typeof enrichTradeInTransaction === 'function') ? enrichTradeInTransaction(tx) : tx);
        const groups = groupTransactionsByCategory(transactions);
        const order = ['unit_iphone', 'unit_android', 'tukar_tambah', 'accessory', 'preorder_dp', 'order_jasa', 'order_jasa_beacukai', 'order_jasa_icloud', 'service', 'other'];
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
                const conditionText = (tx.category === 'tukar_tambah' ? '' : (tx.condition ? ` ${tx.condition}` : ''));
                lines.push(`${index + 1}. ${tx.code || '-'} | ${tx.itemName}${conditionText}${qtyText}`);
                lines.push(`   ${tx.buyerName || '-'} | ${tx.buyerWa || '-'}`);
                if (tx.salesName) lines.push(`   Sales: ${tx.salesName}`);
                const bonusText = bonusAccessoriesText(tx);
                if (bonusText) lines.push(`   Bonus: ${bonusText}`);
                if (tx.serviceStatus) lines.push(`   Status: ${tx.serviceStatus}`);
                if (tx.category && (tx.category.startsWith('order_jasa') || tx.category === 'order_jasa')) {
                    if (tx.jasaNote) lines.push(`   Keterangan: ${tx.jasaNote}`);
                    if (tx.jasaImei) lines.push(`   IMEI: ${tx.jasaImei}`);
                }
                if (tx.category === 'tukar_tambah') {
                    const newPrice = Number(tx.newUnitSellPrice) || ((Number(tx.sell) || 0) + (Number(tx.tradeInCost) || 0)) || Number(tx.sell) || 0;
                    const oldCost = Number(tx.tradeInCost) || (newPrice > Number(tx.sell) ? newPrice - Number(tx.sell) : 0);
                    const netSell = Number(tx.sell);
                    const oldDeviceDesc = `${tx.tradeInBrand || ''} ${tx.tradeInModel || ''} ${tx.tradeInStorage || ''}`.trim() || 'Unit HP Lama';
                    lines.push(`   • HP Dijual Toko  : ${fmtRp(newPrice)}`);
                    lines.push(`   • HP Ditarik (TT) : -${fmtRp(oldCost)} (${oldDeviceDesc})`);
                    lines.push(`   • Selisih Bayar   : ${fmtRp(netSell)}`);
                } else if (tx.preorderCode && tx.category !== 'preorder_dp') {
                    const preorder = loadPreorders().find(p => p.code === tx.preorderCode);
                    const dp = preorder ? (Number(preorder.dpAmount) || 0) : 0;
                    lines.push(`   Harga Unit: ${fmtRp(tx.sell)}`);
                    lines.push(`   DP Terbayar: -${fmtRp(dp)}`);
                    lines.push(`   Pelunasan: ${fmtRp(Math.max(0, tx.sell - dp))}`);
                } else {
                    lines.push(`   Jual: ${fmtRp(tx.sell)}`);
                }
                lines.push(`   Bayar: ${formatPaymentDetail(tx)}`);
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

    function revertTransactionStock(tx) {
        if (!tx) return;
        try {
            if (tx.category === 'unit_iphone' || tx.category === 'unit_android') {
                const devices = load(DB_KEYS.devices) || [];
                const targetCode = tx.stockRefCode || tx.code;
                const unit = devices.find(d => d.code === targetCode);
                if (unit) {
                    unit.status = 'Available';
                    delete unit.soldDate;
                    delete unit.soldPrice;
                    unit.updatedAt = new Date().toISOString();
                    save(DB_KEYS.devices, devices);
                    queueRecordSupabaseSync('devices', unit);
                } else {
                    save(DB_KEYS.devices, devices);
                }
                if (typeof adjustBonusAccessoryStock === 'function') {
                    adjustBonusAccessoryStock(tx.bonusAccessories || [], 1);
                }
            } else if (tx.category === 'tukar_tambah') {
                const devices = load(DB_KEYS.devices) || [];
                const targetCode = tx.stockRefCode || tx.code;
                const unit = devices.find(d => d.code === targetCode);
                if (unit) {
                    unit.status = 'Available';
                    delete unit.soldDate;
                    delete unit.soldPrice;
                    unit.updatedAt = new Date().toISOString();
                    queueRecordSupabaseSync('devices', unit);
                }
                const filteredDevices = tx.tradeInCode ? devices.filter(d => d.code !== tx.tradeInCode) : devices;
                save(DB_KEYS.devices, filteredDevices);
                if (typeof adjustBonusAccessoryStock === 'function') {
                    adjustBonusAccessoryStock(tx.bonusAccessories || [], 1);
                }
                if (tx.tradeInCode) {
                    queueRecordSupabaseDelete('devices', 'code', tx.tradeInCode);
                }
            } else if (tx.category === 'preorder_dp') {
                const preorders = loadPreorders();
                const targetPo = preorders.find(item => item.code === tx.code || (tx.preorderCode && item.code === tx.preorderCode));
                if (targetPo) {
                    // Also remove the auto-created stock unit in devices if preorder was already set to Ready
                    const devices = load(DB_KEYS.devices) || [];
                    let remainingDevs = devices;
                    if (targetPo.linkedUnitCode) {
                        remainingDevs = remainingDevs.filter(d => d.code !== targetPo.linkedUnitCode);
                        queueRecordSupabaseDelete('devices', 'code', targetPo.linkedUnitCode);
                    }
                    if (targetPo.imei) {
                        const beforeCount = remainingDevs.length;
                        remainingDevs = remainingDevs.filter(d => d.imei !== targetPo.imei);
                        if (remainingDevs.length !== beforeCount) {
                            queueRecordSupabaseDelete('devices', 'imei', targetPo.imei);
                        }
                    }
                    if (remainingDevs.length !== devices.length) {
                        save(DB_KEYS.devices, remainingDevs);
                    }
                }
                const filtered = preorders.filter(item => item.code !== tx.code && (!tx.preorderCode || item.code !== tx.preorderCode));
                savePreorders(filtered);
                queueRecordSupabaseDelete('preorders', 'code', tx.code || tx.preorderCode);
                if (typeof renderDeviceStock === 'function') renderDeviceStock();
                if (typeof renderPreorders === 'function') renderPreorders();
                if (typeof renderActiveSaleForm === 'function') renderActiveSaleForm();
            } else if (tx.category === 'accessory') {
                const accs = load(DB_KEYS.accessories) || [];
                const targetCode = tx.stockRefCode || tx.code;
                const acc = accs.find(a => a.code === targetCode);
                if (acc) {
                    acc.qty = (Number(acc.qty) || 0) + (Number(tx.quantity) || 1);
                    acc.updatedAt = new Date().toISOString();
                    save(DB_KEYS.accessories, accs);
                    queueRecordSupabaseSync('accessories', acc);
                }
            }
            
            // Revert preorder back to Ready for any sale transaction that was linked to a preorder
            if (tx.preorderCode && tx.category !== 'preorder_dp') {
                if (typeof markPreorderReadyAgain === 'function') {
                    markPreorderReadyAgain(tx.preorderCode);
                }
            }

            // Revert service transaction back to Service Masuk (Antrian)
            if (tx.category === 'service' || tx.category === 'service_keluar' || tx.category === 'service_cancel') {
                const orders = loadServiceOrders();
                const targetCode = tx.serviceOrderCode || tx.code;
                const order = orders.find(o => o.code === targetCode || String(o.id) === String(tx.id));
                if (order) {
                    order.status = 'Masuk';
                    order.paymentStatus = 'Belum dibayar';
                    order.paidAmount = 0;
                    order.cancelAmount = 0;
                    order.paidDate = '';
                    order.cancelDate = '';
                    order.paymentMethod = '';
                    order.splitCash = 0;
                    order.splitTransfer = 0;
                    order.splitCredit = 0;
                    order.updatedAt = new Date().toISOString();
                    saveServiceOrders(orders);
                    queueRecordSupabaseSync('serviceOrders', order);
                    if (typeof renderServiceOrders === 'function') renderServiceOrders();
                }
            }
        } catch (err) {
            console.warn('[revertTransactionStock error]', err);
        }
    }

    window.printTransactionReceiptFromHistory = function (id) {
        if (id.startsWith('VIRT-')) {
            const parts = id.split('-');
            const type = parts[1]; // IN, CANCEL, OUT
            const code = parts.slice(2).join('-');
            const order = loadServiceOrders().find(o => o.code === code);
            if (!order) {
                toast('Service order tidak ditemukan', 'err');
                return;
            }
            let title = 'STRUK SERVICE MASUK';
            if (type === 'CANCEL') title = 'STRUK SERVICE CANCEL';
            else if (type === 'OUT') title = 'STRUK SERVICE KELUAR';
            showServiceReceipt(order, title);
            return;
        }

        const transactions = loadTransactions();
        const tx = transactions.find(item => item.id === id);
        if (!tx) {
            toast('Transaksi tidak ditemukan', 'err');
            return;
        }
        if (tx.category === 'service') {
            const order = loadServiceOrders().find(o => o.code === tx.code);
            if (order) {
                let title = 'STRUK SERVICE MASUK';
                if (order.status === 'Selesai') title = 'STRUK SERVICE KELUAR';
                else if (order.status === 'Cancel') title = 'STRUK SERVICE CANCEL';
                showServiceReceipt(order, title);
            } else {
                showTransactionReceipt([tx], 'STRUK TRANSAKSI');
            }
        } else if (tx.category === 'preorder_dp') {
            showTransactionReceipt(tx, 'STRUK DP PREORDER');
        } else if (tx.receiptCode) {
            const group = transactions.filter(item => item.receiptCode === tx.receiptCode)
                .sort((a, b) => (a.receiptLineNo || 0) - (b.receiptLineNo || 0));
            showTransactionReceipt(group, 'STRUK TRANSAKSI');
        } else {
            showTransactionReceipt([tx], 'STRUK TRANSAKSI');
        }
    };

    let pendingVoidTxId = null;

    window.voidTransaction = function (id) {
        const targetId = String(id || '').trim();
        if (!targetId) return;
        pendingVoidTxId = targetId;

        const transactions = loadTransactions();
        const tx = transactions.find(item => String(item.id).trim() === targetId);

        const detailsEl = $('voidConfirmDetails');
        if (detailsEl) {
            if (tx) {
                detailsEl.innerHTML = `
                    <div style="font-weight: 700; color: var(--text); margin-bottom: 6px; font-size: 13px;">${esc(tx.itemName || 'Unit/Produk')}</div>
                    <div style="color: var(--text-dim); display: grid; grid-template-columns: auto 1fr; gap: 3px 8px;">
                        <span>Kategori:</span> <strong style="color: var(--text);">${esc(transactionCategoryLabel(tx.category))}</strong>
                        <span>Kode:</span> <span class="mono">${esc(tx.stockRefCode || tx.code || '-')}</span>
                        <span>Total:</span> <strong style="color: var(--primary);">${fmtRp(tx.sell)}</strong>
                        <span>Tanggal:</span> <span>${fmtDate(tx.date)}</span>
                    </div>
                `;
            } else {
                detailsEl.innerHTML = `
                    <div style="font-weight: 700; color: var(--text); margin-bottom: 4px;">ID Transaksi: ${esc(targetId)}</div>
                    <div style="color: var(--text-dim);">Data akan dihapus dari server database.</div>
                `;
            }
        }

        const modal = $('voidConfirmModal');
        if (modal) {
            modal.classList.add('open');
        } else {
            if (confirm('Hapus transaksi dan kembalikan stok?')) {
                executeVoidTransaction(targetId);
            }
        }
    };

    window.closeVoidConfirmModal = function () {
        const modal = $('voidConfirmModal');
        if (modal) modal.classList.remove('open');
        pendingVoidTxId = null;
    };

    window.executeVoidTransaction = function (id) {
        const targetId = String(id || pendingVoidTxId || '').trim();
        if (!targetId) return;

        const transactions = loadTransactions();
        const tx = transactions.find(item => String(item.id).trim() === targetId);
        if (tx) {
            revertTransactionStock(tx);
            // Clean from pendingPushQueue
            const pendingQueue = load(DB_KEYS.pendingPushQueue) || [];
            save(DB_KEYS.pendingPushQueue, pendingQueue.filter(q => !(q.tableKey === 'transactions' && String(q.idValue) === String(tx.id))));
            // Queue and execute Supabase delete
            queueRecordSupabaseDelete('transactions', 'id', tx.id);
        } else {
            queueRecordSupabaseDelete('transactions', 'id', targetId);
        }

        const updated = transactions.filter(item => String(item.id).trim() !== targetId);
        saveTransactions(updated);

        closeVoidConfirmModal();

        try {
            renderDailyReport();
            if (typeof renderActiveSaleForm === 'function') renderActiveSaleForm();
            if (typeof refreshAllAdminPanels === 'function') refreshAllAdminPanels();
            if (typeof refreshDashboard === 'function') refreshDashboard();
        } catch (e) {
            console.warn('[executeVoidTransaction render error]', e);
        }

        toast('Transaksi berhasil dihapus & stok dikembalikan', 'ok');
    };

