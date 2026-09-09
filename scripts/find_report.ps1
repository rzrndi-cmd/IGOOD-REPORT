Get-ChildItem -Path "d:\Project\Report Keuangan - Igood\js" -Filter *.js | ForEach-Object {
    $file = $_.FullName
    Select-String -Path $file -Pattern 'getDailyReportTransactions|renderDailyReport|reportTotals|buildDailyReportWhatsappText|dailyReportDate|dailyReportShift' | ForEach-Object {
        Write-Host "$($_.Filename):$($_.LineNumber): $($_.Line.Trim())"
    }
}
