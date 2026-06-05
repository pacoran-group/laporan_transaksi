$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$file = "e:\Transaction Report\Transaksi Karaoke Ashika.xlsx"

Write-Host "============================================"
Write-Host "FILE: $file"
Write-Host "============================================"

$wb = $excel.Workbooks.Open($file)

Write-Host "Sheet Count: $($wb.Worksheets.Count)"
foreach ($ws in $wb.Worksheets) {
    Write-Host "  Sheet: $($ws.Name)"
}

$ws = $wb.Worksheets.Item(1)
$usedRange = $ws.UsedRange
Write-Host "Used Range: Rows=$($usedRange.Rows.Count), Cols=$($usedRange.Columns.Count)"

# Show first 25 rows, cols 1-15
Write-Host ""
Write-Host "--- COLUMNS 1-15 (first 25 rows) ---"
for ($r = 1; $r -le [Math]::Min(25, $usedRange.Rows.Count); $r++) {
    $cells = @()
    for ($c = 1; $c -le [Math]::Min(15, $usedRange.Columns.Count); $c++) {
        $val = $ws.Cells.Item($r, $c).Text
        if ($val -eq "") { $val = "(empty)" }
        $cells += $val
    }
    Write-Host ($cells -join "`t|`t")
}

# Show columns 15+ for header + 3 data rows
Write-Host ""
Write-Host "--- COLUMNS 15+ (headers + 3 rows) ---"
for ($r = 1; $r -le [Math]::Min(4, $usedRange.Rows.Count); $r++) {
    $cells = @()
    for ($c = 15; $c -le $usedRange.Columns.Count; $c++) {
        $val = $ws.Cells.Item($r, $c).Text
        if ($val -eq "") { $val = "(empty)" }
        $cells += "$c`:$val"
    }
    Write-Host "Row $r : $($cells -join '  |  ')"
}

# Last 5 rows
Write-Host ""
Write-Host "--- Last 5 rows ---"
$startRow = [Math]::Max(26, $usedRange.Rows.Count - 4)
for ($r = $startRow; $r -le $usedRange.Rows.Count; $r++) {
    $cells = @()
    for ($c = 1; $c -le [Math]::Min(15, $usedRange.Columns.Count); $c++) {
        $val = $ws.Cells.Item($r, $c).Text
        if ($val -eq "") { $val = "(empty)" }
        $cells += $val
    }
    Write-Host "Row $r : $($cells -join '`t|`t')"
}

$wb.Close($false)
$excel.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
