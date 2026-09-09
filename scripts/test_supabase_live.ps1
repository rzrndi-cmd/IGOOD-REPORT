$supabaseUrl = "https://jnwdoucyjwhkqxrztubm.supabase.co"
$supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impud2RvdWN5andoa3F4cnp0dWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NzU0NzIsImV4cCI6MjA5NjQ1MTQ3Mn0.mQ5-WX_IFGhi4c_C0cEXFEZnjDO1yDAqvHZOaqGAJ4c"

$headers = @{
    "apikey" = $supabaseKey
    "Authorization" = "Bearer $supabaseKey"
    "Content-Type" = "application/json"
}

Write-Host "1. Testing GET igood_transactions from Supabase..." -ForegroundColor Cyan
try {
    $res = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/igood_transactions?select=*" -Headers $headers -Method Get
    Write-Host "Success! Count: $($res.Count)" -ForegroundColor Green
    $res | Format-Table id, date, shift, category, item_name, sell, buyer_name -AutoSize
} catch {
    Write-Host "Error GET transactions: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n2. Testing GET igood_service_orders..." -ForegroundColor Cyan
try {
    $svc = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/igood_service_orders?select=*" -Headers $headers -Method Get
    Write-Host "Success! Count: $($svc.Count)" -ForegroundColor Green
} catch {
    Write-Host "Error GET service_orders: $($_.Exception.Message)" -ForegroundColor Red
}
