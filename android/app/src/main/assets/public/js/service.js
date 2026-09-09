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
            .filter(tx => tx.date === date)
            .filter(tx => shift === 'all' || tx.shift === shift);

        const serviceOrders = loadServiceOrders();
        const virtualTxs = [];
        serviceOrders.forEach(order => {
            // 1. Service Masuk
            if (order.dateIn === date && (shift === 'all' || order.shift === shift)) {
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
            if (order.status === 'Cancel' && order.cancelDate === date && (shift === 'all' || order.shift === shift)) {
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
            if (order.status === 'Selesai' && order.processDate === date && (shift === 'all' || order.shift === shift)) {
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
        const groups = groupTransactionsByCategory(transactions);
        const order = ['unit_iphone', 'unit_android', 'tukar_tambah', 'accessory', 'preorder_dp', 'order_jasa', 'service', 'other'];
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
                if (tx.salesName) lines.push(`   Sales: ${tx.salesName}`);
                const bonusText = bonusAccessoriesText(tx);
                if (bonusText) lines.push(`   Bonus: ${bonusText}`);
                if (tx.serviceStatus) lines.push(`   Status: ${tx.serviceStatus}`);
                if (tx.category === 'order_jasa') {
                    if (tx.jasaNote) lines.push(`   Keterangan: ${tx.jasaNote}`);
                }
                if (tx.category === 'tukar_tambah') {
                    lines.push(`   Harga Baru: ${fmtRp(tx.newUnitSellPrice)}`);
                    lines.push(`   Nilai Lama: -${fmtRp(tx.tradeInCost)}`);
                    lines.push(`   Jual (Net): ${fmtRp(tx.sell)}`);
                } else if (tx.preorderCode && tx.category !== 'preorder_dp') {
                    const preorder = loadPreorders().find(p => p.code === tx.preorderCode);
                    const dp = preorder ? (Number(preorder.dpAmount) || 0) : 0;
                    lines.push(`   Harga Unit: ${fmtRp(tx.sell)}`);
                    lines.push(`   DP Terbayar: -${fmtRp(dp)}`);
                    lines.push(`   Pelunasan: ${fmtRp(Math.max(0, tx.sell - dp))}`);
                } else {
                    lines.push(`   Jual: ${fmtRp(tx.sell)}`);
                }
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

    function revertTransactionStock(tx) {
        if (tx.category === 'unit_iphone' || tx.category === 'unit_android') {
            const devices = load(DB_KEYS.devices);
            const unit = devices.find(d => d.code === tx.stockRefCode);
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
            adjustBonusAccessoryStock(tx.bonusAccessories, 1);
        }
        if (tx.category === 'tukar_tambah') {
            const devices = load(DB_KEYS.devices);
            const unit = devices.find(d => d.code === tx.stockRefCode);
            if (unit) {
                unit.status = 'Available';
                delete unit.soldDate;
                delete unit.soldPrice;
                unit.updatedAt = new Date().toISOString();
                queueRecordSupabaseSync('devices', unit);
            }
            const filteredDevices = devices.filter(d => d.code !== tx.tradeInCode);
            save(DB_KEYS.devices, filteredDevices);
            adjustBonusAccessoryStock(tx.bonusAccessories || [], 1);
            if (getSupabaseConfig().enabled && tx.tradeInCode) {
                deleteRecordFromSupabase('devices', 'code', tx.tradeInCode).catch(() => {});
            }
        }
        if (tx.category === 'preorder_dp') {
            const preorders = loadPreorders();
            const filtered = preorders.filter(item => item.code !== tx.code);
            savePreorders(filtered);
            if (getSupabaseConfig().enabled) {
                deleteRecordFromSupabase('preorders', 'code', tx.code).catch(() => {});
                deleteRecordFromSupabase('transactions', 'code', tx.code).catch(() => {});
            }
        }
        if (tx.category === 'accessory') {
            const accs = load(DB_KEYS.accessories);
            const acc = accs.find(a => a.code === tx.stockRefCode);
            if (acc) {
                acc.qty = (Number(acc.qty) || 0) + (Number(tx.quantity) || 0);
                acc.updatedAt = new Date().toISOString();
                save(DB_KEYS.accessories, accs);
                queueRecordSupabaseSync('accessories', acc);
            }
        }
        
        // Revert preorder back to Ready for any sale transaction that was linked to a preorder
        if (tx.preorderCode && tx.category !== 'preorder_dp') {
            markPreorderReadyAgain(tx.preorderCode);
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

    window.voidTransaction = function (id) {
        if (!confirm('Hapus transaksi dan kembalikan stok?')) return;
        const transactions = loadTransactions();
        const tx = transactions.find(item => item.id === id);
        if (tx) {
            revertTransactionStock(tx);
            queueRecordSupabaseDelete('transactions', 'id', tx.id);
        }
        saveTransactions(transactions.filter(item => item.id !== id));
        renderDailyReport();
        renderActiveSaleForm();
        refreshAllAdminPanels();
        toast('Transaksi dibatalkan');
    };

