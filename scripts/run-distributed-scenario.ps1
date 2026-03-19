param(
    [Parameter(Mandatory = $true)]
    [string]$Url,

    [Parameter(Mandatory = $true)]
    [int]$LocalConnections,

    [Parameter(Mandatory = $true)]
    [int]$RemoteConnections,

    [int]$DurationSeconds = 15,
    [string]$WorkerHost = "35.240.145.100",
    [string]$Label = "distributed-scenario"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$localOut = Join-Path $env:TEMP ("{0}-local.json" -f $Label)
$localJob = Start-Job -ScriptBlock {
    param($Url, $OutputPath, $Connections, $DurationSeconds)
    Start-Sleep -Seconds 5
    $json = & npx.cmd --yes autocannon -j -c $Connections -d $DurationSeconds $Url
    Set-Content -Path $OutputPath -Value $json
} -ArgumentList $Url, $localOut, $LocalConnections, $DurationSeconds

$remoteJob = Start-Job -ScriptBlock {
    param($WorkerHost, $Url, $RemoteConnections, $DurationSeconds)
    & ssh.exe -o StrictHostKeyChecking=no -i C:\Users\Admin\.ssh\google_compute_engine ("Admin@{0}" -f $WorkerHost) `
        ("/tmp/worker_autocannon.sh 5 {0} {1} '{2}'" -f $RemoteConnections, $DurationSeconds, $Url)
} -ArgumentList $WorkerHost, $Url, $RemoteConnections, $DurationSeconds

Wait-Job $localJob -Timeout ($DurationSeconds + 180) | Out-Null
Wait-Job $remoteJob -Timeout ($DurationSeconds + 180) | Out-Null
Receive-Job $localJob | Out-Null
$remoteJson = Receive-Job $remoteJob
Remove-Job $localJob -Force
Remove-Job $remoteJob -Force

$localJson = Get-Content -Raw -Path $localOut
Remove-Item -Path $localOut -Force
if ($remoteJson -is [System.Array]) {
    $remoteJson = $remoteJson -join "`n"
}

$health = Invoke-RestMethod -Method Get -Uri "https://holilihu.online/actuator/health"

"LOCAL:"
$localJson
"REMOTE:"
$remoteJson
"HEALTH:"
($health | ConvertTo-Json -Compress)
