import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const jsDir = path.join(rootDir, 'js');

async function unify() {
    console.log('Unifying global state declarations...');

    // 1. Read all files
    let utils = await fs.readFile(path.join(jsDir, 'utils.js'), 'utf8');
    let storage = await fs.readFile(path.join(jsDir, 'storage.js'), 'utf8');
    let receipt = await fs.readFile(path.join(jsDir, 'receipt.js'), 'utf8');
    let supabase = await fs.readFile(path.join(jsDir, 'supabase.js'), 'utf8');
    let sales = await fs.readFile(path.join(jsDir, 'sales.js'), 'utf8');
    let service = await fs.readFile(path.join(jsDir, 'service.js'), 'utf8');
    let dailyReport = await fs.readFile(path.join(jsDir, 'daily-report.js'), 'utf8');
    let admin = await fs.readFile(path.join(jsDir, 'admin.js'), 'utf8');
    let app = await fs.readFile(path.join(rootDir, 'app.js'), 'utf8');

    // Clean top-level duplicate let/const from files
    // In storage.js: remove _loadCache and _loadCacheScheduled declarations
    storage = storage.replace(/const _loadCache = \{\};\r?\nlet _loadCacheScheduled = false;\r?\n/, '');

    // In supabase.js: remove supabaseConfigLoadPromise, isSilentPulling, syncPillTimer, startupSupabasePushStarted
    supabase = supabase.replace(/let supabaseConfigLoadPromise = null;\r?\n/, '');
    supabase = supabase.replace(/let isSilentPulling = false;\r?\n/, '');
    supabase = supabase.replace(/let syncPillTimer = null;\r?\n/, '');
    supabase = supabase.replace(/let startupSupabasePushStarted = false;\r?\n/, '');

    // In sales.js: remove activeSaleCart, checkoutStage, etc.
    sales = sales.replace(/let checkoutStage = 'items'; \/\/ 'items' or 'payment'\r?\n/, '');

    // In daily-report.js: remove activePdfTab
    dailyReport = dailyReport.replace(/let activePdfTab = 'harian';\r?\n/, '');

    // In admin.js: remove chartRevenue, chartPayment, chartCategory, activeMonthlyDetail, activeMonthlySubTab, activeExpenseMonth
    admin = admin.replace(/let chartRevenue, chartPayment, chartCategory;\r?\n/, '');
    admin = admin.replace(/let activeMonthlyDetail = null;\r?\n/, '');
    admin = admin.replace(/let activeMonthlySubTab = 'all';\r?\n/, '');
    admin = admin.replace(/let activeExpenseMonth = ''; \/\/ YYYY-MM\r?\n/, '');

    // In app.js: remove currentMode, activeSaleType, activeServiceSaleMode, activeServiceOrderFilter, lastBackPressMs
    app = app.replace(/let currentMode = localStorage\.getItem\(DB_KEYS\.mode\) \|\| 'sales';\r?\n/, '');
    app = app.replace(/let activeSaleType = 'unit_iphone';\r?\n/, '');
    app = app.replace(/let activeServiceSaleMode = 'masuk';\r?\n/, '');
    app = app.replace(/let activeServiceOrderFilter = 'masuk';\r?\n/, '');
    app = app.replace(/let lastBackPressMs = 0;\r?\n/, '');

    // Prepend all global state variables to utils.js
    const globalsHeader = `
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
`;

    utils = utils.replace(/(const DB_KEYS = \{[\s\S]*?\};\r?\n)/, `$1${globalsHeader}\n`);

    // In receipt.js: remove duplicate declarations if present
    receipt = receipt.replace(/let currentReceiptText = '';\r?\n/, '');
    receipt = receipt.replace(/let currentReceiptTitle = 'Struk Transaksi';\r?\n/, '');
    receipt = receipt.replace(/let currentReceiptRows = \[\];\r?\n/, '');
    receipt = receipt.replace(/let activeSaleCart = \[\];\r?\n/, '');
    receipt = receipt.replace(/let activeServiceCart = \[\];\r?\n/, '');
    receipt = receipt.replace(/let activeSaleCartType = 'unit_iphone';\r?\n/, '');
    receipt = receipt.replace(/let activeSaleCartEditId = '';\r?\n/, '');
    receipt = receipt.replace(/let activeSalesItemModalMode = 'cart';\r?\n/, '');
    receipt = receipt.replace(/let activeLinkedPreorder = null;\r?\n/, '');
    receipt = receipt.replace(/let isAddingToCart = false;\r?\n/, '');

    await fs.writeFile(path.join(jsDir, 'utils.js'), utils, 'utf8');
    await fs.writeFile(path.join(jsDir, 'storage.js'), storage, 'utf8');
    await fs.writeFile(path.join(jsDir, 'receipt.js'), receipt, 'utf8');
    await fs.writeFile(path.join(jsDir, 'supabase.js'), supabase, 'utf8');
    await fs.writeFile(path.join(jsDir, 'sales.js'), sales, 'utf8');
    await fs.writeFile(path.join(jsDir, 'service.js'), service, 'utf8');
    await fs.writeFile(path.join(jsDir, 'daily-report.js'), dailyReport, 'utf8');
    await fs.writeFile(path.join(jsDir, 'admin.js'), admin, 'utf8');
    await fs.writeFile(path.join(rootDir, 'app.js'), app, 'utf8');

    console.log('Global state successfully unified.');
}

unify();
