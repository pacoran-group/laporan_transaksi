$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$files = @(
    "e:\Transaction Report\Transaksi Karaoke Ashika.xls",
    "e:\Transaction Report\Transaksi Karaoke Grand Royal.xls",
    "e:\Transaction Report\Transaksi Hotel Pancoran.xls",
    "e:\Transaction Report\Transaksi Hotel Royal Inn.xls"
)

foreach ($file in $files) {
    Write-Host "============================================"
    Write-Host "FILE: $file"
    Write-Host "============================================"
    
    $wb = $excel.Workbooks.Open($file)
    
    Write-Host "Sheet Count: $($wb.Worksheets.Count)"
    foreach ($ws in $wb.Worksheets) {
        Write-Host "  Sheet: $($ws.Name)"
    }
    
    Write-Host ""
    Write-Host "--- First Sheet Data Preview (20 rows x 15 cols) ---"
    $ws = $wb.Worksheets.Item(1)
    $usedRange = $ws.UsedRange
    Write-Host "Used Range: Rows=$($usedRange.Rows.Count), Cols=$($usedRange.Columns.Count)"
    
    $maxRows = [Math]::Min(25, $usedRange.Rows.Count)
    $maxCols = [Math]::Min(15, $usedRange.Columns.Count)
    
    for ($r = 1; $r -le $maxRows; $r++) {
        $cells = @()
        for ($c = 1; $c -le $maxCols; $c++) {
            $val = $ws.Cells.Item($r, $c).Text
            if ($val -eq "") { $val = "(empty)" }
            $cells += $val
        }
        Write-Host ($cells -join "`t|`t")
    }
    
    # Also show last few rows
    Write-Host ""
    Write-Host "--- Last 5 rows ---"
    $startRow = [Math]::Max($maxRows + 1, $usedRange.Rows.Count - 4)
    for ($r = $startRow; $r -le $usedRange.Rows.Count; $r++) {
        $cells = @()
        for ($c = 1; $c -le $maxCols; $c++) {
            $val = $ws.Cells.Item($r, $c).Text
            if ($val -eq "") { $val = "(empty)" }
            $cells += $val
        }
        Write-Host "Row $r : $($cells -join '`t|`t')"
    }
    
    $wb.Close($false)
    Write-Host ""
    Write-Host ""
}

$excel.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
