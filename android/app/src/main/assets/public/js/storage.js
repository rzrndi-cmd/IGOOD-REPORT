/**
 * IGOOD REPORT - Storage & State Management Module
 */

function load(key) {
    if (_loadCache[key] !== undefined) return _loadCache[key];
    const result = JSON.parse(localStorage.getItem(key) || '[]');
    _loadCache[key] = result;
    if (!_loadCacheScheduled) {
        _loadCacheScheduled = true;
        queueMicrotask(() => {
            Object.keys(_loadCache).forEach(k => delete _loadCache[k]);
            _loadCacheScheduled = false;
        });
    }
    return result;
}

function save(key, data) {
    delete _loadCache[key];
    localStorage.setItem(key, JSON.stringify(data));
}

function loadTransactions() { return load(DB_KEYS.transactions); }
function saveTransactions(transactions) { save(DB_KEYS.transactions, transactions); }
function loadServiceOrders() { return load(DB_KEYS.serviceOrders); }
function saveServiceOrders(serviceOrders) { save(DB_KEYS.serviceOrders, serviceOrders); }
function loadPreorders() { return load(DB_KEYS.preorders); }
function savePreorders(preorders) { save(DB_KEYS.preorders, preorders); }

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
    const raw = localStorage.getItem(DB_KEYS.activeEmployee);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
}
function saveActiveEmployee(emp) {
    if (!emp) {
        localStorage.removeItem(DB_KEYS.activeEmployee);
    } else {
        localStorage.setItem(DB_KEYS.activeEmployee, JSON.stringify(emp));
    }
}
function loadDevices() { return load(DB_KEYS.devices); }
function saveDevices(devices) { save(DB_KEYS.devices, devices); }
function loadAccessories() { return load(DB_KEYS.accessories); }
function saveAccessories(accessories) { save(DB_KEYS.accessories, accessories); }
function loadExpenses() { return load(DB_KEYS.expenses); }
function saveExpenses(expenses) { save(DB_KEYS.expenses, expenses); }
function loadTechnicians() { return load(DB_KEYS.technicians); }
function saveTechnicians(technicians) { save(DB_KEYS.technicians, technicians); }
function loadServiceCatalog() { return load(DB_KEYS.serviceCatalog); }
function saveServiceCatalog(serviceCatalog) { save(DB_KEYS.serviceCatalog, serviceCatalog); }
function loadOtherCatalog() { return load(DB_KEYS.otherCatalog); }
function saveOtherCatalog(otherCatalog) { save(DB_KEYS.otherCatalog, otherCatalog); }
function loadDeletedQueue() { return load(DB_KEYS.deletedQueue); }
function saveDeletedQueue(queue) { save(DB_KEYS.deletedQueue, queue); }
function loadPendingPushQueue() { return load(DB_KEYS.pendingPushQueue); }
function savePendingPushQueue(queue) { save(DB_KEYS.pendingPushQueue, queue); }
