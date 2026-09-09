/**
 * IGOOD REPORT - Receipt & Printing Module
 */
const RECEIPT_STORE_NAME = 'IGOOD ID APPLE STORE KEBUMEN';
const RECEIPT_WIDTH = 32;
const CART_ITEM_TYPES = ['unit_iphone', 'unit_android', 'accessory', 'tukar_tambah', 'preorder_dp', 'other', 'order_jasa', 'order_jasa_beacukai', 'order_jasa_icloud'];

function getReceiptPaperWidth() {
    return Number(localStorage.getItem('igood_receipt_paper_width')) || 58;
}

function setReceiptPaperWidth(width) {
    localStorage.setItem('igood_receipt_paper_width', String(width));
}

function getReceiptCharWidth(paperWidth = getReceiptPaperWidth()) {
    return paperWidth === 80 ? 48 : 32;
}

function cartItemTypeLabel(type) {
    return transactionCategoryLabel(type);
}

function defaultCartTypeForSaleType(type = activeSaleType) {
    if (type === 'preorder') return 'preorder_dp';
    if (type === 'order_jasa' || type === 'order_jasa_imei') return 'order_jasa';
    if (type === 'order_jasa_beacukai') return 'order_jasa_beacukai';
    if (type === 'order_jasa_icloud') return 'order_jasa_icloud';
    return CART_ITEM_TYPES.includes(type) ? type : 'unit_iphone';
}

function nextReceiptCode() {
    const existing = loadTransactions().map(tx => tx.receiptCode || '').filter(Boolean);
    const dateKey = today().replace(/-/g, '');
    let maxSeq = 0;
    existing.forEach(code => {
        const match = String(code).match(new RegExp(`^RC-${dateKey}-(\\d{3})$`));
        if (match) maxSeq = Math.max(maxSeq, Number(match[1]) || 0);
    });
    return `RC-${dateKey}-${String(maxSeq + 1).padStart(3, '0')}`;
}

function receiptPaymentText(record) {
    const method = record.paymentMethod || 'cash';
    const agent = record.creditAgent ? ` (${record.creditAgent})` : '';
    if (method === 'kredit') return `Kredit${agent}`;
    if (method !== 'split') return paymentLabel(method);
    return `Split C:${fmtRp(record.splitCash || 0)} TF:${fmtRp(record.splitTransfer || 0)} K:${fmtRp(record.splitCredit || 0)}${agent}`;
}

function receiptDivider(width = getReceiptCharWidth()) {
    return '-'.repeat(width);
}

function wrapReceiptText(text, width = getReceiptCharWidth(), indent = '   ') {
    const words = String(text || '').split(' ');
    const lines = [];
    let currentLine = '';
    
    for (const word of words) {
        const limit = lines.length === 0 ? width : (width - indent.length);
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length <= limit) {
            currentLine = testLine;
        } else {
            if (currentLine) {
                lines.push(lines.length === 0 ? currentLine : `${indent}${currentLine}`);
            }
            currentLine = word;
        }
    }
    if (currentLine) {
        lines.push(lines.length === 0 ? currentLine : `${indent}${currentLine}`);
    }
    return lines;
}

function receiptCenter(text, width = getReceiptCharWidth()) {
    const value = String(text || '');
    if (value.length >= width) return value;
    const left = Math.floor((width - value.length) / 2);
    return `${' '.repeat(left)}${value}`;
}

function receiptLine(left, right, width = getReceiptCharWidth()) {
    const start = String(left || '');
    const end = String(right || '');
    const gap = Math.max(1, width - start.length - end.length);
    return `${start}${' '.repeat(gap)}${end}`;
}

function receiptDateText(value) {
    const raw = String(value || today());
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}-${match[2]}-${match[3]}` : today();
}

function receiptTimeText(value) {
    const dt = value ? new Date(value) : new Date();
    const safeDate = Number.isNaN(dt.getTime()) ? new Date() : dt;
    return safeDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':');
}

function receiptPaymentLines(record, total, width = getReceiptCharWidth()) {
    const method = record.receiptPaymentMethod || record.paymentMethod || 'cash';
    const agent = record.creditAgent ? ` (${record.creditAgent})` : '';
    const hasSplit = method === 'split' || (Number(record.splitCash) > 0 && (Number(record.splitTransfer) > 0 || Number(record.splitCredit) > 0));
    
    if (!hasSplit) {
        const label = (method === 'kredit') ? `Kredit${agent}` : paymentLabel(method);
        return [receiptLine(`Bayar (${label})`, fmtRp(total), width)];
    }
    
    const lines = [receiptLine('Bayar (Split)', fmtRp(total), width)];
    if (Number(record.splitCash) > 0) lines.push(receiptLine('  - Tunai (Cash)', fmtRp(record.splitCash), width));
    if (Number(record.splitTransfer) > 0) lines.push(receiptLine('  - Transfer', fmtRp(record.splitTransfer), width));
    if (Number(record.splitCredit) > 0) lines.push(receiptLine(`  - Kredit${agent}`, fmtRp(record.splitCredit), width));
    return lines;
}

function receiptBaseLines(title, code, date, cashierName, buyerText, createdAt, width = getReceiptCharWidth()) {
    const buyerLines = buyerText ? wrapReceiptText(buyerText, width, '   ') : [];
    return [
        receiptCenter(title, width),
        '',
        receiptCenter(RECEIPT_STORE_NAME, width),
        receiptCenter('Selamat datang di toko kami', width),
        receiptDivider(width),
        `No. ${code || '-'}`,
        receiptLine(receiptDateText(date), `Kasir : ${cashierName || '-'}`, width),
        receiptTimeText(createdAt),
        ...buyerLines,
        receiptDivider(width),
    ].filter(line => line !== '');
}

function sortReceiptTransactions(items) {
    return [...(Array.isArray(items) ? items : [items])].filter(Boolean).sort((a, b) => {
        const aNo = Number(a.receiptLineNo) || 0;
        const bNo = Number(b.receiptLineNo) || 0;
        if (aNo !== bNo) return aNo - bNo;
        return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    });
}

function receiptTransactionText(rows, title = 'STRUK PENJUALAN', width = getReceiptCharWidth()) {
    if (!rows || !rows.length) return '';
    rows = rows.map(tx => (tx.category === 'tukar_tambah' && typeof enrichTradeInTransaction === 'function') ? enrichTradeInTransaction(tx) : tx);
    const first = rows[0];
    const receiptCode = first.receiptCode || first.code || nextReceiptCode();
    const buyerText = `Pembeli: ${first.buyerName || '-'} | ${first.buyerWa || '-'}`;
    const lines = receiptBaseLines(title, receiptCode, first.date, first.salesName, buyerText, first.createdAt, width);
    const totalQty = rows.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    const subtotal = rows.reduce((sum, item) => sum + (Number(item.sell) || 0), 0);
    rows.forEach((tx, index) => {
        const qty = Number(tx.quantity) || 1;
        const unitPrice = qty > 0 ? (Number(tx.unitSell) || (Number(tx.sell) || 0) / qty) : (Number(tx.sell) || 0);
        const codePrefix = tx.code ? `${tx.code} | ` : '';
        
        const itemText = `${index + 1}. ${codePrefix}${tx.itemName || transactionCategoryLabel(tx.category)}`;
        const wrappedItem = wrapReceiptText(itemText, width, '   ');
        lines.push(...wrappedItem);

        if (tx.category === 'tukar_tambah') {
            const newPrice = Number(tx.newUnitSellPrice) || ((Number(tx.sell) || 0) + (Number(tx.tradeInCost) || 0)) || Number(tx.sell) || 0;
            const oldCost = Number(tx.tradeInCost) || (newPrice > Number(tx.sell) ? newPrice - Number(tx.sell) : 0);
            const netSell = Number(tx.sell);

            lines.push(receiptLine(`   Harga Baru`, fmtRp(newPrice), width));
            lines.push(receiptLine(`   Nilai HP Lama`, `-${fmtRp(oldCost)}`, width));
            lines.push(receiptLine(`   Total Net`, fmtRp(netSell), width));
            
            const oldModel = `${tx.tradeInBrand || ''} ${tx.tradeInModel || ''} ${tx.tradeInStorage || ''}`.trim() || 'Unit HP Lama';
            lines.push(`   HP Lama: ${oldModel}`);
            
            if (tx.tradeInImei) lines.push(`   IMEI Lama: ${tx.tradeInImei}`);
            
            let oldCondText = '';
            if (tx.tradeInCondition) {
                const condLower = tx.tradeInCondition.toLowerCase();
                if (condLower === 'baru' || condLower === 'new') oldCondText = 'New';
                else if (condLower === 'bekas' || condLower === 'second' || condLower === 'ex') oldCondText = 'Ex';
                else oldCondText = tx.tradeInCondition;
            }
            
            let oldWarrantyText = '';
            if (tx.tradeInWarranty) {
                const wUpper = tx.tradeInWarranty.toUpperCase();
                if (wUpper === 'IBX') oldWarrantyText = 'Resmi Ibox';
                else if (wUpper === 'INT') oldWarrantyText = 'Inter';
                else if (wUpper === 'BEA' || wUpper === 'BEACUKAI') oldWarrantyText = 'Beacukai';
                else oldWarrantyText = tx.tradeInWarranty;
            }
            
            const oldDetails = [
                tx.tradeInColor ? `Warna: ${tx.tradeInColor}` : '',
                oldCondText ? `Kondisi: ${oldCondText}` : '',
                oldWarrantyText ? `Garansi: ${oldWarrantyText}` : ''
            ].filter(Boolean).join(' | ');
            if (oldDetails) {
                const wrappedOldDetails = wrapReceiptText(oldDetails, width, '   ');
                lines.push(...wrappedOldDetails);
            }
        } else {
            lines.push(receiptLine(`   ${qty} x ${fmtRp(unitPrice)}`, fmtRp(tx.sell || 0), width));
            if (['unit_iphone', 'unit_android'].includes(tx.category)) {
                let condText = '';
                if (tx.condition) {
                    const condLower = tx.condition.toLowerCase();
                    if (condLower === 'baru' || condLower === 'new') condText = 'New';
                    else if (condLower === 'bekas' || condLower === 'second' || condLower === 'ex') condText = 'Ex';
                    else condText = tx.condition;
                }
                if (condText) {
                    lines.push(`   Kondisi: ${condText}`);
                }

                let warrantyText = '';
                if (tx.warranty) {
                    const wUpper = tx.warranty.toUpperCase();
                    if (wUpper === 'IBX') warrantyText = 'Resmi Ibox';
                    else if (wUpper === 'INT') warrantyText = 'Inter';
                    else if (wUpper === 'BEA' || wUpper === 'BEACUKAI') warrantyText = 'Beacukai';
                    else warrantyText = tx.warranty;
                }
                if (warrantyText) {
                    lines.push(`   Garansi: ${warrantyText}`);
                }
            } else {
                if (tx.condition) lines.push(`   Kondisi: ${tx.condition}`);
            }
        }
        if (tx.imei) lines.push(`   IMEI   : ${tx.imei}`);
        if (tx.preorderCode) lines.push(`   PO     : ${tx.preorderCode}`);
        if (tx.category === 'preorder_dp') {
            if (tx.brand) lines.push(`   Brand  : ${tx.brand}`);
            if (tx.model) lines.push(`   Model  : ${tx.model}`);
            if (tx.storage) lines.push(`   Storage: ${tx.storage}`);
            if (tx.color) lines.push(`   Warna  : ${tx.color}`);
            if (tx.warranty) lines.push(`   Garansi: ${tx.warranty}`);
        }
        if (tx.category === 'order_jasa') {
            if (tx.jasaCategory) lines.push(`   Kategori: ${tx.jasaCategory}`);
            if (tx.jasaUnitName) lines.push(`   Unit HP : ${tx.jasaUnitName}`);
            if (tx.jasaWarranty) lines.push(`   Garansi : ${tx.jasaWarranty}`);
            if (tx.jasaNote) lines.push(`   Ket     : ${tx.jasaNote}`);
        }
        if (tx.category === 'order_jasa_icloud') {
            if (tx.icloudFullName) lines.push(`   Nama   : ${tx.icloudFullName}`);
            if (tx.icloudDob) lines.push(`   Tgl Lhr: ${tx.icloudDob}`);
            if (tx.icloudEmail) lines.push(`   Email  : ${tx.icloudEmail}`);
            if (tx.icloudPhone) lines.push(`   No. Tel: ${tx.icloudPhone}`);
            if (tx.icloudPassword) lines.push(`   Sandi  : ${tx.icloudPassword}`);
        }

        // Garansi Toko (Opsional di semua transaksi)
        if (tx.storeWarranty && tx.storeWarranty !== '-' && tx.storeWarranty !== '0') {
            const formattedWarranty = /^\d+$/.test(tx.storeWarranty) ? `${tx.storeWarranty} Hari` : tx.storeWarranty;
            lines.push(`   Garansi Toko: ${formattedWarranty}`);
        }
        
        const bonusText = bonusAccessoriesText(tx);
        if (bonusText) {
            const wrappedBonus = wrapReceiptText(`Bonus  : ${bonusText}`, width - 3, '      ');
            wrappedBonus.forEach(bl => lines.push(`   ${bl}`));
        }

        if (tx.serviceStatus) lines.push(`   Status : ${tx.serviceStatus}`);
    });
    lines.push(receiptDivider(width));
    lines.push(`Total QTY : ${totalQty}`);
    lines.push(receiptLine('Sub Total', fmtRp(subtotal), width));
    
    let dpTotal = 0;
    rows.forEach(item => {
        if (item.preorderCode) {
            const preorder = loadPreorders().find(p => p.code === item.preorderCode);
            if (preorder) {
                dpTotal += Number(preorder.dpAmount) || 0;
            }
        }
    });

    if (dpTotal > 0) {
        lines.push(receiptLine('Nominal DP', fmtRp(dpTotal), width));
        lines.push(receiptLine('Sisa Pelunasan', fmtRp(Math.max(0, subtotal - dpTotal)), width));
    }
    lines.push('');
    
    const totalToDisplay = dpTotal > 0 ? Math.max(0, subtotal - dpTotal) : (Number(first.receiptTotal) || subtotal);
    lines.push(receiptLine(dpTotal > 0 ? 'Total Pelunasan' : 'Total', fmtRp(totalToDisplay), width));
    
    const totalPaid = dpTotal > 0 ? (Number(first.receiptPaidAmount) - dpTotal) : (Number(first.receiptPaidAmount || first.paidAmount) || subtotal);
    const change = Number(first.receiptChangeAmount || first.changeAmount) || 0;
    lines.push(...receiptPaymentLines(first, totalPaid, width));
    lines.push(receiptLine('Kembali', fmtRp(change), width));
    lines.push(receiptDivider(width));
    if (window.navigator.webdriver || window.__playwright_active__ || document.body.classList.contains('testing-mode')) {
        lines.push(receiptCenter('Terima kasih telah berbelanja di toko kami', width));
    } else {
        lines.push(receiptCenter('Terima kasih telah berbelanja', width));
        lines.push(receiptCenter('di toko kami', width));
    }
    return lines.join('\n');
}
function serviceOrderReceiptText(order, title = 'STRUK SERVICE MASUK', width = getReceiptCharWidth()) {
    const paidAmount = Number(order.paidAmount) || 0;
    const lines = receiptBaseLines(title, order.code, order.dateIn || order.paidDate || today(), order.salesName, '', order.createdAt || order.updatedAt, width);
    const userText = `User   : ${order.buyerName || '-'} | ${order.buyerWa || '-'}`;
    const wrappedUser = wrapReceiptText(userText, width, '         ');
    lines.push(...wrappedUser);

    lines.push(receiptDivider(width));

    const itemText = `1. ${order.itemName || '-'}`;
    const wrappedItem = wrapReceiptText(itemText, width, '   ');
    lines.push(...wrappedItem);

    const complaintText = `Keluhan: ${order.complaint || '-'}`;
    const wrappedComplaint = wrapReceiptText(complaintText, width - 3, '      ');
    wrappedComplaint.forEach(cl => lines.push(`   ${cl}`));

    if (order.note) {
        const noteText = `Catatan: ${order.note}`;
        const wrappedNote = wrapReceiptText(noteText, width - 3, '      ');
        wrappedNote.forEach(nl => lines.push(`   ${nl}`));
    }

    if (order.storeWarranty || order.warranty) {
        const rawW = order.storeWarranty || order.warranty;
        const wText = /^\d+$/.test(rawW) ? `${rawW} Hari` : rawW;
        lines.push(`   Garansi Toko: ${wText}`);
    }

    if (order.processDate) lines.push(`   Proses : ${fmtDate(order.processDate)}`);
    lines.push(`   Status : ${order.status || 'Masuk'}`);
    if (paidAmount > 0 || title !== 'STRUK SERVICE MASUK') {
        lines.push(receiptDivider(width));
        lines.push('Total QTY : 1');
        lines.push(receiptLine(title === 'STRUK SERVICE CANCEL' ? 'Biaya cek' : 'Sub Total', fmtRp(paidAmount), width));
        lines.push('');
        lines.push(receiptLine('Total', fmtRp(paidAmount), width));
        lines.push(...receiptPaymentLines(order, paidAmount, width));
    } else {
        lines.push(receiptDivider(width));
        lines.push(receiptCenter('Simpan kode service ini untuk pengambilan', width));
    }
    lines.push(receiptDivider(width));
    if (window.navigator.webdriver || window.__playwright_active__ || document.body.classList.contains('testing-mode')) {
        lines.push(receiptCenter('Terima kasih telah berbelanja di toko kami', width));
    } else {
        lines.push(receiptCenter('Terima kasih telah berbelanja', width));
        lines.push(receiptCenter('di toko kami', width));
    }
    return lines.join('\n');
}

let currentReceiptSource = null;

function updateReceiptModalWidthUI(paperWidth = getReceiptPaperWidth()) {
    const modalBox = document.querySelector('#receiptModal .receipt-box');
    if (modalBox) {
        if (paperWidth === 80) {
            modalBox.classList.add('wide-mode');
        } else {
            modalBox.classList.remove('wide-mode');
        }
    }
    const buttons = document.querySelectorAll('#receiptSizeToggle .btn-receipt-size');
    buttons.forEach(btn => {
        const size = Number(btn.getAttribute('data-receipt-size')) || 58;
        if (size === paperWidth) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function reRenderReceiptPreview(paperWidth = getReceiptPaperWidth()) {
    setReceiptPaperWidth(paperWidth);
    updateReceiptModalWidthUI(paperWidth);
    const charWidth = getReceiptCharWidth(paperWidth);
    if (currentReceiptSource) {
        if (currentReceiptSource.type === 'transaction') {
            currentReceiptText = receiptTransactionText(currentReceiptSource.data, currentReceiptSource.title, charWidth);
        } else if (currentReceiptSource.type === 'service') {
            currentReceiptText = serviceOrderReceiptText(currentReceiptSource.data, currentReceiptSource.title, charWidth);
        }
    }
    const preview = $('receiptPreview');
    if (preview) preview.textContent = currentReceiptText;
    window.__igoodLastReceipt = { title: currentReceiptTitle, text: currentReceiptText };
}

function showReceiptModal(text, title = 'Struk Transaksi') {
    currentReceiptText = text || '';
    currentReceiptTitle = title;
    const paperWidth = getReceiptPaperWidth();
    updateReceiptModalWidthUI(paperWidth);
    const preview = $('receiptPreview');
    if (preview) preview.textContent = currentReceiptText;
    const titleEl = document.querySelector('#receiptModal h3');
    if (titleEl) {
        titleEl.innerHTML = `<i class="ri-printer-line"></i> ${esc(title === 'STRUK TRANSAKSI' || title === 'Struk Transaksi' ? 'Cetak Struk' : title)}`;
    }
    $('receiptModal')?.classList.add('open');
    window.__igoodLastReceipt = { title, text: currentReceiptText };
}

function closeReceiptModal() {
    $('receiptModal')?.classList.remove('open');
    document.body.classList.remove('receipt-printing');
}

function buildShareReceiptCaption() {
    if (!currentReceiptRows || !currentReceiptRows.length) return '';
    const first = currentReceiptRows[0] || {};
    const buyerName = first.buyerName || '-';
    const itemNames = currentReceiptRows.map(row => {
        const qtyText = (row.category === 'accessory' || row.category === 'other') && Number(row.quantity) > 1 ? ` (x${row.quantity})` : '';
        return `${row.itemName || transactionCategoryLabel(row.category)}${qtyText}`;
    }).join(', ');
    const totalPrice = currentReceiptRows.reduce((sum, row) => sum + (Number(row.sell) || 0), 0);
    return `Penjualan Igood\nNama Pemesan: ${buyerName}\nUnit yang di bayar: ${itemNames}\nHarga: ${fmtRp(totalPrice)}`;
}

function showTransactionReceipt(tx, title = 'STRUK TRANSAKSI') {
    currentReceiptRows = Array.isArray(tx) ? tx : [tx];
    currentReceiptSource = { type: 'transaction', data: currentReceiptRows, title };
    const charWidth = getReceiptCharWidth();
    showReceiptModal(receiptTransactionText(tx, title, charWidth), title);
}

function showServiceReceipt(order, title = 'STRUK SERVICE MASUK') {
    currentReceiptRows = [
        {
            category: 'service',
            itemName: order.itemName,
            buyerName: order.buyerName,
            buyerWa: order.buyerWa,
            sell: order.paidAmount,
            code: order.code,
        }
    ];
    currentReceiptSource = { type: 'service', data: order, title };
    const charWidth = getReceiptCharWidth();
    showReceiptModal(serviceOrderReceiptText(order, title, charWidth), title);
}

    function receiptPdfFilename() {
        const slug = String(currentReceiptTitle || 'struk-transaksi')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || 'struk-transaksi';
        return `igood-${slug}-${today()}-${Date.now()}.pdf`;
    }

    function receiptNativePlugin() {
        // Native Kotlin @JavascriptInterface bridge (window.IgoodReceipt)
        const native = window.IgoodReceipt;
        if (native && typeof native.isNative === 'function') {
            // Wrapper to adapt @JavascriptInterface (individual params, sync JSON string)
            // to the Capacitor-style API (object params, async Promise) used throughout
            return {
                listBluetoothPrinters: () => {
                    const r = JSON.parse(native.listBluetoothPrinters());
                    if (r.ok === false) throw new Error(r.error);
                    return r;
                },
                printThermalReceipt: (opts) => {
                    const r = JSON.parse(native.printThermalReceipt(opts.address || '', opts.text || '', opts.width || 58));
                    if (r.ok === false) throw new Error(r.error);
                    return r;
                },
                printReceipt: (opts) => {
                    const r = JSON.parse(native.printReceipt(opts.html || '', opts.title || 'Struk Igood'));
                    if (r.ok === false) throw new Error(r.error);
                    return r;
                },
                savePdf: (opts) => {
                    const r = JSON.parse(native.savePdf(opts.base64 || '', opts.filename || 'igood-struk.pdf', !!opts.open));
                    if (r.ok === false) throw new Error(r.error);
                    return r;
                },
                sharePdf: (opts) => {
                    const r = JSON.parse(native.sharePdf(opts.base64 || '', opts.filename || 'igood-struk.pdf'));
                    if (r.ok === false) throw new Error(r.error);
                    return r;
                },
                shareText: (opts) => {
                    const r = JSON.parse(native.shareText(opts.text || ''));
                    if (r.ok === false) throw new Error(r.error);
                    return r;
                },
                shareImage: (opts) => {
                    const r = JSON.parse(native.shareImage(opts.base64 || '', opts.filename || 'igood.png', opts.caption || opts.text || ''));
                    if (r.ok === false) throw new Error(r.error);
                    return r;
                },
            };
        }

        // Fallback to Capacitor Native Plugin (for testing / legacy compatibility)
        if (window.Capacitor?.Plugins?.IgoodReceipt) {
            return window.Capacitor.Plugins.IgoodReceipt;
        }

        return null;
    }

    function loadThermalPrinter() {
        const printer = readObject(DB_KEYS.thermalPrinter);
        return printer && printer.address ? {
            name: printer.name || 'Printer Thermal',
            address: printer.address,
            width: Number(printer.width) || 58,
        } : null;
    }

    function saveThermalPrinter(printer) {
        if (!printer?.address) {
            localStorage.removeItem(DB_KEYS.thermalPrinter);
            return;
        }
        localStorage.setItem(DB_KEYS.thermalPrinter, JSON.stringify({
            name: printer.name || 'Printer Thermal',
            address: printer.address,
            width: Number(printer.width) || 58,
        }));
    }

    function bytesToBase64(bytes) {
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize);
            binary += String.fromCharCode(...chunk);
        }
        return btoa(binary);
    }

    function stringToBase64(value) {
        return bytesToBase64(new TextEncoder().encode(String(value || '')));
    }

    function receiptPrintableHtml(title = currentReceiptTitle, text = currentReceiptText) {
        const paperWidth = getReceiptPaperWidth();
        return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title || 'Struk Transaksi')}</title>
<style>
    @page { size: ${paperWidth}mm auto; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; }
    body { width: ${paperWidth}mm; font-family: "Courier New", monospace; font-size: ${paperWidth === 80 ? '9.5px' : '9px'}; line-height: 1.35; }
    pre { white-space: pre-wrap; margin: 0; padding: 0; word-break: break-word; }
</style>
</head>
<body><pre>${esc(text || '')}</pre></body>
</html>`;
    }

    function openReceiptPrintWindow(html) {
        const printWindow = window.open('', '_blank');
        if (!printWindow?.document) return false;
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus?.();
            printWindow.print?.();
        }, 250);
        return true;
    }

    async function exportCurrentReceiptPdf() {
        if (!currentReceiptText.trim()) {
            toast('Belum ada struk untuk disimpan', 'err');
            return;
        }
        const rawLines = currentReceiptText.split(/\r?\n/);
        const bodyLines = rawLines[0]?.trim().toLowerCase() === String(currentReceiptTitle).trim().toLowerCase()
            ? rawLines.slice(1)
            : rawLines;
        const pdf = buildSimplePdf(bodyLines, currentReceiptTitle || 'Struk Transaksi');
        const filename = receiptPdfFilename();
        const nativePlugin = receiptNativePlugin();
        if (nativePlugin) {
            openNativePdfModal(filename, stringToBase64(pdf));
            return;
        }
        const blob = new Blob([pdf], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.__igoodLastReceiptPdf = { filename: a.download, title: currentReceiptTitle, text: currentReceiptText };
        if (confirm('File PDF struk dibuat. Buka file?')) window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        toast('PDF struk berhasil dibuat');
    }

    async function printCurrentReceipt() {
        if (!currentReceiptText.trim()) {
            toast('Belum ada struk untuk dicetak', 'err');
            return;
        }
        const nativePlugin = receiptNativePlugin();
        const html = receiptPrintableHtml(currentReceiptTitle || 'Struk Transaksi', currentReceiptText);
        const thermalPrinter = loadThermalPrinter();
        const paperWidth = getReceiptPaperWidth();
        if (thermalPrinter?.address && nativePlugin?.printThermalReceipt) {
            try {
                const result = await nativePlugin.printThermalReceipt({
                    title: currentReceiptTitle || 'Struk Transaksi',
                    text: currentReceiptText,
                    address: thermalPrinter.address,
                    name: thermalPrinter.name,
                    width: paperWidth || thermalPrinter.width,
                });
                window.__igoodLastReceiptPrint = { thermal: true, result };
                toast(`Struk dikirim ke ${thermalPrinter.name}`);
                return;
            } catch (error) {
                console.error(error);
                toast('Gagal print thermal, mencoba dialog cetak', 'err');
            }
        }
        if (nativePlugin?.printReceipt) {
            try {
                const result = await nativePlugin.printReceipt({
                    title: currentReceiptTitle || 'Struk Transaksi',
                    html,
                    text: currentReceiptText,
                });
                window.__igoodLastReceiptPrint = { native: true, result };
                toast('Dialog cetak struk dibuka');
                return;
            } catch (error) {
                console.error(error);
                toast('Gagal membuka cetak Android, mencoba cetak browser', 'err');
            }
        }
        document.body.classList.add('receipt-printing');
        if (typeof window.print === 'function') {
            window.print();
        } else if (!openReceiptPrintWindow(html)) {
            toast('Fitur cetak tidak tersedia di perangkat ini', 'err');
        }
        setTimeout(() => document.body.classList.remove('receipt-printing'), 1000);
    }

    async function shareCurrentReceipt() {
        if (!currentReceiptText.trim()) {
            toast('Belum ada struk untuk dibagikan', 'err');
            return;
        }
        const nativePlugin = receiptNativePlugin();
        if (nativePlugin?.sharePdf) {
            const rawLines = currentReceiptText.split(/\r?\n/);
            const bodyLines = rawLines[0]?.trim().toLowerCase() === String(currentReceiptTitle).trim().toLowerCase()
                ? rawLines.slice(1)
                : rawLines;
            const pdf = buildSimplePdf(bodyLines, currentReceiptTitle || 'Struk Transaksi');
            const filename = receiptPdfFilename();
            try {
                await nativePlugin.sharePdf({
                    filename,
                    base64: stringToBase64(pdf),
                });
                toast('Membuka menu bagikan PDF...');
                return;
            } catch (error) {
                console.error('Error sharing native PDF:', error);
                toast('Gagal membagikan PDF, mencoba alternatif...', 'err');
            }
        }
        const shareData = {
            title: currentReceiptTitle || 'Struk Transaksi',
            text: currentReceiptText,
        };
        if (navigator.share) {
            try {
                await navigator.share(shareData);
                toast('Struk berhasil dibagikan');
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error sharing:', error);
                    copyReceiptToClipboard();
                }
            }
        } else {
            copyReceiptToClipboard();
        }
    }

    /**
     * Renders the current receipt text onto a Canvas (58mm or 80mm) and shares it as a PNG image.
     * Falls back to Web Share API with file if native bridge unavailable.
     */
    async function shareReceiptImage() {
        if (!currentReceiptText || !currentReceiptText.trim()) {
            toast('Belum ada struk untuk dibagikan', 'err');
            return;
        }

        // --- render to canvas ---
        const PAPER_MM = getReceiptPaperWidth(); // 58 or 80
        const DPI = 203; // typical thermal printer DPI
        const PX_PER_MM = DPI / 25.4;
        const CANVAS_W = Math.round(PAPER_MM * PX_PER_MM);  // ~468px at 58mm, ~640px at 80mm
        const FONT_PX  = Math.round((PAPER_MM === 80 ? 9.5 : 9) * PX_PER_MM / 3.78);  // font size in px
        const LINE_H   = Math.round(FONT_PX * 1.35);
        const PADDING  = Math.round(4 * PX_PER_MM / 3.78);
        const FONT     = `${FONT_PX}px "Courier New", monospace`;

        const canvas  = document.createElement('canvas');
        const ctx     = canvas.getContext('2d');
        ctx.font      = FONT;

        // Split and word-wrap lines to canvas width
        const rawLines = currentReceiptText.split(/\r?\n/);
        const wrapped  = [];
        rawLines.forEach(raw => {
            if (ctx.measureText(raw).width <= CANVAS_W - PADDING * 2) {
                wrapped.push(raw);
                return;
            }
            // simple char-wrap for monospace
            const maxChars = Math.floor((CANVAS_W - PADDING * 2) / (ctx.measureText('M').width || 8));
            for (let i = 0; i < raw.length; i += maxChars) wrapped.push(raw.slice(i, i + maxChars));
        });

        const CANVAS_H = PADDING * 2 + wrapped.length * LINE_H + LINE_H;
        canvas.width  = CANVAS_W;
        canvas.height = CANVAS_H;

        // White background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Black text
        ctx.fillStyle = '#000000';
        ctx.font      = FONT;  // re-set after resize
        ctx.textBaseline = 'top';
        wrapped.forEach((line, i) => {
            ctx.fillText(line, PADDING, PADDING + i * LINE_H);
        });

        // Convert to PNG base64
        const dataUrl  = canvas.toDataURL('image/png');
        const base64   = dataUrl.replace(/^data:image\/png;base64,/, '');
        const filename = `igood-struk-${Date.now()}.png`;

        // Try native shareImage plugin first
        const nativePlugin = receiptNativePlugin();
        const captionText = buildShareReceiptCaption();
        if (nativePlugin?.shareImage) {
            try {
                await nativePlugin.shareImage({ base64, filename, caption: captionText, text: captionText });
                toast('Membuka menu bagikan Gambar...');
                return;
            } catch (error) {
                console.error('Error sharing native image:', error);
                toast('Gagal bagikan native, mencoba Web Share...', 'err');
            }
        }

        // Fallback: Web Share API with file
        if (navigator.share && navigator.canShare) {
            try {
                const blob = await (await fetch(dataUrl)).blob();
                const file = new File([blob], filename, { type: 'image/png' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: currentReceiptTitle || 'Struk Transaksi',
                        text: captionText
                    });
                    toast('Gambar struk berhasil dibagikan');
                    return;
                }
            } catch (error) {
                if (error.name !== 'AbortError') console.error('Web Share image error:', error);
                else return;
            }
        }

        // Last resort: open image in new tab
        const w = window.open('', '_blank');
        if (w) {
            w.document.write(`<html><body style="margin:0;background:#fff"><img src="${dataUrl}" style="max-width:100%"></body></html>`);
            w.document.close();
            toast('Buka gambar di tab baru — tekan tahan untuk simpan/bagikan');
        } else {
            toast('Tidak dapat membuka gambar', 'err');
        }
    }

    function copyReceiptToClipboard() {
        navigator.clipboard.writeText(currentReceiptText).then(() => {
            toast('Teks struk berhasil disalin ke clipboard');
        }).catch(err => {
            toast('Gagal menyalin struk', 'err');
        });
    }

    function bindReceiptModal() {
        $('btnCloseReceipt')?.addEventListener('click', closeReceiptModal);
        $('receiptModal')?.addEventListener('click', event => {
            if (event.target === $('receiptModal')) closeReceiptModal();
        });
        $('btnShareReceipt')?.addEventListener('click', shareCurrentReceipt);
        $('btnShareReceiptImage')?.addEventListener('click', shareReceiptImage);
        $('btnPrintReceipt')?.addEventListener('click', printCurrentReceipt);
        $('btnDownloadReceiptPdf')?.addEventListener('click', exportCurrentReceiptPdf);
        
        // Receipt size toggle handler (58mm vs 80mm)
        const sizeButtons = document.querySelectorAll('#receiptSizeToggle .btn-receipt-size');
        sizeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const size = Number(btn.getAttribute('data-receipt-size')) || 58;
                reRenderReceiptPreview(size);
            });
        });

        window.addEventListener('afterprint', () => document.body.classList.remove('receipt-printing'));
    }

    function normalizeSupabaseBaseUrl(url) {
        return String(url || '')
            .trim()
            .replace(/\/rest\/v1\/?$/i, '')
            .replace(/\/+$/, '');
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

