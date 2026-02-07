Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Watching API Logs from BOTH Devices" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get list of devices
$devices = adb devices | Select-String -Pattern "device$" | ForEach-Object { ($_ -split "\s+")[0] }

if ($devices.Count -lt 2) {
    Write-Host "Need at least 2 devices! Found: $($devices.Count)" -ForegroundColor Red
    exit
}

Write-Host "Watching logs from BOTH devices:" -ForegroundColor Yellow
Write-Host "  Device 1: $($devices[0])" -ForegroundColor Cyan
Write-Host "  Device 2: $($devices[1])" -ForegroundColor Cyan
Write-Host ""
Write-Host "Logs will be merged. Device ID shown in brackets." -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

# Start logcat for both devices and merge output
$job1 = Start-Job -ScriptBlock {
    param($deviceId)
    adb -s $deviceId logcat -s ReactNativeJS:* | ForEach-Object { "[$deviceId] $_" }
} -ArgumentList $devices[0]

$job2 = Start-Job -ScriptBlock {
    param($deviceId)
    adb -s $deviceId logcat -s ReactNativeJS:* | ForEach-Object { "[$deviceId] $_" }
} -ArgumentList $devices[1]

try {
    while ($true) {
        $output1 = Receive-Job -Job $job1 -ErrorAction SilentlyContinue
        $output2 = Receive-Job -Job $job2 -ErrorAction SilentlyContinue
        
        if ($output1) {
            $output1 | Select-String -Pattern "API|HOME|USE_CLIENT|network|error" -CaseSensitive:$false | ForEach-Object { Write-Host $_ }
        }
        if ($output2) {
            $output2 | Select-String -Pattern "API|HOME|USE_CLIENT|network|error" -CaseSensitive:$false | ForEach-Object { Write-Host $_ }
        }
        
        Start-Sleep -Milliseconds 100
    }
} finally {
    Stop-Job -Job $job1, $job2
    Remove-Job -Job $job1, $job2
}