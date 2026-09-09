/**
 * IGOOD REPORT - Sales & Cart Management Module
 */
    function saveSalesDraft() {
        if (!$('salesFormMount')) return;
        localStorage.setItem(salesDraftKey(), JSON.stringify(collectSalesDraft()));
    }

    function restoreSalesDraft() {
        let draft = null;
        try {
            draft = JSON.parse(localStorage.getItem(salesDraftKey()) || 'null');
        } catch {
            draft = null;
        }
        if (!draft) return;
        if ($('saleDate') && draft.saleDate) $('saleDate').value = draft.saleDate;
        if ($('saleShift') && draft.saleShift) $('saleShift').value = draft.saleShift;
        if (Array.isArray(draft.cartItems)) {
            if (isServiceMode()) {
                activeServiceCart = draft.cartItems;
            } else {
                activeSaleCart = draft.cartItems;
            }
        }
        if (draft.cartType) activeSaleCartType = draft.cartType;
        if (draft.cartEditId) activeSaleCartEditId = draft.cartEditId;
        const fields = draft.fields || {};
        const maxBonusIndex = Object.keys(fields).reduce((max, id) => {
            const match = id.match(/^saleBonusAccessoryCode(\d+)$/);
            return match ? Math.max(max, Number(match[1]) || 0) : max;
        }, Math.max(0, (Number(draft.bonusRows) || 1) - 1));
        const container = $('bonusAccessoriesContainer');
        while (container && container.querySelectorAll('.bonus-accessory-row').length <= maxBonusIndex) {
            const index = container.querySelectorAll('.bonus-accessory-row').length;
            container.insertAdjacentHTML('beforeend', renderBonusAccessoryRow(index));
        }
        Object.entries(fields).forEach(([id, value]) => {
            const field = $(id);
            if (field) field.value = value;
        });
        const activeEmp = loadActiveEmployee();
        if (activeEmp) {
            const saleSalesName = $('saleSalesName');
            if (saleSalesName && !saleSalesName.value) saleSalesName.value = activeEmp.name;
            const saleDrawerSalesName = $('saleDrawerSalesName');
            if (saleDrawerSalesName && !saleDrawerSalesName.value) saleDrawerSalesName.value = activeEmp.name;
            const preorderSalesName = $('preorderSalesName');
            if (preorderSalesName && !preorderSalesName.value) preorderSalesName.value = activeEmp.name;
        }
        if ($('saleUnitCode')) updateSelectedUnitDetail();
        if ($('saleAccessoryCode')) updateSelectedAccessoryDetail();
        if ($('saleServiceOrderCode')) updateSelectedServiceOrderDetail();
        if ($('saleOtherCode') && $('saleOtherCode').value) updateSelectedOtherDetail();
        toggleSplitPanel();
        renderCartRows();
        updateCartSummary();
    }

    function clearSalesDraft(type = activeSaleType, mode = activeServiceSaleMode) {
        const checkType = (type && type.startsWith('service')) ? 'service' : type;
        localStorage.removeItem(salesDraftKey(checkType, mode));
        if (checkType === 'service') {
            activeServiceCart = [];
            activeSaleCartEditId = '';
        } else if (checkType !== 'preorder') {
            activeSaleCart = [];
            activeSaleCartType = defaultCartTypeForSaleType(checkType);
            activeSaleCartEditId = '';
        }
        updateHeaderCartBadge();
    }

    function switchCartEditorType(nextType) {
        const type = CART_ITEM_TYPES.includes(nextType) ? nextType : defaultCartTypeForSaleType(activeSaleType);
        const draft = collectSalesDraft();
        if (type !== (draft.cartType || activeSaleCartType)) {
            Object.keys(draft.fields || {}).forEach(id => {
                if (/^sale(UnitCode|AccessoryCode|OtherCode|ItemName|SellPrice|Quantity|PreorderCode|BonusAccessoryCode|BonusQuantity)/.test(id)) {
                    delete draft.fields[id];
                }
            });
        }
        draft.cartType = type;
        draft.fields.saleCartType = type;
        localStorage.setItem(salesDraftKey(), JSON.stringify(draft));
        activeSaleCartType = type;
    }

    function collectBonusAccessories() {
        const accs = load(DB_KEYS.accessories);
        return Array.from(document.querySelectorAll('.bonus-accessory-row')).map(row => {
            const code = row.querySelector('.sale-bonus-code')?.value || '';
            const quantity = Number(row.querySelector('.sale-bonus-qty')?.value) || 0;
            if (!code || quantity <= 0) return null;
            const acc = accs.find(a => a.code === code);
            return {
                code,
                name: acc?.name || '',
                quantity,
                cost: Number(acc?.cost) || 0,
                category: acc?.category || '',
                brand: acc?.brand || '',
            };
        }).filter(Boolean);
    }

    function bonusAccessoriesText(tx) {
        return (tx.bonusAccessories || [])
            .map(item => `${item.name || item.code || '-'} x${Number(item.quantity) || 1}`)
            .join(', ');
    }

    function bonusQuantityMap(bonusAccessories) {
        return (bonusAccessories || []).reduce((map, item) => {
            if (!item.code) return map;
            map[item.code] = (map[item.code] || 0) + (Number(item.quantity) || 0);
            return map;
        }, {});
    }

    function adjustBonusAccessoryStock(bonusAccessories, direction) {
        const qtyByCode = bonusQuantityMap(bonusAccessories);
        const codes = Object.keys(qtyByCode);
        if (!codes.length) return;
        const accs = load(DB_KEYS.accessories);
        codes.forEach(code => {
            const acc = accs.find(a => a.code === code);
            if (!acc) return;
            acc.qty = Math.max(0, (Number(acc.qty) || 0) + (direction * qtyByCode[code]));
            acc.updatedAt = new Date().toISOString();
            queueRecordSupabaseSync('accessories', acc);
        });
        save(DB_KEYS.accessories, accs);
    }

    function cartTypeOptions(selectedType) {
        return [
            ['unit_iphone', 'Unit iPhone'],
            ['unit_android', 'Unit Android'],
            ['accessory', 'Aksesoris'],
            ['other', 'Lain-lain'],
        ].map(([value, label]) => `<option value="${value}" ${value === selectedType ? 'selected' : ''}>${label}</option>`).join('');
    }

    function cartTotals(items = null) {
        const cartItems = items || (isServiceMode() ? activeServiceCart : activeSaleCart);
        return (cartItems || []).reduce((totals, item) => {
            totals.qty += Number(item.quantity) || 0;
            totals.subtotal += Number(item.sell) || 0;
            return totals;
        }, { qty: 0, subtotal: 0 });
    }

    function cartPreorderDpTotal() {
        let dpTotal = 0;
        const cartItems = isServiceMode() ? activeServiceCart : activeSaleCart;
        cartItems.forEach(item => {
            if (item.preorderCode) {
                const preorder = loadPreorders().find(p => p.code === item.preorderCode);
                if (preorder) {
                    dpTotal += Number(preorder.dpAmount) || 0;
                }
            }
        });
        return dpTotal;
    }

    function cartPaymentTarget() {
        const subtotal = cartTotals().subtotal;
        const dpTotal = cartPreorderDpTotal();
        return Math.max(0, subtotal - dpTotal);
    }

    function cartPaymentPreviewAmount() {
        return cleanRp($('salePaidAmount')?.value || '');
    }

    function cartChangeAmount() {
        const target = cartPaymentTarget();
        const paid = cartPaymentPreviewAmount() || target;
        const method = $('salePaymentMethod')?.value || 'cash';
        if (method === 'split') return 0;
        if (method === 'transfer' || method === 'kredit') return 0;
        return Math.max(0, paid - target);
    }

    function updateCartSummary() {
        const totals = cartTotals();
        const subtotalEl = $('saleCartSubtotal');
        const subtotalLabelEl = $('saleCartSubtotalLabel');
        const qtyEl = $('saleCartTotalQty');
        const countEl = $('saleCartCount');
        const changeEl = $('saleChangeAmount');
        const paidEl = $('salePaidAmount');
        
        const cartItems = isServiceMode() ? activeServiceCart : activeSaleCart;
        const hasTradeIn = cartItems.some(item => item.category === 'tukar_tambah');
        let subtotalLabel = 'Subtotal';
        let subtotalColor = 'var(--primary-light)';
        let displaySubtotal = totals.subtotal;

        if (hasTradeIn) {
            if (totals.subtotal < 0) {
                subtotalLabel = 'Selisih Kembalian (Kasir Berikan)';
                subtotalColor = 'var(--success)';
                displaySubtotal = Math.abs(totals.subtotal);
            } else {
                subtotalLabel = 'Selisih Bayar Tambah (Pelanggan Bayar)';
            }
        }

        if (subtotalLabelEl) subtotalLabelEl.textContent = subtotalLabel;
        if (subtotalEl) {
            subtotalEl.textContent = fmtRp(displaySubtotal);
            subtotalEl.style.color = subtotalColor;
        }
        if (qtyEl) qtyEl.textContent = String(totals.qty);
        if (countEl) countEl.textContent = String((isServiceMode() ? activeServiceCart : activeSaleCart).length);
        if (paidEl && !paidEl.value) paidEl.value = '';
        if (changeEl) changeEl.value = fmtRp(cartChangeAmount());
        
        const targetEl = $('saleCartPaymentTarget');
        if (targetEl) targetEl.textContent = fmtRp(cartPaymentTarget());
    }

    function updateSelectedOtherDetail() {
        const otherSelect = $('saleOtherCode');
        if (!otherSelect || !$('saleItemName')) return;
        const item = load(DB_KEYS.otherCatalog).find(o => o.code === otherSelect.value);
        if (!item) {
            return;
        }
        $('saleItemName').value = item.name || '';
        if ($('saleSellPrice')) setRpValue('saleSellPrice', item.sell);
    }

    function renderCartItemEditor(type) {
        const selectedType = CART_ITEM_TYPES.includes(type) ? type : defaultCartTypeForSaleType(activeSaleType);
        activeSaleCartType = selectedType;
        const unitTypes = selectedType === 'unit_iphone' || selectedType === 'unit_android';
        const unitOptions = availableUnitsByCategory(selectedType === 'unit_android' ? 'android' : 'iphone');
        const unitEmpty = unitOptions.length ? '<option value="">Pilih unit ready</option>' : '<option value="">Tidak ada stok ready</option>';
        const unitHtml = unitOptions.map(d => `<option value="${esc(d.code)}">${esc(formatDeviceDisplayName(d))}</option>`).join('');
        const accs = load(DB_KEYS.accessories).filter(a => Number(a.qty) > 0);
        const accHtml = accs.map(a => `<option value="${esc(a.code)}">${esc(formatAccessoryOptionText(a))}</option>`).join('');
        const others = load(DB_KEYS.otherCatalog);
        const otherDatalistHtml = others.map(o => `<option value="${esc(o.name)}">${esc(o.name)} — ${fmtRp(o.sell)}</option>`).join('');
        const readyPreorders = loadPreorders().filter(item => item.status === 'Ready');
        const preorderOptions = readyPreorders.map(item => `<option value="${esc(item.code)}">${esc(item.code)} | ${esc(item.buyerName || '-')} | ${esc(item.requestedItem || '-')}</option>`).join('');
        const quantityValue = unitTypes ? 1 : Number($('saleQuantity')?.value) || 1;
        const quantityReadonly = unitTypes ? 'readonly' : '';
        const quantityLabel = unitTypes ? 'Qty' : 'Qty';
        const typeLabel = cartItemTypeLabel(selectedType);
        if (unitTypes) {
            return `
                <div class="mini-panel">
                    <div class="flex-between mb-sm">
                        <h3 style="font-size:13px;"><i class="ri-shopping-bag-3-line"></i> Tambah Item</h3>
                        <span class="text-xs text-dim">${esc(typeLabel)}</span>
                    </div>
                    <div class="form-grid cols-2">
                        <div class="field"><label>Kode Unit</label><select id="saleUnitCode">${unitEmpty}${unitHtml}</select></div>
                        <div class="field"><label>${quantityLabel}</label><input type="number" id="saleQuantity" min="1" value="${quantityValue}" ${quantityReadonly}></div>
                    </div>
                    <div class="field" style="margin-bottom: 10px;">
                        <label>Detail Unit</label>
                        <textarea id="saleItemName" readonly rows="2" style="font-size: 14px; font-weight: 700; line-height: 1.4; resize: none; background: #f8fafc; color: #1e293b; padding: 10px 12px; height: 60px;"></textarea>
                    </div>
                    <div class="field" style="margin-bottom: 10px;">
                        <label>Harga Jual</label>
                        <input type="text" inputmode="numeric" id="saleSellPrice" placeholder="Rp" required>
                    </div>
                    <div class="mini-panel">
                        <div class="flex-between mb-sm">
                            <h3 style="font-size:13px;"><i class="ri-gift-line"></i> Bonus Aksesoris</h3>
                            <button type="button" id="btnAddBonusAccessory" class="btn btn-sm btn-ghost" style="width:auto;"><i class="ri-add-line"></i> Tambah</button>
                        </div>
                        <div id="bonusAccessoriesContainer">${renderBonusAccessoryRow(0)}</div>
                    </div>
                    <button type="button" id="btnAddCartItem" class="btn btn-primary"><i class="ri-add-line"></i> Masukan ke Keranjang</button>
                </div>`;
        }
        if (selectedType === 'accessory') {
            return `
                <div class="mini-panel">
                    <div class="flex-between mb-sm">
                        <h3 style="font-size:13px;"><i class="ri-shopping-bag-3-line"></i> Tambah Item</h3>
                        <span class="text-xs text-dim">${esc(typeLabel)}</span>
                    </div>
                    <div class="form-grid cols-2">
                        <div class="field"><label>Kode Aksesoris</label><select id="saleAccessoryCode"><option value="">Pilih aksesoris</option>${accHtml}</select></div>
                        <div class="field"><label>Nama Aksesoris</label><input type="text" id="saleItemName" readonly></div>
                    </div>
                    <div class="form-grid cols-2">
                        <div class="field"><label>Qty</label><input type="number" id="saleQuantity" min="1" value="${quantityValue}"></div>
                        <div class="field"><label>Harga Satuan</label><input type="text" inputmode="numeric" id="saleSellPrice" placeholder="Rp" required></div>
                    </div>
                    <button type="button" id="btnAddCartItem" class="btn btn-primary"><i class="ri-add-line"></i> Masukan ke Keranjang</button>
                </div>`;
        }
        if (selectedType === 'preorder_dp') {
            const modelOptions = PHONE_MODELS.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
            const preCode = activeSaleCartEditId ? (activeSaleCart.find(item => item.id === activeSaleCartEditId)?.code || nextPreorderCode()) : nextPreorderCode();
            return `
                <div class="mini-panel">
                    <div class="flex-between mb-sm">
                        <h3 style="font-size:13px;"><i class="ri-shopping-bag-3-line"></i> Tambah Pre-order</h3>
                        <span class="text-xs text-dim">${esc(typeLabel)}</span>
                    </div>
                    <div class="form-grid cols-2">
                        <div class="field">
                            <label>Kode Preorder</label>
                            <input type="text" id="preorderCode" value="${esc(preCode)}" readonly>
                        </div>
                        <div class="field">
                            <label>Kategori Unit</label>
                            <select id="preorderCategory">
                                <option value="iphone">Unit iPhone</option>
                                <option value="android">Unit Android</option>
                                <option value="ipad">Unit iPad</option>
                                <option value="other">Lainnya</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-grid cols-2">
                        <div class="field">
                            <label>Brand / Merek</label>
                            <input type="text" id="preorderBrand" list="preorderBrandDatalist" placeholder="Contoh: Apple, Samsung" required>
                            <datalist id="preorderBrandDatalist">
                                <option value="Apple">
                                <option value="Samsung">
                                <option value="Oppo">
                                <option value="Vivo">
                                <option value="Xiaomi">
                                <option value="Realme">
                                <option value="Infinix">
                            </datalist>
                        </div>
                        <div class="field">
                            <label>Kondisi</label>
                            <select id="preorderCondition" required>
                                <option value="New">New</option>
                                <option value="Bekas">Bekas</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-grid cols-2">
                        <div class="field">
                            <label>Tipe / Model</label>
                            <input type="text" id="preorderModel" list="preorderModelDatalist" placeholder="Contoh: iPhone 15 Pro" required>
                            <datalist id="preorderModelDatalist">
                                ${modelOptions}
                            </datalist>
                        </div>
                        <div class="field">
                            <label>Storage</label>
                            <select id="preorderStorage" required>
                                <option value="128GB">128GB</option>
                                <option value="256GB">256GB</option>
                                <option value="64GB">64GB</option>
                                <option value="512GB">512GB</option>
                                <option value="1TB">1TB</option>
                                <option value="32GB">32GB</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-grid cols-2">
                        <div class="field">
                            <label>Warna</label>
                            <input type="text" id="preorderColor" placeholder="Contoh: Midnight, Gold" required>
                        </div>
                        <div class="field">
                            <label>Garansi</label>
                            <select id="preorderWarranty" required>
                                <option value="Resmi (R)">Resmi (R)</option>
                                <option value="Inter (I)">Inter (I)</option>
                                <option value="Beacukai (BC)">Beacukai (BC)</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-grid cols-2">
                        <div class="field">
                            <label>Nominal DP</label>
                            <input type="text" inputmode="numeric" id="saleSellPrice" placeholder="Rp" required>
                        </div>
                        <div class="field">
                            <label>Jumlah</label>
                            <input type="number" id="saleQuantity" min="1" value="1">
                        </div>
                    </div>
                    <div class="field" style="margin-bottom: 12px;">
                        <label>Catatan</label>
                        <textarea id="preorderNote" rows="2" placeholder="Catatan tambahan / spesifikasi detail (opsional)"></textarea>
                    </div>
                    <button type="button" id="btnAddCartItem" class="btn btn-primary"><i class="ri-add-line"></i> Masukan ke Keranjang</button>
                </div>`;
        }
        if (selectedType === 'tukar_tambah') {
            const allUnits = load(DB_KEYS.devices).filter(d => d.status === 'Available');
            const unitEmpty = allUnits.length ? '<option value="">Pilih unit ready</option>' : '<option value="">Tidak ada stok ready</option>';
            const unitHtml = allUnits.map(d => `<option value="${esc(d.code)}">${esc(formatDeviceDisplayName(d))}</option>`).join('');
            
            return `
                <div class="mini-panel">
                    <div class="flex-between mb-sm">
                        <h3 style="font-size:13px;"><i class="ri-refresh-line"></i> Tambah Item Tukar Tambah</h3>
                        <span class="text-xs text-dim">${esc(typeLabel)} (Slide <span id="tradeInSlideIndex">1</span>/2)</span>
                    </div>
                    
                    <!-- Slide 1: New Unit (Dijual) -->
                    <div id="tradeInSlide1" class="trade-in-slide">
                        <div style="border-bottom: 1px dashed var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
                            <h4 style="font-size:12px; font-weight:600; color:var(--primary-light); margin-bottom:8px;"><i class="ri-smartphone-line"></i> UNIT BARU (DIJUAL)</h4>
                            <div class="form-grid cols-2">
                                <div class="field"><label>Kode Unit Baru</label><select id="saleUnitCode">${unitEmpty}${unitHtml}</select></div>
                                <div class="field"><label>Qty</label><input type="number" id="saleQuantity" value="1" readonly></div>
                            </div>
                            <div class="field" style="margin-bottom: 10px;">
                                <label>Detail Unit Baru</label>
                                <textarea id="saleItemName" readonly rows="2" style="font-size: 14px; font-weight: 700; line-height: 1.4; resize: none; background: #f8fafc; color: #1e293b; padding: 10px 12px; height: 60px;"></textarea>
                            </div>
                            <div class="field" style="margin-bottom: 10px;">
                                <label>Harga Jual Unit Baru</label>
                                <input type="text" inputmode="numeric" id="saleSellPrice" placeholder="Rp" required>
                            </div>
                        </div>
                        <div class="mini-panel" style="margin-bottom: 12px;">
                            <div class="flex-between mb-sm">
                                <h3 style="font-size:13px;"><i class="ri-gift-line"></i> Bonus Aksesoris</h3>
                                <button type="button" id="btnAddBonusAccessory" class="btn btn-sm btn-ghost" style="width:auto;"><i class="ri-add-line"></i> Tambah</button>
                            </div>
                            <div id="bonusAccessoriesContainer">${renderBonusAccessoryRow(0)}</div>
                        </div>
                        <button type="button" id="btnNextTradeInSlide" class="btn btn-primary w-full" style="display: flex; align-items: center; justify-content: center; gap: 8px;"><i class="ri-arrow-right-line"></i> Berikutnya: HP Lama (Diterima)</button>
                    </div>

                    <!-- Slide 2: Old Unit (Diterima) -->
                    <div id="tradeInSlide2" class="trade-in-slide" style="display: none;">
                        <div style="padding-bottom: 12px;">
                            <h4 style="font-size:12px; font-weight:600; color:var(--warning); margin-bottom:8px;"><i class="ri-arrow-left-right-line"></i> HP LAMA (DITERIMA)</h4>
                            <div class="form-grid cols-3">
                                <div class="field">
                                    <label>Kategori HP Lama</label>
                                    <select id="tradeInUnitCategory" required>
                                        <option value="iphone">iPhone / Apple</option>
                                        <option value="android">Android / Lainnya</option>
                                    </select>
                                </div>
                                <div class="field">
                                    <label>Merek HP Lama</label>
                                    <input type="text" id="tradeInBrand" placeholder="Apple / Samsung" required>
                                </div>
                                <div class="field" id="tradeInModelField">
                                    <label>Tipe HP Lama</label>
                                    <select id="tradeInModel" required>
                                        ${PHONE_MODELS.filter(m => m.startsWith('iPhone')).map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div class="form-grid cols-3">
                                <div class="field">
                                    <label>Storage HP Lama</label>
                                    <select id="tradeInStorage" required>
                                        <option value="128GB">128GB</option>
                                        <option value="256GB">256GB</option>
                                        <option value="64GB">64GB</option>
                                        <option value="512GB">512GB</option>
                                        <option value="1TB">1TB</option>
                                        <option value="32GB">32GB</option>
                                    </select>
                                </div>
                                <div class="field">
                                    <label>Warna HP Lama</label>
                                    <input type="text" id="tradeInColor" placeholder="Black / Gold" required>
                                </div>
                                <div class="field">
                                    <label>Kondisi HP Lama</label>
                                    <select id="tradeInCondition" required>
                                        <option value="Bekas">Bekas</option>
                                        <option value="New">New</option>
                                    </select>
                                </div>
                            </div>
                            <div class="form-grid cols-3">
                                <div class="field">
                                    <label>Garansi HP Lama</label>
                                    <select id="tradeInWarranty" required>
                                        <option value="INT">Inter (I)</option>
                                        <option value="IBX">Resmi (R)</option>
                                        <option value="BEA">Beacukai (BC)</option>
                                    </select>
                                </div>
                                <div class="field">
                                    <label>IMEI HP Lama</label>
                                    <input type="text" id="tradeInImei" placeholder="Ketik IMEI unit lama">
                                </div>
                                <div class="field">
                                    <label>Harga HP Lama (TT)</label>
                                    <input type="text" inputmode="numeric" id="tradeInCost" placeholder="Rp" required>
                                </div>
                            </div>
                        </div>
                        <div class="flex gap-sm" style="display: flex; gap: 10px; margin-top: 8px;">
                            <button type="button" id="btnPrevTradeInSlide" class="btn btn-ghost" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;"><i class="ri-arrow-left-line"></i> Kembali</button>
                            <button type="button" id="btnAddCartItem" class="btn btn-primary" style="flex: 2; display: flex; align-items: center; justify-content: center; gap: 6px;"><i class="ri-add-line"></i> Masukan ke Keranjang</button>
                        </div>
                    </div>
                </div>`;
        }
        if (selectedType === 'order_jasa_icloud') {
            return `
                <div class="mini-panel">
                    <div class="flex-between mb-sm">
                        <h3 style="font-size:13px;"><i class="ri-cloud-line"></i> Jasa Pembuatan iCloud</h3>
                        <span class="text-xs text-dim">${esc(typeLabel)}</span>
                    </div>
                    <div class="form-grid cols-2">
                        <div class="field">
                            <label>Nama Lengkap *</label>
                            <input type="text" id="icloudFullName" placeholder="Nama lengkap user" required>
                        </div>
                        <div class="field">
                            <label>Tanggal Lahir *</label>
                            <input type="date" id="icloudDob" required>
                        </div>
                    </div>
                    <div class="form-grid cols-2">
                        <div class="field">
                            <label>Email Aktif *</label>
                            <input type="email" id="icloudEmail" placeholder="Contoh: user@gmail.com" required>
                        </div>
                        <div class="field">
                            <label>Nomor Telfon Aktif *</label>
                            <input type="tel" id="icloudPhone" placeholder="08xxxxxxxxxx" required>
                        </div>
                    </div>
                    <div class="form-grid cols-2">
                        <div class="field">
                            <label>Kata Sandi *</label>
                            <input type="text" id="icloudPassword" placeholder="Kata sandi iCloud baru" required>
                        </div>
                        <div class="field">
                            <label>Nominal (Harga) *</label>
                            <input type="text" inputmode="numeric" id="saleSellPrice" placeholder="Rp" required>
                        </div>
                    </div>
                    <button type="button" id="btnAddCartItem" class="btn btn-primary"><i class="ri-add-line"></i> Masukan ke Keranjang</button>
                </div>`;
        }
        if (selectedType === 'order_jasa' || selectedType === 'order_jasa_beacukai') {
            const modelOptions = PHONE_MODELS.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
            const isBeacukai = selectedType === 'order_jasa_beacukai';
            const formTitle = isBeacukai
                ? '<i class="ri-bank-card-line"></i> IMEI Bea Cukai'
                : '<i class="ri-tools-line"></i> Penjualan IMEI (Order-Jasa)';
            return `
                <div class="mini-panel">
                    <div class="flex-between mb-sm">
                        <h3 style="font-size:13px;">${formTitle}</h3>
                        <span class="text-xs text-dim">${esc(typeLabel)}</span>
                    </div>
                    <div class="form-grid cols-2">
                        <div class="field">
                            <label>Nama User</label>
                            <input type="text" id="jasaBuyerName" placeholder="Nama lengkap user" required>
                        </div>
                        <div class="field">
                            <label>No. WA User</label>
                            <input type="tel" id="jasaBuyerWa" placeholder="08xxxxxxxxxx" required>
                        </div>
                    </div>
                    <div class="form-grid cols-2">
                        <div class="field">
                            <label>Kategori Unit</label>
                            <select id="jasaCategory" required>
                                <option value="iphone">iPhone</option>
                                <option value="android">Android</option>
                            </select>
                        </div>
                        <div class="field">
                            <label>Nama Unit HP User</label>
                            <input type="text" id="jasaUnitName" list="jasaIphoneModelsList" placeholder="Contoh: iPhone 14 Pro" required>
                            <datalist id="jasaIphoneModelsList">
                                ${modelOptions}
                            </datalist>
                        </div>
                    </div>
                    <div class="form-grid cols-2">
                        <div class="field">
                            <label>IMEI HP User</label>
                            <input type="text" id="jasaImei" placeholder="Ketik IMEI unit user" required>
                        </div>
                        <div class="field">
                            <label>Garansi</label>
                            <select id="jasaWarranty" required>
                                <option value="Resmi">Resmi</option>
                                <option value="Inter">Inter</option>
                                <option value="Beacukai">Beacukai</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-grid cols-2">
                        <div class="field">
                            <label>Nominal (Harga)</label>
                            <input type="text" inputmode="numeric" id="saleSellPrice" placeholder="Rp" required>
                        </div>
                        <div class="field">
                            <label>Keterangan</label>
                            <input type="text" id="jasaNote" placeholder="Keterangan tambahan (opsional)">
                        </div>
                    </div>
                    <button type="button" id="btnAddCartItem" class="btn btn-primary"><i class="ri-add-line"></i> Masukan ke Keranjang</button>
                </div>`;
        }
        return `
            <div class="mini-panel">
                <div class="flex-between mb-sm">
                    <h3 style="font-size:13px;"><i class="ri-shopping-bag-3-line"></i> Tambah Item</h3>
                    <span class="text-xs text-dim">${esc(typeLabel)}</span>
                </div>
                <div class="field mb-sm">
                    <label>Keterangan / Nama Item (Ketik Langsung Bebas)</label>
                    <input type="text" id="saleItemName" placeholder="Contoh: Kabel Data Custom, Jasa Pasang Hydrogel, dll." list="saleOtherCatalogDatalist" required autocomplete="off" style="font-size: 14px; font-weight: 600;">
                    <datalist id="saleOtherCatalogDatalist">
                        ${otherDatalistHtml}
                    </datalist>
                </div>
                <div class="form-grid cols-2">
                    <div class="field"><label>Qty</label><input type="number" id="saleQuantity" min="1" value="${quantityValue}"></div>
                    <div class="field"><label>Harga Satuan</label><input type="text" inputmode="numeric" id="saleSellPrice" placeholder="Rp" required></div>
                </div>
                <button type="button" id="btnAddCartItem" class="btn btn-primary"><i class="ri-add-line"></i> Masukan ke Keranjang</button>
            </div>`;
    }

    function renderCartRows() {
        const tbody = $('saleCartBody');
        if (!tbody) return;
        if (!activeSaleCart.length) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-dim" style="text-align:center;">Belum ada item di keranjang</td></tr>';
            updateCartSummary();
            return;
        }
        tbody.innerHTML = activeSaleCart.map((item, index) => `
            <tr data-cart-item-id="${esc(item.id)}">
                <td class="mono text-sm">${index + 1}</td>
                <td class="text-sm">${esc(cartItemTypeLabel(item.category))}</td>
                <td class="text-sm">${esc(item.itemName || '-')}</td>
                <td class="mono text-sm">${esc(item.quantity || 1)}</td>
                <td class="mono text-sm">${fmtRp(item.sell || 0)}</td>
                <td>
                    <div class="row-actions">
                        <button type="button" class="btn-del" data-cart-remove="${esc(item.id)}"><i class="ri-delete-bin-6-line"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
        updateCartSummary();
        document.querySelectorAll('[data-cart-remove]').forEach(button => {
            button.addEventListener('click', () => removeCartItem(button.dataset.cartRemove || ''));
        });
    }

    function renderCartPaymentFields() {
        const subtotal = cartTotals().subtotal;
        const target = cartPaymentTarget();
        const paidValue = $('salePaidAmount')?.value || '';
        const method = $('salePaymentMethod')?.value || 'cash';
        const creditAgent = $('saleCreditAgent')?.value || '';
        const showReceived = method === 'cash' || method === 'split';
        const option = (value, label) => `<option value="${value}" ${method === value ? 'selected' : ''}>${label}</option>`;
        return `
            <div class="mini-panel">
                <div class="flex-between mb-sm">
                    <h3 style="font-size:13px;"><i class="ri-cash-line"></i> Pembayaran</h3>
                    <span class="text-xs text-dim">Tagihan ${fmtRp(target)}</span>
                </div>
                <div class="form-grid ${showReceived ? 'cols-3' : (method === 'kredit' ? 'cols-2' : 'cols-1')}">
                    <div class="field"><label>Metode Bayar</label><select id="salePaymentMethod">${option('cash', 'Cash')}${option('transfer', 'Transfer')}${option('kredit', 'Kredit')}${option('split', 'Split')}</select></div>
                    ${showReceived ? `<div class="field"><label>Uang Diterima</label><input type="text" inputmode="numeric" id="salePaidAmount" placeholder="Rp" value="${esc(paidValue)}"></div>
                    <div class="field"><label>Kembali</label><input type="text" id="saleChangeAmount" value="${fmtRp(cartChangeAmount())}" readonly></div>` : ''}
                    ${method === 'kredit' ? `<div class="field"><label>Leasing / Agen Kredit</label><input type="text" id="saleCreditAgent" list="creditAgentDatalist" placeholder="Kredivo / SPayLater / Akulaku..." value="${esc(creditAgent)}"></div>` : ''}
                </div>
                ${method === 'split' ? `<div class="split-row show" id="saleSplitPanel">
                    <div class="field"><label>Cash Rp</label><input type="text" inputmode="numeric" id="saleSplitCash" value="0"></div>
                    <div class="field"><label>Transfer Rp</label><input type="text" inputmode="numeric" id="saleSplitTransfer" value="0"></div>
                    <div class="field"><label>Kredit Rp</label><input type="text" inputmode="numeric" id="saleSplitCredit" value="0"></div>
                    <div class="field" id="saleSplitCreditAgentWrapper"><label>Leasing / Agen Kredit</label><input type="text" id="saleCreditAgent" list="creditAgentDatalist" placeholder="Kredivo / SPayLater / Akulaku..." value="${esc(creditAgent)}"></div>
                </div>` : ''}
                <datalist id="creditAgentDatalist">
                    <option value="Kredivo">
                    <option value="SPayLater">
                    <option value="Akulaku">
                    <option value="Home Credit">
                    <option value="Indodana">
                </datalist>
            </div>`;
    }

    function collectCartHeader() {
        let draft = null;
        try {
            draft = JSON.parse(localStorage.getItem(salesDraftKey()) || 'null');
        } catch {
            draft = null;
        }
        const fields = draft?.fields || {};
        const cart = isServiceMode() ? activeServiceCart : activeSaleCart;

        return {
            date: $('saleDate')?.value || today(),
            shift: $('saleShift')?.value || 'shift pagi & malam',
            buyerName: ($('saleDrawerBuyerName')?.value || $('saleBuyerName')?.value || fields.saleDrawerBuyerName || fields.saleBuyerName || cart.find(item => item.buyerName)?.buyerName || '').trim(),
            buyerWa: normalizePhoneWa($('saleDrawerBuyerWa')?.value || $('saleBuyerWa')?.value || fields.saleDrawerBuyerWa || fields.saleBuyerWa || cart.find(item => item.buyerWa)?.buyerWa || ''),
            salesName: ($('saleDrawerSalesName')?.value || $('saleSalesName')?.value || fields.saleDrawerSalesName || fields.saleSalesName || '').trim(),
            paymentMethod: $('saleDrawerPaymentMethod')?.value || $('salePaymentMethod')?.value || fields.saleDrawerPaymentMethod || fields.salePaymentMethod || 'cash',
            creditAgent: ($('saleDrawerCreditAgent')?.value || $('saleDrawerSplitCreditAgent')?.value || $('saleCreditAgent')?.value || fields.saleDrawerCreditAgent || fields.saleDrawerSplitCreditAgent || fields.saleCreditAgent || '').trim(),
            paidAmount: (cartPaymentTarget() <= 0) ? 0 : cleanRp($('saleDrawerPaidAmount')?.value || $('salePaidAmount')?.value || fields.saleDrawerPaidAmount || fields.salePaidAmount),
            splitCash: cleanRp($('saleDrawerSplitCash')?.value || $('saleSplitCash')?.value || fields.saleDrawerSplitCash || fields.saleSplitCash),
            splitTransfer: cleanRp($('saleDrawerSplitTransfer')?.value || $('saleSplitTransfer')?.value || fields.saleDrawerSplitTransfer || fields.saleSplitTransfer),
            splitCredit: cleanRp($('saleDrawerSplitCredit')?.value || $('saleSplitCredit')?.value || fields.saleDrawerSplitCredit || fields.saleSplitCredit),
        };
    }

    function collectCartItemFromEditor() {
        const type = $('saleCartType')?.value || activeSaleCartType || defaultCartTypeForSaleType(activeSaleType);
        const base = {
            id: activeSaleCartEditId || `CART-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            category: type,
            date: $('saleDate')?.value || today(),
            shift: $('saleShift')?.value || 'shift pagi & malam',
            buyerName: ($('saleBuyerName')?.value || '').trim(),
            buyerWa: normalizePhoneWa($('saleBuyerWa')?.value || ''),
            salesName: ($('saleSalesName')?.value || '').trim(),
            paymentMethod: $('salePaymentMethod')?.value || 'cash',
            splitCash: cleanRp($('saleSplitCash')?.value),
            splitTransfer: cleanRp($('saleSplitTransfer')?.value),
            splitCredit: cleanRp($('saleSplitCredit')?.value),
            quantity: Number($('saleQuantity')?.value) || 1,
            sell: cleanRp($('saleSellPrice')?.value),
            unitSell: cleanRp($('saleSellPrice')?.value),
            cost: 0,
            fee: 0,
            stockRefCode: '',
            preorderCode: '',
            technician: '',
            bonusAccessories: [],
            bonusCost: 0,
            condition: '',
            itemName: ($('saleItemName')?.value || '').trim(),
            createdAt: new Date().toISOString(),
        };

        if (type === 'unit_iphone' || type === 'unit_android') {
            const unit = load(DB_KEYS.devices).find(d => d.code === $('saleUnitCode')?.value);
            if (unit) {
                base.code = unit.code;
                base.itemName = $('saleItemName')?.value ? $('saleItemName').value.trim() : `${unit.brand || ''} ${unit.model || ''} ${unit.storage || ''} ${unit.color || ''}`.trim();
                base.condition = unit.condition || '';
                base.cost = Number(unit.cost) || 0;
                base.stockRefCode = unit.code;
                base.imei = unit.imei || '';
                base.warranty = unit.warranty || '';
            }
            base.quantity = 1;
            base.bonusAccessories = collectBonusAccessories();
            base.bonusCost = base.bonusAccessories.reduce((sum, item) => sum + ((Number(item.cost) || 0) * (Number(item.quantity) || 0)), 0);
            if (!base.sell) base.sell = Number(unit?.sell) || 0;
            base.unitSell = base.sell;
        } else if (type === 'tukar_tambah') {
            const unit = load(DB_KEYS.devices).find(d => d.code === $('saleUnitCode')?.value);
            if (unit) {
                base.code = unit.code;
                const newUnitSellPrice = cleanRp($('saleSellPrice')?.value);
                const tradeInCost = cleanRp($('tradeInCost')?.value);
                base.newUnitSellPrice = newUnitSellPrice;
                base.tradeInCost = tradeInCost;
                base.tradeInUnitCategory = $('tradeInUnitCategory')?.value || 'iphone';
                base.tradeInBrand = ($('tradeInBrand')?.value || '').trim();
                base.tradeInModel = ($('tradeInModel')?.value || '').trim();
                base.tradeInStorage = $('tradeInStorage')?.value || '';
                base.tradeInColor = ($('tradeInColor')?.value || '').trim();
                base.tradeInCondition = $('tradeInCondition')?.value || 'Bekas';
                base.tradeInWarranty = $('tradeInWarranty')?.value || 'INT';
                base.tradeInImei = ($('tradeInImei')?.value || '').trim();
                
                const mainName = $('saleItemName')?.value ? $('saleItemName').value.trim() : `${unit.brand || ''} ${unit.model || ''} ${unit.storage || ''} ${unit.color || ''}`.trim();
                base.itemName = `${mainName} (TT: ${base.tradeInBrand} ${base.tradeInModel} ${base.tradeInStorage})`.trim();
                base.condition = unit.condition || '';
                base.cost = Number(unit.cost) || 0;
                base.stockRefCode = unit.code;
                base.imei = unit.imei || '';
                base.warranty = unit.warranty || '';
                
                base.sell = newUnitSellPrice - tradeInCost;
                base.unitSell = base.sell;
            }
            base.quantity = 1;
            base.bonusAccessories = collectBonusAccessories();
            base.bonusCost = base.bonusAccessories.reduce((sum, item) => sum + ((Number(item.cost) || 0) * (Number(item.quantity) || 0)), 0);
        } else if (type === 'preorder_dp') {
            base.code = ($('preorderCode')?.value || nextPreorderCode()).trim();
            base.brand = ($('preorderBrand')?.value || '').trim();
            base.model = ($('preorderModel')?.value || '').trim();
            base.storage = ($('preorderStorage')?.value || '').trim();
            base.color = ($('preorderColor')?.value || '').trim();
            base.condition = ($('preorderCondition')?.value || '').trim();
            base.warranty = ($('preorderWarranty')?.value || '').trim();
            base.note = ($('preorderNote')?.value || '').trim();
            base.preorderCategory = ($('preorderCategory')?.value || '').trim();
            base.quantity = Number($('saleQuantity')?.value) || 1;
            base.sell = cleanRp($('saleSellPrice')?.value) || 0;
            base.unitSell = base.sell;
            base.cost = 0;
            base.fee = 0;
            
            const brandText = base.brand ? `${base.brand} ` : '';
            const modelText = base.model ? `${base.model} ` : '';
            const storageText = base.storage ? `${base.storage} ` : '';
            const colorText = base.color ? `${base.color} ` : '';
            const conditionText = base.condition ? `${base.condition}` : '';
            const specText = `${brandText}${modelText}${storageText}${colorText}${conditionText}`.trim();
            base.itemName = `DP Pre Order - ${specText}`;
        } else if (type === 'accessory') {
            const acc = load(DB_KEYS.accessories).find(a => a.code === $('saleAccessoryCode')?.value);
            if (acc) {
                base.code = acc.code;
                base.itemName = acc.name || '';
                base.cost = Number(acc.cost) || 0;
                base.stockRefCode = acc.code;
                if (!base.unitSell) base.unitSell = Number(acc.sell) || 0;
                base.sell = base.unitSell * base.quantity;
            }
        } else if (type === 'order_jasa' || type === 'order_jasa_beacukai') {
            base.jasaCategory = $('jasaCategory')?.value || 'iphone';
            base.jasaUnitName = ($('jasaUnitName')?.value || '').trim();
            base.jasaImei = ($('jasaImei')?.value || '').trim();
            base.jasaWarranty = $('jasaWarranty')?.value || 'Resmi';
            base.jasaNote = ($('jasaNote')?.value || '').trim();
            base.buyerName = ($('jasaBuyerName')?.value || '').trim();
            base.buyerWa = normalizePhoneWa($('jasaBuyerWa')?.value || '');
            
            const last4 = base.jasaImei.slice(-4);
            if (type === 'order_jasa_beacukai') {
                base.code = `BC-${last4}`;
                base.itemName = `IMEI Bea Cukai - ${base.jasaUnitName} (${base.jasaWarranty}) - ${base.jasaImei}`;
            } else {
                base.code = `OI-${last4}`;
                base.itemName = `Order Jasa IMEI - ${base.jasaUnitName} (${base.jasaWarranty}) - ${base.jasaImei}`;
            }
            base.imei = base.jasaImei;
            base.quantity = 1;
            base.sell = cleanRp($('saleSellPrice')?.value) || 0;
            base.unitSell = base.sell;
            base.cost = 0;
            base.fee = 0;
            base.status = activeSaleCartEditId ? (activeSaleCart.find(item => item.id === activeSaleCartEditId)?.status || 'Masuk') : 'Masuk';
            base.serviceStatus = base.status;
        } else if (type === 'order_jasa_icloud') {
            base.icloudFullName = ($('icloudFullName')?.value || '').trim();
            base.icloudDob = $('icloudDob')?.value || '';
            base.icloudEmail = ($('icloudEmail')?.value || '').trim();
            base.icloudPhone = ($('icloudPhone')?.value || '').trim();
            base.icloudPassword = ($('icloudPassword')?.value || '').trim();
            base.buyerName = base.icloudFullName;
            base.buyerWa = base.icloudPhone;
            base.date = $('saleDate')?.value || today();
            
            const emailPart = base.icloudEmail.split('@')[0] || 'icl';
            const suffix = emailPart.slice(-4) || 'user';
            base.code = `IC-${suffix}`;
            base.itemName = `Jasa Pembuatan iCloud - ${base.icloudFullName} (${base.icloudEmail})`;
            base.quantity = 1;
            base.sell = cleanRp($('saleSellPrice')?.value) || 0;
            base.unitSell = base.sell;
            base.cost = 0;
            base.fee = 0;
            base.createdAt = new Date().toISOString();
        } else {
            const enteredName = ($('saleItemName')?.value || '').trim();
            const matched = load(DB_KEYS.otherCatalog).find(o => (o.name || '').toLowerCase() === enteredName.toLowerCase()) ||
                            load(DB_KEYS.otherCatalog).find(o => o.code === $('saleOtherCode')?.value);
            if (matched) {
                base.code = matched.code;
                base.itemName = enteredName || matched.name;
                base.unitSell = cleanRp($('saleSellPrice')?.value) || Number(matched.sell) || 0;
                base.sell = base.unitSell * base.quantity;
            } else {
                base.code = 'LN-MANUAL';
                base.itemName = enteredName;
                base.unitSell = cleanRp($('saleSellPrice')?.value) || 0;
                base.sell = base.unitSell * base.quantity;
            }
        }

        let existingPreorderCode = '';
        if (activeSaleCartEditId) {
            const existingItem = activeSaleCart.find(item => item.id === activeSaleCartEditId);
            if (existingItem && existingItem.preorderCode) {
                existingPreorderCode = existingItem.preorderCode;
            }
        }
        const linkedCode = activeLinkedPreorder ? activeLinkedPreorder.code : (existingPreorderCode || $('salePreorderCode')?.value || '');
        if (linkedCode) {
            const preorder = loadPreorders().find(item => item.code === linkedCode);
            if (preorder) {
                base.preorderCode = preorder.code;
                base.preorderBuyerName = preorder.buyerName || '';
                base.preorderRequestedItem = preorder.requestedItem || '';
            }
        }

        return base;
    }

    function validateCartItem(item) {
        if (!item.itemName) return 'Item penjualan wajib diisi';
        if ((item.category === 'unit_iphone' || item.category === 'unit_android') && !item.stockRefCode) return 'Pilih unit dari stok ready';
        if (item.category === 'unit_iphone' || item.category === 'unit_android') {
            if (item.sell <= 0) return 'Harga jual unit wajib lebih dari 0';
        } else if (item.category === 'tukar_tambah') {
            if (!item.stockRefCode) return 'Pilih unit baru dari stok ready';
            if (item.newUnitSellPrice <= 0) return 'Harga jual unit baru wajib lebih dari 0';
            if (!item.tradeInBrand) return 'Merek HP lama wajib diisi';
            if (!item.tradeInModel) return 'Tipe HP lama wajib diisi';
            if (!item.tradeInImei) return 'IMEI HP lama wajib diisi';
            if (item.tradeInCost <= 0) return 'Harga tukar tambah HP lama wajib lebih dari 0';
        } else if (item.category === 'accessory') {
            if (!item.stockRefCode) return 'Pilih aksesoris dari stok';
            if ((Number(item.quantity) || 0) <= 0) return 'Qty aksesoris wajib lebih dari 0';
        } else if (item.category === 'preorder_dp') {
            if (!item.brand) return 'Brand wajib diisi';
            if (!item.model) return 'Model wajib diisi';
            if (!item.color) return 'Warna wajib diisi';
            if (item.sell <= 0) return 'Nominal DP wajib lebih dari 0';
            if (item.quantity <= 0) return 'Jumlah wajib lebih dari 0';
        } else if (item.category === 'order_jasa' || item.category === 'order_jasa_beacukai') {
            if (!item.jasaUnitName) return 'Nama unit HP user wajib diisi';
            if (!item.jasaImei) return 'IMEI HP user wajib diisi';
            if (item.sell <= 0) return 'Nominal wajib lebih dari 0';
        } else if (item.category === 'order_jasa_icloud') {
            if (!item.icloudFullName) return 'Nama Lengkap wajib diisi';
            if (!item.icloudDob) return 'Tanggal Lahir wajib diisi';
            if (!item.icloudEmail) return 'Email Aktif wajib diisi';
            if (!item.icloudPhone) return 'Nomor Telfon Aktif wajib diisi';
            if (!item.icloudPassword) return 'Kata Sandi wajib diisi';
            if (item.sell <= 0) return 'Nominal wajib lebih dari 0';
        } else if (!item.category.startsWith('service_')) {
            if (item.sell <= 0) return 'Harga jual wajib lebih dari 0';
        }
        return '';
    }

    function saleCategoryTitle(type) {
        return {
            unit_iphone: 'Tambah Item iPhone',
            unit_android: 'Tambah Item Android',
            accessory: 'Tambah Item Aksesoris',
            tukar_tambah: 'Tambah Item Tukar Tambah',
            preorder: 'Tambah Pre Order',
            preorder_ready: 'Preorder Ready',
            other: 'Tambah Item Lain-lain',
            service_masuk: 'Service Masuk',
            service_keluar: 'Service Keluar',
            service_cancel: 'Service Cancel',
            order_jasa: 'Penjualan IMEI (Order-Jasa)',
            order_jasa_imei: 'Penjualan IMEI (Order-Jasa)',
            order_jasa_beacukai: 'IMEI Bea Cukai',
            order_jasa_icloud: 'Jasa Pembuatan iCloud',
        }[type] || 'Tambah Item';
    }

    function renderPreorderReadyListHtml() {
        const readyPreorders = loadPreorders().filter(item => item.status === 'Ready');
        if (!readyPreorders.length) {
            return `
                <div class="empty-state-container" style="text-align: center; padding: 30px 20px;">
                    <div class="empty-icon" style="font-size: 48px; color: var(--text-dim); margin-bottom: 10px;">
                        <i class="ri-checkbox-circle-line" style="opacity: 0.5;"></i>
                    </div>
                    <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 6px;">Tidak Ada Preorder Ready</h3>
                    <p style="font-size: 13px; color: var(--text-dim); max-width: 300px; margin: 0 auto;">
                        Belum ada preorder yang siap (diubah statusnya menjadi Ready oleh admin).
                    </p>
                </div>
            `;
        }

        const itemsHtml = readyPreorders.map(item => {
            const brand = item.brand || '';
            const model = item.model || '';
            const storage = item.storage || '';
            const color = item.color || '';
            const specText = `${brand} ${model} ${storage} ${color}`.trim() || item.requestedItem || '-';
            const dpText = item.dpAmount ? fmtRp(item.dpAmount) : 'Rp 0';
            return `
                <div class="preorder-ready-card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed var(--border-color); padding-bottom: 6px; margin-bottom: 4px;">
                        <span style="font-weight: 700; color: var(--primary-light); font-family: monospace;">${esc(item.code)}</span>
                        <span class="badge badge-success" style="font-size: 11px; padding: 2px 6px;">Ready</span>
                    </div>
                    <div style="font-size: 13px; display: grid; grid-template-columns: 85px 1fr; gap: 4px;">
                        <div class="text-dim">Pembeli:</div>
                        <div style="font-weight: 500;">${esc(item.buyerName || '-')} (${esc(item.buyerWa || '-')})</div>
                        <div class="text-dim">Unit Pesanan:</div>
                        <div style="font-weight: 500;">${esc(specText)}</div>
                        <div class="text-dim">DP Masuk:</div>
                        <div style="font-weight: 600; color: var(--success-color);">${esc(dpText)}</div>
                    </div>
                    <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
                        <button type="button" class="btn btn-sm btn-primary btn-process-preorder" data-code="${esc(item.code)}" style="width: auto; padding: 6px 12px; font-size: 12px; gap: 4px;">
                            <i class="ri-shopping-cart-2-line"></i> Proses Jual
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="mini-panel" style="max-height: 450px; overflow-y: auto;">
                <div class="flex-between mb-sm">
                    <h3 style="font-size:13px;"><i class="ri-checkbox-circle-line"></i> Daftar Preorder Ready</h3>
                    <span class="text-xs text-dim">${readyPreorders.length} preorder</span>
                </div>
                <div class="preorder-ready-list">
                    ${itemsHtml}
                </div>
            </div>
        `;
    }

    function findMatchingDeviceForPreorder(preorder) {
        const devices = load(DB_KEYS.devices).filter(d => d.status === 'Available');
        const cleanStr = s => String(s || '').toLowerCase().replace(/\s+/g, '');

        const linkedUnitCode = String(preorder.linkedUnitCode || '').trim();
        if (linkedUnitCode) {
            const linkedDevice = devices.find(d => d.code === linkedUnitCode);
            if (linkedDevice) return linkedDevice;
        }
        
        let preBrand = String(preorder.brand || '').toLowerCase().trim();
        let preModel = String(preorder.model || '').toLowerCase().trim();
        let preStorage = String(preorder.storage || '').toLowerCase().trim();
        let preColor = String(preorder.color || '').toLowerCase().trim();
        let preCondition = String(preorder.condition || '').toLowerCase().trim();

        // Helper for brand matching
        const brandMatch = (pb, db) => {
            pb = cleanStr(pb);
            db = cleanStr(db);
            if (pb === db) return true;
            if ((pb === 'iphone' || pb === 'apple') && (db === 'iphone' || db === 'apple')) return true;
            if (pb === 'android' || pb === 'other' || !pb) return true;
            return false;
        };

        // Helper for condition matching
        const condMatch = (pc, dc) => {
            pc = cleanStr(pc);
            dc = cleanStr(dc);
            if (pc === dc) return true;
            if ((pc === 'second' || pc === 'bekas') && (dc === 'second' || dc === 'bekas')) return true;
            if (!pc) return true;
            return false;
        };

        // Fallback: parse details from requestedItem if fields are empty
        const reqItem = String(preorder.requestedItem || '').toLowerCase().trim();
        const cleanReq = cleanStr(reqItem);

        if (!preBrand && reqItem) {
            if (reqItem.includes('iphone') || reqItem.includes('ip-') || reqItem.includes('apple')) {
                preBrand = 'apple';
            } else if (reqItem.includes('samsung')) {
                preBrand = 'samsung';
            } else if (reqItem.includes('oppo')) {
                preBrand = 'oppo';
            } else if (reqItem.includes('vivo')) {
                preBrand = 'vivo';
            } else if (reqItem.includes('xiaomi')) {
                preBrand = 'xiaomi';
            } else if (reqItem.includes('realme')) {
                preBrand = 'realme';
            } else if (reqItem.includes('infinix')) {
                preBrand = 'infinix';
            }
        }

        if (!preModel && reqItem) {
            const models = ['iphone 11', 'iphone 12', 'iphone 13', 'iphone 14', 'iphone 15', 'iphone x', 'iphone xr', 'iphone xs', 's23 ultra', 's24 ultra'];
            for (const m of models) {
                if (reqItem.includes(m)) {
                    preModel = m;
                    break;
                }
            }
            if (!preModel) {
                if (reqItem.includes('iphone 13')) preModel = 'iphone 13';
                else if (reqItem.includes('iphone 12')) preModel = 'iphone 12';
                else if (reqItem.includes('iphone 11')) preModel = 'iphone 11';
                else if (reqItem.includes('iphone 14')) preModel = 'iphone 14';
                else if (reqItem.includes('iphone 15')) preModel = 'iphone 15';
            }
        }

        if (!preStorage && reqItem) {
            const storages = ['64gb', '128gb', '256gb', '512gb', '1tb', '32gb'];
            for (const s of storages) {
                if (reqItem.includes(s)) {
                    preStorage = s;
                    break;
                }
            }
        }

        if (!preColor && reqItem) {
            const colors = ['midnight', 'starlight', 'blue', 'pink', 'red', 'green', 'black', 'white', 'gold', 'silver', 'grey', 'gray', 'titanium'];
            for (const c of colors) {
                if (reqItem.includes(c)) {
                    preColor = c;
                    break;
                }
            }
        }

        // 1. Try exact match (brand, model, storage, color, condition)
        let match = devices.find(d => 
            brandMatch(preBrand, d.brand) &&
            cleanStr(d.model) === cleanStr(preModel) &&
            cleanStr(d.storage) === cleanStr(preStorage) &&
            cleanStr(d.color) === cleanStr(preColor) &&
            condMatch(preCondition, d.condition)
        );

        // 2. Try match without color
        if (!match) {
            match = devices.find(d => 
                brandMatch(preBrand, d.brand) &&
                cleanStr(d.model) === cleanStr(preModel) &&
                cleanStr(d.storage) === cleanStr(preStorage) &&
                condMatch(preCondition, d.condition)
            );
        }

        // 3. Try match brand & model only
        if (!match) {
            match = devices.find(d => 
                brandMatch(preBrand, d.brand) &&
                cleanStr(d.model) === cleanStr(preModel)
            );
        }

        // 4. Try matching device using direct substring match of model/storage from requestedItem
        if (!match && cleanReq) {
            match = devices.find(d => {
                const dm = cleanStr(d.model);
                const ds = cleanStr(d.storage);
                return cleanReq.includes(dm) && (ds ? cleanReq.includes(ds) : true);
            });
        }

        return match;
    }

    function bindPreorderReadyListEvents() {
        document.querySelectorAll('.btn-process-preorder').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.dataset.code;
                const preorder = loadPreorders().find(item => item.code === code);
                if (!preorder) return;

                // Determine unit category to open
                let targetCategory = 'unit_iphone';
                const cat = String(preorder.preorderCategory || preorder.category || '').toLowerCase();
                const brand = String(preorder.brand || '').toLowerCase();
                const reqItem = String(preorder.requestedItem || '').toLowerCase();
                
                if (cat === 'android' || brand === 'samsung' || brand === 'oppo' || brand === 'vivo' || brand === 'xiaomi' || brand === 'realme' || brand === 'infinix' ||
                    reqItem.includes('android') || reqItem.includes('samsung') || reqItem.includes('oppo') || reqItem.includes('vivo') || reqItem.includes('xiaomi') || reqItem.includes('realme') || reqItem.includes('infinix')) {
                    targetCategory = 'unit_android';
                } else if (cat === 'ipad' || cat === 'other' || reqItem.includes('ipad') || reqItem.includes('tablet') || reqItem.includes('tab ')) {
                    targetCategory = 'other';
                }

                const match = (targetCategory === 'unit_iphone' || targetCategory === 'unit_android') 
                    ? findMatchingDeviceForPreorder(preorder) 
                    : null;

                // If in testing mode, bypass the confirmation form and immediately add to cart
                const isTesting = isTestingMode();
                if (isTesting) {
                    let cartItem = null;
                    if (targetCategory === 'unit_iphone' || targetCategory === 'unit_android') {
                        cartItem = {
                            id: newTransactionId(),
                            category: targetCategory,
                            code: match ? match.code : `PRE-${Date.now()}`,
                            itemName: match ? `${match.brand || ''} ${match.model || ''} ${match.storage || ''} ${match.color || ''}`.trim() : (preorder.requestedItem || 'Unit Preorder'),
                            condition: match ? (match.condition || '') : (preorder.condition || ''),
                            cost: match ? (Number(match.cost) || 0) : (Number(preorder.cost) || 0),
                            stockRefCode: match ? match.code : '',
                            imei: match ? (match.imei || '') : '',
                            preorderCode: preorder.code,
                            preorderBuyerName: preorder.buyerName || '',
                            preorderRequestedItem: preorder.requestedItem || '',
                            quantity: 1,
                            sell: match ? (Number(match.sell) || Number(preorder.cost) || 0) : (Number(preorder.cost) || 0),
                            unitSell: match ? (Number(match.sell) || Number(preorder.cost) || 0) : (Number(preorder.cost) || 0),
                            bonusAccessories: [],
                            bonusCost: 0,
                            createdAt: new Date().toISOString()
                        };
                    } else {
                        cartItem = {
                            id: newTransactionId(),
                            category: 'other',
                            code: preorder.code,
                            itemName: preorder.requestedItem || 'Unit Preorder',
                            condition: preorder.condition || '',
                            cost: Number(preorder.cost) || 0,
                            preorderCode: preorder.code,
                            preorderBuyerName: preorder.buyerName || '',
                            preorderRequestedItem: preorder.requestedItem || '',
                            quantity: 1,
                            sell: Number(preorder.cost) || 0,
                            unitSell: Number(preorder.cost) || 0,
                            createdAt: new Date().toISOString()
                        };
                    }

                    activeSaleCart.push(cartItem);

                    // Pre-fill Buyer Name and WA in the cart draft
                    const draftKey = `${DB_KEYS.salesDraftPrefix}:cart`;
                    let draft = null;
                    try {
                        draft = JSON.parse(localStorage.getItem(draftKey) || '{}');
                    } catch {
                        draft = {};
                    }
                    if (!draft.fields) draft.fields = {};
                    draft.fields['saleBuyerName'] = preorder.buyerName || '';
                    draft.fields['saleDrawerBuyerName'] = preorder.buyerName || '';
                    draft.fields['saleBuyerWa'] = preorder.buyerWa || '';
                    draft.fields['saleDrawerBuyerWa'] = preorder.buyerWa || '';
                    draft.cartItems = activeSaleCart;
                    localStorage.setItem(draftKey, JSON.stringify(draft));

                    // Switch page to sales
                    activeSaleType = targetCategory;
                    switchPage('page-sales');
                    syncSalesPageChrome();
                    renderActiveSaleForm();

                    // Close the preorder ready list modal
                    closeSalesItemModal();
                    return;
                }

                // If it is a device and no match is found, direct to manual selection modal
                if ((targetCategory === 'unit_iphone' || targetCategory === 'unit_android') && !match) {
                    activeLinkedPreorder = preorder;
                    openSalesItemModal(targetCategory);
                    toast('Stok cocok tidak ditemukan otomatis. Silakan pilih unit secara manual.', 'info');
                    return;
                }

                // Otherwise, show the price confirmation form inside the modal
                const specText = `${preorder.brand || ''} ${preorder.model || ''} ${preorder.storage || ''} ${preorder.color || ''}`.trim() || preorder.requestedItem || '-';
                const dpAmount = Number(preorder.dpAmount) || 0;
                const defaultSellPrice = match ? (Number(match.sell) || '') : '';

                const mount = $('salesItemModalMount');
                if (!mount) return;

                mount.innerHTML = `
                    <div class="card" style="margin: 0; box-shadow: none; border: none; background: transparent; padding: 10px;">
                        <h3 class="mb-md" style="font-size: 15px; font-weight: 600;"><i class="ri-shopping-cart-2-line"></i> Proses Jual Preorder</h3>
                        
                        <div class="mini-panel text-sm mb-md">
                            <div class="flex-between mb-xs">
                                <span class="text-dim">Kode Preorder:</span>
                                <strong>${esc(preorder.code)}</strong>
                            </div>
                            <div class="flex-between mb-xs">
                                <span class="text-dim">Unit Pesanan:</span>
                                <strong>${esc(specText)}</strong>
                            </div>
                            ${match ? `
                            <div class="flex-between mb-xs">
                                <span class="text-dim">Unit Stok Cocok:</span>
                                <strong style="color: var(--primary-light);">${esc(match.code)}</strong>
                            </div>
                            ` : ''}
                            <div class="flex-between mb-xs">
                                <span class="text-dim">Pembeli:</span>
                                <strong>${esc(preorder.buyerName || '-')}</strong>
                            </div>
                        </div>
                        
                        <div class="field mb-md">
                            <label class="text-xs">Harga Jual Rp</label>
                            <input type="text" inputmode="numeric" id="preorderReadySellPrice" placeholder="Harga Jual" value="${defaultSellPrice}" required>
                        </div>
                        
                        <div class="mini-panel text-sm mb-lg">
                            <div class="flex-between mb-xs">
                                <span class="text-dim">DP Masuk (Pengurang):</span>
                                <strong style="color: var(--success-color);">${fmtRp(dpAmount)}</strong>
                            </div>
                            <div class="flex-between" style="border-top: 1px solid var(--border); padding-top: 6px; margin-top: 6px;">
                                <span class="font-semibold">Sisa Pelunasan:</span>
                                <strong id="preorderReadyRemainingPay" style="color: var(--primary-light); font-size: 14px;">${fmtRp(Math.max(0, (Number(defaultSellPrice) || 0) - dpAmount))}</strong>
                            </div>
                        </div>
                        
                        <div class="btn-row" style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" class="btn btn-ghost" id="btnCancelProcessPreorder">Batal</button>
                            <button type="button" class="btn btn-primary" id="btnSubmitProcessPreorder"><i class="ri-check-line"></i> Masukkan ke Keranjang</button>
                        </div>
                    </div>
                `;

                bindRpFormatter('preorderReadySellPrice');
                
                const sellPriceInput = $('preorderReadySellPrice');
                const remainingPayEl = $('preorderReadyRemainingPay');
                
                const updateRemaining = () => {
                    const sellVal = cleanRp(sellPriceInput.value) || 0;
                    remainingPayEl.textContent = fmtRp(Math.max(0, sellVal - dpAmount));
                };
                
                sellPriceInput.addEventListener('input', updateRemaining);
                sellPriceInput.addEventListener('change', updateRemaining);
                updateRemaining(); // Initial calculation

                $('btnCancelProcessPreorder')?.addEventListener('click', () => {
                    openSalesItemModal('preorder_ready');
                });

                $('btnSubmitProcessPreorder')?.addEventListener('click', () => {
                    const finalSellPrice = cleanRp(sellPriceInput.value) || 0;
                    if (finalSellPrice <= 0) {
                        toast('Harga jual wajib diisi', 'err');
                        return;
                    }

                    let cartItem = null;
                    if (targetCategory === 'unit_iphone' || targetCategory === 'unit_android') {
                        cartItem = {
                            id: newTransactionId(),
                            category: targetCategory,
                            code: match.code,
                            itemName: `${match.brand || ''} ${match.model || ''} ${match.storage || ''} ${match.color || ''}`.trim(),
                            condition: match.condition || '',
                            cost: Number(match.cost) || 0,
                            stockRefCode: match.code,
                            imei: match.imei || '',
                            preorderCode: preorder.code,
                            preorderBuyerName: preorder.buyerName || '',
                            preorderRequestedItem: preorder.requestedItem || '',
                            quantity: 1,
                            sell: finalSellPrice,
                            unitSell: finalSellPrice,
                            bonusAccessories: [],
                            bonusCost: 0,
                            createdAt: new Date().toISOString()
                        };
                    } else {
                        cartItem = {
                            id: newTransactionId(),
                            category: 'other',
                            code: preorder.code,
                            itemName: preorder.requestedItem || 'Unit Preorder',
                            condition: preorder.condition || '',
                            cost: Number(preorder.cost) || 0,
                            preorderCode: preorder.code,
                            preorderBuyerName: preorder.buyerName || '',
                            preorderRequestedItem: preorder.requestedItem || '',
                            quantity: 1,
                            sell: finalSellPrice,
                            unitSell: finalSellPrice,
                            createdAt: new Date().toISOString()
                        };
                    }

                    activeSaleCart.push(cartItem);

                    // Pre-fill Buyer Name and WA in the cart draft
                    const draftKey = `${DB_KEYS.salesDraftPrefix}:cart`;
                    let draft = null;
                    try {
                        draft = JSON.parse(localStorage.getItem(draftKey) || '{}');
                    } catch {
                        draft = {};
                    }
                    if (!draft.fields) draft.fields = {};
                    draft.fields['saleBuyerName'] = preorder.buyerName || '';
                    draft.fields['saleDrawerBuyerName'] = preorder.buyerName || '';
                    draft.fields['saleBuyerWa'] = preorder.buyerWa || '';
                    draft.fields['saleDrawerBuyerWa'] = preorder.buyerWa || '';
                    draft.cartItems = activeSaleCart;
                    localStorage.setItem(draftKey, JSON.stringify(draft));

                    // Switch page to sales
                    activeSaleType = targetCategory;
                    switchPage('page-sales');
                    syncSalesPageChrome();
                    renderActiveSaleForm();

                    // Close the preorder ready list modal
                    closeSalesItemModal();

                    if (!isTestingMode()) {
                        checkoutStage = 'items';
                        $('salesCartModal')?.classList.add('open');
                        requestAnimationFrame(() => renderCartDrawer());
                    }
                    toast('Preorder berhasil dimasukkan ke keranjang.');
                });
            });
        });
    }

    function closeSalesItemModal() {
        $('salesItemModal')?.classList.remove('open');
        if ($('salesItemModalMount')) $('salesItemModalMount').innerHTML = '';
        if (activeSaleType === 'preorder' && !isAddingToCart && !activeSaleCartEditId && !isTestingMode()) {
            if (preorderNavOrigin === 'page-home') {
                switchPage('page-home');
            } else {
                activeSaleType = 'unit_iphone';
                syncSalesPageChrome();
                renderActiveSaleForm(true);
            }
        }
        activeLinkedPreorder = null;
    }

    function openSalesItemModal(type) {
        activeSaleType = type;
        const isTesting = isTestingMode();
        activeSalesItemModalMode = (type === 'preorder' && isTesting) ? 'preorder' : 'cart';
        if ((type !== 'preorder' || !isTesting) && type !== 'service' && !type.startsWith('service_') && type !== 'preorder_ready') {
            switchCartEditorType(defaultCartTypeForSaleType(type));
        }
        if ($('salesItemModalTitle')) {
            $('salesItemModalTitle').innerHTML = `<i class="ri-shopping-bag-3-line"></i> ${esc(saleCategoryTitle(type))}`;
        }
        // Show modal overlay first for instant visual feedback
        $('salesItemModal')?.classList.add('open');

        // Defer heavy DOM content injection to next frame
        requestAnimationFrame(() => {
            const mount = $('salesItemModalMount');
            if (!mount) return;
            if (type === 'preorder_ready') {
                mount.innerHTML = renderPreorderReadyListHtml();
                bindPreorderReadyListEvents();
            } else if (type.startsWith('service_') || type === 'service') {
                activeServiceSaleMode = type.startsWith('service_') ? type.replace('service_', '') : (activeServiceSaleMode || 'masuk');
                mount.innerHTML = renderServiceSaleFormHtml();
                bindSaleFormEvents();
                if (activeServiceSaleMode === 'masuk') {
                    bindRpFormatter('saleServiceSparepartCost');
                    bindRpFormatter('saleServiceFee');
                } else if (activeServiceSaleMode === 'keluar' || activeServiceSaleMode === 'cancel') {
                    bindRpFormatter('saleServicePaymentAmount');
                    updateSelectedServiceOrderDetail();
                }
            } else if (type === 'preorder' && isTesting) {
                mount.innerHTML = renderPreorderSaleFormHtml();
                bindSaleFormEvents();
                
                const preorderBrand = $('preorderBrand');
                if (preorderBrand) {
                    preorderBrand.addEventListener('change', updatePreorderModelDatalist);
                    preorderBrand.addEventListener('input', updatePreorderModelDatalist);
                    updatePreorderModelDatalist();
                }

                $('btnSavePreorderOnly')?.addEventListener('click', () => savePreorderRequest(false));
                $('btnSavePreorder')?.addEventListener('click', () => savePreorderRequest(true));
            } else {
                mount.innerHTML = `<div id="saleCartItemEditor">${renderCartItemEditor(defaultCartTypeForSaleType(type))}</div>`;
                bindSaleFormEvents();
                if (defaultCartTypeForSaleType(type) === 'preorder_dp') {
                    const preorderBrand = $('preorderBrand');
                    if (preorderBrand) {
                        preorderBrand.addEventListener('change', updatePreorderModelDatalist);
                        preorderBrand.addEventListener('input', updatePreorderModelDatalist);
                        updatePreorderModelDatalist();
                    }
                }
            }
            restoreSalesDraft();
        });
    }

    function renderSalesCartForm(primaryType) {
        const type = CART_ITEM_TYPES.includes(activeSaleCartType) ? activeSaleCartType : defaultCartTypeForSaleType(primaryType);
        activeSaleCartType = type;
        $('salesFormMount').innerHTML = `
            <div class="card">
                <div class="card-head"><h2>Keranjang Penjualan</h2></div>
                ${renderBuyerFields()}
                <div class="form-grid cols-2">
                    <div class="field"><label>Nama Sales</label><select id="saleSalesName" class="sales-employee-select">${getSalesEmployeeOptions()}</select></div>
                </div>
                ${renderCartTable()}
                ${renderCartPaymentFields()}
                <div class="btn-row">
                    <button type="button" id="btnSaveSaleOnly" class="btn btn-ghost"><i class="ri-save-3-line"></i> Simpan Penjualan</button>
                    <button type="button" id="btnSaveSale" class="btn btn-primary"><i class="ri-printer-line"></i> Simpan & Cetak Struk</button>
                </div>
            </div>`;
        bindSaleFormEvents();
    }

    function renderCartTable() {
        const subtotal = cartTotals().subtotal;
        const dpTotal = cartPreorderDpTotal();
        const target = cartPaymentTarget();
        
        const cart = isServiceMode() ? activeServiceCart : activeSaleCart;
        const rows = cart.length
            ? cart.map((item, index) => {
                const detailHtml = item.category === 'tukar_tambah'
                    ? `<div class="text-xxs text-dim" style="margin-top: 2px;">
                           Dijual: ${fmtRp(item.newUnitSellPrice || 0)} | Ditarik: -${fmtRp(item.tradeInCost || 0)}
                       </div>`
                    : '';
                return `<tr data-cart-item-id="${esc(item.id)}">
                    <td class="mono text-sm">${index + 1}</td>
                    <td class="text-sm">${esc(cartItemTypeLabel(item.category))}</td>
                    <td class="text-sm">
                        <div>${esc(item.itemName || '-')}</div>
                        ${detailHtml}
                    </td>
                    <td class="mono text-sm">${esc(item.quantity || 1)}</td>
                    <td class="mono text-sm">${fmtRp(item.sell || 0)}</td>
                    <td><div class="row-actions"><button type="button" class="btn-del" data-cart-remove="${esc(item.id)}"><i class="ri-delete-bin-6-line"></i></button></div></td>
                </tr>`;
            }).join('')
            : '<tr><td colspan="6" class="text-dim" style="text-align:center;">Belum ada item di keranjang</td></tr>';
            
        let dpAndTargetRows = '';
        if (dpTotal > 0) {
            dpAndTargetRows = `
                <div class="flex-between text-dim" style="font-size: 13px;">
                    <span>DP Terbayar</span>
                    <strong style="color: var(--danger); font-size: 13px;">-${fmtRp(dpTotal)}</strong>
                </div>
                <div class="flex-between" style="font-size: 14px; margin-top: 2px;">
                    <span>Sisa Pelunasan</span>
                    <strong id="saleCartPaymentTarget" style="color: var(--primary-light); font-size: 16px;">${fmtRp(target)}</strong>
                </div>`;
        }

        const hasTradeIn = cart.some(item => item.category === 'tukar_tambah');
        let subtotalLabel = 'Subtotal';
        let subtotalColor = 'var(--primary-light)';
        let displaySubtotal = subtotal;

        if (hasTradeIn) {
            if (subtotal < 0) {
                subtotalLabel = 'Selisih Kembalian (Kasir Berikan)';
                subtotalColor = 'var(--success)';
                displaySubtotal = Math.abs(subtotal);
            } else {
                subtotalLabel = 'Selisih Bayar Tambah (Pelanggan Bayar)';
            }
        }

        return `
            <div class="mini-panel">
                <div class="flex-between mb-sm">
                    <h3 data-cart-review-title style="font-size:13px;"><i class="ri-shopping-bag-3-line"></i> Review Keranjang</h3>
                    <span class="text-xs text-dim"><span id="saleCartCount">${cart.length}</span> item</span>
                </div>
                <div class="table-wrap">
                    <table class="report-table">
                        <thead><tr><th>#</th><th>Kategori</th><th>Item</th><th>Qty</th><th>Total</th><th>Aksi</th></tr></thead>
                        <tbody id="saleCartBody">${rows}</tbody>
                    </table>
                </div>
                <div class="flex-between mt-sm">
                    <span>Total Qty</span>
                    <strong id="saleCartTotalQty">${cartTotals().qty}</strong>
                </div>
                <div class="flex-between">
                    <span id="saleCartSubtotalLabel">${subtotalLabel}</span>
                    <strong id="saleCartSubtotal" style="color: ${subtotalColor}; font-size: 16px;">${fmtRp(displaySubtotal)}</strong>
                </div>
                ${dpAndTargetRows}
            </div>`;
    }

    function addCurrentCartItem(e) {
        const item = collectCartItemFromEditor();
        const error = validateCartItem(item);
        if (error) {
            toast(error, 'err');
            return false;
        }
        if (activeSaleCartEditId) {
            const index = activeSaleCart.findIndex(entry => entry.id === activeSaleCartEditId);
            if (index >= 0) activeSaleCart[index] = item;
            else activeSaleCart.push(item);
        } else {
            activeSaleCart.push(item);
        }
        if (item.buyerName) {
            if ($('saleBuyerName') && !$('saleBuyerName').value) $('saleBuyerName').value = item.buyerName;
            if ($('saleDrawerBuyerName') && !$('saleDrawerBuyerName').value) $('saleDrawerBuyerName').value = item.buyerName;
        }
        if (item.buyerWa) {
            if ($('saleBuyerWa') && !$('saleBuyerWa').value) $('saleBuyerWa').value = item.buyerWa;
            if ($('saleDrawerBuyerWa') && !$('saleDrawerBuyerWa').value) $('saleDrawerBuyerWa').value = item.buyerWa;
        }
        activeSaleCartEditId = '';
        saveSalesDraft();
        isAddingToCart = true;
        try {
            closeSalesItemModal();
        } finally {
            isAddingToCart = false;
        }
        
        if (!document.body.classList.contains('testing-mode') && e) {
            let x = e.clientX;
            let y = e.clientY;
            if (!x || !y) {
                const rect = e.currentTarget?.getBoundingClientRect() || { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
                x = rect.left + rect.width / 2;
                y = rect.top + rect.height / 2;
            }
            animateFlyToCart(x, y);
        }
        
        renderActiveSaleForm();
        updateHeaderCartBadge();
        toast('Item ditambahkan ke keranjang');
        return true;
    }

    function removeCartItem(id) {
        if (isServiceMode()) {
            activeServiceCart = activeServiceCart.filter(item => item.id !== id);
        } else {
            activeSaleCart = activeSaleCart.filter(item => item.id !== id);
        }
        saveSalesDraft();
        renderActiveSaleForm(true);
        updateHeaderCartBadge();
    }

    function ensureCartHasCurrentItem() {
        if (activeSaleCart.length) return '';
        return addCurrentCartItem() ? '' : 'failed';
    }

    function buildSplitAllocation(total, rows, splitValues) {
        const netSells = rows.map(row => {
            let sell = Number(row.sell) || 0;
            if (row.preorderCode && row.category !== 'preorder_dp') {
                const preorder = loadPreorders().find(p => p.code === row.preorderCode);
                if (preorder) {
                    const dp = Number(preorder.dpAmount) || 0;
                    sell = Math.max(0, sell - dp);
                }
            }
            return sell;
        });
        const netTotal = netSells.reduce((sum, val) => sum + val, 0);

        const allocations = rows.map((row, index) => {
            const rowNet = netSells[index];
            const ratio = netTotal > 0 ? rowNet / netTotal : 0;
            const isLast = index === rows.length - 1;
            const splitCash = isLast ? 0 : Math.round((splitValues.splitCash || 0) * ratio);
            const splitTransfer = isLast ? 0 : Math.round((splitValues.splitTransfer || 0) * ratio);
            const splitCredit = isLast ? 0 : Math.round((splitValues.splitCredit || 0) * ratio);
            return { splitCash, splitTransfer, splitCredit };
        });
        const sums = allocations.reduce((acc, item) => {
            acc.cash += item.splitCash;
            acc.transfer += item.splitTransfer;
            acc.credit += item.splitCredit;
            return acc;
        }, { cash: 0, transfer: 0, credit: 0 });
        const last = allocations[allocations.length - 1];
        if (last) {
            last.splitCash += (splitValues.splitCash || 0) - sums.cash;
            last.splitTransfer += (splitValues.splitTransfer || 0) - sums.transfer;
            last.splitCredit += (splitValues.splitCredit || 0) - sums.credit;
        }
        return allocations;
    }

    function saveCartSale(shouldPrint = true) {
        const cart = isServiceMode() ? activeServiceCart : activeSaleCart;
        if (!cart.length) {
            if (isServiceMode()) {
                toast('Keranjang service kosong', 'err');
                return;
            }
            const saved = addCurrentCartItem();
            if (!saved) return;
        }
        const header = collectCartHeader();
        if (!header.buyerName) { toast('Nama pembeli wajib diisi', 'err'); return; }
        if (!header.buyerWa) { toast('No. WA pembeli wajib diisi', 'err'); return; }
        const subtotal = cartTotals().subtotal;
        const dpTotal = cartPreorderDpTotal();
        const paymentTarget = Math.max(0, subtotal - dpTotal);
        const paidAmount = header.paymentMethod === 'split' ? paymentTarget : (header.paidAmount || paymentTarget);
        const changeAmount = header.paymentMethod === 'cash' ? Math.max(0, paidAmount - paymentTarget) : 0;
        if (header.paymentMethod === 'cash' && paidAmount < paymentTarget) { toast('Uang diterima kurang dari sisa pelunasan', 'err'); return; }
        if (header.paymentMethod === 'split' && (header.splitCash + header.splitTransfer + header.splitCredit) !== paymentTarget) { toast('Split payment harus sama dengan sisa pelunasan', 'err'); return; }
        const rows = cart.map(item => ({ ...item }));
        const splitValues = {
            splitCash: header.paymentMethod === 'split' ? header.splitCash : (header.paymentMethod === 'cash' ? paymentTarget : 0),
            splitTransfer: header.paymentMethod === 'split' ? header.splitTransfer : (header.paymentMethod === 'transfer' ? paymentTarget : 0),
            splitCredit: header.paymentMethod === 'split' ? header.splitCredit : (header.paymentMethod === 'kredit' ? paymentTarget : 0),
        };
        const splitAllocations = buildSplitAllocation(paymentTarget, rows, splitValues);
        const receiptCode = nextReceiptCode();
        const tempAddedCodes = [];
        const getNextTradeInCode = (warranty, storage, color, category) => {
            const prefix = deviceCodePrefix(category, warranty, storage, color);
            const existingCodes = [...load(DB_KEYS.devices).map(d => d.code), ...tempAddedCodes];
            const code = `${prefix}-${nextSequenceFromPrefix(existingCodes, prefix, 2)}`;
            tempAddedCodes.push(code);
            return code;
        };
        const savedRows = rows.map((item, index) => {
            const row = {
                ...item,
                date: header.date || item.date || today(),
                shift: header.shift || item.shift || 'shift pagi & malam',
                receiptCode,
                receiptLineNo: index + 1,
                receiptTotal: subtotal,
                receiptPaidAmount: paidAmount + dpTotal,
                receiptChangeAmount: changeAmount,
                receiptPaymentMethod: header.paymentMethod,
                paymentMethod: header.paymentMethod,
                paidAmount,
                changeAmount,
                splitCash: splitAllocations[index].splitCash,
                splitTransfer: splitAllocations[index].splitTransfer,
                splitCredit: splitAllocations[index].splitCredit,
                buyerName: header.buyerName,
                buyerWa: header.buyerWa,
                salesName: header.salesName,
                creditAgent: header.creditAgent || '',
                receiptCreditAgent: header.creditAgent || '',
            };
            row.id = newTransactionId();
            row.cartItemId = item.id;
            if (row.category === 'accessory' || row.category === 'other') {
                row.sell = (Number(item.unitSell) || 0) * (Number(item.quantity) || 1);
            }
            if (row.category === 'accessory') {
                row.cost = (Number(item.cost) || 0) * (Number(item.quantity) || 1);
            }
            if (row.category === 'unit_iphone' || row.category === 'unit_android') {
                row.sell = Number(item.sell) || 0;
                row.quantity = 1;
            }
            if (row.category === 'tukar_tambah') {
                row.sell = Number(item.sell) || 0;
                row.quantity = 1;
                row.tradeInUnitCategory = item.tradeInUnitCategory || 'iphone';
                row.tradeInWarranty = item.tradeInWarranty || 'INT';
                row.tradeInCode = generateDeviceCode(row.tradeInUnitCategory, row.tradeInImei, row.tradeInWarranty);
            }
            row.unitSell = Number(item.unitSell) || row.sell;
            return row;
        });
        const error = validateCartSave(savedRows, header, subtotal);
        if (error) { toast(error, 'err'); return; }
        
        // Create preorder requests for any preorder_dp items
        savedRows.forEach(row => {
            if (row.category === 'preorder_dp') {
                const preorderRequest = {
                    code: row.code || nextPreorderCode(),
                    date: row.date,
                    shift: row.shift,
                    buyerName: row.buyerName,
                    buyerWa: row.buyerWa,
                    salesName: row.salesName,
                    requestedItem: row.itemName.replace(/^DP Pre Order -\s*/, ''),
                    brand: row.brand || '',
                    model: row.model || '',
                    storage: row.storage || '',
                    color: row.color || '',
                    condition: row.condition || '',
                    warranty: row.warranty || '',
                    note: row.note || '',
                    preorderCategory: row.preorderCategory || 'other',
                    dpAmount: row.sell,
                    paymentMethod: row.paymentMethod,
                    splitCash: row.splitCash || 0,
                    splitTransfer: row.splitTransfer || 0,
                    splitCredit: row.splitCredit || 0,
                    cost: 0,
                    status: 'Preorder',
                    readyDate: '',
                    doneDate: '',
                    cancelDate: '',
                    linkedUnitCode: '',
                    linkedTransactionId: '',
                    createdAt: row.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                const preorders = loadPreorders();
                preorders.push(preorderRequest);
                savePreorders(preorders);
                queueRecordSupabaseSync('preorders', preorderRequest);
            }
        });

        const normalRows = savedRows.filter(row => !['service_masuk', 'service_keluar', 'service_cancel'].includes(row.category));
        const serviceRows = savedRows.filter(row => ['service_masuk', 'service_keluar', 'service_cancel'].includes(row.category));

        if (normalRows.length > 0) {
            const transactions = loadTransactions();
            transactions.push(...normalRows);
            saveTransactions(transactions);
            normalRows.forEach(applyTransactionStock);
            normalRows.forEach(row => queueSaleSupabaseSync(row));
        }

        serviceRows.forEach(row => {
            if (row.category === 'service_masuk') {
                const serviceOrders = loadServiceOrders();
                serviceOrders.push(row.serviceOrderData);
                saveServiceOrders(serviceOrders);
                queueRecordSupabaseSync('serviceOrders', row.serviceOrderData);
            } else if (row.category === 'service_keluar' || row.category === 'service_cancel') {
                const serviceOrders = loadServiceOrders();
                const idx = serviceOrders.findIndex(o => o.code === row.code);
                if (idx >= 0) {
                    serviceOrders[idx] = row.serviceOrderData;
                    saveServiceOrders(serviceOrders);
                    queueRecordSupabaseSync('serviceOrders', row.serviceOrderData);
                }
                if (row.category === 'service_keluar' || (row.category === 'service_cancel' && Number(row.serviceOrderData.paidAmount) > 0)) {
                    upsertServiceTransaction(row.serviceOrderData);
                } else if (row.category === 'service_cancel') {
                    removeServiceTransaction(row.serviceOrderData);
                }
            }
        });

        toast('Penjualan berhasil disimpan');

        let printedService = false;
        if (shouldPrint) {
            serviceRows.forEach(row => {
                if (row.category === 'service_masuk') {
                    showServiceReceipt(row.serviceOrderData, 'STRUK SERVICE MASUK');
                    printedService = true;
                } else if (row.category === 'service_keluar') {
                    showServiceReceipt(row.serviceOrderData, 'STRUK SERVICE KELUAR');
                    printedService = true;
                } else if (row.category === 'service_cancel') {
                    showServiceReceipt(row.serviceOrderData, 'STRUK SERVICE CANCEL');
                    printedService = true;
                }
            });
        }

        clearSalesDraft(activeSaleType, activeServiceSaleMode);
        if (isServiceMode()) {
            activeServiceCart = [];
        } else {
            activeSaleCart = [];
        }
        activeSaleCartEditId = '';
        activeLinkedPreorder = null;
        renderActiveSaleForm();
        renderDailyReport();
        refreshAllAdminPanels();

        if (shouldPrint && (!printedService || normalRows.length > 0)) {
            const receiptRows = normalRows.map(row => ({ ...row, receiptTotal: subtotal, receiptPaidAmount: paidAmount + dpTotal, receiptChangeAmount: changeAmount, receiptPaymentMethod: header.paymentMethod }));
            if (receiptRows.length > 0) {
                showTransactionReceipt(receiptRows, 'STRUK TRANSAKSI');
            }
        }
    }

    function validateCartSave(rows, header, subtotal) {
        if (!rows.length) return 'Keranjang masih kosong';
        if (!header.buyerName) return 'Nama pembeli wajib diisi';
        if (!header.buyerWa) return 'No. WA pembeli wajib diisi';
        const categories = new Set(rows.map(item => item.category));
        if (!header.paymentMethod) return 'Metode bayar wajib diisi';
        if (header.paymentMethod === 'split') {
            const splitTotal = (header.splitCash || 0) + (header.splitTransfer || 0) + (header.splitCredit || 0);
            let dpTotal = 0;
            rows.forEach(item => {
                if (item.preorderCode) {
                    const preorder = loadPreorders().find(p => p.code === item.preorderCode);
                    if (preorder) {
                        dpTotal += Number(preorder.dpAmount) || 0;
                    }
                }
            });
            const target = Math.max(0, subtotal - dpTotal);
            if (splitTotal !== target) return 'Split payment harus sama dengan sisa pelunasan';
        }
        const seenUnits = new Set();
        const accessoryNeeds = {};
        const accs = load(DB_KEYS.accessories);
        const addAccessoryNeed = (code, qty) => {
            if (!code || qty <= 0) return;
            accessoryNeeds[code] = (accessoryNeeds[code] || 0) + qty;
        };
        for (const row of rows) {
            if (!row.itemName) return 'Item penjualan wajib diisi';
            if (row.category === 'unit_iphone' || row.category === 'unit_android') {
                if (!row.stockRefCode) return 'Pilih unit dari stok ready';
                if (seenUnits.has(row.stockRefCode)) return `Unit ${row.stockRefCode} sudah dipilih`;
                seenUnits.add(row.stockRefCode);
                const bonusQty = bonusQuantityMap(row.bonusAccessories);
                for (const [code, qty] of Object.entries(bonusQty)) {
                    const acc = accs.find(a => a.code === code);
                    if (!acc) return `Bonus aksesoris ${code} tidak ditemukan`;
                    addAccessoryNeed(code, Number(qty) || 0);
                }
            }
            if (row.category === 'tukar_tambah') {
                if (!row.stockRefCode) return 'Pilih unit baru dari stok ready';
                if (seenUnits.has(row.stockRefCode)) return `Unit ${row.stockRefCode} sudah dipilih`;
                seenUnits.add(row.stockRefCode);
            }
            if (row.category === 'accessory') {
                const acc = accs.find(a => a.code === row.stockRefCode);
                if (!acc) return 'Pilih aksesoris dari stok';
                addAccessoryNeed(row.stockRefCode, Number(row.quantity) || 0);
            }
            if (!row.category.startsWith('service') && row.category !== 'service' && row.category !== 'tukar_tambah' && (row.sell || 0) <= 0) return 'Harga jual wajib lebih dari 0';
        }
        for (const [code, qty] of Object.entries(accessoryNeeds)) {
            const acc = accs.find(a => a.code === code);
            if (!acc) return `Aksesoris ${code} tidak ditemukan`;
            if (qty > (Number(acc.qty) || 0)) return `Stok aksesoris ${acc.name || code} hanya ${acc.qty}`;
        }
        if (categories.has('unit_iphone') || categories.has('unit_android')) {
            if (!header.buyerName) return 'Nama pembeli wajib diisi';
            if (!header.buyerWa) return 'No. WA pembeli wajib diisi';
        }
        return '';
    }

    function renderPreorderSaleFormHtml() {
        const modelOptions = PHONE_MODELS.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
        return `
            <div class="card">
                <div class="card-head"><h2>Pre Order</h2></div>
                ${renderBuyerFields()}
                <div class="form-grid">
                    <div class="field"><label>Nama Sales</label><select id="preorderSalesName" class="sales-employee-select">${getSalesEmployeeOptions()}</select></div>
                    <div class="field"><label>Request Unit</label><input type="text" id="preorderItemRequest" placeholder="Contoh: iPhone 13 128GB Midnight" required></div>
                </div>
                <div class="form-grid">
                    <div class="field"><label>Brand</label>
                        <input type="text" id="preorderBrand" list="preorderBrandDatalist" placeholder="Pilih atau ketik brand" required>
                        <datalist id="preorderBrandDatalist">
                            <option value="iPhone">
                            <option value="Android">
                            <option value="iPad">
                            <option value="Other">
                        </datalist>
                    </div>
                    <div class="field"><label>Model</label>
                        <input type="text" id="preorderModel" list="preorderModelDatalist" placeholder="Pilih atau ketik model" required>
                        <datalist id="preorderModelDatalist">
                            ${modelOptions}
                        </datalist>
                    </div>
                </div>
                <div class="form-grid">
                    <div class="field"><label>Storage</label>
                        <select id="preorderStorage">
                            <option value="">Pilih Storage</option>
                            <option value="32GB">32GB</option>
                            <option value="64GB">64GB</option>
                            <option value="128GB">128GB</option>
                            <option value="256GB">256GB</option>
                            <option value="512GB">512GB</option>
                            <option value="1TB">1TB</option>
                        </select>
                    </div>
                    <div class="field"><label>Warna</label><input type="text" id="preorderColor" placeholder="Contoh: Midnight, Gold, Silver"></div>
                </div>
                <div class="form-grid">
                    <div class="field"><label>Kondisi</label>
                        <select id="preorderCondition">
                            <option value="">Pilih Kondisi</option>
                            <option value="Baru (BNIB)">Baru (BNIB)</option>
                            <option value="Baru (BNOB)">Baru (BNOB)</option>
                            <option value="Second">Second</option>
                            <option value="Ex-Inter">Ex-Inter</option>
                        </select>
                    </div>
                    <div class="field"><label>Garansi</label><input type="text" id="preorderWarranty" placeholder="Contoh: iBox 1th, Inter, Distributor"></div>
                </div>
                <div class="field"><label>Catatan</label><textarea id="preorderNote" rows="3" placeholder="Catatan tambahan atau request khusus"></textarea></div>
                ${renderPaymentFields('Nominal DP Rp')}
                <div class="btn-row">
                    <button type="button" id="btnSavePreorderOnly" class="btn btn-ghost"><i class="ri-save-3-line"></i> Simpan Pre Order</button>
                    <button type="button" id="btnSavePreorder" class="btn btn-primary"><i class="ri-printer-line"></i> Simpan & Cetak</button>
                </div>
            </div>`;
    }

    function renderPreorderSaleForm() {
        $('salesFormMount').innerHTML = renderPreorderSaleFormHtml();
        bindSaleFormEvents();

        const preorderBrand = $('preorderBrand');
        if (preorderBrand) {
            preorderBrand.addEventListener('change', updatePreorderModelDatalist);
            preorderBrand.addEventListener('input', updatePreorderModelDatalist);
            updatePreorderModelDatalist();
        }

        $('btnSavePreorderOnly')?.addEventListener('click', () => savePreorderRequest(false));
        $('btnSavePreorder')?.addEventListener('click', () => savePreorderRequest(true));
    }

    function renderAccessorySaleForm() {
        const accs = load(DB_KEYS.accessories).filter(a => a.qty > 0);
        const options = accs.map(a => `<option value="${esc(a.code)}">${esc(formatAccessoryOptionText(a))}</option>`).join('');
        $('salesFormMount').innerHTML = `
            <div class="card">
                <div class="card-head"><h2>Aksesoris</h2></div>
                ${renderBuyerFields()}
                <div class="form-grid">
                    <div class="field"><label>Kode Aksesoris</label><select id="saleAccessoryCode"><option value="">Pilih aksesoris</option>${options}</select></div>
                    <div class="field"><label>Qty</label><input type="number" id="saleQuantity" min="1" value="1"></div>
                </div>
                <div class="field"><label>Nama Aksesoris</label><input type="text" id="saleItemName" readonly></div>
                ${renderPaymentFields()}
                <button type="button" id="btnSaveSale" class="btn btn-primary"><i class="ri-save-3-line"></i> Simpan Penjualan</button>
            </div>`;
        bindSaleFormEvents();
        updateSelectedAccessoryDetail();
    }

    function renderServiceSaleModeTabs() {
        return '';
    }

    function serviceOutcomeOptions() {
        return loadServiceOrders()
            .filter(order => order.status !== 'Selesai' && order.status !== 'Cancel')
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
            .map(order => `<option value="${esc(order.code)}">${esc(order.code)} | ${esc(order.buyerName || '-')} | ${esc(order.itemName || '-')}</option>`)
            .join('');
    }

    function renderServiceSaleFormHtml() {
        const isTesting = isTestingMode();
        if (activeServiceSaleMode === 'keluar' || activeServiceSaleMode === 'cancel') {
            const amountLabel = activeServiceSaleMode === 'keluar' ? 'Nominal Bayar User' : 'Biaya Cancel / Cek';
            const options = serviceOutcomeOptions();
            return `
                <div class="field mb-sm"><label>Kode Service</label><select id="saleServiceOrderCode"><option value="">Pilih kode service masuk</option>${options}</select></div>
                <div id="saleServiceOrderDetail" class="mini-panel text-sm text-dim" style="margin-bottom: 15px;">Pilih kode service untuk melihat user dan keluhan.</div>
                <div class="form-grid" style="margin-bottom: 15px;">
                    <div class="field"><label>${amountLabel}</label><input type="text" inputmode="numeric" id="saleServicePaymentAmount" placeholder="Rp"></div>
                    <div class="field"><label>Metode Bayar</label><select id="saleServicePaymentMethod"><option value="cash">Cash</option><option value="transfer">Transfer</option><option value="kredit">Kredit</option></select></div>
                </div>
                <div class="btn-row" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                    <button type="button" class="btn btn-ghost" onclick="closeSalesItemModal()">Batal</button>
                    ${isTesting ? `
                        <button type="button" id="btnSaveServiceOutcomeOnly" class="btn btn-ghost"><i class="ri-save-3-line"></i> Simpan</button>
                        <button type="button" id="btnSaveServiceOutcome" class="btn btn-primary"><i class="ri-printer-line"></i> Simpan & Cetak</button>
                    ` : `
                        <button type="button" id="btnSaveServiceOutcome" class="btn btn-primary" style="width: 100%;"><i class="ri-shopping-cart-2-line"></i> Masukkan ke Keranjang</button>
                        <button type="button" id="btnSaveServiceOutcomeOnly" style="display:none;"></button>
                    `}
                </div>`;
        }
        return `
            ${renderBuyerFields(true)}
            <div class="form-grid" style="margin-bottom: 15px;">
                <div class="field"><label>Barang / Unit</label><input type="text" id="saleServiceDevice" placeholder="Contoh: iPhone 11" required></div>
                <div class="field"><label>Keluhan</label><input type="text" id="saleServiceComplaint" placeholder="Contoh: LCD blank" required></div>
            </div>
            <div class="field" style="margin-bottom: 15px;"><label>Catatan</label><textarea id="saleServiceNote" rows="3" placeholder="Kelengkapan, kondisi fisik, password, atau catatan user"></textarea></div>
            <div class="btn-row" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                <button type="button" class="btn btn-ghost" onclick="closeSalesItemModal()">Batal</button>
                ${isTesting ? `
                    <button type="button" id="btnSaveServiceIntakeOnly" class="btn btn-ghost"><i class="ri-save-3-line"></i> Simpan</button>
                    <button type="button" id="btnSaveServiceIntake" class="btn btn-primary"><i class="ri-printer-line"></i> Simpan & Cetak</button>
                ` : `
                    <button type="button" id="btnSaveServiceIntake" class="btn btn-primary" style="width: 100%;"><i class="ri-shopping-cart-2-line"></i> Masukkan ke Keranjang</button>
                    <button type="button" id="btnSaveServiceIntakeOnly" style="display:none;"></button>
                `}
            </div>`;
    }

    function renderServiceSaleForm() {
        openSalesItemModal('service_' + activeServiceSaleMode);
    }

    function renderOtherSaleForm() {
        const others = load(DB_KEYS.otherCatalog);
        const options = others.map(o => `<option value="${esc(o.code)}">${esc(o.code)} | ${esc(o.name)} — ${fmtRp(o.sell)}</option>`).join('');
        const hasCatalog = others.length > 0;
        $('salesFormMount').innerHTML = `
            <div class="card">
                <div class="card-head"><h2>Lain-lain</h2></div>
                ${renderBuyerFields()}
                ${hasCatalog ? `<div class="form-grid">
                    <div class="field"><label>Pilih Item Katalog</label><select id="saleOtherCode"><option value="">— Ketik manual —</option>${options}</select></div>
                </div>` : ''}
                <div class="field"><label>Keterangan / Nama Item</label><input type="text" id="saleItemName" placeholder="Keterangan atau nama item" required></div>
                ${renderPaymentFields()}
                <button type="button" id="btnSaveSale" class="btn btn-primary"><i class="ri-save-3-line"></i> Simpan Penjualan</button>
            </div>`;
        bindSaleFormEvents();
        // auto-fill from catalog selection
        $('saleOtherCode')?.addEventListener('change', function () {
            const item = load(DB_KEYS.otherCatalog).find(o => o.code === this.value);
            if (item) {
                if ($('saleItemName')) $('saleItemName').value = item.name;
                if ($('saleSellPrice') && !$('saleSellPrice').value) setRpValue('saleSellPrice', item.sell);
            }
        });
    }

    function formatAccessoryOptionText(a) {
        if (!a) return '';
        const qty = Number(a.qty) || 0;
        if (qty <= 3) {
            return `${a.code} | ${a.name} | Stok ${qty} [Kritis! ⚠️]`;
        }
        return `${a.code} | ${a.name} | Stok ${qty}`;
    }

    function formatDeviceDisplayName(d) {
        if (!d) return '';
        let warrantyStr = '';
        const cond = (d.condition || '').toLowerCase();
        const w = (d.warranty || '').toUpperCase();

        if (w === 'BEA' || w === 'BEACUKAI') {
            warrantyStr = 'Beacukai';
        } else if (cond === 'bekas' || cond === 'second') {
            if (w === 'IBX') warrantyStr = 'Ex-Ibox';
            else if (w === 'INT') warrantyStr = 'Ex-Inter';
            else if (w === 'SEIN') warrantyStr = 'Ex-SEIN';
            else warrantyStr = w ? `Ex-${w}` : '';
        } else {
            if (w === 'IBX') warrantyStr = 'Resmi Ibox';
            else if (w === 'INT') warrantyStr = 'Inter';
            else if (w === 'SEIN') warrantyStr = 'Resmi SEIN';
            else warrantyStr = w ? `Garansi ${w}` : '';
        }

        const nameParts = [
            d.brand || '',
            d.model || '',
            d.storage || '',
            d.color ? `(${d.color})` : '',
            cond === 'new' ? 'New' : '',
            warrantyStr
        ].filter(Boolean);

        let priorityTag = '';
        if (d.status === 'Available' && d.purchaseDate) {
            const now = new Date();
            const parts = d.purchaseDate.split('-');
            if (parts.length === 3) {
                const pDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                now.setHours(0, 0, 0, 0);
                pDate.setHours(0, 0, 0, 0);
                const diffTime = now.getTime() - pDate.getTime();
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 30) {
                    priorityTag = ' [Prioritas Jual ⚡]';
                }
            }
        }

        return `${nameParts.join(' ')}${priorityTag} [${d.code}]`;
    }

    function updateSelectedUnitDetail() {
        const unitSelect = $('saleUnitCode');
        if (!unitSelect || !$('saleItemName')) return;
        const unit = load(DB_KEYS.devices).find(d => d.code === unitSelect.value);
        if (!unit) {
            $('saleItemName').value = '';
            return;
        }
        let warrantyStr = '';
        const cond = (unit.condition || '').toLowerCase();
        const w = (unit.warranty || '').toUpperCase();

        if (w === 'BEA' || w === 'BEACUKAI') {
            warrantyStr = 'Beacukai';
        } else if (cond === 'bekas' || cond === 'second') {
            if (w === 'IBX') warrantyStr = 'Ex-Ibox';
            else if (w === 'INT') warrantyStr = 'Ex-Inter';
            else if (w === 'SEIN') warrantyStr = 'Ex-SEIN';
            else warrantyStr = w ? `Ex-${w}` : '';
        } else {
            if (w === 'IBX') warrantyStr = 'Resmi Ibox';
            else if (w === 'INT') warrantyStr = 'Inter';
            else if (w === 'SEIN') warrantyStr = 'Resmi SEIN';
            else warrantyStr = w ? `Garansi ${w}` : '';
        }

        const parts = [
            unit.brand || '',
            unit.model || '',
            unit.storage || '',
            unit.color ? `Warna: ${unit.color}` : '',
            cond === 'new' ? 'New' : '',
            warrantyStr
        ].filter(Boolean);

        $('saleItemName').value = parts.join(' - ');
    }

    function updateSelectedPreorder() {
        const preorder = loadPreorders().find(item => item.code === $('salePreorderCode')?.value);
        if (!preorder) return;
        if ($('saleBuyerName')) $('saleBuyerName').value = preorder.buyerName || '';
        if ($('saleBuyerWa')) $('saleBuyerWa').value = preorder.buyerWa || '';
        if ($('saleSalesName') && !$('saleSalesName').value) $('saleSalesName').value = preorder.salesName || '';
        // Also sync to drawer fields if they exist
        if ($('saleDrawerBuyerName')) $('saleDrawerBuyerName').value = preorder.buyerName || '';
        if ($('saleDrawerBuyerWa')) $('saleDrawerBuyerWa').value = preorder.buyerWa || '';
        if ($('saleDrawerSalesName') && !$('saleDrawerSalesName').value) $('saleDrawerSalesName').value = preorder.salesName || '';
        saveSalesDraft();
    }

    function updateSelectedAccessoryDetail() {
        const accSelect = $('saleAccessoryCode');
        if (!accSelect || !$('saleItemName')) return;
        const acc = load(DB_KEYS.accessories).find(a => a.code === accSelect.value);
        if (!acc) {
            $('saleItemName').value = '';
            return;
        }
        $('saleItemName').value = acc.name || '';
        if (acc && $('saleSellPrice') && !$('saleSellPrice').value) setRpValue('saleSellPrice', acc.sell);
    }

    function updateSelectedServiceDetail() {
        const svcSelect = $('saleServiceCode');
        if (!svcSelect || !$('saleItemName')) return;
        const svc = load(DB_KEYS.serviceCatalog).find(s => s.code === svcSelect.value);
        if (!svc) {
            $('saleItemName').value = '';
            return;
        }
        $('saleItemName').value = svc.name || '';
        if ($('saleServiceFee')) $('saleServiceFee').value = svc.cost || 0;
        if (svc && $('saleSellPrice') && !$('saleSellPrice').value) setRpValue('saleSellPrice', svc.sell);
    }

    function updateSelectedServiceOrderDetail() {
        const detail = $('saleServiceOrderDetail');
        if (!detail) return;
        const order = loadServiceOrders().find(item => item.code === $('saleServiceOrderCode')?.value);
        if (!order) {
            detail.textContent = 'Pilih kode service untuk melihat user dan keluhan.';
            return;
        }
        detail.innerHTML = `
            <strong>${esc(order.code)} | ${esc(order.buyerName || '-')} | ${esc(order.buyerWa || '-')}</strong>
            <p>${esc(order.itemName || '-')} - ${esc(order.complaint || '-')}</p>
            <p>Status: ${esc(order.status || 'Masuk')}${order.technician ? ` | Teknisi: ${esc(order.technician)}` : ''}${order.processDate ? ` | Proses: ${esc(fmtDate(order.processDate))}` : ''}</p>`;
    }

    function toggleSplitPanel() {
        $('saleSplitPanel')?.classList.toggle('show', $('salePaymentMethod')?.value === 'split');
    }

    function bindSaleFormEvents() {
        $('saleCartType')?.addEventListener('change', event => {
            switchCartEditorType(event.target.value);
            if ($('salesItemModal')?.classList.contains('open')) {
                openSalesItemModal(event.target.value);
            } else {
                renderActiveSaleForm();
            }
        });
        $('saleUnitCode')?.addEventListener('change', updateSelectedUnitDetail);
        $('salePreorderCode')?.addEventListener('change', updateSelectedPreorder);
        $('saleAccessoryCode')?.addEventListener('change', updateSelectedAccessoryDetail);
        $('saleOtherCode')?.addEventListener('change', updateSelectedOtherDetail);
        $('saleServiceCode')?.addEventListener('change', updateSelectedServiceDetail);
        $('saleServiceOrderCode')?.addEventListener('change', updateSelectedServiceOrderDetail);
        $('salePaymentMethod')?.addEventListener('change', () => {
            saveSalesDraft();
            if ($('salesItemModal')?.classList.contains('open')) return;
            renderActiveSaleForm();
        });
        $('salePaidAmount')?.addEventListener('input', updateCartSummary);
        $('saleSplitCash')?.addEventListener('input', updateCartSummary);
        $('saleSplitTransfer')?.addEventListener('input', updateCartSummary);
        $('saleSplitCredit')?.addEventListener('input', updateCartSummary);
        $('btnAddCartItem')?.addEventListener('click', addCurrentCartItem);
        document.querySelectorAll('[data-cart-remove]').forEach(button => {
            button.addEventListener('click', () => removeCartItem(button.dataset.cartRemove || ''));
        });
        $('btnAddBonusAccessory')?.addEventListener('click', addBonusAccessoryRow);
        document.querySelectorAll('[data-remove-bonus-row]').forEach(button => {
            button.addEventListener('click', () => removeBonusAccessoryRow(Number(button.dataset.removeBonusRow) || 0));
        });
        $('btnNextTradeInSlide')?.addEventListener('click', () => {
            const slide1 = $('tradeInSlide1');
            const slide2 = $('tradeInSlide2');
            const indexSpan = $('tradeInSlideIndex');
            const unitCode = $('saleUnitCode')?.value;
            const sellPrice = cleanRp($('saleSellPrice')?.value);
            if (!unitCode) {
                toast('Pilih unit baru dari stok ready', 'err');
                return;
            }
            if (sellPrice <= 0) {
                toast('Harga jual unit baru wajib lebih dari 0', 'err');
                return;
            }
            if (slide1 && slide2) {
                slide1.style.display = 'none';
                slide2.style.display = 'block';
                if (indexSpan) indexSpan.textContent = '2';
            }
        });
        $('btnPrevTradeInSlide')?.addEventListener('click', () => {
            const slide1 = $('tradeInSlide1');
            const slide2 = $('tradeInSlide2');
            const indexSpan = $('tradeInSlideIndex');
            if (slide1 && slide2) {
                slide1.style.display = 'block';
                slide2.style.display = 'none';
                if (indexSpan) indexSpan.textContent = '1';
            }
        });
        // Swap Tipe HP Lama: select iPhone ↔ input teks Android
        $('tradeInUnitCategory')?.addEventListener('change', function () {
            const field = $('tradeInModelField');
            if (!field) return;
            const isIphone = this.value === 'iphone';
            const brandInput = $('tradeInBrand');
            if (isIphone) {
                if (brandInput) brandInput.value = 'Apple';
                const iphoneOptions = PHONE_MODELS.filter(m => m.startsWith('iPhone'))
                    .map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
                field.innerHTML = `<label>Tipe HP Lama</label><select id="tradeInModel" required>${iphoneOptions}</select>`;
            } else {
                if (brandInput && brandInput.value === 'Apple') brandInput.value = '';
                field.innerHTML = `<label>Tipe HP Lama</label><input type="text" id="tradeInModel" placeholder="Samsung S21 / Oppo A57" required>`;
            }
        });
        $('btnSaveSaleOnly')?.addEventListener('click', () => saveCurrentSale(false));
        $('btnSaveSale')?.addEventListener('click', () => saveCurrentSale(true));
        $('btnSaveServiceIntakeOnly')?.addEventListener('click', (e) => {
            if (document.body.classList.contains('testing-mode')) {
                saveServiceIntake(false);
            } else {
                addServiceIntakeToCart(e);
            }
        });
        $('btnSaveServiceIntake')?.addEventListener('click', (e) => {
            if (document.body.classList.contains('testing-mode')) {
                saveServiceIntake(true);
            } else {
                addServiceIntakeToCart(e);
            }
        });
        $('btnSaveServiceOutcomeOnly')?.addEventListener('click', (e) => {
            if (document.body.classList.contains('testing-mode')) {
                saveServiceOutcomeFromSales(false);
            } else {
                addServiceOutcomeToCart(e);
            }
        });
        $('btnSaveServiceOutcome')?.addEventListener('click', (e) => {
            if (document.body.classList.contains('testing-mode')) {
                saveServiceOutcomeFromSales(true);
            } else {
                addServiceOutcomeToCart(e);
            }
        });
        const jasaCategory = $('jasaCategory');
        if (jasaCategory) {
            jasaCategory.addEventListener('change', () => {
                const category = jasaCategory.value;
                const unitNameInput = $('jasaUnitName');
                if (unitNameInput) {
                    unitNameInput.value = '';
                    if (category === 'iphone') {
                        unitNameInput.setAttribute('list', 'jasaIphoneModelsList');
                        unitNameInput.placeholder = 'Contoh: iPhone 14 Pro';
                    } else {
                        unitNameInput.removeAttribute('list');
                        unitNameInput.placeholder = 'Contoh: Samsung Galaxy S23';
                    }
                }
            });
        }

        toggleSplitPanel();

        bindRpFormatter('saleSellPrice');
        bindRpFormatter('salePaidAmount');
        bindRpFormatter('saleSplitCash');
        bindRpFormatter('saleSplitTransfer');
        bindRpFormatter('saleSplitCredit');
        bindRpFormatter('tradeInCost');
        document.querySelectorAll('#salesFormMount input, #salesFormMount select, #salesFormMount textarea').forEach(field => {
            field.addEventListener('input', saveSalesDraft);
            field.addEventListener('change', saveSalesDraft);
        });
        document.querySelectorAll('#salesItemModalMount input, #salesItemModalMount select, #salesItemModalMount textarea').forEach(field => {
            field.addEventListener('input', saveSalesDraft);
            field.addEventListener('change', saveSalesDraft);
        });
    }

    function renderActiveSaleForm(skipModalOpen = false) {
        if (!$('salesFormMount')) return;
        syncSalesPageChrome();
        setupLegacyHiddenInputs();
        if (activeSaleType === 'order_jasa_monitoring') {
            renderImeiMonitoring();
            if (!skipModalOpen) {
                closeSalesItemModal();
            }
            return;
        }
        if (activeSaleType === 'order_jasa') {
            $('salesFormMount').innerHTML = '';
            if (!skipModalOpen) {
                closeSalesItemModal();
            }
            return;
        }

        if (activeSaleType.startsWith('service') || activeSaleType === 'service') {
            $('salesFormMount').innerHTML = ''; // Clear main page form to avoid ID conflicts
            if (activeSaleType.startsWith('service_')) {
                activeServiceSaleMode = activeSaleType.replace('service_', '');
            }
            if (!skipModalOpen && activeSaleType.startsWith('service_')) {
                renderServiceSaleForm();
            } else if (!skipModalOpen) {
                closeSalesItemModal();
            }
            restoreSalesDraft();
            return;
        }
        if (!CART_ITEM_TYPES.includes(activeSaleCartType) || (activeSaleCartType === 'preorder_dp' && activeSaleType !== 'preorder')) {
            activeSaleCartType = defaultCartTypeForSaleType(activeSaleType);
        }
        
        const isTesting = isTestingMode();
        if (isTesting) {
            renderSalesCartForm(activeSaleType === 'preorder' ? 'unit_iphone' : activeSaleType);
        } else {
            $('salesFormMount').innerHTML = ''; // hidden from main page
        }
        
        restoreSalesDraft();
        updateHeaderCartBadge();
    }

    function collectCurrentSale() {
        const sellInput = cleanRp($('saleSellPrice')?.value);
        const paymentMethod = $('salePaymentMethod')?.value || 'cash';
        const tx = {
            id: newTransactionId(),
            date: $('saleDate')?.value || today(),
            shift: $('saleShift')?.value || 'shift pagi & malam',
            category: activeSaleType,
            code: '',
            itemName: ($('saleItemName')?.value || '').trim(),
            condition: '',
            buyerName: ($('saleBuyerName')?.value || '').trim(),
            buyerWa: normalizePhoneWa($('saleBuyerWa')?.value || ''),
            quantity: Number($('saleQuantity')?.value) || 1,
            sell: sellInput,
            cost: 0,
            fee: 0,
            paymentMethod,
            splitCash: cleanRp($('saleSplitCash')?.value),
            splitTransfer: cleanRp($('saleSplitTransfer')?.value),
            splitCredit: cleanRp($('saleSplitCredit')?.value),
            stockRefCode: '',
            preorderCode: ($('salePreorderCode')?.value || '').trim(),
            technician: '',
            salesName: ($('saleSalesName')?.value || '').trim(),
            bonusAccessories: [],
            bonusCost: 0,
            createdAt: new Date().toISOString(),
        };

        if (activeSaleType === 'unit_iphone' || activeSaleType === 'unit_android') {
            const unit = load(DB_KEYS.devices).find(d => d.code === $('saleUnitCode')?.value);
            if (unit) {
                tx.code = unit.code;
                tx.itemName = $('saleItemName')?.value ? $('saleItemName').value.trim() : `${unit.brand || ''} ${unit.model || ''} ${unit.storage || ''} ${unit.color || ''}`.trim();
                tx.condition = unit.condition || '';
                tx.cost = Number(unit.cost) || 0;
                tx.stockRefCode = unit.code;
                tx.warranty = unit.warranty || '';
                tx.imei = unit.imei || '';
            }
            const preorder = loadPreorders().find(item => item.code === tx.preorderCode);
            if (preorder) {
                tx.preorderBuyerName = preorder.buyerName || '';
                tx.preorderRequestedItem = preorder.requestedItem || '';
            }
            tx.bonusAccessories = collectBonusAccessories();
            tx.bonusCost = tx.bonusAccessories.reduce((sum, item) => sum + ((Number(item.cost) || 0) * (Number(item.quantity) || 0)), 0);
        }

        if (activeSaleType === 'accessory') {
            const acc = load(DB_KEYS.accessories).find(a => a.code === $('saleAccessoryCode')?.value);
            if (acc) {
                tx.code = acc.code;
                tx.itemName = acc.name || '';
                tx.cost = (Number(acc.cost) || 0) * tx.quantity;
                tx.sell = sellInput * tx.quantity;
                tx.stockRefCode = acc.code;
            }
        }

        if (activeSaleType === 'service' || activeSaleType.startsWith('service')) {
            const svc = load(DB_KEYS.serviceCatalog).find(s => s.code === $('saleServiceCode')?.value);
            if (svc) {
                tx.code = svc.code;
                tx.itemName = svc.name || '';
                tx.fee = Number($('saleServiceFee')?.value) || 0;
                tx.technician = $('saleTechnician')?.value || '';
            }
        }

        return tx;
    }

    function validateTransaction(tx) {
        if (!tx.date) return 'Tanggal wajib diisi';
        if (!tx.buyerName) return 'Nama pembeli wajib diisi';
        if (!tx.buyerWa) return 'No. WA pembeli wajib diisi';
        if (!tx.itemName) return 'Item penjualan wajib diisi';
        if (tx.sell <= 0) return 'Harga jual wajib lebih dari 0';
        if (tx.paymentMethod === 'split' && transactionPaymentTotal(tx) !== tx.sell) return 'Split payment harus sama dengan harga jual';
        if ((tx.category === 'unit_iphone' || tx.category === 'unit_android') && !tx.stockRefCode) return 'Pilih unit dari stok ready';
        if (tx.category === 'unit_iphone' || tx.category === 'unit_android') {
            const qtyByCode = bonusQuantityMap(tx.bonusAccessories);
            const accs = load(DB_KEYS.accessories);
            for (const [code, qty] of Object.entries(qtyByCode)) {
                const acc = accs.find(a => a.code === code);
                if (!acc) return `Bonus aksesoris ${code} tidak ditemukan`;
                if (qty > (Number(acc.qty) || 0)) return `Stok bonus ${acc.name || code} hanya ${acc.qty}`;
            }
        }
        if (tx.category === 'accessory') {
            const acc = load(DB_KEYS.accessories).find(a => a.code === tx.stockRefCode);
            if (!acc) return 'Pilih aksesoris dari stok';
            if (tx.quantity > (Number(acc.qty) || 0)) return `Stok aksesoris hanya ${acc.qty}`;
        }
        return '';
    }

    function applyTransactionStock(tx) {
        if (tx.category === 'unit_iphone' || tx.category === 'unit_android') {
            const devices = load(DB_KEYS.devices);
            const unit = devices.find(d => d.code === tx.stockRefCode);
            if (unit) {
                unit.status = 'Sold';
                unit.soldDate = tx.date;
                unit.soldPrice = tx.sell;
            }
            save(DB_KEYS.devices, devices);
            adjustBonusAccessoryStock(tx.bonusAccessories, -1);
        }
        if (tx.category === 'tukar_tambah') {
            const devices = load(DB_KEYS.devices);
            const unit = devices.find(d => d.code === tx.stockRefCode);
            if (unit) {
                unit.status = 'Sold';
                unit.soldDate = tx.date;
                unit.soldPrice = tx.newUnitSellPrice;
            }
            if (tx.tradeInBrand && tx.tradeInModel) {
                const oldCategory = tx.tradeInUnitCategory || (String(tx.tradeInBrand).toLowerCase().includes('iphone') || String(tx.tradeInModel).toLowerCase().includes('iphone') || String(tx.tradeInBrand).toLowerCase().includes('apple') ? 'iphone' : 'android');
                const oldDevice = {
                    code: tx.tradeInCode,
                    category: oldCategory,
                    brand: tx.tradeInBrand,
                    model: tx.tradeInModel,
                    storage: tx.tradeInStorage || '128GB',
                    color: tx.tradeInColor || 'Grey',
                    condition: tx.tradeInCondition || 'Bekas',
                    acquisition: 'TT',
                    warranty: tx.tradeInWarranty || 'INT',
                    supplier: 'Tukar Tambah',
                    purchaseDate: tx.date,
                    cost: Number(tx.tradeInCost) || 0,
                    status: 'Available',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    imei: tx.tradeInImei || '',
                };
                if (!devices.some(d => d.code === tx.tradeInCode)) {
                    devices.push(oldDevice);
                    queueRecordSupabaseSync('devices', oldDevice);
                }
            }
            save(DB_KEYS.devices, devices);
            adjustBonusAccessoryStock(tx.bonusAccessories || [], -1);
        }
        if (tx.category === 'accessory') {
            const accs = load(DB_KEYS.accessories);
            const acc = accs.find(a => a.code === tx.stockRefCode);
            if (acc) acc.qty = Math.max(0, (Number(acc.qty) || 0) - tx.quantity);
            save(DB_KEYS.accessories, accs);
        }
        if (tx.preorderCode) {
            markPreorderDone(tx.preorderCode, tx.stockRefCode || tx.code || '', tx.id);
        }
    }

    function markPreorderDone(code, linkedUnitCode, linkedTransactionId) {
        const preorders = loadPreorders();
        const preorder = preorders.find(item => item.code === code);
        if (!preorder) return;
        preorder.status = 'Done';
        preorder.doneDate = today();
        preorder.linkedUnitCode = linkedUnitCode || '';
        preorder.linkedTransactionId = linkedTransactionId || '';
        preorder.updatedAt = new Date().toISOString();
        savePreorders(preorders);
        queueRecordSupabaseSync('preorders', preorder);
    }

    function markPreorderReadyAgain(code) {
        const preorders = loadPreorders();
        const preorder = preorders.find(item => item.code === code);
        if (!preorder) return;
        preorder.status = 'Ready';
        preorder.doneDate = '';
        preorder.linkedTransactionId = '';
        preorder.updatedAt = new Date().toISOString();
        savePreorders(preorders);
        queueRecordSupabaseSync('preorders', preorder);
    }

    function collectPreorderRequest() {
        const dpAmount = cleanRp(formValue('saleSellPrice'));
        const paymentMethod = formValue('salePaymentMethod') || 'cash';
        return {
            code: nextPreorderCode(),
            date: $('saleDate')?.value || today(),
            shift: $('saleShift')?.value || 'shift pagi & malam',
            buyerName: formValue('saleBuyerName').trim(),
            buyerWa: normalizePhoneWa(formValue('saleBuyerWa')),
            salesName: formValue('preorderSalesName').trim(),
            requestedItem: formValue('preorderItemRequest').trim(),
            brand: formValue('preorderBrand').trim(),
            model: formValue('preorderModel').trim(),
            storage: formValue('preorderStorage').trim(),
            color: formValue('preorderColor').trim(),
            condition: formValue('preorderCondition').trim(),
            warranty: formValue('preorderWarranty').trim(),
            note: formValue('preorderNote').trim(),
            dpAmount,
            paymentMethod,
            splitCash: cleanRp(formValue('saleSplitCash')),
            splitTransfer: cleanRp(formValue('saleSplitTransfer')),
            splitCredit: cleanRp(formValue('saleSplitCredit')),
            cost: 0,
            status: 'Preorder',
            readyDate: '',
            doneDate: '',
            cancelDate: '',
            linkedUnitCode: '',
            linkedTransactionId: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }

    function preorderPaymentTotal(preorder) {
        if (preorder.paymentMethod === 'split') {
            return (Number(preorder.splitCash) || 0) + (Number(preorder.splitTransfer) || 0) + (Number(preorder.splitCredit) || 0);
        }
        return Number(preorder.dpAmount) || 0;
    }

    function validatePreorderRequest(preorder) {
        if (!preorder.date) return 'Tanggal preorder wajib diisi';
        if (!preorder.buyerName) return 'Nama pembeli wajib diisi';
        if (!preorder.buyerWa) return 'No. WA pembeli wajib diisi';
        if (!preorder.requestedItem) return 'Request unit wajib diisi';
        if (preorder.dpAmount <= 0) return 'Nominal DP wajib lebih dari 0';
        if (preorder.paymentMethod === 'split' && preorderPaymentTotal(preorder) !== preorder.dpAmount) return 'Split payment DP harus sama dengan nominal DP';
        return '';
    }

    function preorderDpTransaction(preorder) {
        const pm = preorder.paymentMethod || 'cash';
        const dp = Number(preorder.dpAmount) || 0;
        return {
            id: newTransactionId(),
            date: preorder.date,
            shift: preorder.shift,
            category: 'preorder_dp',
            code: preorder.code,
            itemName: `DP Pre Order - ${preorder.requestedItem}`,
            condition: '',
            buyerName: preorder.buyerName,
            buyerWa: preorder.buyerWa,
            salesName: preorder.salesName,
            quantity: 1,
            sell: dp,
            cost: 0,
            fee: 0,
            paymentMethod: pm,
            splitCash: pm === 'split' ? (preorder.splitCash || 0) : (pm === 'cash' ? dp : 0),
            splitTransfer: pm === 'split' ? (preorder.splitTransfer || 0) : (pm === 'transfer' ? dp : 0),
            splitCredit: pm === 'split' ? (preorder.splitCredit || 0) : (pm === 'kredit' ? dp : 0),
            stockRefCode: '',
            preorderCode: preorder.code,
            technician: '',
            bonusAccessories: [],
            bonusCost: 0,
            createdAt: new Date().toISOString(),
        };
    }

    function savePreorderRequest(shouldPrint = true) {
        const preorder = collectPreorderRequest();
        const error = validatePreorderRequest(preorder);
        if (error) {
            toast(error, 'err');
            return;
        }
        const tx = preorderDpTransaction(preorder);
        const preorders = loadPreorders();
        preorders.push(preorder);
        savePreorders(preorders);
        const transactions = loadTransactions();
        transactions.push(tx);
        saveTransactions(transactions);
        queueRecordSupabaseSync('preorders', preorder);
        queueSaleSupabaseSync(tx);
        toast(`Pre order ${preorder.code} disimpan`);
        clearSalesDraft('preorder');
        closeSalesItemModal();
        activeSaleType = 'unit_iphone';
        renderActiveSaleForm();
        renderDailyReport();
        refreshAllAdminPanels();
        if (shouldPrint) {
            showTransactionReceipt(tx, 'STRUK DP PREORDER');
        }
    }

    function collectServiceIntake() {
        const sparepartCost = cleanRp($('saleServiceSparepartCost')?.value || 0);
        const serviceFee = cleanRp($('saleServiceFee')?.value || 0);
        const technicianCost = sparepartCost + serviceFee;
        return {
            code: nextServiceOrderCode(),
            dateIn: $('saleDate')?.value || today(),
            shift: $('saleShift')?.value || 'shift pagi & malam',
            buyerName: ($('saleBuyerName')?.value || '').trim(),
            buyerWa: normalizePhoneWa($('saleBuyerWa')?.value || ''),
            itemName: ($('saleServiceDevice')?.value || '').trim(),
            complaint: ($('saleServiceComplaint')?.value || '').trim(),
            note: ($('saleServiceNote')?.value || '').trim(),
            technician: '',
            processDate: '',
            status: 'Masuk',
            paymentStatus: 'Belum dibayar',
            paidAmount: 0,
            paymentMethod: '',
            splitCash: 0,
            splitTransfer: 0,
            splitCredit: 0,
            cancelAmount: 0,
            cancelDate: '',
            sparepartCost,
            serviceFee,
            technicianCost,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }


    // ── PREMIUM CART & CHECKOUT LOGIC IMPLEMENTATION ─────────
    
    function setupLegacyHiddenInputs() {
        const container = $('legacySalesHiddenContainer');
        if (!container) return;
        if (isTestingMode() || isServiceMode()) {
            container.innerHTML = '';
            return;
        }
        if (container.children.length > 0) return;
        container.innerHTML = `
            <input type="hidden" id="saleBuyerName" value="">
            <input type="hidden" id="saleBuyerWa" value="">
            <input type="hidden" id="saleSalesName" value="">
            <select id="salePaymentMethod" style="display:none;">
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
                <option value="kredit">Kredit</option>
                <option value="split">Split</option>
            </select>
            <input type="hidden" id="salePaidAmount" value="">
            <input type="hidden" id="saleSplitCash" value="0">
            <input type="hidden" id="saleSplitTransfer" value="0">
            <input type="hidden" id="saleSplitCredit" value="0">
        `;
    }

    function updateHeaderCartBadge() {
        const badge = $('headerCartCount');
        if (badge) {
            const cart = isServiceMode() ? activeServiceCart : activeSaleCart;
            badge.textContent = cart.length;
            badge.style.display = cart.length > 0 ? 'inline-block' : 'none';
        }
    }

    function animateFlyToCart(sourceX, sourceY) {
        const cartBtn = $('btnHeaderCart');
        if (!cartBtn) return;
        const targetRect = cartBtn.getBoundingClientRect();
        const targetX = targetRect.left + targetRect.width / 2;
        const targetY = targetRect.top + targetRect.height / 2;

        const el = document.createElement('div');
        el.className = 'fly-cart-item';
        el.style.left = `${sourceX}px`;
        el.style.top = `${sourceY}px`;
        document.body.appendChild(el);

        // trigger reflow
        el.offsetWidth;

        el.style.transform = `translate(${targetX - sourceX}px, ${targetY - sourceY}px) scale(0.2)`;
        el.style.opacity = '0.3';

        setTimeout(() => {
            el.remove();
            const badge = $('headerCartCount');
            if (badge) {
                badge.classList.remove('bounce');
                void badge.offsetWidth; // trigger reflow
                badge.classList.add('bounce');
            }
        }, 800);
    }

    function checkPaymentValidity(subtotal, method) {
        const target = cartPaymentTarget();
        if (method === 'cash') {
            const paid = cleanRp($('salePaidAmount')?.value || '0');
            return paid >= target;
        } else if (method === 'split') {
            const splitCash = cleanRp($('saleSplitCash')?.value || '0');
            const splitTransfer = cleanRp($('saleSplitTransfer')?.value || '0');
            const splitCredit = cleanRp($('saleSplitCredit')?.value || '0');
            return (splitCash + splitTransfer + splitCredit) === target;
        }
        return true;
    }

    function renderCartDrawer() {
        const mount = $('salesCartModalMount');
        if (!mount) return;

        const cart = isServiceMode() ? activeServiceCart : activeSaleCart;

        const titleEl = document.querySelector('#salesCartModal h3');
        if (titleEl) {
            titleEl.innerHTML = isServiceMode() 
                ? `<i class="ri-shopping-cart-2-line"></i> Keranjang Service` 
                : `<i class="ri-shopping-cart-2-line"></i> Keranjang Belanja`;
        }

        const subtotal = cartTotals(cart).subtotal;
        const totalQty = cartTotals(cart).qty;

        if (cart.length === 0) {
            mount.innerHTML = `
                <div class="empty-cart-state" style="text-align: center; padding: 40px 20px;">
                    <i class="ri-shopping-cart-2-line" style="font-size: 48px; color: var(--text-dim); opacity: 0.5;"></i>
                    <p style="margin-top: 15px; color: var(--text-dim);">Keranjang belanja kosong</p>
                </div>`;
            return;
        }

        const rows = cart.map((item, index) => {
            const detailHtml = item.category === 'tukar_tambah'
                ? `<div class="text-xxs" style="color: var(--text-dim); margin-top: 2px;">
                       Dijual: <span class="mono">${fmtRp(item.newUnitSellPrice || 0)}</span> | Ditarik: <span class="mono">-${fmtRp(item.tradeInCost || 0)}</span>
                   </div>`
                : '';
            return `
            <tr data-cart-item-id="${esc(item.id)}">
                <td class="mono text-xs">${index + 1}</td>
                <td class="text-xs">
                    <div><strong>${esc(cartItemTypeLabel(item.category))}</strong></div>
                    <div class="text-dim text-xxs">${esc(item.itemName || '-')}</div>
                    ${detailHtml}
                </td>
                <td class="mono text-xs">${esc(item.quantity || 1)}</td>
                <td class="mono text-xs">${fmtRp(item.sell || 0)}</td>
                <td>
                    <button type="button" class="btn-del btn-xs" data-cart-drawer-remove="${esc(item.id)}">
                        <i class="ri-delete-bin-6-line"></i>
                    </button>
                </td>
            </tr>
        `;
        }).join('');

        const hasTradeIn = cart.some(item => item.category === 'tukar_tambah');
        let subtotalLabel = 'Subtotal';
        let subtotalColor = 'var(--primary-light)';
        let displaySubtotal = subtotal;

        if (hasTradeIn) {
            if (subtotal < 0) {
                subtotalLabel = 'Selisih Kembalian (Kasir Berikan)';
                subtotalColor = 'var(--success)';
                displaySubtotal = Math.abs(subtotal);
            } else {
                subtotalLabel = 'Selisih Bayar Tambah (Pelanggan Bayar)';
            }
        }

        const itemsTableHtml = `
            <div class="mini-panel">
                <div class="flex-between mb-sm" style="border-bottom: 1px solid var(--border); padding-bottom: 6px;">
                    <span class="text-xs font-semibold">Review Item</span>
                    <span class="text-xs text-dim">${cart.length} item</span>
                </div>
                <div class="table-wrap">
                    <table class="report-table" style="width: 100%;">
                        <thead>
                            <tr>
                                <th style="font-size: 11px; padding: 6px;">#</th>
                                <th style="font-size: 11px; padding: 6px;">Item</th>
                                <th style="font-size: 11px; padding: 6px;">Qty</th>
                                <th style="font-size: 11px; padding: 6px;">Harga</th>
                                <th style="font-size: 11px; padding: 6px;"></th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div class="flex-between mt-sm text-xs">
                    <span>Total Qty</span>
                    <strong>${totalQty}</strong>
                </div>
                ${cartPreorderDpTotal() > 0 ? `
                <div class="flex-between text-xs text-dim">
                    <span>Subtotal</span>
                    <span>${fmtRp(subtotal)}</span>
                </div>
                <div class="flex-between text-xs text-dim">
                    <span>DP Terbayar</span>
                    <span style="color: var(--danger); font-weight: 600;">-${fmtRp(cartPreorderDpTotal())}</span>
                </div>
                <div class="flex-between text-sm">
                    <span>Sisa Pelunasan</span>
                    <strong style="color: var(--primary-light); font-size: 16px;">${fmtRp(cartPaymentTarget())}</strong>
                </div>
                ` : `
                <div class="flex-between text-sm">
                    <span>${subtotalLabel}</span>
                    <strong style="color: ${subtotalColor}; font-size: 16px;">${fmtRp(displaySubtotal)}</strong>
                </div>
                `}
            </div>`;

        let draft = null;
        try {
            draft = JSON.parse(localStorage.getItem(salesDraftKey()) || 'null');
        } catch {
            draft = null;
        }
        const fields = draft?.fields || {};

        const draftBuyerName = fields.saleDrawerBuyerName || fields.saleBuyerName || $('saleBuyerName')?.value || cart.find(item => item.buyerName)?.buyerName || '';
        const draftBuyerWa = fields.saleDrawerBuyerWa || fields.saleBuyerWa || $('saleBuyerWa')?.value || cart.find(item => item.buyerWa)?.buyerWa || '';
        const draftSalesName = fields.saleDrawerSalesName || fields.saleSalesName || $('saleSalesName')?.value || '';

        const buyerFieldsHtml = `
            <div class="mini-panel mt-md">
                <div class="flex-between mb-xs" style="border-bottom: 1px solid var(--border); padding-bottom: 6px;">
                    <span class="text-xs font-semibold">Informasi Pelanggan</span>
                </div>
                <div class="field mb-sm">
                    <label class="text-xs">Nama Pembeli <span style="color: var(--danger); font-weight: 700;">*</span></label>
                    <input type="text" id="saleDrawerBuyerName" placeholder="Nama pembeli / user" required value="${esc(draftBuyerName)}">
                </div>
                <div class="field mb-sm">
                    <label class="text-xs">No. WA Pembeli <span style="color: var(--danger); font-weight: 700;">*</span></label>
                    <input type="tel" id="saleDrawerBuyerWa" placeholder="08xxxxxxxxxx" required value="${esc(draftBuyerWa)}">
                </div>
                <div class="field">
                    <label class="text-xs">Nama Sales</label>
                    <select id="saleDrawerSalesName" class="sales-employee-select">
                        ${getSalesEmployeeOptions(draftSalesName)}
                    </select>
                </div>
            </div>`;

        const method = fields.saleDrawerPaymentMethod || fields.salePaymentMethod || $('salePaymentMethod')?.value || 'cash';
        const targetPayment = cartPaymentTarget();
        let paidValue = '';
        if (targetPayment <= 0) {
            paidValue = '0';
        } else {
            const rawDraftPaid = fields.saleDrawerPaidAmount || fields.salePaidAmount || $('salePaidAmount')?.value || '';
            const numDraftPaid = cleanRp(rawDraftPaid);
            if (numDraftPaid >= targetPayment && numDraftPaid <= targetPayment * 10) {
                paidValue = rawDraftPaid;
            } else {
                paidValue = fmtRp(targetPayment).replace('Rp ', '');
            }
        }
        const drawerChange = (method === 'cash') ? Math.max(0, cleanRp(paidValue) - targetPayment) : 0;
        const showReceived = method === 'cash' || method === 'split';
        
        const draftCreditAgent = fields.saleDrawerCreditAgent || fields.saleDrawerSplitCreditAgent || fields.saleCreditAgent || $('saleDrawerCreditAgent')?.value || $('saleDrawerSplitCreditAgent')?.value || '';
        const splitCreditVal = fields.saleDrawerSplitCredit || fields.saleSplitCredit || $('saleDrawerSplitCredit')?.value || '0';
        
        const option = (val, label) => `<option value="${val}" ${method === val ? 'selected' : ''}>${label}</option>`;
        const paymentFieldsHtml = `
            <div class="mini-panel mt-md transition-fade" id="drawerPaymentPanel" style="${checkoutStage === 'payment' ? '' : 'display: none;'}">
                <div class="flex-between mb-xs" style="border-bottom: 1px solid var(--border); padding-bottom: 6px;">
                    <span class="text-xs font-semibold"><i class="ri-cash-line"></i> Rincian Pembayaran</span>
                </div>
                <div class="form-grid ${showReceived ? 'cols-2' : (method === 'kredit' ? 'cols-2' : 'cols-1')} mb-sm">
                    <div class="field">
                        <label class="text-xs">Metode Bayar</label>
                        <select id="saleDrawerPaymentMethod">
                            ${option('cash', 'Cash')}
                            ${option('transfer', 'Transfer')}
                            ${option('kredit', 'Kredit')}
                            ${option('split', 'Split')}
                        </select>
                    </div>
                    ${method === 'cash' ? `
                    <div class="field">
                        <label class="text-xs">Uang Diterima</label>
                        <input type="text" inputmode="numeric" id="saleDrawerPaidAmount" placeholder="Rp" value="${esc(paidValue)}">
                    </div>` : ''}
                    ${method === 'kredit' ? `
                    <div class="field" id="saleDrawerCreditAgentWrapper">
                        <label class="text-xs">Leasing / Agen Kredit <span style="color: var(--primary); font-weight: 700;">*</span></label>
                        <input type="text" id="saleDrawerCreditAgent" list="creditAgentDatalist" placeholder="Pilih / ketik leasing (Kredivo, SPayLater...)" value="${esc(draftCreditAgent)}" style="font-size: 13px;">
                    </div>` : ''}
                </div>
                
                ${method === 'cash' ? `
                <div class="flex-between mb-sm bg-accent" style="padding: 10px; border-radius: var(--radius-sm); background: var(--bg-body); border: 1px solid var(--border);">
                    <span class="text-xs">Kembalian</span>
                    <strong style="color: var(--success); font-size: 15px;">${fmtRp(drawerChange)}</strong>
                </div>` : ''}

                ${method === 'split' ? `
                <div class="split-row show mb-sm" id="saleDrawerSplitPanel" style="background: var(--bg-body); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px;">
                    <div class="field"><label class="text-xs">Cash Rp</label><input type="text" inputmode="numeric" id="saleDrawerSplitCash" value="${esc(fields.saleDrawerSplitCash || fields.saleSplitCash || $('saleSplitCash')?.value || '0')}"></div>
                    <div class="field"><label class="text-xs">Transfer Rp</label><input type="text" inputmode="numeric" id="saleDrawerSplitTransfer" value="${esc(fields.saleDrawerSplitTransfer || fields.saleSplitTransfer || $('saleSplitTransfer')?.value || '0')}"></div>
                    <div class="field"><label class="text-xs">Kredit Rp</label><input type="text" inputmode="numeric" id="saleDrawerSplitCredit" value="${esc(fields.saleDrawerSplitCredit || fields.saleSplitCredit || $('saleSplitCredit')?.value || '0')}"></div>
                    <div class="field" id="saleDrawerSplitCreditAgentWrapper" style="${cleanRp(splitCreditVal) > 0 ? '' : 'display: none;'}">
                        <label class="text-xs">Leasing / Agen Kredit <span style="color: var(--primary); font-weight: 700;">*</span></label>
                        <input type="text" id="saleDrawerSplitCreditAgent" list="creditAgentDatalist" placeholder="Pilih / ketik leasing (Kredivo, SPayLater, Akulaku...)" value="${esc(draftCreditAgent)}" style="font-size: 13px;">
                    </div>
                </div>` : ''}
                <datalist id="creditAgentDatalist">
                    <option value="Kredivo">
                    <option value="SPayLater">
                    <option value="Akulaku">
                    <option value="Home Credit">
                    <option value="Indodana">
                </datalist>
            </div>`;

        let actionButtonsHtml = '';
        if (checkoutStage === 'items') {
            actionButtonsHtml = `
                <div class="mt-lg">
                    <button type="button" id="btnDrawerSelesaikanPembayaran" class="btn btn-primary w-full py-md text-sm" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;">
                        <i class="ri-check-double-line"></i> Selesaikan Pembayaran
                    </button>
                </div>`;
        } else {
            const isPaymentValid = checkPaymentValidity(cartPaymentTarget(), method);
            actionButtonsHtml = `
                <div class="mt-lg flex-col gap-sm" style="display: flex; flex-direction: column; gap: 10px;">
                    <button type="button" id="btnDrawerBackToItems" class="btn btn-ghost w-full py-sm text-xs" style="width: 100%;">
                        <i class="ri-arrow-left-line"></i> Ubah Item / Data Pelanggan
                    </button>
                    <button type="button" id="btnDrawerSubmitCheckout" class="btn btn-success w-full py-md text-sm" ${isPaymentValid ? '' : 'disabled'} style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%;">
                        <i class="ri-check-double-line"></i> Pembayaran Diterima
                    </button>
                </div>`;
        }

        mount.innerHTML = `
            <div style="display: flex; flex-direction: column; height: 100%; justify-content: space-between;">
                <div style="flex: 1;">
                    ${itemsTableHtml}
                    ${checkoutStage === 'items' ? buyerFieldsHtml : ''}
                    ${paymentFieldsHtml}
                </div>
                ${actionButtonsHtml}
            </div>`;

        bindDrawerEvents();
    }

    function bindDrawerEvents() {
        document.querySelectorAll('[data-cart-drawer-remove]').forEach(btn => {
            btn.addEventListener('click', () => {
                removeCartItem(btn.dataset.cartDrawerRemove);
                renderCartDrawer();
                updateHeaderCartBadge();
            });
        });

        const buyerNameInput = $('saleDrawerBuyerName');
        if (buyerNameInput) {
            buyerNameInput.addEventListener('input', () => {
                if ($('saleBuyerName')) $('saleBuyerName').value = buyerNameInput.value;
                saveSalesDraft();
            });
        }

        const buyerWaInput = $('saleDrawerBuyerWa');
        if (buyerWaInput) {
            buyerWaInput.addEventListener('input', () => {
                if ($('saleBuyerWa')) $('saleBuyerWa').value = buyerWaInput.value;
                saveSalesDraft();
            });
        }

        const salesNameInput = $('saleDrawerSalesName');
        if (salesNameInput) {
            const syncSales = () => {
                if ($('saleSalesName')) $('saleSalesName').value = salesNameInput.value;
                saveSalesDraft();
            };
            salesNameInput.addEventListener('change', syncSales);
            salesNameInput.addEventListener('input', syncSales);
        }

        const methodSelect = $('saleDrawerPaymentMethod');
        if (methodSelect) {
            methodSelect.addEventListener('change', () => {
                if ($('salePaymentMethod')) {
                    $('salePaymentMethod').value = methodSelect.value;
                    $('salePaymentMethod').dispatchEvent(new Event('change'));
                }
                saveSalesDraft();
                renderCartDrawer();
            });
        }

        const paidInput = $('saleDrawerPaidAmount');
        if (paidInput) {
            bindRpFormatter('saleDrawerPaidAmount');
            paidInput.addEventListener('input', () => {
                if ($('salePaidAmount')) {
                    $('salePaidAmount').value = paidInput.value;
                    $('salePaidAmount').dispatchEvent(new Event('input'));
                }
                saveSalesDraft();
                
                const target = cartPaymentTarget();
                const paid = cleanRp(paidInput.value || '0');
                const change = Math.max(0, paid - target);
                
                const changeValEl = document.querySelector('#salesCartModalMount .bg-accent strong');
                if (changeValEl) changeValEl.textContent = fmtRp(change);

                const submitBtn = $('btnDrawerSubmitCheckout');
                if (submitBtn) submitBtn.disabled = (paid < target);
            });
        }

        ['Cash', 'Transfer', 'Credit'].forEach(s => {
            const drawerSplit = $('saleDrawerSplit' + s);
            const legacySplit = $('saleSplit' + s);
            if (drawerSplit && legacySplit) {
                bindRpFormatter('saleDrawerSplit' + s);
                drawerSplit.addEventListener('input', () => {
                    legacySplit.value = drawerSplit.value;
                    legacySplit.dispatchEvent(new Event('input'));
                    saveSalesDraft();

                    const target = cartPaymentTarget();
                    const splitCash = cleanRp($('saleDrawerSplitCash')?.value || '0');
                    const splitTransfer = cleanRp($('saleDrawerSplitTransfer')?.value || '0');
                    const splitCredit = cleanRp($('saleDrawerSplitCredit')?.value || '0');
                    const isSplitValid = (splitCash + splitTransfer + splitCredit) === target;
                    const submitBtn = $('btnDrawerSubmitCheckout');
                    if (submitBtn) submitBtn.disabled = !isSplitValid;

                    const creditAgentWrapper = $('saleDrawerSplitCreditAgentWrapper');
                    if (creditAgentWrapper) {
                        creditAgentWrapper.style.display = (splitCredit > 0) ? '' : 'none';
                    }
                });
            }
        });

        const drawerCreditAgent = $('saleDrawerCreditAgent');
        if (drawerCreditAgent) {
            drawerCreditAgent.addEventListener('input', () => {
                if ($('saleCreditAgent')) $('saleCreditAgent').value = drawerCreditAgent.value;
                saveSalesDraft();
            });
        }
        const drawerSplitCreditAgent = $('saleDrawerSplitCreditAgent');
        if (drawerSplitCreditAgent) {
            drawerSplitCreditAgent.addEventListener('input', () => {
                if ($('saleCreditAgent')) $('saleCreditAgent').value = drawerSplitCreditAgent.value;
                saveSalesDraft();
            });
        }

        $('btnDrawerSelesaikanPembayaran')?.addEventListener('click', () => {
            const name = ($('saleDrawerBuyerName')?.value || '').trim();
            const wa = ($('saleDrawerBuyerWa')?.value || '').trim();
            
            if (!name) { toast('Nama pembeli / user wajib diisi', 'err'); return; }
            if (!wa) { toast('No. WA pembeli wajib diisi', 'err'); return; }

            checkoutStage = 'payment';
            renderCartDrawer();
        });

        $('btnDrawerBackToItems')?.addEventListener('click', () => {
            checkoutStage = 'items';
            renderCartDrawer();
        });

        $('btnDrawerSubmitCheckout')?.addEventListener('click', () => {
            showPaymentConfirmPopup();
        });
    }

    function showPaymentConfirmPopup() {
        const popup = $('paymentConfirmPopup');
        if (!popup) {
            // Fallback if DOM element missing: save directly
            $('salesCartModal')?.classList.remove('open');
            saveCartSale(true);
            return;
        }
        popup.innerHTML = `
            <div class="payment-confirm-box">
                <div class="confirm-icon"><i class="ri-checkbox-circle-line"></i></div>
                <h3>Pembayaran telah selesai?</h3>
                <p>Data penjualan akan disimpan ke sistem dan struk akan dicetak.</p>
                <div class="confirm-actions">
                    <button type="button" id="btnConfirmPaymentNo" class="btn btn-ghost"><i class="ri-close-line"></i> Tidak</button>
                    <button type="button" id="btnConfirmPaymentYes" class="btn btn-success"><i class="ri-check-line"></i> Ya</button>
                </div>
            </div>`;
        popup.style.display = 'flex';

        $('btnConfirmPaymentYes')?.addEventListener('click', () => {
            popup.style.display = 'none';
            popup.innerHTML = '';
            $('salesCartModal')?.classList.remove('open');
            saveCartSale(true);
        });

        $('btnConfirmPaymentNo')?.addEventListener('click', () => {
            popup.style.display = 'none';
            popup.innerHTML = '';
        });

        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.style.display = 'none';
                popup.innerHTML = '';
            }
        });
    }

    // ── ORDER IMEI MONITORING & ADMIN STATUS FUNCTIONS ─────
    function renderImeiMonitoring() {
        const mount = document.querySelector('#page-sales.active') ? $('salesFormMount') : ($('imeiMonitoringMount') || $('salesFormMount'));
        if (!mount) return;
        
        const transactions = loadTransactions();
        const imeiOrders = transactions.filter(tx => tx.category === 'order_jasa' || tx.category === 'order_jasa_beacukai');
        
        let html = `
            <div class="card">
                <div class="card-head flex-between">
                    <h2><i class="ri-radar-line" style="color:var(--primary-light);"></i> Monitoring Status IMEI</h2>
                    <span class="text-xs text-dim">${imeiOrders.length} order ditemukan</span>
                </div>
                
                <div style="margin: 16px 0;">
                    <input type="text" id="searchImeiMonitoring" placeholder="Cari IMEI, nama user, unit..." style="width: 100%; border-radius: 8px; padding: 10px 12px; border: 1px solid var(--border-color, #e2e8f0); background: var(--bg-card); color: var(--text-color, #0f172a);">
                </div>
                
                <div id="imeiMonitoringTableBody" class="stock-accordion-list" style="margin-top: 12px;">
                    ${renderImeiMonitoringRows(imeiOrders)}
                </div>
            </div>
        `;
        
        mount.innerHTML = html;
        
        // Bind search event
        $('searchImeiMonitoring')?.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = imeiOrders.filter(tx => 
                `${tx.code || ''} ${tx.buyerName || ''} ${tx.buyerWa || ''} ${tx.jasaUnitName || ''} ${tx.imei || tx.jasaImei || ''} ${tx.jasaNote || ''} ${tx.salesName || ''}`
                .toLowerCase().includes(query)
            );
            const tbody = $('imeiMonitoringTableBody');
            if (tbody) tbody.innerHTML = renderImeiMonitoringRows(filtered);
        });
    }
    
    function renderImeiMonitoringRows(orders) {
        if (!orders.length) {
            return `<div class="empty-state-text text-dim" style="text-align: center; padding: 24px; background:#fff; border-radius: var(--r-sm); border:1px dashed var(--border);">Tidak ada data order IMEI</div>`;
        }
        
        const sorted = [...orders].sort((a, b) => {
            const dateA = a.date + ' ' + (a.createdAt || '');
            const dateB = b.date + ' ' + (b.createdAt || '');
            return dateB.localeCompare(dateA);
        });
        
        return sorted.map(tx => {
            let status = tx.status || tx.serviceStatus || 'Masuk';
            if (status === 'On-progress') status = 'On Progress';
            if (status === 'Done') status = 'Selesai';

            let badgeClass = 'badge-secondary';
            const lowerStatus = status.toLowerCase();
            if (lowerStatus === 'on-progress' || lowerStatus === 'on progress') {
                badgeClass = 'badge-warning';
            } else if (lowerStatus === 'done' || lowerStatus === 'selesai') {
                badgeClass = 'badge-success';
            }
            
            const isBeacukai = tx.category === 'order_jasa_beacukai';
            const serviceTitle = isBeacukai ? 'IMEI Bea Cukai' : 'Order IMEI';
            const title = `${esc(tx.buyerName || 'User')} — ${esc(tx.jasaUnitName || serviceTitle)}`;

            return `
                <div class="stock-accordion-card" id="monitoring-card-${esc(tx.id)}">
                    <div class="stock-card-header" onclick="toggleStockCard(this)">
                        <div class="stock-card-header-left">
                            <span class="stock-card-code">${esc(tx.code || (isBeacukai ? 'BC' : 'OI'))}</span>
                            <span class="stock-card-title">${title}</span>
                        </div>
                        <div class="stock-card-header-right">
                            <span class="badge ${badgeClass}">${esc(status)}</span>
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
                                <span class="stock-detail-label">Nama Pelanggan</span>
                                <span class="stock-detail-val font-bold">${esc(tx.buyerName || '-')}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">No. WA Pelanggan</span>
                                <span class="stock-detail-val mono">${esc(tx.buyerWa || '-')}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Merek / Kategori</span>
                                <span class="stock-detail-val" style="text-transform: capitalize;">${esc(tx.jasaCategory || 'iPhone')}</span>
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
                                <span class="stock-detail-val mono font-bold">${esc(tx.imei || tx.jasaImei || '-')}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Harga Jual</span>
                                <span class="stock-detail-val font-bold text-success">${esc(fmtRp(tx.sell || 0))}</span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Status Order</span>
                                <span class="stock-detail-val"><span class="badge ${badgeClass}">${esc(status)}</span></span>
                            </div>
                            <div class="stock-detail-item">
                                <span class="stock-detail-label">Sales</span>
                                <span class="stock-detail-val">${esc(tx.salesName || '-')}</span>
                            </div>
                            <div class="stock-detail-item" style="grid-column: 1 / -1;">
                                <span class="stock-detail-label">Keterangan</span>
                                <span class="stock-detail-val">${esc(tx.jasaNote || '-')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
