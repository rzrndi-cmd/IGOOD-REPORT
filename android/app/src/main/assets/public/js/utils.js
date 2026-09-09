/**
 * IGOOD REPORT - Utils & Constants Module
 */

    const ADMIN_PASSCODE = 'admin123';
    const DB_KEYS = {
        devices: 'igood_device_stock',
        accessories: 'igood_acc_stock',
        technicians: 'igood_technicians',
        serviceCatalog: 'igood_service_catalog',
        serviceOrders: 'igood_service_orders',
        preorders: 'igood_preorder_requests',
        otherCatalog: 'igood_other_catalog',
        reports: 'igood_reports',
        transactions: 'igood_transactions',
        expenses: 'igood_operational_expenses',
        mode: 'igood_mode',
        supabaseConfig: 'igood_supabase_config',
        salesDraftPrefix: 'igood_sales_form_draft',
        thermalPrinter: 'igood_thermal_printer',
        employees: 'igood_employees',
        activeEmployee: 'igood_active_employee',
        deletedQueue: 'igood_deleted_queue',
        pendingPushQueue: 'igood_pending_push_queue',
    };

var currentMode = localStorage.getItem(DB_KEYS.mode) || 'sales';
var activeSaleType = 'unit_iphone';
var activeServiceSaleMode = 'masuk';
var activeServiceOrderFilter = 'masuk';
var lastBackPressMs = 0;
var currentReceiptText = '';
var currentReceiptTitle = 'Struk Transaksi';
var currentReceiptRows = [];
var activeSaleCart = [];
var activeServiceCart = [];
var activeSaleCartType = 'unit_iphone';
var activeSaleCartEditId = '';
var activeSalesItemModalMode = 'cart';
var activeLinkedPreorder = null;
var preorderNavOrigin = 'page-sales';
var isAddingToCart = false;
var checkoutStage = 'items';
var supabaseConfigLoadPromise = null;
var isSilentPulling = false;
var syncPillTimer = null;
var startupSupabasePushStarted = false;
var chartRevenue, chartPayment, chartCategory;
var activeMonthlyDetail = null;
var activeMonthlySubTab = 'all';
var activeExpenseMonth = '';
var activePdfTab = 'harian';
var _loadCache = {};
var _loadCacheScheduled = false;

window.toggleStockCard = function (el) {
    if (!el) return;
    const card = el.closest('.stock-accordion-card');
    if (card) {
        card.classList.toggle('expanded');
    }
};

window.updateHeaderCartBadge = function () {
    const badge = $('headerCartCount');
    if (badge) {
        const cart = (typeof isServiceMode === 'function' && isServiceMode()) ? activeServiceCart : activeSaleCart;
        badge.textContent = (cart || []).length;
        badge.style.display = (cart || []).length > 0 ? 'inline-block' : 'none';
    }
};

    function isTestingMode() {
        return document.body?.classList?.contains('testing-mode') || Boolean(window.navigator.webdriver) || Boolean(window.__playwright_active__);
    }

    const SUPABASE_TABLES = {
        devices: 'igood_device_stock',
        accessories: 'igood_acc_stock',
        technicians: 'igood_technicians',
        serviceCatalog: 'igood_service_catalog',
        serviceOrders: 'igood_service_orders',
        preorders: 'igood_preorder_requests',
        otherCatalog: 'igood_other_catalog',
        transactions: 'igood_transactions',
        expenses: 'igood_operational_expenses',
        employees: 'igood_employees',
    };

    const PHONE_MODELS = [
        'iPhone 16 Pro Max','iPhone 16 Pro','iPhone 16 Plus','iPhone 16','iPhone 16e',
        'iPhone 15 Pro Max','iPhone 15 Pro','iPhone 15 Plus','iPhone 15',
        'iPhone 14 Pro Max','iPhone 14 Pro','iPhone 14 Plus','iPhone 14',
        'iPhone 13 Pro Max','iPhone 13 Pro','iPhone 13 Mini','iPhone 13',
        'iPhone 12 Pro Max','iPhone 12 Pro','iPhone 12 Mini','iPhone 12',
        'iPhone 11 Pro Max','iPhone 11 Pro','iPhone 11',
        'iPhone SE 3','iPhone SE 2','iPhone SE (2016)',
        'iPhone XS Max','iPhone XS','iPhone XR',
        'iPhone X','iPhone 8 Plus','iPhone 8','iPhone 7 Plus','iPhone 7',
        'iPhone 6s Plus','iPhone 6s','iPhone 6 Plus','iPhone 6',
        'iPhone 5s','iPhone 5c','iPhone 5','iPhone 4s','iPhone 4',
        'iPad Pro M4 13"','iPad Pro M4 11"','iPad Pro M2 12.9"','iPad Pro M2 11"',
        'iPad Air M2 13"','iPad Air M2 11"','iPad Air M1 10.9"',
        'iPad 10.9 Gen 10','iPad 10.2 Gen 9','iPad 10.2 Gen 8','iPad 10.2 Gen 7',
        'iPad Mini 7','iPad Mini 6','iPad Mini 5',
    ];
    const storageMap = { '32GB': '3', '64GB': '6', '128GB': '1', '256GB': '2', '512GB': '5', '1TB': 'T' };

    let currentNativePdfFilename = '';
    let currentNativePdfBase64 = '';

    function updatePreorderModelDatalist() {
        const brand = $('preorderBrand')?.value || '';
        const datalist = $('preorderModelDatalist');
        if (!datalist) return;
        
        let filteredModels = [];
        const bLower = brand.toLowerCase().trim();
        if (bLower.includes('iphone') || bLower === 'apple') {
            filteredModels = PHONE_MODELS.filter(m => m.startsWith('iPhone'));
        } else if (bLower.includes('ipad')) {
            filteredModels = PHONE_MODELS.filter(m => m.startsWith('iPad'));
        } else if (bLower.includes('android') || bLower === 'samsung' || bLower === 'xiaomi' || bLower === 'oppo' || bLower === 'vivo' || bLower === 'realme' || bLower === 'infinix') {
            filteredModels = [
                'Samsung Galaxy S24 Ultra', 'Samsung Galaxy S24+', 'Samsung Galaxy S24',
                'Samsung Galaxy S23 Ultra', 'Samsung Galaxy S23', 'Samsung Galaxy Z Fold 6',
                'Samsung Galaxy Z Flip 6', 'Oppo Find N3', 'Oppo Reno 12',
                'Xiaomi 14 Ultra', 'Xiaomi 14', 'Redmi Note 13',
                'Vivo X100 Pro', 'Vivo V40', 'Realme GT 6', 'Infinix GT 20 Pro'
            ];
        } else {
            filteredModels = PHONE_MODELS;
        }
        
        datalist.innerHTML = filteredModels.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
    }

    function updateAdminPreorderModelDatalist() {
        const brand = $('peditBrand')?.value || '';
        const datalist = $('peditModelDatalist');
        if (!datalist) return;
        
        let filteredModels = [];
        const bLower = brand.toLowerCase().trim();
        if (bLower.includes('iphone') || bLower === 'apple') {
            filteredModels = PHONE_MODELS.filter(m => m.startsWith('iPhone'));
        } else if (bLower.includes('ipad')) {
            filteredModels = PHONE_MODELS.filter(m => m.startsWith('iPad'));
        } else if (bLower.includes('android') || bLower === 'samsung' || bLower === 'xiaomi' || bLower === 'oppo' || bLower === 'vivo' || bLower === 'realme' || bLower === 'infinix') {
            filteredModels = [
                'Samsung Galaxy S24 Ultra', 'Samsung Galaxy S24+', 'Samsung Galaxy S24',
                'Samsung Galaxy S23 Ultra', 'Samsung Galaxy S23', 'Samsung Galaxy Z Fold 6',
                'Samsung Galaxy Z Flip 6', 'Oppo Find N3', 'Oppo Reno 12',
                'Xiaomi 14 Ultra', 'Xiaomi 14', 'Redmi Note 13',
                'Vivo X100 Pro', 'Vivo V40', 'Realme GT 6', 'Infinix GT 20 Pro'
            ];
        } else {
            filteredModels = PHONE_MODELS;
        }
        
        datalist.innerHTML = filteredModels.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
    }

    function $(id) { return document.getElementById(id); }
    function formValue(id) {
        const modalField = document.querySelector(`#salesItemModal.open #${id}`);
        return modalField?.value || $(id)?.value || '';
    }

    function loadEmployees() {
        const list = load(DB_KEYS.employees);
        if (!list || list.length === 0) {
            const seed = [{ id: '1', name: 'Owner', jobTitle: 'Owner', role: 'Super Admin' }];
            save(DB_KEYS.employees, seed);
            return seed;
        }
        return list;
    }
    function saveEmployees(list) { save(DB_KEYS.employees, list); }
    function loadActiveEmployee() {
        try {
            const val = localStorage.getItem(DB_KEYS.activeEmployee);
            return val ? JSON.parse(val) : null;
        } catch { return null; }
    }
    function saveActiveEmployee(emp) {
        if (emp) {
            localStorage.setItem(DB_KEYS.activeEmployee, JSON.stringify(emp));
        } else {
            localStorage.removeItem(DB_KEYS.activeEmployee);
        }
    }

    function readObject(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || '{}');
            return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        } catch {
            return {};
        }
    }

    function today() {
        const dt = new Date();
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function fmtRp(n) {
        if (n == null || isNaN(n)) return 'Rp 0';
        return 'Rp ' + Math.round(Number(n)).toLocaleString('id-ID');
    }

    function cleanRp(str) {
        if (!str) return 0;
        const clean = String(str).replace(/[^\d]/g, '');
        return Number(clean) || 0;
    }

    function setRpValue(id, val) {
        const input = $(id);
        if (!input) return;
        if (val == null || val === '') {
            input.value = '';
            return;
        }
        const num = Number(String(val).replace(/[^\d]/g, '')) || 0;
        input.value = num ? num.toLocaleString('id-ID') : '';
    }

    function bindRpFormatter(id) {
        const input = $(id);
        if (!input) return;
        input.addEventListener('input', function () {
            let cursorPosition = input.selectionStart;
            const originalLength = input.value.length;
            let val = input.value.replace(/[^\d]/g, '');
            if (val === '') {
                input.value = '';
                return;
            }
            const formatted = Number(val).toLocaleString('id-ID');
            input.value = formatted;
            const newLength = formatted.length;
            cursorPosition = cursorPosition + (newLength - originalLength);
            input.setSelectionRange(cursorPosition, cursorPosition);
        });
    }

    function fmtDate(value) {
        if (!value) return '-';
        const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (m) {
            return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        }
        const dt = new Date(value);
        if (Number.isNaN(dt.getTime())) return '-';
        return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function esc(value) {
        return String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        }[ch]));
    }

    function promptText(label, value = '') {
        const result = prompt(label, value ?? '');
        return result == null ? null : String(result).trim();
    }

    function normalizePhoneWa(value) {
        return String(value || '').replace(/[^\d+]/g, '').trim();
    }

    function toast(msg, type = 'ok') {
        const c = $('toastContainer');
        if (!c) return;
        const t = document.createElement('div');
        t.className = 'toast-msg ' + type;
        const icon = type === 'ok' ? 'checkbox-circle' : type === 'err' ? 'error-warning' : 'information';
        t.innerHTML = `<i class="ri-${icon}-line"></i> ${esc(msg)}`;
        c.appendChild(t);
        setTimeout(() => { t.classList.add('toast-out'); setTimeout(() => t.remove(), 250); }, 3000);
    }

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

    function nextSequenceFromPrefix(existingCodes, prefix, digits = 3) {
        const maxSeq = existingCodes.reduce((max, code) => {
            if (!code || !String(code).startsWith(`${prefix}-`)) return max;
            const match = String(code).match(/-(\d+)$/);
            if (!match) return max;
            return Math.max(max, Number(match[1]) || 0);
        }, 0);
        return String(maxSeq + 1).padStart(digits, '0');
    }

    function deviceCategoryCode(category) {
        const cat = String(category || '').toLowerCase().trim();
        if (cat === 'iphone' || cat === 'apple') return 'P';
        if (cat === 'android') return 'A';
        return 'X';
    }

    function generateDeviceCode(category, imei, warranty, condition = 'Bekas') {
        const catCode = deviceCategoryCode(category);
        const cleanImei = String(imei || '').replace(/\D/g, '').trim();
        const last4 = cleanImei.slice(-4) || '0000';
        const wCode = generateWarrantyUnitCode(warranty);
        const condCode = String(condition || '').toLowerCase().trim() === 'new' ? 'N' : 'X';
        return `${catCode}${wCode}${condCode}-${last4}`;
    }

    function generateWarrantyUnitCode(warranty) {
        const v = String(warranty || '').toUpperCase();
        if (['IBX', 'RESMI', 'R'].includes(v)) return 'IBX';
        if (['INT', 'INTER', 'I'].includes(v)) return 'INT';
        if (['BEA', 'BEACUKAI', 'BC'].includes(v)) return 'BEA';
        return 'IBX';
    }

    function warrantyCode(warranty) {
        const value = String(warranty || '').toUpperCase();
        if (['IBX', 'RESMI', 'R'].includes(value)) return 'R';
        if (['INT', 'INTER', 'I'].includes(value)) return 'I';
        if (['BEA', 'BEACUKAI', 'BC'].includes(value)) return 'BC';
        return 'R';
    }

    function colorCode(color) {
        const normalized = String(color || '').trim().toLowerCase();
        const firstWord = normalized.split(/\s+/)[0] || '';
        const colorMap = {
            black: 'K',
            hitam: 'H',
            midnight: 'M',
            blue: 'B',
            biru: 'B',
            white: 'W',
            putih: 'P',
            purple: 'P',
            ungu: 'U',
            red: 'R',
            merah: 'M',
            green: 'G',
            hijau: 'H',
            yellow: 'Y',
            kuning: 'K',
            pink: 'P',
            gold: 'G',
            silver: 'S',
            graphite: 'G',
            gray: 'G',
            grey: 'G',
            natural: 'N',
            starlight: 'S',
        };
        return colorMap[firstWord] || firstWord.replace(/[^a-z0-9]/gi, '').charAt(0).toUpperCase() || 'X';
    }

    function deviceCodePrefix(category, warranty, storage, color, condition = 'Bekas') {
        const catCode = deviceCategoryCode(category);
        const wCode = generateWarrantyUnitCode(warranty);
        const condCode = String(condition || '').toLowerCase().trim() === 'new' ? 'N' : 'X';
        return `${catCode}${wCode}${condCode}`;
    }

    function nextDeviceCode(warranty, storage, color, category = 'iphone', condition = 'Bekas') {
        const prefix = deviceCodePrefix(category, warranty, storage, color, condition);
        return `${prefix}-${nextSequenceFromPrefix(load(DB_KEYS.devices).map(d => d.code), prefix, 2)}`;
    }

    function nextDeviceCodes(warranty, storage, color, category = 'iphone', quantity = 1, condition = 'Bekas') {
        const prefix = deviceCodePrefix(category, warranty, storage, color, condition);
        const first = Number(nextSequenceFromPrefix(load(DB_KEYS.devices).map(d => d.code), prefix, 2)) || 1;
        return Array.from({ length: quantity }, (_, index) => `${prefix}-${String(first + index).padStart(2, '0')}`);
    }

    function nextAccCode(category) {
        const existing = load(DB_KEYS.accessories).map(a => a.code).filter(code => String(code || '').startsWith(category));
        const maxSeq = existing.reduce((max, code) => {
            const n = Number(String(code).slice(1)) || 0;
            return Math.max(max, n);
        }, 0);
        return category + String(maxSeq + 1).padStart(3, '0');
    }

    function nextServiceCode() {
        const existing = load(DB_KEYS.serviceCatalog).map(s => s.code).filter(code => String(code || '').startsWith('S'));
        const maxSeq = existing.reduce((max, code) => Math.max(max, Number(String(code).slice(1)) || 0), 0);
        return 'S' + String(maxSeq + 1).padStart(3, '0');
    }

    function nextServiceOrderCode() {
        const existing = [
            ...loadServiceOrders().map(order => order.code),
            ...loadTransactions().filter(tx => tx.category === 'service').map(tx => tx.code),
        ];
        const maxSeq = existing.reduce((max, code) => {
            const match = String(code || '').match(/^SV-(\d+)$/);
            return Math.max(max, match ? Number(match[1]) || 0 : 0);
        }, 0);
        return `SV-${String(maxSeq + 1).padStart(4, '0')}`;
    }

    function nextPreorderCode() {
        const existing = [
            ...loadPreorders().map(item => item.code),
            ...loadTransactions().filter(tx => tx.category === 'preorder_dp').map(tx => tx.code),
            ...activeSaleCart.filter(item => item.category === 'preorder_dp').map(item => item.code),
        ];
        const maxSeq = existing.reduce((max, code) => {
            const match = String(code || '').match(/^PO-(\d+)$/);
            return Math.max(max, match ? Number(match[1]) || 0 : 0);
        }, 0);
        return `PO-${String(maxSeq + 1).padStart(4, '0')}`;
    }

    function newTransactionId() {
        return `TRX-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
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
        let sell = Number(tx.sell) || 0;
        if (tx.preorderCode && tx.category !== 'preorder_dp') {
            const preorder = loadPreorders().find(p => p.code === tx.preorderCode);
            if (preorder) {
                const dp = Number(preorder.dpAmount) || 0;
                sell = Math.max(0, sell - dp);
            }
        }
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
        return {
            unit_iphone: 'UNIT IPHONE',
            unit_android: 'UNIT ANDROID',
            accessory: 'AKSESORIS',
            tukar_tambah: 'TUKAR TAMBAH',
            service: 'SERVICE',
            service_masuk: 'SERVICE MASUK',
            service_keluar: 'SERVICE KELUAR',
            service_cancel: 'SERVICE CANCEL',
            preorder_dp: 'DP PREORDER',
            other: 'LAIN-LAIN',
            order_jasa: 'ORDER JASA',
            order_jasa_beacukai: 'IMEI BEA CUKAI',
            order_jasa_icloud: 'JASA PEMBUATAN I-CLOUD',
        }[category] || 'LAIN-LAIN';
    }

