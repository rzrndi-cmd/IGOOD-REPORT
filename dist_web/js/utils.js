/**
 * IGOOD REPORT - Utils & Constants Module
 */

    // Standard Cryptographic SHA-256 Hashes for system accounts
    const DEFAULT_HASH_SUPER_ADMIN = 'ff6ec2a75d5ce17f4f3aa272b5274a7bf35bd108b4d154e019689bda8d0d875c'; // igoodrame
    const DEFAULT_HASH_ADMIN = '630b001d0845f2cbd442e71d624f6b39e9b3079be50ddc30d9f9286f700af3c6';       // ramebanget
    const DEFAULT_HASH_PASSCODE = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';    // admin123
    const ADMIN_PASSCODE = 'admin123'; // kept for legacy reference

    async function hashPassword(plainText) {
        if (!plainText) return '';
        try {
            if (typeof crypto !== 'undefined' && crypto.subtle) {
                const msgUint8 = new TextEncoder().encode(plainText.trim());
                const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }
        } catch (e) {
            console.warn('Crypto API fallback used', e);
        }
        let hash = 0;
        const str = plainText.trim();
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return 'fb_' + Math.abs(hash).toString(16);
    }

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

window.toggleTxCard = function (el) {
    if (!el) return;
    const card = el.closest('.tx-accordion-card') || el.closest('.transaction-item');
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
        // iPhone 18 Series
        'iPhone 18 Pro Max','iPhone 18 Pro','iPhone 18 Plus','iPhone 18','iPhone 18 Air',
        // iPhone 17 Series
        'iPhone 17 Pro Max','iPhone 17 Pro','iPhone 17 Plus','iPhone 17','iPhone 17 Air',
        // iPhone 16 Series
        'iPhone 16 Pro Max','iPhone 16 Pro','iPhone 16 Plus','iPhone 16','iPhone 16e',
        // iPhone 15 Series
        'iPhone 15 Pro Max','iPhone 15 Pro','iPhone 15 Plus','iPhone 15',
        // iPhone 14 Series
        'iPhone 14 Pro Max','iPhone 14 Pro','iPhone 14 Plus','iPhone 14',
        // iPhone 13 Series
        'iPhone 13 Pro Max','iPhone 13 Pro','iPhone 13 Mini','iPhone 13',
        // iPhone 12 Series
        'iPhone 12 Pro Max','iPhone 12 Pro','iPhone 12 Mini','iPhone 12',
        // iPhone 11 Series
        'iPhone 11 Pro Max','iPhone 11 Pro','iPhone 11',
        // iPhone SE Series
        'iPhone SE 4','iPhone SE 3','iPhone SE 2','iPhone SE (2016)',
        // iPhone X / XS / XR Series
        'iPhone XS Max','iPhone XS','iPhone XR','iPhone X',
        // iPhone 8 / 7 / 6 / 5 / 4 Series
        'iPhone 8 Plus','iPhone 8','iPhone 7 Plus','iPhone 7',
        'iPhone 6s Plus','iPhone 6s','iPhone 6 Plus','iPhone 6',
        'iPhone 5s','iPhone 5c','iPhone 5','iPhone 4s','iPhone 4',
        // iPad Series
        'iPad Pro M4 13"','iPad Pro M4 11"','iPad Pro M2 12.9"','iPad Pro M2 11"','iPad Pro 12.9"','iPad Pro 11"',
        'iPad Air M2 13"','iPad Air M2 11"','iPad Air M1 10.9"','iPad Air 5','iPad Air 4',
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
        const last4 = cleanImei.length >= 4 ? cleanImei.slice(-4) : String(Math.floor(1000 + Math.random() * 9000));
        const wCode = generateWarrantyUnitCode(warranty);
        const condCode = String(condition || '').toLowerCase().trim() === 'new' ? 'N' : 'X';
        let code = `${catCode}${wCode}${condCode}-${last4}`;
        
        try {
            const existingCodes = (typeof load === 'function' ? (load(DB_KEYS.devices) || []) : []).map(d => d.code);
            let attempts = 0;
            while (existingCodes.includes(code) && attempts < 10) {
                const rand = String(Math.floor(1000 + Math.random() * 9000));
                code = `${catCode}${wCode}${condCode}-${rand}`;
                attempts++;
            }
        } catch {}
        return code;
    }

    function enrichTradeInTransaction(tx) {
        if (!tx || tx.category !== 'tukar_tambah') return tx;
        
        // 1. Recover from jasaMetadata / jasa_metadata if present
        const meta = tx.jasaMetadata || tx.jasa_metadata || {};
        if (meta.tradeIn || meta.newUnitSellPrice || meta.tradeInCost) {
            tx.newUnitSellPrice = tx.newUnitSellPrice || Number(meta.newUnitSellPrice) || 0;
            tx.tradeInCost = tx.tradeInCost || Number(meta.tradeInCost) || 0;
            tx.tradeInBrand = tx.tradeInBrand || meta.tradeInBrand || '';
            tx.tradeInModel = tx.tradeInModel || meta.tradeInModel || '';
            tx.tradeInStorage = tx.tradeInStorage || meta.tradeInStorage || '';
            tx.tradeInColor = tx.tradeInColor || meta.tradeInColor || '';
            tx.tradeInCondition = tx.tradeInCondition || meta.tradeInCondition || '';
            tx.tradeInWarranty = tx.tradeInWarranty || meta.tradeInWarranty || '';
            tx.tradeInImei = tx.tradeInImei || meta.tradeInImei || '';
            tx.tradeInCode = tx.tradeInCode || meta.tradeInCode || '';
            tx.tradeInNote = tx.tradeInNote || meta.tradeInNote || '';
        }

        // 2. Recover from devices stock table if tradeInCode exists or matching TT acquisition
        if ((!tx.tradeInCost || !tx.tradeInBrand) && typeof load === 'function') {
            const devices = load(DB_KEYS.devices) || [];
            let oldUnit = null;
            if (tx.tradeInCode) {
                oldUnit = devices.find(d => d.code === tx.tradeInCode);
            }
            if (!oldUnit && tx.buyerName) {
                oldUnit = devices.find(d => d.acquisition === 'TT' && (d.supplier || '').includes(tx.buyerName));
            }
            if (!oldUnit && tx.date) {
                oldUnit = devices.find(d => d.acquisition === 'TT' && d.purchaseDate === tx.date);
            }
            if (oldUnit) {
                tx.tradeInCost = tx.tradeInCost || Number(oldUnit.cost) || 0;
                tx.tradeInBrand = tx.tradeInBrand || oldUnit.brand || '';
                tx.tradeInModel = tx.tradeInModel || oldUnit.model || '';
                tx.tradeInStorage = tx.tradeInStorage || oldUnit.storage || '';
                tx.tradeInColor = tx.tradeInColor || oldUnit.color || '';
                tx.tradeInCondition = tx.tradeInCondition || oldUnit.condition || '';
                tx.tradeInWarranty = tx.tradeInWarranty || oldUnit.warranty || '';
                tx.tradeInImei = tx.tradeInImei || oldUnit.imei || '';
                tx.tradeInCode = tx.tradeInCode || oldUnit.code || '';
            }
        }

        // 3. Fallback extraction from tx.itemName (e.g. "... (TT: Apple iPhone XR 64GB)")
        if (!tx.tradeInModel && tx.itemName && tx.itemName.includes('(TT:')) {
            const match = tx.itemName.match(/\(TT:\s*([^\)]+)\)/i);
            if (match && match[1]) {
                const parts = match[1].trim().split(/\s+/);
                if (parts.length >= 2) {
                    tx.tradeInBrand = tx.tradeInBrand || parts[0];
                    tx.tradeInModel = tx.tradeInModel || parts.slice(1).join(' ');
                } else {
                    tx.tradeInModel = tx.tradeInModel || match[1].trim();
                }
            }
        }

        // 4. Mathematical fallback for newUnitSellPrice & tradeInCost
        const sellNet = Number(tx.sell) || 0;
        let costOld = Number(tx.tradeInCost) || 0;
        let priceNew = Number(tx.newUnitSellPrice) || 0;

        if (priceNew <= 0 && costOld > 0) {
            priceNew = sellNet + costOld;
            tx.newUnitSellPrice = priceNew;
        } else if (costOld <= 0 && priceNew > sellNet && priceNew > 0) {
            costOld = priceNew - sellNet;
            tx.tradeInCost = costOld;
        }

        return tx;
    }

    function enrichTransaction(tx) {
        if (!tx) return tx;
        if (tx.category === 'tukar_tambah') {
            return enrichTradeInTransaction(tx);
        }
        if ((tx.category === 'unit_iphone' || tx.category === 'unit_android') && !tx.imei && typeof load === 'function') {
            const devices = load(DB_KEYS.devices) || [];
            const unit = devices.find(d => d.code === (tx.stockRefCode || tx.code));
            if (unit && unit.imei) {
                tx.imei = unit.imei;
            }
        }
        return tx;
    }

    function generateWarrantyUnitCode(warranty) {
        const v = String(warranty || '').toUpperCase();
        if (['IBX', 'RESMI', 'R'].includes(v)) return 'IBX';
        if (['INT', 'INTER', 'I'].includes(v)) return 'INT';
        if (['BEA', 'BEACUKAI', 'BC'].includes(v)) return 'BEA';
        return 'IBX';
    }

    function parseBrandFromText(text) {
        const str = String(text || '').toLowerCase();
        if (str.includes('iphone') || str.includes('apple') || str.includes('ipad')) return 'Apple';
        if (str.includes('samsung')) return 'Samsung';
        if (str.includes('xiaomi') || str.includes('redmi') || str.includes('poco')) return 'Xiaomi';
        if (str.includes('oppo')) return 'Oppo';
        if (str.includes('vivo') || str.includes('iqoo')) return 'Vivo';
        if (str.includes('realme')) return 'Realme';
        if (str.includes('infinix')) return 'Infinix';
        return 'Apple';
    }

    function parseModelFromText(text) {
        const raw = String(text || '').trim();
        if (!raw) return '';
        const iphoneMatch = raw.match(/iphone\s+(1[1-6]\s*(?:pro\s*max|pro|plus|mini)?|xs\s*max|xr|xs|x|se\s*\d*|[78]\s*plus|[78])/i);
        if (iphoneMatch) {
            return iphoneMatch[0].replace(/\s+/g, ' ').trim();
        }
        const samsungMatch = raw.match(/samsung\s+galaxy\s+[a-z0-9\s]+|samsung\s+[a-z0-9\s]+|galaxy\s+[a-z0-9\s]+/i);
        if (samsungMatch) {
            return samsungMatch[0].replace(/\s+/g, ' ').trim();
        }
        const cleaned = raw.replace(/\b(128gb|256gb|64gb|512gb|1tb|32gb|16gb|new|bekas|second|inter|ibox|resmi|beacukai|bnib|bnob)\b/gi, '').replace(/\s+/g, ' ').trim();
        return cleaned || raw;
    }

    function parseStorageFromText(text) {
        const match = String(text || '').match(/\b(16gb|32gb|64gb|128gb|256gb|512gb|1tb)\b/i);
        return match ? match[1].toUpperCase() : '128GB';
    }

    function parseColorFromText(text) {
        const raw = String(text || '').toLowerCase();
        const colors = [
            'natural titanium', 'black titanium', 'white titanium', 'desert titanium',
            'space black', 'space grey', 'space gray', 'deep purple', 'sierra blue', 'pacific blue', 'alpine green',
            'midnight', 'starlight', 'hitam', 'black', 'putih', 'white', 'biru', 'blue', 'pink', 'merah', 'red', 'hijau', 'green',
            'gold', 'silver', 'purple', 'ungu', 'grey', 'gray', 'yellow', 'kuning', 'titanium'
        ];
        for (const c of colors) {
            if (raw.includes(c)) {
                return c.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }
        }
        return 'Hitam';
    }

    function parseConditionFromText(text) {
        const raw = String(text || '').toLowerCase();
        if (raw.includes('new') || raw.includes('baru') || raw.includes('bnib') || raw.includes('bnob')) return 'New';
        return 'Bekas';
    }

    function parseWarrantyFromText(text) {
        const raw = String(text || '').toLowerCase();
        if (raw.includes('ibox') || raw.includes('resmi') || raw.includes('gd') || raw.includes('digimap')) return 'IBX';
        if (raw.includes('beacukai') || raw.includes('bc')) return 'BEA';
        if (raw.includes('inter') || raw.includes('international')) return 'INT';
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
        return method || '-';
    }

    function formatPaymentDetail(tx) {
        if (!tx) return '-';
        const method = tx.receiptPaymentMethod || tx.paymentMethod || 'cash';
        const hasSplit = method === 'split' || (Number(tx.splitCash) > 0 && (Number(tx.splitTransfer) > 0 || Number(tx.splitCredit) > 0)) || (Number(tx.splitTransfer) > 0 && Number(tx.splitCredit) > 0);
        if (hasSplit) {
            const parts = [];
            if (Number(tx.splitCash) > 0) parts.push(`Cash ${fmtRp(tx.splitCash)}`);
            if (Number(tx.splitTransfer) > 0) parts.push(`Transfer ${fmtRp(tx.splitTransfer)}`);
            if (Number(tx.splitCredit) > 0) {
                const agent = tx.creditAgent ? ` [${tx.creditAgent}]` : '';
                parts.push(`Kredit${agent} ${fmtRp(tx.splitCredit)}`);
            }
            return parts.length ? `Split (${parts.join(' + ')})` : 'Split';
        }
        const agent = tx.creditAgent ? ` (${tx.creditAgent})` : '';
        if (method === 'kredit') return `Kredit${agent}`;
        return paymentLabel(method);
    }

    function paymentTotals(tx) {
        const method = String(tx.paymentMethod || 'cash').toLowerCase().trim();
        if (method === 'split') {
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
            cash: (method === 'cash' || method === 'tunai') ? sell : 0,
            transfer: (method === 'transfer' || method === 'tf') ? sell : 0,
            kredit: (method === 'kredit' || method === 'credit') ? sell : 0,
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

