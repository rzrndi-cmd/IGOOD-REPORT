$key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impud2RvdWN5andoa3F4cnp0dWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzU0NzIsImV4cCI6MjA5NjQ1MTQ3Mn0.mQ5-WX_IFGhi4c_C0cEXFEZnjDO1yDAqvHZOaqGAJ4c'
$base = 'https://jnwdoucyjwhkqxrztubm.supabase.co/rest/v1'
$headers = @{
    'apikey' = $key
    'Authorization' = "Bearer $key"
    'Content-Type' = 'application/json'
}

$tables = [ordered]@{
    'igood_transactions' = 'id'
    'igood_service_orders' = 'code'
    'igood_preorder_requests' = 'code'
    'igood_operational_expenses' = 'id'
    'igood_device_stock' = 'code'
    'igood_acc_stock' = 'code'
    'igood_employees' = 'id'
    'igood_technicians' = 'name'
    'igood_service_catalog' = 'code'
    'igood_other_catalog' = 'code'
}

Write-Host "=============================================="
Write-Host "   VERIFIKASI AKHIR DATABASE SUPABASE         "
Write-Host "=============================================="

$allClean = $true
foreach ($t in $tables.Keys) {
    $idCol = $tables[$t]
    try {
        $rows = Invoke-RestMethod -Uri "$base/$t`?select=$idCol" -Method Get -Headers $headers -ErrorAction Stop
        $count = if ($null -eq $rows) { 0 } else { $rows.Count }
        if ($count -eq 0) {
            Write-Host "[OK] $($t.PadRight(28)) : 0 baris (BERSIH/KOSONG)" -ForegroundColor Green
        } else {
            Write-Host "[PERINGATAN] $($t.PadRight(28)) : $count baris tersisa" -ForegroundColor Red
            $allClean = $false
        }
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -eq 404) {
            Write-Host "[INFO] $($t.PadRight(28)) : Tabel belum dibuat di Supabase (Tidak ada data)" -ForegroundColor DarkGray
        } else {
            Write-Host "[ERROR] $($t.PadRight(28)) : $_" -ForegroundColor Red
            $allClean = $false
        }
    }
}

Write-Host "=============================================="
if ($allClean) {
    Write-Host "🎉 SEMUA TABEL SUPABASE TELAH 100% BERSIH (SIAP PRODUCTION)!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Ada tabel yang belum bersih sepenuhnya." -ForegroundColor Yellow
}
Write-Host "=============================================="
