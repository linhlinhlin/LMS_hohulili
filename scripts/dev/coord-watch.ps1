param(
    [ValidateSet('render', 'watch', 'launch', 'event')]
    [string]$Mode = 'render',
    [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path,
    [int]$IntervalSeconds = 2,
    [string]$Role,
    [string]$Wave,
    [ValidateSet('todo', 'in_progress', 'blocked', 'waiting_for_run', 'ready_for_review', 'approved', 'rejected')]
    [string]$Status,
    [string]$Message
)

$coordDir = Join-Path $Root 'coord'
$tasksDir = Join-Path $coordDir 'TASKS'
$reportsDir = Join-Path $coordDir 'REPORTS'
$reviewsDir = Join-Path $coordDir 'REVIEW'
$statusPath = Join-Path $coordDir 'STATUS.md'
$eventsPath = Join-Path $coordDir 'events.jsonl'
$planPath = Join-Path $coordDir 'PLAN.md'

function Ensure-CoordLayout {
    foreach ($path in @($coordDir, $tasksDir, $reportsDir, $reviewsDir)) {
        if (-not (Test-Path $path)) {
            New-Item -ItemType Directory -Path $path -Force | Out-Null
        }
    }

    foreach ($file in @($planPath, $statusPath, $eventsPath)) {
        if (-not (Test-Path $file)) {
            New-Item -ItemType File -Path $file -Force | Out-Null
        }
    }
}

function Get-Metadata {
    param([string]$Path)

    $metadata = [ordered]@{}
    if (-not (Test-Path $Path)) {
        return $metadata
    }

    foreach ($line in Get-Content -Path $Path) {
        if ($line -match '^([A-Za-z][A-Za-z ]+):\s*(.+)$') {
            $metadata[$matches[1].Trim()] = $matches[2].Trim()
        }
    }

    return $metadata
}

function Get-CardRows {
    param(
        [string]$Directory,
        [string]$Kind
    )

    if (-not (Test-Path $Directory)) {
        return @()
    }

    $rows = @()
    $files = Get-ChildItem -Path $Directory -Filter '*.md' -File | Where-Object { $_.Name -ne 'TEMPLATE.md' } | Sort-Object Name
    foreach ($file in $files) {
        $meta = Get-Metadata -Path $file.FullName
        $rows += [pscustomobject]@{
            Kind = $Kind
            File = $file.BaseName
            Status = $meta['Status']
            Owner = $meta['Owner']
            Updated = $meta['Updated']
        }
    }

    return $rows
}

function Write-StatusFile {
    $rows = @()
    $rows += Get-CardRows -Directory $tasksDir -Kind 'Task'
    $rows += Get-CardRows -Directory $reportsDir -Kind 'Report'
    $rows += Get-CardRows -Directory $reviewsDir -Kind 'Review'

    $lines = @()
    $lines += '# Coordination Status'
    $lines += ''
    $lines += "Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss zzz')"
    $lines += ''
    $lines += '## Active Work'
    $lines += ''
    $lines += '| Kind | File | Status | Owner | Updated |'
    $lines += '|---|---|---|---|---|'

    if ($rows.Count -eq 0) {
        $lines += '| - | - | - | - | - |'
    }
    else {
        foreach ($row in $rows) {
            $lines += "| $($row.Kind) | $($row.File) | $($row.Status) | $($row.Owner) | $($row.Updated) |"
        }
    }

    $eventLines = @()
    if (Test-Path $eventsPath) {
        $eventLines = @(Get-Content -Path $eventsPath | Where-Object { $_.Trim() } | Select-Object -Last 5)
    }
    $lines += ''
    $lines += '## Latest Events'
    $lines += ''
    if ($eventLines.Count -eq 0) {
        $lines += '- None'
    }
    else {
        foreach ($eventLine in $eventLines) {
            try {
                $event = $eventLine | ConvertFrom-Json
                $lines += "- ``$($event.timestamp)`` ``$($event.role)`` ``$($event.wave)`` ``$($event.status)``: $($event.message)"
            }
            catch {
                $lines += "- Invalid event line: $eventLine"
            }
        }
    }

    Set-Content -Path $statusPath -Value ($lines -join [Environment]::NewLine)
}

function Add-Event {
    if (-not $Role -or -not $Wave -or -not $Status -or -not $Message) {
        throw 'Mode=event requires -Role, -Wave, -Status, and -Message.'
    }

    $event = [ordered]@{
        timestamp = (Get-Date).ToString('o')
        role = $Role
        wave = $Wave
        status = $Status
        message = $Message
    }

    ($event | ConvertTo-Json -Compress) | Add-Content -Path $eventsPath
    Write-StatusFile
}

function Get-CoordFingerprint {
    $parts = @()
    foreach ($path in @($planPath, $eventsPath)) {
        if (Test-Path $path) {
            $item = Get-Item $path
            $parts += "$($item.FullName)|$($item.LastWriteTimeUtc.Ticks)|$($item.Length)"
        }
    }

    foreach ($dir in @($tasksDir, $reportsDir, $reviewsDir)) {
        if (Test-Path $dir) {
            foreach ($item in (Get-ChildItem -Path $dir -File -Filter '*.md' | Sort-Object FullName)) {
                $parts += "$($item.FullName)|$($item.LastWriteTimeUtc.Ticks)|$($item.Length)"
            }
        }
    }

    return ($parts -join "`n")
}

function Start-WatchLoop {
    Write-StatusFile
    $fingerprint = Get-CoordFingerprint
    while ($true) {
        Start-Sleep -Seconds $IntervalSeconds
        $nextFingerprint = Get-CoordFingerprint
        if ($nextFingerprint -ne $fingerprint) {
            $fingerprint = $nextFingerprint
            Write-StatusFile
        }
    }
}

Ensure-CoordLayout

switch ($Mode) {
    'render' {
        Write-StatusFile
    }
    'watch' {
        Start-WatchLoop
    }
    'launch' {
        $args = @(
            '-NoLogo',
            '-NoProfile',
            '-ExecutionPolicy', 'Bypass',
            '-File', "`"$PSCommandPath`"",
            '-Mode', 'watch',
            '-Root', "`"$Root`"",
            '-IntervalSeconds', $IntervalSeconds
        )
        Start-Process -FilePath 'powershell.exe' -ArgumentList $args -WindowStyle Minimized | Out-Null
        Write-Host 'Coordination watcher launched in a background PowerShell window.'
    }
    'event' {
        Add-Event
    }
}
