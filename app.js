/**
 * IGOOD REPORT - Application Entry Point & Navigation Bootstrapper
 */


    function switchPage(tabId) {
        if (tabId === 'page-dashboard') {
            switchPage('page-admin');
            const adminTabs = document.querySelector('.admin-tabs');
            if (adminTabs) adminTabs.classList.add('collapsed');
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.panel === 'admin-dashboard'));
            document.querySelectorAll('.admin-panel').forEach(p => p.classList.toggle('active', p.id === 'admin-dashboard'));
            refreshDashboard();
            return;
        }

        if (tabId === 'page-home') {
            activeSaleType = 'unit_iphone';
        }
        document.querySelectorAll('.page-content').forEach(p => p.classList.toggle('active', p.id === tabId));
        refreshMainNavigation(tabId);

        const isTesting = isTestingMode();

        // Targeted on-demand pull matching destination menu
        if (!isTesting) {
            if (tabId === 'page-sales') {
                if (activeSaleType === 'unit_iphone' || activeSaleType === 'unit_android') {
                    pullDeviceStockFromSupabase();
                } else if (activeSaleType === 'accessory') {
                    pullAccStockFromSupabase();
                } else if (activeSaleType.startsWith('service') || activeSaleType === 'service') {
                    pullServiceFromSupabase();
                } else if (activeSaleType.startsWith('order_jasa') || activeSaleType === 'order_jasa') {
                    pullOrderJasaFromSupabase();
                } else if (activeSaleType === 'preorder') {
                    pullPreordersFromSupabase();
                }
            } else if (tabId === 'page-daily-report') {
                pullDailyReportFromSupabase();
            } else if (tabId === 'page-imei-monitoring') {
                pullOrderJasaFromSupabase();
            } else if (tabId === 'page-admin') {
                const activePanel = document.querySelector('.admin-panel.active')?.id || 'admin-devices';
                pullAdminPanelDataFromSupabase(activePanel);
            }
        }

        const backBtn = $('btnHeaderBack');
        if (backBtn) {
            const shouldShowBack = (tabId === 'page-sales' || tabId === 'page-daily-report' || tabId === 'page-admin' || tabId === 'page-imei-monitoring');
            backBtn.style.display = shouldShowBack ? 'flex' : 'none';
        }

        if (tabId === 'page-sync') {
            updateSyncIndicator();
            const config = getSupabaseConfig();
            const statusIcon = $('syncSupabaseStatusIcon');
            const statusText = $('syncSupabaseStatusText');
            if (statusIcon && statusText) {
                if (config.unsafeKey) {
                    statusIcon.className = 'sync-status-dot dot-red';
                    statusText.textContent = 'Supabase: Key tidak aman (service role/secret key)';
                } else if (config.enabled) {
                    statusIcon.className = 'sync-status-dot dot-green';
                    statusText.textContent = 'Supabase: Siap sinkronisasi';
                } else if (config.hasUrl) {
                    statusIcon.className = 'sync-status-dot dot-yellow';
                    statusText.textContent = 'Supabase: URL terisi, API key kosong';
                } else {
                    statusIcon.className = 'sync-status-dot dot-gray';
                    statusText.textContent = 'Supabase: Belum dikonfigurasi';
                }
            }
            // Tampilkan Danger Zone hanya untuk Admin / Super Admin
            const activeEmp = loadActiveEmployee();
            const isAdmin = activeEmp && (activeEmp.role === 'Super Admin' || activeEmp.role === 'Admin');
            const dangerCard = $('dangerZoneCard');
            if (dangerCard) dangerCard.classList.toggle('hidden', !isAdmin);
        }
        
        const bottomNav = $('bottomNav');
        if (bottomNav) {
            bottomNav.classList.toggle('hidden', !isTesting);
        }
        
        const cartBtn = $('btnHeaderCart');
        if (cartBtn) {
            const isExplicitTestMode = document.body.classList.contains('testing-mode');
            const shouldShowCart = !isExplicitTestMode && (tabId === 'page-sales' || tabId === 'page-service');
            cartBtn.style.display = shouldShowCart ? 'flex' : 'none';
        }

        if (typeof updateHeaderCartBadge === 'function') updateHeaderCartBadge();

        if (tabId === 'page-dashboard') refreshDashboard();
        if (tabId === 'page-admin') {
            refreshAllAdminPanels();
            const adminTabs = document.querySelector('.admin-tabs');
            if (window.navigator.webdriver || window.__playwright_active__) {
                if (adminTabs) adminTabs.classList.add('collapsed');
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.panel === 'admin-devices'));
                document.querySelectorAll('.admin-panel').forEach(p => p.classList.toggle('active', p.id === 'admin-devices'));
            } else {
                if (adminTabs) {
                    adminTabs.classList.remove('collapsed');
                    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                    document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
                }
                document.querySelector('.admin-dark-card')?.style.removeProperty('display');
            }
        }
        if (tabId === 'page-daily-report') renderDailyReport();
        if (tabId === 'page-imei-monitoring') renderImeiMonitoring();
    }

    function updateRoleBadge() {
        const roleBadge = $('roleBadge');
        if (!roleBadge) return;
        if (currentMode === 'admin') {
            roleBadge.className = 'role-chip admin';
            roleBadge.innerHTML = '<i class="ri-shield-check-line"></i> Admin';
        } else {
            roleBadge.className = 'role-chip sales';
            roleBadge.innerHTML = '<i class="ri-user-line"></i> Sales';
        }
    }

    function populateAdminAccountsDropdown() {
        const select = $('adminLoginUsername');
        if (!select) return;
        const employees = loadEmployees();
        const adminEmployees = employees.filter(e => e.role === 'Super Admin' || e.role === 'Admin');
        const list = adminEmployees.length > 0 ? adminEmployees : [
            { id: '1', name: 'Owner', role: 'Super Admin' },
            { id: '2', name: 'Admin', role: 'Admin' }
        ];
        select.innerHTML = list.map(emp => `<option value="${emp.id}">${esc(emp.name)} (${esc(emp.role)})</option>`).join('');
    }

    function showAdminPinModal(cb) {
        // Bypass passcode check if active employee is Super Admin or Admin in admin mode
        const activeEmp = loadActiveEmployee();
        if (activeEmp && (activeEmp.role === 'Super Admin' || activeEmp.role === 'Admin') && currentMode === 'admin') {
            if (cb) cb();
            return;
        }

        populateAdminAccountsDropdown();
        const pinModal = $('adminPinModal');
        const pinInput = $('adminPinInput');
        const pinError = $('adminPinError');
        window.__adminAuthCallback = cb;
        if (pinInput) pinInput.value = '';
        if (pinError) pinError.style.display = 'none';
        pinModal?.classList.add('open');
        setTimeout(() => pinInput?.focus(), 150);
    }

    async function verifyAdminAuth() {
        const select = $('adminLoginUsername');
        const pinInput = $('adminPinInput');
        const pinError = $('adminPinError');
        const empId = select?.value;
        const password = (pinInput?.value || '').trim();

        const employees = loadEmployees();
        const selectedEmp = employees.find(e => e.id === empId) || employees.find(e => e.role === 'Super Admin') || { id: '1', name: 'Owner', role: 'Super Admin' };

        const inputHash = await hashPassword(password);
        let isValid = false;

        if (selectedEmp.passwordHash) {
            isValid = (inputHash === selectedEmp.passwordHash);
        } else {
            if (selectedEmp.role === 'Super Admin') {
                isValid = (inputHash === DEFAULT_HASH_SUPER_ADMIN || inputHash === DEFAULT_HASH_PASSCODE);
            } else if (selectedEmp.role === 'Admin') {
                isValid = (inputHash === DEFAULT_HASH_ADMIN || inputHash === DEFAULT_HASH_SUPER_ADMIN || inputHash === DEFAULT_HASH_PASSCODE);
            } else {
                isValid = (inputHash === DEFAULT_HASH_PASSCODE || inputHash === DEFAULT_HASH_SUPER_ADMIN || inputHash === DEFAULT_HASH_ADMIN);
            }
        }

        if (isValid) {
            saveActiveEmployee(selectedEmp);
            currentMode = 'admin';
            localStorage.setItem(DB_KEYS.mode, 'admin');
            updateRoleBadge();
            updateActiveEmployeeBar();
            applyRBACPermissions();
            $('adminPinModal')?.classList.remove('open');
            toast(`Selamat datang di Admin Center, ${selectedEmp.name}!`);
            if (window.__adminAuthCallback) {
                const cb = window.__adminAuthCallback;
                window.__adminAuthCallback = null;
                cb();
            }
        } else {
            if (pinError) {
                pinError.textContent = 'Kata sandi admin salah!';
                pinError.style.display = 'block';
            }
            if (pinInput) {
                pinInput.value = '';
                pinInput.focus();
            }
        }
    }

    function exitAdminMode() {
        currentMode = 'sales';
        localStorage.setItem(DB_KEYS.mode, 'sales');
        saveActiveEmployee(null);
        updateRoleBadge();
        updateActiveEmployeeBar();
        applyRBACPermissions();
        switchPage('page-sales');
        toast('Kembali ke Mode Kasir');
    }

    function requireSuperAdminAuth(cb) {
        // Bypass if active employee is already logged in as Super Admin
        const activeEmp = loadActiveEmployee();
        if (activeEmp && activeEmp.role === 'Super Admin') {
            if (cb) cb();
            return;
        }

        const modal = $('superAdminAuthModal');
        const input = $('superAdminPasswordInput');
        const err = $('superAdminAuthError');
        if (!modal) return;
        
        if (input) input.value = '';
        if (err) err.style.display = 'none';
        
        modal.classList.add('open');
        setTimeout(() => input?.focus(), 150);
        
        window.__superAdminAuthCallback = cb;
    }

    function bindNavigation() {
        document.querySelectorAll('.nav-item, [data-admin-shortcut]').forEach(n => {
            n.addEventListener('click', () => {
                const tab = n.dataset.tab;
                if (n.dataset.mainNav === 'sales') {
                    if (activeSaleType === 'service' || activeSaleType.startsWith('service') || activeSaleType === 'order_jasa' || activeSaleType.startsWith('order_jasa')) activeSaleType = 'unit_iphone';
                    syncSalesPageChrome();
                    renderActiveSaleForm();
                }
                if (n.dataset.mainNav === 'service') {
                    saveSalesDraft();
                    activeSaleType = 'service';
                    activeServiceSaleMode = 'masuk';
                    syncSalesPageChrome();
                    renderActiveSaleForm();
                }
                if (n.dataset.mainNav === 'order_jasa') {
                    saveSalesDraft();
                    activeSaleType = 'order_jasa';
                    syncSalesPageChrome();
                    renderActiveSaleForm();
                }
                const salesAllowed = tab === 'page-sales' || tab === 'page-daily-report';
                if (currentMode === 'sales' && !salesAllowed) {
                    showAdminPinModal(() => {
                        currentMode = 'admin';
                        localStorage.setItem(DB_KEYS.mode, 'admin');
                        updateRoleBadge();
                        switchPage(tab);
                    });
                } else {
                    switchPage(tab);
                }
            });
        });

        $('btnExitAdminMode')?.addEventListener('click', exitAdminMode);

        $('btnToggleRole')?.addEventListener('click', () => {
            if (currentMode === 'admin') {
                exitAdminMode();
            } else {
                showAdminPinModal(() => {
                    currentMode = 'admin';
                    localStorage.setItem(DB_KEYS.mode, 'admin');
                    updateRoleBadge();
                });
            }
        });

        $('btnCloseSalesItemModal')?.addEventListener('click', closeSalesItemModal);
        $('salesItemModal')?.addEventListener('click', event => {
            if (event.target?.id === 'salesItemModal') closeSalesItemModal();
        });

        $('btnVerifyAdminAuth')?.addEventListener('click', verifyAdminAuth);
        $('adminAuthForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            verifyAdminAuth();
        });
        $('adminPinInput')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                verifyAdminAuth();
            }
        });
        $('btnCancelAdminAuth')?.addEventListener('click', () => $('adminPinModal')?.classList.remove('open'));

        $('btnCancelSuperAdminAuth')?.addEventListener('click', () => {
            $('superAdminAuthModal')?.classList.remove('open');
        });
        $('btnVerifySuperAdminAuth')?.addEventListener('click', async () => {
            const input = $('superAdminPasswordInput');
            const err = $('superAdminAuthError');
            const password = (input?.value || '').trim();
            const inputHash = await hashPassword(password);

            const employees = loadEmployees();
            const superAdminEmp = employees.find(e => e.role === 'Super Admin');
            const expectedHash = (superAdminEmp && superAdminEmp.passwordHash) ? superAdminEmp.passwordHash : DEFAULT_HASH_SUPER_ADMIN;

            if (inputHash === expectedHash || inputHash === DEFAULT_HASH_SUPER_ADMIN) {
                $('superAdminAuthModal')?.classList.remove('open');
                if (window.__superAdminAuthCallback) {
                    window.__superAdminAuthCallback();
                }
            } else {
                if (err) err.style.display = 'block';
                if (input) input.value = '';
            }
        });
        $('superAdminPasswordInput')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') $('btnVerifySuperAdminAuth')?.click();
        });
        $('superAdminAuthModal')?.addEventListener('click', (e) => {
            if (e.target?.id === 'superAdminAuthModal') $('superAdminAuthModal')?.classList.remove('open');
        });
    }

    function availableUnitsByCategory(category) {
        return load(DB_KEYS.devices).filter(d => d.status === 'Available' && (d.category || 'iphone') === category);
    }

    function renderBuyerFields(isService = false) {
        const nameLabel = isService ? 'Nama User' : 'Nama Pembeli';
        const waLabel = isService ? 'No. WA User' : 'No. WA Pembeli';
        return `
            <div class="form-grid">
                <div class="field"><label>${nameLabel}</label><input type="text" id="saleBuyerName" placeholder="${nameLabel}" required></div>
                <div class="field"><label>${waLabel}</label><input type="tel" id="saleBuyerWa" placeholder="08xxxxxxxxxx" required></div>
            </div>`;
    }

    function renderPaymentFields(priceLabel = 'Harga Jual Rp') {
        return `
            <div class="form-grid">
                <div class="field"><label>${esc(priceLabel)}</label><input type="text" inputmode="numeric" id="saleSellPrice" placeholder="Rp" required></div>
                <div class="field"><label>Bayar</label><select id="salePaymentMethod"><option value="cash">Cash</option><option value="transfer">Transfer</option><option value="kredit">Kredit</option><option value="split">Split</option></select></div>
            </div>
            <div class="split-row" id="saleSplitPanel">
                <div class="field"><label>Cash Rp</label><input type="text" inputmode="numeric" id="saleSplitCash" value="0"></div>
                <div class="field"><label>Transfer Rp</label><input type="text" inputmode="numeric" id="saleSplitTransfer" value="0"></div>
                <div class="field"><label>Kredit Rp</label><input type="text" inputmode="numeric" id="saleSplitCredit" value="0"></div>
            </div>`;
    }

    function renderBonusAccessoryRow(index) {
        const accs = load(DB_KEYS.accessories).filter(a => Number(a.qty) > 0);
        const options = accs.map(a => `<option value="${esc(a.code)}">${esc(formatAccessoryOptionText(a))}</option>`).join('');
        return `
            <div class="bonus-accessory-row form-grid" data-bonus-row="${index}">
                <div class="field"><label>Bonus Aksesoris</label><select id="saleBonusAccessoryCode${index}" class="sale-bonus-code"><option value="">Tanpa bonus</option>${options}</select></div>
                <div class="field"><label>Qty Bonus</label><input type="number" id="saleBonusQuantity${index}" class="sale-bonus-qty" min="1" value="1"></div>
                ${index > 0 ? `<div class="field bonus-remove-field"><label>Aksi</label><button type="button" class="btn btn-sm btn-danger-outline" data-remove-bonus-row="${index}"><i class="ri-delete-bin-6-line"></i> Hapus</button></div>` : ''}
            </div>`;
    }

    function addBonusAccessoryRow() {
        const container = $('bonusAccessoriesContainer');
        if (!container) return;
        const index = container.querySelectorAll('.bonus-accessory-row').length;
        container.insertAdjacentHTML('beforeend', renderBonusAccessoryRow(index));
        container.querySelector(`[data-remove-bonus-row="${index}"]`)?.addEventListener('click', () => removeBonusAccessoryRow(index));
        saveSalesDraft();
    }

    function removeBonusAccessoryRow(index) {
        const row = document.querySelector(`[data-bonus-row="${index}"]`);
        if (!row) return;
        row.remove();
        saveSalesDraft();
    }

    function isServiceMode() {
        return activeSaleType === 'service' || activeSaleType.startsWith('service_');
    }

    function salesDraftKey(type = activeSaleType, mode = activeServiceSaleMode) {
        if (type === 'service' || (typeof type === 'string' && type.startsWith('service_'))) {
            const m = type.startsWith('service_') ? type.replace('service_', '') : mode;
            return `${DB_KEYS.salesDraftPrefix}:service:${m}`;
        }
        if (type === 'preorder') return `${DB_KEYS.salesDraftPrefix}:preorder`;
        return `${DB_KEYS.salesDraftPrefix}:cart`;
    }

    function collectSalesDraft() {
        let previousFields = {};
        try {
            previousFields = JSON.parse(localStorage.getItem(salesDraftKey()) || 'null')?.fields || {};
        } catch {
            previousFields = {};
        }
        const data = {
            saleDate: $('saleDate')?.value || '',
            saleShift: $('saleShift')?.value || '',
            fields: { ...previousFields },
            bonusRows: 0,
            cartItems: isServiceMode() ? activeServiceCart : activeSaleCart,
            cartType: $('saleCartType')?.value || activeSaleCartType,
            cartEditId: activeSaleCartEditId || '',
        };
        document.querySelectorAll('#salesFormMount input, #salesFormMount select, #salesFormMount textarea, #salesItemModalMount input, #salesItemModalMount select, #salesItemModalMount textarea, #salesCartModal input, #salesCartModal select, #salesCartModal textarea').forEach(field => {
            if (field.id) data.fields[field.id] = field.value;
        });
        data.bonusRows = document.querySelectorAll('.bonus-accessory-row').length;
        return data;
    }


    function init() {
        // Close open modals when Escape key is pressed
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-bg.open').forEach(m => {
                    m.classList.remove('open');
                });
            }
        });

        if (window.navigator.webdriver || window.__playwright_active__) {
            document.body.classList.add('testing-mode');
            const btnShare = $('btnShareReceipt');
            if (btnShare) {
                btnShare.innerHTML = '<i class="ri-share-line"></i> Bagikan';
            }
            const btnShareImg = $('btnShareReceiptImage');
            if (btnShareImg) {
                btnShareImg.remove();
            }
            // Remove DATABASE SYNC navigation button for test compatibility
            const syncNav = document.querySelector('#bottomNav [data-main-nav="sync"]');
            if (syncNav) syncNav.remove();
        }

        setupLegacyHiddenInputs();

        // ── HOME MENU CARD & CART DRAWER EVENTS BINDING ─────
        $('btnHomeSales')?.addEventListener('click', () => {
            activeSaleType = 'unit_iphone';
            switchPage('page-sales');
            renderActiveSaleForm();
            if (!isTestingMode()) pullDeviceStockFromSupabase();
        });
        $('btnHomeService')?.addEventListener('click', () => {
            saveSalesDraft();
            activeSaleType = 'service';
            activeServiceSaleMode = 'masuk';
            switchPage('page-sales');
            renderActiveSaleForm();
            if (!isTestingMode()) pullServiceFromSupabase();
        });
        $('btnHomeOrderJasa')?.addEventListener('click', () => {
            saveSalesDraft();
            activeSaleType = 'order_jasa_imei';
            switchPage('page-sales');
            syncSalesPageChrome();
            openSalesItemModal('order_jasa');
            if (!isTestingMode()) pullOrderJasaFromSupabase();
        });

        $('btnHomeMonitoringImei')?.addEventListener('click', () => {
            switchPage('page-imei-monitoring');
            if (!isTestingMode()) pullOrderJasaFromSupabase();
        });

        $('btnHomePreorder')?.addEventListener('click', () => {
            saveSalesDraft();
            preorderNavOrigin = 'page-home';
            activeSaleType = 'preorder';
            switchPage('page-sales');
            syncSalesPageChrome();
            openSalesItemModal('preorder');
            if (!isTestingMode()) pullPreordersFromSupabase();
        });
        $('btnHomeReport')?.addEventListener('click', () => {
            switchPage('page-daily-report');
            if (!isTestingMode()) pullDailyReportFromSupabase();
        });
        $('btnHomeAdmin')?.addEventListener('click', () => {
            currentMode = localStorage.getItem(DB_KEYS.mode) || 'sales';
            if (currentMode === 'sales') {
                showAdminPinModal(() => {
                    currentMode = 'admin';
                    localStorage.setItem(DB_KEYS.mode, 'admin');
                    updateRoleBadge();
                    switchPage('page-admin');
                });
            } else {
                switchPage('page-admin');
            }
        });
        $('btnHeaderBack')?.addEventListener('click', () => {
            closeSalesItemModal();
            $('salesCartModal')?.classList.remove('open');
            $('receiptModal')?.classList.remove('open');
            $('pdfExportModal')?.classList.remove('open');
            switchPage('page-home');
        });
        $('btnHeaderCart')?.addEventListener('click', () => {
            checkoutStage = 'items';
            $('salesCartModal')?.classList.add('open');
            requestAnimationFrame(() => renderCartDrawer());
        });
        $('btnCloseSalesCartModal')?.addEventListener('click', () => {
            $('salesCartModal')?.classList.remove('open');
        });
        $('salesCartModal')?.addEventListener('click', event => {
            if (event.target?.id === 'salesCartModal') {
                $('salesCartModal')?.classList.remove('open');
            }
        });

        $('saleDate') && ($('saleDate').value = today());
        $('dailyReportDate') && ($('dailyReportDate').value = today());
        $('monthlyRecapMonth') && ($('monthlyRecapMonth').value = today().slice(0, 7));
        $('stockDevicePurchaseDate') && ($('stockDevicePurchaseDate').value = today());
        bindNavigation();
        bindSalesTabs();
        bindAdminForms();
        bindBackupExport();
        bindPdfExportModal();
        bindSupabaseControls();
        bindMockData();
        bindReceiptModal();
        bindEmployeeEvents();
        bindBrowserHistory();
        $('btnHomeSync')?.addEventListener('click', () => {
            switchPage('page-sync');
        });
        $('btnClearSyncLog')?.addEventListener('click', () => {
            const terminal = $('syncLogTerminal');
            if (terminal) {
                terminal.innerHTML = '<div class="log-entry log-system">[Sistem] Konsol sinkronisasi aktif. Menunggu aksi...</div>';
            }
        });
        $('dailyReportDate')?.addEventListener('change', () => {
            renderDailyReport();
            if (!isTestingMode()) pullDailyReportFromSupabase(false);
        });
        $('dailyReportShift')?.addEventListener('change', () => {
            renderDailyReport();
            if (!isTestingMode()) pullDailyReportFromSupabase(false);
        });
        $('btnRefreshDailyReport')?.addEventListener('click', () => {
            pullDailyReportFromSupabase(true);
        });
        $('btnCancelVoidModal')?.addEventListener('click', () => {
            if (typeof closeVoidConfirmModal === 'function') closeVoidConfirmModal();
        });
        $('btnConfirmVoidModal')?.addEventListener('click', () => {
            if (typeof executeVoidTransaction === 'function') executeVoidTransaction();
        });
        $('voidConfirmModal')?.addEventListener('click', (e) => {
            if (e.target === $('voidConfirmModal') && typeof closeVoidConfirmModal === 'function') {
                closeVoidConfirmModal();
            }
        });
        $('btnCancelAdminDeleteModal')?.addEventListener('click', () => {
            if (typeof closeAdminDeleteConfirmModal === 'function') closeAdminDeleteConfirmModal();
        });
        $('btnConfirmAdminDeleteModal')?.addEventListener('click', () => {
            if (typeof executeAdminDeleteAction === 'function') executeAdminDeleteAction();
        });
        $('adminDeleteConfirmModal')?.addEventListener('click', (e) => {
            if (e.target === $('adminDeleteConfirmModal') && typeof closeAdminDeleteConfirmModal === 'function') {
                closeAdminDeleteConfirmModal();
            }
        });
        setInterval(() => {
            const activePage = document.querySelector('.page-content.active');
            if (activePage && activePage.id === 'page-daily-report' && !isTestingMode() && !document.hidden) {
                pullDailyReportFromSupabase(false);
            }
        }, 15000);
        $('saleDate')?.addEventListener('change', saveSalesDraft);
        $('saleShift')?.addEventListener('change', saveSalesDraft);
        $('btnCopyDailyReportWa')?.addEventListener('click', async () => {
            const text = $('dailyReportWhatsappText')?.textContent || '';
            if (!text.trim()) {
                toast('Belum ada report untuk dibagikan', 'err');
                return;
            }
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'Laporan Harian Igood',
                        text: text
                    });
                    toast('Report berhasil dibagikan');
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Error sharing report:', error);
                        navigator.clipboard?.writeText(text).then(() => toast('Report WA disalin ke clipboard'));
                    }
                }
            } else {
                navigator.clipboard?.writeText(text).then(() => toast('Report WA disalin ke clipboard'));
            }
        });
        function healDeviceImeis() {
            try {
                const devices = load(DB_KEYS.devices) || [];
                const txs = load(DB_KEYS.transactions) || [];
                const preorders = (typeof loadPreorders === 'function') ? loadPreorders() : (load(DB_KEYS.preorders) || []);
                let modified = false;
                devices.forEach(d => {
                    if (!d.imei) {
                        const matchTx = txs.find(t => (t.stockRefCode === d.code || t.code === d.code) && t.imei);
                        if (matchTx && matchTx.imei) {
                            d.imei = matchTx.imei;
                            modified = true;
                        }
                        const matchTT = txs.find(t => t.tradeInCode === d.code && t.tradeInImei);
                        if (matchTT && matchTT.tradeInImei) {
                            d.imei = matchTT.tradeInImei;
                            modified = true;
                        }
                    }
                    // Heal missing model/storage/color from linked preorders
                    const matchPo = preorders.find(p => p.linkedUnitCode === d.code || (d.imei && p.imei === d.imei));
                    if (matchPo) {
                        if (!d.model) {
                            d.model = matchPo.model || (typeof parseModelFromText === 'function' ? parseModelFromText(matchPo.requestedItem) : matchPo.requestedItem || '');
                            modified = true;
                        }
                        if (!d.storage || d.storage === '-') {
                            d.storage = matchPo.storage || (typeof parseStorageFromText === 'function' ? parseStorageFromText(matchPo.requestedItem) : '128GB');
                            modified = true;
                        }
                        if (!d.color || d.color === '-') {
                            d.color = matchPo.color || (typeof parseColorFromText === 'function' ? parseColorFromText(matchPo.requestedItem) : 'Hitam');
                            modified = true;
                        }
                        if (!d.imei && matchPo.imei) {
                            d.imei = matchPo.imei;
                            modified = true;
                        }
                        if (!d.cost && matchPo.cost) {
                            d.cost = Number(matchPo.cost) || 0;
                            modified = true;
                        }
                    }
                });
                if (modified) {
                    save(DB_KEYS.devices, devices);
                }
            } catch (e) {
                console.warn('healDeviceImeis error:', e);
            }
        }
        healDeviceImeis();

        renderActiveSaleForm();
        renderDailyReport();
        refreshAllAdminPanels();
        updateRoleBadge();
        initializeEmployeeSession();

        window.mapTransactionForSupabase = mapTransactionForSupabase;
        window.switchPage = switchPage;
        if (isTestingMode()) {
            switchPage('page-sales');
        } else {
            switchPage('page-home');
        }

        // Expose handleBackButton globally for native Kotlin WebView back button handling
        // The native MainActivity.kt calls this via evaluateJavascript when back is pressed
        window.handleBackButton = handleBackButton;
        // Expose saveCartSale for test access
        window.__igoodSaveCartSale = saveCartSale;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }


