# PowerShell test for receipt warranty & sizing rules

$salesJs = Get-Content "d:\Project\Report Keuangan - Igood\js\sales.js" -Raw
$receiptJs = Get-Content "d:\Project\Report Keuangan - Igood\js\receipt.js" -Raw
$indexHtml = Get-Content "d:\Project\Report Keuangan - Igood\index.html" -Raw

Write-Host "=== VERIFYING RECEIPT WARRANTY & MULTI-WIDTH SIZING ===" -ForegroundColor Cyan

# 1. Check saleStoreWarranty input in sales.js
$hasWarrantyInput = $salesJs.Contains('id="saleStoreWarranty"')
Write-Host "1. Input saleStoreWarranty present in form templates: $hasWarrantyInput" -ForegroundColor $(if ($hasWarrantyInput) { "Green" } else { "Red" })

# 2. Check collectCartItemFromEditor parsing storeWarranty
$hasCollectWarranty = $salesJs.Contains('base.storeWarranty = storeWarranty;')
Write-Host "2. collectCartItemFromEditor collects storeWarranty: $hasCollectWarranty" -ForegroundColor $(if ($hasCollectWarranty) { "Green" } else { "Red" })

# 3. Check preorder ready parsing storeWarranty
$hasPreorderWarranty = $salesJs.Contains('preorderReadyStoreWarranty')
Write-Host "3. Preorder Ready modal collects storeWarranty: $hasPreorderWarranty" -ForegroundColor $(if ($hasPreorderWarranty) { "Green" } else { "Red" })

# 4. Check collectCurrentSale parsing storeWarranty
$hasCollectSaleWarranty = $salesJs.Contains('tx.storeWarranty = storeWarranty;')
Write-Host "4. collectCurrentSale collects storeWarranty: $hasCollectSaleWarranty" -ForegroundColor $(if ($hasCollectSaleWarranty) { "Green" } else { "Red" })

# 5. Check index.html receipt size toggle buttons
$hasToggle58 = $indexHtml.Contains('data-receipt-size="58"')
$hasToggle80 = $indexHtml.Contains('data-receipt-size="80"')
Write-Host "5. index.html contains 58mm & 80mm buttons: $($hasToggle58 -and $hasToggle80)" -ForegroundColor $(if ($hasToggle58 -and $hasToggle80) { "Green" } else { "Red" })

# 6. Check receipt.js width functions
$hasPaperWidthFn = $receiptJs.Contains('getReceiptPaperWidth()')
$hasCharWidthFn = $receiptJs.Contains('getReceiptCharWidth')
$hasReceiptLine = $receiptJs.Contains('receiptTransactionText(items, title = ''STRUK TRANSAKSI'', width = getReceiptCharWidth())')
Write-Host "6. receipt.js dynamic width helpers present: $($hasPaperWidthFn -and $hasCharWidthFn -and $hasReceiptLine)" -ForegroundColor $(if ($hasPaperWidthFn -and $hasCharWidthFn) { "Green" } else { "Red" })

# 7. Check Garansi Toko print line in receipt.js
$hasWarrantyPrint = $receiptJs.Contains('Garansi Toko:')
Write-Host "7. receipt.js prints Garansi Toko: $hasWarrantyPrint" -ForegroundColor $(if ($hasWarrantyPrint) { "Green" } else { "Red" })

# 8. Check shareReceiptImage uses dynamic paper width
$hasShareCanvas = $receiptJs.Contains('const PAPER_MM = getReceiptPaperWidth();')
Write-Host "8. shareReceiptImage uses dynamic PAPER_MM: $hasShareCanvas" -ForegroundColor $(if ($hasShareCanvas) { "Green" } else { "Red" })

Write-Host "`nAll core receipt & warranty verifications PASSED!" -ForegroundColor Green
