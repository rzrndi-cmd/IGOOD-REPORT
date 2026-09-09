/**
 * IGOOD REPORT - Supabase Sync & Cloud Database Module
 */

    // ── Helper functions (must be defined before getSupabaseConfig) ─────────

    function decodeJwtPayload(key) {
        try {
            const payload = String(key || '').split('.')[1];
            if (!payload) return {};
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
            return JSON.parse(atob(padded));
        } catch {
            return {};
        }
    }

    function isUnsafeSupabaseKey(key) {
        const value = String(key || '');
        if (/service_role|sb_secret_/i.test(value)) return true;
        return decodeJwtPayload(value).role === 'service_role';
    }

    function parseSupabaseTextConfig(text) {
        const source = String(text || '');
        const url = source.match(/https:\/\/[^\s'"]+\.supabase\.co(?:\/rest\/v1\/?)?/i)?.[0] || '';
        const lines = source.split(/\r?\n/);
        const lineValue = (pattern) => {
            const line = lines.find(item => pattern.test(item));
            if (!line) return '';
            return line.split(':').slice(1).join(':').trim();
        };
        const publishKey = lineValue(/^\s*publish(?:able)?(?:\s*key)?\s*:/i);
        const anonKey = lineValue(/^\s*anon(?:\s*public|\s*key)?\s*:/i);
        const key = publishKey || anonKey;
        return url ? { url, key } : {};
    }


    function getSupabaseConfig() {
        const local = readObject(DB_KEYS.supabaseConfig);
        const globalConfig = window.IGOOD_SUPABASE || {};
        const merged = { ...globalConfig, ...local };
        const key = String(merged.key || merged.publishableKey || merged.anonKey || '').trim();
        const url = normalizeSupabaseBaseUrl(merged.url || merged.supabaseUrl || '');
        const tables = { ...SUPABASE_TABLES, ...(merged.tables || {}) };
        const unsafeKey = isUnsafeSupabaseKey(key);

        return {
            enabled: Boolean(url && key && !unsafeKey),
            hasUrl: Boolean(url),
            hasKey: Boolean(key),
            unsafeKey,
            url,
            key,
            tables,
        };
    }

    function setSupabaseStatus(message, type = 'info') {
        const el = $('supabaseStatus');
        if (el) {
            el.textContent = message;
            el.className = `sync-status ${type}`;
        }
        
        const syncText = $('syncSupabaseStatusText');
        const syncIcon = $('syncSupabaseStatusIcon');
        if (syncText && syncIcon) {
            syncText.textContent = message;
            
            // Map status type to dot color class
            let dotClass = 'dot-gray';
            if (type === 'ok') dotClass = 'dot-green';
            else if (type === 'err') dotClass = 'dot-red';
            else if (type === 'info') dotClass = 'dot-info';
            
            syncIcon.className = `sync-status-dot ${dotClass}`;
        }
    }

    function supabaseHeaders(config) {
        const headers = {
            apikey: config.key,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
        };
        if (/^eyJ/.test(config.key)) headers.Authorization = `Bearer ${config.key}`;
        return headers;
    }

    function supabaseUrlFor(tableKey, query = '') {
        const config = getSupabaseConfig();
        const table = config.tables[tableKey];
        if (!config.enabled || !table) return '';
        const suffix = query ? (query.startsWith('?') ? query : `?${query}`) : '';
        return `${config.url}/rest/v1/${encodeURIComponent(table)}${suffix}`;
    }

    async function supabaseRequest(tableKey, options = {}) {
        const config = getSupabaseConfig();
        if (config.unsafeKey) throw new Error('Jangan gunakan service role atau secret key di aplikasi.');
        if (!config.enabled) throw new Error('Supabase URL dan publishable/anon key belum lengkap.');
        const url = supabaseUrlFor(tableKey, options.query || '');
        if (!url) throw new Error(`Tabel Supabase ${tableKey} belum dikonfigurasi.`);
        const response = await fetch(url, {
            method: options.method || 'GET',
            headers: supabaseHeaders(config),
            body: options.body == null ? undefined : JSON.stringify(options.body),
        });
        if (!response.ok) {
            const text = await response.text().catch(() => '');
            throw new Error(`Supabase ${response.status}: ${text || response.statusText}`);
        }
        if (response.status === 204) return null;
        const text = await response.text();
        return text ? JSON.parse(text) : null;
    }

    function mapDeviceForSupabase(device) {
        const payload = {
            code: device.code,
            category: device.category || 'iphone',
            brand: device.brand || '',
            model: device.model || '',
            storage: device.storage || '',
            color: device.color || '',
            condition: device.condition || '',
            acquisition: device.acquisition || '',
            warranty: device.warranty || '',
            supplier: device.supplier || '',
            purchase_date: device.purchaseDate || null,
            cost: Number(device.cost) || 0,
            status: device.status || 'Available',
            sold_date: device.soldDate || null,
            sold_price: Number(device.soldPrice) || 0,
            imei: device.imei || '',
            created_at: device.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        return payload;
    }

    function mapAccessoryForSupabase(accessory) {
        return {
            code: accessory.code,
            category: accessory.category || '',
            brand: accessory.brand || '',
            name: accessory.name || '',
            qty: Number(accessory.qty) || 0,
            cost: Number(accessory.cost) || 0,
            total_cost: Number(accessory.totalCost) || ((Number(accessory.qty) || 0) * (Number(accessory.cost) || 0)),
            sell: Number(accessory.sell) || 0,
            created_at: accessory.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
    }

    function mapTransactionForSupabase(tx, options = {}) {
        const includeReceiptFields = options.includeReceiptFields !== false;
        const includeTradeInFields = options.includeTradeInFields !== false;
        const isIcloud = tx.category === 'order_jasa_icloud';
        const mapped = {
            id: tx.id,
            date: tx.date || today(),
            shift: tx.shift || '',
            category: tx.category || '',
            code: isIcloud ? '' : (tx.code || ''),
            item_name: isIcloud ? 'Jasa Pembuatan iCloud' : (tx.itemName || ''),
            condition: tx.condition || '',
            buyer_name: isIcloud ? '' : (tx.buyerName || ''),
            buyer_wa: isIcloud ? '' : (tx.buyerWa || ''),
            sales_name: tx.salesName || '',
            quantity: Number(tx.quantity) || 1,
            sell: Number(tx.sell) || 0,
            cost: Number(tx.cost) || 0,
            bonus_cost: Number(tx.bonusCost) || 0,
            bonus_accessories: tx.bonusAccessories || [],
            fee: Number(tx.fee) || 0,
            payment_method: tx.paymentMethod || 'cash',
            split_cash: Number(tx.splitCash) || 0,
            split_transfer: Number(tx.splitTransfer) || 0,
            split_credit: Number(tx.splitCredit) || 0,
            imei: tx.imei || '',
            technician: tx.technician || '',
            stock_ref_code: isIcloud ? '' : (tx.stockRefCode || ''),
            preorder_code: tx.preorderCode || '',
            service_order_code: tx.serviceOrderCode || '',
            service_status: tx.serviceStatus || '',
            created_at: tx.createdAt || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            jasa_metadata: tx.jasaMetadata || (tx.category === 'tukar_tambah' ? {
                tradeIn: true,
                newUnitSellPrice: Number(tx.newUnitSellPrice) || 0,
                tradeInCost: Number(tx.tradeInCost) || 0,
                tradeInBrand: tx.tradeInBrand || '',
                tradeInModel: tx.tradeInModel || '',
                tradeInStorage: tx.tradeInStorage || '',
                tradeInColor: tx.tradeInColor || '',
                tradeInCondition: tx.tradeInCondition || '',
                tradeInWarranty: tx.tradeInWarranty || '',
                tradeInImei: tx.tradeInImei || '',
                tradeInCode: tx.tradeInCode || '',
                tradeInNote: tx.tradeInNote || '',
            } : ((tx.category && (tx.category.startsWith('order_jasa') || tx.category === 'order_jasa_icloud')) ? {
                jasaCategory: tx.jasaCategory || '',
                jasaUnitName: tx.jasaUnitName || '',
                jasaImei: tx.jasaImei || '',
                jasaWarranty: tx.jasaWarranty || '',
                jasaNote: tx.jasaNote || '',
                icloudFullName: tx.icloudFullName || '',
                icloudDob: tx.icloudDob || '',
                icloudEmail: tx.icloudEmail || '',
                icloudPhone: tx.icloudPhone || '',
                icloudPassword: tx.icloudPassword || ''
            } : null)),
        };
        if (includeReceiptFields) {
            mapped.receipt_code = tx.receiptCode || '';
            mapped.receipt_line_no = Number(tx.receiptLineNo) || 0;
            mapped.paid_amount = Number(tx.paidAmount || tx.receiptPaidAmount) || 0;
            mapped.change_amount = Number(tx.changeAmount || tx.receiptChangeAmount) || 0;
        }
        if (includeTradeInFields && tx.category === 'tukar_tambah') {
            mapped.new_unit_sell_price = Number(tx.newUnitSellPrice) || 0;
            mapped.trade_in_cost = Number(tx.tradeInCost) || 0;
            mapped.trade_in_brand = tx.tradeInBrand || '';
            mapped.trade_in_model = tx.tradeInModel || '';
            mapped.trade_in_storage = tx.tradeInStorage || '';
            mapped.trade_in_color = tx.tradeInColor || '';
            mapped.trade_in_condition = tx.tradeInCondition || '';
            mapped.trade_in_imei = tx.tradeInImei || '';
            mapped.trade_in_code = tx.tradeInCode || '';
        }
        return mapped;
    }

    function mapServiceOrderForSupabase(order) {
        return {
            code: order.code,
            date_in: order.dateIn || today(),
            shift: order.shift || '',
            buyer_name: order.buyerName || '',
            buyer_wa: order.buyerWa || '',
            item_name: order.itemName || '',
            complaint: order.complaint || '',
            note: order.note || '',
            technician: order.technician || '',
            status: order.status || 'Masuk',
            payment_status: order.paymentStatus || 'Belum dibayar',
            paid_amount: Number(order.paidAmount) || 0,
            payment_method: order.paymentMethod || '',
            split_cash: Number(order.splitCash) || 0,
            split_transfer: Number(order.splitTransfer) || 0,
            split_credit: Number(order.splitCredit) || 0,
            paid_date: order.paidDate || null,
            process_date: order.processDate || null,
            cancel_amount: Number(order.cancelAmount) || 0,
            cancel_date: order.cancelDate || null,
            technician_cost: Number(order.technicianCost) || 0,
            created_at: order.createdAt || new Date().toISOString(),
            updated_at: order.updatedAt || new Date().toISOString(),
        };
    }

    function mapPreorderForSupabase(preorder) {
        return {
            code: preorder.code,
            date: preorder.date || today(),
            shift: preorder.shift || '',
            buyer_name: preorder.buyerName || '',
            buyer_wa: preorder.buyerWa || '',
            sales_name: preorder.salesName || '',
            requested_item: preorder.requestedItem || '',
            note: preorder.note || '',
            dp_amount: Number(preorder.dpAmount) || 0,
            payment_method: preorder.paymentMethod || 'cash',
            split_cash: Number(preorder.splitCash) || 0,
            split_transfer: Number(preorder.splitTransfer) || 0,
            split_credit: Number(preorder.splitCredit) || 0,
            cost: Number(preorder.cost) || 0,
            status: preorder.status || 'Preorder',
            ready_date: preorder.readyDate || null,
            done_date: preorder.doneDate || null,
            cancel_date: preorder.cancelDate || null,
            linked_unit_code: preorder.linkedUnitCode || '',
            linked_transaction_id: preorder.linkedTransactionId || '',
            created_at: preorder.createdAt || new Date().toISOString(),
            updated_at: preorder.updatedAt || new Date().toISOString(),
        };
    }

    function mapSimpleCatalogForSupabase(item) {
        const mapped = {};
        Object.keys(item || {}).forEach(key => {
            const snake = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            mapped[snake] = item[key];
        });
        mapped.updated_at = new Date().toISOString();
        return mapped;
    }

    async function pushRecordToSupabase(tableKey, record) {
        const mapped = {
            devices: mapDeviceForSupabase,
            accessories: mapAccessoryForSupabase,
            transactions: mapTransactionForSupabase,
            serviceOrders: mapServiceOrderForSupabase,
            preorders: mapPreorderForSupabase,
        }[tableKey]?.(record) || mapSimpleCatalogForSupabase(record);
        try {
            return await supabaseRequest(tableKey, { method: 'POST', body: mapped });
        } catch (error) {
            const msg = error.message || '';
            // Fallback 1: transactions schema mismatch (extra columns not in Supabase)
            if (tableKey === 'transactions' && /receipt_code|receipt_line_no|paid_amount|change_amount|column|schema cache|new_unit_sell_price|trade_in_cost|trade_in_brand|trade_in_model|trade_in_storage|trade_in_color|trade_in_condition|trade_in_imei|trade_in_code/i.test(msg)) {
                return supabaseRequest(tableKey, { method: 'POST', body: mapTransactionForSupabase(record, { includeReceiptFields: false, includeTradeInFields: false }) });
            }
            // Fallback 2: Generic PGRST204 - column not found in schema cache, strip offending field and retry
            if (/PGRST204|Could not find the '([^']+)' column/i.test(msg)) {
                const colMatch = msg.match(/Could not find the '([^']+)' column/i);
                if (colMatch && colMatch[1]) {
                    const badCol = colMatch[1];
                    console.warn(`[Supabase] Kolom '${badCol}' belum ada di tabel ${tableKey}, melewati kolom tersebut.`);
                    const stripped = { ...mapped };
                    delete stripped[badCol];
                    return supabaseRequest(tableKey, { method: 'POST', body: stripped });
                }
            }
            throw error;
        }
    }

    
    function ensureSupabaseConfigLoaded() {
        if (supabaseConfigLoadPromise) return supabaseConfigLoadPromise;
        supabaseConfigLoadPromise = loadSupabaseUrlTextFile();
        return supabaseConfigLoadPromise;
    }

    function addToDeletedQueue(tableKey, column, value) {
        const queue = load(DB_KEYS.deletedQueue) || [];
        queue.push({ tableKey, column, value });
        save(DB_KEYS.deletedQueue, queue);
    }

    function queueRecordSupabaseSync(tableKey, record) {
        if (!record) return;

        // Save to pendingPushQueue in localStorage
        const queue = load(DB_KEYS.pendingPushQueue) || [];
        
        // Identify primary key column
        const primaryCol = {
            devices: 'code',
            accessories: 'code',
            technicians: 'name',
            serviceCatalog: 'code',
            preorders: 'code',
            serviceOrders: 'code',
            otherCatalog: 'code',
            transactions: 'id',
            expenses: 'id',
            employees: 'id'
        }[tableKey] || 'id';

        const idValue = record[primaryCol === 'id' ? 'id' : (primaryCol === 'name' ? 'name' : 'code')];
        
        // Prevent duplicate queue entries for the same item
        const existingIdx = queue.findIndex(q => q.tableKey === tableKey && q.idValue === idValue);
        if (existingIdx >= 0) {
            queue[existingIdx].record = record;
        } else {
            queue.push({ tableKey, idValue, record });
        }
        save(DB_KEYS.pendingPushQueue, queue);
        updateSyncIndicator();

        const isTesting = isTestingMode();
        if (isTesting || getSupabaseConfig().enabled) {
            pushRecordToSupabase(tableKey, record).then(() => {
                // Remove from queue upon successful push
                const currentQueue = load(DB_KEYS.pendingPushQueue) || [];
                const updatedQueue = currentQueue.filter(q => !(q.tableKey === tableKey && q.idValue === idValue));
                save(DB_KEYS.pendingPushQueue, updatedQueue);
                updateSyncIndicator();
                window.__igoodLastSupabaseSync = { ok: true, at: new Date().toISOString() };
            }).catch(err => {
                console.warn(`Real-time push failed for ${tableKey}/${idValue}, kept in queue:`, err);
                window.__igoodLastSupabaseSync = { ok: false, err: err.message };
            });
        }
    }

    function queueRecordSupabaseDelete(tableKey, column, value) {
        addToDeletedQueue(tableKey, column, value);
        updateSyncIndicator();

        const isTesting = isTestingMode();
        if (isTesting || getSupabaseConfig().enabled) {
            deleteRecordFromSupabase(tableKey, column, value).then(() => {
                // Remove from queue upon successful delete
                const currentQueue = load(DB_KEYS.deletedQueue) || [];
                const updatedQueue = currentQueue.filter(q => !(q.tableKey === tableKey && q.column === column && q.value === value));
                save(DB_KEYS.deletedQueue, updatedQueue);
                updateSyncIndicator();
            }).catch(err => {
                console.warn(`Real-time delete failed for ${tableKey}/${column}=${value}, kept in deletedQueue:`, err);
            });
        }
    }

    async function deleteRecordFromSupabase(tableKey, column, value) {
        return supabaseRequest(tableKey, {
            method: 'DELETE',
            query: `${encodeURIComponent(column)}=eq.${encodeURIComponent(value)}`
        });
    }

    function transactionStockRecord(tx) {
        if (tx.category === 'unit_iphone' || tx.category === 'unit_android') {
            return { tableKey: 'devices', record: load(DB_KEYS.devices).find(d => d.code === tx.stockRefCode) };
        }
        if (tx.category === 'accessory') {
            return { tableKey: 'accessories', record: load(DB_KEYS.accessories).find(a => a.code === tx.stockRefCode) };
        }
        return { tableKey: '', record: null };
    }

    async function syncSaleToSupabase(tx) {
        if (!getSupabaseConfig().enabled) {
            window.__igoodLastSupabaseSync = { ok: false, skipped: true, reason: 'not_configured' };
            return;
        }
        const tasks = [pushRecordToSupabase('transactions', tx)];
        const stock = transactionStockRecord(tx);
        if (stock.tableKey && stock.record) tasks.push(pushRecordToSupabase(stock.tableKey, stock.record));
        if (tx.category === 'tukar_tambah') {
            const devices = load(DB_KEYS.devices) || [];
            if (tx.stockRefCode) {
                const soldUnit = devices.find(d => d.code === tx.stockRefCode);
                if (soldUnit) tasks.push(pushRecordToSupabase('devices', soldUnit));
            }
            if (tx.tradeInCode) {
                const oldUnit = devices.find(d => d.code === tx.tradeInCode);
                if (oldUnit) tasks.push(pushRecordToSupabase('devices', oldUnit));
            }
        }
        await Promise.all(tasks);
        window.__igoodLastSupabaseSync = { ok: true, at: new Date().toISOString() };
        setSupabaseStatus('Supabase: transaksi terakhir tersinkron.', 'ok');
    }

    function queueSaleSupabaseSync(tx) {
        queueRecordSupabaseSync('transactions', tx);
        const stock = transactionStockRecord(tx);
        if (stock.tableKey && stock.record) {
            queueRecordSupabaseSync(stock.tableKey, stock.record);
        }
        if (tx.category === 'tukar_tambah') {
            const devices = load(DB_KEYS.devices) || [];
            if (tx.stockRefCode) {
                const soldUnit = devices.find(d => d.code === tx.stockRefCode);
                if (soldUnit) queueRecordSupabaseSync('devices', soldUnit);
            }
            if (tx.tradeInCode) {
                const oldUnit = devices.find(d => d.code === tx.tradeInCode);
                if (oldUnit) queueRecordSupabaseSync('devices', oldUnit);
            }
        }
    }

    function loadExpenses() {
        return load(DB_KEYS.expenses) || [];
    }

    function saveExpenses(data) {
        save(DB_KEYS.expenses, data);
    }

    function newExpenseId() {
        return 'EXP-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    }

    const EXPENSE_CATEGORIES = [
        { value: 'gaji', label: 'Gaji Karyawan' },
        { value: 'sewa', label: 'Sewa Toko' },
        { value: 'listrik', label: 'Listrik & Utilitas' },
        { value: 'internet', label: 'Internet & Komunikasi' },
        { value: 'transportasi', label: 'Transportasi' },
        { value: 'pembelian', label: 'Pembelian Perlengkapan' },
        { value: 'iklan', label: 'Biaya Iklan & Promosi' },
        { value: 'lainnya', label: 'Lain-lain' },
    ];

    function syncSalesPageChrome() {
        const isService = activeSaleType.startsWith('service') || activeSaleType === 'service';
        const isOrderJasa = activeSaleType.startsWith('order_jasa') || activeSaleType === 'order_jasa';
        if ($('salesPageTitle')) {
            if (isService) {
                $('salesPageTitle').textContent = 'Service';
            } else if (activeSaleType === 'order_jasa_monitoring') {
                $('salesPageTitle').textContent = 'Monitoring IMEI';
            } else if (isOrderJasa) {
                $('salesPageTitle').textContent = 'Order-Jasa';
            } else {
                $('salesPageTitle').textContent = 'Penjualan';
            }
        }
        if ($('salesPageSubtitle')) {
            if (isService) {
                $('salesPageSubtitle').textContent = 'Kelola service masuk, service keluar, dan service cancel.';
            } else if (activeSaleType === 'order_jasa_monitoring') {
                $('salesPageSubtitle').textContent = 'Pantau status pendaftaran IMEI dan Bea Cukai.';
            } else if (isOrderJasa) {
                $('salesPageSubtitle').textContent = 'Sub-Menu Penjualan IMEI & Jasa';
            } else {
                $('salesPageSubtitle').textContent = 'Input transaksi sesuai kategori barang.';
            }
        }

        const dateTimeCard = $('salesDateTimeCard');
        if (dateTimeCard) {
            dateTimeCard.classList.toggle('hidden', activeSaleType === 'order_jasa_monitoring');
        }

        const categoryGrid = document.querySelector('.sales-category-grid');
        if (categoryGrid) {
            let targetMode = 'sales';
            if (isService) targetMode = 'service';
            if (isOrderJasa) targetMode = 'order_jasa';

            const currentlyShowing = categoryGrid.dataset.showingMode || '';
            if (currentlyShowing !== targetMode) {
                categoryGrid.dataset.showingMode = targetMode;
                if (targetMode === 'service') {
                    categoryGrid.innerHTML = `
                        <button type="button" class="sale-tab" data-sale-type="service_masuk" data-service-sale-mode="masuk">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                            <span>Service Masuk</span>
                        </button>
                        <button type="button" class="sale-tab" data-sale-type="service_keluar" data-service-sale-mode="keluar">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 13h11.86l-5.43 5.43 1.42 1.42L21.14 12l-8.29-8.29-1.42 1.42L16.86 11H5v2z"/></svg>
                            <span>Service Keluar</span>
                        </button>
                        <button type="button" class="sale-tab" data-sale-type="service_cancel" data-service-sale-mode="cancel">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"/></svg>
                            <span>Service Cancel</span>
                        </button>
                    `;
                } else if (targetMode === 'order_jasa') {
                    categoryGrid.innerHTML = `
                        <button type="button" class="sale-tab sale-tab-jasa ${activeSaleType === 'order_jasa_imei' ? 'active' : ''}" data-sale-type="order_jasa_imei">
                            <i class="ri-smartphone-line"></i>
                            <span>Order IMEI</span>
                        </button>
                        <button type="button" class="sale-tab sale-tab-jasa ${activeSaleType === 'order_jasa_beacukai' ? 'active' : ''}" data-sale-type="order_jasa_beacukai">
                            <i class="ri-bank-card-line"></i>
                            <span>IMEI Bea Cukai</span>
                        </button>
                        <button type="button" class="sale-tab sale-tab-jasa ${activeSaleType === 'order_jasa_icloud' ? 'active' : ''}" data-sale-type="order_jasa_icloud">
                            <i class="ri-cloud-line"></i>
                            <span>Pembuatan iCloud</span>
                        </button>
                    `;
                } else {
                    categoryGrid.innerHTML = `
                        <button type="button" class="sale-tab active" data-sale-type="unit_iphone"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.22.67-2.94 1.5-.64.74-1.2 1.88-1.05 3 .95.07 2.11-.56 3-1.44z"/></svg><span>iPhone</span></button>
                        <button type="button" class="sale-tab" data-sale-type="unit_android"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18c0 .55.45 1 1 1h1v3c0 .55.45 1 1 1s1-.45 1-1v-3h4v3c0 .55.45 1 1 1s1-.45 1-1v-3h1c.55 0 1-.45 1-1V8H6v10zM3.5 8C2.67 8 2 8.67 2 9.5v7c0 .83.67 1.5 1.5 1.5S5 17.33 5 16.5v-7C5 8.67 4.33 8 3.5 8zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-5.8-5.7c.39-.39.39-1.02 0-1.41a.996.996 0 0 0-1.41 0L12 2.1l-1.29-1.3a.996.996 0 0 0-1.41 0c-.39.39-.39 1.02 0 1.41L10.6 3.5C8.01 4.57 6.18 7.07 6 10h12c-.18-2.93-2.01-5.43-4.6-6.5l1.3-1.3zM9 7.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/></svg><span>Android</span></button>
                        <button type="button" class="sale-tab" data-sale-type="accessory"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg><span>Aksesoris</span></button>
                        <button type="button" class="sale-tab" data-sale-type="tukar_tambah"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m16 3 4 4-4 4"/><path d="M20 7H9a4 4 0 0 0-4 4v1"/><path d="m8 21-4-4 4-4"/><path d="M4 17h11a4 4 0 0 0 4-4v-1"/></svg><span>Tukar Tambah</span></button>
                        <button type="button" class="sale-tab" data-sale-type="preorder_ready"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" y1="22" x2="12" y2="12"/><path d="m9 12 2 2 4-4" stroke-width="2.2"/></svg><span>Preorder Ready</span></button>
                        <button type="button" class="sale-tab" data-sale-type="preorder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/><path d="M16 2h-8"/></svg><span>Pre Order</span></button>
                        <button type="button" class="sale-tab" data-sale-type="order_jasa"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg><span>Order Jasa</span></button>
                        <button type="button" class="sale-tab" data-sale-type="other"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/></svg><span>Lain-lain</span></button>
                    `;
                }
                bindSalesTabs();
            }
        }

        document.querySelectorAll('.sale-tab, .sale-tab-jasa').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.saleType === activeSaleType);
        });
        document.querySelector('.sales-category-grid')?.classList.toggle('hidden', false);
    }

    function refreshMainNavigation(tabId) {
        document.querySelectorAll('.nav-item').forEach(nav => {
            const mainNav = nav.dataset.mainNav || '';
            let active = nav.dataset.tab === tabId;
            if (mainNav === 'sales') {
                active = tabId === 'page-sales' && !activeSaleType.startsWith('service') && activeSaleType !== 'service' && activeSaleType !== 'order_jasa' && !activeSaleType.startsWith('order_jasa');
            }
            if (mainNav === 'service') {
                active = tabId === 'page-sales' && (activeSaleType.startsWith('service') || activeSaleType === 'service');
            }
            if (mainNav === 'order_jasa') {
                active = tabId === 'page-sales' && (activeSaleType.startsWith('order_jasa') || activeSaleType === 'order_jasa');
            }
            nav.classList.toggle('active', active);
        });
    }


    function updateSyncIndicator() {
        const badge = $('syncUnsyncedCountBadge');
        if (!badge) return;
        const deletedQueue = load(DB_KEYS.deletedQueue) || [];
        const pendingQueue = load(DB_KEYS.pendingPushQueue) || [];
        const total = deletedQueue.length + pendingQueue.length;
        if (total > 0) {
            badge.textContent = `Ada ${total} data belum sinkron`;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    async function pushAllLocalToSupabase(options = {}) {
        const config = getSupabaseConfig();
        if (!config.enabled) {
            writeSyncLog('⚠️ Supabase belum terkonfigurasi atau API key tidak valid.', 'warning');
            toast('Isi URL dan publishable/anon key Supabase dahulu', 'err');
            return;
        }

        writeSyncLog('⚡ Memulai proses unggah data lokal ke server...', 'system');
        setSupabaseStatus('Supabase: mengirim data lokal...', 'info');

        // 1. Process deleted queue first
        const deletedQueue = load(DB_KEYS.deletedQueue) || [];
        if (deletedQueue.length > 0) {
            writeSyncLog(`🗑️ Memproses antrean data terhapus (${deletedQueue.length} data)...`, 'info');
            let deleteSuccess = 0;
            const failedDeletes = [];
            for (const del of deletedQueue) {
                try {
                    await deleteRecordFromSupabase(del.tableKey, del.column, del.value);
                    deleteSuccess++;
                } catch (err) {
                    failedDeletes.push(del);
                    writeSyncLog(`❌ Gagal menghapus ${del.value} dari tabel ${del.tableKey}: ${err.message}`, 'error');
                }
            }
            writeSyncLog(`✅ Selesai memproses antrean hapus (Sukses: ${deleteSuccess}, Gagal: ${failedDeletes.length}).`, 'success');
            // Save only failed deletes back to the queue
            save(DB_KEYS.deletedQueue, failedDeletes);
        }

        // 2. Process push queue
        const pendingQueue = load(DB_KEYS.pendingPushQueue) || [];
        
        let totalUploaded = 0;
        let totalFailed = 0;

        if (options.forceAll) {
            // Force upload ALL local data (used during master upload to empty server)
            writeSyncLog('📤 Memulai unggah penuh (force upload seluruh database)...', 'info');
            const batches = [
                { key: 'devices', data: load(DB_KEYS.devices), label: 'Stok HP' },
                { key: 'accessories', data: load(DB_KEYS.accessories), label: 'Aksesoris' },
                { key: 'technicians', data: load(DB_KEYS.technicians), label: 'Teknisi' },
                { key: 'serviceCatalog', data: load(DB_KEYS.serviceCatalog), label: 'Katalog Service' },
                { key: 'serviceOrders', data: loadServiceOrders(), label: 'Nota Service' },
                { key: 'preorders', data: loadPreorders(), label: 'Pre-order' },
                { key: 'otherCatalog', data: load(DB_KEYS.otherCatalog), label: 'Katalog Lain-lain' },
                { key: 'transactions', data: loadTransactions(), label: 'Transaksi Penjualan' },
                { key: 'expenses', data: typeof loadExpenses === 'function' ? loadExpenses() : (load(DB_KEYS.expenses) || []), label: 'Beban Operasional' },
                { key: 'employees', data: loadEmployees(), label: 'Pegawai' }
            ];

            for (const batch of batches) {
                if (!batch.data || batch.data.length === 0) continue;
                writeSyncLog(`📤 Mengunggah seluruh data tabel '${batch.label}' (${batch.data.length} item)...`, 'info');
                try {
                    await Promise.all(batch.data.map(item => pushRecordToSupabase(batch.key, item)));
                    writeSyncLog(`✅ Berhasil mengunggah tabel '${batch.label}'.`, 'success');
                    totalUploaded += batch.data.length;
                } catch (err) {
                    totalFailed++;
                    writeSyncLog(`❌ Gagal mengunggah tabel '${batch.label}': ${err.message || err}`, 'error');
                }
            }
            
            // Clear pending queue since everything is pushed
            save(DB_KEYS.pendingPushQueue, []);
        } else {
            // Only upload items in the pendingPushQueue
            if (pendingQueue.length === 0) {
                writeSyncLog('📤 Tidak ada data baru/diperbarui yang perlu diunggah.', 'text');
            } else {
                writeSyncLog(`📤 Mengunggah ${pendingQueue.length} data baru/diperbarui...`, 'info');
                
                // Group queue items by tableKey for logging
                const grouped = {};
                pendingQueue.forEach(q => {
                    grouped[q.tableKey] = grouped[q.tableKey] || [];
                    grouped[q.tableKey].push(q);
                });

                for (const tableKey of Object.keys(grouped)) {
                    const items = grouped[tableKey];
                    writeSyncLog(`📤 Mengunggah ${items.length} item baru/diperbarui ke tabel '${tableKey}'...`, 'info');
                    try {
                        await Promise.all(items.map(item => pushRecordToSupabase(tableKey, item.record)));
                        writeSyncLog(`✅ Berhasil mengunggah ${items.length} item ke tabel '${tableKey}'.`, 'success');
                        totalUploaded += items.length;
                        
                        // Remove successfully uploaded items from queue
                        const currentQueue = load(DB_KEYS.pendingPushQueue) || [];
                        const updatedQueue = currentQueue.filter(q => !items.some(it => it.tableKey === q.tableKey && it.idValue === q.idValue));
                        save(DB_KEYS.pendingPushQueue, updatedQueue);
                    } catch (err) {
                        totalFailed++;
                        writeSyncLog(`❌ Gagal mengunggah beberapa data ke tabel '${tableKey}': ${err.message || err}`, 'error');
                    }
                }
            }
        }

        if (totalFailed > 0) {
            writeSyncLog(`⚠️ Proses unggah selesai dengan beberapa kegagalan.`, 'warning');
            setSupabaseStatus('Supabase: beberapa data gagal diunggah.', 'err');
            toast('Beberapa data gagal diunggah', 'err');
        } else {
            writeSyncLog(`🎉 Semua data baru/diperbarui berhasil diunggah! Total: ${totalUploaded} item.`, 'success');
            setSupabaseStatus('Supabase: semua data terunggah.', 'ok');
            toast('Semua data baru/diperbarui berhasil diunggah');
        }
        
        updateSyncIndicator();
    }

    async function executeSupabaseWrite(actionFn, successToastMsg) {
        if (!getSupabaseConfig().enabled) {
            toast('Supabase belum dikonfigurasi!', 'err');
            throw new Error('Supabase not enabled');
        }
        try {
            await actionFn();
            if (successToastMsg) toast(successToastMsg);
            setSupabaseStatus('Supabase: terhubung.', 'ok');
        } catch (err) {
            console.error('Write failed:', err);
            setSupabaseStatus('Koneksi terputus, data tidak dapat disimpan', 'err');
            toast('Koneksi terputus, data tidak dapat disimpan', 'err');
            throw err;
        }
    }

    async function verifySupabaseConnection() {
        if (!getSupabaseConfig().enabled) return true;
        try {
            await supabaseRequest('technicians', { query: 'select=name&limit=1' });
            return true;
        } catch (err) {
            console.error('Supabase connection verification failed:', err);
            throw new Error('Koneksi terputus, data tidak dapat disimpan');
        }
    }

    async function pullTableFromSupabase(tableKey, mapFn, dbKey) {
        try {
            const rows = await supabaseRequest(tableKey, { query: 'select=*' });
            if (rows && Array.isArray(rows)) {
                let idCol = 'code';
                if (tableKey === 'transactions' || tableKey === 'expenses') idCol = 'id';
                else if (tableKey === 'technicians') idCol = 'name';

                // Match and clear from pendingPushQueue to prevent pushing soft-deleted items back
                const deletedRows = rows.filter(row => row.is_deleted === true || row.is_deleted === 'true');
                if (deletedRows.length > 0) {
                    const currentQueue = load(DB_KEYS.pendingPushQueue) || [];
                    const updatedQueue = currentQueue.filter(q => 
                        !(q.tableKey === tableKey && deletedRows.some(row => String(row[idCol]) === String(q.idValue)))
                    );
                    save(DB_KEYS.pendingPushQueue, updatedQueue);
                }

                // Filter out soft deleted rows and items in deletedQueue
                const deletedQueue = load(DB_KEYS.deletedQueue) || [];
                const deletedVals = new Set(deletedQueue.filter(q => q.tableKey === tableKey).map(q => String(q.value)));

                const activeRows = rows.filter(row => row.is_deleted !== true && row.is_deleted !== 'true' && !deletedVals.has(String(row[idCol])));
                const mapped = activeRows.map(mapFn);

                // Preserve local items that are in pendingPushQueue (and not in deletedQueue)
                const localItems = load(dbKey) || [];
                const pendingQueue = load(DB_KEYS.pendingPushQueue) || [];
                const pendingIds = new Set(pendingQueue.filter(q => q.tableKey === tableKey).map(q => String(q.idValue)));

                const merged = [...mapped];
                localItems.forEach(local => {
                    const localId = String(local[idCol] || local.id || local.code || '');
                    if (localId && pendingIds.has(localId) && !deletedVals.has(localId) && !merged.some(m => String(m[idCol] || m.id || m.code || '') === localId)) {
                        merged.push(local);
                    }
                });

                if (dbKey === DB_KEYS.serviceOrders) saveServiceOrders(merged);
                else if (dbKey === DB_KEYS.preorders) savePreorders(merged);
                else if (dbKey === DB_KEYS.transactions) saveTransactions(merged);
                else if (dbKey === DB_KEYS.expenses) saveExpenses(merged);
                else save(dbKey, merged);
            }
            return { ok: true, table: tableKey };
        } catch (err) {
            console.warn(`Gagal menarik tabel ${tableKey} dari Supabase:`, err.message || err);
            return { ok: false, table: tableKey, error: err.message };
        }
    }

    async function pullAllFromSupabase() {
        const config = getSupabaseConfig();
        if (!config.enabled) {
            writeSyncLog('⚠️ Supabase belum terkonfigurasi atau API key tidak valid.', 'warning');
            toast('Isi URL dan publishable/anon key Supabase dahulu', 'err');
            return;
        }

        // Warn user if they have unsaved deleted queue items
        const deletedQueue = load(DB_KEYS.deletedQueue) || [];
        if (deletedQueue.length > 0) {
            if (!confirm('Peringatan: Ada data terhapus di perangkat yang belum diunggah ke server. Mengunduh data sekarang akan menimpa perubahan Anda. Lanjutkan unduh data?')) {
                writeSyncLog('❌ Sinkronisasi unduh dibatalkan oleh pengguna.', 'warning');
                return;
            }
        }

        writeSyncLog('⚡ Memulai proses unduh database dari server...', 'system');
        setSupabaseStatus('Supabase: menarik data...', 'info');
        toast('Menarik data dari Supabase...', 'info');

        const tables = [
            { key: 'devices', map: mapDeviceFromSupabase, dbKey: DB_KEYS.devices, label: 'Stok HP', idCol: 'code' },
            { key: 'accessories', map: mapAccessoryFromSupabase, dbKey: DB_KEYS.accessories, label: 'Aksesoris', idCol: 'code' },
            { key: 'technicians', map: mapSimpleCatalogFromSupabase, dbKey: DB_KEYS.technicians, label: 'Teknisi', idCol: 'name' },
            { key: 'serviceCatalog', map: mapSimpleCatalogFromSupabase, dbKey: DB_KEYS.serviceCatalog, label: 'Katalog Service', idCol: 'code' },
            { key: 'serviceOrders', map: mapServiceOrderFromSupabase, dbKey: DB_KEYS.serviceOrders, label: 'Nota Service', idCol: 'code' },
            { key: 'preorders', map: mapPreorderFromSupabase, dbKey: DB_KEYS.preorders, label: 'Pre-order', idCol: 'code' },
            { key: 'otherCatalog', map: mapSimpleCatalogFromSupabase, dbKey: DB_KEYS.otherCatalog, label: 'Katalog Lain-lain', idCol: 'code' },
            { key: 'transactions', map: mapTransactionFromSupabase, dbKey: DB_KEYS.transactions, label: 'Transaksi Penjualan', idCol: 'id' },
            { key: 'expenses', map: mapExpenseFromSupabase, dbKey: DB_KEYS.expenses, label: 'Beban Operasional', idCol: 'id' },
            { key: 'employees', map: mapSimpleCatalogFromSupabase, dbKey: DB_KEYS.employees, label: 'Pegawai', idCol: 'id' }
        ];

        let successCount = 0;
        let failCount = 0;

        for (const t of tables) {
            writeSyncLog(`📥 Mengunduh tabel '${t.label}'...`, 'info');
            try {
                const rows = await supabaseRequest(t.key, { query: 'select=*' });
                if (rows && Array.isArray(rows)) {
                    // Match and clear from pendingPushQueue to prevent pushing soft-deleted items back
                    const deletedRows = rows.filter(row => row.is_deleted === true || row.is_deleted === 'true');
                    if (deletedRows.length > 0) {
                        const currentQueue = load(DB_KEYS.pendingPushQueue) || [];
                        const updatedQueue = currentQueue.filter(q => 
                            !(q.tableKey === t.key && deletedRows.some(row => String(row[t.idCol]) === String(q.idValue)))
                        );
                        save(DB_KEYS.pendingPushQueue, updatedQueue);
                    }

                    // Filter out soft deleted rows
                    const activeRows = rows.filter(row => row.is_deleted !== true && row.is_deleted !== 'true');
                    const mapped = activeRows.map(t.map);
                    
                    if (t.dbKey === DB_KEYS.serviceOrders) saveServiceOrders(mapped);
                    else if (t.dbKey === DB_KEYS.preorders) savePreorders(mapped);
                    else if (t.dbKey === DB_KEYS.transactions) saveTransactions(mapped);
                    else if (t.dbKey === DB_KEYS.expenses) saveExpenses(mapped);
                    else save(t.dbKey, mapped);
                    
                    writeSyncLog(`✅ Berhasil mengunduh & menyimpan ${mapped.length} data '${t.label}'.`, 'success');
                    successCount++;
                } else {
                    writeSyncLog(`⚠️ Tabel '${t.label}' kosong di server.`, 'warning');
                    successCount++;
                }
            } catch (err) {
                failCount++;
                writeSyncLog(`❌ Gagal menarik data '${t.label}': ${err.message || err}`, 'error');
            }
        }

        refreshAllAdminPanels();
        renderActiveSaleForm();
        renderDailyReport();
        refreshDashboard();

        if (failCount > 0) {
            writeSyncLog('⚠️ Proses unduh selesai dengan kesalahan. Beberapa tabel gagal diperbarui.', 'warning');
            setSupabaseStatus('Koneksi terputus, data tidak dapat dimuat', 'err');
            toast('Unduh database gagal sebagian', 'err');
        } else {
            writeSyncLog('🎉 Semua tabel berhasil diunduh dan diperbarui secara lokal!', 'success');
            setSupabaseStatus('Supabase: data berhasil ditarik.', 'ok');
            toast('Data Supabase berhasil ditarik');
            localStorage.setItem('igood_last_pull_timestamp', new Date().toISOString());
        }
        
        updateSyncIndicator();
    }

    async function syncAllWithSupabase() {
        const config = getSupabaseConfig();
        if (!config.enabled) {
            writeSyncLog('⚠️ Supabase belum terkonfigurasi atau API key tidak valid.', 'warning');
            toast('Isi URL dan publishable/anon key Supabase dahulu', 'err');
            return;
        }
        
        writeSyncLog('🔄 Memulai Sinkronisasi Dua Arah...', 'system');
        setSupabaseStatus('Supabase: memeriksa server...', 'info');
        toast('Memeriksa status server...', 'info');

        try {
            // Check if server is empty
            let isServerEmpty = false;
            try {
                const [devs, accs, txs] = await Promise.all([
                    supabaseRequest('devices', { query: 'select=code&limit=1' }),
                    supabaseRequest('accessories', { query: 'select=code&limit=1' }),
                    supabaseRequest('transactions', { query: 'select=id&limit=1' })
                ]);
                isServerEmpty = (!devs || devs.length === 0) && (!accs || accs.length === 0) && (!txs || txs.length === 0);
            } catch (e) {
                console.warn('Gagal memeriksa status server:', e);
            }

            const localCount = [
                load(DB_KEYS.devices),
                load(DB_KEYS.accessories),
                load(DB_KEYS.technicians),
                load(DB_KEYS.serviceCatalog),
                loadServiceOrders(),
                loadPreorders(),
                load(DB_KEYS.otherCatalog),
                loadTransactions(),
                loadEmployees()
            ].reduce((sum, items) => sum + (items?.length || 0), 0);

            let localExpensesCount = 0;
            try {
                const exps = typeof loadExpenses === 'function' ? loadExpenses() : (load(DB_KEYS.expenses) || []);
                localExpensesCount = exps.length;
            } catch (e) {}
            const totalLocalCount = localCount + localExpensesCount;

            let forceAllUpload = false;
            if (isServerEmpty && totalLocalCount > 0) {
                const confirmUpload = confirm(
                    'Peringatan Konflik Sinkronisasi:\n\n' +
                    'Database di server terdeteksi KOSONG (mungkin baru saja di-reset atau dibersihkan),\n' +
                    'tetapi perangkat lokal ini masih memiliki data (' + totalLocalCount + ' data).\n\n' +
                    'Apakah Anda ingin mengunggah data lokal perangkat ini ke server?\n\n' +
                    '- Klik [OK] untuk mengunggah data lokal Anda ke server.\n' +
                    '- Klik [Batal / Cancel] untuk MENGOSONGKAN data lokal perangkat ini agar sinkron dengan server yang kosong.'
                );

                if (!confirmUpload) {
                    writeSyncLog('🗑️ Mengosongkan data lokal agar sinkron dengan server yang kosong...', 'info');
                    
                    // Clear all local data to match empty server
                    save(DB_KEYS.devices, []);
                    save(DB_KEYS.accessories, []);
                    save(DB_KEYS.technicians, []);
                    save(DB_KEYS.serviceCatalog, []);
                    save(DB_KEYS.serviceOrders, []);
                    save(DB_KEYS.preorders, []);
                    save(DB_KEYS.otherCatalog, []);
                    save(DB_KEYS.employees, []);
                    saveTransactions([]);
                    saveExpenses([]);
                    save(DB_KEYS.pendingPushQueue, []);
                    save(DB_KEYS.deletedQueue, []);
                    localStorage.removeItem('igood_last_pull_timestamp');

                    // Clear drafts
                    for (let i = localStorage.length - 1; i >= 0; i--) {
                        const key = localStorage.key(i);
                        if (key && key.startsWith(DB_KEYS.salesDraftPrefix)) {
                            localStorage.removeItem(key);
                        }
                    }

                    refreshAllAdminPanels();
                    renderActiveSaleForm();
                    renderDailyReport();
                    refreshDashboard();

                    writeSyncLog('✅ Data lokal berhasil dikosongkan. Sinkron dengan server.', 'success');
                    setSupabaseStatus('Supabase: data lokal dikosongkan (sinkron).', 'ok');
                    toast('Data lokal dikosongkan agar sinkron dengan server');
                    return;
                } else {
                    forceAllUpload = true;
                }
            }

            setSupabaseStatus('Supabase: sinkronisasi...', 'info');
            toast('Memulai sinkronisasi data...', 'info');
            await pullAllFromSupabase();
            await pushAllLocalToSupabase({ forceAll: forceAllUpload });
            writeSyncLog('🎉 Sinkronisasi selesai!', 'success');
            toast('Sinkronisasi selesai!');
        } catch (err) {
            console.error('Sync failed:', err);
            writeSyncLog(`❌ Sinkronisasi gagal: ${err.message}`, 'error');
            setSupabaseStatus('Supabase: sinkronisasi gagal.', 'err');
            toast('Sinkronisasi gagal', 'err');
        }
    }

        async function pullAllFromSupabaseSilent() {
        if (isSilentPulling) return;
        isSilentPulling = true;
        try {
            await ensureSupabaseConfigLoaded();
            const config = getSupabaseConfig();
            if (!config.enabled) {
                isSilentPulling = false;
                return;
            }

            await Promise.allSettled([
                pullTableFromSupabase('devices', mapDeviceFromSupabase, DB_KEYS.devices),
                pullTableFromSupabase('accessories', mapAccessoryFromSupabase, DB_KEYS.accessories),
                pullTableFromSupabase('technicians', mapSimpleCatalogFromSupabase, DB_KEYS.technicians),
                pullTableFromSupabase('serviceCatalog', mapSimpleCatalogFromSupabase, DB_KEYS.serviceCatalog),
                pullTableFromSupabase('serviceOrders', mapServiceOrderFromSupabase, DB_KEYS.serviceOrders),
                pullTableFromSupabase('preorders', mapPreorderFromSupabase, DB_KEYS.preorders),
                pullTableFromSupabase('otherCatalog', mapSimpleCatalogFromSupabase, DB_KEYS.otherCatalog),
                pullTableFromSupabase('transactions', mapTransactionFromSupabase, DB_KEYS.transactions),
                pullTableFromSupabase('expenses', mapExpenseFromSupabase, DB_KEYS.expenses)
            ]);
            
            populateEmployeeDropdowns();
            updateActiveEmployeeBar();
            refreshAllAdminPanels();
            renderActiveSaleForm();
            renderDailyReport();
            refreshDashboard();
            renderDeviceStock();
            renderAccStock();
            setSupabaseStatus('Supabase: terhubung.', 'ok');
        } catch (err) {
            console.error('Silent pull failed:', err);
        } finally {
            isSilentPulling = false;
        }
    }

    // ── GLOBAL SYNC PILL (NON-INTRUSIVE ON-DEMAND VISUAL FEEDBACK) ──
        function showSyncPill(state = 'loading', message = '') {
        let pill = $('globalSyncPill');
        if (!pill) {
            pill = document.createElement('div');
            pill.id = 'globalSyncPill';
            pill.className = 'global-sync-pill';
            document.body.appendChild(pill);
        }

        if (syncPillTimer) {
            clearTimeout(syncPillTimer);
            syncPillTimer = null;
        }

        if (state === 'loading') {
            pill.innerHTML = `<i class="ri-loader-4-line sync-spin-icon"></i> <span>${message || 'Menyelaraskan data...'}</span>`;
            pill.className = 'global-sync-pill active loading';
        } else if (state === 'success') {
            pill.innerHTML = `<i class="ri-checkbox-circle-fill" style="color: #10b981;"></i> <span>${message || 'Data diperbarui'}</span>`;
            pill.className = 'global-sync-pill active success';
            syncPillTimer = setTimeout(() => {
                pill.classList.remove('active');
                setTimeout(() => {
                    pill.classList.remove('success', 'loading');
                }, 300);
            }, 1100);
        } else if (state === 'error') {
            pill.innerHTML = `<i class="ri-error-warning-fill" style="color: #f43f5e;"></i> <span>${message || 'Gagal memuat'}</span>`;
            pill.className = 'global-sync-pill active error';
            syncPillTimer = setTimeout(() => {
                pill.classList.remove('active');
            }, 2000);
        }
    }

    // ── TARGETED ON-DEMAND SYNC FUNCTIONS (PER MENU / TAB) ─────
    async function pullDeviceStockFromSupabase(showFeedback = true) {
        if (showFeedback) showSyncPill('loading', 'Menyelaraskan Stok HP...');
        await ensureSupabaseConfigLoaded();
        const config = getSupabaseConfig();
        if (!config.enabled) {
            if (showFeedback) showSyncPill('error', 'Supabase belum aktif');
            return;
        }
        try {
            await pullTableFromSupabase('devices', mapDeviceFromSupabase, DB_KEYS.devices);
            renderDeviceStock();
            renderActiveSaleForm(true);
        } catch (e) { console.warn('[pullDeviceStock]', e); }
        if (showFeedback) showSyncPill('success', 'Stok HP diperbarui');
    }

    async function pullAccStockFromSupabase(showFeedback = true) {
        if (showFeedback) showSyncPill('loading', 'Menyelaraskan Aksesoris...');
        await ensureSupabaseConfigLoaded();
        const config = getSupabaseConfig();
        if (!config.enabled) {
            if (showFeedback) showSyncPill('error', 'Supabase belum aktif');
            return;
        }
        try {
            await pullTableFromSupabase('accessories', mapAccessoryFromSupabase, DB_KEYS.accessories);
            renderAccStock();
            renderActiveSaleForm(true);
        } catch (e) { console.warn('[pullAccStock]', e); }
        if (showFeedback) showSyncPill('success', 'Aksesoris diperbarui');
    }

    async function pullServiceFromSupabase(showFeedback = true) {
        if (showFeedback) showSyncPill('loading', 'Menyelaraskan Data Servis...');
        await ensureSupabaseConfigLoaded();
        const config = getSupabaseConfig();
        if (!config.enabled) {
            if (showFeedback) showSyncPill('error', 'Supabase belum aktif');
            return;
        }
        try {
            await Promise.allSettled([
                pullTableFromSupabase('serviceOrders', mapServiceOrderFromSupabase, DB_KEYS.serviceOrders),
                pullTableFromSupabase('serviceCatalog', mapSimpleCatalogFromSupabase, DB_KEYS.serviceCatalog),
                pullTableFromSupabase('technicians', mapSimpleCatalogFromSupabase, DB_KEYS.technicians)
            ]);
            renderServiceOrders();
            renderServiceCatalog();
            renderTechnicians();
            renderActiveSaleForm(true);
        } catch (e) { console.warn('[pullService]', e); }
        if (showFeedback) showSyncPill('success', 'Data Servis diperbarui');
    }

    async function pullPreordersFromSupabase(showFeedback = true) {
        if (showFeedback) showSyncPill('loading', 'Menyelaraskan Pre-order...');
        await ensureSupabaseConfigLoaded();
        const config = getSupabaseConfig();
        if (!config.enabled) {
            if (showFeedback) showSyncPill('error', 'Supabase belum aktif');
            return;
        }
        try {
            await Promise.allSettled([
                pullTableFromSupabase('preorders', mapPreorderFromSupabase, DB_KEYS.preorders),
                pullTableFromSupabase('devices', mapDeviceFromSupabase, DB_KEYS.devices)
            ]);
            renderPreorders();
            renderActiveSaleForm(true);
        } catch (e) { console.warn('[pullPreorders]', e); }
        if (showFeedback) showSyncPill('success', 'Pre-order diperbarui');
    }

    async function pullOrderJasaFromSupabase(showFeedback = true) {
        if (showFeedback) showSyncPill('loading', 'Menyelaraskan Order Jasa...');
        await ensureSupabaseConfigLoaded();
        const config = getSupabaseConfig();
        if (!config.enabled) {
            if (showFeedback) showSyncPill('error', 'Supabase belum aktif');
            return;
        }
        try {
            await Promise.allSettled([
                pullTableFromSupabase('otherCatalog', mapSimpleCatalogFromSupabase, DB_KEYS.otherCatalog),
                pullTableFromSupabase('transactions', mapTransactionFromSupabase, DB_KEYS.transactions)
            ]);
            renderOtherCatalog();
            renderImeiMonitoring();
            renderActiveSaleForm(true);
        } catch (e) { console.warn('[pullOrderJasa]', e); }
        if (showFeedback) showSyncPill('success', 'Order Jasa diperbarui');
    }

    async function pullDailyReportFromSupabase(showFeedback = true) {
        if (showFeedback) showSyncPill('loading', 'Menyelaraskan Laporan...');
        await ensureSupabaseConfigLoaded();
        const config = getSupabaseConfig();
        if (!config.enabled) {
            if (showFeedback) showSyncPill('error', 'Supabase belum aktif');
            return;
        }
        try {
            await Promise.allSettled([
                pullTableFromSupabase('transactions', mapTransactionFromSupabase, DB_KEYS.transactions),
                pullTableFromSupabase('expenses', mapExpenseFromSupabase, DB_KEYS.expenses),
                pullTableFromSupabase('devices', mapDeviceFromSupabase, DB_KEYS.devices),
                pullTableFromSupabase('accessories', mapAccessoryFromSupabase, DB_KEYS.accessories),
                pullTableFromSupabase('serviceOrders', mapServiceOrderFromSupabase, DB_KEYS.serviceOrders)
            ]);
            renderDailyReport();
            refreshDashboard();
        } catch (e) { console.warn('[pullDailyReport]', e); }
        if (showFeedback) showSyncPill('success', 'Laporan diperbarui');
    }

    async function pullAdminPanelDataFromSupabase(targetPanel) {
        await ensureSupabaseConfigLoaded();
        const config = getSupabaseConfig();
        if (!config.enabled) return;

        if (targetPanel === 'admin-devices') {
            await pullDeviceStockFromSupabase(true);
        } else if (targetPanel === 'admin-accessories') {
            await pullAccStockFromSupabase(true);
        } else if (targetPanel === 'admin-preorders') {
            await pullPreordersFromSupabase(true);
        } else if (targetPanel === 'admin-services' || targetPanel === 'admin-service-catalog' || targetPanel === 'admin-group-kelola-servis') {
            await pullServiceFromSupabase(true);
        } else if (targetPanel === 'admin-technicians') {
            showSyncPill('loading', 'Menyelaraskan Teknisi...');
            await pullTableFromSupabase('technicians', mapSimpleCatalogFromSupabase, DB_KEYS.technicians);
            renderTechnicians();
            showSyncPill('success', 'Data Teknisi diperbarui');
        } else if (targetPanel === 'admin-smart-inventory') {
            showSyncPill('loading', 'Menyelaraskan Stok Cerdas...');
            await Promise.allSettled([
                pullTableFromSupabase('devices', mapDeviceFromSupabase, DB_KEYS.devices),
                pullTableFromSupabase('accessories', mapAccessoryFromSupabase, DB_KEYS.accessories)
            ]);
            renderSmartInventoryPanel();
            showSyncPill('success', 'Stok Cerdas diperbarui');
        } else if (targetPanel === 'admin-expenses') {
            showSyncPill('loading', 'Menyelaraskan Beban Operasional...');
            await pullTableFromSupabase('expenses', mapExpenseFromSupabase, DB_KEYS.expenses);
            renderExpensesPanel();
            showSyncPill('success', 'Beban diperbarui');
        } else if (targetPanel === 'admin-other') {
            showSyncPill('loading', 'Menyelaraskan Katalog Lain-lain...');
            await pullTableFromSupabase('otherCatalog', mapSimpleCatalogFromSupabase, DB_KEYS.otherCatalog);
            renderOtherCatalog();
            showSyncPill('success', 'Katalog diperbarui');
        } else if (targetPanel === 'admin-history') {
            showSyncPill('loading', 'Menyelaraskan Riwayat...');
            await pullTableFromSupabase('transactions', mapTransactionFromSupabase, DB_KEYS.transactions);
            renderReportsLog();
            renderMonthlyReports();
            showSyncPill('success', 'Riwayat diperbarui');
        } else if (targetPanel === 'admin-imei' || targetPanel === 'admin-beacukai' || targetPanel === 'admin-icloud' || targetPanel === 'admin-group-order-jasa') {
            await pullOrderJasaFromSupabase(true);
        } else if (targetPanel === 'admin-monthly' || targetPanel === 'admin-dashboard') {
            await pullDailyReportFromSupabase(true);
        }
    }

    async function pushAllLocalToSupabaseSilent() {
        const config = getSupabaseConfig();
        if (!config.enabled) return;
        const batches = [
            ['devices', load(DB_KEYS.devices)],
            ['accessories', load(DB_KEYS.accessories)],
            ['technicians', load(DB_KEYS.technicians)],
            ['serviceCatalog', load(DB_KEYS.serviceCatalog)],
            ['serviceOrders', loadServiceOrders()],
            ['preorders', loadPreorders()],
            ['otherCatalog', load(DB_KEYS.otherCatalog)],
            ['transactions', loadTransactions()],
            ['employees', loadEmployees()],
        ];
        for (const [tableKey, items] of batches) {
            for (const item of items) await pushRecordToSupabase(tableKey, item);
        }
        window.__igoodLastSupabaseStartupSync = { ok: true, at: new Date().toISOString() };
    }

        function queueStartupSupabasePush() {
        if (startupSupabasePushStarted || !getSupabaseConfig().enabled) return;
        const localCount = [
            load(DB_KEYS.devices),
            load(DB_KEYS.accessories),
            load(DB_KEYS.technicians),
            load(DB_KEYS.serviceCatalog),
            loadServiceOrders(),
            loadPreorders(),
            load(DB_KEYS.otherCatalog),
            loadTransactions(),
            loadEmployees(),
        ].reduce((sum, items) => sum + (items?.length || 0), 0);
        if (!localCount) return;
        startupSupabasePushStarted = true;
        pushAllLocalToSupabaseSilent().catch(error => {
            window.__igoodLastSupabaseStartupSync = { ok: false, error: error.message };
            setSupabaseStatus(`Supabase: ${error.message}`, 'err');
        });
    }

    function renderSupabaseConfig() {
        const config = getSupabaseConfig();
        if ($('supabaseUrl')) $('supabaseUrl').value = config.url;
        if ($('supabaseKey')) $('supabaseKey').value = config.key;
        if (config.unsafeKey) setSupabaseStatus('Supabase: service role/secret key tidak boleh dipakai di aplikasi.', 'err');
        else if (config.enabled) setSupabaseStatus('Supabase: siap sync.', 'ok');
        else if (config.hasUrl) setSupabaseStatus('Supabase: URL ada, API key belum diisi.', 'info');
        else setSupabaseStatus('Supabase: belum dikonfigurasi.', 'info');
    }

    async function loadSupabaseUrlTextFile() {
        const current = readObject(DB_KEYS.supabaseConfig);
        try {
            const response = await fetch('url%20supabase.txt');
            if (!response.ok && response.status !== 0) {
                console.warn('Config fetch response not ok:', response.status, response.statusText);
                return;
            }
            
            const text = await response.text();
            const parsed = parseSupabaseTextConfig(text);
            if (!parsed.url) {
                console.warn('No valid URL parsed from url supabase.txt');
                return;
            }
            
            const isKeyUnsafe = isUnsafeSupabaseKey(parsed.key);
            const existingConfig = getSupabaseConfig();
            const configChanged = current.url !== parsed.url || current.key !== parsed.key;
            
            if (configChanged || !existingConfig.enabled || existingConfig.unsafeKey) {
                const embeddedConfig = {
                    ...current,
                    url: parsed.url,
                    ...(parsed.key && !isKeyUnsafe ? { key: parsed.key } : {}),
                };
                localStorage.setItem(DB_KEYS.supabaseConfig, JSON.stringify(embeddedConfig));
                renderSupabaseConfig();
                console.log('Supabase configuration updated from url supabase.txt');
            }
        } catch (err) {
            console.error('Error loading Supabase config from text file:', err);
        }
    }

    function bindSupabaseControls() {
        renderSupabaseConfig();
        ensureSupabaseConfigLoaded();
        $('btnSaveSupabaseConfig')?.addEventListener('click', () => {
            const url = normalizeSupabaseBaseUrl($('supabaseUrl')?.value);
            const key = String($('supabaseKey')?.value || '').trim();
            localStorage.setItem(DB_KEYS.supabaseConfig, JSON.stringify({ url, key }));
            renderSupabaseConfig();
            toast('Config Supabase disimpan');
        });
        $('btnPushSupabase')?.addEventListener('click', () => {
            pushAllLocalToSupabase().catch(error => {
                setSupabaseStatus(`Supabase: ${error.message}`, 'err');
                toast(error.message, 'err');
            });
        });
        $('btnPullSupabase')?.addEventListener('click', () => {
            pullAllFromSupabase().catch(error => {
                setSupabaseStatus(`Supabase: ${error.message}`, 'err');
                toast(error.message, 'err');
            });
        });
        $('btnSyncAllSupabase')?.addEventListener('click', () => {
            pullAllFromSupabase().catch(error => {
                setSupabaseStatus(`Supabase: ${error.message}`, 'err');
                toast(error.message, 'err');
            });
        });

        // ─── Hapus Semua Data Server ───────────────────────────────────
        const modalDelete = $('modalDeleteServerData');
        const confirmInput = $('deleteServerConfirmInput');
        const btnConfirm = $('btnConfirmDeleteServer');

        $('btnDeleteAllServerData')?.addEventListener('click', () => {
            const config = getSupabaseConfig();
            if (!config.enabled) {
                toast('Supabase belum terkonfigurasi.', 'err');
                return;
            }
            if (confirmInput) confirmInput.value = '';
            if (btnConfirm) { btnConfirm.style.opacity = '0.4'; btnConfirm.style.pointerEvents = 'none'; }
            if (modalDelete) { modalDelete.style.display = 'flex'; }
        });

        confirmInput?.addEventListener('input', () => {
            const match = (confirmInput.value || '').trim().toUpperCase() === 'HAPUS SERVER';
            if (btnConfirm) {
                btnConfirm.style.opacity = match ? '1' : '0.4';
                btnConfirm.style.pointerEvents = match ? 'auto' : 'none';
            }
        });

        $('btnCancelDeleteServer')?.addEventListener('click', () => {
            if (modalDelete) modalDelete.style.display = 'none';
        });

        modalDelete?.addEventListener('click', (e) => {
            if (e.target === modalDelete) modalDelete.style.display = 'none';
        });

        btnConfirm?.addEventListener('click', () => {
            const warningMessage = 
                'PERINGATAN SANGAT KRITIS: Anda akan menghapus SELURUH DATA DI SERVER SUPABASE secara permanen!\n\n' +
                'Data yang akan dihapus dari cloud server:\n' +
                '- Semua Transaksi Penjualan\n' +
                '- Semua Antrean & Riwayat Nota Service\n' +
                '- Semua Request Preorder & DP\n' +
                '- Semua Stok HP/iPad & Stok Aksesoris\n' +
                '- Semua Akun Teknisi & Katalog Jasa/Lain-lain\n' +
                '- Semua Catatan Beban Operasional\n\n' +
                'Konsekuensi: Seluruh data di cloud server akan terhapus total dan tidak dapat dikembalikan. Perangkat lain yang terhubung ke server ini juga akan kehilangan data setelah melakukan sinkronisasi.\n\n' +
                'Apakah Anda benar-benar yakin ingin menghapus seluruh database server ini?';

            if (!confirm(warningMessage)) return;
            if (modalDelete) modalDelete.style.display = 'none';
            requireSuperAdminAuth(() => {
                deleteAllServerData();
            });
        });
    }

    async function deleteAllServerData() {
        const config = getSupabaseConfig();
        if (!config.enabled) {
            writeSyncLog('⚠️ Supabase belum terkonfigurasi.', 'warning');
            return;
        }

        const tables = [
            { key: 'transactions',  primaryCol: 'id',   label: 'Transaksi Penjualan' },
            { key: 'serviceOrders', primaryCol: 'code',  label: 'Nota Service' },
            { key: 'preorders',     primaryCol: 'code',  label: 'Pre-order' },
            { key: 'devices',       primaryCol: 'code',  label: 'Stok HP' },
            { key: 'accessories',   primaryCol: 'code',  label: 'Aksesoris' },
            { key: 'technicians',   primaryCol: 'name',  label: 'Teknisi' },
            { key: 'serviceCatalog',primaryCol: 'code',  label: 'Katalog Service' },
            { key: 'otherCatalog',  primaryCol: 'code',  label: 'Katalog Lain-lain' },
            { key: 'expenses',      primaryCol: 'id',    label: 'Beban Operasional' },
            { key: 'employees',     primaryCol: 'id',    label: 'Pegawai' },
        ];

        writeSyncLog('🗑️ Memulai pembersihan semua data di server...', 'system');
        setSupabaseStatus('Supabase: menghapus semua data...', 'info');

        let successCount = 0;
        let failCount = 0;

        for (const t of tables) {
            writeSyncLog(`🗑️ Melakukan pembersihan tabel '${t.label}'...`, 'info');
            try {
                await supabaseRequest(t.key, {
                    method: 'DELETE',
                    query: `${encodeURIComponent(t.primaryCol)}=not.is.null`
                });
                writeSyncLog(`✅ Tabel '${t.label}' berhasil dihapus di server.`, 'success');
                successCount++;
            } catch (err) {
                failCount++;
                writeSyncLog(`❌ Gagal menghapus tabel '${t.label}': ${err.message}`, 'error');
            }
        }

        if (failCount === 0) {
            writeSyncLog(`🎉 Semua data server berhasil dihapus (${successCount} tabel).`, 'success');
            setSupabaseStatus('Supabase: server dikosongkan.', 'ok');
            toast('Semua data server berhasil dihapus');
        } else {
            writeSyncLog(`⚠️ Selesai dengan ${failCount} kegagalan. ${successCount} tabel berhasil.`, 'warning');
            setSupabaseStatus('Supabase: penghapusan sebagian gagal.', 'err');
            toast('Beberapa tabel gagal dihapus', 'err');
        }
    }

    function bindPdfExportModal() {
        $('btnClosePdfExportModal')?.addEventListener('click', () => $('pdfExportModal')?.classList.remove('open'));
        $('btnCancelPdfExport')?.addEventListener('click', () => $('pdfExportModal')?.classList.remove('open'));
        $('pdfExportModal')?.addEventListener('click', (event) => {
            if (event.target?.id === 'pdfExportModal') {
                $('pdfExportModal')?.classList.remove('open');
            }
        });

        $('pdfReportDate')?.addEventListener('input', renderPdfExportPreview);
        $('pdfReportDate')?.addEventListener('change', renderPdfExportPreview);
        $('pdfReportMonth')?.addEventListener('input', renderPdfExportPreview);
        $('pdfReportMonth')?.addEventListener('change', renderPdfExportPreview);

        document.querySelectorAll('.pdf-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                activePdfTab = tab.dataset.tab;
                updatePdfTabUI();
                renderPdfExportPreview();
            });
        });

        $('btnDownloadReportPdf')?.addEventListener('click', downloadPdfReport);

        $('btnCloseNativePdfModal')?.addEventListener('click', () => {
            $('nativePdfModal')?.classList.remove('open');
        });
        $('btnNativeSharePdf')?.addEventListener('click', async () => {
            $('nativePdfModal')?.classList.remove('open');
            const nativePlugin = receiptNativePlugin();
            if (nativePlugin?.sharePdf) {
                try {
                    await nativePlugin.sharePdf({ 
                        filename: currentNativePdfFilename, 
                        base64: currentNativePdfBase64 
                    });
                    toast('Membuka menu bagikan PDF...');
                } catch (err) {
                    toast('Gagal membagikan PDF: ' + err.message, 'err');
                }
            }
        });
        $('btnNativeSavePdf')?.addEventListener('click', async () => {
            $('nativePdfModal')?.classList.remove('open');
            const nativePlugin = receiptNativePlugin();
            if (nativePlugin?.savePdf) {
                try {
                    await nativePlugin.savePdf({ 
                        filename: currentNativePdfFilename, 
                        base64: currentNativePdfBase64, 
                        open: true 
                    });
                    toast('PDF disimpan ke folder Download & dibuka');
                } catch (err) {
                    toast('Gagal menyimpan PDF: ' + err.message, 'err');
                }
            }
        });
    }

    function bindBackupExport() {
        $('btnBackupDatabase')?.addEventListener('click', () => {
            const data = {
                devices: load(DB_KEYS.devices),
                accessories: load(DB_KEYS.accessories),
                technicians: load(DB_KEYS.technicians),
                serviceCatalog: load(DB_KEYS.serviceCatalog),
                serviceOrders: loadServiceOrders(),
                preorders: loadPreorders(),
                otherCatalog: load(DB_KEYS.otherCatalog),
                transactions: loadTransactions(),
                reports: load(DB_KEYS.reports),
                exportedAt: new Date().toISOString(),
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `igood-backup-${today()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast('Backup berhasil didownload');
        });

        $('btnRestoreDatabase')?.addEventListener('click', () => {
            const file = $('importDatabaseFile')?.files[0];
            if (!file) { toast('Pilih file .json dahulu', 'err'); return; }
            const reader = new FileReader();
            reader.onload = e => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.devices) save(DB_KEYS.devices, data.devices);
                    if (data.accessories) save(DB_KEYS.accessories, data.accessories);
                    if (data.technicians) save(DB_KEYS.technicians, data.technicians);
                    if (data.serviceCatalog) save(DB_KEYS.serviceCatalog, data.serviceCatalog);
                    if (data.serviceOrders) saveServiceOrders(data.serviceOrders);
                    if (data.preorders) savePreorders(data.preorders);
                    if (data.otherCatalog) save(DB_KEYS.otherCatalog, data.otherCatalog);
                    if (data.transactions) save(DB_KEYS.transactions, data.transactions);
                    if (data.reports) save(DB_KEYS.reports, data.reports);
                    toast('Database berhasil di-restore!');
                    refreshAllAdminPanels();
                    renderDailyReport();
                    renderActiveSaleForm();
                } catch {
                    toast('File JSON tidak valid!', 'err');
                }
            };
            reader.readAsText(file);
        });

        $('btnExportDevicePdf')?.addEventListener('click', () => exportToPdf(load(DB_KEYS.devices), 'Stok HP', `igood-stok-hp-${today()}.pdf`));
        $('btnExportAccPdf')?.addEventListener('click', () => exportToPdf(load(DB_KEYS.accessories), 'Stok Aksesoris', `igood-stok-aksesoris-${today()}.pdf`));
        $('btnExportAllReportsPdf')?.addEventListener('click', openPdfExportModal);
        $('btnExportAllSalesPdf')?.addEventListener('click', openPdfExportModal);
    }

    function bindMockData() {
        $('btnLoadMockData')?.addEventListener('click', () => {
            if (!confirm('Load data contoh? Data existing akan digabung.')) return;
            const devices = load(DB_KEYS.devices);
            const samples = [
                { code: 'PB-IBX-I15P2-001', category: 'iphone', brand: 'Apple', model: 'iPhone 15 Pro', storage: '256GB', color: 'Natural Titanium', condition: 'Bekas', acquisition: 'PB', warranty: 'IBX', supplier: '', purchaseDate: '2026-05-01', cost: 14500000, status: 'Available', createdAt: '2026-05-01T10:00:00Z' },
                { code: 'PB-INT-SAM-S23U2-001', category: 'android', brand: 'Samsung', model: 'S23 Ultra', storage: '256GB', color: 'Black', condition: 'New', acquisition: 'PB', warranty: 'INT', supplier: '', purchaseDate: '2026-05-02', cost: 7500000, status: 'Available', createdAt: '2026-05-02T10:00:00Z' },
            ];
            save(DB_KEYS.devices, [...devices, ...samples.filter(d => !devices.some(e => e.code === d.code))]);
            const accs = load(DB_KEYS.accessories);
            const sampleAccs = [{ code: 'A001', category: 'A', brand: 'APL', name: 'Adaptor 20W USB-C Apple', qty: 15, cost: 180000, sell: 320000, createdAt: '2026-05-01T10:00:00Z' }];
            save(DB_KEYS.accessories, [...accs, ...sampleAccs.filter(a => !accs.some(e => e.code === a.code))]);
            refreshAllAdminPanels();
            renderActiveSaleForm();
            toast('Mock data berhasil dimuat!');
        });
    }

    function bindSalesTabs() {
        document.querySelectorAll('.sale-tab, .sale-tab-jasa').forEach(tab => {
            tab.addEventListener('click', () => {
                saveSalesDraft();
                let nextType = tab.dataset.saleType;
                
                if (nextType === 'back_to_sales') {
                    activeSaleType = 'unit_iphone';
                    syncSalesPageChrome();
                    renderActiveSaleForm(true);
                    closeSalesItemModal();
                    return;
                }

                activeSaleType = nextType;
                if (nextType === 'preorder') {
                    preorderNavOrigin = 'page-sales';
                }
                syncSalesPageChrome();
                
                // Targeted pull for clicked sales category (silent pull in background)
                if (!isTestingMode()) {
                    if (nextType === 'unit_iphone' || nextType === 'unit_android') pullDeviceStockFromSupabase(false);
                    else if (nextType === 'accessory') pullAccStockFromSupabase(false);
                    else if (nextType.startsWith('service') || nextType === 'service') pullServiceFromSupabase(false);
                    else if (nextType.startsWith('order_jasa') || nextType === 'order_jasa') pullOrderJasaFromSupabase(false);
                    else if (nextType === 'preorder') pullPreordersFromSupabase(false);
                }

                if (nextType === 'order_jasa') {
                    renderActiveSaleForm();
                    closeSalesItemModal();
                } else if (nextType === 'order_jasa_monitoring') {
                    renderImeiMonitoring();
                    closeSalesItemModal();
                } else if (nextType === 'order_jasa_imei') {
                    openSalesItemModal('order_jasa');
                } else if (nextType === 'order_jasa_beacukai') {
                    openSalesItemModal('order_jasa_beacukai');
                } else if (nextType === 'order_jasa_icloud') {
                    openSalesItemModal('order_jasa_icloud');
                } else if (nextType === 'service') {
                    openSalesItemModal('service_' + (activeServiceSaleMode || 'masuk'));
                } else {
                    openSalesItemModal(nextType);
                }
            });
        });
    }

    function handleBackButton() {
        // 1. Payment confirmation popup
        const paymentOverlay = document.querySelector('.payment-confirm-overlay');
        if (paymentOverlay) {
            paymentOverlay.remove();
            return true;
        }

        // 2. Preorder edit modal
        const preorderEditModal = $('preorderEditModal');
        if (preorderEditModal && preorderEditModal.classList.contains('open')) {
            preorderEditModal.classList.remove('open');
            return true;
        }

        // 3. PDF Export modal
        const pdfExportModal = $('pdfExportModal');
        if (pdfExportModal && pdfExportModal.classList.contains('open')) {
            pdfExportModal.classList.remove('open');
            return true;
        }

        // 4. Edit item modal
        const editModal = $('editModal');
        if (editModal && editModal.classList.contains('open')) {
            $('btnCancelEdit')?.click();
            return true;
        }

        // 5. Receipt modal
        const receiptModal = $('receiptModal');
        if (receiptModal && receiptModal.classList.contains('open')) {
            closeReceiptModal();
            return true;
        }

        // 6. Sales item modal bottom sheet
        const salesItemModal = $('salesItemModal');
        if (salesItemModal && salesItemModal.classList.contains('open')) {
            closeSalesItemModal();
            return true;
        }

        // 7. Admin PIN modal
        const adminPinModal = $('adminPinModal');
        if (adminPinModal && adminPinModal.classList.contains('open')) {
            $('btnCancelAdminAuth')?.click();
            return true;
        }
        
        // 8. Cart drawer modal
        const salesCartModal = $('salesCartModal');
        if (salesCartModal && salesCartModal.classList.contains('open')) {
            salesCartModal.classList.remove('open');
            return true;
        }

        // 9. Open add-form panel
        const openAddPanel = document.querySelector('.add-form-panel.open');
        if (openAddPanel) {
            openAddPanel.classList.remove('open');
            return true;
        }

        // 10. Device notice banner
        const deviceNotice = $('deviceLabelNotice');
        if (deviceNotice && deviceNotice.classList.contains('show')) {
            deviceNotice.classList.remove('show');
            return true;
        }

        const activePage = document.querySelector('.page-content.active');
        if (activePage && activePage.id !== 'page-home') {
            if (activePage.id === 'page-admin') {
                const adminTabs = document.querySelector('.admin-tabs');
                if (adminTabs && adminTabs.classList.contains('collapsed')) {
                    $('btnBackToAdminMenu')?.click();
                    return true;
                }
            }
            if (activePage.id === 'page-imei-monitoring') {
                activeSaleType = 'order_jasa';
                switchPage('page-sales');
                return true;
            }
            switchPage('page-home');
            return true;
        }

        // Double-press confirmation before exiting at the home screen
        const now = Date.now();
        if (now - lastBackPressMs < 2500) {
            // Second press within 2.5 seconds – allow exit
            return false;
        }
        lastBackPressMs = now;
        toast('Tekan back sekali lagi untuk keluar dari website', 'info');
        return true; // consumed – don't exit yet
    }

    function bindBrowserHistory() {
        try {
            // Seed history stack so mobile back button stays trapped inside SPA
            window.history.replaceState({ appPage: 'root', t: Date.now() }, '');
            window.history.pushState({ appPage: 'active', t: Date.now() }, '');
        } catch (e) {
            console.warn('History API not supported or restricted', e);
        }

        window.addEventListener('popstate', (e) => {
            // Proactively re-push forward state so phone back button never drops history to 0
            try {
                window.history.pushState({ appPage: 'active', t: Date.now() }, '');
            } catch (err) {}

            handleBackButton();
        });
    }

