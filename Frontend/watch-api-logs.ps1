Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Watching for API and Network Logs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get list of devices
$devices = adb devices | Select-String -Pattern "device$" | ForEach-Object { ($_ -split "\s+")[0] }

if ($devices.Count -eq 0) {
    Write-Host "No devices found!" -ForegroundColor Red
    exit
}

Write-Host "Found $($devices.Count) device(s):" -ForegroundColor Yellow
foreach ($device in $devices) {
    Write-Host "  - $device" -ForegroundColor Gray
}
Write-Host ""

if ($devices.Count -eq 1) {
    $deviceId = $devices[0]
    Write-Host "Watching logs from: $deviceId" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
    Write-Host ""
    adb -s $deviceId logcat -s ReactNativeJS:* | Select-String -Pattern "API|HOME|USE_CLIENT|network|error" -CaseSensitive:$false
} else {
    Write-Host "Multiple devices detected. Choose an option:" -ForegroundColor Yellow
    Write-Host "  1. Watch device 1: $($devices[0])" -ForegroundColor Cyan
    Write-Host "  2. Watch device 2: $($devices[1])" -ForegroundColor Cyan
    Write-Host "  3. Watch BOTH devices (separate windows)" -ForegroundColor Cyan
    Write-Host ""
    $choice = Read-Host "Enter choice (1, 2, or 3)"
    
    if ($choice -eq "1") {
        $deviceId = $devices[0]
        Write-Host "Watching logs from: $deviceId" -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
        Write-Host ""
        adb -s $deviceId logcat -s ReactNativeJS:* | Select-String -Pattern "API|HOME|USE_CLIENT|network|error" -CaseSensitive:$false
    } elseif ($choice -eq "2") {
        $deviceId = $devices[1]
        Write-Host "Watching logs from: $deviceId" -ForegroundColor Green
        Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
        Write-Host ""
        adb -s $deviceId logcat -s ReactNativeJS:* | Select-String -Pattern "API|HOME|USE_CLIENT|network|error" -CaseSensitive:$false
    } elseif ($choice -eq "3") {
        Write-Host "Opening separate windows for each device..." -ForegroundColor Green
        Write-Host "You'll need to run this script again in a new window for the second device" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Device 1: $($devices[0])" -ForegroundColor Cyan
        Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
        Write-Host ""
        adb -s $devices[0] logcat -s ReactNativeJS:* | Select-String -Pattern "API|HOME|USE_CLIENT|network|error" -CaseSensitive:$false
    } else {
        Write-Host "Invalid choice!" -ForegroundColor Red
    }
}