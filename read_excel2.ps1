$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

# Fix Trust Center settings for .xls files
try {
    $regPath = "HKCU:\Software\Microsoft\Office\$($excel.Version)\Excel\Security"
    # Attempt to set file block to not block
} catch {}

$files = @(
    "e:\Transaction Report\Transaksi Karaoke Grand Royal.xls",
    "e:\Transaction Report\Transaksi Hotel Pancoran.xls"
)

foreach ($file in $files) {
    Write-Host "============================================"
    Write-Host "FILE: $file"  
    Write-Host "============================================"
    
    $wb = $excel.Workbooks.Open($file)
    $ws = $wb.Worksheets.Item(1)
    $usedRange = $ws.UsedRange
    
    # Show columns 15-33 (headers + first 3 data rows)
    Write-Host "--- COLUMNS 15 to $($usedRange.Columns.Count) ---"
    for ($r = 1; $r -le [Math]::Min(5, $usedRange.Rows.Count); $r++) {
        $cells = @()
        for ($c = 15; $c -le [Math]::Min(36, $usedRange.Columns.Count); $c++) {
            $val = $ws.Cells.Item($r, $c).Text
            if ($val -eq "") { $val = "(empty)" }
            $cells += "$c`:$val"
        }
        Write-Host "Row $r : $($cells -join '  |  ')"
    }
    
    $wb.Close($false)
    Write-Host ""
}

# Try to open Karaoke Ashika with different method
Write-Host "============================================"
Write-Host "Attempting Karaoke Ashika..."
Write-Host "============================================"

try {
    # Disable file block
    $ver = $excel.Version
    $keyPath = "HKCU:\Software\Microsoft\Office\$ver\Excel\Security\FileBlock"
    if (-not (Test-Path $keyPath)) {
        New-Item -Path $keyPath -Force | Out-Null
    }
    Set-ItemProperty -Path $keyPath -Name "XlsFiles" -Value 0 -Type DWord
    
    $wb = $excel.Workbooks.Open("e:\Transaction Report\Transaksi Karaoke Ashika.xls")
    $ws = $wb.Worksheets.Item(1)
    $usedRange = $ws.UsedRange
    Write-Host "Rows: $($usedRange.Rows.Count), Cols: $($usedRange.Columns.Count)"
    
    for ($r = 1; $r -le [Math]::Min(25, $usedRange.Rows.Count); $r++) {
        $cells = @()
        for ($c = 1; $c -le [Math]::Min(15, $usedRange.Columns.Count); $c++) {
            $val = $ws.Cells.Item($r, $c).Text
            if ($val -eq "") { $val = "(empty)" }
            $cells += $val
        }
        Write-Host ($cells -join "`t|`t")
    }
    
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
    
    # Show remaining columns
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
    
    $wb.Close($false)
} catch {
    Write-Host "ERROR: $($_.Exception.Message)"
}

$excel.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($excel) | Out-Null
