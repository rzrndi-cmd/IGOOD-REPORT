/**
 * IGOOD REPORT - Admin Center & Management Module
 */

    function renderDeviceStock() {
        const tbody = $('deviceStockTableBody');
        if (!tbody) return;

        const allDevices = load(DB_KEYS.devices) || [];
        const readyUnits = allDevices.filter(d => d.status === 'Available');
        const readyCount = readyUnits.length;
        const readyCost = readyUnits.reduce((sum, d) => sum + (Number(d.cost) || 0), 0);

        const statReadyCountEl = $('statStockReadyCount');
        if (statReadyCountEl) statReadyCountEl.textContent = `${readyCount} Unit`;
        const statReadyCostEl = $('statStockReadyCost');
        if (statReadyCostEl) statReadyCostEl.textContent = fmtRp(readyCost);

        const search = ($('searchDeviceStock')?.value || '').toLowerCase();
        const filter = $('filterDeviceStatus')?.value || 'Available';
        let devices = allDevices;
        if (filter !== 'all') devices = devices.filter(d => d.status === filter);
        if (search) devices = devices.filter(d => `${d.code}${d.brand}${d.model}${d.color}${d.imei || ''}`.toLowerCase().includes(search));
        devices.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        if (!devices.length) {
            tbody.innerHTML = '<div class="empty-state-text text-dim" style="text-align:center; padding: 24px; background:#fff; border-radius: var(--r-sm); border:1px dashed var(--border);">Tidak ada unit yang cocok</div>';
            return;
        }
        tbody.innerHTML = devices.map(d => {
            const statusBadge = d.status === 'Available' ? '<span class="badge badge-ok">Ready</span>' : '<span class="badge badge-sold">Sold</span>';
            let typeBadge = '';
            if (d.acquisition === 'TT') {
                if (d.receiptCode) {
                    typeBadge = `<span class="badge badge-warn" style="cursor: pointer;" onclick="event.stopPropagation(); viewDeviceTradeInReceipt('${esc(d.receiptCode)}')" title="Klik untuk lihat struk Tukar Tambah">TT <i class="ri-eye-line" style="font-size: 10px;"></i></span>`;
                } else {
                    typeBadge = '<span class="badge badge-warn">TT</span>';
                }
            } else if (d.acquisition === 'KS') {
                typeBadge = '<span class="badge badge-purple">KS</span>';
            } else {
                typeBadge = '<span class="badge badge-info">PB</span>';
            }

            const condBadge = d.condition === 'New' ? '<span class="badge badge-ok">New</span>' : '<span class="badge badge-info">Bekas</span>';
            let warrantyBadge = '<span class="badge badge-warn">Inter</span>';
            if (d.warranty === 'IBX') {
                warrantyBadge = '<span class="badge badge-purple">Resmi</span>';
            } else if (d.warranty === 'BEA') {
                warrantyBadge = '<span class="badge badge-info">Beacukai</span>';
            }

            const deviceTitle = `${esc(d.brand || '')} ${esc(d.model || '')}`.trim() || 'Unit HP';

            return `
            <div class="stock-accordion-card" id="device-card-${esc(d.code)}">
                <div class="stock-card-header" onclick="toggleStockCard(this)">
                    <div class="stock-card-left">
                        <span class="stock-card-code">${esc(d.code)}</span>
                        <span class="stock-card-name" title="${deviceTitle}">${deviceTitle}</span>
                    </div>
                    <div class="stock-card-right">
                        ${statusBadge}
                        <i class="ri-arrow-down-s-line stock-expand-icon"></i>
                    </div>
                </div>
                <div class="stock-card-body">
                    <div class="stock-grid-details">
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Penyimpanan</span>
                            <span class="stock-detail-val font-bold">${esc(d.storage || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Warna</span>
                            <span class="stock-detail-val font-bold">${esc(d.color || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">IMEI</span>
                            <span class="stock-detail-val mono">${esc(d.imei || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Kondisi</span>
                            <span class="stock-detail-val">${condBadge}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Garansi</span>
                            <span class="stock-detail-val">${warrantyBadge}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Modal Rp</span>
                            <span class="stock-detail-val font-bold text-primary">${fmtRp(d.cost)}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Tgl Beli</span>
                            <span class="stock-detail-val">${fmtDate(d.purchaseDate)}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Tipe Masuk</span>
                            <span class="stock-detail-val">${typeBadge}</span>
                        </div>
                    </div>
                    <div class="stock-card-actions">
                        ${d.acquisition === 'TT' && d.receiptCode ? `
                        <button type="button" class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); viewDeviceTradeInReceipt('${esc(d.receiptCode)}')" title="Lihat Struk TT">
                            <i class="ri-file-text-line"></i> Struk TT
                        </button>` : ''}
                        <button type="button" class="btn btn-sm btn-ghost btn-edit" data-edit-device="${esc(d.code)}" onclick="event.stopPropagation(); editDevice('${esc(d.code)}')" title="Edit Unit">
                            <i class="ri-edit-2-line"></i> Edit Unit
                        </button>
                        <button type="button" class="btn btn-sm btn-danger-soft btn-del" onclick="event.stopPropagation(); deleteDevice('${esc(d.code)}')" title="Hapus Unit">
                            <i class="ri-delete-bin-6-line"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    window.toggleStockCard = function (el) {
        if (!el) return;
        const card = el.closest('.stock-accordion-card');
        if (card) {
            card.classList.toggle('expanded');
        }
    };

    window.viewDeviceTradeInReceipt = function(receiptCode) {
        const transactions = loadTransactions();
        const txRows = transactions.filter(tx => tx.receiptCode === receiptCode);
        if (txRows.length) {
            showTransactionReceipt(txRows, 'STRUK TRANSAKSI');
        } else {
            toast('Struk transaksi tidak ditemukan!', 'err');
        }
    };

    function showEditModal(type, data, onSave) {
        const modal = $('editModal');
        const titleEl = $('editModalTitle');
        const form = $('editForm');
        if (!modal || !form) return;

        // Clean event listeners by cloning the form
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);

        const fieldsContainer = newForm.querySelector('#editFormFields');
        if (!fieldsContainer) return;

        const modalBox = modal.querySelector('.modal-box');
        if (modalBox) {
            modalBox.style.maxWidth = type === 'device' ? '600px' : '440px';
        }

        let fieldsHtml = '';

        if (type === 'device') {
            titleEl.innerHTML = '<i class="ri-smartphone-line"></i> Edit Stok HP';
            fieldsHtml = `
                <!-- Section 1: Spesifikasi Unit -->
                <div class="form-section-block" style="margin-bottom: 12px;">
                    <div class="form-section-title" style="font-weight: 700; font-size: 13px; margin-bottom: 8px; color: var(--primary);"><i class="ri-smartphone-line"></i> Spesifikasi Unit</div>
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <div class="field">
                            <label>Kategori</label>
                            <select id="edit_category" required>
                                <option value="iphone" ${data.category === 'iphone' ? 'selected' : ''}>Unit iPhone</option>
                                <option value="android" ${data.category === 'android' ? 'selected' : ''}>Unit Android</option>
                                <option value="ipad" ${data.category === 'ipad' ? 'selected' : ''}>Unit iPad</option>
                            </select>
                        </div>
                        <div class="field">
                            <label>Kondisi</label>
                            <select id="edit_condition" required>
                                <option value="New" ${data.condition === 'New' ? 'selected' : ''}>New</option>
                                <option value="Bekas" ${data.condition === 'Bekas' ? 'selected' : ''}>Bekas</option>
                            </select>
                        </div>
                    </div>
                    <div class="field" id="edit_brandGroup" style="margin-bottom: 10px;">
                        <label>Brand</label>
                        <input type="text" id="edit_brand" value="${esc(data.brand || '')}" placeholder="Samsung / Xiaomi / dll">
                    </div>
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                        <div class="field">
                            <label>Tipe / Model</label>
                            <input type="text" id="edit_model" value="${esc(data.model)}" required>
                        </div>
                        <div class="field">
                            <label>Storage</label>
                            <select id="edit_storage" required>
                                <option value="128GB" ${data.storage === '128GB' ? 'selected' : ''}>128GB</option>
                                <option value="256GB" ${data.storage === '256GB' ? 'selected' : ''}>256GB</option>
                                <option value="64GB" ${data.storage === '64GB' ? 'selected' : ''}>64GB</option>
                                <option value="512GB" ${data.storage === '512GB' ? 'selected' : ''}>512GB</option>
                                <option value="1TB" ${data.storage === '1TB' ? 'selected' : ''}>1TB</option>
                                <option value="32GB" ${data.storage === '32GB' ? 'selected' : ''}>32GB</option>
                            </select>
                        </div>
                        <div class="field">
                            <label>Warna</label>
                            <input type="text" id="edit_color" value="${esc(data.color)}" required>
                        </div>
                    </div>
                </div>

                <!-- Section 2: Pembelian & Logistik -->
                <div class="form-section-block" style="margin-bottom: 12px;">
                    <div class="form-section-title" style="font-weight: 700; font-size: 13px; margin-bottom: 8px; color: var(--primary);"><i class="ri-hand-coin-line"></i> Pembelian & Logistik</div>
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <div class="field">
                            <label>Perolehan</label>
                            <select id="edit_acquisition" required>
                                <option value="PB" ${data.acquisition === 'PB' ? 'selected' : ''}>Pribadi (PB)</option>
                                <option value="KS" ${data.acquisition === 'KS' ? 'selected' : ''}>Konsinyasi (KS)</option>
                                <option value="TT" ${data.acquisition === 'TT' ? 'selected' : ''}>Tukar Tambah (TT)</option>
                            </select>
                        </div>
                        <div class="field">
                            <label>Garansi</label>
                            <select id="edit_warranty" required>
                                <option value="IBX" ${data.warranty === 'IBX' ? 'selected' : ''}>Resmi (R)</option>
                                <option value="INT" ${data.warranty === 'INT' ? 'selected' : ''}>Inter (I)</option>
                                <option value="BEA" ${data.warranty === 'BEA' ? 'selected' : ''}>Beacukai (BC)</option>
                            </select>
                        </div>
                        <div class="field" id="edit_consignmentShopGroup" style="display: none;">
                            <label>Supplier</label>
                            <input type="text" id="edit_supplier" value="${esc(data.supplier || '')}" placeholder="Nama Toko">
                        </div>
                    </div>
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                        <div class="field">
                            <label>Tgl Beli</label>
                            <input type="date" id="edit_purchaseDate" value="${esc(data.purchaseDate || '')}" required>
                        </div>
                        <div class="field">
                            <label>Modal Rp</label>
                            <input type="text" id="edit_cost" value="${fmtRp(data.cost)}" required>
                        </div>
                        <div class="field">
                            <label>Status</label>
                            <select id="edit_status" required>
                                <option value="Available" ${data.status === 'Available' ? 'selected' : ''}>Ready</option>
                                <option value="Sold" ${data.status === 'Sold' ? 'selected' : ''}>Terjual</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Section 3: Identitas Unik -->
                <div class="form-section-block">
                    <div class="form-section-title" style="font-weight: 700; font-size: 13px; margin-bottom: 8px; color: var(--primary);"><i class="ri-key-line"></i> Identitas Unik</div>
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div class="field">
                            <label>Custom Code</label>
                            <input type="text" id="edit_code" value="${esc(data.code)}" readonly placeholder="Auto-generate dari IMEI">
                        </div>
                        <div class="field">
                            <label>IMEI</label>
                            <input type="text" id="edit_imei" value="${esc(data.imei || '')}" placeholder="Ketik IMEI unit">
                        </div>
                    </div>
                </div>
            `;
        } else if (type === 'accessory') {
            titleEl.innerHTML = '<i class="ri-plug-line"></i> Edit Stok Aksesoris';
            fieldsHtml = `
                <div class="field-row-code" style="display: flex; gap: 8px; align-items: flex-end;">
                    <div class="field" style="flex: 1;">
                        <label>Kode Aksesoris</label>
                        <input type="text" id="edit_code" value="${esc(data.code)}" required>
                    </div>
                    <button type="button" id="btnEditRegenerateCode" class="btn btn-sm btn-ghost btn-generate" style="padding: 10px 12px; font-size: 11px; font-weight: 700; height: 38px; display: inline-flex; align-items: center; gap: 4px; margin-bottom: 0; border: 1px solid var(--border); border-radius: var(--r); cursor: pointer;"><i class="ri-refresh-line"></i> Generate</button>
                </div>
                <div class="form-grid">
                    <div class="field">
                        <label>Kategori</label>
                        <select id="edit_category">
                            <option value="A" ${data.category === 'A' ? 'selected' : ''}>A - Adaptor</option>
                            <option value="K" ${data.category === 'K' ? 'selected' : ''}>K - Kabel</option>
                            <option value="C" ${data.category === 'C' ? 'selected' : ''}>C - Case</option>
                            <option value="T" ${data.category === 'T' ? 'selected' : ''}>T - Tempered</option>
                            <option value="H" ${data.category === 'H' ? 'selected' : ''}>H - Handsfree</option>
                            <option value="L" ${data.category === 'L' ? 'selected' : ''}>L - Lainnya</option>
                        </select>
                    </div>
                    <div class="field">
                        <label>Brand</label>
                        <select id="edit_brand">
                            <option value="APL" ${data.brand === 'APL' ? 'selected' : ''}>Apple</option>
                            <option value="ANK" ${data.brand === 'ANK' ? 'selected' : ''}>Anker</option>
                            <option value="OEM" ${data.brand === 'OEM' ? 'selected' : ''}>OEM</option>
                            <option value="custom" ${data.brand === 'custom' ? 'selected' : ''}>Custom</option>
                        </select>
                    </div>
                </div>
                <div class="field">
                    <label>Nama Aksesoris</label>
                    <input type="text" id="edit_name" value="${esc(data.name)}" required>
                </div>
                <div class="field">
                    <label>Qty</label>
                    <input type="number" id="edit_qty" value="${data.qty}" min="0" required>
                </div>
                <div class="form-grid">
                    <div class="field">
                        <label>Modal Satuan Rp</label>
                        <input type="text" id="edit_cost" value="${fmtRp(data.cost)}" required>
                    </div>
                    <div class="field">
                        <label>Harga Jual Rp</label>
                        <input type="text" id="edit_sell" value="${fmtRp(data.sell)}" required>
                    </div>
                </div>
            `;
        } else if (type === 'service') {
            titleEl.innerHTML = '<i class="ri-tools-line"></i> Edit Katalog Service';
            fieldsHtml = `
                <div class="field-row-code" style="display: flex; gap: 8px; align-items: flex-end;">
                    <div class="field" style="flex: 1;">
                        <label>Kode Service</label>
                        <input type="text" id="edit_code" value="${esc(data.code)}" required>
                    </div>
                    <button type="button" id="btnEditRegenerateCode" class="btn btn-sm btn-ghost btn-generate" style="padding: 10px 12px; font-size: 11px; font-weight: 700; height: 38px; display: inline-flex; align-items: center; gap: 4px; margin-bottom: 0; border: 1px solid var(--border); border-radius: var(--r); cursor: pointer;"><i class="ri-refresh-line"></i> Generate</button>
                </div>
                <div class="field">
                    <label>Nama Layanan</label>
                    <input type="text" id="edit_name" value="${esc(data.name)}" required>
                </div>
                <div class="form-grid">
                    <div class="field">
                        <label>Modal/Fee Teknisi Rp</label>
                        <input type="text" id="edit_cost" value="${fmtRp(data.cost)}" required>
                    </div>
                    <div class="field">
                        <label>Harga Jual Rp</label>
                        <input type="text" id="edit_sell" value="${fmtRp(data.sell)}" required>
                    </div>
                </div>
            `;
        } else if (type === 'other') {
            titleEl.innerHTML = '<i class="ri-price-tag-3-line"></i> Edit Katalog Lain-lain';
            fieldsHtml = `
                <div class="field-row-code" style="display: flex; gap: 8px; align-items: flex-end;">
                    <div class="field" style="flex: 1;">
                        <label>Kode Item</label>
                        <input type="text" id="edit_code" value="${esc(data.code)}" required>
                    </div>
                    <button type="button" id="btnEditRegenerateCode" class="btn btn-sm btn-ghost btn-generate" style="padding: 10px 12px; font-size: 11px; font-weight: 700; height: 38px; display: inline-flex; align-items: center; gap: 4px; margin-bottom: 0; border: 1px solid var(--border); border-radius: var(--r); cursor: pointer;"><i class="ri-refresh-line"></i> Generate</button>
                </div>
                <div class="field">
                    <label>Nama Item</label>
                    <input type="text" id="edit_name" value="${esc(data.name)}" required>
                </div>
                <div class="field">
                    <label>Harga Jual Rp</label>
                    <input type="text" id="edit_sell" value="${fmtRp(data.sell)}" required>
                </div>
                <div class="field">
                    <label>Keterangan</label>
                    <input type="text" id="edit_note" value="${esc(data.note || '')}">
                </div>
            `;
        } else if (type === 'transaction') {
            const isJasa = data.category === 'order_jasa' || data.category === 'order_jasa_beacukai';
            titleEl.innerHTML = isJasa 
                ? (data.category === 'order_jasa_beacukai' ? '<i class="ri-bank-card-line"></i> Edit Bea Cukai' : '<i class="ri-tools-line"></i> Edit Order IMEI') 
                : '<i class="ri-history-line"></i> Edit Transaksi';
            
            if (isJasa) {
                let status = data.status || data.serviceStatus || 'Masuk';
                if (status === 'On-progress') status = 'On Progress';
                if (status === 'Done') status = 'Selesai';

                fieldsHtml = `
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <div class="field">
                            <label>Nama Pembeli *</label>
                            <input type="text" id="edit_buyerName" value="${esc(data.buyerName)}" required>
                        </div>
                        <div class="field">
                            <label>No. WA Pembeli</label>
                            <input type="text" id="edit_buyerWa" value="${esc(data.buyerWa || '')}">
                        </div>
                    </div>
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <div class="field">
                            <label>Kategori Unit</label>
                            <select id="edit_jasaCategory">
                                <option value="iphone" ${data.jasaCategory === 'iphone' ? 'selected' : ''}>iPhone</option>
                                <option value="android" ${data.jasaCategory === 'android' ? 'selected' : ''}>Android</option>
                            </select>
                        </div>
                        <div class="field">
                            <label>Nama Unit HP *</label>
                            <input type="text" id="edit_jasaUnitName" value="${esc(data.jasaUnitName || '')}" required>
                        </div>
                    </div>
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <div class="field">
                            <label>Garansi</label>
                            <select id="edit_jasaWarranty">
                                <option value="Resmi" ${data.jasaWarranty === 'Resmi' ? 'selected' : ''}>Resmi</option>
                                <option value="Inter" ${data.jasaWarranty === 'Inter' ? 'selected' : ''}>Inter</option>
                                <option value="iBox" ${data.jasaWarranty === 'iBox' ? 'selected' : ''}>iBox</option>
                            </select>
                        </div>
                        <div class="field">
                            <label>IMEI *</label>
                            <input type="text" id="edit_jasaImei" value="${esc(data.jasaImei || data.imei || '')}" required>
                        </div>
                    </div>
                    <div class="field" style="margin-bottom: 10px;">
                        <label>Keterangan</label>
                        <textarea id="edit_jasaNote" style="width: 100%; border-radius: 8px; border: 1px solid var(--border-color); padding: 8px; background: var(--bg-card); color: var(--text-color);">${esc(data.jasaNote || '')}</textarea>
                    </div>
                    <div class="form-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <div class="field">
                            <label>Total Jual Rp *</label>
                            <input type="text" id="edit_sell" value="${fmtRp(data.sell)}" required>
                        </div>
                        <div class="field">
                            <label>Metode Bayar</label>
                            <select id="edit_paymentMethod">
                                <option value="cash" ${data.paymentMethod === 'cash' ? 'selected' : ''}>Cash</option>
                                <option value="transfer" ${data.paymentMethod === 'transfer' ? 'selected' : ''}>Transfer</option>
                                <option value="kredit" ${data.paymentMethod === 'kredit' ? 'selected' : ''}>Kredit</option>
                            </select>
                        </div>
                    </div>
                    <div class="field" style="margin-bottom: 10px;">
                        <label>Status Pesanan</label>
                        <select id="edit_jasaStatus">
                            <option value="Masuk" ${status === 'Masuk' ? 'selected' : ''}>Masuk</option>
                            <option value="On Progress" ${status === 'On Progress' ? 'selected' : ''}>On Progress</option>
                            <option value="Selesai" ${status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                        </select>
                    </div>
                    <input type="hidden" id="edit_itemName" value="${esc(data.itemName)}">
                `;
            } else {
                fieldsHtml = `
                    <div class="field">
                        <label>Nama Pembeli</label>
                        <input type="text" id="edit_buyerName" value="${esc(data.buyerName)}" required>
                    </div>
                    <div class="field">
                        <label>No. WA Pembeli</label>
                        <input type="text" id="edit_buyerWa" value="${esc(data.buyerWa || '')}">
                    </div>
                    <div class="field">
                        <label>Nama Item</label>
                        <input type="text" id="edit_itemName" value="${esc(data.itemName)}" required>
                    </div>
                    <div class="form-grid">
                        <div class="field">
                            <label>Total Jual Rp</label>
                            <input type="text" id="edit_sell" value="${fmtRp(data.sell)}" required>
                        </div>
                        <div class="field">
                            <label>Metode Bayar</label>
                            <select id="edit_paymentMethod">
                                <option value="cash" ${data.paymentMethod === 'cash' ? 'selected' : ''}>Cash</option>
                                <option value="transfer" ${data.paymentMethod === 'transfer' ? 'selected' : ''}>Transfer</option>
                                <option value="kredit" ${data.paymentMethod === 'kredit' ? 'selected' : ''}>Kredit</option>
                            </select>
                        </div>
                    </div>
                `;
            }
        }

        fieldsContainer.innerHTML = fieldsHtml;

        if (type === 'device') {
            const updateEditCategoryUI = () => {
                const cat = $('edit_category')?.value || 'iphone';
                const brandGroup = $('edit_brandGroup');
                const modelInput = $('edit_model');
                if (cat === 'iphone' || cat === 'ipad') {
                    if (brandGroup) brandGroup.style.display = 'none';
                    if ($('edit_brand')) $('edit_brand').value = 'Apple';
                    if (modelInput) modelInput.setAttribute('list', 'iphoneModelsList');
                } else {
                    if (brandGroup) brandGroup.style.display = '';
                    if ($('edit_brand') && $('edit_brand').value === 'Apple') $('edit_brand').value = '';
                    if (modelInput) {
                        modelInput.removeAttribute('list');
                        modelInput.placeholder = 'Contoh: Samsung S24 Ultra';
                    }
                }
            };

            const updateEditAutoGeneratedCode = () => {
                const category = $('edit_category')?.value || 'iphone';
                const imei = $('edit_imei')?.value || '';
                const condition = $('edit_condition')?.value || 'Bekas';
                const codeEl = $('edit_code');
                if (codeEl) {
                    const cleanImei = imei.trim();
                    if (cleanImei) {
                        codeEl.value = generateDeviceCode(category, cleanImei, $('edit_warranty')?.value || 'IBX', condition);
                    } else {
                        codeEl.value = '';
                    }
                }
            };

            const updateEditAcquisitionUI = () => {
                const acq = $('edit_acquisition')?.value || 'PB';
                const shopGroup = $('edit_consignmentShopGroup');
                if (shopGroup) {
                    shopGroup.style.display = acq === 'KS' ? '' : 'none';
                }
            };

            $('edit_imei')?.addEventListener('input', updateEditAutoGeneratedCode);
            $('edit_warranty')?.addEventListener('change', updateEditAutoGeneratedCode);
            $('edit_condition')?.addEventListener('change', updateEditAutoGeneratedCode);
            $('edit_category')?.addEventListener('change', () => {
                updateEditCategoryUI();
                updateEditAutoGeneratedCode();
            });
            $('edit_acquisition')?.addEventListener('change', updateEditAcquisitionUI);

            // Run initial setup
            updateEditCategoryUI();
            updateEditAutoGeneratedCode();
            updateEditAcquisitionUI();
        }

        // Bind formatters for currency inputs
        ['edit_cost', 'edit_sell'].forEach(id => {
            const el = $(id);
            if (el) {
                el.value = formatRupiahInput(el.value);
                el.addEventListener('input', function() {
                    this.value = formatRupiahInput(this.value);
                });
            }
        });

        function formatRupiahInput(val) {
            const num = cleanRp(val);
            return num ? fmtRp(num) : '';
        }

        // Bind code regeneration
        const btnRegen = $('btnEditRegenerateCode');
        if (btnRegen) {
            btnRegen.addEventListener('click', () => {
                const codeInput = $('edit_code');
                if (!codeInput) return;

                if (type === 'device') {
                    const storage = $('edit_storage')?.value || '128GB';
                    const color = $('edit_color')?.value || '';
                    const warranty = $('edit_warranty')?.value || 'IBX';
                    const newCode = nextDeviceCode(warranty, storage, color, data.category);
                    codeInput.value = newCode;
                } else if (type === 'accessory') {
                    const category = $('edit_category')?.value || 'A';
                    const newCode = nextAccCode(category);
                    codeInput.value = newCode;
                } else if (type === 'service') {
                    codeInput.value = nextServiceCode();
                } else if (type === 'other') {
                    codeInput.value = nextOtherCode();
                }
            });
        }

        modal.classList.add('open');

        const closeModal = () => {
            modal.classList.remove('open');
        };

        const cancelBtn = newForm.querySelector('#btnCancelEdit');
        const cancelCross = newForm.querySelector('#btnCancelEditCross');
        
        cancelBtn?.addEventListener('click', closeModal);
        cancelCross?.addEventListener('click', closeModal);

        newForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const payload = {};
            if (type === 'device') {
                payload.code = $('edit_code')?.value.trim();
                payload.category = $('edit_category')?.value;
                payload.brand = ($('edit_brand')?.value || (payload.category === 'iphone' ? 'Apple' : '')).trim();
                payload.model = $('edit_model')?.value.trim();
                payload.storage = $('edit_storage')?.value;
                payload.color = $('edit_color')?.value.trim();
                payload.condition = $('edit_condition')?.value;
                payload.status = $('edit_status')?.value;
                payload.cost = cleanRp($('edit_cost')?.value);
                payload.imei = $('edit_imei')?.value.trim();
                payload.warranty = $('edit_warranty')?.value;
                payload.acquisition = $('edit_acquisition')?.value;
                payload.supplier = $('edit_supplier')?.value.trim();
                payload.purchaseDate = $('edit_purchaseDate')?.value;

                if (!payload.model || !payload.color || !payload.cost || !payload.imei) {
                    toast('Lengkapi semua field termasuk IMEI!', 'err');
                    return;
                }
            } else if (type === 'accessory') {
                payload.code = $('edit_code')?.value.trim();
                payload.name = $('edit_name')?.value.trim();
                payload.qty = Number($('edit_qty')?.value) || 0;
                payload.cost = cleanRp($('edit_cost')?.value);
                payload.sell = cleanRp($('edit_sell')?.value);
                payload.category = $('edit_category')?.value;
                payload.brand = $('edit_brand')?.value;

                if (!payload.name || !payload.cost || !payload.sell) {
                    toast('Lengkapi data!', 'err');
                    return;
                }
            } else if (type === 'service') {
                payload.code = $('edit_code')?.value.trim();
                payload.name = $('edit_name')?.value.trim();
                payload.cost = cleanRp($('edit_cost')?.value);
                payload.sell = cleanRp($('edit_sell')?.value);

                if (!payload.name || !payload.sell) {
                    toast('Lengkapi data!', 'err');
                    return;
                }
            } else if (type === 'other') {
                payload.code = $('edit_code')?.value.trim();
                payload.name = $('edit_name')?.value.trim();
                payload.sell = cleanRp($('edit_sell')?.value);
                payload.note = $('edit_note')?.value.trim() || '';

                if (!payload.name || !payload.sell) {
                    toast('Lengkapi data!', 'err');
                    return;
                }
            } else if (type === 'transaction') {
                payload.buyerName = $('edit_buyerName')?.value.trim();
                payload.buyerWa = $('edit_buyerWa')?.value.trim();
                payload.itemName = $('edit_itemName')?.value.trim();
                payload.sell = cleanRp($('edit_sell')?.value);
                payload.paymentMethod = $('edit_paymentMethod')?.value;

                const isJasa = data.category === 'order_jasa' || data.category === 'order_jasa_beacukai';
                if (isJasa) {
                    payload.jasaCategory = $('edit_jasaCategory')?.value;
                    payload.jasaUnitName = $('edit_jasaUnitName')?.value.trim();
                    payload.jasaWarranty = $('edit_jasaWarranty')?.value;
                    payload.jasaImei = $('edit_jasaImei')?.value.trim();
                    payload.jasaNote = $('edit_jasaNote')?.value.trim();
                    payload.status = $('edit_jasaStatus')?.value;
                    payload.serviceStatus = payload.status;
                    payload.imei = payload.jasaImei;

                    const last4 = payload.jasaImei.slice(-4);
                    if (data.category === 'order_jasa_beacukai') {
                        payload.code = `BC-${last4}`;
                        payload.itemName = `IMEI Bea Cukai - ${payload.jasaUnitName} (${payload.jasaWarranty}) - ${payload.jasaImei}`;
                    } else {
                        payload.code = `OI-${last4}`;
                        payload.itemName = `Order Jasa IMEI - ${payload.jasaUnitName} (${payload.jasaWarranty}) - ${payload.jasaImei}`;
                    }
                }

                if (!payload.buyerName || !payload.itemName || !payload.sell) {
                    toast('Lengkapi data!', 'err');
                    return;
                }
            }

            const success = onSave(payload);
            if (success !== false) {
                closeModal();
            }
        });
    }

    window.editDevice = function (code) {
        const devices = load(DB_KEYS.devices);
        const device = devices.find(d => d.code === code);
        if (!device) return;

        if (window.navigator.webdriver || window.__playwright_active__) {
            const model = promptText('Model unit', device.model || '');
            if (model == null) return;
            const storage = promptText('Storage', device.storage || '');
            if (storage == null) return;
            const color = promptText('Warna', device.color || '');
            if (color == null) return;
            const condition = promptText('Kondisi', device.condition || 'Bekas');
            if (condition == null) return;
            const cost = promptText('Modal Rp', device.cost || 0);
            if (cost == null) return;
            const status = promptText('Status', device.status || 'Available');
            if (status == null) return;
            const imei = promptText('IMEI', device.imei || '');
            if (imei == null) return;

            const oldCode = device.code;
            const newCode = generateDeviceCode(device.category, imei.trim(), device.warranty || 'IBX');

            const tempDevice = {
                ...device,
                code: newCode,
                model,
                storage,
                color,
                condition,
                cost: cleanRp(cost) || Number(cost) || 0,
                status,
                imei: imei.trim(),
                updatedAt: new Date().toISOString()
            };
            if (oldCode !== tempDevice.code) {
                queueRecordSupabaseDelete('devices', 'code', oldCode);
            }
            Object.assign(device, tempDevice);
            save(DB_KEYS.devices, devices);
            queueRecordSupabaseSync('devices', tempDevice);
            renderDeviceStock();
            renderActiveSaleForm();
            toast(`Unit ${device.code} diedit`);
            return;
        }

        showEditModal('device', device, (updatedData) => {
            const oldCode = device.code;
            if (updatedData.code !== oldCode) {
                if (devices.some(d => d.code === updatedData.code)) {
                    toast('Kode unit sudah ada!', 'err');
                    return false;
                }
            }
            const tempDevice = {
                ...device,
                code: updatedData.code,
                category: updatedData.category,
                brand: updatedData.brand,
                model: updatedData.model,
                storage: updatedData.storage,
                color: updatedData.color,
                condition: updatedData.condition,
                cost: cleanRp(updatedData.cost) || Number(updatedData.cost) || 0,
                status: updatedData.status,
                imei: updatedData.imei.trim(),
                warranty: updatedData.warranty,
                acquisition: updatedData.acquisition,
                supplier: updatedData.supplier,
                purchaseDate: updatedData.purchaseDate,
                updatedAt: new Date().toISOString()
            };

            if (oldCode !== tempDevice.code) {
                queueRecordSupabaseDelete('devices', 'code', oldCode);
            }
            Object.assign(device, tempDevice);
            save(DB_KEYS.devices, devices);
            queueRecordSupabaseSync('devices', tempDevice);
            renderDeviceStock();
            renderActiveSaleForm();
            toast(`Unit ${device.code} diedit`);
            return true;
        });
    };

    let pendingAdminDeleteAction = null;

    window.showAdminDeleteConfirmModal = function ({ title, desc, detailsHtml, onConfirm }) {
        pendingAdminDeleteAction = onConfirm;
        const modal = $('adminDeleteConfirmModal');
        if ($('adminDeleteModalTitle')) $('adminDeleteModalTitle').textContent = title || 'Hapus Data?';
        if ($('adminDeleteModalDesc')) $('adminDeleteModalDesc').textContent = desc || 'Data ini akan dihapus permanen dari inventaris toko dan database server.';
        if ($('adminDeleteModalDetails')) $('adminDeleteModalDetails').innerHTML = detailsHtml || '';
        if (modal) {
            modal.classList.add('open');
        } else {
            if (confirm(title || 'Hapus data?')) {
                if (typeof onConfirm === 'function') onConfirm();
            }
        }
    };

    window.closeAdminDeleteConfirmModal = function () {
        const modal = $('adminDeleteConfirmModal');
        if (modal) modal.classList.remove('open');
        pendingAdminDeleteAction = null;
    };

    window.executeAdminDeleteAction = function () {
        if (typeof pendingAdminDeleteAction === 'function') {
            const action = pendingAdminDeleteAction;
            closeAdminDeleteConfirmModal();
            action();
        } else {
            closeAdminDeleteConfirmModal();
        }
    };

    window.deleteDevice = function (code) {
        const targetCode = String(code || '').trim();
        if (!targetCode) return;
        const devices = load(DB_KEYS.devices) || [];
        const unit = devices.find(d => d.code === targetCode);

        showAdminDeleteConfirmModal({
            title: 'Hapus Unit HP?',
            desc: 'Unit ini akan dihapus permanen dari stok HP dan server database.',
            detailsHtml: unit ? `
                <div style="font-weight: 700; color: var(--text); margin-bottom: 6px; font-size: 13px;">${esc(unit.brand)} ${esc(unit.model)} ${esc(unit.storage ? `(${unit.storage})` : '')}</div>
                <div style="color: var(--text-dim); display: grid; grid-template-columns: auto 1fr; gap: 3px 8px;">
                    <span>Kode Unit:</span> <span class="mono" style="font-weight: 700; color: var(--primary);">${esc(unit.code)}</span>
                    <span>Warna:</span> <span>${esc(unit.color || '-')}</span>
                    <span>Kondisi:</span> <span>${esc(unit.condition || '-')}</span>
                    <span>Modal:</span> <strong>${fmtRp(unit.cost)}</strong>
                    <span>Status:</span> <span>${esc(unit.status || 'Available')}</span>
                </div>
            ` : `<div>Kode Unit: <strong>${esc(targetCode)}</strong></div>`,
            onConfirm: () => {
                // Clean from pendingPushQueue
                const pendingQueue = load(DB_KEYS.pendingPushQueue) || [];
                save(DB_KEYS.pendingPushQueue, pendingQueue.filter(q => !(q.tableKey === 'devices' && String(q.idValue) === targetCode)));
                // Queue delete to Supabase
                queueRecordSupabaseDelete('devices', 'code', targetCode);
                // Save to localStorage
                const updated = (load(DB_KEYS.devices) || []).filter(d => d.code !== targetCode);
                save(DB_KEYS.devices, updated);
                renderDeviceStock();
                if (typeof renderActiveSaleForm === 'function') renderActiveSaleForm();
                if (typeof refreshDashboard === 'function') refreshDashboard();
                toast('Unit berhasil dihapus', 'ok');
            }
        });
    };

    function renderAccStock() {
        const tbody = $('accStockTableBody');
        if (!tbody) return;
        const search = ($('searchAccStock')?.value || '').toLowerCase();
        const filter = $('filterAccStatus')?.value || 'available';
        let accs = load(DB_KEYS.accessories);
        if (filter === 'available') accs = accs.filter(a => a.qty > 5);
        else if (filter === 'low') accs = accs.filter(a => a.qty > 0 && a.qty <= 5);
        else if (filter === 'empty') accs = accs.filter(a => a.qty <= 0);
        if (search) accs = accs.filter(a => `${a.code}${a.name}${a.brand}`.toLowerCase().includes(search));
        if (!accs.length) {
            tbody.innerHTML = '<div class="empty-state-text text-dim" style="text-align:center; padding: 24px; background:#fff; border-radius: var(--r-sm); border:1px dashed var(--border);">Tidak ada data aksesoris</div>';
            return;
        }
        tbody.innerHTML = accs.map(a => {
            const statusBadge = a.qty <= 0 ? '<span class="badge badge-sold">Kosong</span>' : a.qty <= 5 ? '<span class="badge badge-warn">Low</span>' : '<span class="badge badge-ok">OK</span>';
            const accFullName = `${esc(a.name)} ${a.brand ? `(${esc(a.brand)})` : ''}`.trim();

            return `
            <div class="stock-accordion-card" id="acc-card-${esc(a.code)}">
                <div class="stock-card-header" onclick="toggleStockCard(this)">
                    <div class="stock-card-left">
                        <span class="stock-card-code">${esc(a.code)}</span>
                        <span class="stock-card-name" title="${accFullName}">${accFullName}</span>
                    </div>
                    <div class="stock-card-right">
                        <span class="stock-qty-chip font-bold text-xs" style="color: var(--text-2); background: var(--bg-dim); padding: 2px 7px; border-radius: 4px;">Qty: ${a.qty}</span>
                        ${statusBadge}
                        <i class="ri-arrow-down-s-line stock-expand-icon"></i>
                    </div>
                </div>
                <div class="stock-card-body">
                    <div class="stock-grid-details">
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Kategori</span>
                            <span class="stock-detail-val">${esc(a.category || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Brand</span>
                            <span class="stock-detail-val">${esc(a.brand || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Stok Tersedia</span>
                            <span class="stock-detail-val font-bold">${a.qty} pcs</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Modal Satuan</span>
                            <span class="stock-detail-val font-bold">${fmtRp(a.cost)}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Harga Jual</span>
                            <span class="stock-detail-val font-bold text-success">${fmtRp(a.sell)}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Total Nilai Modal</span>
                            <span class="stock-detail-val font-bold text-primary">${fmtRp((Number(a.qty) || 0) * (Number(a.cost) || 0))}</span>
                        </div>
                    </div>
                    <div class="stock-card-actions">
                        <button type="button" class="btn btn-sm btn-ghost btn-edit" data-edit-acc="${esc(a.code)}" onclick="event.stopPropagation(); editAcc('${esc(a.code)}')" title="Edit Aksesoris">
                            <i class="ri-edit-2-line"></i> Edit
                        </button>
                        <button type="button" class="btn btn-sm btn-danger-soft btn-del" onclick="event.stopPropagation(); deleteAcc('${esc(a.code)}')" title="Hapus Aksesoris">
                            <i class="ri-delete-bin-6-line"></i>
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    window.editAcc = function (code) {
        const accs = load(DB_KEYS.accessories);
        const acc = accs.find(a => a.code === code);
        if (!acc) return;

        if (window.navigator.webdriver || window.__playwright_active__) {
            const name = promptText('Nama aksesoris', acc.name || '');
            if (name == null) return;
            const qty = promptText('Qty', acc.qty || 0);
            if (qty == null) return;
            const cost = promptText('Modal satuan Rp', acc.cost || 0);
            if (cost == null) return;
            const sell = promptText('Harga jual Rp', acc.sell || 0);
            if (sell == null) return;
            const tempAcc = {
                ...acc,
                name,
                qty: Number(qty) || 0,
                cost: cleanRp(cost) || Number(cost) || 0,
                totalCost: (Number(qty) || 0) * (cleanRp(cost) || Number(cost) || 0),
                sell: cleanRp(sell) || Number(sell) || 0,
                updatedAt: new Date().toISOString()
            };
            Object.assign(acc, tempAcc);
            save(DB_KEYS.accessories, accs);
            queueRecordSupabaseSync('accessories', tempAcc);
            renderAccStock();
            renderActiveSaleForm();
            toast(`Aksesoris ${code} diedit`);
            return;
        }

        showEditModal('accessory', acc, (updatedData) => {
            if (updatedData.code !== acc.code) {
                if (accs.some(a => a.code === updatedData.code)) {
                    toast('Kode aksesoris sudah ada!', 'err');
                    return false;
                }
            }
            const tempAcc = {
                ...acc,
                code: updatedData.code,
                category: updatedData.category,
                brand: updatedData.brand,
                name: updatedData.name,
                qty: Number(updatedData.qty) || 0,
                cost: cleanRp(updatedData.cost) || Number(updatedData.cost) || 0,
                totalCost: (Number(updatedData.qty) || 0) * (cleanRp(updatedData.cost) || Number(updatedData.cost) || 0),
                sell: cleanRp(updatedData.sell) || Number(updatedData.sell) || 0,
                updatedAt: new Date().toISOString()
            };

            if (acc.code !== tempAcc.code) {
                queueRecordSupabaseDelete('accessories', 'code', acc.code);
            }
            Object.assign(acc, tempAcc);
            save(DB_KEYS.accessories, accs);
            queueRecordSupabaseSync('accessories', tempAcc);
            renderAccStock();
            renderActiveSaleForm();
            toast(`Aksesoris ${acc.code} diedit`);
            return true;
        });
    };

    window.deleteAcc = function (code) {
        const targetCode = String(code || '').trim();
        if (!targetCode) return;
        const accs = load(DB_KEYS.accessories) || [];
        const acc = accs.find(a => a.code === targetCode);

        showAdminDeleteConfirmModal({
            title: 'Hapus Aksesoris?',
            desc: 'Aksesoris ini akan dihapus permanen dari stok dan database server.',
            detailsHtml: acc ? `
                <div style="font-weight: 700; color: var(--text); margin-bottom: 6px; font-size: 13px;">${esc(acc.name)} ${esc(acc.brand ? `(${acc.brand})` : '')}</div>
                <div style="color: var(--text-dim); display: grid; grid-template-columns: auto 1fr; gap: 3px 8px;">
                    <span>Kode:</span> <span class="mono" style="font-weight: 700; color: var(--primary);">${esc(acc.code)}</span>
                    <span>Kategori:</span> <span>${esc(acc.category || '-')}</span>
                    <span>Sisa Qty:</span> <strong>${acc.qty} pcs</strong>
                    <span>Harga Jual:</span> <strong>${fmtRp(acc.sell)}</strong>
                </div>
            ` : `<div>Kode: <strong>${esc(targetCode)}</strong></div>`,
            onConfirm: () => {
                const pendingQueue = load(DB_KEYS.pendingPushQueue) || [];
                save(DB_KEYS.pendingPushQueue, pendingQueue.filter(q => !(q.tableKey === 'accessories' && String(q.idValue) === targetCode)));
                queueRecordSupabaseDelete('accessories', 'code', targetCode);
                const updated = (load(DB_KEYS.accessories) || []).filter(a => a.code !== targetCode);
                save(DB_KEYS.accessories, updated);
                renderAccStock();
                if (typeof renderActiveSaleForm === 'function') renderActiveSaleForm();
                toast('Aksesoris berhasil dihapus', 'ok');
            }
        });
    };
    window.deleteAccessory = window.deleteAcc;

    function updateAccessoryCostFields(source = 'unit') {
        const qty = Math.max(1, Number($('stockAccQty')?.value) || 1);
        const mode = $('stockAccCostMode')?.value || 'unit';
        const unitInput = $('stockAccCost');
        const totalInput = $('stockAccTotalCost');
        if (!unitInput || !totalInput) return;

        if (source === 'total' || mode === 'total') {
            const total = cleanRp(totalInput.value);
            if (total > 0) setRpValue('stockAccCost', Math.round(total / qty));
            return;
        }

        const unit = cleanRp(unitInput.value);
        if (unit > 0) setRpValue('stockAccTotalCost', unit * qty);
    }

    function renderTechnicians() {
        const container = $('techniciansTableBody');
        if (!container) return;
        const techs = load(DB_KEYS.technicians) || [];

        const badgeCount = $('statTechniciansCount');
        if (badgeCount) badgeCount.textContent = `${techs.length} Teknisi`;

        if (!techs.length) {
            container.innerHTML = `
                <div class="empty-state-text text-dim" style="text-align: center; padding: 24px 16px; background: var(--bg-surface, #fff); border-radius: 10px; border: 1px dashed var(--border); display: flex; flex-direction: column; align-items: center; gap: 6px;">
                    <i class="ri-user-unfollow-line" style="font-size: 22px; color: var(--text-dim);"></i>
                    <span style="font-size: 12.5px; font-weight: 500;">Belum ada data teknisi</span>
                </div>`;
            return;
        }

        container.innerHTML = techs.map(t => {
            const initial = (t.name || 'T').charAt(0).toUpperCase();
            return `
                <div class="flex-between" style="padding: 10px 14px; background: #ffffff; border: 1px solid var(--border); border-radius: 10px; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(37,99,235,0.08); color: var(--primary); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px;">
                            ${esc(initial)}
                        </div>
                        <div>
                            <div style="font-size: 13.5px; font-weight: 600; color: var(--text); line-height: 1.2;">${esc(t.name)}</div>
                            <span class="text-xxs text-dim" style="display: flex; align-items: center; gap: 4px; margin-top: 2px;"><i class="ri-shield-check-line text-success" style="font-size: 11px;"></i> Teknisi Aktif</span>
                        </div>
                    </div>
                    <div>
                        <button type="button" class="btn btn-sm btn-danger-soft btn-del" onclick="deleteTech('${esc(t.name)}')" title="Hapus Teknisi" style="width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 8px;">
                            <i class="ri-delete-bin-6-line" style="font-size: 14px;"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    window.deleteTech = function (name) {
        const targetName = String(name || '').trim();
        if (!targetName) return;

        showAdminDeleteConfirmModal({
            title: 'Hapus Teknisi?',
            desc: 'Data teknisi ini akan dihapus permanen dari daftar teknisi.',
            detailsHtml: `
                <div style="font-weight: 700; color: var(--text); margin-bottom: 4px; font-size: 13px;">Teknisi: ${esc(targetName)}</div>
            `,
            onConfirm: () => {
                const pendingQueue = load(DB_KEYS.pendingPushQueue) || [];
                save(DB_KEYS.pendingPushQueue, pendingQueue.filter(q => !(q.tableKey === 'technicians' && String(q.idValue) === targetName)));
                queueRecordSupabaseDelete('technicians', 'name', targetName);
                const updated = (load(DB_KEYS.technicians) || []).filter(t => t.name !== targetName);
                save(DB_KEYS.technicians, updated);
                renderTechnicians();
                if (typeof renderTechnicianSelects === 'function') renderTechnicianSelects();
                toast('Teknisi berhasil dihapus', 'ok');
            }
        });
    };
    window.deleteTechnician = window.deleteTech;

    function servicePaymentParts(amount, method) {
        return {
            splitCash: method === 'cash' ? amount : 0,
            splitTransfer: method === 'transfer' ? amount : 0,
            splitCredit: method === 'kredit' ? amount : 0,
        };
    }

    function serviceOrderItemName(order) {
        return `${order.itemName || ''}${order.complaint ? ` - ${order.complaint}` : ''}`.trim();
    }

    function removeServiceTransaction(order) {
        saveTransactions(loadTransactions().filter(tx => !(tx.serviceOrderCode === order.code || (tx.category === 'service' && tx.code === order.code))));
    }

    function upsertServiceTransaction(order) {
        const transactions = loadTransactions();
        const existing = transactions.find(tx => tx.serviceOrderCode === order.code || (tx.category === 'service' && tx.code === order.code));
        const paymentMethod = order.paymentMethod || 'cash';
        const parts = servicePaymentParts(Number(order.paidAmount) || 0, paymentMethod);
        const serviceStatus = order.status === 'Cancel' ? 'Cancel' : 'Keluar';
        const sparepartCost = Number(order.sparepartCost) || 0;
        const serviceFee = Number(order.serviceFee) || 0;
        const totalFee = (sparepartCost + serviceFee) || Number(order.technicianCost) || 0;
        const base = {
            date: order.paidDate || today(),
            shift: order.shift || 'shift pagi & malam',
            category: 'service',
            code: order.code,
            itemName: `${serviceStatus === 'Cancel' ? 'Cancel Service' : 'Service Keluar'} - ${serviceOrderItemName(order)}`.trim(),
            condition: '',
            buyerName: order.buyerName || '',
            buyerWa: order.buyerWa || '',
            quantity: 1,
            sell: Number(order.paidAmount) || 0,
            cost: sparepartCost,
            fee: totalFee,
            sparepartCost,
            serviceFee,
            paymentMethod,
            splitCash: parts.splitCash,
            splitTransfer: parts.splitTransfer,
            splitCredit: parts.splitCredit,
            stockRefCode: '',
            technician: order.technician || '',
            serviceOrderCode: order.code,
            serviceStatus,
            createdAt: existing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        if (existing) Object.assign(existing, base);
        else transactions.push({ id: newTransactionId(), ...base });
        saveTransactions(transactions);
        const tx = transactions.find(item => item.serviceOrderCode === order.code || (item.category === 'service' && item.code === order.code));
        if (tx) queueSaleSupabaseSync(tx);
    }

    function serviceOutcomeValuesFromSales() {
        return {
            code: $('saleServiceOrderCode')?.value || '',
            paidAmount: cleanRp($('saleServicePaymentAmount')?.value),
            paymentMethod: $('saleServicePaymentMethod')?.value || 'cash',
        };
    }

    function saveServiceOutcomeFromSales(shouldPrint = true) {
        const values = serviceOutcomeValuesFromSales();
        if (!values.code) {
            toast('Pilih kode service dahulu', 'err');
            return;
        }
        const orders = loadServiceOrders();
        const order = orders.find(item => item.code === values.code);
        if (!order) {
            toast('Kode service tidak ditemukan', 'err');
            return;
        }
        if (activeServiceSaleMode === 'keluar' && values.paidAmount <= 0) {
            toast('Nominal pembayaran service wajib diisi', 'err');
            return;
        }
        order.paymentMethod = values.paymentMethod;
        order.paidAmount = values.paidAmount;
        const parts = servicePaymentParts(values.paidAmount, order.paymentMethod);
        order.splitCash = parts.splitCash;
        order.splitTransfer = parts.splitTransfer;
        order.splitCredit = parts.splitCredit;
        if (activeServiceSaleMode === 'cancel') {
            order.status = 'Cancel';
            order.paymentStatus = values.paidAmount > 0 ? 'Dibayar' : 'Cancel tanpa biaya';
            order.cancelAmount = values.paidAmount;
            order.cancelDate = today();
            order.paidDate = values.paidAmount > 0 ? today() : '';
            if (values.paidAmount > 0) upsertServiceTransaction(order);
            else removeServiceTransaction(order);
        } else {
            order.status = 'Selesai';
            order.paymentStatus = 'Dibayar';
            order.paidDate = today();
            order.cancelAmount = 0;
            order.cancelDate = '';
            upsertServiceTransaction(order);
        }
        order.updatedAt = new Date().toISOString();
        saveServiceOrders(orders);
        queueRecordSupabaseSync('serviceOrders', order);
        const savedMode = activeServiceSaleMode;
        clearSalesDraft('service', savedMode);
        closeSalesItemModal();
        renderActiveSaleForm(true);
        renderReportsLog();
        renderDailyReport();
        refreshDashboard();
        refreshAllAdminPanels();
        toast(`${savedMode === 'cancel' ? 'Service cancel' : 'Service keluar'} ${values.code} disimpan`);
        if (shouldPrint) {
            showServiceReceipt(order, savedMode === 'cancel' ? 'STRUK SERVICE CANCEL' : 'STRUK SERVICE KELUAR');
        }
    }

    function renderServiceOrders() {
        const tbody = $('serviceOrdersTableBody');
        const thead = $('serviceOrdersTableHead');
        if (!tbody) return;
        document.querySelectorAll('.admin-tab[data-panel="admin-services"], .admin-sub-tab[data-panel="admin-services"]').forEach(t => {
            t.classList.toggle('active', t.dataset.sidebarServiceFilter === activeServiceOrderFilter);
        });
        const search = ($('searchAdminService')?.value || '').toLowerCase();
        const allOrders = loadServiceOrders().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        let orders = allOrders.filter(order => {
            if (activeServiceOrderFilter === 'keluar') return order.status === 'Selesai';
            if (activeServiceOrderFilter === 'cancel') return order.status === 'Cancel';
            return order.status !== 'Selesai' && order.status !== 'Cancel';
        });
        if (search) {
            orders = orders.filter(o => 
                `${o.code}${o.buyerName || ''}${o.buyerWa || ''}${o.itemName || ''}${o.complaint || ''}${o.technician || ''}`
                .toLowerCase().includes(search)
            );
        }
        const techs = load(DB_KEYS.technicians);

        if (activeServiceOrderFilter === 'keluar') {
            if (!orders.length) {
                tbody.innerHTML = `<div class="empty-state-text text-dim" style="text-align:center; padding: 24px; background:#fff; border-radius: var(--r-sm); border:1px dashed var(--border);">${search ? 'Tidak ada service cocok dengan pencarian' : 'Belum ada service keluar'}</div>`;
                return;
            }
            tbody.innerHTML = orders.map(order => {
                const partCost = Number(order.sparepartCost) || 0;
                const serviceFee = Number(order.serviceFee) || 0;
                const totalModal = (partCost + serviceFee) || Number(order.technicianCost) || 0;
                const title = `${esc(order.buyerName || 'Pelanggan')} — ${esc(order.itemName || 'Service')}`;
                const techOptions = ['<option value="">Pilih teknisi</option>', ...techs.map(t => `<option value="${esc(t.name)}" ${order.technician === t.name ? 'selected' : ''}>${esc(t.name)}</option>`)].join('');
                return `
                <div class="stock-accordion-card" id="service-card-${esc(order.code)}">
                    <div class="stock-card-header" onclick="toggleStockCard(this)">
                        <div class="stock-card-left">
                            <span class="stock-card-code">${esc(order.code)}</span>
                            <span class="stock-card-name" title="${title}">${title}</span>
                        </div>
                        <div class="stock-card-right">
                            <span class="badge badge-ok">Selesai</span>
                            <i class="ri-arrow-down-s-line stock-expand-icon"></i>
                        </div>
                    </div>
                    <div class="stock-card-body">
                        <div class="stock-grid-details">
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Tgl Selesai</span>
                                <span class="stock-detail-val">${esc(fmtDate(order.paidDate || order.processDate || order.dateIn))}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Nama Pelanggan</span>
                                <span class="stock-detail-val font-bold">${esc(order.buyerName || '-')}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">No. WA</span>
                                <span class="stock-detail-val mono">${esc(order.buyerWa || '-')}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Barang / Tipe</span>
                                <span class="stock-detail-val font-bold text-primary">${esc(order.itemName || '-')}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Keluhan</span>
                                <span class="stock-detail-val">${esc(order.complaint || '-')}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Teknisi</span>
                                <select id="serviceKeluarTech-${esc(order.code)}" class="text-sm" style="width:100%; padding:4px 6px; border-radius:6px; margin-top:2px;">
                                    ${techOptions}
                                </select>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Modal Sparepart</span>
                                <div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
                                    <span style="font-size:11px; font-weight:700; color:var(--text-dim);">Rp</span>
                                    <input type="text" inputmode="numeric" id="serviceKeluarPartCost-${esc(order.code)}" value="${partCost ? partCost.toLocaleString('id-ID') : ''}" placeholder="0" style="padding:4px 6px; font-size:12.5px; border-radius:6px; flex:1; width:100%;" oninput="updateServiceKeluarTotalCostLive('${esc(order.code)}')">
                                </div>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Modal Jasa / Fee</span>
                                <div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
                                    <span style="font-size:11px; font-weight:700; color:var(--text-dim);">Rp</span>
                                    <input type="text" inputmode="numeric" id="serviceKeluarServiceFee-${esc(order.code)}" value="${serviceFee ? serviceFee.toLocaleString('id-ID') : ''}" placeholder="0" style="padding:4px 6px; font-size:12.5px; border-radius:6px; flex:1; width:100%;" oninput="updateServiceKeluarTotalCostLive('${esc(order.code)}')">
                                </div>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Total Modal</span>
                                <span class="stock-detail-val mono font-bold text-primary" id="serviceKeluarTotalModal-${esc(order.code)}" style="margin-top:2px;">${totalModal ? fmtRp(totalModal) : 'Rp 0'}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Total Bayar</span>
                                <span class="stock-detail-val mono font-bold text-success">${order.paidAmount ? fmtRp(order.paidAmount) : '-'}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Metode Bayar</span>
                                <span class="stock-detail-val uppercase">${esc(order.paymentMethod || 'cash')}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Status Bayar</span>
                                <span class="stock-detail-val"><span class="badge badge-ok">${esc(order.paymentStatus || 'Dibayar')}</span></span>
                            </div>
                        </div>
                        <div class="stock-card-actions" style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
                            <button type="button" class="btn btn-sm btn-ghost text-danger" onclick="event.stopPropagation(); window.confirmDeleteServiceOrder('${esc(order.code)}')" title="Hapus Permanen Service">
                                <i class="ri-delete-bin-6-line"></i> Hapus
                            </button>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); window.confirmRestoreServiceOrder('${esc(order.code)}')" title="Kembalikan ke Service Masuk">
                                <i class="ri-restart-line"></i> Kembalikan ke Masuk
                            </button>
                            <button type="button" class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); showServiceReceiptByCode('${esc(order.code)}', 'STRUK SERVICE KELUAR')" title="Lihat Struk">
                                <i class="ri-file-text-line"></i> Struk Service
                            </button>
                            <button type="button" class="btn btn-sm btn-primary" onclick="event.stopPropagation(); saveServiceKeluarModalAdmin('${esc(order.code)}')" title="Simpan Perubahan Modal">
                                <i class="ri-save-line"></i> Simpan Modal
                            </button>
                        </div>
                    </div>
                </div>`;
            }).join('');

            orders.forEach(order => {
                bindRpFormatter(`serviceKeluarPartCost-${order.code}`);
                bindRpFormatter(`serviceKeluarServiceFee-${order.code}`);
            });
            return;
        }

        if (activeServiceOrderFilter === 'cancel') {
            if (!orders.length) {
                tbody.innerHTML = `<div class="empty-state-text text-dim" style="text-align:center; padding: 24px; background:#fff; border-radius: var(--r-sm); border:1px dashed var(--border);">${search ? 'Tidak ada service cocok dengan pencarian' : 'Belum ada service cancel'}</div>`;
                return;
            }
            tbody.innerHTML = orders.map(order => {
                const partCost = Number(order.sparepartCost) || 0;
                const serviceFee = Number(order.serviceFee) || 0;
                const totalModal = (partCost + serviceFee) || Number(order.technicianCost) || 0;
                const title = `${esc(order.buyerName || 'Pelanggan')} — ${esc(order.itemName || 'Service')}`;
                const techOptions = ['<option value="">Pilih teknisi</option>', ...techs.map(t => `<option value="${esc(t.name)}" ${order.technician === t.name ? 'selected' : ''}>${esc(t.name)}</option>`)].join('');
                return `
                <div class="stock-accordion-card" id="service-card-${esc(order.code)}">
                    <div class="stock-card-header" onclick="toggleStockCard(this)">
                        <div class="stock-card-left">
                            <span class="stock-card-code">${esc(order.code)}</span>
                            <span class="stock-card-name" title="${title}">${title}</span>
                        </div>
                        <div class="stock-card-right">
                            <span class="badge badge-danger">Cancel</span>
                            <i class="ri-arrow-down-s-line stock-expand-icon"></i>
                        </div>
                    </div>
                    <div class="stock-card-body">
                        <div class="stock-grid-details">
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Tgl Cancel</span>
                                <span class="stock-detail-val">${esc(fmtDate(order.cancelDate || order.dateIn))}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Nama Pelanggan</span>
                                <span class="stock-detail-val font-bold">${esc(order.buyerName || '-')}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">No. WA</span>
                                <span class="stock-detail-val mono">${esc(order.buyerWa || '-')}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Barang / Tipe</span>
                                <span class="stock-detail-val font-bold text-primary">${esc(order.itemName || '-')}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Keluhan</span>
                                <span class="stock-detail-val">${esc(order.complaint || '-')}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Teknisi</span>
                                <select id="serviceKeluarTech-${esc(order.code)}" class="text-sm" style="width:100%; padding:4px 6px; border-radius:6px; margin-top:2px;">
                                    ${techOptions}
                                </select>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Modal Sparepart</span>
                                <div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
                                    <span style="font-size:11px; font-weight:700; color:var(--text-dim);">Rp</span>
                                    <input type="text" inputmode="numeric" id="serviceKeluarPartCost-${esc(order.code)}" value="${partCost ? partCost.toLocaleString('id-ID') : ''}" placeholder="0" style="padding:4px 6px; font-size:12.5px; border-radius:6px; flex:1; width:100%;" oninput="updateServiceKeluarTotalCostLive('${esc(order.code)}')">
                                </div>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Modal Jasa / Fee</span>
                                <div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
                                    <span style="font-size:11px; font-weight:700; color:var(--text-dim);">Rp</span>
                                    <input type="text" inputmode="numeric" id="serviceKeluarServiceFee-${esc(order.code)}" value="${serviceFee ? serviceFee.toLocaleString('id-ID') : ''}" placeholder="0" style="padding:4px 6px; font-size:12.5px; border-radius:6px; flex:1; width:100%;" oninput="updateServiceKeluarTotalCostLive('${esc(order.code)}')">
                                </div>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Total Modal</span>
                                <span class="stock-detail-val mono font-bold text-primary" id="serviceKeluarTotalModal-${esc(order.code)}" style="margin-top:2px;">${totalModal ? fmtRp(totalModal) : 'Rp 0'}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Biaya Cek / Cancel</span>
                                <span class="stock-detail-val mono font-bold text-danger">${order.cancelAmount ? fmtRp(order.cancelAmount) : 'Rp 0 (Gratis)'}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Status</span>
                                <span class="stock-detail-val"><span class="badge badge-danger">Cancel</span></span>
                            </div>
                        </div>
                        <div class="stock-card-actions" style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
                            <button type="button" class="btn btn-sm btn-ghost text-danger" onclick="event.stopPropagation(); window.confirmDeleteServiceOrder('${esc(order.code)}')" title="Hapus Permanen Service">
                                <i class="ri-delete-bin-6-line"></i> Hapus
                            </button>
                            <button type="button" class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); window.confirmRestoreServiceOrder('${esc(order.code)}')" title="Kembalikan ke Service Masuk">
                                <i class="ri-restart-line"></i> Kembalikan ke Masuk
                            </button>
                            <button type="button" class="btn btn-sm btn-ghost" onclick="event.stopPropagation(); showServiceReceiptByCode('${esc(order.code)}', 'STRUK SERVICE CANCEL')" title="Lihat Struk">
                                <i class="ri-file-text-line"></i> Struk Cancel
                            </button>
                            <button type="button" class="btn btn-sm btn-primary" onclick="event.stopPropagation(); saveServiceKeluarModalAdmin('${esc(order.code)}')" title="Simpan Perubahan Modal">
                                <i class="ri-save-line"></i> Simpan Modal
                            </button>
                        </div>
                    </div>
                </div>`;
            }).join('');

            orders.forEach(order => {
                bindRpFormatter(`serviceKeluarPartCost-${order.code}`);
                bindRpFormatter(`serviceKeluarServiceFee-${order.code}`);
            });
            return;
        }

        // Service Masuk
        if (!orders.length) {
            tbody.innerHTML = `<div class="empty-state-text text-dim" style="text-align:center; padding: 24px; background:#fff; border-radius: var(--r-sm); border:1px dashed var(--border);">${search ? 'Tidak ada service cocok dengan pencarian' : 'Belum ada service masuk'}</div>`;
            return;
        }
        tbody.innerHTML = orders.map(order => {
            const techOptions = ['<option value="">Pilih teknisi</option>', ...techs.map(t => `<option value="${esc(t.name)}" ${order.technician === t.name ? 'selected' : ''}>${esc(t.name)}</option>`)].join('');
            const partCostVal = order.sparepartCost ? Number(order.sparepartCost).toLocaleString('id-ID') : '';
            const feeVal = order.serviceFee ? Number(order.serviceFee).toLocaleString('id-ID') : '';
            const totalModal = (Number(order.sparepartCost) || 0) + (Number(order.serviceFee) || 0) || Number(order.technicianCost) || 0;
            const title = `${esc(order.buyerName || 'Pelanggan')} — ${esc(order.itemName || 'Service')}`;
            const statusBadge = order.technician ? '<span class="badge badge-purple">Diproses</span>' : '<span class="badge badge-warn">Masuk</span>';
            return `
            <div class="stock-accordion-card" id="service-card-${esc(order.code)}">
                <div class="stock-card-header" onclick="toggleStockCard(this)">
                    <div class="stock-card-left">
                        <span class="stock-card-code">${esc(order.code)}</span>
                        <span class="stock-card-name" title="${title}">${title}</span>
                    </div>
                    <div class="stock-card-right">
                        ${statusBadge}
                        <i class="ri-arrow-down-s-line stock-expand-icon"></i>
                    </div>
                </div>
                <div class="stock-card-body">
                    <div class="stock-grid-details">
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Tgl Masuk</span>
                            <span class="stock-detail-val">${esc(fmtDate(order.dateIn))}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Nama Pelanggan</span>
                            <span class="stock-detail-val font-bold">${esc(order.buyerName || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">No. WA</span>
                            <span class="stock-detail-val mono">${esc(order.buyerWa || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Barang / Tipe</span>
                            <span class="stock-detail-val font-bold text-primary">${esc(order.itemName || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Keluhan</span>
                            <span class="stock-detail-val">${esc(order.complaint || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Pilih Teknisi</span>
                            <select id="serviceOrderTechnician-${esc(order.code)}" class="text-sm" style="width:100%; padding:6px; border-radius:6px; margin-top:2px;">
                                ${techOptions}
                            </select>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Modal Sparepart</span>
                            <div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
                                <span style="font-size:11px; font-weight:700; color:var(--text-dim);">Rp</span>
                                <input type="text" inputmode="numeric" id="serviceOrderSparepartCost-${esc(order.code)}" value="${partCostVal}" placeholder="Sparepart" style="padding:4px 6px; font-size:12.5px; border-radius:6px; flex:1; width:100%;" oninput="updateServiceOrderTotalCostLive('${esc(order.code)}')">
                            </div>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Biaya Jasa</span>
                            <div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
                                <span style="font-size:11px; font-weight:700; color:var(--text-dim);">Rp</span>
                                <input type="text" inputmode="numeric" id="serviceOrderServiceFee-${esc(order.code)}" value="${feeVal}" placeholder="Jasa" style="padding:4px 6px; font-size:12.5px; border-radius:6px; flex:1; width:100%;" oninput="updateServiceOrderTotalCostLive('${esc(order.code)}')">
                            </div>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Total Modal</span>
                            <span class="mono font-bold text-primary" id="serviceOrderTotalCost-${esc(order.code)}" style="margin-top:4px;">
                                ${fmtRp(totalModal)}
                            </span>
                        </div>
                    </div>
                    <div class="stock-card-actions" style="display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end;">
                        <button type="button" class="btn btn-sm btn-ghost text-danger" onclick="event.stopPropagation(); window.confirmDeleteServiceOrder('${esc(order.code)}')" title="Hapus Permanen Service">
                            <i class="ri-delete-bin-6-line"></i> Hapus
                        </button>
                        <button type="button" class="btn btn-sm btn-primary" data-service-action="save-cost" data-code="${esc(order.code)}" onclick="event.stopPropagation(); saveServiceOrderCost('${esc(order.code)}')">
                            <i class="ri-save-line"></i> Simpan Biaya
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');

        orders.forEach(order => {
            bindRpFormatter(`serviceOrderSparepartCost-${order.code}`);
            bindRpFormatter(`serviceOrderServiceFee-${order.code}`);
        });
    }

    window.updateServiceKeluarTotalCostLive = function (code) {
        const partCost = cleanRp($(`serviceKeluarPartCost-${code}`)?.value || '0');
        const serviceFee = cleanRp($(`serviceKeluarServiceFee-${code}`)?.value || '0');
        const total = partCost + serviceFee;
        const totalElem = $(`serviceKeluarTotalModal-${code}`);
        if (totalElem) totalElem.textContent = fmtRp(total);
    };

    window.saveServiceKeluarModalAdmin = function (code) {
        const orders = loadServiceOrders();
        const order = orders.find(o => o.code === code);
        if (!order) {
            toast('Nota service tidak ditemukan', 'err');
            return;
        }

        const partCost = cleanRp($(`serviceKeluarPartCost-${code}`)?.value || '0');
        const serviceFee = cleanRp($(`serviceKeluarServiceFee-${code}`)?.value || '0');
        const techVal = $(`serviceKeluarTech-${code}`)?.value || order.technician || '';
        const totalModal = partCost + serviceFee;

        order.sparepartCost = partCost;
        order.serviceFee = serviceFee;
        order.cost = partCost;
        order.technicianCost = totalModal;
        order.technician = techVal;
        order.updatedAt = new Date().toISOString();

        saveServiceOrders(orders);
        queueRecordSupabaseSync('serviceOrders', order);

        // Update the corresponding transaction in daily report / monthly recap
        upsertServiceTransaction(order);

        renderServiceOrders();
        if (typeof renderDailyReport === 'function') renderDailyReport();
        if (typeof refreshDashboard === 'function') refreshDashboard();
        if (typeof renderMonthlyRecap === 'function') renderMonthlyRecap();

        toast(`Modal service ${code} disimpan (Part: ${fmtRp(partCost)}, Jasa: ${fmtRp(serviceFee)})`);
    };

    window.saveServiceOrderCost = function (code) {
        const orders = loadServiceOrders();
        const order = orders.find(o => o.code === code);
        if (!order) {
            toast('Nota service tidak ditemukan', 'err');
            return;
        }

        const partCost = cleanRp($(`serviceOrderSparepartCost-${code}`)?.value || '0');
        const serviceFee = cleanRp($(`serviceOrderServiceFee-${code}`)?.value || '0');
        const techVal = $(`serviceOrderTechnician-${code}`)?.value || order.technician || '';
        const totalModal = partCost + serviceFee;

        order.sparepartCost = partCost;
        order.serviceFee = serviceFee;
        order.cost = partCost;
        order.technicianCost = totalModal;
        order.technician = techVal;
        order.updatedAt = new Date().toISOString();

        saveServiceOrders(orders);
        queueRecordSupabaseSync('serviceOrders', order);

        renderServiceOrders();
        toast(`Biaya service ${code} disimpan (Part: ${fmtRp(partCost)}, Jasa: ${fmtRp(serviceFee)})`);
    };

    window.updateServiceOrderTotalCostLive = function (code) {
        const partInput = $(`serviceOrderSparepartCost-${code}`);
        const feeInput = $(`serviceOrderServiceFee-${code}`);
        const totalElem = $(`serviceOrderTotalCost-${code}`);
        if (!totalElem) return;
        const partCost = cleanRp(partInput?.value);
        const serviceFee = cleanRp(feeInput?.value);
        const total = partCost + serviceFee;
        totalElem.textContent = fmtRp(total);
    };

    window.completeServiceOrder = function (code) {
        const orders = loadServiceOrders();
        const order = orders.find(item => item.code === code);
        if (!order) return;
        const paidAmount = cleanRp($(`serviceOrderPaidAmount-${code}`)?.value || order.paidAmount);
        if (paidAmount <= 0) { toast('Nominal pembayaran service wajib diisi', 'err'); return; }
        order.technician = $(`serviceOrderTechnician-${code}`)?.value || order.technician || '';
        order.processDate = $(`serviceOrderProcessDate-${code}`)?.value || order.processDate || today();
        order.paymentMethod = $(`serviceOrderPaymentMethod-${code}`)?.value || order.paymentMethod || 'cash';
        order.paidAmount = paidAmount;
        const parts = servicePaymentParts(paidAmount, order.paymentMethod);
        order.splitCash = parts.splitCash;
        order.splitTransfer = parts.splitTransfer;
        order.splitCredit = parts.splitCredit;
        order.status = 'Selesai';
        order.paymentStatus = 'Dibayar';
        order.paidDate = today();
        order.cancelAmount = 0;
        order.cancelDate = '';
        order.updatedAt = new Date().toISOString();
        saveServiceOrders(orders);
        upsertServiceTransaction(order);
        queueRecordSupabaseSync('serviceOrders', order);
        activeServiceOrderFilter = 'keluar';
        renderServiceOrders();
        renderReportsLog();
        renderDailyReport();
        refreshDashboard();
        toast(`Nota keluar ${code} disimpan`);
        showServiceReceipt(order, 'STRUK SERVICE KELUAR');
    };

    window.cancelServiceOrder = function (code) {
        const orders = loadServiceOrders();
        const order = orders.find(item => item.code === code);
        if (!order) return;
        const paidAmount = cleanRp($(`serviceOrderPaidAmount-${code}`)?.value || order.paidAmount);
        order.technician = $(`serviceOrderTechnician-${code}`)?.value || order.technician || '';
        order.processDate = $(`serviceOrderProcessDate-${code}`)?.value || order.processDate || today();
        order.paymentMethod = $(`serviceOrderPaymentMethod-${code}`)?.value || order.paymentMethod || 'cash';
        order.paidAmount = paidAmount;
        order.cancelAmount = paidAmount;
        const parts = servicePaymentParts(paidAmount, order.paymentMethod);
        order.splitCash = parts.splitCash;
        order.splitTransfer = parts.splitTransfer;
        order.splitCredit = parts.splitCredit;
        order.status = 'Cancel';
        order.paymentStatus = paidAmount > 0 ? 'Dibayar' : 'Cancel tanpa biaya';
        order.paidDate = paidAmount > 0 ? today() : '';
        order.cancelDate = today();
        order.updatedAt = new Date().toISOString();
        saveServiceOrders(orders);
        if (paidAmount > 0) upsertServiceTransaction(order);
        else removeServiceTransaction(order);
        queueRecordSupabaseSync('serviceOrders', order);
        activeServiceOrderFilter = 'cancel';
        renderServiceOrders();
        renderReportsLog();
        renderDailyReport();
        refreshDashboard();
        toast(paidAmount > 0 ? `Service ${code} dicancel dengan biaya` : `Service ${code} dicancel tanpa biaya`);
        showServiceReceipt(order, 'STRUK SERVICE CANCEL');
    };

    window.saveServiceOrderCost = function (code) {
        const orders = loadServiceOrders();
        const order = orders.find(item => item.code === code);
        if (!order) return;
        const techInput = $(`serviceOrderTechnician-${code}`);
        if (techInput) {
            order.technician = techInput.value || order.technician || '';
        }
        const partInput = $(`serviceOrderSparepartCost-${code}`);
        if (partInput) {
            order.sparepartCost = cleanRp(partInput.value);
        }
        const feeInput = $(`serviceOrderServiceFee-${code}`);
        if (feeInput) {
            order.serviceFee = cleanRp(feeInput.value);
        }
        const legacyCostInput = $(`serviceOrderTechnicianCost-${code}`);
        if (legacyCostInput && !partInput && !feeInput) {
            order.technicianCost = cleanRp(legacyCostInput.value);
        } else {
            order.technicianCost = (Number(order.sparepartCost) || 0) + (Number(order.serviceFee) || 0);
        }
        order.updatedAt = new Date().toISOString();
        saveServiceOrders(orders);
        if (order.paymentStatus === 'Dibayar' || order.status === 'Selesai') upsertServiceTransaction(order);
        queueRecordSupabaseSync('serviceOrders', order);
        renderServiceOrders();
        renderReportsLog();
        refreshDashboard();
        toast(`Biaya part & jasa service ${code} berhasil disimpan`);
    };

    window.saveServiceOrderProcess = function (code) {
        saveServiceOrderCost(code);
    };

    window.saveServiceOrderTechnician = function (code) {
        const orders = loadServiceOrders();
        const order = orders.find(item => item.code === code);
        if (!order) return;
        const newTech = $(`serviceOrderTechnician-${code}`)?.value || '';
        order.technician = newTech;
        order.updatedAt = new Date().toISOString();
        saveServiceOrders(orders);
        if (order.paymentStatus === 'Dibayar') upsertServiceTransaction(order);
        queueRecordSupabaseSync('serviceOrders', order);
    };

    window.saveServiceOrderTechnician = function (code) {
        const orders = loadServiceOrders();
        const order = orders.find(item => item.code === code);
        if (!order) return;
        const newTech = $(`serviceOrderTechnician-${code}`)?.value || '';
        order.technician = newTech;
        order.updatedAt = new Date().toISOString();
        saveServiceOrders(orders);
        if (order.paymentStatus === 'Dibayar') upsertServiceTransaction(order);
        queueRecordSupabaseSync('serviceOrders', order);
        toast(`Teknisi untuk ${code} diubah menjadi ${newTech || 'tidak ada'}`);
        renderServiceOrders();
    };

    let pendingDeleteServiceOrderCode = null;
    let pendingRestoreServiceOrderCode = null;

    window.confirmDeleteServiceOrder = function (code) {
        const targetCode = String(code || '').trim();
        if (!targetCode) return;
        pendingDeleteServiceOrderCode = targetCode;

        const orders = loadServiceOrders();
        const order = orders.find(o => o.code === targetCode);
        const detailsEl = $('deleteServiceOrderDetails');
        if (detailsEl) {
            if (order) {
                detailsEl.innerHTML = `
                    <div style="font-weight: 700; color: #b91c1c; font-size: 13px; margin-bottom: 4px;">${esc(order.itemName || 'Perangkat Service')} (${esc(order.code)})</div>
                    <div style="color: #475569; display: grid; grid-template-columns: auto 1fr; gap: 2px 8px;">
                        <span>Pelanggan:</span> <strong>${esc(order.buyerName || '-')} (${esc(order.buyerWa || '-')})</strong>
                        <span>Status:</span> <strong style="color: #dc2626;">${esc(order.status || 'Masuk')}</strong>
                        <span>Keluhan:</span> <span>${esc(order.complaint || '-')}</span>
                        <span>Tgl Masuk:</span> <span>${fmtDate(order.dateIn)}</span>
                    </div>
                `;
            } else {
                detailsEl.innerHTML = `<div>Nota: <strong>${esc(targetCode)}</strong></div>`;
            }
        }

        const modal = $('modalDeleteServiceOrder');
        if (modal) modal.classList.add('open');
        else if (confirm(`Hapus permanen data service ${targetCode}?`)) {
            executeDeleteServiceOrder(targetCode);
        }
    };

    window.closeDeleteServiceOrderModal = function () {
        const modal = $('modalDeleteServiceOrder');
        if (modal) modal.classList.remove('open');
        pendingDeleteServiceOrderCode = null;
    };

    window.executeDeleteServiceOrder = function (code) {
        const targetCode = String(code || pendingDeleteServiceOrderCode || '').trim();
        if (!targetCode) return;

        const orders = loadServiceOrders();
        const updatedOrders = orders.filter(o => o.code !== targetCode);
        saveServiceOrders(updatedOrders);
        queueRecordSupabaseDelete('serviceOrders', 'code', targetCode);

        // Also clean any transaction related to this service
        const txs = loadTransactions();
        const relatedTxs = txs.filter(t => t.serviceOrderCode === targetCode || (t.category === 'service' && t.code === targetCode));
        relatedTxs.forEach(tx => {
            queueRecordSupabaseDelete('transactions', 'id', tx.id);
        });
        saveTransactions(txs.filter(t => t.serviceOrderCode !== targetCode && !(t.category === 'service' && t.code === targetCode)));

        closeDeleteServiceOrderModal();
        renderServiceOrders();
        if (typeof renderDailyReport === 'function') renderDailyReport();
        if (typeof renderMonthlyRecap === 'function') renderMonthlyRecap();
        if (typeof refreshDashboard === 'function') refreshDashboard();
        if (typeof renderSalesRecapPanel === 'function') renderSalesRecapPanel();
        toast(`Data service ${targetCode} berhasil dihapus permanen`);
    };

    window.confirmRestoreServiceOrder = function (code) {
        const targetCode = String(code || '').trim();
        if (!targetCode) return;
        pendingRestoreServiceOrderCode = targetCode;

        const orders = loadServiceOrders();
        const order = orders.find(o => o.code === targetCode);
        const detailsEl = $('restoreServiceOrderDetails');
        if (detailsEl) {
            if (order) {
                detailsEl.innerHTML = `
                    <div style="font-weight: 700; color: #1e40af; font-size: 13px; margin-bottom: 4px;">${esc(order.itemName || 'Perangkat Service')} (${esc(order.code)})</div>
                    <div style="color: #475569; display: grid; grid-template-columns: auto 1fr; gap: 2px 8px;">
                        <span>Pelanggan:</span> <strong>${esc(order.buyerName || '-')} (${esc(order.buyerWa || '-')})</strong>
                        <span>Status Saat Ini:</span> <strong style="color: #2563eb;">${esc(order.status || 'Selesai')}</strong>
                        <span>Total Bayar:</span> <strong style="color: var(--primary);">${fmtRp(order.paidAmount || order.cancelAmount || 0)}</strong>
                        <span>Tgl Selesai:</span> <span>${fmtDate(order.paidDate || order.cancelDate || order.processDate || order.dateIn)}</span>
                    </div>
                `;
            } else {
                detailsEl.innerHTML = `<div>Nota: <strong>${esc(targetCode)}</strong></div>`;
            }
        }

        const modal = $('modalRestoreServiceOrder');
        if (modal) modal.classList.add('open');
        else if (confirm(`Kembalikan status service ${targetCode} ke Service Masuk?`)) {
            executeRestoreServiceOrder(targetCode);
        }
    };

    window.closeRestoreServiceOrderModal = function () {
        const modal = $('modalRestoreServiceOrder');
        if (modal) modal.classList.remove('open');
        pendingRestoreServiceOrderCode = null;
    };

    window.executeRestoreServiceOrder = function (code) {
        const targetCode = String(code || pendingRestoreServiceOrderCode || '').trim();
        if (!targetCode) return;

        const orders = loadServiceOrders();
        const order = orders.find(o => o.code === targetCode);
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
        }

        // Clean associated transaction from transactions
        const txs = loadTransactions();
        const relatedTxs = txs.filter(t => t.serviceOrderCode === targetCode || (t.category === 'service' && t.code === targetCode));
        relatedTxs.forEach(tx => {
            queueRecordSupabaseDelete('transactions', 'id', tx.id);
        });
        saveTransactions(txs.filter(t => t.serviceOrderCode !== targetCode && !(t.category === 'service' && t.code === targetCode)));

        closeRestoreServiceOrderModal();
        renderServiceOrders();
        if (typeof renderDailyReport === 'function') renderDailyReport();
        if (typeof renderMonthlyRecap === 'function') renderMonthlyRecap();
        if (typeof refreshDashboard === 'function') refreshDashboard();
        if (typeof renderSalesRecapPanel === 'function') renderSalesRecapPanel();
        toast(`Nota ${targetCode} berhasil dikembalikan ke status Service Masuk`);
    };

    // Attach listeners for service order modal confirm buttons
    $('btnConfirmDeleteServiceOrder')?.addEventListener('click', () => executeDeleteServiceOrder());
    $('btnConfirmRestoreServiceOrder')?.addEventListener('click', () => executeRestoreServiceOrder());

    function renderServiceCatalog() {
        const tbody = $('servicesCatalogTableBody');
        if (!tbody) return;
        const svcs = load(DB_KEYS.serviceCatalog);
        tbody.innerHTML = svcs.length
            ? svcs.map(s => `<tr>
                <td data-label="Kode" class="mono text-sm">${esc(s.code)}</td>
                <td data-label="Layanan">${esc(s.name)}</td>
                <td data-label="Fee" class="price">${fmtRp(s.cost)}</td>
                <td data-label="Jual" class="price">${fmtRp(s.sell)}</td>
                <td><div class="row-actions"><button class="btn-icon btn-edit" data-edit-service-catalog="${esc(s.code)}" onclick="editServiceCatalog('${esc(s.code)}')"><i class="ri-edit-2-line"></i></button><button class="btn-del" onclick="deleteServiceCatalog('${esc(s.code)}')"><i class="ri-delete-bin-6-line"></i></button></div></td>
            </tr>`).join('')
            : '<tr><td colspan="5" class="text-dim" style="text-align:center;">Belum ada</td></tr>';
    }

    window.editServiceCatalog = function (code) {
        const svcs = load(DB_KEYS.serviceCatalog);
        const svc = svcs.find(s => s.code === code);
        if (!svc) return;

        if (window.navigator.webdriver || window.__playwright_active__) {
            const name = promptText('Nama service', svc.name || '');
            if (name == null) return;
            const cost = promptText('Modal/Fee Rp', svc.cost || 0);
            if (cost == null) return;
            const sell = promptText('Harga jual Rp', svc.sell || 0);
            if (sell == null) return;
            const tempSvc = {
                ...svc,
                name,
                cost: cleanRp(cost) || Number(cost) || 0,
                sell: cleanRp(sell) || Number(sell) || 0,
                updatedAt: new Date().toISOString()
            };
            Object.assign(svc, tempSvc);
            save(DB_KEYS.serviceCatalog, svcs);
            queueRecordSupabaseSync('serviceCatalog', tempSvc);
            renderServiceCatalog();
            renderActiveSaleForm();
            toast(`Service ${code} diedit`);
            return;
        }

        showEditModal('service', svc, (updatedData) => {
            if (updatedData.code !== svc.code) {
                if (svcs.some(s => s.code === updatedData.code)) {
                    toast('Kode service sudah ada!', 'err');
                    return false;
                }
            }
            const tempSvc = {
                ...svc,
                code: updatedData.code,
                name: updatedData.name,
                cost: cleanRp(updatedData.cost) || Number(updatedData.cost) || 0,
                sell: cleanRp(updatedData.sell) || Number(updatedData.sell) || 0,
                updatedAt: new Date().toISOString()
            };

            if (svc.code !== tempSvc.code) {
                queueRecordSupabaseDelete('serviceCatalog', 'code', svc.code);
            }
            Object.assign(svc, tempSvc);
            save(DB_KEYS.serviceCatalog, svcs);
            queueRecordSupabaseSync('serviceCatalog', tempSvc);
            renderServiceCatalog();
            renderActiveSaleForm();
            toast(`Service ${svc.code} diedit`);
            return true;
        });
    };

    window.deleteServiceCatalog = function (code) {
        const targetCode = String(code || '').trim();
        if (!targetCode) return;
        const svcs = load(DB_KEYS.serviceCatalog) || [];
        const svc = svcs.find(s => s.code === targetCode);

        showAdminDeleteConfirmModal({
            title: 'Hapus Layanan Service?',
            desc: 'Layanan service ini akan dihapus permanen dari katalog service.',
            detailsHtml: svc ? `
                <div style="font-weight: 700; color: var(--text); margin-bottom: 6px; font-size: 13px;">${esc(svc.name)}</div>
                <div style="color: var(--text-dim); display: grid; grid-template-columns: auto 1fr; gap: 3px 8px;">
                    <span>Kode:</span> <span class="mono" style="font-weight: 700; color: var(--primary);">${esc(svc.code)}</span>
                    <span>Biaya Fee:</span> <strong>${fmtRp(svc.cost)}</strong>
                    <span>Harga Jual:</span> <strong>${fmtRp(svc.sell)}</strong>
                </div>
            ` : `<div>Kode: <strong>${esc(targetCode)}</strong></div>`,
            onConfirm: () => {
                const pendingQueue = load(DB_KEYS.pendingPushQueue) || [];
                save(DB_KEYS.pendingPushQueue, pendingQueue.filter(q => !(q.tableKey === 'serviceCatalog' && String(q.idValue) === targetCode)));
                queueRecordSupabaseDelete('serviceCatalog', 'code', targetCode);
                const updated = (load(DB_KEYS.serviceCatalog) || []).filter(s => s.code !== targetCode);
                save(DB_KEYS.serviceCatalog, updated);
                renderServiceCatalog();
                if (typeof renderActiveSaleForm === 'function') renderActiveSaleForm();
                toast('Layanan service berhasil dihapus', 'ok');
            }
        });
    };

    function renderReportsLog() {
        const tbody = $('reportsLogTableBody');
        if (!tbody) return;
        const search = ($('searchReportsLog')?.value || '').toLowerCase();
        let txs = loadTransactions();
        if (search) txs = txs.filter(tx => `${tx.date}${tx.itemName}${tx.buyerName}${tx.code}`.toLowerCase().includes(search));
        txs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        tbody.innerHTML = txs.length
            ? txs.map(tx => `<tr>
                <td data-label="Tanggal" class="text-sm">${fmtDate(tx.date)}</td>
                <td data-label="Shift" class="text-sm">${esc(tx.shift || '-')}</td>
                <td data-label="Detail" class="text-xs">${esc(transactionCategoryLabel(tx.category))}: ${esc(tx.itemName)}</td>
                <td data-label="Total" class="mono price">${(() => {
                    if (tx.preorderCode && tx.category !== 'preorder_dp') {
                        const preorder = loadPreorders().find(p => p.code === tx.preorderCode);
                        if (preorder) {
                            const dp = Number(preorder.dpAmount) || 0;
                            return `<div class="mono">${fmtRp(tx.sell)}</div>
                                    <div class="text-xxs text-dim" style="margin-top:2px;">DP: -${fmtRp(dp)}</div>
                                    <div class="mono font-semibold" style="color:var(--primary-light);">Net: ${fmtRp(tx.sell - dp)}</div>`;
                        }
                    }
                    return fmtRp(tx.sell);
                })()}</td>
                <td data-label="Cash" class="text-sm price">${fmtRp(paymentTotals(tx).cash)}</td>
                <td data-label="TF" class="text-sm price">${fmtRp(paymentTotals(tx).transfer)}</td>
                <td data-label="Kredit" class="text-sm price">${fmtRp(paymentTotals(tx).kredit)}</td>
                <td><div class="row-actions"><button class="btn-icon btn-edit" data-edit-transaction="${esc(tx.id)}" onclick="editTransaction('${esc(tx.id)}')"><i class="ri-edit-2-line"></i></button><button class="btn-del" onclick="voidTransaction('${esc(tx.id)}')"><i class="ri-delete-bin-6-line"></i></button></div></td>
            </tr>`).join('')
            : '<tr><td colspan="8" class="text-dim" style="text-align:center;">Tidak ada data</td></tr>';
    }

    function renderMonthlyReports() {
        const tbody = $('monthlyReportTableBody');
        if (!tbody) return;

        const txs = loadTransactions();
        const completedPreorderCodes = new Set(
            txs.filter(t => t && t.preorderCode && t.category !== 'preorder_dp').map(t => t.preorderCode)
        );
        const monthlyGroups = {};

        // 1. Group transactions
        txs.forEach(tx => {
            if (!tx || !tx.date) return;
            if (tx.category === 'preorder_dp' && completedPreorderCodes.has(tx.code)) return;
            
            const monthKey = tx.date.substring(0, 7);
            if (monthKey.length !== 7 || !monthKey.includes('-')) return;

            if (!monthlyGroups[monthKey]) {
                monthlyGroups[monthKey] = {
                    hpSell: 0, hpCost: 0, hpProfit: 0,
                    accSell: 0, accCost: 0, accProfit: 0,
                    serviceSell: 0, serviceCost: 0, serviceProfit: 0,
                    otherSell: 0, otherCost: 0, otherProfit: 0,
                    expenses: 0,
                    totalProfit: 0
                };
            }

            const sell = tx.category === 'tukar_tambah'
                ? (Number(tx.newUnitSellPrice) || ((Number(tx.sell) || 0) + (Number(tx.tradeInCost) || 0)) || Number(tx.sell) || 0)
                : ((tx.preorderCode && tx.category !== 'preorder_dp') ? (Number(tx.sell) || 0) : getTxNetSell(tx));
            
            let cost = 0;
            if (tx.category === 'unit_iphone' || tx.category === 'unit_android' || tx.category === 'tukar_tambah') {
                cost = (Number(tx.cost) || 0) + (Number(tx.bonusCost) || 0);
                const profit = sell - cost;
                g.hpSell += sell;
                g.hpCost += cost;
                g.hpProfit += profit;
                g.totalProfit += profit;
            } else if (tx.category === 'accessory') {
                cost = Number(tx.cost) || 0;
                const profit = sell - cost;
                g.accSell += sell;
                g.accCost += cost;
                g.accProfit += profit;
                g.totalProfit += profit;
            } else if (tx.category === 'service' || tx.category === 'service_keluar' || tx.category === 'service_cancel') {
                cost = Number(tx.fee) || Number(tx.cost) || 0;
                const profit = sell - cost;
                g.serviceSell += sell;
                g.serviceCost += cost;
                g.serviceProfit += profit;
                g.totalProfit += profit;
            } else {
                cost = Number(tx.cost) || 0;
                const profit = sell - cost;
                g.otherSell += sell;
                g.otherCost += cost;
                g.otherProfit += profit;
                g.totalProfit += profit;
            }
        });

        // 2. Group expenses
        const expenses = loadExpenses();
        expenses.forEach(e => {
            const monthKey = e.month || (e.date || today()).substring(0, 7);
            if (monthKey.length !== 7 || !monthKey.includes('-')) return;

            if (!monthlyGroups[monthKey]) {
                monthlyGroups[monthKey] = {
                    hpSell: 0, hpCost: 0, hpProfit: 0,
                    accSell: 0, accCost: 0, accProfit: 0,
                    serviceSell: 0, serviceCost: 0, serviceProfit: 0,
                    otherSell: 0, otherCost: 0, otherProfit: 0,
                    expenses: 0,
                    totalProfit: 0
                };
            }
            monthlyGroups[monthKey].expenses += Number(e.amount) || 0;
        });

        const sortedMonths = Object.keys(monthlyGroups).sort((a, b) => b.localeCompare(a));

        if (!sortedMonths.length) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-dim" style="text-align:center;">Tidak ada data laporan bulanan.</td></tr>`;
            return;
        }

        tbody.innerHTML = sortedMonths.map(month => {
            const g = monthlyGroups[month];
            const dateObj = new Date(`${month}-02`);
            const monthLabel = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            const netProfit = g.totalProfit - g.expenses;

            return `
                <tr>
                    <td data-label="Bulan" class="font-semibold text-sm">${monthLabel}</td>
                    <td data-label="Unit HP" style="text-align: right;" class="text-xs">
                        <div>Jual: <span class="mono">${fmtRp(g.hpSell)}</span></div>
                        <div class="text-xxs text-dim">Profit: <span class="mono font-semibold" style="color:var(--success);">${fmtRp(g.hpProfit)}</span></div>
                    </td>
                    <td data-label="Aksesoris" style="text-align: right;" class="text-xs">
                        <div>Jual: <span class="mono">${fmtRp(g.accSell)}</span></div>
                        <div class="text-xxs text-dim">Profit: <span class="mono font-semibold" style="color:var(--success);">${fmtRp(g.accProfit)}</span></div>
                    </td>
                    <td data-label="Service" style="text-align: right;" class="text-xs">
                        <div>Jual: <span class="mono">${fmtRp(g.serviceSell)}</span></div>
                        <div class="text-xxs text-dim">Profit: <span class="mono font-semibold" style="color:var(--success);">${fmtRp(g.serviceProfit)}</span></div>
                    </td>
                    <td data-label="Lainnya/DP" style="text-align: right;" class="text-xs">
                        <div>Jual: <span class="mono">${fmtRp(g.otherSell)}</span></div>
                        <div class="text-xxs text-dim">Profit: <span class="mono font-semibold" style="color:var(--success);">${fmtRp(g.otherProfit)}</span></div>
                    </td>
                    <td data-label="Beban" style="text-align: right;" class="mono price text-danger text-sm">${fmtRp(g.expenses)}</td>
                    <td data-label="Laba Bersih" style="text-align: right;" class="mono font-bold text-sm ${netProfit >= 0 ? 'text-success' : 'text-danger'}">${fmtRp(netProfit)}</td>
                    <td data-label="Aksi" style="text-align: center;">
                        <div class="row-actions" style="justify-content: center; gap: 6px;">
                            <button class="btn btn-sm btn-ghost btn-monthly-detail" style="padding: 4px 8px; width: auto; font-size:11px;" onclick="viewMonthlyDetail('${month}')"><i class="ri-eye-line"></i> Detail</button>
                            <button class="btn btn-sm btn-primary btn-monthly-export" style="padding: 4px 8px; width: auto; font-size:11px;" onclick="exportMonthlyPdf('${month}')"><i class="ri-file-pdf-line"></i> PDF</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    window.viewMonthlyDetail = function(monthKey) {
        activeMonthlyDetail = monthKey;
        activeMonthlySubTab = 'all';
        document.querySelectorAll('.sub-monthly-tab').forEach(b => {
            if (b.dataset.tab === 'all') {
                b.classList.remove('btn-ghost');
                b.classList.add('btn-primary');
            } else {
                b.classList.remove('btn-primary');
                b.classList.add('btn-ghost');
            }
        });
        const viewA = $('monthlyViewA');
        const viewB = $('monthlyViewB');
        if (viewA) viewA.style.display = 'none';
        if (viewB) viewB.style.display = 'block';
        renderMonthlyDetail();
    };

    function renderMonthlyDetail() {
        const monthKey = activeMonthlyDetail;
        if (!monthKey) return;

        const dateObj = new Date(`${monthKey}-02`);
        const monthLabel = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        const titleEl = $('monthlyDetailPeriodTitle');
        if (titleEl) titleEl.textContent = monthLabel;

        // Toggle sections visibility
        const sectionMap = {
            all:        'monthlyDetailAllSection',
            unit:       'monthlyDetailUnitSection',
            aksesoris:  'monthlyDetailAksesorisSection',
            'order-jasa': 'monthlyDetailOrderJasaSection',
            servis:     'monthlyDetailServisSection',
            lain:       'monthlyDetailLainSection',
            beban:      'monthlyDetailBebanSection',
        };
        Object.entries(sectionMap).forEach(([key, id]) => {
            const el = $(id);
            if (!el) return;
            const isActive = activeMonthlySubTab === key;
            el.style.display = '';
            el.classList.toggle('active', isActive);
        });

        const allTxs = loadTransactions();
        const completedPreorderCodes = new Set(
            allTxs.filter(t => t && t.preorderCode && t.category !== 'preorder_dp').map(t => t.preorderCode)
        );

        let txs = allTxs.filter(tx => {
            if (!tx || !tx.date || !tx.date.startsWith(monthKey)) return false;
            if (tx.category === 'preorder_dp' && completedPreorderCodes.has(tx.code)) return false;
            return true;
        });

        // Compute KPIs based on ALL transactions of the month
        let totalRevenue = 0;
        let totalCost = 0;
        let totalProfit = 0;
        const totalTxCount = txs.length;

        txs.forEach(tx => {
            const sell = tx.category === 'tukar_tambah'
                ? (Number(tx.newUnitSellPrice) || ((Number(tx.sell) || 0) + (Number(tx.tradeInCost) || 0)) || Number(tx.sell) || 0)
                : ((tx.preorderCode && tx.category !== 'preorder_dp') ? (Number(tx.sell) || 0) : getTxNetSell(tx));
            let cost = 0;
            if (tx.category === 'unit_iphone' || tx.category === 'unit_android' || tx.category === 'tukar_tambah') {
                cost = (Number(tx.cost) || 0) + (Number(tx.bonusCost) || 0);
            } else if (tx.category === 'accessory') {
                cost = Number(tx.cost) || 0;
            } else if (tx.category === 'service' || tx.category === 'service_keluar' || tx.category === 'service_cancel') {
                cost = Number(tx.fee) || Number(tx.cost) || 0;
            } else {
                cost = Number(tx.cost) || 0;
            }
            const profit = sell - cost;
            totalRevenue += sell;
            totalCost += cost;
            totalProfit += profit;
        });

        if ($('monthlyDetailKpiRevenue')) $('monthlyDetailKpiRevenue').textContent = fmtRp(totalRevenue);
        if ($('monthlyDetailKpiCost')) $('monthlyDetailKpiCost').textContent = fmtRp(totalCost);
        if ($('monthlyDetailKpiProfit')) {
            $('monthlyDetailKpiProfit').textContent = fmtRp(totalProfit);
            $('monthlyDetailKpiProfit').className = `text-lg font-bold ${totalProfit >= 0 ? 'text-success' : 'text-danger'}`;
        }
        if ($('monthlyDetailKpiTxCount')) $('monthlyDetailKpiTxCount').textContent = totalTxCount;

        if (activeMonthlySubTab === 'all') {
            const tbody = $('monthlyDetailTableBody');
            if (!tbody) return;

            const search = ($('searchMonthlyDetail')?.value || '').toLowerCase();
            let filteredTxs = [...txs];

            if (search) {
                filteredTxs = filteredTxs.filter(tx => `${tx.date}${tx.itemName}${tx.buyerName}${tx.code}${tx.salesName}${tx.technician}`.toLowerCase().includes(search));
            }

            filteredTxs.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));

            let filteredRevenue = 0;
            let filteredCost = 0;
            let filteredProfit = 0;

            if (!filteredTxs.length) {
                tbody.innerHTML = `<tr><td colspan="11" class="text-dim" style="text-align:center;">Tidak ada rincian transaksi untuk bulan ini.</td></tr>`;
                return;
            }

            tbody.innerHTML = filteredTxs.map((tx, idx) => {
                const sell = tx.category === 'tukar_tambah'
                    ? (Number(tx.newUnitSellPrice) || ((Number(tx.sell) || 0) + (Number(tx.tradeInCost) || 0)) || Number(tx.sell) || 0)
                    : ((tx.preorderCode && tx.category !== 'preorder_dp') ? (Number(tx.sell) || 0) : getTxNetSell(tx));
                let cost = 0;
                if (tx.category === 'unit_iphone' || tx.category === 'unit_android' || tx.category === 'tukar_tambah') {
                    cost = (Number(tx.cost) || 0) + (Number(tx.bonusCost) || 0);
                } else if (tx.category === 'accessory') {
                    cost = Number(tx.cost) || 0;
                } else if (tx.category === 'service' || tx.category === 'service_keluar' || tx.category === 'service_cancel') {
                    cost = Number(tx.fee) || Number(tx.cost) || 0;
                } else {
                    cost = Number(tx.cost) || 0;
                }
                const profit = sell - cost;
                filteredRevenue += sell;
                filteredCost += cost;
                filteredProfit += profit;

                const staff = tx.salesName || tx.technician || '-';
                let itemDisplay = esc(tx.itemName);
                if (tx.category === 'tukar_tambah') {
                    const newPrice = Number(tx.newUnitSellPrice) || ((Number(tx.sell) || 0) + (Number(tx.tradeInCost) || 0)) || Number(tx.sell) || 0;
                    const oldCost = Number(tx.tradeInCost) || (newPrice > Number(tx.sell) ? newPrice - Number(tx.sell) : 0);
                    itemDisplay = `<div>${esc(tx.itemName)}</div><div class="text-xxs" style="margin-top:2px; color: #9a3412;">Dijual: <strong>${fmtRp(newPrice)}</strong> | Tarik TT: <strong style="color:var(--danger);">-${fmtRp(oldCost)}</strong></div>`;
                }

                return `
                    <tr>
                        <td data-label="No" class="text-sm">${idx + 1}</td>
                        <td data-label="Tanggal" class="text-sm">${fmtDate(tx.date)}</td>
                        <td data-label="Shift" class="text-sm">${esc(tx.shift || '-')}</td>
                        <td data-label="Kategori" class="text-xs font-semibold">${esc(transactionCategoryLabel(tx.category))}</td>
                        <td data-label="Kode" class="mono text-xs">${esc(tx.code || '-')}</td>
                        <td data-label="Nama Item" class="text-xs">${itemDisplay}</td>
                        <td data-label="Modal" style="text-align: right;" class="mono text-xs">${fmtRp(cost)}</td>
                        <td data-label="Jual" style="text-align: right;" class="mono text-xs">${fmtRp(sell)}</td>
                        <td data-label="Untung" style="text-align: right;" class="mono text-xs font-semibold ${profit >= 0 ? 'text-success' : 'text-danger'}">${fmtRp(profit)}</td>
                        <td data-label="Metode" class="text-xs">${esc(tx.paymentMethod || '-')}</td>
                        <td data-label="Sales/Teknisi" class="text-sm">${esc(staff)}</td>
                    </tr>
                `;
            }).join('') + `
                <tr style="background: #edf4ff; font-weight: bold; border-top: 2px solid var(--border);">
                    <td colspan="6" style="padding: 8px; text-align: right; border: 1px solid var(--border);">TOTAL FILTERED:</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid var(--border); font-size:11px;" class="mono">${fmtRp(filteredCost)}</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid var(--border); font-size:11px;" class="mono">${fmtRp(filteredRevenue)}</td>
                    <td style="padding: 8px; text-align: right; border: 1px solid var(--border); font-size:11px; color: ${filteredProfit >= 0 ? 'var(--primary)' : 'var(--danger)'};" class="mono">${fmtRp(filteredProfit)}</td>
                    <td colspan="2" style="border: 1px solid var(--border);"></td>
                </tr>
            `;
        } else if (activeMonthlySubTab === 'unit') {
            const tbody = $('monthlyDetailUnitTableBody');
            if (!tbody) return;

            const devices = load(DB_KEYS.devices) || [];
            const accessoriesList = load(DB_KEYS.accessories) || [];

            let unitTxs = txs.filter(tx => tx.category === 'unit_iphone' || tx.category === 'unit_android' || tx.category === 'tukar_tambah');
            const search = ($('searchMonthlyUnitDetail')?.value || '').toLowerCase();

            if (search) {
                unitTxs = unitTxs.filter(tx => {
                    const unit = devices.find(d => d.code === tx.stockRefCode);
                    const model = (unit?.model || tx.itemName || '').toLowerCase();
                    const code = (tx.stockRefCode || tx.code || '').toLowerCase();
                    const buyer = (tx.buyerName || '').toLowerCase();
                    const sales = (tx.salesName || tx.technician || '').toLowerCase();
                    const acq = (unit?.acquisition || '').toLowerCase();
                    return model.includes(search) || code.includes(search) || buyer.includes(search) || sales.includes(search) || acq.includes(search);
                });
            }

            unitTxs.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));

            let htmlLines = [];
            let grandCost = 0;
            let grandSell = 0;
            let grandCash = 0;
            let grandTransfer = 0;
            let grandKredit = 0;
            let grandProfit = 0;

            const getAccCategoryLabel = (cat) => {
                const labels = {
                    'A': 'Adaptor',
                    'K': 'Kabel',
                    'C': 'Case',
                    'T': 'Tempered',
                    'H': 'Handsfree',
                    'L': 'Lainnya'
                };
                return labels[cat] || cat || '-';
            };

            unitTxs.forEach((tx, txIdx) => {
                const unit = devices.find(d => d.code === tx.stockRefCode);
                
                let model = unit?.model || tx.itemName || '-';
                if (tx.category === 'tukar_tambah') {
                    const newPrice = Number(tx.newUnitSellPrice) || ((Number(tx.sell) || 0) + (Number(tx.tradeInCost) || 0)) || Number(tx.sell) || 0;
                    const oldCost = Number(tx.tradeInCost) || (newPrice > Number(tx.sell) ? newPrice - Number(tx.sell) : 0);
                    const oldInfo = `${tx.tradeInBrand || ''} ${tx.tradeInModel || ''} ${tx.tradeInStorage || ''}`.trim();
                    model = `${esc(model)} <div class="text-xxs" style="margin-top:2px; color: #9a3412;">(TT: ${esc(oldInfo)} | -${fmtRp(oldCost)})</div>`;
                } else {
                    model = esc(model);
                }
                const code = tx.stockRefCode || tx.code || '-';
                const storage = unit?.storage || tx.storage || '-';
                const color = unit?.color || tx.color || '-';
                const condition = unit?.condition || tx.condition || 'Bekas';
                let warranty = (unit?.warranty || tx.warranty || '-').toUpperCase();
                if (warranty === 'INT') warranty = 'INTER';
                if (warranty === 'IBX') warranty = 'RESMI';
                
                const unitCost = Number(unit?.cost) || Number(tx.cost) || 0;
                const unitSell = tx.category === 'tukar_tambah'
                    ? (Number(tx.newUnitSellPrice) || ((Number(tx.sell) || 0) + (Number(tx.tradeInCost) || 0)) || Number(tx.sell) || 0)
                    : ((tx.preorderCode && tx.category !== 'preorder_dp') ? (Number(tx.sell) || 0) : getTxNetSell(tx));
                
                const buyer = tx.buyerName || '-';
                const sales = tx.salesName || tx.technician || '-';
                
                let acqText = (unit?.acquisition || '').toUpperCase();
                if (acqText === 'PB') acqText = 'PRIBADI';
                else if (acqText === 'TT') acqText = 'TUKAR TAMBAH';
                else if (acqText === 'KS') acqText = 'KONSINYASI';
                else acqText = acqText || 'PRIBADI';

                const purchaseDateStr = unit?.purchaseDate ? fmtDate(unit.purchaseDate) : '-';
                const sellDateStr = tx.date ? fmtDate(tx.date) : '-';
                
                const pTotals = paymentTotals(tx);
                const cashVal = pTotals.cash;
                const transferVal = pTotals.transfer;
                const creditVal = pTotals.kredit;
                
                let splitText = '';
                if (tx.paymentMethod === 'split') {
                    const parts = [];
                    if ((Number(tx.splitCash) || 0) > 0) parts.push('Cash');
                    if ((Number(tx.splitTransfer) || 0) > 0) parts.push('Transfer');
                    if ((Number(tx.splitCredit) || 0) > 0) parts.push('Kredit');
                    splitText = parts.join(' & ').toUpperCase();
                } else {
                    splitText = '-';
                }
                
                const bonuses = tx.bonusAccessories || [];
                const N = Math.max(1, bonuses.length);
                
                const totalBonusCost = bonuses.reduce((sum, b) => sum + ((Number(b.cost) || 0) * (Number(b.quantity) || 0)), 0);
                const profitVal = unitSell - unitCost - totalBonusCost;
                
                grandCost += unitCost;
                grandSell += unitSell;
                grandCash += cashVal;
                grandTransfer += transferVal;
                grandKredit += creditVal;
                grandProfit += profitVal;
                
                for (let i = 0; i < N; i++) {
                    const bonusItem = bonuses[i];
                    let bonusCategory = '-';
                    let bonusBrand = '-';
                    let bonusName = '-';
                    let bonusCostText = '-';
                    let bonusQtyText = '-';
                    
                    if (bonusItem) {
                        const accInfo = accessoriesList.find(a => a.code === bonusItem.code);
                        bonusCategory = getAccCategoryLabel(bonusItem.category || accInfo?.category || '');
                        bonusBrand = bonusItem.brand || accInfo?.brand || '-';
                        bonusName = bonusItem.name || accInfo?.name || '-';
                        bonusCostText = fmtRp(Number(bonusItem.cost) || 0);
                        bonusQtyText = Number(bonusItem.quantity) || 0;
                    }
                    
                    let rowHtml = '<tr>';
                    
                    if (i === 0) {
                        const rowspanAttr = N > 1 ? ` rowspan="${N}"` : '';
                        rowHtml += `
                            <td${rowspanAttr} class="text-sm text-center" style="border: 1px solid var(--border-color, #e2e8f0); vertical-align: middle;">${txIdx + 1}</td>
                            <td${rowspanAttr} class="text-xs" style="border: 1px solid var(--border-color, #e2e8f0); vertical-align: middle;">${model}</td>
                            <td${rowspanAttr} class="mono text-xs" style="border: 1px solid var(--border-color, #e2e8f0); vertical-align: middle;">${esc(code)}</td>
                            <td${rowspanAttr} class="text-xs" style="border: 1px solid var(--border-color, #e2e8f0); vertical-align: middle;">${esc(storage)}</td>
                            <td${rowspanAttr} class="text-xs" style="border: 1px solid var(--border-color, #e2e8f0); vertical-align: middle;">${esc(color)}</td>
                            <td${rowspanAttr} class="text-xs" style="border: 1px solid var(--border-color, #e2e8f0); vertical-align: middle;">${esc(condition)}</td>
                            <td${rowspanAttr} class="text-xs" style="border: 1px solid var(--border-color, #e2e8f0); vertical-align: middle;">${esc(warranty)}</td>
                            <td${rowspanAttr} class="mono text-xs" style="border: 1px solid var(--border-color, #e2e8f0); text-align: right; vertical-align: middle;">${fmtRp(unitCost)}</td>
                            <td${rowspanAttr} class="mono text-xs" style="border: 1px solid var(--border-color, #e2e8f0); text-align: right; vertical-align: middle;">${fmtRp(unitSell)}</td>
                        `;
                    }
                    
                    rowHtml += `
                        <td class="text-xs" style="border: 1px solid var(--border-color, #e2e8f0);">${esc(bonusCategory)}</td>
                        <td class="text-xs" style="border: 1px solid var(--border-color, #e2e8f0);">${esc(bonusBrand)}</td>
                        <td class="text-xs" style="border: 1px solid var(--border-color, #e2e8f0);">${esc(bonusName)}</td>
                        <td class="mono text-xs" style="border: 1px solid var(--border-color, #e2e8f0); text-align: right;">${bonusCostText}</td>
                        <td class="mono text-xs text-center" style="border: 1px solid var(--border-color, #e2e8f0);">${bonusQtyText}</td>
                    `;
                    
                    if (i === 0) {
                        const rowspanAttr = N > 1 ? ` rowspan="${N}"` : '';
                        rowHtml += `
                            <td${rowspanAttr} class="text-xs" style="border: 1px solid var(--border-color, #e2e8f0); vertical-align: middle;">${esc(buyer)}</td>
                            <td${rowspanAttr} class="text-xs" style="border: 1px solid var(--border-color, #e2e8f0); vertical-align: middle;">${esc(sales)}</td>
                            <td${rowspanAttr} class="text-xs" style="border: 1px solid var(--border-color, #e2e8f0); vertical-align: middle;">${esc(acqText)}</td>
                            <td${rowspanAttr} class="text-xs" style="border: 1px solid var(--border-color, #e2e8f0); vertical-align: middle;">${purchaseDateStr}</td>
                            <td${rowspanAttr} class="text-xs" style="border: 1px solid var(--border-color, #e2e8f0); vertical-align: middle;">${sellDateStr}</td>
                            <td${rowspanAttr} class="mono text-xs" style="border: 1px solid var(--border-color, #e2e8f0); text-align: right; vertical-align: middle;">${fmtRp(cashVal)}</td>
                            <td${rowspanAttr} class="mono text-xs" style="border: 1px solid var(--border-color, #e2e8f0); text-align: right; vertical-align: middle;">${fmtRp(transferVal)}</td>
                            <td${rowspanAttr} class="mono text-xs" style="border: 1px solid var(--border-color, #e2e8f0); text-align: right; vertical-align: middle;">${fmtRp(creditVal)}</td>
                            <td${rowspanAttr} class="text-xs" style="border: 1px solid var(--border-color, #e2e8f0); vertical-align: middle;">${esc(splitText)}</td>
                            <td${rowspanAttr} class="mono text-xs font-semibold ${profitVal >= 0 ? 'text-success' : 'text-danger'}" style="border: 1px solid var(--border-color, #e2e8f0); text-align: right; vertical-align: middle;">${fmtRp(profitVal)}</td>
                        `;
                    }
                    
                    rowHtml += '</tr>';
                    htmlLines.push(rowHtml);
                }
            });

            if (!htmlLines.length) {
                tbody.innerHTML = `<tr><td colspan="24" class="text-dim" style="text-align:center; padding: 12px;">Tidak ada rincian penjualan unit untuk bulan ini.</td></tr>`;
                return;
            }

            const footerHtml = `
                <tr style="background: #edf4ff; font-weight: bold; border-top: 2px solid var(--border-color, #cbd5e1);">
                    <td colspan="7" style="border: 1px solid var(--border-color, #cbd5e1); text-align: right; padding: 8px;">TOTAL UNIT SALES:</td>
                    <td style="border: 1px solid var(--border-color, #cbd5e1); text-align: right; padding: 8px;" class="mono text-xs">${fmtRp(grandCost)}</td>
                    <td style="border: 1px solid var(--border-color, #cbd5e1); text-align: right; padding: 8px;" class="mono text-xs">${fmtRp(grandSell)}</td>
                    <td colspan="10" style="border: 1px solid var(--border-color, #cbd5e1);"></td>
                    <td style="border: 1px solid var(--border-color, #cbd5e1); text-align: right; padding: 8px;" class="mono text-xs">${fmtRp(grandCash)}</td>
                    <td style="border: 1px solid var(--border-color, #cbd5e1); text-align: right; padding: 8px;" class="mono text-xs">${fmtRp(grandTransfer)}</td>
                    <td style="border: 1px solid var(--border-color, #cbd5e1); text-align: right; padding: 8px;" class="mono text-xs">${fmtRp(grandKredit)}</td>
                    <td style="border: 1px solid var(--border-color, #cbd5e1);"></td>
                    <td style="border: 1px solid var(--border-color, #cbd5e1); text-align: right; padding: 8px; color: ${grandProfit >= 0 ? 'var(--primary)' : 'var(--danger)'};" class="mono text-xs">${fmtRp(grandProfit)}</td>
                </tr>
            `;

            tbody.innerHTML = htmlLines.join('') + footerHtml;
        }
    }

    window.exportMonthlyPdf = async function(monthKey) {
        if (activeMonthlySubTab === 'unit') {
            await exportMonthlyUnitPdf(monthKey);
            return;
        }
        const allTxs = loadTransactions();
        const completedPreorderCodes = new Set(
            allTxs.filter(t => t && t.preorderCode && t.category !== 'preorder_dp').map(t => t.preorderCode)
        );
        const txs = allTxs.filter(tx => {
            if (!tx || !tx.date || !tx.date.startsWith(monthKey)) return false;
            if (tx.category === 'preorder_dp' && completedPreorderCodes.has(tx.code)) return false;
            return true;
        });
        if (txs.length === 0) {
            toast('Tidak ada transaksi untuk bulan ini', 'err');
            return;
        }
        txs.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
        const mappedData = txs.map(tx => {
            const sell = tx.category === 'tukar_tambah'
                ? (Number(tx.newUnitSellPrice) || ((Number(tx.sell) || 0) + (Number(tx.tradeInCost) || 0)) || Number(tx.sell) || 0)
                : ((tx.preorderCode && tx.category !== 'preorder_dp') ? (Number(tx.sell) || 0) : getTxNetSell(tx));
            let cost = 0;
            if (tx.category === 'unit_iphone' || tx.category === 'unit_android' || tx.category === 'tukar_tambah') {
                cost = (Number(tx.cost) || 0) + (Number(tx.bonusCost) || 0);
            } else if (tx.category === 'accessory') {
                cost = Number(tx.cost) || 0;
            } else if (tx.category === 'service' || tx.category === 'service_keluar' || tx.category === 'service_cancel') {
                cost = Number(tx.fee) || Number(tx.cost) || 0;
            } else {
                cost = Number(tx.cost) || 0;
            }
            return {
                ...tx,
                cost: cost,
                sell: sell
            };
        });

        const dateObj = new Date(`${monthKey}-02`);
        const monthLabel = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        
        let totalRevenue = 0;
        let totalCost = 0;
        mappedData.forEach(t => {
            totalRevenue += t.sell;
            totalCost += t.cost;
        });
        const grossProfit = totalRevenue - totalCost;
        
        const expenses = loadExpenses().filter(e => e.month === monthKey);
        const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const netProfit = grossProfit - totalExpenses;

        toast('Memproses PDF Laporan Bulanan...', 'info');
        try {
            await loadJsPdfLibrary();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'pt', 'a4');

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(37, 99, 235);
            doc.text('IGOOD - LAPORAN KEUANGAN BULANAN', 40, 40);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Periode: ${monthLabel}`, 40, 58);
            doc.text(`Dicetak: ${fmtDate(today())} | ${new Date().toLocaleTimeString('id-ID')}`, 40, 72);

            // Summary box
            doc.setFontSize(9);
            doc.setTextColor(30, 40, 60);
            const sumY = 90;
            [
                ['Total Pendapatan (Omset):', fmtRp(totalRevenue)],
                ['Total HPP / Modal:', fmtRp(totalCost)],
                ['Laba Kotor (sebelum beban):', fmtRp(grossProfit)],
                ['Total Beban Operasional:', fmtRp(totalExpenses)],
                ['Laba Bersih:', fmtRp(netProfit)],
            ].forEach(([label, val], i) => {
                const y = sumY + i * 16;
                doc.text(label, 40, y);
                doc.setFont('Helvetica', 'bold');
                if (label.includes('Laba Bersih')) {
                    doc.setTextColor(netProfit >= 0 ? 34 : 220, netProfit >= 0 ? 197 : 38, netProfit >= 0 ? 94 : 38);
                } else if (label.includes('Beban')) {
                    doc.setTextColor(220, 38, 38);
                } else {
                    doc.setTextColor(30, 41, 59);
                }
                doc.text(val, 320, y);
                doc.setFont('Helvetica', 'normal');
                doc.setTextColor(30, 40, 60);
            });

            // Table of transactions
            doc.autoTable({
                head: [['No', 'Tanggal', 'Kategori', 'Kode', 'Item', 'Modal', 'Jual', 'Laba']],
                body: mappedData.map((t, i) => [
                    i + 1,
                    fmtDate(t.date),
                    transactionCategoryLabel(t.category),
                    t.code || '-',
                    t.itemName || '-',
                    fmtRp(t.cost),
                    fmtRp(t.sell),
                    fmtRp(t.sell - t.cost)
                ]),
                foot: [['', '', '', '', 'TOTAL', fmtRp(totalCost), fmtRp(totalRevenue), fmtRp(grossProfit)]],
                startY: sumY + 95,
                styles: { fontSize: 8, cellPadding: 5 },
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                footStyles: { fillColor: [237, 244, 255], textColor: [37, 99, 235], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [250, 251, 252] },
                margin: { left: 40, right: 40 },
            });

            const finalFilename = `laporan-bulanan-${monthKey}.pdf`;
            const nativePlugin = receiptNativePlugin();
            if (nativePlugin) {
                const base64 = (doc.output('datauristring') || '').split('base64,')[1] || '';
                openNativePdfModal(finalFilename, base64);
            } else {
                doc.save(finalFilename);
                toast('PDF Laporan Bulanan berhasil diunduh');
            }
            window.__igoodLastPdfExport = { filename: finalFilename, rows: mappedData.length, title: `Laporan Keuangan Bulanan ${monthLabel}` };
        } catch (e) {
            console.error('exportMonthlyPdf error:', e);
            toast('Gagal membuat PDF: ' + e.message, 'err');
        }
    };

    async function exportMonthlyUnitPdf(monthKey) {
        const dateObj = new Date(`${monthKey}-02`);
        const monthLabel = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        const tableBody = $('monthlyDetailUnitTableBody');
        if (!tableBody || !tableBody.rows.length || tableBody.rows[0].cells.length <= 1) {
            toast('Tidak ada data transaksi unit untuk bulan ini', 'err');
            return;
        }

        toast('Memproses PDF Laporan Unit...', 'info');
        try {
            await loadJsPdfLibrary();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'pt', 'a4');

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(37, 99, 235);
            doc.text('IGOOD - LAPORAN PENJUALAN UNIT BULANAN', 40, 40);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Periode: ${monthLabel}`, 40, 58);
            doc.text(`Dicetak: ${fmtDate(today())} | ${new Date().toLocaleTimeString('id-ID')}`, 40, 72);

            const allTxs = loadTransactions();
            const completedPreorderCodes = new Set(
                allTxs.filter(t => t && t.preorderCode && t.category !== 'preorder_dp').map(t => t.preorderCode)
            );
            let unitTxs = allTxs.filter(tx => {
                if (!tx || !tx.date || !tx.date.startsWith(monthKey)) return false;
                if (tx.category === 'preorder_dp' && completedPreorderCodes.has(tx.code)) return false;
                return tx.category === 'unit_iphone' || tx.category === 'unit_android' || tx.category === 'tukar_tambah';
            });

            const search = ($('searchMonthlyUnitDetail')?.value || '').toLowerCase();
            if (search) {
                const devices = load(DB_KEYS.devices) || [];
                unitTxs = unitTxs.filter(tx => {
                    const unit = devices.find(d => d.code === tx.stockRefCode);
                    const model = (unit?.model || tx.itemName || '').toLowerCase();
                    const code = (tx.stockRefCode || tx.code || '').toLowerCase();
                    const buyer = (tx.buyerName || '').toLowerCase();
                    const sales = (tx.salesName || tx.technician || '').toLowerCase();
                    const acq = (unit?.acquisition || '').toLowerCase();
                    return model.includes(search) || code.includes(search) || buyer.includes(search) || sales.includes(search) || acq.includes(search);
                });
            }

            const devices = load(DB_KEYS.devices) || [];
            let grandCost = 0;
            let grandSell = 0;
            let grandCash = 0;
            let grandTransfer = 0;
            let grandKredit = 0;
            let grandProfit = 0;

            unitTxs.forEach(tx => {
                const unit = devices.find(d => d.code === tx.stockRefCode);
                const unitCost = Number(unit?.cost) || Number(tx.cost) || 0;
                const unitSell = (tx.preorderCode && tx.category !== 'preorder_dp') ? (Number(tx.sell) || 0) : getTxNetSell(tx);
                const pTotals = paymentTotals(tx);
                const bonuses = tx.bonusAccessories || [];
                const totalBonusCost = bonuses.reduce((sum, b) => sum + ((Number(b.cost) || 0) * (Number(b.quantity) || 0)), 0);
                const profitVal = unitSell - unitCost - totalBonusCost;

                grandCost += unitCost;
                grandSell += unitSell;
                grandCash += pTotals.cash;
                grandTransfer += pTotals.transfer;
                grandKredit += pTotals.kredit;
                grandProfit += profitVal;
            });

            const tempTable = document.createElement('table');
            tempTable.innerHTML = `
                <thead>
                    <tr>
                        <th>No</th><th>Model</th><th>Kode Unit</th><th>Storage</th><th>Warna</th><th>Kondisi</th><th>Garansi</th><th>Modal</th><th>Jual</th>
                        <th>Bonus Kat</th><th>Bonus Brand</th><th>Bonus Detail</th><th>Bonus Modal</th><th>Bonus Qty</th>
                        <th>Pembeli</th><th>Penjual</th><th>Status</th><th>Tgl Beli</th><th>Tgl Jual</th>
                        <th>Cash</th><th>Transfer</th><th>Kredit</th><th>Split Info</th><th>Laba</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableBody.innerHTML}
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="7" style="text-align: right;">TOTAL UNIT SALES:</td>
                        <td style="text-align: right;">${fmtRp(grandCost)}</td>
                        <td style="text-align: right;">${fmtRp(grandSell)}</td>
                        <td colspan="10"></td>
                        <td style="text-align: right;">${fmtRp(grandCash)}</td>
                        <td style="text-align: right;">${fmtRp(grandTransfer)}</td>
                        <td style="text-align: right;">${fmtRp(grandKredit)}</td>
                        <td></td>
                        <td style="text-align: right;">${fmtRp(grandProfit)}</td>
                    </tr>
                </tfoot>
            `;

            doc.autoTable({
                html: tempTable,
                startY: 90,
                styles: { fontSize: 5.5, cellPadding: 2, overflow: 'linebreak' },
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', halign: 'center' },
                footStyles: { fillColor: [237, 244, 255], textColor: [37, 99, 235], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [250, 251, 252] },
                margin: { left: 20, right: 20 }
            });

            const finalFilename = `laporan-unit-${monthKey}.pdf`;
            const nativePlugin = receiptNativePlugin();
            if (nativePlugin) {
                const base64 = (doc.output('datauristring') || '').split('base64,')[1] || '';
                openNativePdfModal(finalFilename, base64);
            } else {
                doc.save(finalFilename);
                toast('PDF Laporan Unit berhasil diunduh');
            }
            window.__igoodLastPdfExport = { filename: finalFilename, rows: unitTxs.length, title: `Laporan Bulanan Unit - ${monthLabel}` };
        } catch (e) {
            console.error('exportMonthlyUnitPdf error:', e);
            toast('Gagal mengekspor PDF', 'err');
        }
    }

    // ─── Beban Operasional Functions ──────────────────────────────────────────

    function getMonthGrossProfit(monthKey) {
        const allTxs = loadTransactions();
        const completedPreorderCodes = new Set(
            allTxs.filter(t => t && t.preorderCode && t.category !== 'preorder_dp').map(t => t.preorderCode)
        );
        const txs = allTxs.filter(tx => {
            if (!tx || !tx.date || !tx.date.startsWith(monthKey)) return false;
            if (tx.category === 'preorder_dp' && completedPreorderCodes.has(tx.code)) return false;
            return true;
        });
        let revenue = 0, cost = 0;
        txs.forEach(tx => {
            const sell = (tx.preorderCode && tx.category !== 'preorder_dp') ? (Number(tx.sell) || 0) : getTxNetSell(tx);
            let c = 0;
            if (['unit_iphone','unit_android','tukar_tambah'].includes(tx.category)) {
                const tradeAdj = tx.category === 'tukar_tambah' ? (Number(tx.tradeInCost) || 0) : 0;
                c = Math.max(0, (tx.cost || 0) - tradeAdj) + (tx.bonusCost || 0);
            } else if (tx.category === 'service' || tx.category === 'service_keluar') {
                c = Number(tx.fee) || Number(tx.cost) || 0;
            } else {
                c = Number(tx.cost) || 0;
            }
            revenue += sell;
            cost += c;
        });
        return { revenue, cost, grossProfit: revenue - cost };
    }

    function renderSmartInventoryPanel() {
        const allAccs = load(DB_KEYS.accessories) || [];
        const lowAccs = allAccs.filter(a => Number(a.qty) <= 3);
        lowAccs.sort((a, b) => Number(a.qty) - Number(b.qty));

        const kpiLowAcc = $('smartKpiLowAccCount');
        if (kpiLowAcc) kpiLowAcc.textContent = lowAccs.length;
        
        const lowAccText = $('smartLowAccText');
        if (lowAccText) {
            lowAccText.textContent = lowAccs.length > 0 
                ? `${lowAccs.length} item stok kritis ditemukan` 
                : 'Semua stok aksesoris aman';
        }

        const accTbody = $('smartLowAccTableBody');
        if (accTbody) {
            if (lowAccs.length === 0) {
                accTbody.innerHTML = '<tr><td colspan="5" class="text-dim" style="text-align: center; padding: 20px;"><i class="ri-checkbox-circle-line" style="color: var(--success); font-size: 16px; vertical-align: middle;"></i> Semua stok aksesoris aman dan mencukupi</td></tr>';
            } else {
                accTbody.innerHTML = lowAccs.map(a => {
                    const qty = Number(a.qty) || 0;
                    const statusLabel = qty === 0 
                        ? '<span class="badge badge-danger">Habis</span>' 
                        : '<span class="badge badge-warning">Kritis</span>';
                    return `<tr>
                        <td class="mono font-bold text-sm">${esc(a.code)}</td>
                        <td class="text-sm">${esc(a.name)}</td>
                        <td class="mono font-bold text-sm" style="color: ${qty === 0 ? 'var(--danger)' : 'var(--warning)'};">${qty} pcs</td>
                        <td class="mono text-sm" style="text-align: right;">${fmtRp(a.sell)}</td>
                        <td>${statusLabel}</td>
                    </tr>`;
                }).join('');
            }
        }

        const getDaysDiff = (dateStr) => {
            if (!dateStr) return 0;
            const now = new Date();
            const parts = dateStr.split('-');
            if (parts.length !== 3) return 0;
            const pDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            now.setHours(0, 0, 0, 0);
            pDate.setHours(0, 0, 0, 0);
            const diffTime = now.getTime() - pDate.getTime();
            return Math.floor(diffTime / (1000 * 60 * 60 * 24));
        };

        const allDevices = load(DB_KEYS.devices) || [];
        const availableDevices = allDevices.filter(d => d.status === 'Available');
        
        const agingDevices = availableDevices.map(d => {
            const ageDays = getDaysDiff(d.purchaseDate);
            return { device: d, ageDays };
        }).filter(item => item.ageDays > 30);

        agingDevices.sort((a, b) => b.ageDays - a.ageDays);

        const totalAgingCost = agingDevices.reduce((sum, item) => sum + (Number(item.device.cost) || 0), 0);

        const kpiAgingCount = $('smartKpiAgingDeviceCount');
        if (kpiAgingCount) kpiAgingCount.textContent = agingDevices.length;

        const kpiAgingValue = $('smartKpiAgingValue');
        if (kpiAgingValue) kpiAgingValue.textContent = fmtRp(totalAgingCost);

        const agingDeviceText = $('smartAgingDeviceText');
        if (agingDeviceText) {
            agingDeviceText.textContent = agingDevices.length > 0 
                ? `${agingDevices.length} unit HP mengendap > 30 hari` 
                : 'Tidak ada unit HP yang mengendap';
        }

        const devTbody = $('smartAgingDeviceTableBody');
        if (devTbody) {
            if (agingDevices.length === 0) {
                devTbody.innerHTML = '<tr><td colspan="6" class="text-dim" style="text-align: center; padding: 20px;"><i class="ri-checkbox-circle-line" style="color: var(--success); font-size: 16px; vertical-align: middle;"></i> Tidak ada unit HP yang mengendap lebih dari 30 hari</td></tr>';
            } else {
                devTbody.innerHTML = agingDevices.map(item => {
                    const d = item.device;
                    const displayName = `${d.brand || ''} ${d.model || ''} ${d.storage || ''} ${d.color ? `(${d.color})` : ''} ${d.condition === 'new' ? 'New' : 'Bekas'}`;
                    return `<tr>
                        <td class="mono font-bold text-sm">${esc(d.code)}</td>
                        <td class="text-sm">${esc(displayName)}</td>
                        <td class="text-sm">${d.purchaseDate ? fmtDate(d.purchaseDate) : '-'}</td>
                        <td class="mono font-bold text-sm" style="color: var(--warning);">${item.ageDays} hari</td>
                        <td class="mono text-sm" style="text-align: right; color: var(--text-muted);">${fmtRp(d.cost)}</td>
                        <td class="mono text-sm" style="text-align: right; font-weight: 500;">${fmtRp(d.sell || 0)}</td>
                    </tr>`;
                }).join('');
            }
        }

        const txs = loadTransactions() || [];
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const recentTxs = txs.filter(tx => {
            if (!tx.date) return false;
            const parts = tx.date.split('-');
            if (parts.length !== 3) return false;
            const txDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            return txDate >= thirtyDaysAgo;
        });

        const hpCounts = {};
        const accCounts = {};

        recentTxs.forEach(tx => {
            const name = tx.itemName || 'Item';
            const qty = Number(tx.quantity) || 1;

            if (tx.category === 'unit_iphone' || tx.category === 'unit_android') {
                let cleanName = name;
                if (cleanName.includes('(TT:')) {
                    cleanName = cleanName.split('(TT:')[0].trim();
                }
                hpCounts[cleanName] = (hpCounts[cleanName] || 0) + qty;
            } else if (tx.category === 'accessory') {
                accCounts[name] = (accCounts[name] || 0) + qty;
            }
        });

        const topHPs = Object.keys(hpCounts).map(name => ({ name, qty: hpCounts[name] }));
        topHPs.sort((a, b) => b.qty - a.qty);
        const top5HPs = topHPs.slice(0, 5);

        const topAccs = Object.keys(accCounts).map(name => ({ name, qty: accCounts[name] }));
        topAccs.sort((a, b) => b.qty - a.qty);
        const top5Accs = topAccs.slice(0, 5);

        const hpTbody = $('smartTopDevicesTableBody');
        if (hpTbody) {
            if (top5HPs.length === 0) {
                hpTbody.innerHTML = '<tr><td colspan="3" class="text-dim" style="text-align: center; padding: 15px;">Belum ada penjualan unit HP dalam 30 hari terakhir</td></tr>';
            } else {
                hpTbody.innerHTML = top5HPs.map((item, index) => {
                    const rankClass = index === 0 ? 'smart-rank-1' : (index === 1 ? 'smart-rank-2' : (index === 2 ? 'smart-rank-3' : 'smart-rank-other'));
                    return `<tr>
                        <td style="text-align: center; width: 40px;">
                            <span class="smart-rank-badge ${rankClass}">${index + 1}</span>
                        </td>
                        <td class="text-sm font-semibold">${esc(item.name)}</td>
                        <td class="mono font-bold text-sm" style="text-align: center;"><span class="badge badge-primary" style="font-size:11px; padding:2px 8px;">${item.qty} unit</span></td>
                    </tr>`;
                }).join('');
            }
        }

        const accTopTbody = $('smartTopAccTableBody');
        if (accTopTbody) {
            if (top5Accs.length === 0) {
                accTopTbody.innerHTML = '<tr><td colspan="3" class="text-dim" style="text-align: center; padding: 15px;">Belum ada penjualan aksesoris dalam 30 hari terakhir</td></tr>';
            } else {
                accTopTbody.innerHTML = top5Accs.map((item, index) => {
                    const rankClass = index === 0 ? 'smart-rank-1' : (index === 1 ? 'smart-rank-2' : (index === 2 ? 'smart-rank-3' : 'smart-rank-other'));
                    return `<tr>
                        <td style="text-align: center; width: 40px;">
                            <span class="smart-rank-badge ${rankClass}">${index + 1}</span>
                        </td>
                        <td class="text-sm font-semibold">${esc(item.name)}</td>
                        <td class="mono font-bold text-sm" style="text-align: center;"><span class="badge badge-ok" style="font-size:11px; padding:2px 8px;">${item.qty} pcs</span></td>
                    </tr>`;
                }).join('');
            }
        }
    }

    function renderExpensesPanel() {
        const monthKey = activeExpenseMonth || today().slice(0, 7);
        activeExpenseMonth = monthKey;

        // Sync month input
        const monthInput = $('expenseMonthSelect');
        if (monthInput && monthInput.value !== monthKey) monthInput.value = monthKey;

        const expenses = loadExpenses().filter(e => e.month === monthKey);
        expenses.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

        const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const { revenue, grossProfit } = getMonthGrossProfit(monthKey);
        const netProfit = grossProfit - totalExpense;

        // Update KPI cards
        const kpiBeban = $('expenseKpiBeban');
        const kpiKotor = $('expenseKpiKotor');
        const kpiBersih = $('expenseKpiBersih');
        const kpiRevenue = $('expenseKpiRevenue');
        if (kpiBeban) kpiBeban.textContent = fmtRp(totalExpense);
        if (kpiKotor) kpiKotor.textContent = fmtRp(grossProfit);
        if (kpiBersih) {
            kpiBersih.textContent = fmtRp(netProfit);
            kpiBersih.style.color = netProfit >= 0 ? 'var(--success)' : 'var(--danger)';
        }
        if (kpiRevenue) kpiRevenue.textContent = fmtRp(revenue);

        // Render table
        const tbody = $('expenseTableBody');
        if (!tbody) return;
        if (!expenses.length) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-dim" style="padding: 24px;">Belum ada beban operasional untuk bulan ini.</td></tr>`;
            return;
        }

        const catBadgeMap = {
            gaji: { label: 'Gaji Karyawan', icon: 'ri-user-star-line', bg: '#eff6ff', color: '#2563eb' },
            sewa: { label: 'Sewa Toko', icon: 'ri-store-2-line', bg: '#f5f3ff', color: '#7c3aed' },
            listrik: { label: 'Listrik & Utilitas', icon: 'ri-flashlight-line', bg: '#fffbeb', color: '#d97706' },
            internet: { label: 'Internet', icon: 'ri-wifi-line', bg: '#f0fdfa', color: '#0d9488' },
            transportasi: { label: 'Transportasi', icon: 'ri-truck-line', bg: '#fff7ed', color: '#ea580c' },
            pembelian: { label: 'Perlengkapan', icon: 'ri-shopping-cart-line', bg: '#ecfdf5', color: '#059669' },
            iklan: { label: 'Iklan & Promosi', icon: 'ri-megaphone-line', bg: '#fff1f2', color: '#e11d48' },
            lainnya: { label: 'Lain-lain', icon: 'ri-more-line', bg: '#f8fafc', color: '#64748b' }
        };

        tbody.innerHTML = expenses.map((e, i) => {
            const catInfo = catBadgeMap[e.category] || { label: e.category || 'Lainnya', icon: 'ri-file-list-line', bg: '#f8fafc', color: '#64748b' };
            const catBadge = `<span class="expense-cat-badge" style="background:${catInfo.bg};color:${catInfo.color};"><i class="${catInfo.icon}"></i> ${esc(catInfo.label)}</span>`;
            return `<tr>
                <td class="mono text-xs text-dim" style="text-align:center;">${i + 1}</td>
                <td class="text-sm font-medium">${fmtDate(e.date)}</td>
                <td>${catBadge}</td>
                <td class="text-sm text-dim">${esc(e.description || '-')}</td>
                <td class="mono font-bold text-sm" style="text-align:right; color:var(--danger);">${fmtRp(e.amount)}</td>
                <td style="text-align:center;">
                    <button class="btn-icon" title="Hapus" onclick="deleteExpense('${esc(e.id)}')" style="color:var(--danger);font-size:14px; width:28px; height:28px;"><i class="ri-delete-bin-line"></i></button>
                </td>
            </tr>`;
        }).join('') + `<tr style="background:#f8fafc;font-weight:700;border-top:1.5px solid var(--border);">
            <td colspan="4" style="padding:10px 14px;text-align:right;color:var(--text);font-size:12px;letter-spacing:0.02em;">TOTAL BEBAN OPERASIONAL:</td>
            <td class="mono" style="text-align:right;padding:10px 14px;color:var(--danger);font-size:14px;font-weight:800;">${fmtRp(totalExpense)}</td>
            <td></td>
        </tr>`;
    }

    window.deleteExpense = function(id) {
        const targetId = String(id || '').trim();
        if (!targetId) return;
        const expenses = loadExpenses();
        const exp = expenses.find(e => String(e.id) === targetId);

        showAdminDeleteConfirmModal({
            title: 'Hapus Beban Operasional?',
            desc: 'Beban operasional ini akan dihapus permanen dari laporan keuangan dan database server.',
            detailsHtml: exp ? `
                <div style="font-weight: 700; color: var(--text); margin-bottom: 6px; font-size: 13px;">${esc(exp.description || exp.name || 'Beban Operasional')}</div>
                <div style="color: var(--text-dim); display: grid; grid-template-columns: auto 1fr; gap: 3px 8px;">
                    <span>Kategori:</span> <span>${esc(exp.category || '-')}</span>
                    <span>Nominal:</span> <strong style="color: var(--danger);">${fmtRp(exp.amount)}</strong>
                    <span>Tanggal:</span> <span>${fmtDate(exp.date)}</span>
                </div>
            ` : `<div>ID: <strong>${esc(targetId)}</strong></div>`,
            onConfirm: () => {
                const pendingQueue = load(DB_KEYS.pendingPushQueue) || [];
                save(DB_KEYS.pendingPushQueue, pendingQueue.filter(q => !(q.tableKey === 'expenses' && String(q.idValue) === targetId)));
                queueRecordSupabaseDelete('expenses', 'id', targetId);
                const updated = (loadExpenses() || []).filter(e => String(e.id) !== targetId);
                saveExpenses(updated);
                renderExpensesPanel();
                if (typeof refreshDashboard === 'function') refreshDashboard();
                toast('Beban operasional berhasil dihapus', 'ok');
            }
        });
    };

    async function exportExpensesPdf(monthKey) {
        const expenses = loadExpenses().filter(e => e.month === monthKey);
        if (expenses.length === 0) {
            toast('Tidak ada data beban operasional untuk bulan ini', 'err');
            return;
        }
        const totalExpense = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const { revenue, cost, grossProfit } = getMonthGrossProfit(monthKey);
        const netProfit = grossProfit - totalExpense;
        const dateObj = new Date(`${monthKey}-02`);
        const monthLabel = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        toast('Memproses PDF Beban Operasional...', 'info');
        try {
            await loadJsPdfLibrary();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'pt', 'a4');

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(37, 99, 235);
            doc.text('IGOOD — BEBAN OPERASIONAL', 40, 40);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(`Periode: ${monthLabel}`, 40, 58);
            doc.text(`Dicetak: ${fmtDate(today())} | ${new Date().toLocaleTimeString('id-ID')}`, 40, 72);

            // Summary box
            doc.setFontSize(9);
            doc.setTextColor(30, 40, 60);
            const sumY = 90;
            [
                ['Total Pendapatan:', fmtRp(revenue)],
                ['Laba Kotor (Pendapatan - HPP):', fmtRp(grossProfit)],
                ['Total Beban Operasional:', fmtRp(totalExpense)],
                ['Laba Bersih:', fmtRp(netProfit)],
            ].forEach(([label, val], i) => {
                const y = sumY + i * 16;
                doc.text(label, 40, y);
                doc.setFont('Helvetica', 'bold');
                doc.setTextColor(netProfit < 0 && label.includes('Bersih') ? 200 : 30, netProfit < 0 && label.includes('Bersih') ? 50 : 130, 70);
                doc.text(val, 300, y);
                doc.setFont('Helvetica', 'normal');
                doc.setTextColor(30, 40, 60);
            });

            doc.autoTable({
                head: [['No', 'Tanggal', 'Kategori', 'Keterangan', 'Nominal']],
                body: expenses.map((e, i) => [
                    i + 1,
                    fmtDate(e.date),
                    EXPENSE_CATEGORIES.find(c => c.value === e.category)?.label || e.category,
                    e.description || '-',
                    fmtRp(e.amount),
                ]),
                foot: [['', '', '', 'TOTAL', fmtRp(totalExpense)]],
                startY: sumY + 75,
                styles: { fontSize: 8, cellPadding: 5 },
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                footStyles: { fillColor: [237, 244, 255], textColor: [37, 99, 235], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [250, 251, 252] },
                margin: { left: 40, right: 40 },
            });

            const finalFilename = `beban-operasional-${monthKey}.pdf`;
            const nativePlugin = receiptNativePlugin();
            if (nativePlugin) {
                const base64 = (doc.output('datauristring') || '').split('base64,')[1] || '';
                openNativePdfModal(finalFilename, base64);
            } else {
                doc.save(finalFilename);
                toast('PDF Beban Operasional berhasil diunduh');
            }
            window.__igoodLastPdfExport = { filename: finalFilename, rows: expenses.length, title: `Beban Operasional ${monthLabel}` };
        } catch (e) {
            console.error('exportExpensesPdf error:', e);
            toast('Gagal membuat PDF: ' + e.message, 'err');
        }
    }

    window.editTransaction = function (id) {
        const transactions = loadTransactions();
        const tx = transactions.find(item => item.id === id);
        if (!tx) return;

        if (window.navigator.webdriver || window.__playwright_active__) {
            const buyerName = promptText('Nama pembeli', tx.buyerName || '');
            if (buyerName == null) return;
            const buyerWa = promptText('No. WA pembeli', tx.buyerWa || '');
            if (buyerWa == null) return;
            const itemName = promptText('Nama item', tx.itemName || '');
            if (itemName == null) return;
            const sell = promptText('Total jual Rp', tx.sell || 0);
            if (sell == null) return;
            const paymentMethod = promptText('Metode bayar', tx.paymentMethod || 'cash');
            if (paymentMethod == null) return;

            const sellVal = cleanRp(sell) || Number(sell) || 0;
            let netSellVal = sellVal;
            if (tx.preorderCode && tx.category !== 'preorder_dp') {
                const preorder = loadPreorders().find(p => p.code === tx.preorderCode);
                if (preorder) {
                    const dp = Number(preorder.dpAmount) || 0;
                    netSellVal = Math.max(0, sellVal - dp);
                }
            }

            Object.assign(tx, {
                buyerName,
                buyerWa: normalizePhoneWa(buyerWa),
                itemName,
                sell: sellVal,
                paymentMethod,
                splitCash: paymentMethod === 'cash' ? netSellVal : 0,
                splitTransfer: paymentMethod === 'transfer' ? netSellVal : 0,
                splitCredit: paymentMethod === 'kredit' ? netSellVal : 0,
                updatedAt: new Date().toISOString(),
            });
            saveTransactions(transactions);
            queueSaleSupabaseSync(tx);
            renderReportsLog();
            renderDailyReport();
            refreshDashboard();
            toast('Transaksi diedit');
            return;
        }

        showEditModal('transaction', tx, (updatedData) => {
            const sellVal = cleanRp(updatedData.sell) || Number(updatedData.sell) || 0;
            let netSellVal = sellVal;
            if (tx.preorderCode && tx.category !== 'preorder_dp') {
                const preorder = loadPreorders().find(p => p.code === tx.preorderCode);
                if (preorder) {
                    const dp = Number(preorder.dpAmount) || 0;
                    netSellVal = Math.max(0, sellVal - dp);
                }
            }

            const assignObj = {
                buyerName: updatedData.buyerName,
                buyerWa: normalizePhoneWa(updatedData.buyerWa),
                itemName: updatedData.itemName,
                sell: sellVal,
                paymentMethod: updatedData.paymentMethod,
                splitCash: updatedData.paymentMethod === 'cash' ? netSellVal : 0,
                splitTransfer: updatedData.paymentMethod === 'transfer' ? netSellVal : 0,
                splitCredit: updatedData.paymentMethod === 'kredit' ? netSellVal : 0,
                updatedAt: new Date().toISOString(),
            };

            if (tx.category === 'order_jasa' || tx.category === 'order_jasa_beacukai') {
                Object.assign(assignObj, {
                    jasaCategory: updatedData.jasaCategory,
                    jasaUnitName: updatedData.jasaUnitName,
                    jasaWarranty: updatedData.jasaWarranty,
                    jasaImei: updatedData.jasaImei,
                    jasaNote: updatedData.jasaNote,
                    status: updatedData.status,
                    serviceStatus: updatedData.serviceStatus,
                    code: updatedData.code,
                    imei: updatedData.imei
                });
            }

            Object.assign(tx, assignObj);
            saveTransactions(transactions);
            queueSaleSupabaseSync(tx);
            renderReportsLog();
            renderDailyReport();
            refreshDashboard();
            refreshAllAdminPanels();
            toast('Transaksi diedit');
            return true;
        });
    };

    function nextOtherCode() {
        const existing = load(DB_KEYS.otherCatalog).map(o => o.code).filter(c => String(c || '').startsWith('O'));
        const maxSeq = existing.reduce((max, code) => Math.max(max, Number(String(code).slice(1)) || 0), 0);
        return 'O' + String(maxSeq + 1).padStart(3, '0');
    }

    function renderOtherCatalog() {
        const tbody = $('otherCatalogTableBody');
        if (!tbody) return;
        const search = ($('searchAdminOther')?.value || '').toLowerCase();
        let items = load(DB_KEYS.otherCatalog);
        if (search) {
            items = items.filter(o => 
                `${o.code}${o.name}${o.note || ''}`.toLowerCase().includes(search)
            );
        }
        tbody.innerHTML = items.length
            ? items.map(o => `<tr>
                <td data-label="Kode" class="mono text-sm">${esc(o.code)}</td>
                <td data-label="Nama Item">${esc(o.name)}</td>
                <td data-label="Harga Jual" class="price">${fmtRp(o.sell)}</td>
                <td data-label="Keterangan" class="text-sm text-dim">${esc(o.note || '-')}</td>
                <td><div class="row-actions"><button class="btn-icon btn-edit" data-edit-other="${esc(o.code)}" onclick="editOtherCatalog('${esc(o.code)}')"><i class="ri-edit-2-line"></i></button><button class="btn-del" onclick="deleteOtherCatalog('${esc(o.code)}')"><i class="ri-delete-bin-6-line"></i></button></div></td>
            </tr>`).join('')
            : '<tr><td colspan="5" class="text-dim" style="text-align:center;">Tidak ada item</td></tr>';
    }

    window.editOtherCatalog = function (code) {
        const items = load(DB_KEYS.otherCatalog);
        const item = items.find(o => o.code === code);
        if (!item) return;

        if (window.navigator.webdriver || window.__playwright_active__) {
            const name = promptText('Nama item', item.name || '');
            if (name == null) return;
            const sell = promptText('Harga jual Rp', item.sell || 0);
            if (sell == null) return;
            const note = promptText('Catatan', item.note || '');
            if (note == null) return;
            const tempItem = {
                ...item,
                name,
                sell: cleanRp(sell) || Number(sell) || 0,
                note,
                updatedAt: new Date().toISOString()
            };
            Object.assign(item, tempItem);
            save(DB_KEYS.otherCatalog, items);
            queueRecordSupabaseSync('otherCatalog', tempItem);
            renderOtherCatalog();
            renderActiveSaleForm();
            toast(`Item ${code} diedit`);
            return;
        }

        showEditModal('other', item, (updatedData) => {
            if (updatedData.code !== item.code) {
                if (items.some(o => o.code === updatedData.code)) {
                    toast('Kode item sudah ada!', 'err');
                    return false;
                }
            }
            const tempItem = {
                ...item,
                code: updatedData.code,
                name: updatedData.name,
                sell: cleanRp(updatedData.sell) || Number(updatedData.sell) || 0,
                note: updatedData.note,
                updatedAt: new Date().toISOString()
            };

            if (item.code !== tempItem.code) {
                queueRecordSupabaseDelete('otherCatalog', 'code', item.code);
            }
            Object.assign(item, tempItem);
            save(DB_KEYS.otherCatalog, items);
            queueRecordSupabaseSync('otherCatalog', tempItem);
            renderOtherCatalog();
            renderActiveSaleForm();
            toast(`Item ${item.code} diedit`);
            return true;
        });
    };

    window.deleteOtherCatalog = function (code) {
        const targetCode = String(code || '').trim();
        if (!targetCode) return;
        const items = load(DB_KEYS.otherCatalog) || [];
        const item = items.find(i => i.code === targetCode);

        showAdminDeleteConfirmModal({
            title: 'Hapus Item Katalog Lainnya?',
            desc: 'Item ini akan dihapus permanen dari katalog lainnya dan server database.',
            detailsHtml: item ? `
                <div style="font-weight: 700; color: var(--text); margin-bottom: 6px; font-size: 13px;">${esc(item.name)}</div>
                <div style="color: var(--text-dim); display: grid; grid-template-columns: auto 1fr; gap: 3px 8px;">
                    <span>Kode:</span> <span class="mono" style="font-weight: 700; color: var(--primary);">${esc(item.code)}</span>
                    <span>Kategori:</span> <span>${esc(item.category || '-')}</span>
                    <span>Harga Jual:</span> <strong>${fmtRp(item.sell)}</strong>
                </div>
            ` : `<div>Kode: <strong>${esc(targetCode)}</strong></div>`,
            onConfirm: () => {
                const pendingQueue = load(DB_KEYS.pendingPushQueue) || [];
                save(DB_KEYS.pendingPushQueue, pendingQueue.filter(q => !(q.tableKey === 'otherCatalog' && String(q.idValue) === targetCode)));
                queueRecordSupabaseDelete('otherCatalog', 'code', targetCode);
                const updated = (load(DB_KEYS.otherCatalog) || []).filter(o => o.code !== targetCode);
                save(DB_KEYS.otherCatalog, updated);
                renderOtherCatalog();
                if (typeof renderActiveSaleForm === 'function') renderActiveSaleForm();
                toast('Item katalog berhasil dihapus', 'ok');
            }
        });
    };

    function renderPreorders() {
        const tbody = $('preorderRequestsTableBody');
        if (!tbody) return;
        const search = ($('searchAdminPreorder')?.value || '').toLowerCase();
        const filter = $('filterAdminPreorderStatus')?.value || 'Preorder';
        
        let preorders = loadPreorders();
        if (filter !== 'all') {
            preorders = preorders.filter(p => (p.status || 'Preorder') === filter);
        }
        if (search) {
            preorders = preorders.filter(p => 
                `${p.code}${p.buyerName || ''}${p.buyerWa || ''}${p.requestedItem || ''}${p.brand || ''}${p.model || ''}${p.salesName || ''}`
                .toLowerCase().includes(search)
            );
        }
        preorders.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        
        if (!preorders.length) {
            tbody.innerHTML = '<div class="empty-state-text text-dim" style="text-align:center; padding: 24px; background:#fff; border-radius: var(--r-sm); border:1px dashed var(--border);">Tidak ada request preorder</div>';
            return;
        }
        tbody.innerHTML = preorders.map(item => {
            const status = item.status || 'Preorder';
            const isPreorder = status === 'Preorder';
            const disabledAttr = !isPreorder ? 'disabled' : '';
            
            let statusBadge = '<span class="badge badge-warn">Preorder</span>';
            if (status === 'Ready') {
                statusBadge = '<span class="badge badge-ok">Ready</span>';
            } else if (status === 'Done') {
                statusBadge = '<span class="badge badge-purple">Done</span>';
            } else if (status === 'Cancel') {
                statusBadge = '<span class="badge badge-danger">Cancel</span>';
            }
            
            let statusSelectHtml = '';
            if (isPreorder) {
                statusSelectHtml = `
                    <select id="preorderStatus-${esc(item.code)}" class="text-sm" style="width: 100%; padding: 6px; border-radius: 6px;" onchange="this.className = 'text-sm ' + (this.value === 'Ready' ? 'preorder-status-ready' : 'preorder-status-preorder')">
                        <option value="Preorder" ${status === 'Preorder' ? 'selected' : ''}>Preorder</option>
                        <option value="Ready" ${status === 'Ready' ? 'selected' : ''}>Ready</option>
                    </select>
                `;
            } else {
                statusSelectHtml = `
                    <select id="preorderStatus-${esc(item.code)}" class="text-sm" style="width: 100%; padding: 6px; border-radius: 6px;" disabled>
                        <option value="${status}" selected>${status}</option>
                    </select>
                `;
            }

            const itemTitle = `${esc(item.buyerName || 'Preorder')} — ${esc(item.requestedItem || [item.brand, item.model].filter(Boolean).join(' ') || 'Unit')}`;

            return `
            <div class="stock-accordion-card" id="preorder-card-${esc(item.code)}">
                <div class="stock-card-header" onclick="toggleStockCard(this)">
                    <div class="stock-card-left">
                        <span class="stock-card-code">${esc(item.code)}</span>
                        <span class="stock-card-name" title="${itemTitle}">${itemTitle}</span>
                    </div>
                    <div class="stock-card-right">
                        ${statusBadge}
                        <i class="ri-arrow-down-s-line stock-expand-icon"></i>
                    </div>
                </div>
                <div class="stock-card-body">
                    <div class="stock-grid-details">
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Tanggal</span>
                            <span class="stock-detail-val">${esc(fmtDate(item.date))}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Nama User</span>
                            <span class="stock-detail-val font-bold">${esc(item.buyerName || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">No. WA</span>
                            <span class="stock-detail-val mono">${esc(item.buyerWa || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Sales</span>
                            <span class="stock-detail-val">${esc(item.salesName || '-')}</span>
                        </div>
                        <div class="stock-detail-item" style="grid-column: span 2;">
                            <span class="stock-detail-label">Request Item</span>
                            <span class="stock-detail-val font-bold" style="color:var(--primary);">${esc(item.requestedItem || [item.brand, item.model].filter(Boolean).join(' ') || '-')}</span>
                        </div>
                        <div class="stock-detail-item" style="grid-column: span 2;">
                            <span class="stock-detail-label">Spesifikasi</span>
                            <span class="stock-detail-val">${esc([item.brand, item.model, item.storage, item.color, item.condition, item.warranty].filter(Boolean).join(' | ') || item.note || item.requestedItem || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">DP & Pembayaran</span>
                            <span class="stock-detail-val font-bold" style="color:var(--success);">${esc(fmtRp(item.dpAmount || 0))} (${esc(paymentLabel(item.paymentMethod))})</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Unit Link</span>
                            <span class="stock-detail-val mono font-bold" style="color:var(--primary);">${item.linkedUnitCode ? esc(item.linkedUnitCode) : '-'}</span>
                        </div>
                    </div>

                    <div class="preorder-admin-box">
                        <div class="preorder-admin-title">
                            <i class="ri-settings-3-line"></i> Input Modal &amp; Status Ready Admin
                        </div>
                        <div class="form-grid cols-3" style="gap: 10px;">
                            <div class="field">
                                <label style="font-size: 11px; margin-bottom: 3px;">Modal Rp</label>
                                <div style="display:flex; align-items:center; background:#ffffff; border:1px solid var(--border); border-radius:6px; overflow:hidden;">
                                    <span style="font-size:11px; font-weight:700; color:var(--text-dim); padding: 0 6px; background:#f1f5f9; border-right:1px solid var(--border); line-height:28px;">Rp</span>
                                    <input type="text" inputmode="numeric" id="preorderCost-${esc(item.code)}" value="${item.cost ? Number(item.cost).toLocaleString('id-ID') : ''}" placeholder="0" style="border:none; padding:4px 8px; font-size:12.5px; width:100%;" ${disabledAttr}>
                                </div>
                            </div>
                            <div class="field">
                                <label style="font-size: 11px; margin-bottom: 3px;">IMEI Unit</label>
                                <input type="text" id="preorderImei-${esc(item.code)}" value="${esc(item.imei || '')}" placeholder="Ketik IMEI unit ready..." style="padding:5px 8px; font-size:12.5px; border-radius:6px; background:#ffffff;" ${disabledAttr}>
                            </div>
                            <div class="field">
                                <label style="font-size: 11px; margin-bottom: 3px;">Status Preorder</label>
                                ${statusSelectHtml}
                            </div>
                        </div>
                    </div>

                    <div class="stock-card-actions">
                        ${status === 'Done' ? `<span class="badge badge-purple" style="font-size:12px; padding:4px 10px;">Selesai (Lunas)</span>` : `
                            <button type="button" class="btn btn-sm btn-ghost btn-edit" onclick="event.stopPropagation(); editPreorderAdmin('${esc(item.code)}')" title="Edit Preorder">
                                <i class="ri-edit-2-line"></i> Edit
                            </button>
                            <button type="button" class="btn btn-sm btn-primary" data-preorder-action="save" data-code="${esc(item.code)}" onclick="event.stopPropagation(); savePreorderAdmin('${esc(item.code)}')">
                                <i class="ri-save-line"></i> Simpan
                            </button>
                            <button type="button" class="btn btn-sm btn-danger-soft btn-del" onclick="event.stopPropagation(); deletePreorderAdmin('${esc(item.code)}')" title="Hapus Preorder">
                                <i class="ri-delete-bin-6-line"></i>
                            </button>
                        `}
                    </div>
                </div>
            </div>`;
        }).join('');
        // Bind Rp formatter to cost inputs in the table
        preorders.forEach(item => {
            bindRpFormatter(`preorderCost-${item.code}`);
        });
    }

    function checkAndProcessPreorderReady(preorder, previousStatus) {
        if (preorder.status === 'Ready' && previousStatus !== 'Ready') {
            preorder.readyDate = today();
            
            // Check if preorder is unit_iphone or unit_android
            const cat = String(preorder.preorderCategory || preorder.category || '').toLowerCase();
            const brand = String(preorder.brand || '').toLowerCase();
            const reqItem = String(preorder.requestedItem || '').toLowerCase();
            
            let isDevice = false;
            let targetCategory = 'iphone';
            if (cat === 'iphone' || brand === 'apple' || reqItem.includes('iphone') || reqItem.includes('ip-') || reqItem.includes('apple')) {
                isDevice = true;
                targetCategory = 'iphone';
            } else if (cat === 'android' || brand === 'samsung' || brand === 'oppo' || brand === 'vivo' || brand === 'xiaomi' || brand === 'realme' || brand === 'infinix' ||
                reqItem.includes('android') || reqItem.includes('samsung') || reqItem.includes('oppo') || reqItem.includes('vivo') || reqItem.includes('xiaomi') || reqItem.includes('realme') || reqItem.includes('infinix')) {
                isDevice = true;
                targetCategory = 'android';
            }

            if (isDevice) {
                // Ensure specs are filled from requestedItem if empty
                if (!preorder.brand) preorder.brand = (typeof parseBrandFromText === 'function') ? parseBrandFromText(preorder.requestedItem) : (targetCategory === 'iphone' ? 'Apple' : 'Android');
                if (!preorder.model) preorder.model = (typeof parseModelFromText === 'function') ? parseModelFromText(preorder.requestedItem) : (preorder.requestedItem || '');
                if (!preorder.storage) preorder.storage = (typeof parseStorageFromText === 'function') ? parseStorageFromText(preorder.requestedItem) : '128GB';
                if (!preorder.color) preorder.color = (typeof parseColorFromText === 'function') ? parseColorFromText(preorder.requestedItem) : 'Hitam';
                if (!preorder.condition) preorder.condition = (typeof parseConditionFromText === 'function') ? parseConditionFromText(preorder.requestedItem) : 'Bekas';
                if (!preorder.warranty) preorder.warranty = (typeof parseWarrantyFromText === 'function') ? parseWarrantyFromText(preorder.requestedItem) : 'INT';

                const warrantyUnitCode = (typeof generateWarrantyUnitCode === 'function') ? generateWarrantyUnitCode(preorder.warranty) : 'INT';

                const devices = load(DB_KEYS.devices);
                const existingMatch = findMatchingDeviceForPreorder(preorder);
                if (existingMatch) {
                    preorder.linkedUnitCode = existingMatch.code;
                    // Update IMEI & Cost on existing device if provided
                    if (preorder.imei && !existingMatch.imei) existingMatch.imei = preorder.imei;
                    if (preorder.cost && !existingMatch.cost) existingMatch.cost = Number(preorder.cost);
                    if (!existingMatch.model && preorder.model) existingMatch.model = preorder.model;
                    if (!existingMatch.storage && preorder.storage) existingMatch.storage = preorder.storage;
                    if (!existingMatch.color && preorder.color) existingMatch.color = preorder.color;
                    save(DB_KEYS.devices, devices);
                    queueRecordSupabaseSync('devices', existingMatch);
                    toast(`Preorder ditautkan ke unit stok ${existingMatch.code}.`);
                    return;
                }

                const cleanImei = String(preorder.imei || '').trim();
                let generatedCode = '';
                if (cleanImei && typeof generateDeviceCode === 'function') {
                    generatedCode = generateDeviceCode(targetCategory, cleanImei, warrantyUnitCode, preorder.condition);
                } else if (typeof nextDeviceCodes === 'function') {
                    const generatedCodes = nextDeviceCodes(warrantyUnitCode, preorder.storage || '', preorder.color || '', targetCategory, 1, preorder.condition);
                    generatedCode = generatedCodes[0];
                } else {
                    generatedCode = `PO-${Date.now().toString().slice(-4)}`;
                }
                
                const newDevice = {
                    code: generatedCode,
                    category: targetCategory,
                    brand: preorder.brand || (targetCategory === 'iphone' ? 'Apple' : ''),
                    model: preorder.model || '',
                    storage: preorder.storage || '',
                    color: preorder.color || '',
                    condition: preorder.condition || 'Bekas',
                    acquisition: 'PB',
                    warranty: warrantyUnitCode,
                    supplier: `PO (${preorder.buyerName || 'Preorder'})`,
                    purchaseDate: today(),
                    cost: Number(preorder.cost) || 0,
                    status: 'Available',
                    imei: cleanImei,
                    createdAt: new Date().toISOString()
                };

                save(DB_KEYS.devices, [...devices, newDevice]);
                queueRecordSupabaseSync('devices', newDevice);
                renderDeviceStock();
                
                // Store the generated code in preorder so we can reference it
                preorder.linkedUnitCode = generatedCode;
                toast(`Unit baru ${generatedCode} (${newDevice.model} ${newDevice.storage}) otomatis ditambahkan ke stok ready.`);
            }
        }
    }

    window.savePreorderAdmin = function (code) {
        const preorders = loadPreorders();
        const preorder = preorders.find(item => item.code === code);
        if (!preorder) return;
        if (preorder.status === 'Done') {
            toast('Preorder yang sudah Done tidak dapat disimpan!', 'err');
            return;
        }
        const previousStatus = preorder.status || 'Preorder';
        const costVal = cleanRp($(`preorderCost-${code}`)?.value);
        const statusVal = $(`preorderStatus-${code}`)?.value || 'Preorder';
        const imeiVal = ($(`preorderImei-${code}`)?.value || '').trim();

        if (statusVal === 'Ready' && !imeiVal) {
            toast('IMEI wajib diisi jika status diubah ke Ready!', 'err');
            const selectEl = $(`preorderStatus-${code}`);
            if (selectEl) selectEl.value = previousStatus;
            return;
        }

        preorder.cost = costVal;
        preorder.status = statusVal;
        preorder.imei = imeiVal;
        
        checkAndProcessPreorderReady(preorder, previousStatus);
        
        if (preorder.status === 'Cancel' && previousStatus !== 'Cancel') preorder.cancelDate = today();
        preorder.updatedAt = new Date().toISOString();
        savePreorders(preorders);
        queueRecordSupabaseSync('preorders', preorder);
        renderPreorders();
        renderActiveSaleForm();
        toast(`Preorder ${code} disimpan`);
    };

    window.deletePreorderAdmin = function (code) {
        if (!confirm(`Hapus preorder ${code}? Jika ada unit stok ready terkait, unit juga akan dihapus.`)) return;
        const preorders = loadPreorders();
        const targetPo = preorders.find(item => item.code === code);
        if (targetPo) {
            if (targetPo.linkedUnitCode) {
                const devices = load(DB_KEYS.devices) || [];
                const remainingDevs = devices.filter(d => d.code !== targetPo.linkedUnitCode);
                save(DB_KEYS.devices, remainingDevs);
                queueRecordSupabaseDelete('devices', 'code', targetPo.linkedUnitCode);
            }
            if (targetPo.imei) {
                const devices = load(DB_KEYS.devices) || [];
                const remainingDevs = devices.filter(d => d.imei !== targetPo.imei);
                save(DB_KEYS.devices, remainingDevs);
            }
        }
        const filtered = preorders.filter(item => item.code !== code);
        savePreorders(filtered);
        queueRecordSupabaseDelete('preorders', 'code', code);
        
        // Also remove any related transaction in transactions
        const txs = loadTransactions();
        const matchingTx = txs.find(t => t.code === code || t.preorderCode === code);
        if (matchingTx) {
            const remTxs = txs.filter(t => t.id !== matchingTx.id);
            saveTransactions(remTxs);
            queueRecordSupabaseDelete('transactions', 'id', matchingTx.id);
        }

        renderPreorders();
        renderDeviceStock();
        if (typeof renderActiveSaleForm === 'function') renderActiveSaleForm();
        if (typeof renderDailyReport === 'function') renderDailyReport();
        toast(`Preorder ${code} berhasil dihapus.`);
    };

    window.editPreorderAdmin = function (code) {
        const preorder = loadPreorders().find(item => item.code === code);
        if (!preorder) return;
        if (preorder.status === 'Done') {
            toast('Preorder yang sudah Done tidak dapat diedit!', 'err');
            return;
        }
        const modal = $('preorderEditModal');
        const mount = $('preorderEditFormMount');
        if (!modal || !mount) return;

        const modelOptions = PHONE_MODELS.map(m => `<option value="${esc(m)}" ${preorder.model === m ? 'selected' : ''}>${esc(m)}</option>`).join('');
        const statusOpt = (val) => `<option value="${val}" ${(preorder.status || 'Preorder') === val ? 'selected' : ''}>${val}</option>`;
        const condOpt = (val) => `<option value="${val}" ${preorder.condition === val ? 'selected' : ''}>${val}</option>`;
        const brandOpt = (val) => `<option value="${val}" ${preorder.brand === val ? 'selected' : ''}>${val}</option>`;

        let peditStatusHtml = '';
        if ((preorder.status || 'Preorder') === 'Preorder') {
            peditStatusHtml = `
                <select id="peditStatus">
                    <option value="Preorder" selected>Preorder</option>
                    <option value="Ready">Ready</option>
                </select>
            `;
        } else {
            peditStatusHtml = `
                <input type="text" id="peditStatus" value="${esc(preorder.status)}" readonly disabled>
            `;
        }

        mount.innerHTML = `
            <div class="form-grid">
                <div class="field"><label>Nama Pembeli</label><input type="text" id="peditBuyerName" value="${esc(preorder.buyerName || '')}"></div>
                <div class="field"><label>No. WA</label><input type="tel" id="peditBuyerWa" value="${esc(preorder.buyerWa || '')}"></div>
            </div>
            <div class="form-grid">
                <div class="field"><label>Nama Sales</label><select id="peditSalesName" class="sales-employee-select">${getSalesEmployeeOptions(preorder.salesName || '')}</select></div>
                <div class="field"><label>Request Unit</label><input type="text" id="peditRequestedItem" value="${esc(preorder.requestedItem || '')}"></div>
            </div>
            <hr class="section-divider">
            <div class="form-grid">
                <div class="field"><label>Brand</label>
                    <input type="text" id="peditBrand" list="peditBrandDatalist" value="${esc(preorder.brand || '')}" placeholder="Pilih atau ketik brand">
                    <datalist id="peditBrandDatalist">
                        <option value="iPhone">
                        <option value="Android">
                        <option value="iPad">
                        <option value="Other">
                    </datalist>
                </div>
                <div class="field"><label>Model</label>
                    <input type="text" id="peditModel" list="peditModelDatalist" value="${esc(preorder.model || '')}" placeholder="Pilih atau ketik model">
                    <datalist id="peditModelDatalist">
                        ${modelOptions}
                    </datalist>
                </div>
            </div>
            <div class="form-grid">
                <div class="field"><label>Storage</label>
                    <select id="peditStorage">
                        <option value="">Pilih</option>
                        <option value="32GB" ${preorder.storage === '32GB' ? 'selected' : ''}>32GB</option>
                        <option value="64GB" ${preorder.storage === '64GB' ? 'selected' : ''}>64GB</option>
                        <option value="128GB" ${preorder.storage === '128GB' ? 'selected' : ''}>128GB</option>
                        <option value="256GB" ${preorder.storage === '256GB' ? 'selected' : ''}>256GB</option>
                        <option value="512GB" ${preorder.storage === '512GB' ? 'selected' : ''}>512GB</option>
                        <option value="1TB" ${preorder.storage === '1TB' ? 'selected' : ''}>1TB</option>
                    </select>
                </div>
                <div class="field"><label>Warna</label><input type="text" id="peditColor" value="${esc(preorder.color || '')}"></div>
            </div>
            <div class="form-grid">
                <div class="field"><label>Kondisi</label>
                    <select id="peditCondition">
                        <option value="">Pilih</option>
                        ${condOpt('Baru (BNIB)')}${condOpt('Baru (BNOB)')}${condOpt('Second')}${condOpt('Ex-Inter')}
                    </select>
                </div>
                <div class="field"><label>Garansi</label><input type="text" id="peditWarranty" value="${esc(preorder.warranty || '')}"></div>
            </div>
            <hr class="section-divider">
            <div class="form-grid cols-3">
                <div class="field"><label>Nominal DP Rp</label><input type="text" inputmode="numeric" id="peditDpAmount" value="${preorder.dpAmount ? Number(preorder.dpAmount).toLocaleString('id-ID') : ''}" style="text-align: right;"></div>
                <div class="field"><label>Modal Rp</label><input type="text" inputmode="numeric" id="peditCost" value="${preorder.cost ? Number(preorder.cost).toLocaleString('id-ID') : ''}" style="text-align: right;"></div>
                <div class="field"><label>IMEI</label><input type="text" id="peditImei" value="${esc(preorder.imei || '')}" placeholder="Ketik IMEI"></div>
            </div>
            <div class="form-grid">
                <div class="field"><label>Status</label>
                    ${peditStatusHtml}
                </div>
            </div>
            <div class="field"><label>Catatan</label><textarea id="peditNote" rows="2">${esc(preorder.note || '')}</textarea></div>
            <div class="btn-row" style="margin-top: 16px; display: flex; justify-content: flex-end; gap: 10px;">
                <button type="button" id="btnCancelPreorderEdit" class="btn btn-ghost">Batal</button>
                <button type="button" id="btnSavePreorderEdit" class="btn btn-primary"><i class="ri-check-line"></i> Simpan Perubahan</button>
            </div>`;

        modal.classList.add('open');

        const peditBrandSelect = $('peditBrand');
        if (peditBrandSelect) {
            peditBrandSelect.addEventListener('change', updateAdminPreorderModelDatalist);
            peditBrandSelect.addEventListener('input', updateAdminPreorderModelDatalist);
            updateAdminPreorderModelDatalist();
        }
        bindRpFormatter('peditDpAmount');
        bindRpFormatter('peditCost');

        $('btnClosePreorderEdit')?.addEventListener('click', () => modal.classList.remove('open'));
        $('btnCancelPreorderEdit')?.addEventListener('click', () => modal.classList.remove('open'));
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });

        $('btnSavePreorderEdit')?.addEventListener('click', () => {
            const preorders = loadPreorders();
            const po = preorders.find(item => item.code === code);
            if (!po) return;

            const previousStatus = po.status || 'Preorder';
            const buyerName = ($('peditBuyerName')?.value || '').trim();
            const requestedItem = ($('peditRequestedItem')?.value || '').trim();
            const statusVal = $('peditStatus')?.value || po.status || 'Preorder';
            const imeiVal = ($('peditImei')?.value || '').trim();

            if (statusVal === 'Ready' && !imeiVal) {
                toast('IMEI wajib diisi jika status diubah ke Ready!', 'err');
                return;
            }

            if (!buyerName) { toast('Nama pembeli wajib diisi', 'err'); return; }
            if (!requestedItem) { toast('Request unit wajib diisi', 'err'); return; }

            po.buyerName = buyerName;
            po.buyerWa = normalizePhoneWa($('peditBuyerWa')?.value || '');
            po.salesName = ($('peditSalesName')?.value || '').trim();
            po.requestedItem = requestedItem;
            po.brand = ($('peditBrand')?.value || '').trim();
            po.model = ($('peditModel')?.value || '').trim();
            po.storage = ($('peditStorage')?.value || '').trim();
            po.color = ($('peditColor')?.value || '').trim();
            po.condition = ($('peditCondition')?.value || '').trim();
            po.warranty = ($('peditWarranty')?.value || '').trim();
            po.note = ($('peditNote')?.value || '').trim();
            po.dpAmount = cleanRp($('peditDpAmount')?.value);
            po.cost = cleanRp($('peditCost')?.value);
            po.imei = imeiVal;
            po.status = statusVal;
            
            checkAndProcessPreorderReady(po, previousStatus);
            if (po.status === 'Cancel' && previousStatus !== 'Cancel') po.cancelDate = today();
            po.updatedAt = new Date().toISOString();

            if (!po.buyerName) { toast('Nama pembeli wajib diisi', 'err'); return; }
            if (!po.requestedItem) { toast('Request unit wajib diisi', 'err'); return; }

            savePreorders(preorders);
            queueRecordSupabaseSync('preorders', po);
            renderPreorders();
            modal.classList.remove('open');
            renderPreorders();
            renderActiveSaleForm();
            toast(`Pre-order ${code} berhasil diedit`);
        });
    };

    function refreshAllAdminPanels() {
        renderDeviceStock();
        renderAccStock();
        renderTechnicians();
        renderServiceOrders();
        renderServiceCatalog();
        renderPreorders();
        renderAdminImei();
        renderAdminBeaCukai();
        renderAdminIcloud();
        renderOtherCatalog();
        renderReportsLog();
        if (!activeMonthlyDetail) {
            activeMonthlyDetail = today().slice(0, 7);
        }
        const picker = $('monthlyDetailMonthPicker');
        if (picker) picker.value = activeMonthlyDetail;
        renderMonthlyDetail();
        renderEmployees();
        populateEmployeeDropdowns();
        // Initialize expense date/month defaults
        const expDate = $('expenseDate');
        if (expDate && !expDate.value) expDate.value = today();
        const expMonth = $('expenseMonthSelect');
        if (expMonth && !expMonth.value) expMonth.value = today().slice(0, 7);
        renderExpensesPanel();
        refreshDashboard();
    }

    function bindAdminForms() {
        document.querySelectorAll('.admin-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const adminTabs = document.querySelector('.admin-tabs');
                if (adminTabs) adminTabs.classList.add('collapsed');
                if (!isTestingMode()) {
                    document.querySelector('.admin-dark-card')?.style.setProperty('display', 'none', 'important');
                }

                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
                
                // Set active class on all matching sidebar buttons (e.g. for testing mode sync)
                const filter = tab.dataset.sidebarServiceFilter;
                if (tab.dataset.panel === 'admin-services' && filter) {
                    document.querySelectorAll(`.admin-tab[data-panel="admin-services"][data-sidebar-service-filter="${filter}"]`).forEach(t => t.classList.add('active'));
                } else {
                    tab.classList.add('active');
                }
                
                $(tab.dataset.panel)?.classList.add('active');
                if (tab.dataset.panel === 'admin-services') {
                    const svcFilter = tab.dataset.sidebarServiceFilter || 'masuk';
                    activeServiceOrderFilter = svcFilter;
                    
                    const adminStack = document.querySelector('.service-admin-stack');
                    if (adminStack) {
                        adminStack.style.display = svcFilter === 'masuk' ? '' : 'none';
                    }
                    renderServiceOrders();
                }
                if (tab.dataset.panel === 'admin-technicians') {
                    renderTechnicians();
                }
                if (tab.dataset.panel === 'admin-smart-inventory') {
                    renderSmartInventoryPanel();
                }
                if (tab.dataset.panel === 'admin-dashboard') refreshDashboard();
                if (tab.dataset.panel === 'admin-sales-recap') {
                    initSalesRecapPanel();
                }
                if (tab.dataset.panel === 'admin-monthly') {
                    if (!activeMonthlyDetail) {
                        activeMonthlyDetail = today().slice(0, 7);
                    }
                    const picker = $('monthlyDetailMonthPicker');
                    if (picker) picker.value = activeMonthlyDetail;
                    renderMonthlyDetail();
                }
                if (tab.dataset.panel === 'admin-expenses') {
                    renderExpensesPanel();
                }
                if (tab.dataset.panel === 'admin-imei') {
                    renderAdminImei();
                }
                if (tab.dataset.panel === 'admin-employees') {
                    renderEmployees();
                }

                // On-demand targeted pull when clicking admin tab
                if (!isTestingMode()) {
                    pullAdminPanelDataFromSupabase(tab.dataset.panel);
                }
            });
        });

        $('btnBackToAdminMenu')?.addEventListener('click', () => {
            const adminTabs = document.querySelector('.admin-tabs');
            if (adminTabs) {
                adminTabs.classList.remove('collapsed');
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
            }
            document.querySelector('.admin-dark-card')?.style.removeProperty('display');
        });

        $('btnSyncMonthlySupabase')?.addEventListener('click', () => {
            pullAllFromSupabase().catch(error => {
                setSupabaseStatus(`Supabase: ${error.message}`, 'err');
            });
        });

        $('monthlyDetailMonthPicker')?.addEventListener('change', (e) => {
            activeMonthlyDetail = e.target.value;
            renderMonthlyDetail();
        });

        $('searchMonthlyDetail')?.addEventListener('input', renderMonthlyDetail);
        $('searchMonthlyUnitDetail')?.addEventListener('input', renderMonthlyDetail);

        document.querySelectorAll('.sub-monthly-tab').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.sub-monthly-tab').forEach(b => {
                    b.classList.remove('btn-primary');
                    b.classList.add('btn-ghost');
                });
                const clicked = e.currentTarget;
                clicked.classList.remove('btn-ghost');
                clicked.classList.add('btn-primary');
                activeMonthlySubTab = clicked.dataset.tab || 'all';
                renderMonthlyDetail();
            });
        });

        // ── Admin Sub-Tab Grid Routing ──────────────────────
        document.querySelectorAll('.admin-sub-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPanel = tab.dataset.panel;
                const filter = tab.dataset.sidebarServiceFilter;

                // Hide all admin panels
                document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));

                // Show target panel
                const targetEl = $(targetPanel);
                if (targetEl) targetEl.classList.add('active');

                // Collapse sidebar
                const adminTabs = document.querySelector('.admin-tabs');
                if (adminTabs) adminTabs.classList.add('collapsed');
                document.querySelector('.admin-dark-card')?.style.setProperty('display', 'none', 'important');

                // Update active state in top collapsed bar
                document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
                
                // Find parent group tab to highlight in top bar
                let parentTab;
                if (targetPanel === 'admin-imei' || targetPanel === 'admin-beacukai' || targetPanel === 'admin-icloud') {
                    parentTab = document.querySelector('.admin-tab[data-panel="admin-group-order-jasa"]');
                } else if (targetPanel === 'admin-services' || targetPanel === 'admin-technicians') {
                    parentTab = document.querySelector('.admin-tab[data-panel="admin-group-kelola-servis"]');
                }
                if (parentTab) parentTab.classList.add('active');

                // If service panel, handle specific service page logic
                if (targetPanel === 'admin-services') {
                    const svcFilter = filter || 'masuk';
                    activeServiceOrderFilter = svcFilter;
                    const adminStack = document.querySelector('.service-admin-stack');
                    if (adminStack) {
                        adminStack.style.display = svcFilter === 'masuk' ? '' : 'none';
                    }
                    renderServiceOrders();
                }
                if (targetPanel === 'admin-technicians') {
                    renderTechnicians();
                }
                if (targetPanel === 'admin-imei') {
                    renderAdminImei();
                }
                if (targetPanel === 'admin-beacukai') {
                    renderAdminBeaCukai();
                }
                if (targetPanel === 'admin-icloud') {
                    renderAdminIcloud();
                }
            });
        });

        $('btnExportMonthlyPdf')?.addEventListener('click', () => {
            if (activeMonthlyDetail) {
                exportMonthlyPdf(activeMonthlyDetail);
            }
        });


        // ── Expense Month Selector ─────────────────────────────────────────────
        $('expenseMonthSelect')?.addEventListener('change', e => {
            activeExpenseMonth = e.target.value;
            renderExpensesPanel();
        });

        // ── Toggle Expense Form ────────────────────────────────────────────────
        $('btnShowExpenseForm')?.addEventListener('click', () => {
            const fc = $('expenseFormContainer');
            if (fc) fc.classList.toggle('open');
        });
        $('btnCancelExpense')?.addEventListener('click', () => {
            $('expenseFormContainer')?.classList.remove('open');
        });

        // ── Submit Expense Form ────────────────────────────────────────────────
        $('formAddExpense')?.addEventListener('submit', async e => {
            e.preventDefault();
            const category = $('expenseCategory')?.value?.trim();
            const description = $('expenseDescription')?.value?.trim();
            const amountRaw = $('expenseAmount')?.value?.trim();
            const dateVal = $('expenseDate')?.value?.trim();

            if (!category) { toast('Pilih kategori beban', 'err'); return; }
            const amount = cleanRp(amountRaw);
            if (!amount || amount <= 0) { toast('Nominal harus lebih dari 0', 'err'); return; }
            if (!dateVal) { toast('Tanggal wajib diisi', 'err'); return; }

            const monthKey = dateVal.slice(0, 7);
            const expense = {
                id: newExpenseId(),
                date: dateVal,
                month: monthKey,
                category,
                description,
                amount,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const expenses = loadExpenses();
            
            expenses.push(expense);
            saveExpenses(expenses);
            queueRecordSupabaseSync('expenses', expense);

            // Reset form
            e.target.reset();
            $('expenseDate').value = today();
            $('expenseFormContainer')?.classList.remove('open');

            // Refresh with newly added month
            activeExpenseMonth = monthKey;
            renderExpensesPanel();
            toast('Beban operasional berhasil disimpan');
        });

        // ── Export Expenses PDF ────────────────────────────────────────────────
        $('btnExportExpensesPdf')?.addEventListener('click', () => {
            const monthKey = activeExpenseMonth || today().slice(0, 7);
            exportExpensesPdf(monthKey);
        });


        $('btnAddNewDevice')?.addEventListener('click', () => $('addDeviceFormContainer')?.classList.toggle('open'));
        $('btnResetAllDevices')?.addEventListener('click', () => {
            const warningMessage = 
                'PERINGATAN: Anda akan menghapus SELURUH DATA STOK HP & IPAD secara permanen!\n\n' +
                'Data yang akan dihapus: Semua daftar stok unit handphone dan tablet di database lokal maupun server.\n' +
                'Konsekuensi: Stok unit akan menjadi kosong bersih, tidak dapat dikembalikan, dan transaksi penjualan unit tidak dapat dilakukan sampai data diinput kembali.\n\n' +
                'Apakah Anda yakin ingin melanjutkan?';
            if (!confirm(warningMessage)) return;
            
            requireSuperAdminAuth(async () => {
                // 1. Kosongkan local storage
                save(DB_KEYS.devices, []);
                
                // 2. Re-render UI
                renderDeviceStock();
                
                // 3. Hapus di server dengan hard-delete jika Supabase aktif
                if (getSupabaseConfig().enabled) {
                    try {
                        setSupabaseStatus('Supabase: menghapus semua stok...', 'info');
                        await supabaseRequest('devices', {
                            method: 'DELETE',
                            query: 'code=not.is.null'
                        });
                        setSupabaseStatus('Supabase: stok di server dihapus.', 'ok');
                        toast('Semua data stok unit di server berhasil dihapus');
                    } catch (err) {
                        console.error('Gagal menghapus stok di server:', err);
                        setSupabaseStatus('Supabase: gagal mengosongkan stok.', 'err');
                        toast('Gagal menghapus stok di server: ' + err.message, 'err');
                    }
                } else {
                    toast('Semua data stok unit lokal berhasil dihapus');
                }
            });
        });
        $('btnCancelAddDevice')?.addEventListener('click', () => $('addDeviceFormContainer')?.classList.remove('open'));

        const IPHONE_MODELS_DATA = [
            { group: 'iPhone 18 Series', items: ['iPhone 18 Pro Max', 'iPhone 18 Pro', 'iPhone 18 Plus', 'iPhone 18', 'iPhone 18 Air'] },
            { group: 'iPhone 17 Series', items: ['iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone 17 Plus', 'iPhone 17', 'iPhone 17 Air'] },
            { group: 'iPhone 16 Series', items: ['iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16', 'iPhone 16e'] },
            { group: 'iPhone 15 Series', items: ['iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 15 Plus', 'iPhone 15'] },
            { group: 'iPhone 14 Series', items: ['iPhone 14 Pro Max', 'iPhone 14 Pro', 'iPhone 14 Plus', 'iPhone 14'] },
            { group: 'iPhone 13 Series', items: ['iPhone 13 Pro Max', 'iPhone 13 Pro', 'iPhone 13 Mini', 'iPhone 13'] },
            { group: 'iPhone 12 Series', items: ['iPhone 12 Pro Max', 'iPhone 12 Pro', 'iPhone 12 Mini', 'iPhone 12'] },
            { group: 'iPhone 11 Series', items: ['iPhone 11 Pro Max', 'iPhone 11 Pro', 'iPhone 11'] },
            { group: 'iPhone X / XS / XR', items: ['iPhone XS Max', 'iPhone XS', 'iPhone XR', 'iPhone X'] },
            { group: 'iPhone SE & Seri 8/7/6/5/4', items: ['iPhone SE 4', 'iPhone SE 3', 'iPhone SE 2', 'iPhone SE (2016)', 'iPhone 8 Plus', 'iPhone 8', 'iPhone 7 Plus', 'iPhone 7', 'iPhone 6s Plus', 'iPhone 6s', 'iPhone 6 Plus', 'iPhone 6', 'iPhone 5s', 'iPhone 5c', 'iPhone 5', 'iPhone 4s', 'iPhone 4'] },
            { group: 'iPad Series', items: ['iPad Pro M4 13"', 'iPad Pro M4 11"', 'iPad Pro M2 12.9"', 'iPad Pro M2 11"', 'iPad Pro 12.9"', 'iPad Pro 11"', 'iPad Air M2 13"', 'iPad Air M2 11"', 'iPad Air M1 10.9"', 'iPad Air 5', 'iPad 10.9 Gen 10', 'iPad 10.2 Gen 9', 'iPad 10.2 Gen 8', 'iPad Mini 7', 'iPad Mini 6', 'iPad Mini 5'] }
        ];

        function initModelSuggestionsCombobox() {
            const input = $('stockDeviceModel');
            const toggleBtn = $('btnToggleModelSuggestions');
            const box = $('stockModelSuggestions');
            if (!input || !box) return;

            function renderSuggestions(filter = '') {
                const q = filter.trim().toLowerCase();
                let html = '';
                let totalCount = 0;

                IPHONE_MODELS_DATA.forEach(group => {
                    const matched = group.items.filter(item => !q || item.toLowerCase().includes(q));
                    if (matched.length > 0) {
                        html += `<div class="autocomplete-group-title">${group.group}</div>`;
                        matched.forEach(item => {
                            totalCount++;
                            html += `<div class="autocomplete-item" data-model="${esc(item)}">${esc(item)}</div>`;
                        });
                    }
                });

                if (totalCount === 0 && q) {
                    html = `<div class="autocomplete-item" data-model="${esc(filter)}">Gunakan: <strong>${esc(filter)}</strong></div>`;
                }

                box.innerHTML = html;
                box.querySelectorAll('.autocomplete-item').forEach(el => {
                    el.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        input.value = el.getAttribute('data-model');
                        box.classList.remove('show');
                    });
                });
            }

            input.addEventListener('focus', () => {
                const cat = $('stockDeviceCategory')?.value || 'iphone';
                if (cat !== 'android') {
                    renderSuggestions(input.value);
                    box.classList.add('show');
                }
            });

            input.addEventListener('input', () => {
                const cat = $('stockDeviceCategory')?.value || 'iphone';
                if (cat !== 'android') {
                    renderSuggestions(input.value);
                    box.classList.add('show');
                }
            });

            toggleBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (box.classList.contains('show')) {
                    box.classList.remove('show');
                } else {
                    renderSuggestions(input.value);
                    box.classList.add('show');
                    input.focus();
                }
            });

            document.addEventListener('click', (e) => {
                if (!input.contains(e.target) && !box.contains(e.target) && !toggleBtn?.contains(e.target)) {
                    box.classList.remove('show');
                }
            });
        }
        initModelSuggestionsCombobox();

        function updateDeviceCategoryUI() {
            const cat = $('stockDeviceCategory')?.value || 'iphone';
            const brandGroup = $('stockDeviceBrandGroup');
            const modelInput = $('stockDeviceModel');
            if (cat === 'iphone' || cat === 'ipad') {
                if (brandGroup) brandGroup.style.display = 'none';
                if ($('stockDeviceBrand')) $('stockDeviceBrand').value = 'Apple';
                if (modelInput) {
                    modelInput.setAttribute('list', 'iphoneModelsList');
                    modelInput.placeholder = 'Ketik atau pilih model...';
                }
            } else {
                if (brandGroup) brandGroup.style.display = '';
                if ($('stockDeviceBrand')) $('stockDeviceBrand').value = '';
                if (modelInput) {
                    modelInput.removeAttribute('list');
                    modelInput.placeholder = 'Contoh: Samsung S24 Ultra';
                }
            }
        }
        let deviceBatchRows = [{ color: '', imei: '', code: '' }];

        function renderDeviceBatchRows() {
            const container = $('deviceBatchIdentitiesContainer');
            if (!container) return;
            container.innerHTML = '';
            
            deviceBatchRows.forEach((row, index) => {
                const rowEl = document.createElement('div');
                rowEl.className = 'device-batch-row form-grid cols-3';
                rowEl.style.alignItems = 'flex-end';
                rowEl.style.marginBottom = '8px';
                rowEl.style.borderBottom = '1px dashed var(--border)';
                rowEl.style.paddingBottom = '8px';
                
                const deleteBtnHtml = deviceBatchRows.length > 1
                    ? `<button type="button" class="btn-icon btn-remove-batch-row" data-index="${index}" title="Hapus Unit Ini" style="flex-shrink: 0; color: var(--danger); border-color: rgba(225,29,72,0.16); background: var(--d-glow); width: 30px; height: 30px; border-radius: 6px;"><i class="ri-delete-bin-line" style="font-size: 14px;"></i></button>`
                    : `<button type="button" class="btn-icon" disabled style="flex-shrink: 0; opacity: 0.3; cursor: not-allowed; width: 30px; height: 30px; border-radius: 6px;"><i class="ri-delete-bin-line" style="font-size: 14px;"></i></button>`;

                rowEl.innerHTML = `
                    <div class="field" style="margin-bottom: 0;">
                        <label style="font-size: 10px; font-weight: 700;">Warna</label>
                        <input type="text" class="batch-device-color" data-index="${index}" placeholder="Contoh: Midnight" value="${esc(row.color)}" required style="padding: 5px 8px; font-size: 12.5px; height: 32px;">
                    </div>
                    <div class="field" style="margin-bottom: 0;">
                        <label style="font-size: 10px; font-weight: 700;">IMEI</label>
                        <input type="text" class="batch-device-imei" data-index="${index}" placeholder="15 digit IMEI" value="${esc(row.imei)}" style="padding: 5px 8px; font-size: 12.5px; height: 32px;">
                    </div>
                    <div class="field" style="margin-bottom: 0;">
                        <label style="font-size: 10px; font-weight: 700;">Kode Unit</label>
                        <div style="display: flex; gap: 4px; align-items: center;">
                            <input type="text" class="batch-device-code" placeholder="Auto" value="${esc(row.code)}" readonly style="flex: 1; padding: 5px 8px; font-size: 12.5px; height: 32px; background: #f8fafc; border: 1.5px solid var(--border-strong);">
                            ${deleteBtnHtml}
                        </div>
                    </div>
                `;
                
                rowEl.querySelector('.batch-device-color').addEventListener('input', function(e) {
                    deviceBatchRows[index].color = e.target.value;
                });

                const imeiInput = rowEl.querySelector('.batch-device-imei');
                const codeInput = rowEl.querySelector('.batch-device-code');
                
                const updateRowCode = () => {
                    const category = $('stockDeviceCategory')?.value || 'iphone';
                    const warranty = $('stockDeviceWarranty')?.value || 'IBX';
                    const condition = $('stockDeviceCondition')?.value || 'Bekas';
                    const imeiVal = imeiInput.value.trim();
                    deviceBatchRows[index].imei = imeiVal;
                    if (imeiVal) {
                        const generated = generateDeviceCode(category, imeiVal, warranty, condition);
                        deviceBatchRows[index].code = generated;
                        codeInput.value = generated;
                    } else {
                        deviceBatchRows[index].code = '';
                        codeInput.value = '';
                    }
                };

                imeiInput.addEventListener('input', updateRowCode);

                if (deviceBatchRows.length > 1) {
                    rowEl.querySelector('.btn-remove-batch-row')?.addEventListener('click', function() {
                        deviceBatchRows.splice(index, 1);
                        renderDeviceBatchRows();
                    });
                }

                container.appendChild(rowEl);
            });
        }

        function updateAllBatchCodes() {
            const category = $('stockDeviceCategory')?.value || 'iphone';
            const warranty = $('stockDeviceWarranty')?.value || 'IBX';
            const condition = $('stockDeviceCondition')?.value || 'Bekas';
            
            deviceBatchRows.forEach((row) => {
                if (row.imei.trim()) {
                    row.code = generateDeviceCode(category, row.imei.trim(), warranty, condition);
                } else {
                    row.code = '';
                }
            });
            renderDeviceBatchRows();
        }

        $('btnAddBatchDeviceRow')?.addEventListener('click', () => {
            deviceBatchRows.push({ color: '', imei: '', code: '' });
            renderDeviceBatchRows();
        });

        $('stockDeviceWarranty')?.addEventListener('change', updateAllBatchCodes);
        $('stockDeviceCondition')?.addEventListener('change', updateAllBatchCodes);
        $('stockDeviceCategory')?.addEventListener('change', () => {
            updateDeviceCategoryUI();
            updateAllBatchCodes();
        });
        updateDeviceCategoryUI(); // run on init
        renderDeviceBatchRows();   // run on init

        $('stockDeviceAcquisition')?.addEventListener('change', function () {
            if ($('consignmentShopGroup')) $('consignmentShopGroup').style.display = this.value === 'KS' ? 'flex' : 'none';
        });

        $('newDeviceStockForm')?.addEventListener('submit', async function (e) {
            e.preventDefault();
            const category = $('stockDeviceCategory')?.value || 'iphone';
            const condition = $('stockDeviceCondition')?.value || 'Bekas';
            const brand = ($('stockDeviceBrand')?.value || (category === 'iphone' ? 'Apple' : '')).trim();
            const model = $('stockDeviceModel')?.value.trim();
            const storage = $('stockDeviceStorage')?.value;
            const acq = $('stockDeviceAcquisition')?.value || 'PB';
            const warranty = $('stockDeviceWarranty')?.value || 'INT';
            const supplier = $('stockDeviceSupplier')?.value.trim() || '';
            const purchaseDate = $('stockDevicePurchaseDate')?.value || today();
            const cost = cleanRp($('stockDeviceCost')?.value);
            
            if (!model || !cost) { toast('Lengkapi Tipe/Model dan Modal!', 'err'); return; }
            
            // Validate batch rows
            if (deviceBatchRows.length === 0) {
                toast('Tambahkan minimal 1 unit!', 'err');
                return;
            }
            
            for (let i = 0; i < deviceBatchRows.length; i++) {
                const r = deviceBatchRows[i];
                if (!r.color.trim()) {
                    toast(`Warna unit baris ${i + 1} wajib diisi!`, 'err');
                    return;
                }
                if (!r.imei.trim()) {
                    toast(`IMEI unit baris ${i + 1} wajib diisi!`, 'err');
                    return;
                }
            }
            
            const devices = load(DB_KEYS.devices);
            const newDevices = [];
            const createdAt = new Date().toISOString();
            
            for (let i = 0; i < deviceBatchRows.length; i++) {
                const r = deviceBatchRows[i];
                const generatedCode = generateDeviceCode(category, r.imei.trim(), warranty, condition);
                
                if (devices.some(d => d.code === generatedCode) || newDevices.some(d => d.code === generatedCode)) {
                    toast(`Kode unit berdasarkan IMEI baris ${i + 1} (${generatedCode}) sudah ada!`, 'err');
                    return;
                }
                
                newDevices.push({
                    code: generatedCode,
                    category,
                    brand,
                    model,
                    storage,
                    color: r.color.trim(),
                    condition,
                    acquisition: acq,
                    warranty,
                    supplier,
                    purchaseDate,
                    cost,
                    status: 'Available',
                    imei: r.imei.trim(),
                    createdAt
                });
            }
            
            save(DB_KEYS.devices, [...devices, ...newDevices]);
            newDevices.forEach(d => queueRecordSupabaseSync('devices', d));
            
            if ($('noticeDeviceCode')) $('noticeDeviceCode').textContent = newDevices.map(d => d.code).join(', ');
            const devNotice = $('deviceLabelNotice');
            if (devNotice) {
                devNotice.classList.add('show');
                clearTimeout(window._deviceNoticeTimer);
                window._deviceNoticeTimer = setTimeout(() => {
                    devNotice.classList.remove('show');
                }, 7000);
            }
            toast(`${newDevices.length} unit berhasil ditambahkan!`);
            
            e.target.reset();
            if ($('stockDevicePurchaseDate')) $('stockDevicePurchaseDate').value = today();
            $('addDeviceFormContainer')?.classList.remove('open');
            
            // Reset batch rows
            deviceBatchRows = [{ color: '', imei: '', code: '' }];
            renderDeviceBatchRows();
            
            renderDeviceStock();
            renderActiveSaleForm();
        });

        $('btnAddNewAcc')?.addEventListener('click', () => $('addAccFormContainer')?.classList.toggle('open'));
        $('btnCancelAddAcc')?.addEventListener('click', () => $('addAccFormContainer')?.classList.remove('open'));
        $('stockAccBrand')?.addEventListener('change', function () {
            if ($('stockAccBrandCustom')) $('stockAccBrandCustom').style.display = this.value === 'custom' ? 'block' : 'none';
        });
        $('stockAccCostMode')?.addEventListener('change', function () {
            updateAccessoryCostFields(this.value === 'total' ? 'total' : 'unit');
        });
        $('stockAccQty')?.addEventListener('input', () => updateAccessoryCostFields($('stockAccCostMode')?.value === 'total' ? 'total' : 'unit'));
        $('stockAccCost')?.addEventListener('focus', () => { if ($('stockAccCostMode')) $('stockAccCostMode').value = 'unit'; });
        $('stockAccCost')?.addEventListener('input', () => {
            if ($('stockAccCostMode')) $('stockAccCostMode').value = 'unit';
            setTimeout(() => updateAccessoryCostFields('unit'), 0);
        });
        $('stockAccTotalCost')?.addEventListener('focus', () => { if ($('stockAccCostMode')) $('stockAccCostMode').value = 'total'; });
        $('stockAccTotalCost')?.addEventListener('input', () => {
            if ($('stockAccCostMode')) $('stockAccCostMode').value = 'total';
            setTimeout(() => updateAccessoryCostFields('total'), 0);
        });
        $('newAccStockForm')?.addEventListener('submit', async function (e) {
            e.preventDefault();
            const cat = $('stockAccCategory')?.value || 'A';
            const brandSel = $('stockAccBrand')?.value || 'APL';
            const brand = brandSel === 'custom' ? $('stockAccBrandCustom')?.value.trim() : brandSel;
            const name = $('stockAccModel')?.value.trim();
            const qty = Number($('stockAccQty')?.value) || 1;
            updateAccessoryCostFields($('stockAccCostMode')?.value === 'total' ? 'total' : 'unit');
            const cost = cleanRp($('stockAccCost')?.value);
            const totalCost = cleanRp($('stockAccTotalCost')?.value) || (cost * qty);
            const sell = cleanRp($('stockAccSell')?.value);
            if (!name || !cost || !sell) { toast('Lengkapi semua field!', 'err'); return; }
            const accs = load(DB_KEYS.accessories);
            const code = nextAccCode(cat);
            const accessory = { code, category: cat, brand, name, qty, cost, totalCost, sell, createdAt: new Date().toISOString() };
            
            accs.push(accessory);
            save(DB_KEYS.accessories, accs);
            queueRecordSupabaseSync('accessories', accessory);
            if ($('noticeAccCode')) $('noticeAccCode').textContent = code;
            const accNotice = $('accLabelNotice');
            if (accNotice) {
                accNotice.classList.add('show');
                clearTimeout(window._accNoticeTimer);
                window._accNoticeTimer = setTimeout(() => {
                    accNotice.classList.remove('show');
                }, 7000);
            }
            toast(`Aksesoris ${code} ditambahkan!`);
            e.target.reset();
            $('addAccFormContainer')?.classList.remove('open');
            renderAccStock();
            renderActiveSaleForm(true);
        });

        $('addNewTechnicianForm')?.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = $('newTechName')?.value.trim();
            if (!name) return;
            const techs = load(DB_KEYS.technicians);
            let technician = techs.find(t => t.name === name);
            if (!technician) {
                technician = { name, createdAt: new Date().toISOString() };
            }
            
            if (!techs.some(t => t.name === name)) {
                techs.push(technician);
            }
            save(DB_KEYS.technicians, techs);
            queueRecordSupabaseSync('technicians', technician);
            e.target.reset();
            renderTechnicians();
            renderActiveSaleForm(true);
            toast(`Teknisi ${name} ditambahkan`);
        });

        $('btnShowAddServiceCatalog')?.addEventListener('click', () => $('addServiceCatalogFormContainer')?.classList.toggle('open'));
        $('newServiceCatalogForm')?.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = $('catalogServiceName')?.value.trim();
            const cost = cleanRp($('catalogServiceCost')?.value);
            const sell = cleanRp($('catalogServiceSell')?.value);
            if (!name || !sell) { toast('Lengkapi data!', 'err'); return; }
            const svcs = load(DB_KEYS.serviceCatalog);
            const code = nextServiceCode();
            const service = { code, name, cost, sell, createdAt: new Date().toISOString() };
            
            svcs.push(service);
            save(DB_KEYS.serviceCatalog, svcs);
            queueRecordSupabaseSync('serviceCatalog', service);
            toast(`Service ${code} ditambahkan`);
            e.target.reset();
            $('addServiceCatalogFormContainer')?.classList.remove('open');
            renderServiceCatalog();
            renderActiveSaleForm(true);
        });

        // Lain-lain catalog form
        $('btnAddNewOther')?.addEventListener('click', () => $('addOtherFormContainer')?.classList.toggle('open'));
        $('btnCancelAddOther')?.addEventListener('click', () => $('addOtherFormContainer')?.classList.remove('open'));
        $('newOtherCatalogForm')?.addEventListener('submit', function (e) {
            e.preventDefault();
            const name = $('otherItemName')?.value.trim();
            const sell = cleanRp($('otherItemSell')?.value);
            const note = $('otherItemNote')?.value.trim() || '';
            if (!name || !sell) { toast('Nama dan harga wajib diisi!', 'err'); return; }
            const items = load(DB_KEYS.otherCatalog);
            const code = nextOtherCode();
            const item = { code, name, sell, note, createdAt: new Date().toISOString() };
            
            items.push(item);
            save(DB_KEYS.otherCatalog, items);
            queueRecordSupabaseSync('otherCatalog', item);
            toast(`Item ${code} ditambahkan!`);
            e.target.reset();
            $('addOtherFormContainer')?.classList.remove('open');
            renderOtherCatalog();
            renderActiveSaleForm(true);
        });

        bindRpFormatter('stockDeviceCost');
        bindRpFormatter('stockAccCost');
        bindRpFormatter('stockAccTotalCost');
        bindRpFormatter('stockAccSell');
        bindRpFormatter('catalogServiceCost');
        bindRpFormatter('catalogServiceSell');
        bindRpFormatter('otherItemSell');
        bindRpFormatter('expenseAmount');

        $('searchDeviceStock')?.addEventListener('input', renderDeviceStock);
        $('filterDeviceStatus')?.addEventListener('change', renderDeviceStock);
        $('searchAccStock')?.addEventListener('input', renderAccStock);
        $('filterAccStatus')?.addEventListener('change', renderAccStock);
        $('searchAdminPreorder')?.addEventListener('input', renderPreorders);
        $('filterAdminPreorderStatus')?.addEventListener('change', renderPreorders);
        $('searchAdminImei')?.addEventListener('input', renderAdminImei);
        $('filterAdminImeiStatus')?.addEventListener('change', renderAdminImei);
        $('searchAdminBeaCukai')?.addEventListener('input', renderAdminBeaCukai);
        $('filterAdminBeaCukaiStatus')?.addEventListener('change', renderAdminBeaCukai);
        $('searchAdminIcloud')?.addEventListener('input', renderAdminIcloud);
        $('searchAdminService')?.addEventListener('input', renderServiceOrders);
        $('searchAdminOther')?.addEventListener('input', renderOtherCatalog);
        $('searchReportsLog')?.addEventListener('input', renderReportsLog);
        $('dashboardRangeFilter')?.addEventListener('change', refreshDashboard);
        $('monthlyRecapMonth')?.addEventListener('input', renderMonthlyRecap);
        $('monthlyRecapMonth')?.addEventListener('change', renderMonthlyRecap);

        // Segmented chart tabs (Tren / Pembayaran / Kategori)
        document.querySelectorAll('.dash-chart-tab').forEach(tab => {
            tab.addEventListener('click', function () {
                document.querySelectorAll('.dash-chart-tab').forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                const chartKey = this.dataset.chart;
                ['trend', 'payment', 'category'].forEach(k => {
                    const panel = $(`dashChartPanel${k.charAt(0).toUpperCase() + k.slice(1)}`);
                    if (panel) panel.style.display = k === chartKey ? 'block' : 'none';
                });
            });
        });

        // Modal Detail close handlers — registered here so they work from dashboard too
        $('btnCloseRecapDetail')?.addEventListener('click', closeRecapDetailModal);
        $('btnOkRecapDetail')?.addEventListener('click', closeRecapDetailModal);
        $('modalRecapDetail')?.addEventListener('click', (e) => {
            if (e.target === $('modalRecapDetail')) closeRecapDetailModal();
        });
        $('btnClearAllReports')?.addEventListener('click', () => {
            const warningMessage = 
                'PERINGATAN: Anda akan menghapus SELURUH RIWAYAT LAPORAN TRANSAKSI secara permanen!\n\n' +
                'Data yang akan dihapus: Semua catatan riwayat transaksi penjualan kasir.\n' +
                'Konsekuensi: Seluruh riwayat laporan transaksi akan dihapus secara total, dan semua stok unit HP/iPad serta kuantitas aksesoris yang pernah terjual dalam transaksi tersebut akan DIKEMBALIKAN (revert) ke dalam stok unit Anda.\n\n' +
                'Apakah Anda yakin ingin melanjutkan?';
            if (!confirm(warningMessage)) return;

            requireSuperAdminAuth(async () => {
                loadTransactions().forEach(revertTransactionStock);
                saveTransactions([]);
                renderReportsLog();
                renderDailyReport();
                renderActiveSaleForm();
                toast('Semua riwayat transaksi berhasil dihapus & stok dikembalikan');

                if (getSupabaseConfig().enabled) {
                    try {
                        setSupabaseStatus('Supabase: menghapus semua transaksi...', 'info');
                        await supabaseRequest('transactions', {
                            method: 'DELETE',
                            query: 'id=not.is.null'
                        });
                        setSupabaseStatus('Supabase: transaksi server dihapus.', 'ok');
                    } catch (err) {
                        console.error('Failed to delete transactions on server:', err);
                        setSupabaseStatus(`Supabase: gagal menghapus transaksi server: ${err.message}`, 'err');
                    }
                }
            });
        });


        $('btnResetAllAccs')?.addEventListener('click', () => {
            const warningMessage = 
                'PERINGATAN: Anda akan menghapus SELURUH DATA STOK AKSESORIS secara permanen!\n\n' +
                'Data yang akan dihapus: Semua daftar stok item aksesoris di database lokal maupun server.\n' +
                'Konsekuensi: Stok aksesoris akan menjadi kosong bersih, tidak dapat dikembalikan, dan transaksi penjualan aksesoris tidak dapat dilakukan sampai data diinput kembali.\n\n' +
                'Apakah Anda yakin ingin melanjutkan?';
            if (!confirm(warningMessage)) return;

            requireSuperAdminAuth(async () => {
                save(DB_KEYS.accessories, []);
                renderAccStock();
                if (getSupabaseConfig().enabled) {
                    try {
                        setSupabaseStatus('Supabase: menghapus semua aksesoris...', 'info');
                        await supabaseRequest('accessories', {
                            method: 'DELETE',
                            query: 'code=not.is.null'
                        });
                        setSupabaseStatus('Supabase: aksesoris dihapus.', 'ok');
                        toast('Semua data aksesoris di server berhasil dihapus');
                    } catch (err) {
                        console.error('Gagal menghapus aksesoris di server:', err);
                        setSupabaseStatus('Supabase: gagal mengosongkan aksesoris.', 'err');
                        toast('Gagal menghapus aksesoris di server: ' + err.message, 'err');
                    }
                } else {
                    toast('Semua data aksesoris lokal berhasil dihapus');
                }
            });
        });

        $('btnResetAllServices')?.addEventListener('click', () => {
            const warningMessage = 
                'PERINGATAN: Anda akan menghapus SELURUH DATA KATALOG JASA SERVICE secara permanen!\n\n' +
                'Data yang akan dihapus: Semua daftar jasa service dan tarifnya di database lokal maupun server.\n' +
                'Konsekuensi: Katalog jasa service kosong bersih, tidak dapat dikembalikan, dan kasir tidak dapat memilih layanan cepat/tarif pada nota service.\n\n' +
                'Apakah Anda yakin ingin melanjutkan?';
            if (!confirm(warningMessage)) return;

            requireSuperAdminAuth(async () => {
                save(DB_KEYS.serviceCatalog, []);
                renderServiceCatalog();
                if (getSupabaseConfig().enabled) {
                    try {
                        setSupabaseStatus('Supabase: menghapus semua jasa service...', 'info');
                        await supabaseRequest('serviceCatalog', {
                            method: 'DELETE',
                            query: 'code=not.is.null'
                        });
                        setSupabaseStatus('Supabase: katalog service dihapus.', 'ok');
                        toast('Semua data katalog service di server berhasil dihapus');
                    } catch (err) {
                        console.error('Gagal menghapus katalog service di server:', err);
                        setSupabaseStatus('Supabase: gagal mengosongkan katalog service.', 'err');
                        toast('Gagal menghapus katalog service di server: ' + err.message, 'err');
                    }
                } else {
                    toast('Semua data katalog service lokal berhasil dihapus');
                }
            });
        });

        $('btnResetAllOthers')?.addEventListener('click', () => {
            const warningMessage = 
                'PERINGATAN: Anda akan menghapus SELURUH DATA KATALOG LAIN-LAIN secara permanen!\n\n' +
                'Data yang akan dihapus: Semua daftar item katalog kategori lain-lain di database lokal maupun server.\n' +
                'Konsekuensi: Katalog item lain-lain kosong bersih, tidak dapat dikembalikan, dan item lain-lain tidak dapat dipilih saat transaksi.\n\n' +
                'Apakah Anda yakin ingin melanjutkan?';
            if (!confirm(warningMessage)) return;

            requireSuperAdminAuth(async () => {
                save(DB_KEYS.otherCatalog, []);
                renderOtherCatalog();
                if (getSupabaseConfig().enabled) {
                    try {
                        setSupabaseStatus('Supabase: menghapus semua katalog lain-lain...', 'info');
                        await supabaseRequest('otherCatalog', {
                            method: 'DELETE',
                            query: 'code=not.is.null'
                        });
                        setSupabaseStatus('Supabase: katalog lain-lain dihapus.', 'ok');
                        toast('Semua data katalog lain-lain di server berhasil dihapus');
                    } catch (err) {
                        console.error('Gagal menghapus katalog lain-lain di server:', err);
                        setSupabaseStatus('Supabase: gagal mengosongkan katalog lain-lain.', 'err');
                        toast('Gagal menghapus katalog lain-lain di server: ' + err.message, 'err');
                    }
                } else {
                    toast('Semua data katalog lain-lain lokal berhasil dihapus');
                }
            });
        });

        $('btnResetAllPreorders')?.addEventListener('click', () => {
            const warningMessage = 
                'PERINGATAN: Anda akan menghapus SELURUH DATA REQUEST PREORDER secara permanen!\n\n' +
                'Data yang akan dihapus: Semua daftar pesanan preorder konsumen dan catatan uang muka (DP) di database lokal maupun server.\n' +
                'Konsekuensi: Semua riwayat antrean preorder hilang permanen, tidak dapat dikembalikan, dan Anda akan kehilangan tracking uang muka preorder.\n\n' +
                'Apakah Anda yakin ingin melanjutkan?';
            if (!confirm(warningMessage)) return;

            requireSuperAdminAuth(async () => {
                save(DB_KEYS.preorders, []);
                renderPreorders();
                if (getSupabaseConfig().enabled) {
                    try {
                        setSupabaseStatus('Supabase: menghapus semua preorder...', 'info');
                        await supabaseRequest('preorders', {
                            method: 'DELETE',
                            query: 'code=not.is.null'
                        });
                        setSupabaseStatus('Supabase: preorder dihapus.', 'ok');
                        toast('Semua data preorder di server berhasil dihapus');
                    } catch (err) {
                        console.error('Gagal menghapus preorder di server:', err);
                        setSupabaseStatus('Supabase: gagal mengosongkan preorder.', 'err');
                        toast('Gagal menghapus preorder di server: ' + err.message, 'err');
                    }
                } else {
                    toast('Semua data preorder lokal berhasil dihapus');
                }
            });
        });

        $('btnResetAllServiceOrders')?.addEventListener('click', () => {
            const warningMessage = 
                'PERINGATAN: Anda akan menghapus SELURUH DATA ANTREAN NOTA SERVICE secara permanen!\n\n' +
                'Data yang akan dihapus: Semua data nota service masuk, dikerjakan, selesai, dan batal di database lokal maupun server.\n' +
                'Konsekuensi: Semua riwayat dan antrean service pelanggan akan hilang permanen, status pengerjaan hilang, dan tidak dapat dikembalikan.\n\n' +
                'Apakah Anda yakin ingin melanjutkan?';
            if (!confirm(warningMessage)) return;

            requireSuperAdminAuth(async () => {
                save(DB_KEYS.serviceOrders, []);
                renderServiceOrders();
                if (getSupabaseConfig().enabled) {
                    try {
                        setSupabaseStatus('Supabase: menghapus semua nota service...', 'info');
                        await supabaseRequest('serviceOrders', {
                            method: 'DELETE',
                            query: 'code=not.is.null'
                        });
                        setSupabaseStatus('Supabase: nota service dihapus.', 'ok');
                        toast('Semua data nota service di server berhasil dihapus');
                    } catch (err) {
                        console.error('Gagal menghapus nota service di server:', err);
                        setSupabaseStatus('Supabase: gagal mengosongkan nota service.', 'err');
                        toast('Gagal menghapus nota service di server: ' + err.message, 'err');
                    }
                } else {
                    toast('Semua data nota service lokal berhasil dihapus');
                }
            });
        });

        $('btnResetAllExpenses')?.addEventListener('click', () => {
            const warningMessage = 
                'PERINGATAN: Anda akan menghapus SELURUH DATA BEBAN OPERASIONAL secara permanen!\n\n' +
                'Data yang akan dihapus: Semua catatan pengeluaran/beban operasional bulanan toko di database lokal maupun server.\n' +
                'Konsekuensi: Semua riwayat pengeluaran bulanan akan hilang permanen, laporan laba-rugi bersih bulanan akan dikalkulasi ulang menjadi tanpa beban.\n\n' +
                'Apakah Anda yakin ingin melanjutkan?';
            if (!confirm(warningMessage)) return;

            requireSuperAdminAuth(async () => {
                saveExpenses([]);
                renderExpensesPanel();
                refreshDashboard();
                if (getSupabaseConfig().enabled) {
                    try {
                        setSupabaseStatus('Supabase: menghapus semua beban...', 'info');
                        await supabaseRequest('expenses', {
                            method: 'DELETE',
                            query: 'id=not.is.null'
                        });
                        setSupabaseStatus('Supabase: beban dihapus.', 'ok');
                        toast('Semua data beban operasional di server berhasil dihapus');
                    } catch (err) {
                        console.error('Gagal menghapus beban di server:', err);
                        setSupabaseStatus('Supabase: gagal mengosongkan beban.', 'err');
                        toast('Gagal menghapus beban di server: ' + err.message, 'err');
                    }
                } else {
                    toast('Semua data beban operasional lokal berhasil dihapus');
                }
            });
        });
    }

    function escapePdfText(value) {
        return String(value ?? '').replace(/[\\()]/g, '\\$&').replace(/\r?\n/g, ' ');
    }

    function pdfLineObjects(lines, title) {
        const safeLines = [title, `Tanggal export: ${fmtDate(today())}`, '', ...lines].map(line => String(line).slice(0, 120));
        const pages = [];
        for (let i = 0; i < safeLines.length; i += 48) pages.push(safeLines.slice(i, i + 48));
        return pages.length ? pages : [['Tidak ada data']];
    }

    function buildSimplePdf(lines, title) {
        const pageLines = pdfLineObjects(lines, title);
        const objects = [];
        const addObject = value => {
            objects.push(value);
            return objects.length;
        };
        const catalogId = addObject('<< /Type /Catalog /Pages 2 0 R >>');
        const pagesId = addObject('');
        const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
        const pageIds = [];
        pageLines.forEach(linesForPage => {
            // 58mm page: start at top (y≈1988), x=4, font size 7pt, line height 10pt
            const content = [
                'BT',
                '/F1 7 Tf',
                '4 1988 Td',
                ...linesForPage.map((line, index) => `${index ? '0 -10 Td ' : ''}(${escapePdfText(line)}) Tj`),
                'ET',
            ].join('\n');
            const contentLength = new TextEncoder().encode(content).length;
            const contentId = addObject(`<< /Length ${contentLength} >>\nstream\n${content}\nendstream`);
            // 58mm = 164.4pt width, unlimited roll height set to 2000pt (tall enough for any receipt)
            const pageId = addObject(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 164.4 2000] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
            pageIds.push(pageId);
        });
        objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
        objects[catalogId - 1] = '<< /Type /Catalog /Pages 2 0 R >>';
        let pdf = '%PDF-1.4\n';
        const offsets = [0];
        objects.forEach((object, index) => {
            offsets.push(pdf.length);
            pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
        });
        const xrefOffset = pdf.length;
        pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
        offsets.slice(1).forEach(offset => {
            pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
        });
        pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
        return pdf;
    }

    function getTxNetSell(tx) {
        if (!tx) return 0;
        let sell = Number(tx.sell) || 0;
        if (tx.preorderCode && tx.category !== 'preorder_dp') {
            const preorder = loadPreorders().find(p => p.code === tx.preorderCode);
            if (preorder) {
                const dp = Number(preorder.dpAmount) || 0;
                sell = Math.max(0, sell - dp);
            }
        }
        return sell;
    }

    async function openNativePdfModal(filename, base64) {
        currentNativePdfFilename = filename;
        currentNativePdfBase64 = base64;
        
        const nativePlugin = receiptNativePlugin();
        if (nativePlugin) {
            const filenameEl = $('nativePdfFilename');
            if (filenameEl) filenameEl.textContent = filename;
            $('nativePdfModal')?.classList.add('open');
            return;
        }

        // Priority 2: Web Share API with File
        try {
            const byteChars = atob(base64);
            const byteArray = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) {
                byteArray[i] = byteChars.charCodeAt(i);
            }
            const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
            const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                await navigator.share({
                    title: filename,
                    text: `Laporan Igood - ${filename}`,
                    files: [pdfFile],
                });
                toast('PDF berhasil dibagikan!');
                return;
            }
        } catch (shareErr) {
            if (shareErr.name === 'AbortError') {
                toast('Berbagi dibatalkan', 'info');
                return;
            }
            console.warn('Web Share file failed:', shareErr);
        }

        // Priority 3: Blob URL download fallback
        try {
            const byteChars = atob(base64);
            const byteArray = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) {
                byteArray[i] = byteChars.charCodeAt(i);
            }
            const pdfBlob = new Blob([byteArray], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            }, 200);
            toast('File PDF berhasil diunduh');
        } catch (dlErr) {
            toast('Gagal membagikan PDF. Pastikan aplikasi terbaru.', 'err');
        }
    }

    async function exportToPdf(data, title, filename) {
        const rows = Array.isArray(data) ? data : [];
        toast('Memproses pembuatan PDF...', 'info');
        
        try {
            await loadJsPdfLibrary();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'pt', 'a4');
            
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(37, 99, 235);
            doc.text(`IGOOD INVENTORY`, 40, 40);
            
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100, 116, 139);
            doc.text(title, 40, 58);
            doc.text(`Dicetak pada: ${fmtDate(today())} | ${new Date().toLocaleTimeString('id-ID')}`, 40, 72);

            let headers = [];
            let body = [];

            const isDevices = title.toLowerCase().includes('stok hp') || filename.toLowerCase().includes('stok-hp');
            const isAccs = title.toLowerCase().includes('aksesoris') || filename.toLowerCase().includes('aksesoris');

            if (isDevices) {
                headers = ['No', 'Kode', 'Kategori', 'Model', 'Storage', 'Warna', 'Kondisi', 'Garansi', 'Modal', 'Status'];
                body = rows.map((d, index) => [
                    index + 1,
                    d.code || '-',
                    esc(transactionCategoryLabel(d.category)),
                    d.model || '-',
                    d.storage || '-',
                    d.color || '-',
                    d.condition || 'Bekas',
                    d.warranty || '-',
                    fmtRp(d.cost || 0),
                    d.status || 'Available'
                ]);
            } else if (isAccs) {
                headers = ['No', 'Kode', 'Kategori', 'Nama Aksesoris', 'Qty', 'Modal', 'Jual'];
                body = rows.map((a, index) => [
                    index + 1,
                    a.code || '-',
                    a.category || '-',
                    a.name || '-',
                    a.qty || 0,
                    fmtRp(a.cost || 0),
                    fmtRp(a.sell || 0)
                ]);
            } else {
                headers = ['No', 'Tanggal', 'Shift', 'Kategori', 'Kode', 'Item', 'Qty', 'Modal', 'Jual', 'Metode'];
                body = rows.map((t, index) => [
                    index + 1,
                    fmtDate(t.date),
                    t.shift || '-',
                    esc(transactionCategoryLabel(t.category)),
                    t.code || '-',
                    t.itemName || '-',
                    t.quantity || 1,
                    fmtRp(t.cost || 0),
                    fmtRp(t.sell || 0),
                    t.paymentMethod || '-'
                ]);
            }

            doc.autoTable({
                head: [headers],
                body: body,
                startY: 90,
                styles: { fontSize: 8, cellPadding: 5 },
                headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                footStyles: { fillColor: [237, 244, 255], textColor: 37, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [250, 251, 252] },
                margin: { left: 40, right: 40 }
            });
            
            const finalFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
            window.__igoodLastPdfExport = { filename: finalFilename, rows: rows.length, title };

            // Priority 1: Capacitor native plugin (share langsung)
            const nativePlugin = receiptNativePlugin();
            if (nativePlugin?.sharePdf) {
                const base64 = (doc.output('datauristring') || '').split('base64,')[1] || '';
                try {
                    await nativePlugin.sharePdf({ filename: finalFilename, base64 });
                    toast('Membuka menu bagikan PDF...');
                    return;
                } catch (nativeErr) {
                    console.warn('Native sharePdf failed, trying Web Share API...', nativeErr);
                }
            }

            // Priority 2: Web Share API with File (Android Chrome, mobile browsers)
            const pdfBlob = doc.output('blob');
            const pdfFile = new File([pdfBlob], finalFilename, { type: 'application/pdf' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                try {
                    await navigator.share({
                        title: title,
                        text: `Laporan ${title} - Igood Report`,
                        files: [pdfFile],
                    });
                    toast('PDF berhasil dibagikan!');
                    return;
                } catch (shareErr) {
                    if (shareErr.name === 'AbortError') {
                        toast('Berbagi dibatalkan', 'info');
                        return;
                    }
                    console.warn('Web Share file failed, trying download...', shareErr);
                }
            }

            // Priority 3: Fallback download via Blob URL (works on desktop)
            try {
                const blobUrl = URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = finalFilename;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    URL.revokeObjectURL(blobUrl);
                }, 200);
                toast('File PDF berhasil diunduh');
            } catch (dlErr) {
                console.warn('Blob download failed, trying doc.save...', dlErr);
                doc.save(finalFilename);
                toast('File PDF berhasil diunduh');
            }
        } catch (e) {
            console.error('PDF generation failed:', e);
            toast('Gagal membuat PDF. Pastikan aplikasi terbaru.', 'err');
            window.__igoodLastPdfExport = { filename: filename.endsWith('.pdf') ? filename : `${filename}.pdf`, rows: rows.length, title };
        }
    }

    function renderAdminImei() {
        const tbody = $('adminImeiTableBody');
        if (!tbody) return;
        const search = ($('searchAdminImei')?.value || '').toLowerCase();
        const filter = $('filterAdminImeiStatus')?.value || 'all';
        
        let transactions = loadTransactions();
        let imeiOrders = transactions.filter(tx => tx.category === 'order_jasa');
        
        if (filter !== 'all') {
            imeiOrders = imeiOrders.filter(tx => {
                let status = tx.status || tx.serviceStatus || 'Masuk';
                if (status === 'On-progress') status = 'On Progress';
                if (status === 'Done') status = 'Selesai';
                return status === filter;
            });
        }
        
        if (search) {
            imeiOrders = imeiOrders.filter(tx => 
                `${tx.buyerName || ''} ${tx.buyerWa || ''} ${tx.jasaUnitName || ''} ${tx.imei || tx.jasaImei || ''} ${tx.jasaNote || ''}`
                .toLowerCase().includes(search)
            );
        }
        
        imeiOrders.sort((a, b) => {
            const dateA = a.date + ' ' + (a.createdAt || '');
            const dateB = b.date + ' ' + (b.createdAt || '');
            return dateB.localeCompare(dateA);
        });
        
        if (!imeiOrders.length) {
            tbody.innerHTML = '<div class="empty-state-text text-dim" style="text-align:center; padding: 24px; background:#fff; border-radius: var(--r-sm); border:1px dashed var(--border);">Tidak ada data order IMEI</div>';
            return;
        }
        
        tbody.innerHTML = imeiOrders.map(tx => {
            let status = tx.status || tx.serviceStatus || 'Masuk';
            if (status === 'On-progress') status = 'On Progress';
            if (status === 'Done') status = 'Selesai';
            
            const statusClass = status.toLowerCase() === 'on progress' ? 'progress' : (status.toLowerCase() === 'selesai' ? 'done' : 'masuk');
            const statusBadge = status === 'Selesai' ? '<span class="badge badge-ok">Selesai</span>' : (status === 'On Progress' ? '<span class="badge badge-purple">On Progress</span>' : '<span class="badge badge-warn">Masuk</span>');
            const title = `${esc(tx.buyerName || 'User')} — ${esc(tx.jasaUnitName || tx.itemName || 'Order IMEI')}`;

            return `
            <div class="stock-accordion-card" id="imei-card-${esc(tx.id)}">
                <div class="stock-card-header" onclick="toggleStockCard(this)">
                    <div class="stock-card-left">
                        <span class="stock-card-code">${esc(tx.code || tx.id)}</span>
                        <span class="stock-card-name" title="${title}">${title}</span>
                    </div>
                    <div class="stock-card-right">
                        ${statusBadge}
                        <i class="ri-arrow-down-s-line stock-expand-icon"></i>
                    </div>
                </div>
                <div class="stock-card-body">
                    <div class="stock-grid-details">
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Tanggal / Shift</span>
                            <span class="stock-detail-val">${esc(fmtDate(tx.date))} (${esc(tx.shift || '-')})</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Nama User</span>
                            <span class="stock-detail-val font-bold">${esc(tx.buyerName || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">No. WA</span>
                            <span class="stock-detail-val mono">${esc(tx.buyerWa || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Merek</span>
                            <span class="stock-detail-val text-capitalize">${esc(tx.jasaCategory || 'iphone')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Unit HP</span>
                            <span class="stock-detail-val font-bold text-primary">${esc(tx.jasaUnitName || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Garansi</span>
                            <span class="stock-detail-val">${esc(tx.jasaWarranty || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">IMEI</span>
                            <span class="stock-detail-val mono">${esc(tx.imei || tx.jasaImei || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Harga</span>
                            <span class="stock-detail-val mono font-bold text-success">${esc(fmtRp(tx.sell || 0))}</span>
                        </div>
                        <div class="stock-detail-item" style="grid-column: 1 / -1;">
                            <span class="stock-detail-label">Keterangan</span>
                            <span class="stock-detail-val text-dim">${esc(tx.jasaNote || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Status Order</span>
                            <div style="margin-top:2px;">
                                <select id="adminImeiStatus-${esc(tx.id)}" class="text-sm imei-status-${statusClass}" style="width: 100%; padding: 6px; border-radius: 6px;" onchange="this.className = 'text-sm imei-status-' + (this.value.toLowerCase() === 'on progress' ? 'progress' : (this.value.toLowerCase() === 'selesai' ? 'done' : 'masuk')); window.updateImeiStatus('${esc(tx.id)}', this.value)">
                                    <option value="Masuk" ${status === 'Masuk' ? 'selected' : ''}>Masuk</option>
                                    <option value="On Progress" ${status === 'On Progress' ? 'selected' : ''}>On Progress</option>
                                    <option value="Selesai" ${status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="stock-card-actions">
                        <button class="btn btn-sm btn-ghost btn-edit" onclick="event.stopPropagation(); window.editTransaction('${esc(tx.id)}')" title="Edit"><i class="ri-edit-2-line"></i> Edit</button>
                        <button class="btn-del" onclick="event.stopPropagation(); window.voidTransaction('${esc(tx.id)}')" title="Hapus"><i class="ri-delete-bin-6-line"></i></button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }
    
    window.updateImeiStatus = function (txId, newStatus) {
        const transactions = loadTransactions();
        const tx = transactions.find(t => t.id === txId);
        if (!tx) {
            toast('Transaksi tidak ditemukan', 'err');
            return;
        }
        tx.status = newStatus;
        tx.serviceStatus = newStatus;
        tx.updatedAt = new Date().toISOString();
        
        saveTransactions(transactions);
        queueSaleSupabaseSync(tx);
        renderAdminImei();
        renderActiveSaleForm();
        toast(`Status order IMEI ${tx.buyerName} diubah ke ${newStatus}`);
    };

    function renderAdminBeaCukai() {
        const tbody = $('adminBeaCukaiTableBody');
        if (!tbody) return;
        const search = ($('searchAdminBeaCukai')?.value || '').toLowerCase();
        const filter = $('filterAdminBeaCukaiStatus')?.value || 'all';
        
        let transactions = loadTransactions();
        let beacukaiOrders = transactions.filter(tx => tx.category === 'order_jasa_beacukai');
        
        if (filter !== 'all') {
            beacukaiOrders = beacukaiOrders.filter(tx => {
                let status = tx.status || tx.serviceStatus || 'Masuk';
                if (status === 'On-progress') status = 'On Progress';
                if (status === 'Done') status = 'Selesai';
                return status === filter;
            });
        }
        
        if (search) {
            beacukaiOrders = beacukaiOrders.filter(tx => 
                `${tx.buyerName || ''} ${tx.buyerWa || ''} ${tx.jasaUnitName || ''} ${tx.imei || tx.jasaImei || ''} ${tx.jasaNote || ''}`
                .toLowerCase().includes(search)
            );
        }
        
        beacukaiOrders.sort((a, b) => {
            const dateA = a.date + ' ' + (a.createdAt || '');
            const dateB = b.date + ' ' + (b.createdAt || '');
            return dateB.localeCompare(dateA);
        });
        
        if (!beacukaiOrders.length) {
            tbody.innerHTML = '<div class="empty-state-text text-dim" style="text-align:center; padding: 24px; background:#fff; border-radius: var(--r-sm); border:1px dashed var(--border);">Tidak ada data order Bea Cukai</div>';
            return;
        }
        
        tbody.innerHTML = beacukaiOrders.map(tx => {
            let status = tx.status || tx.serviceStatus || 'Masuk';
            if (status === 'On-progress') status = 'On Progress';
            if (status === 'Done') status = 'Selesai';
            
            const statusClass = status.toLowerCase() === 'on progress' ? 'progress' : (status.toLowerCase() === 'selesai' ? 'done' : 'masuk');
            const statusBadge = status === 'Selesai' ? '<span class="badge badge-ok">Selesai</span>' : (status === 'On Progress' ? '<span class="badge badge-purple">On Progress</span>' : '<span class="badge badge-warn">Masuk</span>');
            const title = `${esc(tx.buyerName || 'User')} — ${esc(tx.jasaUnitName || tx.itemName || 'Bea Cukai')}`;

            return `
            <div class="stock-accordion-card" id="beacukai-card-${esc(tx.id)}">
                <div class="stock-card-header" onclick="toggleStockCard(this)">
                    <div class="stock-card-left">
                        <span class="stock-card-code">${esc(tx.code || tx.id)}</span>
                        <span class="stock-card-name" title="${title}">${title}</span>
                    </div>
                    <div class="stock-card-right">
                        ${statusBadge}
                        <i class="ri-arrow-down-s-line stock-expand-icon"></i>
                    </div>
                </div>
                <div class="stock-card-body">
                    <div class="stock-grid-details">
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Tanggal / Shift</span>
                            <span class="stock-detail-val">${esc(fmtDate(tx.date))} (${esc(tx.shift || '-')})</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Nama User</span>
                            <span class="stock-detail-val font-bold">${esc(tx.buyerName || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">No. WA</span>
                            <span class="stock-detail-val mono">${esc(tx.buyerWa || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Merek</span>
                            <span class="stock-detail-val text-capitalize">${esc(tx.jasaCategory || 'iphone')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Unit HP</span>
                            <span class="stock-detail-val font-bold text-primary">${esc(tx.jasaUnitName || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Garansi</span>
                            <span class="stock-detail-val">${esc(tx.jasaWarranty || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">IMEI</span>
                            <span class="stock-detail-val mono">${esc(tx.imei || tx.jasaImei || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Harga</span>
                            <span class="stock-detail-val mono font-bold text-success">${esc(fmtRp(tx.sell || 0))}</span>
                        </div>
                        <div class="stock-detail-item" style="grid-column: 1 / -1;">
                            <span class="stock-detail-label">Keterangan</span>
                            <span class="stock-detail-val text-dim">${esc(tx.jasaNote || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Status Order</span>
                            <div style="margin-top:2px;">
                                <select id="adminBeaCukaiStatus-${esc(tx.id)}" class="text-sm imei-status-${statusClass}" style="width: 100%; padding: 6px; border-radius: 6px;" onchange="this.className = 'text-sm imei-status-' + (this.value.toLowerCase() === 'on progress' ? 'progress' : (this.value.toLowerCase() === 'selesai' ? 'done' : 'masuk')); window.updateBeaCukaiStatus('${esc(tx.id)}', this.value)">
                                    <option value="Masuk" ${status === 'Masuk' ? 'selected' : ''}>Masuk</option>
                                    <option value="On Progress" ${status === 'On Progress' ? 'selected' : ''}>On Progress</option>
                                    <option value="Selesai" ${status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="stock-card-actions">
                        <button class="btn btn-sm btn-ghost btn-edit" onclick="event.stopPropagation(); window.editTransaction('${esc(tx.id)}')" title="Edit"><i class="ri-edit-2-line"></i> Edit</button>
                        <button class="btn-del" onclick="event.stopPropagation(); window.voidTransaction('${esc(tx.id)}')" title="Hapus"><i class="ri-delete-bin-6-line"></i></button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }
    
    window.updateBeaCukaiStatus = function (txId, newStatus) {
        const transactions = loadTransactions();
        const tx = transactions.find(t => t.id === txId);
        if (!tx) {
            toast('Transaksi tidak ditemukan', 'err');
            return;
        }
        tx.status = newStatus;
        tx.serviceStatus = newStatus;
        tx.updatedAt = new Date().toISOString();
        
        saveTransactions(transactions);
        queueSaleSupabaseSync(tx);
        renderAdminBeaCukai();
        renderActiveSaleForm();
        toast(`Status order Bea Cukai ${tx.buyerName} diubah ke ${newStatus}`);
    };

    function renderAdminIcloud() {
        const tbody = $('adminIcloudTableBody');
        if (!tbody) return;
        const search = ($('searchAdminIcloud')?.value || '').toLowerCase();
        
        let transactions = loadTransactions();
        let icloudOrders = transactions.filter(tx => tx.category === 'order_jasa_icloud');
        
        if (search) {
            icloudOrders = icloudOrders.filter(tx => 
                `${tx.icloudFullName || ''} ${tx.icloudEmail || ''} ${tx.icloudPhone || ''} ${tx.salesName || ''}`
                .toLowerCase().includes(search)
            );
        }
        
        icloudOrders.sort((a, b) => {
            const dateA = a.date + ' ' + (a.createdAt || '');
            const dateB = b.date + ' ' + (b.createdAt || '');
            return dateB.localeCompare(dateA);
        });
        
        if (!icloudOrders.length) {
            tbody.innerHTML = '<div class="empty-state-text text-dim" style="text-align:center; padding: 24px; background:#fff; border-radius: var(--r-sm); border:1px dashed var(--border);">Tidak ada data iCloud</div>';
            return;
        }
        
        tbody.innerHTML = icloudOrders.map(tx => {
            const title = `${esc(tx.icloudFullName || tx.buyerName || 'User')} — ${esc(tx.icloudEmail || 'iCloud')}`;
            return `
            <div class="stock-accordion-card" id="icloud-card-${esc(tx.id)}">
                <div class="stock-card-header" onclick="toggleStockCard(this)">
                    <div class="stock-card-left">
                        <span class="stock-card-code">${esc(tx.code || tx.id)}</span>
                        <span class="stock-card-name" title="${title}">${title}</span>
                    </div>
                    <div class="stock-card-right">
                        <span class="badge badge-purple">iCloud</span>
                        <i class="ri-arrow-down-s-line stock-expand-icon"></i>
                    </div>
                </div>
                <div class="stock-card-body">
                    <div class="stock-grid-details">
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Tanggal / Shift</span>
                            <span class="stock-detail-val">${esc(fmtDate(tx.date))} (${esc(tx.shift || '-')})</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Nama Lengkap</span>
                            <span class="stock-detail-val font-bold">${esc(tx.icloudFullName || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">No. WA</span>
                            <span class="stock-detail-val mono">${esc(tx.icloudPhone || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Email Aktif</span>
                            <span class="stock-detail-val font-bold text-primary">${esc(tx.icloudEmail || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Kata Sandi</span>
                            <span class="stock-detail-val mono font-bold">${esc(tx.icloudPassword || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Tgl Lahir</span>
                            <span class="stock-detail-val">${esc(tx.icloudDob || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">No. Telp</span>
                            <span class="stock-detail-val mono">${esc(tx.icloudPhone || '-')}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Harga</span>
                            <span class="stock-detail-val mono font-bold text-success">${esc(fmtRp(tx.sell || 0))}</span>
                        </div>
                        <div class="stock-detail-item">
                            <span class="stock-detail-label">Sales</span>
                            <span class="stock-detail-val">${esc(tx.salesName || '-')}</span>
                        </div>
                    </div>
                    <div class="stock-card-actions">
                        <button class="btn btn-sm btn-ghost btn-edit" onclick="event.stopPropagation(); window.editTransaction('${esc(tx.id)}')" title="Edit"><i class="ri-edit-2-line"></i> Edit</button>
                        <button class="btn-del" onclick="event.stopPropagation(); window.voidTransaction('${esc(tx.id)}')" title="Hapus"><i class="ri-delete-bin-6-line"></i></button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    // ── EMPLOYEE MANAGEMENT & PERFORMANCES ───────────────────────────────────
    function getSalesEmployeeOptions(selectedName = '') {
        const employees = loadEmployees();
        let options = '<option value="">-- Pilih Nama Sales --</option>';
        let found = false;
        employees.forEach(emp => {
            const isSelected = selectedName && (emp.name.toLowerCase().trim() === selectedName.toLowerCase().trim());
            if (isSelected) found = true;
            const roleBadge = emp.role === 'Selles' ? '' : ` (${emp.role})`;
            options += `<option value="${esc(emp.name)}" ${isSelected ? 'selected' : ''}>${esc(emp.name)}${esc(roleBadge)}</option>`;
        });
        if (selectedName && !found) {
            options += `<option value="${esc(selectedName)}" selected>${esc(selectedName)}</option>`;
        }
        return options;
    }

    function populateSalesEmployeeDropdowns() {
        const selects = document.querySelectorAll('.sales-employee-select, #saleSalesName, #saleDrawerSalesName, #preorderSalesName, #peditSalesName');
        selects.forEach(select => {
            if (select.tagName === 'SELECT') {
                const currentVal = select.value;
                select.innerHTML = getSalesEmployeeOptions(currentVal);
            }
        });
    }

    function populateEmployeeDropdowns() {
        const employees = loadEmployees();

        // 1. Populate loginUserSelect
        const loginUserSelect = $('loginUserSelect');
        if (loginUserSelect) {
            loginUserSelect.innerHTML = employees.map(emp => `
                <option value="${emp.id}">${esc(emp.name)}</option>
            `).join('');
            loginUserSelect.dispatchEvent(new Event('change'));
        }

        // 2. Populate expenseEmployeeSelect
        const expenseEmployeeSelect = $('expenseEmployeeSelect');
        if (expenseEmployeeSelect) {
            expenseEmployeeSelect.innerHTML = '<option value="">-- Pilih Pegawai --</option>' + employees.map(emp => `
                <option value="${emp.name}">${esc(emp.name)} (${esc(emp.jobTitle)})</option>
            `).join('');
        }

        // 3. Populate sales dropdowns across all sale forms
        populateSalesEmployeeDropdowns();
        populateAdminAccountsDropdown();
    }

    function calculateSellesPerformance() {
        const employees = loadEmployees();
        const transactions = loadTransactions();
        const performance = {};

        // Initialize with all known employees
        employees.forEach(emp => {
            performance[emp.name.toLowerCase().trim()] = {
                name: emp.name,
                role: emp.role,
                totalTx: 0,
                totalOmset: 0
            };
        });

        // Add transaction statistics
        transactions.forEach(tx => {
            const name = (tx.salesName || '').trim();
            if (!name) return;
            const key = name.toLowerCase();
            if (!performance[key]) {
                performance[key] = {
                    name: name,
                    role: 'Selles',
                    totalTx: 0,
                    totalOmset: 0
                };
            }
            performance[key].totalTx += 1;
            performance[key].totalOmset += transactionPaymentTotal(tx);
        });

        return Object.values(performance);
    }

    function renderEmployees(query = '') {
        const employees = loadEmployees();
        const activeEmp = loadActiveEmployee();
        const tbody = $('adminEmployeesTableBody');
        if (!tbody) return;

        const filtered = employees.filter(emp => 
            emp.name.toLowerCase().includes(query) || 
            emp.jobTitle.toLowerCase().includes(query) || 
            emp.role.toLowerCase().includes(query)
        );

        if (!filtered.length) {
            tbody.innerHTML = '<div class="text-center text-dim" style="padding: 24px; background: #fff; border-radius: 12px; border: 1px dashed var(--border-color); font-size: 13px;">Tidak ada data pegawai</div>';
        } else {
            tbody.innerHTML = filtered.map(emp => {
                const isSelf = activeEmp && activeEmp.id === emp.id;
                const isOwner = emp.id === '1';
                const showDelete = !isOwner && !isSelf;
                const initial = (emp.name || 'P').trim().charAt(0).toUpperCase();

                let roleColor = '#10b981';
                let roleBg = '#ecfdf5';
                let roleBorder = '#a7f3d0';
                if (emp.role === 'Super Admin') {
                    roleColor = '#6366f1';
                    roleBg = '#eef2ff';
                    roleBorder = '#c7d2fe';
                } else if (emp.role === 'Admin') {
                    roleColor = '#0284c7';
                    roleBg = '#f0f9ff';
                    roleBorder = '#bae6fd';
                }

                return `
                    <div class="employee-card-compact" style="display: flex; align-items: center; justify-content: space-between; padding: 11px 14px; background: #ffffff; border: 1px solid var(--border-color); border-radius: 12px; transition: all 0.2s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.02);">
                        <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: ${roleBg}; border: 1px solid ${roleBorder}; color: ${roleColor}; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                ${esc(initial)}
                            </div>
                            <div style="min-width: 0;">
                                <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                                    <strong style="font-size: 13.5px; color: var(--text-main); font-weight: 700;">${esc(emp.name)}</strong>
                                    <span style="font-size: 9.5px; font-weight: 700; padding: 1px 7px; border-radius: 10px; background: ${roleBg}; color: ${roleColor}; border: 1px solid ${roleBorder}; text-transform: uppercase; letter-spacing: 0.3px;">
                                        ${esc(emp.role)}
                                    </span>
                                </div>
                                <div class="text-xs text-dim" style="margin-top: 1px; display: flex; align-items: center; gap: 4px; font-size: 11.5px;">
                                    <i class="ri-briefcase-line" style="font-size: 11px;"></i> ${esc(emp.jobTitle)}
                                </div>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0; margin-left: 8px;">
                            ${(emp.role === 'Super Admin' || emp.role === 'Admin') ? `
                            <button type="button" class="btn btn-sm btn-change-pass-employee" data-id="${emp.id}" title="Ubah Kata Sandi / PIN" style="width: 32px; height: 32px; padding: 0; border-radius: 8px; border: 1px solid #e0e7ff; background: #eef2ff; color: #4f46e5; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">
                                <i class="ri-key-2-line" style="font-size: 14px;"></i>
                            </button>
                            ` : ''}
                            <button type="button" class="btn btn-sm btn-edit-employee" data-id="${emp.id}" title="Edit Data" style="width: 32px; height: 32px; padding: 0; border-radius: 8px; border: 1px solid var(--border-color); background: #f8fafc; color: var(--text-main); display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">
                                <i class="ri-pencil-line" style="font-size: 14px;"></i>
                            </button>
                            ${showDelete ? `
                            <button type="button" class="btn btn-sm btn-delete-employee" data-id="${emp.id}" title="Hapus Akun" style="width: 32px; height: 32px; padding: 0; border-radius: 8px; border: 1px solid #fee2e2; background: #fff5f5; color: #ef4444; display: inline-flex; align-items: center; justify-content: center; cursor: pointer;">
                                <i class="ri-delete-bin-line" style="font-size: 14px;"></i>
                            </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            // Bind change password buttons
            tbody.querySelectorAll('.btn-change-pass-employee').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    const emp = employees.find(e => e.id === id);
                    if (emp) {
                        const modal = $('modalChangeEmployeePassword');
                        const empIdInput = $('changePassEmpId');
                        const empInfo = $('changePassEmpInfo');
                        const newInput = $('changePassNewInput');
                        const confirmInput = $('changePassConfirmInput');
                        const err = $('changePassError');
                        if (empIdInput) empIdInput.value = emp.id;
                        if (empInfo) empInfo.textContent = `${emp.name} (${emp.role})`;
                        if (newInput) newInput.value = '';
                        if (confirmInput) confirmInput.value = '';
                        if (err) err.style.display = 'none';
                        if (modal) modal.classList.add('open');
                        setTimeout(() => newInput?.focus(), 150);
                    }
                });
            });

            // Bind edit buttons
            tbody.querySelectorAll('.btn-edit-employee').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    const emp = employees.find(e => e.id === id);
                    if (emp) {
                        const formContainer = $('addEmployeeFormContainer');
                        if (formContainer) formContainer.style.display = 'block';
                        
                        const nameInput = $('employeeName');
                        if (nameInput) nameInput.value = emp.name;
                        const jobSelect = $('employeeJobTitle');
                        if (jobSelect) jobSelect.value = emp.jobTitle;
                        const roleSelect = $('employeeRole');
                        if (roleSelect) roleSelect.value = emp.role;
                        const editIdInput = $('editEmployeeId');
                        if (editIdInput) editIdInput.value = emp.id;
                        
                        nameInput?.focus();
                    }
                });
            });

            // Bind delete buttons
            tbody.querySelectorAll('.btn-delete-employee').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.id;
                    const emp = employees.find(e => e.id === id);
                    if (emp && confirm(`Apakah Anda yakin ingin menghapus pegawai ${emp.name}?`)) {
                        const updated = employees.filter(e => e.id !== id);
                        saveEmployees(updated);
                        queueRecordSupabaseDelete('employees', 'id', id);
                        toast('Pegawai berhasil dihapus');
                        renderEmployees();
                        populateEmployeeDropdowns();
                    }
                });
            });
        }

        // Also render the sales performance statistics (compact cards)
        const perfData = calculateSellesPerformance();
        const perfTbody = $('adminEmployeePerformanceTableBody');
        if (perfTbody) {
            perfTbody.innerHTML = perfData.length ? perfData.map((item, idx) => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 8px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 10px; font-weight: 700; width: 20px; height: 20px; border-radius: 5px; background: #e2e8f0; color: #475569; display: flex; align-items: center; justify-content: center;">${idx + 1}</span>
                        <div>
                            <strong style="font-size: 12.5px; color: var(--text-main);">${esc(item.name)}</strong>
                            <div class="text-xxs text-dim" style="font-size: 11px;">${item.totalTx} Transaksi Selesai</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span class="mono price" style="font-size: 12.5px; font-weight: 700; color: var(--primary);">${fmtRp(item.totalOmset)}</span>
                    </div>
                </div>
            `).join('') : '<div class="text-center text-dim" style="padding: 14px; font-size: 12px;">Belum ada data performa sales</div>';
        }
    }

    function updateActiveEmployeeBar() {
        const activeEmp = loadActiveEmployee();
        const activeEmployeeName = $('activeEmployeeName');
        const activeEmployeeRole = $('activeEmployeeRole');
        const bar = $('employeeBar');

        if (activeEmp) {
            if (activeEmployeeName) activeEmployeeName.textContent = activeEmp.name;
            if (activeEmployeeRole) activeEmployeeRole.textContent = activeEmp.role;
            // Accent color: biru=admin, hijau=sales
            if (bar) {
                bar.classList.remove('role-sales', 'role-admin');
                const isAdmin = activeEmp.role === 'Super Admin' || activeEmp.role === 'Admin';
                bar.classList.add(isAdmin ? 'role-admin' : 'role-sales');
            }
        } else {
            if (activeEmployeeName) activeEmployeeName.textContent = 'Kasir Toko';
            if (activeEmployeeRole) activeEmployeeRole.textContent = 'Sales';
            if (bar) {
                bar.classList.remove('role-admin');
                bar.classList.add('role-sales');
            }
        }
    }

    function applyRBACPermissions() {
        const activeEmp = loadActiveEmployee();
        const role = activeEmp ? activeEmp.role : 'Kasir';

        // Entry Points
        const adminBottomNav = document.querySelector('[data-main-nav="admin"]');
        const adminHomeCard = $('btnHomeAdmin');
        const headerRoleToggle = $('btnToggleRole');

        if (role === 'Selles') {
            if (adminBottomNav) adminBottomNav.style.display = 'none';
            if (adminHomeCard) adminHomeCard.style.display = 'none';
            if (headerRoleToggle) headerRoleToggle.style.display = 'none';
            
            // Redirect if trying to access page-admin
            const activePage = document.querySelector('.page-content.active');
            if (activePage && activePage.id === 'page-admin') {
                switchPage('page-home');
            }
        } else {
            if (adminBottomNav) adminBottomNav.style.display = '';
            if (adminHomeCard) adminHomeCard.style.display = '';
            if (headerRoleToggle) headerRoleToggle.style.display = '';
        }

        // Hide/Show Admin Tabs (for Admin role)
        const restrictedTabSelectors = [
            '.admin-tab[data-panel="admin-dashboard"]',
            '.admin-tab[data-panel="admin-sales-recap"]',
            '.admin-tab[data-panel="admin-monthly"]',
            '.admin-tab[data-panel="admin-expenses"]',
            '.admin-tab[data-panel="admin-history"]',
            '.admin-tab[data-panel="admin-employees"]',
            '.admin-tab[data-panel="admin-reset"]',
            '.admin-tab[data-panel="admin-smart-inventory"]'
        ].join(', ');

        const restrictedTabs = document.querySelectorAll(restrictedTabSelectors);

        if (role === 'Admin') {
            restrictedTabs.forEach(tab => tab.style.display = 'none');
            
            // Redirect if trying to view restricted admin panels
            const activePanel = document.querySelector('.admin-panel.active');
            if (activePanel) {
                const restrictedPanelIds = ['admin-dashboard', 'admin-sales-recap', 'admin-monthly', 'admin-expenses', 'admin-history', 'admin-employees', 'admin-reset', 'admin-smart-inventory'];
                if (restrictedPanelIds.includes(activePanel.id)) {
                    const adminTabs = document.querySelector('.admin-tabs');
                    if (adminTabs) adminTabs.classList.add('collapsed');
                    
                    document.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t.dataset.panel === 'admin-devices'));
                    document.querySelectorAll('.admin-panel').forEach(p => p.classList.toggle('active', p.id === 'admin-devices'));
                    renderDeviceStock();
                }
            }
        } else {
            // Super Admin or Kasir view
            restrictedTabs.forEach(tab => tab.style.display = '');
        }
    }

    function showLoginOverlay() {
        const loginOverlay = $('loginOverlay');
        if (!loginOverlay) return;
        loginOverlay.classList.add('open');
        loginOverlay.style.display = 'flex';
        
        populateEmployeeDropdowns();
        
        // Reset password field
        const loginUserPassword = $('loginUserPassword');
        if (loginUserPassword) loginUserPassword.value = '';
    }

    function initializeEmployeeSession() {
        loadEmployees(); // Ensure default owner is seeded
        populateEmployeeDropdowns();

        // Auto-pull ALL tables from Supabase immediately on startup
        if (!isTestingMode()) {
            pullAllFromSupabaseSilent();
        }
        
        // Never show loginOverlay at startup (instant cashier access)
        const loginOverlay = $('loginOverlay');
        if (loginOverlay) {
            loginOverlay.classList.remove('open');
            loginOverlay.style.display = 'none';
        }

        const activeEmp = loadActiveEmployee();
        const storedMode = localStorage.getItem(DB_KEYS.mode);
        if ((activeEmp && (activeEmp.role === 'Super Admin' || activeEmp.role === 'Admin')) || storedMode === 'admin') {
            currentMode = 'admin';
            updateRoleBadge();
            updateActiveEmployeeBar();
            applyRBACPermissions();
        } else {
            currentMode = 'sales';
            localStorage.setItem(DB_KEYS.mode, 'sales');
            updateRoleBadge();
            updateActiveEmployeeBar();
            applyRBACPermissions();
        }
    }

    function bindEmployeeEvents() {
        // Change select employee in login screen
        $('loginUserSelect')?.addEventListener('change', () => {
            const empId = $('loginUserSelect')?.value;
            const employees = loadEmployees();
            const selectedEmp = employees.find(e => e.id === empId);
            const container = $('loginUserPasswordContainer');
            if (selectedEmp && (selectedEmp.role === 'Super Admin' || selectedEmp.role === 'Admin')) {
                if (container) {
                    container.style.display = 'block';
                    setTimeout(() => $('loginUserPassword')?.focus(), 50);
                }
            } else {
                if (container) container.style.display = 'none';
            }
        });

        // Submit login handler with modern animated cloud sync process
        async function handleEmployeeLoginSubmit(e) {
            if (e) e.preventDefault();
            const empId = $('loginUserSelect')?.value;
            const password = $('loginUserPassword')?.value || '';
            const employees = loadEmployees();
            const selectedEmp = employees.find(e => e.id === empId);
            
            if (!selectedEmp) {
                toast('Pilih pegawai terlebih dahulu!', 'err');
                return;
            }

            const inputHash = await hashPassword(password);

            if (selectedEmp.role === 'Super Admin') {
                const expectedHash = selectedEmp.passwordHash || DEFAULT_HASH_SUPER_ADMIN;
                if (inputHash !== expectedHash && inputHash !== DEFAULT_HASH_SUPER_ADMIN && inputHash !== DEFAULT_HASH_PASSCODE) {
                    toast('Kata sandi Super Admin salah!', 'err');
                    return;
                }
            } else if (selectedEmp.role === 'Admin') {
                const expectedHash = selectedEmp.passwordHash || DEFAULT_HASH_ADMIN;
                if (inputHash !== expectedHash && inputHash !== DEFAULT_HASH_ADMIN && inputHash !== DEFAULT_HASH_SUPER_ADMIN && inputHash !== DEFAULT_HASH_PASSCODE) {
                    toast('Kata sandi Admin salah!', 'err');
                    return;
                }
            }

            // Correct login - save active employee
            saveActiveEmployee(selectedEmp);
            
            // Hide login overlay
            const loginOverlay = $('loginOverlay');
            if (loginOverlay) {
                loginOverlay.classList.remove('open');
                loginOverlay.style.display = 'none';
            }

            // Selles role setting
            if (selectedEmp.role === 'Selles') {
                currentMode = 'sales';
                localStorage.setItem(DB_KEYS.mode, 'sales');
            }
            updateRoleBadge();
            updateActiveEmployeeBar();
            applyRBACPermissions();

            // Set salesName input to current employee name
            const saleSalesName = $('saleSalesName');
            if (saleSalesName) saleSalesName.value = selectedEmp.name;
            const saleDrawerSalesName = $('saleDrawerSalesName');
            if (saleDrawerSalesName) saleDrawerSalesName.value = selectedEmp.name;
            const preorderSalesName = $('preorderSalesName');
            if (preorderSalesName) preorderSalesName.value = selectedEmp.name;
            saveSalesDraft();

            // SHOW SYNC ANIMATION MODAL
            const syncOverlay = $('postLoginSyncOverlay');
            const syncProgress = $('syncProgressBar');
            const syncStep = $('syncAnimStep');
            const syncTitle = $('syncAnimTitle');
            const syncRing = $('syncSpinnerRing');
            const syncCenterIcon = $('syncAnimCenterIcon');
            const syncSuccessIcon = $('syncAnimSuccessIcon');

            if (syncOverlay) {
                syncOverlay.style.display = 'flex';
                requestAnimationFrame(() => syncOverlay.classList.add('active'));
                
                if (syncProgress) syncProgress.style.width = '35%';
                if (syncStep) syncStep.textContent = 'MENGHUBUNGKAN KE SUPABASE...';
                if (syncTitle) syncTitle.textContent = 'Menyelaraskan Data...';
                if (syncRing) syncRing.style.display = 'block';
                if (syncCenterIcon) syncCenterIcon.style.display = 'block';
                if (syncSuccessIcon) syncSuccessIcon.style.display = 'none';
            }

            try {
                if (syncProgress) syncProgress.style.width = '70%';
                if (syncStep) syncStep.textContent = 'MENGUNDUH STOK HP & TRANSAKSI...';
                
                await pullAllFromSupabaseSilent();
                
                if (syncProgress) syncProgress.style.width = '100%';
                if (syncStep) syncStep.textContent = 'DATA SIAP & AKURAT!';
                if (syncTitle) syncTitle.textContent = 'Sinkronisasi Selesai!';
                if (syncRing) syncRing.style.display = 'none';
                if (syncCenterIcon) syncCenterIcon.style.display = 'none';
                if (syncSuccessIcon) syncSuccessIcon.style.display = 'block';
                
                // Small delay so user sees the smooth success state
                await new Promise(r => setTimeout(r, 600));
            } catch (err) {
                console.warn('Sync on login warning:', err);
            } finally {
                if (syncOverlay) {
                    syncOverlay.classList.remove('active');
                    setTimeout(() => {
                        syncOverlay.style.display = 'none';
                    }, 300);
                }
                switchPage('page-home');
                toast(`Selamat datang, ${selectedEmp.name}!`);
            }
        }

        $('employeeLoginForm')?.addEventListener('submit', handleEmployeeLoginSubmit);
        $('btnLoginSubmit')?.addEventListener('click', handleEmployeeLoginSubmit);
        $('loginUserPassword')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleEmployeeLoginSubmit(e);
            }
        });

        // Change account button
        $('btnChangeAccount')?.addEventListener('click', () => {
            saveActiveEmployee(null);
            showLoginOverlay();
        });

        // Change password form handlers
        const closeChangePassModal = () => $('modalChangeEmployeePassword')?.classList.remove('open');
        $('btnCloseChangePassCross')?.addEventListener('click', closeChangePassModal);
        $('btnCancelChangePass')?.addEventListener('click', closeChangePassModal);
        $('modalChangeEmployeePassword')?.addEventListener('click', (e) => {
            if (e.target?.id === 'modalChangeEmployeePassword') closeChangePassModal();
        });

        $('changeEmployeePasswordForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const empId = $('changePassEmpId')?.value;
            const newPass = ($('changePassNewInput')?.value || '').trim();
            const confirmPass = ($('changePassConfirmInput')?.value || '').trim();
            const err = $('changePassError');

            if (newPass !== confirmPass) {
                if (err) {
                    err.textContent = 'Konfirmasi kata sandi tidak cocok!';
                    err.style.display = 'block';
                }
                return;
            }

            if (newPass.length < 3) {
                if (err) {
                    err.textContent = 'Kata sandi minimal 3 karakter!';
                    err.style.display = 'block';
                }
                return;
            }

            const employees = loadEmployees();
            const emp = employees.find(item => item.id === empId);
            if (!emp) {
                toast('Pegawai tidak ditemukan!', 'err');
                return;
            }

            const hashed = await hashPassword(newPass);
            emp.passwordHash = hashed;
            saveEmployees(employees);
            queueRecordSupabaseSync('employees', emp);

            closeChangePassModal();
            toast(`Kata sandi untuk ${emp.name} berhasil diperbarui!`);
            renderEmployees();
        });

        // Add Employee button toggles form
        $('btnAddNewEmployee')?.addEventListener('click', () => {
            const formContainer = $('addEmployeeFormContainer');
            if (formContainer) {
                formContainer.style.display = formContainer.style.display === 'none' ? 'block' : 'none';
                $('employeeForm')?.reset();
                const editId = $('editEmployeeId');
                if (editId) editId.value = '';
            }
        });

        // Cancel Employee form
        $('btnCancelEmployee')?.addEventListener('click', () => {
            const formContainer = $('addEmployeeFormContainer');
            if (formContainer) formContainer.style.display = 'none';
            $('employeeForm')?.reset();
            const editId = $('editEmployeeId');
            if (editId) editId.value = '';
        });

        // Employee Form Submit (Add or Edit)
        $('employeeForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = $('employeeName')?.value?.trim();
            const jobTitle = $('employeeJobTitle')?.value;
            const role = $('employeeRole')?.value;
            const editId = $('editEmployeeId')?.value;

            if (!name) {
                toast('Nama pegawai wajib diisi!', 'err');
                return;
            }

            const employees = loadEmployees();
            
            // Check duplicate
            const duplicate = employees.some(emp => emp.name.toLowerCase() === name.toLowerCase() && emp.id !== editId);
            if (duplicate) {
                toast('Nama pegawai sudah terdaftar!', 'err');
                return;
            }

            if (editId) {
                // Edit mode
                const empIndex = employees.findIndex(emp => emp.id === editId);
                if (empIndex > -1) {
                    employees[empIndex].name = name;
                    employees[empIndex].jobTitle = jobTitle;
                    employees[empIndex].role = role;
                    saveEmployees(employees);
                    queueRecordSupabaseSync('employees', employees[empIndex]);
                    
                    const activeEmp = loadActiveEmployee();
                    if (activeEmp && activeEmp.id === editId) {
                        saveActiveEmployee(employees[empIndex]);
                        updateActiveEmployeeBar();
                        applyRBACPermissions();
                    }
                    toast('Data pegawai berhasil diperbarui');
                }
            } else {
                // Add mode
                const newEmp = {
                    id: Date.now().toString(),
                    name,
                    jobTitle,
                    role
                };
                employees.push(newEmp);
                saveEmployees(employees);
                queueRecordSupabaseSync('employees', newEmp);
                toast('Pegawai baru berhasil ditambahkan');
            }

            $('employeeForm')?.reset();
            const editIdInput = $('editEmployeeId');
            if (editIdInput) editIdInput.value = '';
            const formContainer = $('addEmployeeFormContainer');
            if (formContainer) formContainer.style.display = 'none';

            renderEmployees();
            populateEmployeeDropdowns();
        });

        // Search Employee
        $('searchAdminEmployee')?.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            renderEmployees(query);
        });

        // Expense Category Change (Gaji Karyawan shows Employee dropdown)
        $('expenseCategory')?.addEventListener('change', () => {
            const cat = $('expenseCategory')?.value;
            const container = $('expenseEmployeeContainer');
            const select = $('expenseEmployeeSelect');
            
            if (cat === 'gaji') {
                if (container) container.style.display = 'block';
                if (select) select.setAttribute('required', 'true');
            } else {
                if (container) container.style.display = 'none';
                if (select) {
                    select.removeAttribute('required');
                    select.value = '';
                }
            }
        });

        // Expense Employee Select Change auto fills description
        $('expenseEmployeeSelect')?.addEventListener('change', () => {
            const empName = $('expenseEmployeeSelect')?.value;
            if (!empName) return;
            const employees = loadEmployees();
            const emp = employees.find(e => e.name === empName);
            if (emp) {
                const descInput = $('expenseDescription');
                if (descInput) {
                    descInput.value = `Gaji ${emp.name} - ${emp.jobTitle}`;
                    descInput.dispatchEvent(new Event('input'));
                }
            }
        });
    }

    // ══════════════════════════════════════════════════════════════
    // UNIFIED SALES RECAP & REPORTING CENTER (PUSAT REKAP PENJUALAN)
    // ══════════════════════════════════════════════════════════════

    let activeRecapMonth = today().substring(0, 7);
    let activeRecapSales = '';
    let activeRecapSearch = '';
    let activeRecapCat = null; // null = show category grid, 'units' | 'accessories' | 'services' | 'order-jasa' | 'other' | 'sales-perf'
    let activeRecapAccMode = 'sold';

    function initSalesRecapPanel() {
        populateRecapSalesFilter();

        const monthPicker = $('recapMonthPicker');
        if (monthPicker) {
            monthPicker.value = activeRecapMonth;
            monthPicker.addEventListener('change', () => {
                activeRecapMonth = monthPicker.value || today().substring(0, 7);
                renderSalesRecapPanel();
            });
        }

        const salesFilter = $('recapSalesFilter');
        if (salesFilter) {
            salesFilter.addEventListener('change', () => {
                activeRecapSales = salesFilter.value || '';
                renderSalesRecapPanel();
            });
        }

        const searchInput = $('recapSearchInput');
        if (searchInput) {
            searchInput.value = activeRecapSearch;
            searchInput.addEventListener('input', () => {
                activeRecapSearch = (searchInput.value || '').trim().toLowerCase();
                renderSalesRecapPanel();
            });
        }

        // 6 Bordered Category Card Click Handlers
        if (!window._recapHandlersAttached) {
            window._recapHandlersAttached = true;

            document.querySelectorAll('.recap-cat-card').forEach(card => {
                card.addEventListener('click', () => {
                    const catKey = card.dataset.recapCat;
                    switchRecapCategory(catKey);
                });
            });

            $('btnBackToRecapCategories')?.addEventListener('click', () => {
                switchRecapCategory(null);
            });

            // Accessories toggle (Sold vs Bonus)
            $('btnRecapAccSold')?.addEventListener('click', () => {
                activeRecapAccMode = 'sold';
                $('btnRecapAccSold')?.classList.replace('btn-ghost', 'btn-secondary');
                $('btnRecapAccBonus')?.classList.replace('btn-secondary', 'btn-ghost');
                if ($('recapListAccSold')) $('recapListAccSold').style.display = 'flex';
                if ($('recapListAccBonus')) $('recapListAccBonus').style.display = 'none';
            });

            $('btnRecapAccBonus')?.addEventListener('click', () => {
                activeRecapAccMode = 'bonus';
                $('btnRecapAccBonus')?.classList.replace('btn-ghost', 'btn-secondary');
                $('btnRecapAccSold')?.classList.replace('btn-secondary', 'btn-ghost');
                if ($('recapListAccSold')) $('recapListAccSold').style.display = 'none';
                if ($('recapListAccBonus')) $('recapListAccBonus').style.display = 'flex';
            });

            // Modal Detail Close handlers
            $('btnCloseRecapDetail')?.addEventListener('click', closeRecapDetailModal);
            $('btnOkRecapDetail')?.addEventListener('click', closeRecapDetailModal);
            $('modalRecapDetail')?.addEventListener('click', (e) => {
                if (e.target === $('modalRecapDetail')) closeRecapDetailModal();
            });

            // Export buttons
            $('btnExportRecapCurrentTabPdf')?.addEventListener('click', () => exportSalesRecapPdf(false));
            $('btnExportRecapFullPdf')?.addEventListener('click', () => exportSalesRecapPdf(true));
        }

        renderSalesRecapPanel();
    }

    function switchRecapCategory(catKey) {
        activeRecapCat = catKey;
        const grid = $('recapCategoryCardsGrid');
        const section = $('recapActiveCategorySection');
        const titleElem = $('recapActiveCategoryTitle');

        if (!catKey) {
            if (grid) grid.style.display = 'grid';
            if (section) section.style.display = 'none';
            renderSalesRecapPanel();
            return;
        }

        if (grid) grid.style.display = 'none';
        if (section) section.style.display = 'block';

        const catTitles = {
            'units': '📱 Rekapitulasi Unit HP (iPhone & Android)',
            'accessories': '🔌 Rekapitulasi Aksesoris & Bonus',
            'services': '🛠️ Rekapitulasi Jasa Servis & Perbaikan',
            'order-jasa': '🌐 Rekapitulasi Order Jasa (iCloud, IMEI, Software)',
            'other': '🏷️ Rekapitulasi Penjualan Lain-lain & Custom',
            'sales-perf': '🏆 Evaluasi Kinerja & Perolehan Sales'
        };

        if (titleElem) titleElem.textContent = catTitles[catKey] || 'Rekap Transaksi';

        document.querySelectorAll('.recap-cat-content').forEach(el => {
            el.style.display = 'none';
        });

        const targetMap = {
            'units': 'recapContentUnits',
            'accessories': 'recapContentAccessories',
            'services': 'recapContentServices',
            'order-jasa': 'recapContentOrderJasa',
            'other': 'recapContentOther',
            'sales-perf': 'recapContentSalesPerf'
        };

        const target = $(targetMap[catKey]);
        if (target) target.style.display = 'block';

        renderSalesRecapPanel();
    }

    function populateRecapSalesFilter() {
        const select = $('recapSalesFilter');
        if (!select) return;
        const employees = loadEmployees();
        const currentVal = select.value || activeRecapSales;
        select.innerHTML = '<option value="">-- Semua Pegawai / Sales --</option>' + employees.map(emp => `
            <option value="${esc(emp.name)}" ${emp.name === currentVal ? 'selected' : ''}>${esc(emp.name)} (${esc(emp.jobTitle || emp.role)})</option>
        `).join('');
    }

    function getSalesRecapData(monthKey = activeRecapMonth, salesFilter = activeRecapSales, searchQuery = activeRecapSearch) {
        const allTxs = loadTransactions();
        const devices = load(DB_KEYS.devices) || [];
        const services = load(DB_KEYS.serviceOrders) || [];
        const employees = loadEmployees();

        const completedPreorderCodes = new Set(
            allTxs.filter(t => t && t.preorderCode && t.category !== 'preorder_dp').map(t => t.preorderCode)
        );

        // Filter transactions by month and sales
        const periodTxs = allTxs.filter(tx => {
            if (!tx || !tx.date || !tx.date.startsWith(monthKey)) return false;
            if (tx.category === 'preorder_dp' && completedPreorderCodes.has(tx.code)) return false;
            if (salesFilter && (tx.salesName || '').toLowerCase() !== salesFilter.toLowerCase()) return false;
            return true;
        });

        // 1. Unit Sales
        let unitSales = [];
        periodTxs.forEach(tx => {
            if (tx.category === 'unit_iphone' || tx.category === 'unit_android' || tx.category === 'tukar_tambah') {
                const unit = devices.find(d => d.code === (tx.stockRefCode || tx.code)) || {};
                const model = tx.itemName || unit.model || 'Unit Phone';
                const code = tx.stockRefCode || tx.code || '-';
                const sellPrice = tx.category === 'tukar_tambah'
                    ? (Number(tx.newUnitSellPrice) || ((Number(tx.sell) || 0) + (Number(tx.tradeInCost) || 0)) || Number(tx.sell) || 0)
                    : (Number(tx.sell) || 0);
                const unitCost = Number(unit.cost || tx.cost || 0);
                
                // Calculate Bonus Accessories Cost
                const bonusList = Array.isArray(tx.bonusAccessories) ? tx.bonusAccessories : [];
                const bonusCost = bonusList.reduce((sum, b) => sum + ((Number(b.cost) || 0) * (Number(b.quantity || b.qty) || 1)), 0);
                const trueNetProfit = sellPrice - unitCost - bonusCost;
                const marginPct = sellPrice > 0 ? (trueNetProfit / sellPrice) * 100 : 0;

                // Payment display
                let paymentDisplay = paymentLabel(tx.paymentMethod || 'cash');
                if (tx.paymentMethod === 'kredit') {
                    paymentDisplay = `Kredit${tx.creditAgent ? ` (${tx.creditAgent})` : ''}`;
                } else if (tx.paymentMethod === 'split') {
                    const parts = [];
                    if ((Number(tx.splitCash) || 0) > 0) parts.push(`Cash ${fmtRp(tx.splitCash)}`);
                    if ((Number(tx.splitTransfer) || 0) > 0) parts.push(`TF ${fmtRp(tx.splitTransfer)}`);
                    if ((Number(tx.splitCredit) || 0) > 0) parts.push(`Kr ${fmtRp(tx.splitCredit)}${tx.creditAgent ? ` (${tx.creditAgent})` : ''}`);
                    paymentDisplay = `Split: ${parts.join(' + ') || '-'}`;
                }

                unitSales.push({
                    id: tx.id,
                    date: tx.date,
                    model: model,
                    code: code,
                    storage: unit.storage || tx.storage || '-',
                    color: unit.color || tx.color || '-',
                    condition: unit.condition || tx.condition || '-',
                    unitCost: unitCost,
                    sellPrice: sellPrice,
                    bonusCost: bonusCost,
                    bonusList: bonusList,
                    trueNetProfit: trueNetProfit,
                    marginPct: marginPct,
                    paymentMethod: tx.paymentMethod || 'cash',
                    paymentDisplay: paymentDisplay,
                    creditAgent: tx.creditAgent || '',
                    splitCash: Number(tx.splitCash) || 0,
                    splitTransfer: Number(tx.splitTransfer) || 0,
                    splitCredit: Number(tx.splitCredit) || 0,
                    buyerName: tx.buyerName || '-',
                    buyerPhone: tx.buyerPhone || tx.phone || '-',
                    salesName: tx.salesName || '-',
                    isTradeIn: tx.category === 'tukar_tambah',
                    tradeInCost: Number(tx.tradeInCost) || 0,
                    tradeInModel: tx.tradeInModel ? `${tx.tradeInBrand || ''} ${tx.tradeInModel} ${tx.tradeInStorage || ''}`.trim() : '',
                    cashPaid: Number(tx.sell) || 0
                });
            }
        });

        // 2. Accessories Sold (Paid)
        let accSold = [];
        periodTxs.forEach(tx => {
            if (tx.category === 'accessory') {
                const qty = Number(tx.quantity) || 1;
                const sell = Number(tx.sell) || 0;
                const cost = Number(tx.cost) || 0;
                const profit = sell - cost;
                accSold.push({
                    id: tx.id,
                    date: tx.date,
                    name: tx.itemName || 'Aksesoris',
                    brand: tx.brand || 'Apple',
                    category: tx.accessoryCategory || '-',
                    quantity: qty,
                    cost: cost,
                    sell: sell,
                    profit: profit,
                    paymentMethod: tx.paymentMethod || 'cash',
                    paymentDisplay: paymentLabel(tx.paymentMethod || 'cash'),
                    buyerName: tx.buyerName || '-',
                    buyerPhone: tx.buyerPhone || '-',
                    salesName: tx.salesName || '-'
                });
            }
        });

        // 3. Bonus Accessories (Free with Units)
        let accBonus = [];
        unitSales.forEach(u => {
            (u.bonusList || []).forEach(b => {
                const qty = Number(b.quantity || b.qty) || 1;
                const unitCost = Number(b.cost) || 0;
                accBonus.push({
                    id: `${u.id}-${b.code || b.name}`,
                    unitId: u.id,
                    date: u.date,
                    name: b.name || b.model || 'Bonus Aksesoris',
                    brand: b.brand || 'Apple',
                    category: b.category || '-',
                    quantity: qty,
                    cost: unitCost * qty,
                    unitRef: `${u.model} (${u.code})`,
                    buyerName: u.buyerName,
                    buyerPhone: u.buyerPhone,
                    salesName: u.salesName
                });
            });
        });

        // 4. Services Recap (Terintegrasi Service Masuk, Keluar, dan Cancel)
        let serviceList = [];
        const processedServiceCodes = new Set();

        services.forEach(order => {
            const dateInRef = order.dateIn || order.date || '';
            const dateOutRef = order.cancelDate || order.paidDate || order.processDate || order.dateIn || order.date || '';
            const statusLower = String(order.status || '').toLowerCase();
            const isCompletedOrCanceled = statusLower === 'selesai' || statusLower === 'keluar' || statusLower === 'cancel';
            const isIntakeInMonth = dateInRef.startsWith(monthKey);
            const isOutInMonth = dateOutRef.startsWith(monthKey);

            // Include if either finished/cancelled in this month, or intake entered in this month
            if ((isCompletedOrCanceled && isOutInMonth) || (!isCompletedOrCanceled && isIntakeInMonth)) {
                if (salesFilter && (order.technician || '').toLowerCase() !== salesFilter.toLowerCase()) return;
                
                const matchingTx = allTxs.find(t => t.serviceOrderCode === order.code || (t.category === 'service' && t.code === order.code) || String(t.id) === String(order.id));
                let partCost = Number(order.sparepartCost ?? matchingTx?.sparepartCost ?? 0);
                let serviceFee = Number(order.serviceFee ?? matchingTx?.serviceFee ?? 0);
                let totalCost = (partCost + serviceFee) || Number(order.technicianCost || matchingTx?.fee || matchingTx?.cost || order.cost || 0);

                if (partCost === 0 && serviceFee === 0 && totalCost > 0) {
                    if (Number(order.cost) > 0 && Number(order.technicianCost) > Number(order.cost)) {
                        partCost = Number(order.cost);
                        serviceFee = Number(order.technicianCost) - partCost;
                    } else if (Number(order.cost) > 0) {
                        partCost = Number(order.cost);
                    } else {
                        serviceFee = totalCost;
                    }
                }

                const fee = (statusLower === 'cancel' || order.status === 'Cancel')
                    ? Number(order.cancelAmount ?? order.paidAmount ?? matchingTx?.sell ?? 0)
                    : Number(order.paidAmount ?? matchingTx?.sell ?? order.paymentAmount ?? 0);
                const profit = fee - totalCost;
                const marginPct = fee > 0 ? (profit / fee) * 100 : 0;
                const code = order.code || `SRV-${order.id}`;

                processedServiceCodes.add(code);
                serviceList.push({
                    id: order.id || code,
                    code: code,
                    date: dateOutRef || dateInRef,
                    dateIn: dateInRef || dateOutRef,
                    dateOut: isCompletedOrCanceled ? dateOutRef : '',
                    customerName: order.buyerName || order.customerName || matchingTx?.buyerName || '-',
                    customerPhone: order.buyerWa || order.customerPhone || matchingTx?.buyerWa || matchingTx?.phone || '-',
                    device: order.itemName || `${order.brand || ''} ${order.model || ''}`.trim() || matchingTx?.itemName || 'Service Perangkat',
                    complaint: order.complaint || matchingTx?.complaint || '-',
                    technician: order.technician || matchingTx?.technician || '-',
                    sparepartCost: partCost,
                    serviceFee: serviceFee,
                    fee: fee,
                    cost: totalCost,
                    profit: profit,
                    marginPct: marginPct,
                    paymentMethod: order.paymentMethod || matchingTx?.paymentMethod || 'cash',
                    status: (statusLower === 'cancel' || order.status === 'Cancel') ? 'Cancel' : (isCompletedOrCanceled ? 'Selesai' : (order.technician ? 'Diproses' : 'Masuk'))
                });
            }
        });

        // Also check if any service transaction is in periodTxs not in processedServiceCodes
        periodTxs.forEach(tx => {
            const isServiceCat = tx.category === 'service' || tx.category === 'service_keluar' || tx.category === 'service_cancel';
            if (isServiceCat && !processedServiceCodes.has(tx.code) && !processedServiceCodes.has(tx.serviceOrderCode)) {
                if (salesFilter && (tx.technician || '').toLowerCase() !== salesFilter.toLowerCase()) return;

                const matchingOrder = services.find(o => o.code === tx.serviceOrderCode || o.code === tx.code || String(o.id) === String(tx.id));
                let partCost = Number(tx.sparepartCost ?? matchingOrder?.sparepartCost ?? 0);
                let serviceFee = Number(tx.serviceFee ?? matchingOrder?.serviceFee ?? 0);
                let totalCost = (partCost + serviceFee) || Number(tx.fee || matchingOrder?.technicianCost || tx.cost || matchingOrder?.cost || 0);

                if (partCost === 0 && serviceFee === 0 && totalCost > 0) {
                    if (Number(matchingOrder?.cost) > 0) {
                        partCost = Number(matchingOrder.cost);
                        serviceFee = totalCost - partCost;
                    } else {
                        serviceFee = totalCost;
                    }
                }

                const fee = Number(tx.sell ?? matchingOrder?.paidAmount ?? matchingOrder?.paymentAmount ?? 0);
                const profit = fee - totalCost;
                const marginPct = fee > 0 ? (profit / fee) * 100 : 0;
                const code = tx.code || tx.serviceOrderCode || `TX-${tx.id}`;

                serviceList.push({
                    id: tx.id,
                    code: code,
                    date: tx.date,
                    dateIn: matchingOrder?.dateIn || tx.dateIn || tx.date,
                    dateOut: tx.date,
                    customerName: tx.buyerName || matchingOrder?.buyerName || '-',
                    customerPhone: tx.buyerWa || tx.phone || matchingOrder?.buyerWa || '-',
                    device: tx.itemName || matchingOrder?.itemName || 'Service Perangkat',
                    complaint: tx.complaint || matchingOrder?.complaint || '-',
                    technician: tx.technician || matchingOrder?.technician || '-',
                    sparepartCost: partCost,
                    serviceFee: serviceFee,
                    fee: fee,
                    cost: totalCost,
                    profit: profit,
                    marginPct: marginPct,
                    paymentMethod: tx.paymentMethod || 'cash',
                    status: (tx.serviceStatus === 'Cancel' || tx.category === 'service_cancel') ? 'Cancel' : 'Selesai'
                });
            }
        });

        // 5. Order Jasa (Khusus iCloud, IMEI, Software)
        let orderJasaList = [];
        periodTxs.forEach(tx => {
            if (tx.category === 'order_jasa' || tx.category === 'order_jasa_beacukai' || tx.category === 'order_jasa_icloud' || tx.category === 'jasa_icloud' || tx.category === 'jasa_imei') {
                const cost = Number(tx.cost) || 0;
                const sell = Number(tx.sell) || 0;
                const profit = sell - cost;
                let categoryLabel = 'Order Jasa';
                if (tx.category === 'order_jasa_beacukai') categoryLabel = 'IMEI Bea Cukai';
                else if (tx.category === 'order_jasa_icloud' || tx.category === 'jasa_icloud') categoryLabel = 'Jasa iCloud';
                else if (tx.category === 'jasa_imei') categoryLabel = 'Jasa IMEI';

                orderJasaList.push({
                    id: tx.id,
                    date: tx.date,
                    category: categoryLabel,
                    name: tx.itemName || (tx.category.includes('icloud') ? 'Bypass / Unlock iCloud' : 'Registrasi / Unlock IMEI'),
                    code: tx.code || '-',
                    imei: tx.imei || tx.code || '-',
                    cost: cost,
                    sell: sell,
                    profit: profit,
                    paymentMethod: tx.paymentMethod || 'cash',
                    paymentDisplay: paymentLabel(tx.paymentMethod || 'cash'),
                    buyerName: tx.buyerName || '-',
                    buyerPhone: tx.buyerPhone || tx.buyerWa || '-',
                    salesName: tx.salesName || '-'
                });
            }
        });

        // 6. Lain-lain (Barang Custom, Merchandise, Transaksi Manual)
        let otherList = [];
        periodTxs.forEach(tx => {
            if (tx.category === 'other') {
                const cost = Number(tx.cost) || 0;
                const sell = Number(tx.sell) || 0;
                const profit = sell - cost;
                otherList.push({
                    id: tx.id,
                    date: tx.date,
                    name: tx.itemName || 'Barang Lain-lain',
                    code: tx.code || '-',
                    cost: cost,
                    sell: sell,
                    profit: profit,
                    paymentMethod: tx.paymentMethod || 'cash',
                    paymentDisplay: paymentLabel(tx.paymentMethod || 'cash'),
                    buyerName: tx.buyerName || '-',
                    buyerPhone: tx.buyerPhone || '-',
                    salesName: tx.salesName || '-'
                });
            }
        });

        // Search Filter on arrays
        if (searchQuery) {
            const matches = (str) => String(str || '').toLowerCase().includes(searchQuery);
            unitSales = unitSales.filter(u => matches(u.model) || matches(u.code) || matches(u.buyerName) || matches(u.salesName) || matches(u.creditAgent));
            accSold = accSold.filter(a => matches(a.name) || matches(a.brand) || matches(a.salesName) || matches(a.buyerName));
            accBonus = accBonus.filter(b => matches(b.name) || matches(b.unitRef) || matches(b.salesName) || matches(b.buyerName));
            serviceList = serviceList.filter(s => matches(s.code) || matches(s.customerName) || matches(s.device) || matches(s.technician));
            orderJasaList = orderJasaList.filter(j => matches(j.name) || matches(j.code) || matches(j.imei) || matches(j.buyerName) || matches(j.salesName));
            otherList = otherList.filter(o => matches(o.name) || matches(o.code) || matches(o.buyerName) || matches(o.salesName));
        }

        // Summary Calculations
        const totalRevenue = unitSales.reduce((s, u) => s + u.sellPrice, 0) +
                             accSold.reduce((s, a) => s + a.sell, 0) +
                             serviceList.reduce((s, svc) => s + svc.fee, 0) +
                             orderJasaList.reduce((s, j) => s + j.sell, 0) +
                             otherList.reduce((s, o) => s + o.sell, 0);

        const totalHpp = unitSales.reduce((s, u) => s + u.unitCost, 0) +
                         accSold.reduce((s, a) => s + a.cost, 0) +
                         serviceList.reduce((s, svc) => s + svc.cost, 0) +
                         orderJasaList.reduce((s, j) => s + j.cost, 0) +
                         otherList.reduce((s, o) => s + o.cost, 0);

        const totalBonusCost = accBonus.reduce((s, b) => s + b.cost, 0);
        const totalNetProfit = totalRevenue - totalHpp - totalBonusCost;
        const totalMarginPct = totalRevenue > 0 ? (totalNetProfit / totalRevenue) * 100 : 0;
        const totalTxCount = unitSales.length + accSold.length + serviceList.length + orderJasaList.length + otherList.length;

        // Payment Reconciliation Summary
        const paymentSummary = {
            cash: 0,
            transfer: 0,
            creditKredivo: 0,
            creditSpaylater: 0,
            creditAkulaku: 0,
            creditOther: 0,
            creditTotal: 0
        };

        unitSales.forEach(u => {
            if (u.paymentMethod === 'cash') paymentSummary.cash += u.sellPrice;
            else if (u.paymentMethod === 'transfer') paymentSummary.transfer += u.sellPrice;
            else if (u.paymentMethod === 'kredit') {
                paymentSummary.creditTotal += u.sellPrice;
                const agent = (u.creditAgent || '').toLowerCase();
                if (agent.includes('kredivo')) paymentSummary.creditKredivo += u.sellPrice;
                else if (agent.includes('spay') || agent.includes('shopee')) paymentSummary.creditSpaylater += u.sellPrice;
                else if (agent.includes('aku')) paymentSummary.creditAkulaku += u.sellPrice;
                else paymentSummary.creditOther += u.sellPrice;
            } else if (u.paymentMethod === 'split') {
                paymentSummary.cash += u.splitCash;
                paymentSummary.transfer += u.splitTransfer;
                paymentSummary.creditTotal += u.splitCredit;
                const agent = (u.creditAgent || '').toLowerCase();
                if (agent.includes('kredivo')) paymentSummary.creditKredivo += u.splitCredit;
                else if (agent.includes('spay') || agent.includes('shopee')) paymentSummary.creditSpaylater += u.splitCredit;
                else if (agent.includes('aku')) paymentSummary.creditAkulaku += u.splitCredit;
                else paymentSummary.creditOther += u.splitCredit;
            }
        });

        accSold.forEach(a => {
            if (a.paymentMethod === 'cash') paymentSummary.cash += a.sell;
            else if (a.paymentMethod === 'transfer') paymentSummary.transfer += a.sell;
            else paymentSummary.cash += a.sell;
        });

        orderJasaList.forEach(j => {
            if (j.paymentMethod === 'cash') paymentSummary.cash += j.sell;
            else if (j.paymentMethod === 'transfer') paymentSummary.transfer += j.sell;
            else paymentSummary.cash += j.sell;
        });

        otherList.forEach(o => {
            if (o.paymentMethod === 'cash') paymentSummary.cash += o.sell;
            else if (o.paymentMethod === 'transfer') paymentSummary.transfer += o.sell;
            else paymentSummary.cash += o.sell;
        });

        // Sales Performance Breakdown
        const salesMap = {};
        employees.forEach(emp => {
            salesMap[emp.name.toLowerCase()] = {
                name: emp.name,
                jobTitle: emp.jobTitle || emp.role || 'Selles',
                role: emp.role || 'Selles',
                unitsCount: 0,
                accCount: 0,
                orderJasaCount: 0,
                otherCount: 0,
                totalOmset: 0,
                bonusCost: 0,
                netContribution: 0
            };
        });

        unitSales.forEach(u => {
            const key = (u.salesName || '').toLowerCase();
            if (!salesMap[key]) {
                salesMap[key] = { name: u.salesName || 'Lainnya', jobTitle: 'Selles', role: 'Selles', unitsCount: 0, accCount: 0, orderJasaCount: 0, otherCount: 0, totalOmset: 0, bonusCost: 0, netContribution: 0 };
            }
            salesMap[key].unitsCount += 1;
            salesMap[key].totalOmset += u.sellPrice;
            salesMap[key].bonusCost += u.bonusCost;
            salesMap[key].netContribution += u.trueNetProfit;
        });

        accSold.forEach(a => {
            const key = (a.salesName || '').toLowerCase();
            if (!salesMap[key]) {
                salesMap[key] = { name: a.salesName || 'Lainnya', jobTitle: 'Selles', role: 'Selles', unitsCount: 0, accCount: 0, orderJasaCount: 0, otherCount: 0, totalOmset: 0, bonusCost: 0, netContribution: 0 };
            }
            salesMap[key].accCount += a.quantity;
            salesMap[key].totalOmset += a.sell;
            salesMap[key].netContribution += a.profit;
        });

        orderJasaList.forEach(j => {
            const key = (j.salesName || '').toLowerCase();
            if (!salesMap[key]) {
                salesMap[key] = { name: j.salesName || 'Lainnya', jobTitle: 'Selles', role: 'Selles', unitsCount: 0, accCount: 0, orderJasaCount: 0, otherCount: 0, totalOmset: 0, bonusCost: 0, netContribution: 0 };
            }
            salesMap[key].orderJasaCount += 1;
            salesMap[key].totalOmset += j.sell;
            salesMap[key].netContribution += j.profit;
        });

        otherList.forEach(o => {
            const key = (o.salesName || '').toLowerCase();
            if (!salesMap[key]) {
                salesMap[key] = { name: o.salesName || 'Lainnya', jobTitle: 'Selles', role: 'Selles', unitsCount: 0, accCount: 0, orderJasaCount: 0, otherCount: 0, totalOmset: 0, bonusCost: 0, netContribution: 0 };
            }
            salesMap[key].otherCount += 1;
            salesMap[key].totalOmset += o.sell;
            salesMap[key].netContribution += o.profit;
        });

        const salesPerformance = Object.values(salesMap)
            .filter(s => s.unitsCount > 0 || s.accCount > 0 || s.orderJasaCount > 0 || s.otherCount > 0 || s.totalOmset > 0)
            .sort((a, b) => b.unitsCount - a.unitsCount || b.totalOmset - a.totalOmset);

        return {
            unitSales,
            accSold,
            accBonus,
            serviceList,
            orderJasaList,
            otherList,
            summary: {
                totalRevenue,
                totalHpp,
                totalBonusCost,
                totalNetProfit,
                totalMarginPct,
                totalTxCount,
                bonusCount: accBonus.length
            },
            paymentSummary,
            salesPerformance
        };
    }

    function renderSalesRecapPanel() {
        const data = getSalesRecapData();

        // 1. Update 4 Executive KPI Cards
        if ($('recapKpiRevenue')) $('recapKpiRevenue').textContent = fmtRp(data.summary.totalRevenue);
        if ($('recapKpiTxCount')) $('recapKpiTxCount').textContent = `${data.summary.totalTxCount} Transaksi`;
        if ($('recapKpiCost')) $('recapKpiCost').textContent = fmtRp(data.summary.totalHpp);
        if ($('recapKpiBonusCost')) $('recapKpiBonusCost').textContent = fmtRp(data.summary.totalBonusCost);
        if ($('recapKpiBonusCount')) $('recapKpiBonusCount').textContent = `${data.summary.bonusCount} Pcs aksesoris gratis`;
        if ($('recapKpiNetProfit')) $('recapKpiNetProfit').textContent = fmtRp(data.summary.totalNetProfit);
        if ($('recapKpiMarginPct')) $('recapKpiMarginPct').textContent = `Margin: ${data.summary.totalMarginPct.toFixed(1)}%`;

        // 2. Update 6 Bordered Category Card Badges
        if ($('recapBadgeUnitsCount')) $('recapBadgeUnitsCount').textContent = `${data.unitSales.length} Unit`;
        if ($('recapBadgeAccCount')) $('recapBadgeAccCount').textContent = `${data.accSold.length} Terjual • ${data.accBonus.length} Bonus`;
        if ($('recapBadgeServicesCount')) $('recapBadgeServicesCount').textContent = `${data.serviceList.length} Servis`;
        if ($('recapBadgeOrderJasaCount')) $('recapBadgeOrderJasaCount').textContent = `${data.orderJasaList.length} Order`;
        if ($('recapBadgeOtherCount')) $('recapBadgeOtherCount').textContent = `${data.otherList.length} Item`;
        if ($('recapBadgeSalesCount')) $('recapBadgeSalesCount').textContent = `${data.salesPerformance.length} Sales Aktif`;

        // 3. Render Minimalist Unit HP List
        const unitsContainer = $('recapListUnits');
        if (unitsContainer) {
            if (!data.unitSales.length) {
                unitsContainer.innerHTML = '<div class="card p-lg text-center text-dim" style="background:#ffffff; border-radius:12px;">Tidak ada transaksi penjualan unit pada periode ini</div>';
            } else {
                unitsContainer.innerHTML = data.unitSales.map(u => `
                    <div class="recap-item-row" onclick="openRecapDetailModal('unit', '${esc(u.id)}')">
                        <div class="recap-item-left-icon" style="background: rgba(37,99,235,0.1); color: #2563eb;">
                            <i class="ri-smartphone-line"></i>
                        </div>
                        <div class="recap-item-main">
                            <div class="recap-item-title">
                                <span>${esc(u.model)}</span>
                                <span class="mono" style="font-size: 11px; font-weight: 700; background: #f1f5f9; color: #475569; padding: 2px 7px; border-radius: 6px; border: 1px solid #e2e8f0;">${esc(u.code)}</span>
                            </div>
                            <div class="recap-item-meta">
                                <span><i class="ri-calendar-line"></i> ${fmtDate(u.date)}</span>
                                <span>•</span>
                                <span><i class="ri-user-line"></i> ${esc(u.buyerName)}</span>
                                <span>•</span>
                                <span class="badge" style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 11px;">${esc(u.salesName)}</span>
                                ${u.bonusCost > 0 ? `<span class="badge" style="background: #fef3c7; color: #b45309; padding: 2px 8px; border-radius: 6px; font-weight: 700; font-size: 11px;"><i class="ri-gift-line"></i> Bonus Gratis</span>` : ''}
                            </div>
                        </div>
                        <div class="recap-item-figures">
                            <div class="recap-item-price">${fmtRp(u.sellPrice)}</div>
                            <div class="recap-item-profit-badge ${u.trueNetProfit >= 0 ? 'profit-pos' : 'profit-neg'}">
                                Laba: ${fmtRp(u.trueNetProfit)} (${u.marginPct.toFixed(1)}%)
                            </div>
                        </div>
                        <div class="recap-item-chevron">
                            <i class="ri-arrow-right-s-line"></i>
                        </div>
                    </div>
                `).join('');
            }
        }

        // 4. Render Minimalist Accessories Sold & Bonus
        const accSoldContainer = $('recapListAccSold');
        if (accSoldContainer) {
            if (!data.accSold.length) {
                accSoldContainer.innerHTML = '<div class="card p-lg text-center text-dim" style="background:#ffffff; border-radius:12px;">Tidak ada penjualan aksesoris berbayar pada periode ini</div>';
            } else {
                accSoldContainer.innerHTML = data.accSold.map(a => `
                    <div class="recap-item-row" onclick="openRecapDetailModal('accessory', '${esc(a.id)}')">
                        <div class="recap-item-left-icon" style="background: rgba(139,92,246,0.1); color: #8b5cf6;">
                            <i class="ri-plug-line"></i>
                        </div>
                        <div class="recap-item-main">
                            <div class="recap-item-title">
                                <span>${esc(a.name)}</span>
                                <span class="text-xs text-dim">(${esc(a.brand)})</span>
                            </div>
                            <div class="recap-item-meta">
                                <span><i class="ri-calendar-line"></i> ${fmtDate(a.date)}</span>
                                <span>•</span>
                                <span>Qty: <strong>${a.quantity} pcs</strong></span>
                                <span>•</span>
                                <span class="badge" style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 11px;">${esc(a.salesName)}</span>
                            </div>
                        </div>
                        <div class="recap-item-figures">
                            <div class="recap-item-price">${fmtRp(a.sell)}</div>
                            <div class="recap-item-profit-badge profit-pos">Laba: ${fmtRp(a.profit)}</div>
                        </div>
                        <div class="recap-item-chevron">
                            <i class="ri-arrow-right-s-line"></i>
                        </div>
                    </div>
                `).join('');
            }
        }

        const accBonusContainer = $('recapListAccBonus');
        if (accBonusContainer) {
            if (!data.accBonus.length) {
                accBonusContainer.innerHTML = '<div class="card p-lg text-center text-dim" style="background:#ffffff; border-radius:12px;">Tidak ada aksesoris yang keluar sebagai bonus pada periode ini</div>';
            } else {
                accBonusContainer.innerHTML = data.accBonus.map(b => `
                    <div class="recap-item-row" onclick="openRecapDetailModal('unit', '${esc(b.unitId)}')">
                        <div class="recap-item-left-icon" style="background: rgba(245,158,11,0.15); color: #d97706;">
                            <i class="ri-gift-line"></i>
                        </div>
                        <div class="recap-item-main">
                            <div class="recap-item-title" style="color: #b45309;">
                                <span>${esc(b.name)}</span>
                                <span class="text-xs text-dim">(${b.quantity} pcs)</span>
                            </div>
                            <div class="recap-item-meta">
                                <span><i class="ri-calendar-line"></i> ${fmtDate(b.date)}</span>
                                <span>•</span>
                                <span>Untuk: <strong>${esc(b.unitRef)}</strong></span>
                                <span>•</span>
                                <span>Pembeli: ${esc(b.buyerName)}</span>
                                <span>•</span>
                                <span class="badge" style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 11px;">${esc(b.salesName)}</span>
                            </div>
                        </div>
                        <div class="recap-item-figures">
                            <div class="recap-item-price" style="color: #d97706;">Beban: ${fmtRp(b.cost)}</div>
                            <span class="badge" style="background: #fef3c7; color: #92400e; font-size: 10px; font-weight: 700; border-radius: 4px; padding: 1px 6px;">Gratis untuk Unit</span>
                        </div>
                        <div class="recap-item-chevron">
                            <i class="ri-arrow-right-s-line"></i>
                        </div>
                    </div>
                `).join('');
            }
        }

        // 5. Render Minimalist Services List
        const srvContainer = $('recapListServices');
        if (srvContainer) {
            if (!data.serviceList.length) {
                srvContainer.innerHTML = '<div class="card p-lg text-center text-dim" style="background:#ffffff; border-radius:12px;">Tidak ada data servis pada periode ini</div>';
            } else {
                srvContainer.innerHTML = data.serviceList.map(s => {
                    const statusBadgeClass = s.status === 'Selesai' ? 'badge-success' : (s.status === 'Cancel' ? 'badge-danger' : 'badge-warning');
                    const isFinal = s.status === 'Selesai' || s.status === 'Cancel';
                    const timelineInfo = s.dateIn && s.dateOut && s.dateIn !== s.dateOut
                        ? `<span><i class="ri-login-box-line"></i> Masuk: ${fmtDate(s.dateIn)}</span> <span>•</span> <span><i class="ri-logout-box-line"></i> ${s.status === 'Cancel' ? 'Batal' : 'Keluar'}: ${fmtDate(s.dateOut)}</span>`
                        : `<span><i class="ri-calendar-line"></i> ${fmtDate(s.date)}</span>`;

                    return `
                    <div class="recap-item-row" onclick="openRecapDetailModal('service', '${esc(s.id)}')">
                        <div class="recap-item-left-icon" style="background: ${s.status === 'Cancel' ? 'rgba(239,68,68,0.1)' : 'rgba(249,115,22,0.1)'}; color: ${s.status === 'Cancel' ? '#ef4444' : '#ea580c'};">
                            <i class="${s.status === 'Cancel' ? 'ri-close-circle-line' : 'ri-tools-line'}"></i>
                        </div>
                        <div class="recap-item-main">
                            <div class="recap-item-title">
                                <span>${esc(s.device)}</span>
                                <span class="mono" style="font-size: 11px; font-weight: 700; background: #f1f5f9; padding: 2px 7px; border-radius: 6px; border: 1px solid #e2e8f0;">${esc(s.code)}</span>
                            </div>
                            <div class="recap-item-meta">
                                ${timelineInfo}
                                <span>•</span>
                                <span>Pelanggan: ${esc(s.customerName)}</span>
                                <span>•</span>
                                <span>Teknisi: <strong>${esc(s.technician)}</strong></span>
                                <span>•</span>
                                <span class="badge ${statusBadgeClass}" style="padding: 2px 8px; border-radius: 6px; font-size: 11px;">${esc(s.status)}</span>
                            </div>
                        </div>
                        <div class="recap-item-figures">
                            <div class="recap-item-price">${fmtRp(s.fee)}</div>
                            ${isFinal ? `
                                <div class="recap-item-profit-badge ${s.profit >= 0 ? 'profit-pos' : 'profit-neg'}">
                                    Laba: ${fmtRp(s.profit)} (${(s.marginPct || 0).toFixed(1)}%)
                                </div>
                            ` : `
                                <span class="badge badge-warning" style="font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 6px;">Dalam Proses</span>
                            `}
                        </div>
                        <div class="recap-item-chevron">
                            <i class="ri-arrow-right-s-line"></i>
                        </div>
                    </div>`;
                }).join('');
            }
        }

        // 6. Render Minimalist Order Jasa List (iCloud, IMEI)
        const orderJasaContainer = $('recapListOrderJasa');
        if (orderJasaContainer) {
            if (!data.orderJasaList.length) {
                orderJasaContainer.innerHTML = '<div class="card p-lg text-center text-dim" style="background:#ffffff; border-radius:12px;">Tidak ada transaksi order jasa pada periode ini</div>';
            } else {
                orderJasaContainer.innerHTML = data.orderJasaList.map(j => `
                    <div class="recap-item-row" onclick="openRecapDetailModal('order-jasa', '${esc(j.id)}')">
                        <div class="recap-item-left-icon" style="background: rgba(2,132,199,0.1); color: #0284c7;">
                            <i class="ri-shield-keyhole-line"></i>
                        </div>
                        <div class="recap-item-main">
                            <div class="recap-item-title">
                                <span>${esc(j.name)}</span>
                                <span class="badge" style="background: #e0f2fe; color: #0284c7; font-size: 11px; padding: 2px 8px; border-radius: 6px;">${esc(j.category)}</span>
                            </div>
                            <div class="recap-item-meta">
                                <span><i class="ri-calendar-line"></i> ${fmtDate(j.date)}</span>
                                <span>•</span>
                                <span>Pelanggan: ${esc(j.buyerName)}</span>
                                <span>•</span>
                                <span class="mono">IMEI/Ref: ${esc(j.imei)}</span>
                                <span>•</span>
                                <span class="badge" style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 11px;">${esc(j.salesName)}</span>
                            </div>
                        </div>
                        <div class="recap-item-figures">
                            <div class="recap-item-price">${fmtRp(j.sell)}</div>
                            <div class="recap-item-profit-badge profit-pos">Laba: ${fmtRp(j.profit)}</div>
                        </div>
                        <div class="recap-item-chevron">
                            <i class="ri-arrow-right-s-line"></i>
                        </div>
                    </div>
                `).join('');
            }
        }

        // 7. Render Minimalist Lain-lain List (Custom/Manual)
        const otherContainer = $('recapListOther');
        if (otherContainer) {
            if (!data.otherList.length) {
                otherContainer.innerHTML = '<div class="card p-lg text-center text-dim" style="background:#ffffff; border-radius:12px;">Tidak ada transaksi barang lain-lain pada periode ini</div>';
            } else {
                otherContainer.innerHTML = data.otherList.map(o => `
                    <div class="recap-item-row" onclick="openRecapDetailModal('other', '${esc(o.id)}')">
                        <div class="recap-item-left-icon" style="background: rgba(100,116,139,0.1); color: #475569;">
                            <i class="ri-price-tag-3-line"></i>
                        </div>
                        <div class="recap-item-main">
                            <div class="recap-item-title">
                                <span>${esc(o.name)}</span>
                                <span class="mono" style="font-size: 11px; background: #f1f5f9; padding: 2px 7px; border-radius: 6px; border: 1px solid #e2e8f0;">${esc(o.code)}</span>
                            </div>
                            <div class="recap-item-meta">
                                <span><i class="ri-calendar-line"></i> ${fmtDate(o.date)}</span>
                                <span>•</span>
                                <span>Pembeli: ${esc(o.buyerName)}</span>
                                <span>•</span>
                                <span class="badge" style="background: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 6px; font-weight: 600; font-size: 11px;">${esc(o.salesName)}</span>
                            </div>
                        </div>
                        <div class="recap-item-figures">
                            <div class="recap-item-price">${fmtRp(o.sell)}</div>
                            <div class="recap-item-profit-badge profit-pos">Laba: ${fmtRp(o.profit)}</div>
                        </div>
                        <div class="recap-item-chevron">
                            <i class="ri-arrow-right-s-line"></i>
                        </div>
                    </div>
                `).join('');
            }
        }

        // 8. Render Minimalist Sales Performance List (Leaderboard)
        const perfContainer = $('recapListSalesPerf');
        if (perfContainer) {
            if (!data.salesPerformance.length) {
                perfContainer.innerHTML = '<div class="card p-lg text-center text-dim" style="background:#ffffff; border-radius:12px;">Belum ada catatan penjualan sales pada periode ini</div>';
            } else {
                perfContainer.innerHTML = data.salesPerformance.map((sp, idx) => `
                    <div class="recap-item-row" style="border-left: 4px solid ${idx === 0 ? '#f59e0b' : (idx === 1 ? '#94a3b8' : '#cbd5e1')};">
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <span style="display: inline-flex; width: 36px; height: 36px; border-radius: 10px; background: ${idx === 0 ? '#fef3c7' : '#f1f5f9'}; color: ${idx === 0 ? '#b45309' : '#334155'}; font-weight: 800; align-items: center; justify-content: center; font-size: 15px; border: 1px solid ${idx === 0 ? '#fde68a' : '#e2e8f0'};">
                                #${idx + 1}
                            </span>
                            <div>
                                <div style="font-size: 14.5px; font-weight: 700; color: #0f172a;">${esc(sp.name)}</div>
                                <div class="text-xs text-dim" style="margin-top: 2px;">
                                    ${esc(sp.jobTitle)} • <strong style="color: #2563eb;">${sp.unitsCount} Unit</strong> • ${sp.accCount} Acc • ${sp.orderJasaCount || 0} Jasa
                                </div>
                            </div>
                        </div>
                        <div class="recap-item-figures">
                            <div class="recap-item-price">${fmtRp(sp.totalOmset)}</div>
                            <div class="recap-item-profit-badge profit-pos">Kontribusi: ${fmtRp(sp.netContribution)}</div>
                            ${sp.bonusCost > 0 ? `<div class="text-xxs" style="color: #d97706; font-weight: 600; margin-top: 2px;"><i class="ri-gift-line"></i> Beban Bonus: ${fmtRp(sp.bonusCost)}</div>` : ''}
                        </div>
                    </div>
                `).join('');
            }
        }
    }

    // ══════════════════════════════════════════════════════════════
    // CLICK-TO-DETAIL TRANSACTION MODAL POP-UP (POLISHED)
    // ══════════════════════════════════════════════════════════════

    function openRecapDetailModal(type, id, monthOverride) {
        const data = getSalesRecapData(monthOverride || activeRecapMonth);
        const modal = $('modalRecapDetail');
        if (!modal) return;

        let itemData = null;
        let title = 'Rincian Transaksi';
        let subtitle = 'Detail data transaksi toko';
        let iconHtml = '<i class="ri-file-list-3-line"></i>';
        let iconBg = 'rgba(37,99,235,0.08)';
        let iconColor = 'var(--primary)';
        let heroPrice = 'Rp 0';
        let heroProfitHtml = '<span class="recap-hero-profit-value">Rp 0</span>';

        if (type === 'unit') {
            itemData = data.unitSales.find(u => String(u.id) === String(id) || String(u.code) === String(id));
            if (!itemData) {
                const allTxs = loadTransactions();
                const tx = allTxs.find(t => String(t.id) === String(id) || String(t.code) === String(id) || String(t.stockRefCode) === String(id));
                if (tx) {
                    const devices = load(DB_KEYS.devices) || [];
                    const unit = devices.find(d => d.code === (tx.stockRefCode || tx.code)) || {};
                    const model = tx.itemName || unit.model || 'Unit Phone';
                    const code = tx.stockRefCode || tx.code || '-';
                    const sellPrice = Number(tx.sell) || 0;
                    const unitCost = Number(unit.cost || tx.cost || 0);
                    const bonusList = Array.isArray(tx.bonusAccessories) ? tx.bonusAccessories : [];
                    const bonusCost = bonusList.reduce((sum, b) => sum + ((Number(b.cost) || 0) * (Number(b.quantity || b.qty) || 1)), 0);
                    const trueNetProfit = sellPrice - unitCost - bonusCost;
                    const marginPct = sellPrice > 0 ? (trueNetProfit / sellPrice) * 100 : 0;
                    itemData = {
                        id: tx.id,
                        date: tx.date,
                        model: model,
                        code: code,
                        storage: unit.storage || tx.storage || '-',
                        color: unit.color || tx.color || '-',
                        condition: unit.condition || tx.condition || '-',
                        unitCost: unitCost,
                        sellPrice: sellPrice,
                        bonusCost: bonusCost,
                        bonusList: bonusList,
                        trueNetProfit: trueNetProfit,
                        marginPct: marginPct,
                        paymentMethod: tx.paymentMethod || 'cash',
                        paymentDisplay: paymentLabel(tx.paymentMethod || 'cash'),
                        creditAgent: tx.creditAgent || '',
                        splitCash: Number(tx.splitCash) || 0,
                        splitTransfer: Number(tx.splitTransfer) || 0,
                        splitCredit: Number(tx.splitCredit) || 0,
                        buyerName: tx.buyerName || '-',
                        buyerPhone: tx.buyerPhone || tx.phone || '-',
                        salesName: tx.salesName || '-'
                    };
                }
            }
            if (!itemData) return;

            title = itemData.model;
            subtitle = `<span class="badge" style="background:#e0f2fe; color:#0284c7; font-weight:700; font-size:10.5px; padding:2px 7px; border-radius:5px;">Unit HP</span> <span class="mono" style="background:#f1f5f9; color:#475569; padding:2px 7px; border-radius:5px; font-weight:700; font-size:10.5px;">Kode: ${esc(itemData.code)}</span> <span style="display:inline-flex; align-items:center; gap:3px; color:#64748b; font-size:11px;"><i class="ri-calendar-line"></i> ${fmtDate(itemData.date)}</span>`;
            iconHtml = '<i class="ri-smartphone-line"></i>';
            iconBg = 'rgba(37,99,235,0.1)';
            iconColor = '#2563eb';
            heroPrice = fmtRp(itemData.sellPrice);
            heroProfitHtml = `<span class="recap-hero-profit-value">${fmtRp(itemData.trueNetProfit)}</span> <span class="recap-hero-profit-pct">${itemData.marginPct.toFixed(1)}%</span>`;

            $('modalRecapDetailItemContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Unit / Model:</span><span class="value font-bold" style="color:#0f172a;">${esc(itemData.model)}</span></div>
                <div class="recap-detail-row"><span class="label">Kode Stok / IMEI:</span><span class="value mono font-bold" style="background:#f1f5f9; color:#334155; padding:2px 7px; border-radius:5px; font-size:10.5px;">${esc(itemData.code)}</span></div>
                <div class="recap-detail-row"><span class="label">Spesifikasi:</span><span class="value">${esc(itemData.storage)} • ${esc(itemData.color)} • ${esc(itemData.condition)}</span></div>
                <div class="recap-detail-row"><span class="label">Tanggal Jual:</span><span class="value">${fmtDate(itemData.date)}</span></div>
                ${itemData.isTradeIn ? `<div class="recap-detail-row"><span class="label">Tipe Transaksi:</span><span class="value badge" style="background:#fff7ed; color:#c2410c; font-weight:700; padding:2px 7px; border-radius:5px;"><i class="ri-swap-line"></i> Tukar Tambah</span></div>` : ''}
            `;

            $('modalRecapDetailFinancialContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Harga Jual Unit:</span><span class="value font-bold" style="color:#0f172a;">${fmtRp(itemData.sellPrice)}</span></div>
                <div class="recap-detail-row"><span class="label">Modal HPP Unit:</span><span class="value font-mono" style="color:#64748b;">- ${fmtRp(itemData.unitCost)}</span></div>
                <div class="recap-detail-row"><span class="label">Beban Bonus:</span><span class="value font-mono font-bold" style="color:${itemData.bonusCost > 0 ? '#d97706' : '#64748b'};">${itemData.bonusCost > 0 ? '- ' + fmtRp(itemData.bonusCost) : 'Rp 0'}</span></div>
                <div class="recap-detail-row recap-profit-row"><span class="label">Laba Riil Penjualan:</span><span class="value">${fmtRp(itemData.trueNetProfit)}</span></div>
                ${itemData.isTradeIn ? `
                    <div class="recap-detail-row" style="margin-top:6px; padding-top:6px; border-top:1px dashed #fdba74;"><span class="label" style="color:#c2410c;">Tarik HP Lama (Modal Stok):</span><span class="value font-mono font-bold" style="color:#c2410c;">+ ${fmtRp(itemData.tradeInCost)}</span></div>
                    <div class="recap-detail-row"><span class="label" style="color:#0369a1;">Uang Masuk Kasir (Sisa Bayar):</span><span class="value font-mono font-bold" style="color:#0369a1;">${fmtRp(itemData.cashPaid)}</span></div>
                ` : ''}
            `;

            $('modalRecapDetailPaymentContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">${itemData.isTradeIn ? 'Metode Sisa Bayar:' : 'Metode Bayar:'}</span><span class="value font-bold" style="color:#0f172a;">${esc(itemData.paymentDisplay)}</span></div>
                ${itemData.creditAgent ? `<div class="recap-detail-row"><span class="label">Leasing:</span><span class="value badge" style="background:#e0f2fe; color:#0284c7; font-weight:700; padding:2px 7px; border-radius:5px;">${esc(itemData.creditAgent)}</span></div>` : ''}
                ${itemData.paymentMethod === 'split' ? `
                    <div class="recap-detail-row"><span class="label">• Split Cash:</span><span class="value font-mono font-bold">${fmtRp(itemData.splitCash)}</span></div>
                    <div class="recap-detail-row"><span class="label">• Split TF:</span><span class="value font-mono font-bold">${fmtRp(itemData.splitTransfer)}</span></div>
                    <div class="recap-detail-row"><span class="label">• Split Kredit:</span><span class="value font-mono font-bold">${fmtRp(itemData.splitCredit)}</span></div>
                ` : ''}
            `;

            $('modalRecapDetailStaffContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Pembeli:</span><span class="value font-bold" style="color:#0f172a;">${esc(itemData.buyerName || '-')}</span></div>
                <div class="recap-detail-row"><span class="label">WhatsApp:</span><span class="value font-mono">${esc(itemData.buyerPhone || '-')}</span></div>
                <div class="recap-detail-row"><span class="label">Petugas Sales:</span><span class="value badge" style="background:#e0f2fe; color:#0284c7; padding:2px 8px; border-radius:5px; font-weight:700;">${esc(itemData.salesName || '-')}</span></div>
            `;

            // Bonus Accessories box
            const bonusBox = $('modalRecapDetailBonusBox');
            const bonusListElem = $('modalRecapDetailBonusList');
            if (bonusBox && bonusListElem) {
                if (itemData.bonusList && itemData.bonusList.length) {
                    bonusBox.style.display = 'block';
                    bonusListElem.innerHTML = itemData.bonusList.map(b => `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px dashed rgba(245,158,11,0.3);">
                            <span style="font-size: 11.5px; color: #78350f;"><i class="ri-gift-line" style="color:#d97706;"></i> <strong>${esc(b.name || b.model)}</strong> (${Number(b.quantity || b.qty) || 1} pcs)</span>
                            <span class="mono" style="font-weight: 700; color: #b45309; font-size: 11.5px;">Beban: ${fmtRp((Number(b.cost) || 0) * (Number(b.quantity || b.qty) || 1))}</span>
                        </div>
                    `).join('');
                } else {
                    bonusBox.style.display = 'none';
                }
            }
        } else if (type === 'accessory') {
            itemData = data.accSold.find(a => String(a.id) === String(id) || String(a.code) === String(id));
            if (!itemData) {
                const allTxs = loadTransactions();
                const tx = allTxs.find(t => String(t.id) === String(id) || String(t.code) === String(id));
                if (tx) {
                    const qty = Number(tx.quantity) || 1;
                    const sell = Number(tx.sell) || 0;
                    const cost = Number(tx.cost) || 0;
                    const profit = sell - cost;
                    itemData = {
                        id: tx.id,
                        date: tx.date,
                        name: tx.itemName || 'Aksesoris',
                        brand: tx.brand || 'Apple',
                        category: tx.accessoryCategory || '-',
                        quantity: qty,
                        cost: cost,
                        sell: sell,
                        profit: profit,
                        paymentMethod: tx.paymentMethod || 'cash',
                        paymentDisplay: paymentLabel(tx.paymentMethod || 'cash'),
                        buyerName: tx.buyerName || '-',
                        buyerPhone: tx.buyerPhone || '-',
                        salesName: tx.salesName || '-'
                    };
                }
            }
            if (!itemData) return;

            title = itemData.name;
            subtitle = `<span class="badge" style="background:#ede9fe; color:#7c3aed; font-weight:700; font-size:10.5px; padding:2px 7px; border-radius:5px;">Aksesoris</span> <span class="mono" style="background:#f1f5f9; color:#475569; padding:2px 7px; border-radius:5px; font-weight:700; font-size:10.5px;">Brand: ${esc(itemData.brand)}</span> <span style="display:inline-flex; align-items:center; gap:3px; color:#64748b; font-size:11px;"><i class="ri-calendar-line"></i> ${fmtDate(itemData.date)}</span>`;
            iconHtml = '<i class="ri-plug-line"></i>';
            iconBg = 'rgba(139,92,246,0.1)';
            iconColor = '#8b5cf6';
            heroPrice = fmtRp(itemData.sell);
            heroProfitHtml = `<span class="recap-hero-profit-value">${fmtRp(itemData.profit)}</span> <span class="recap-hero-profit-pct">${itemData.sell > 0 ? ((itemData.profit / itemData.sell) * 100).toFixed(1) : 0}%</span>`;

            $('modalRecapDetailItemContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Nama Item:</span><span class="value font-bold" style="color:#0f172a;">${esc(itemData.name)}</span></div>
                <div class="recap-detail-row"><span class="label">Brand:</span><span class="value">${esc(itemData.brand)}</span></div>
                <div class="recap-detail-row"><span class="label">Jumlah (Qty):</span><span class="value font-bold">${itemData.quantity} pcs</span></div>
                <div class="recap-detail-row"><span class="label">Tanggal:</span><span class="value">${fmtDate(itemData.date)}</span></div>
            `;

            $('modalRecapDetailFinancialContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Harga Jual:</span><span class="value font-bold" style="color:#0f172a;">${fmtRp(itemData.sell)}</span></div>
                <div class="recap-detail-row"><span class="label">Modal HPP:</span><span class="value font-mono" style="color:#64748b;">- ${fmtRp(itemData.cost)}</span></div>
                <div class="recap-detail-row recap-profit-row"><span class="label">Laba Bersih:</span><span class="value">${fmtRp(itemData.profit)}</span></div>
            `;

            $('modalRecapDetailPaymentContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Metode Bayar:</span><span class="value font-bold" style="color:#0f172a;">${esc(itemData.paymentDisplay)}</span></div>
            `;

            $('modalRecapDetailStaffContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Pembeli:</span><span class="value font-bold" style="color:#0f172a;">${esc(itemData.buyerName || '-')}</span></div>
                <div class="recap-detail-row"><span class="label">Petugas Sales:</span><span class="value badge" style="background:#e0f2fe; color:#0284c7; padding:2px 8px; border-radius:5px; font-weight:700;">${esc(itemData.salesName || '-')}</span></div>
            `;

            if ($('modalRecapDetailBonusBox')) $('modalRecapDetailBonusBox').style.display = 'none';
        } else if (type === 'service') {
            itemData = data.serviceList.find(s => String(s.id) === String(id) || String(s.code) === String(id));
            if (!itemData) {
                const allTxs = loadTransactions();
                const tx = allTxs.find(t => String(t.id) === String(id) || String(t.code) === String(id) || String(t.serviceOrderCode) === String(id));
                const orders = loadServiceOrders();
                const order = orders.find(o => String(o.id) === String(id) || String(o.code) === String(id) || (tx && o.code === tx.serviceOrderCode));
                if (tx || order) {
                    const partCost = Number(order?.sparepartCost || tx?.sparepartCost || 0);
                    const serviceFee = Number(order?.serviceFee || tx?.serviceFee || 0);
                    const totalCost = (partCost + serviceFee) || Number(order?.technicianCost || tx?.fee || tx?.cost || 0);
                    const fee = Number(order?.paidAmount || tx?.sell || 0);
                    const profit = fee - totalCost;
                    const marginPct = fee > 0 ? (profit / fee) * 100 : 0;
                    itemData = {
                        id: tx?.id || order?.id || id,
                        code: order?.code || tx?.code || tx?.serviceOrderCode || id,
                        date: order?.paidDate || order?.processDate || tx?.date || today(),
                        customerName: order?.buyerName || tx?.buyerName || '-',
                        customerPhone: order?.buyerWa || tx?.buyerWa || '-',
                        device: order?.itemName || tx?.itemName || 'Service Perangkat',
                        complaint: order?.complaint || tx?.complaint || '-',
                        technician: order?.technician || tx?.technician || '-',
                        sparepartCost: partCost,
                        serviceFee: serviceFee,
                        fee: fee,
                        cost: totalCost,
                        profit: profit,
                        marginPct: marginPct,
                        paymentMethod: order?.paymentMethod || tx?.paymentMethod || 'cash',
                        status: (order?.status === 'Cancel' || tx?.serviceStatus === 'Cancel') ? 'Cancel' : 'Selesai'
                    };
                }
            }
            if (!itemData) return;

            title = itemData.device;
            subtitle = `<span class="badge" style="background:#fef3c7; color:#b45309; font-weight:700; font-size:10.5px; padding:2px 7px; border-radius:5px;">Jasa Servis</span> <span class="mono" style="background:#f1f5f9; color:#475569; padding:2px 7px; border-radius:5px; font-weight:700; font-size:10.5px;">Nota: ${esc(itemData.code)}</span> <span style="display:inline-flex; align-items:center; gap:3px; color:#64748b; font-size:11px;"><i class="ri-calendar-line"></i> ${fmtDate(itemData.date)}</span>`;
            iconHtml = '<i class="ri-tools-line"></i>';
            iconBg = 'rgba(245,158,11,0.1)';
            iconColor = '#f59e0b';
            heroPrice = fmtRp(itemData.fee);
            heroProfitHtml = `<span class="recap-hero-profit-value">${fmtRp(itemData.profit)}</span> <span class="recap-hero-profit-pct">${(itemData.marginPct || 0).toFixed(1)}%</span>`;

            $('modalRecapDetailItemContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">No. Nota:</span><span class="value mono font-bold" style="background:#f1f5f9; color:#334155; padding:2px 7px; border-radius:5px; font-size:10.5px;">${esc(itemData.code)}</span></div>
                <div class="recap-detail-row"><span class="label">Perangkat:</span><span class="value font-bold" style="color:#0f172a;">${esc(itemData.device)}</span></div>
                <div class="recap-detail-row"><span class="label">Keluhan:</span><span class="value">${esc(itemData.complaint)}</span></div>
                <div class="recap-detail-row"><span class="label">Tanggal:</span><span class="value">${fmtDate(itemData.date)}</span></div>
            `;

            $('modalRecapDetailFinancialContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Total Bayar:</span><span class="value font-bold" style="color:#0f172a;">${fmtRp(itemData.fee)}</span></div>
                <div class="recap-detail-row"><span class="label">Modal Sparepart:</span><span class="value font-mono" style="color:#64748b;">- ${fmtRp(itemData.sparepartCost || 0)}</span></div>
                <div class="recap-detail-row"><span class="label">Modal Jasa/Fee:</span><span class="value font-mono" style="color:#64748b;">- ${fmtRp(itemData.serviceFee || 0)}</span></div>
                <div class="recap-detail-row"><span class="label">Total Modal (HPP):</span><span class="value font-mono font-bold" style="color:#64748b;">- ${fmtRp(itemData.cost)}</span></div>
                <div class="recap-detail-row recap-profit-row"><span class="label">Laba Bersih:</span><span class="value">${fmtRp(itemData.profit)} (${(itemData.marginPct || 0).toFixed(1)}%)</span></div>
            `;

            $('modalRecapDetailPaymentContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Metode Bayar:</span><span class="value font-bold" style="color:#0f172a;">${esc(paymentLabel(itemData.paymentMethod))}</span></div>
                <div class="recap-detail-row"><span class="label">Status:</span><span class="value badge ${itemData.status === 'Selesai' ? 'badge-success' : 'badge-warning'}" style="padding:2px 7px; border-radius:5px; font-weight:700;">${esc(itemData.status)}</span></div>
            `;

            $('modalRecapDetailStaffContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Pelanggan:</span><span class="value font-bold" style="color:#0f172a;">${esc(itemData.customerName || '-')}</span></div>
                <div class="recap-detail-row"><span class="label">WhatsApp:</span><span class="value font-mono">${esc(itemData.customerPhone || '-')}</span></div>
                <div class="recap-detail-row"><span class="label">Teknisi:</span><span class="value badge" style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:5px; font-weight:700;">${esc(itemData.technician || '-')}</span></div>
            `;

            if ($('modalRecapDetailBonusBox')) $('modalRecapDetailBonusBox').style.display = 'none';
        } else if (type === 'order-jasa') {
            itemData = data.orderJasaList.find(j => String(j.id) === String(id) || String(j.code) === String(id));
            if (!itemData) {
                const allTxs = loadTransactions();
                const tx = allTxs.find(t => String(t.id) === String(id) || String(t.code) === String(id));
                if (tx) {
                    const cost = Number(tx.cost) || 0;
                    const sell = Number(tx.sell) || 0;
                    const profit = sell - cost;
                    let categoryLabel = 'Order Jasa';
                    if (tx.category === 'order_jasa_beacukai') categoryLabel = 'IMEI Bea Cukai';
                    else if (tx.category === 'order_jasa_icloud' || tx.category === 'jasa_icloud') categoryLabel = 'Jasa iCloud';
                    else if (tx.category === 'jasa_imei') categoryLabel = 'Jasa IMEI';

                    itemData = {
                        id: tx.id,
                        date: tx.date,
                        category: categoryLabel,
                        name: tx.itemName || (tx.category.includes('icloud') ? 'Bypass / Unlock iCloud' : 'Registrasi / Unlock IMEI'),
                        code: tx.code || '-',
                        imei: tx.imei || tx.code || '-',
                        cost: cost,
                        sell: sell,
                        profit: profit,
                        paymentMethod: tx.paymentMethod || 'cash',
                        paymentDisplay: paymentLabel(tx.paymentMethod || 'cash'),
                        buyerName: tx.buyerName || '-',
                        buyerPhone: tx.buyerPhone || tx.buyerWa || '-',
                        salesName: tx.salesName || '-'
                    };
                }
            }
            if (!itemData) return;

            title = itemData.name;
            subtitle = `<span class="badge" style="background:#e0f2fe; color:#0284c7; font-weight:700; font-size:10.5px; padding:2px 7px; border-radius:5px;">Order Jasa</span> <span class="mono" style="background:#f1f5f9; color:#475569; padding:2px 7px; border-radius:5px; font-weight:700; font-size:10.5px;">ID: ${esc(itemData.code)}</span> <span style="display:inline-flex; align-items:center; gap:3px; color:#64748b; font-size:11px;"><i class="ri-calendar-line"></i> ${fmtDate(itemData.date)}</span>`;
            iconHtml = '<i class="ri-shield-keyhole-line"></i>';
            iconBg = 'rgba(2,132,199,0.1)';
            iconColor = '#0284c7';
            heroPrice = fmtRp(itemData.sell);
            heroProfitHtml = `<span class="recap-hero-profit-value">${fmtRp(itemData.profit)}</span> <span class="recap-hero-profit-pct">${itemData.sell > 0 ? ((itemData.profit / itemData.sell) * 100).toFixed(1) : 0}%</span>`;

            $('modalRecapDetailItemContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Nama Jasa:</span><span class="value font-bold" style="color:#0f172a;">${esc(itemData.name)}</span></div>
                <div class="recap-detail-row"><span class="label">Kode ID:</span><span class="value mono font-bold" style="background:#f1f5f9; color:#334155; padding:2px 7px; border-radius:5px; font-size:10.5px;">${esc(itemData.code)}</span></div>
                <div class="recap-detail-row"><span class="label">Ref IMEI:</span><span class="value mono font-bold" style="color:#0284c7;">${esc(itemData.imei || '-')}</span></div>
                <div class="recap-detail-row"><span class="label">Tanggal:</span><span class="value">${fmtDate(itemData.date)}</span></div>
            `;

            $('modalRecapDetailFinancialContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Biaya Jasa:</span><span class="value font-bold" style="color:#0f172a;">${fmtRp(itemData.sell)}</span></div>
                <div class="recap-detail-row"><span class="label">Modal Server:</span><span class="value font-mono" style="color:#64748b;">- ${fmtRp(itemData.cost)}</span></div>
                <div class="recap-detail-row recap-profit-row"><span class="label">Laba Bersih:</span><span class="value">${fmtRp(itemData.profit)}</span></div>
            `;

            $('modalRecapDetailPaymentContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Metode Bayar:</span><span class="value font-bold" style="color:#0f172a;">${esc(paymentLabel(itemData.paymentMethod))}</span></div>
            `;

            $('modalRecapDetailStaffContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Pelanggan:</span><span class="value font-bold" style="color:#0f172a;">${esc(itemData.buyerName || '-')}</span></div>
                <div class="recap-detail-row"><span class="label">WhatsApp:</span><span class="value font-mono">${esc(itemData.buyerPhone || '-')}</span></div>
                <div class="recap-detail-row"><span class="label">Petugas Sales:</span><span class="value badge" style="background:#e0f2fe; color:#0284c7; padding:2px 8px; border-radius:5px; font-weight:700;">${esc(itemData.salesName || '-')}</span></div>
            `;

            if ($('modalRecapDetailBonusBox')) $('modalRecapDetailBonusBox').style.display = 'none';
        } else if (type === 'other') {
            itemData = data.otherList.find(o => String(o.id) === String(id) || String(o.code) === String(id));
            if (!itemData) {
                const allTxs = loadTransactions();
                const tx = allTxs.find(t => String(t.id) === String(id) || String(t.code) === String(id));
                if (tx) {
                    const cost = Number(tx.cost) || 0;
                    const sell = Number(tx.sell) || 0;
                    const profit = sell - cost;
                    itemData = {
                        id: tx.id,
                        date: tx.date,
                        name: tx.itemName || 'Barang Lain-lain',
                        code: tx.code || '-',
                        cost: cost,
                        sell: sell,
                        profit: profit,
                        paymentMethod: tx.paymentMethod || 'cash',
                        paymentDisplay: paymentLabel(tx.paymentMethod || 'cash'),
                        buyerName: tx.buyerName || '-',
                        buyerPhone: tx.buyerPhone || '-',
                        salesName: tx.salesName || '-'
                    };
                }
            }
            if (!itemData) return;

            title = itemData.name;
            subtitle = `<span class="badge" style="background:#f1f5f9; color:#475569; font-weight:700; font-size:10.5px; padding:2px 7px; border-radius:5px;">Lain-lain</span> <span class="mono" style="background:#f1f5f9; color:#475569; padding:2px 7px; border-radius:5px; font-weight:700; font-size:10.5px;">Kode: ${esc(itemData.code)}</span> <span style="display:inline-flex; align-items:center; gap:3px; color:#64748b; font-size:11px;"><i class="ri-calendar-line"></i> ${fmtDate(itemData.date)}</span>`;
            iconHtml = '<i class="ri-price-tag-3-line"></i>';
            iconBg = 'rgba(100,116,139,0.1)';
            iconColor = '#64748b';
            heroPrice = fmtRp(itemData.sell);
            heroProfitHtml = `<span class="recap-hero-profit-value">${fmtRp(itemData.profit)}</span> <span class="recap-hero-profit-pct">${itemData.sell > 0 ? ((itemData.profit / itemData.sell) * 100).toFixed(1) : 0}%</span>`;

            $('modalRecapDetailItemContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Nama Barang:</span><span class="value font-bold" style="color:#0f172a;">${esc(itemData.name)}</span></div>
                <div class="recap-detail-row"><span class="label">Kode ID:</span><span class="value mono font-bold" style="background:#f1f5f9; color:#334155; padding:2px 7px; border-radius:5px; font-size:10.5px;">${esc(itemData.code)}</span></div>
                <div class="recap-detail-row"><span class="label">Tanggal:</span><span class="value">${fmtDate(itemData.date)}</span></div>
            `;

            $('modalRecapDetailFinancialContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Harga Jual:</span><span class="value font-bold" style="color:#0f172a;">${fmtRp(itemData.sell)}</span></div>
                <div class="recap-detail-row"><span class="label">Modal HPP:</span><span class="value font-mono" style="color:#64748b;">- ${fmtRp(itemData.cost)}</span></div>
                <div class="recap-detail-row recap-profit-row"><span class="label">Laba Bersih:</span><span class="value">${fmtRp(itemData.profit)}</span></div>
            `;

            $('modalRecapDetailPaymentContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Metode Bayar:</span><span class="value font-bold" style="color:#0f172a;">${esc(paymentLabel(itemData.paymentMethod))}</span></div>
            `;

            $('modalRecapDetailStaffContent').innerHTML = `
                <div class="recap-detail-row"><span class="label">Pembeli:</span><span class="value font-bold" style="color:#0f172a;">${esc(itemData.buyerName || '-')}</span></div>
                <div class="recap-detail-row"><span class="label">Petugas Sales:</span><span class="value badge" style="background:#e0f2fe; color:#0284c7; padding:2px 8px; border-radius:5px; font-weight:700;">${esc(itemData.salesName || '-')}</span></div>
            `;

            if ($('modalRecapDetailBonusBox')) $('modalRecapDetailBonusBox').style.display = 'none';
        }

        const iconElem = $('modalRecapDetailIcon');
        if (iconElem) {
            iconElem.innerHTML = iconHtml;
            iconElem.style.background = iconBg;
            iconElem.style.color = iconColor;
        }

        if ($('modalRecapDetailTitle')) $('modalRecapDetailTitle').textContent = title;
        if ($('modalRecapDetailSubtitle')) $('modalRecapDetailSubtitle').innerHTML = subtitle;
        if ($('modalRecapDetailHeroPrice')) $('modalRecapDetailHeroPrice').textContent = heroPrice;
        if ($('modalRecapDetailHeroProfit')) $('modalRecapDetailHeroProfit').innerHTML = heroProfitHtml;
        modal.style.display = 'flex';
        modal.classList.add('open');
    }

    function closeRecapDetailModal() {
        const modal = $('modalRecapDetail');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('open');
        }
    }

    // Attach to window so onclick inline handlers in template strings can call them
    window.openRecapDetailModal = openRecapDetailModal;
    window.closeRecapDetailModal = closeRecapDetailModal;

    async function exportSalesRecapPdf(isFullReport = false) {
        toast('Menyiapkan Laporan PDF...', 'info');
        try {
            await loadJsPdfLibrary();
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('l', 'pt', 'a4');
            const data = getSalesRecapData();

            const monthParts = activeRecapMonth.split('-');
            const dateObj = new Date(Number(monthParts[0]), Number(monthParts[1]) - 1, 1);
            const monthLabel = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
            const salesLabel = activeRecapSales ? `Sales: ${activeRecapSales}` : 'Semua Sales';

            // Document Header
            doc.setFillColor(30, 41, 59);
            doc.rect(40, 30, 762, 45, 'F');
            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(255, 255, 255);
            doc.text('IGOOD STORE — LAPORAN REKAPITULASI PENJUALAN & KINERJA TOKO', 55, 58);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9.5);
            doc.setTextColor(100, 116, 139);
            doc.text(`Periode: ${monthLabel} | Filter: ${salesLabel} | Dicetak: ${fmtDate(today())} ${new Date().toLocaleTimeString('id-ID')}`, 40, 90);

            // Executive KPI Cards (Top Box)
            const kpiY = 100;
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(40, kpiY, 762, 50, 6, 6, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(40, kpiY, 762, 50, 6, 6, 'S');

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(71, 85, 105);
            doc.text('TOTAL OMSET', 55, kpiY + 18);
            doc.text('MODAL HPP BARANG', 245, kpiY + 18);
            doc.text('MODAL BONUS AKSESORIS', 435, kpiY + 18);
            doc.text('LABA BERSIH RIIL TOKO', 625, kpiY + 18);

            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text(fmtRp(data.summary.totalRevenue), 55, kpiY + 36);
            doc.text(fmtRp(data.summary.totalHpp), 245, kpiY + 36);
            doc.setTextColor(217, 119, 6);
            doc.text(fmtRp(data.summary.totalBonusCost), 435, kpiY + 36);
            doc.setTextColor(22, 163, 74);
            doc.text(`${fmtRp(data.summary.totalNetProfit)} (${data.summary.totalMarginPct.toFixed(1)}%)`, 625, kpiY + 36);

            let startTableY = kpiY + 65;

            // Decide which tables to export
            const currentCat = activeRecapCat || 'units';
            const shouldExportUnits = isFullReport || currentCat === 'units';
            const shouldExportAcc = isFullReport || currentCat === 'accessories';
            const shouldExportServices = isFullReport || currentCat === 'services';
            const shouldExportOrderJasa = isFullReport || currentCat === 'order-jasa';
            const shouldExportOther = isFullReport || currentCat === 'other';
            const shouldExportPerf = isFullReport || currentCat === 'sales-perf';

            // 1. UNIT SALES TABLE
            if (shouldExportUnits && data.unitSales.length) {
                doc.setFont('Helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(30, 41, 59);
                doc.text('1. REKAPITULASI PENJUALAN UNIT HP (IPHONE & ANDROID)', 40, startTableY);
                startTableY += 8;

                const unitRows = data.unitSales.map((u, i) => [
                    i + 1,
                    fmtDate(u.date),
                    `${u.model}\n(${u.storage} | ${u.color} | ${u.condition})`,
                    u.code,
                    fmtRp(u.unitCost),
                    fmtRp(u.sellPrice),
                    u.bonusCost > 0 ? fmtRp(u.bonusCost) : '-',
                    `${fmtRp(u.trueNetProfit)}\n(${u.marginPct.toFixed(1)}%)`,
                    u.paymentDisplay,
                    u.buyerName,
                    u.salesName
                ]);

                doc.autoTable({
                    startY: startTableY,
                    head: [['No', 'Tgl', 'Unit & Spesifikasi', 'Kode', 'Modal Unit', 'Harga Jual', 'Modal Bonus', 'Laba Riil', 'Pembayaran', 'Pembeli', 'Sales']],
                    body: unitRows,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 4, valign: 'middle' },
                    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 24 },
                        1: { cellWidth: 55 },
                        3: { halign: 'center', cellWidth: 55 },
                        4: { halign: 'right', cellWidth: 65 },
                        5: { halign: 'right', cellWidth: 65, fontStyle: 'bold' },
                        6: { halign: 'right', cellWidth: 60, textColor: [217, 119, 6] },
                        7: { halign: 'right', cellWidth: 65, fontStyle: 'bold', textColor: [22, 163, 74] },
                        10: { fontStyle: 'bold' }
                    },
                    margin: { left: 40, right: 40 }
                });

                startTableY = doc.lastAutoTable.finalY + 20;
            }

            // 2. ACCESSORIES & BONUS TRACKER TABLES
            if (shouldExportAcc) {
                if (data.accSold.length) {
                    if (startTableY > 480) { doc.addPage(); startTableY = 40; }
                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(11);
                    doc.setTextColor(30, 41, 59);
                    doc.text('2. REKAPITULASI PENJUALAN AKSESORIS (BERBAYAR)', 40, startTableY);
                    startTableY += 8;

                    const accRows = data.accSold.map((a, i) => [
                        i + 1,
                        fmtDate(a.date),
                        a.name,
                        a.brand,
                        `${a.quantity} pcs`,
                        fmtRp(a.cost),
                        fmtRp(a.sell),
                        fmtRp(a.profit),
                        a.paymentDisplay,
                        a.salesName
                    ]);

                    doc.autoTable({
                        startY: startTableY,
                        head: [['No', 'Tgl', 'Nama Aksesoris', 'Brand', 'Qty', 'Modal', 'Jual', 'Laba', 'Pembayaran', 'Sales']],
                        body: accRows,
                        theme: 'grid',
                        styles: { fontSize: 8, cellPadding: 4 },
                        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255] },
                        columnStyles: {
                            0: { halign: 'center', cellWidth: 24 },
                            4: { halign: 'center', cellWidth: 40 },
                            5: { halign: 'right', cellWidth: 65 },
                            6: { halign: 'right', cellWidth: 65 },
                            7: { halign: 'right', cellWidth: 65, textColor: [22, 163, 74] }
                        },
                        margin: { left: 40, right: 40 }
                    });

                    startTableY = doc.lastAutoTable.finalY + 20;
                }

                if (data.accBonus.length) {
                    if (startTableY > 480) { doc.addPage(); startTableY = 40; }
                    doc.setFont('Helvetica', 'bold');
                    doc.setFontSize(11);
                    doc.setTextColor(217, 119, 6);
                    doc.text('3. PELACAKAN BONUS AKSESORIS (KELUAR UNTUK UNIT HP)', 40, startTableY);
                    startTableY += 8;

                    const bonusRows = data.accBonus.map((b, i) => [
                        i + 1,
                        fmtDate(b.date),
                        b.name,
                        b.brand,
                        `${b.quantity} pcs`,
                        fmtRp(b.cost),
                        b.unitRef,
                        b.buyerName,
                        b.salesName
                    ]);

                    doc.autoTable({
                        startY: startTableY,
                        head: [['No', 'Tgl', 'Nama Aksesoris Bonus', 'Brand', 'Qty', 'Beban Modal', 'Diberikan Untuk Unit', 'Pembeli', 'Sales']],
                        body: bonusRows,
                        theme: 'grid',
                        styles: { fontSize: 8, cellPadding: 4 },
                        headStyles: { fillColor: [217, 119, 6], textColor: [255, 255, 255] },
                        columnStyles: {
                            0: { halign: 'center', cellWidth: 24 },
                            4: { halign: 'center', cellWidth: 40 },
                            5: { halign: 'right', cellWidth: 65, fontStyle: 'bold', textColor: [217, 119, 6] },
                            6: { fontStyle: 'bold' }
                        },
                        margin: { left: 40, right: 40 }
                    });

                    startTableY = doc.lastAutoTable.finalY + 20;
                }
            }

            // 3. SERVICES TABLE
            if (shouldExportServices && data.serviceList.length) {
                if (startTableY > 480) { doc.addPage(); startTableY = 40; }
                doc.setFont('Helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(30, 41, 59);
                doc.text('4. REKAPITULASI JASA SERVIS & PERBAIKAN', 40, startTableY);
                startTableY += 8;

                const srvRows = data.serviceList.map((s, i) => [
                    i + 1,
                    s.code,
                    fmtDate(s.dateIn || s.date),
                    s.dateOut ? fmtDate(s.dateOut) : (s.status === 'Masuk' || s.status === 'Diproses' ? 'Dalam Proses' : fmtDate(s.date)),
                    s.customerName,
                    `${s.device}\n(${s.complaint})`,
                    s.technician,
                    fmtRp(s.fee),
                    fmtRp(s.sparepartCost || 0),
                    fmtRp(s.serviceFee || 0),
                    fmtRp(s.cost),
                    (s.status === 'Masuk' || s.status === 'Diproses') ? '-' : `${fmtRp(s.profit)}\n(${(s.marginPct || 0).toFixed(1)}%)`,
                    s.status
                ]);

                doc.autoTable({
                    startY: startTableY,
                    head: [['No', 'Nota', 'Tgl Masuk', 'Tgl Keluar', 'Pelanggan', 'Unit & Kerusakan', 'Teknisi', 'Total Bayar', 'Modal Part', 'Modal Jasa', 'Total Modal', 'Laba Bersih', 'Status']],
                    body: srvRows,
                    theme: 'grid',
                    styles: { fontSize: 7, cellPadding: 3, valign: 'middle' },
                    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 18 },
                        1: { halign: 'center', cellWidth: 42 },
                        2: { cellWidth: 42 },
                        3: { cellWidth: 42 },
                        7: { halign: 'right', cellWidth: 50, fontStyle: 'bold' },
                        8: { halign: 'right', cellWidth: 46 },
                        9: { halign: 'right', cellWidth: 46 },
                        10: { halign: 'right', cellWidth: 50 },
                        11: { halign: 'right', cellWidth: 55, fontStyle: 'bold', textColor: [22, 163, 74] },
                        12: { halign: 'center', cellWidth: 38 }
                    },
                    margin: { left: 40, right: 40 }
                });

                startTableY = doc.lastAutoTable.finalY + 20;
            }

            // 4. ORDER JASA TABLE
            if (shouldExportOrderJasa && data.orderJasaList.length) {
                if (startTableY > 480) { doc.addPage(); startTableY = 40; }
                doc.setFont('Helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(30, 41, 59);
                doc.text('5. REKAPITULASI ORDER JASA (ICLOUD, IMEI, SOFTWARE)', 40, startTableY);
                startTableY += 8;

                const jasaRows = data.orderJasaList.map((j, i) => [
                    i + 1,
                    fmtDate(j.date),
                    j.name,
                    j.category,
                    j.imei,
                    fmtRp(j.cost),
                    fmtRp(j.sell),
                    fmtRp(j.profit),
                    j.paymentDisplay,
                    j.buyerName,
                    j.salesName
                ]);

                doc.autoTable({
                    startY: startTableY,
                    head: [['No', 'Tgl', 'Jenis Jasa', 'Kategori', 'IMEI/Ref', 'Modal', 'Tarif', 'Laba', 'Pembayaran', 'Pelanggan', 'Sales']],
                    body: jasaRows,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 4 },
                    headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255] },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 24 },
                        5: { halign: 'right', cellWidth: 60 },
                        6: { halign: 'right', cellWidth: 60 },
                        7: { halign: 'right', cellWidth: 60, textColor: [22, 163, 74] }
                    },
                    margin: { left: 40, right: 40 }
                });

                startTableY = doc.lastAutoTable.finalY + 20;
            }

            // 5. OTHER / LAIN-LAIN TABLE
            if (shouldExportOther && data.otherList.length) {
                if (startTableY > 480) { doc.addPage(); startTableY = 40; }
                doc.setFont('Helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(30, 41, 59);
                doc.text('6. REKAPITULASI TRANSAKSI LAIN-LAIN & CUSTOM', 40, startTableY);
                startTableY += 8;

                const otherRows = data.otherList.map((o, i) => [
                    i + 1,
                    fmtDate(o.date),
                    o.name,
                    o.code,
                    fmtRp(o.cost),
                    fmtRp(o.sell),
                    fmtRp(o.profit),
                    o.paymentDisplay,
                    o.buyerName,
                    o.salesName
                ]);

                doc.autoTable({
                    startY: startTableY,
                    head: [['No', 'Tgl', 'Item', 'Kode', 'Modal', 'Jual', 'Laba', 'Pembayaran', 'Pembeli', 'Sales']],
                    body: otherRows,
                    theme: 'grid',
                    styles: { fontSize: 8, cellPadding: 4 },
                    headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255] },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 24 },
                        4: { halign: 'right', cellWidth: 65 },
                        5: { halign: 'right', cellWidth: 65 },
                        6: { halign: 'right', cellWidth: 65, textColor: [22, 163, 74] }
                    },
                    margin: { left: 40, right: 40 }
                });

                startTableY = doc.lastAutoTable.finalY + 20;
            }

            // 6. SALES PERFORMANCE & RECONCILIATION SUMMARY (PAGE END)
            if (shouldExportPerf && data.salesPerformance.length) {
                if (startTableY > 420) { doc.addPage(); startTableY = 40; }
                doc.setFont('Helvetica', 'bold');
                doc.setFontSize(11);
                doc.setTextColor(30, 41, 59);
                doc.text('7. EVALUASI KINERJA & PEROLEHAN MASING-MASING SALES', 40, startTableY);
                startTableY += 8;

                const perfRows = data.salesPerformance.map((sp, idx) => [
                    `#${idx + 1}`,
                    sp.name,
                    sp.jobTitle,
                    `${sp.unitsCount} Unit`,
                    `${sp.accCount} Pcs`,
                    fmtRp(sp.totalOmset),
                    sp.bonusCost > 0 ? fmtRp(sp.bonusCost) : '-',
                    fmtRp(sp.netContribution)
                ]);

                doc.autoTable({
                    startY: startTableY,
                    head: [['Rank', 'Nama Sales', 'Jabatan', 'Unit HP Terjual', 'Aksesoris Terjual', 'Total Omset Dihasilkan', 'Beban Modal Bonus', 'Kontribusi Laba Bersih']],
                    body: perfRows,
                    theme: 'grid',
                    styles: { fontSize: 8.5, cellPadding: 5 },
                    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 35, fontStyle: 'bold' },
                        1: { fontStyle: 'bold' },
                        3: { halign: 'center', fontStyle: 'bold', textColor: [37, 99, 235] },
                        4: { halign: 'center' },
                        5: { halign: 'right', fontStyle: 'bold' },
                        6: { halign: 'right', textColor: [217, 119, 6] },
                        7: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] }
                    },
                    margin: { left: 40, right: 40 }
                });

                startTableY = doc.lastAutoTable.finalY + 15;
            }

            // Payment Reconciliation Block
            if (startTableY > 460) { doc.addPage(); startTableY = 40; }
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(40, startTableY, 400, 75, 4, 4, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(40, startTableY, 400, 75, 4, 4, 'S');

            doc.setFont('Helvetica', 'bold');
            doc.setFontSize(9);
            doc.setTextColor(30, 41, 59);
            doc.text('REKONSILIASI PENERIMAAN PEMBAYARAN:', 50, startTableY + 16);

            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.text(`• Total Kas Tunai (Cash di Laci) : ${fmtRp(data.paymentSummary.cash)}`, 50, startTableY + 30);
            doc.text(`• Total Transfer Bank (Rekening) : ${fmtRp(data.paymentSummary.transfer)}`, 50, startTableY + 44);
            
            const creditDetails = [];
            if (data.paymentSummary.creditKredivo > 0) creditDetails.push(`Kredivo: ${fmtRp(data.paymentSummary.creditKredivo)}`);
            if (data.paymentSummary.creditSpaylater > 0) creditDetails.push(`SPayLater: ${fmtRp(data.paymentSummary.creditSpaylater)}`);
            if (data.paymentSummary.creditAkulaku > 0) creditDetails.push(`Akulaku: ${fmtRp(data.paymentSummary.creditAkulaku)}`);
            if (data.paymentSummary.creditOther > 0) creditDetails.push(`Lainnya: ${fmtRp(data.paymentSummary.creditOther)}`);

            doc.text(`• Total Kredit (${creditDetails.join(', ') || 'Belum ada'}) : ${fmtRp(data.paymentSummary.creditTotal)}`, 50, startTableY + 58);

            // Signature Block
            const sigX = 620;
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(71, 85, 105);
            doc.text('Mengetahui & Menyetujui,', sigX, startTableY + 16);
            doc.text('Owner / Store Manager', sigX, startTableY + 28);
            doc.line(sigX, startTableY + 68, sigX + 130, startTableY + 68);
            doc.setFont('Helvetica', 'bold');
            doc.text('( ........................................ )', sigX, startTableY + 74);

            // Page numbers in footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFont('Helvetica', 'normal');
                doc.setFontSize(8);
                doc.setTextColor(148, 163, 184);
                doc.text(`Halaman ${i} dari ${pageCount} — IGOOD Financial Reporting System`, 40, 565);
            }

            const cleanFileName = `Rekap_Penjualan_IGOOD_${activeRecapMonth}_${isFullReport ? 'Lengkap' : (activeRecapCat || 'Semua')}.pdf`;
            doc.save(cleanFileName);
            toast('Laporan PDF berhasil diunduh');
        } catch (e) {
            console.error('Error generating sales recap PDF:', e);
            toast('Gagal mengekspor PDF: ' + e.message, 'err');
        }
    }

