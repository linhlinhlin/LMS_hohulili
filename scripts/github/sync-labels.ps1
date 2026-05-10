param(
    [string]$Repo = "linhlinhlin/LMS_hohulili",
    [string]$LabelsFile = ".github/labels.json",
    [switch]$Apply
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI (gh) is required."
}

if (-not (Test-Path -LiteralPath $LabelsFile)) {
    throw "Labels file not found: $LabelsFile"
}

$labels = Get-Content -Raw -LiteralPath $LabelsFile | ConvertFrom-Json
$existing = gh label list --repo $Repo --limit 500 --json name | ConvertFrom-Json
$existingNames = @{}
foreach ($label in $existing) {
    $existingNames[$label.name] = $true
}

foreach ($label in $labels) {
    $name = [string]$label.name
    $color = ([string]$label.color).TrimStart("#")
    $description = [string]$label.description

    if ([string]::IsNullOrWhiteSpace($name) -or [string]::IsNullOrWhiteSpace($color)) {
        throw "Invalid label entry: $($label | ConvertTo-Json -Compress)"
    }

    if ($existingNames.ContainsKey($name)) {
        Write-Host "update $name [$color] - $description"
        if ($Apply) {
            gh label edit $name --repo $Repo --color $color --description $description
        }
        continue
    }

    Write-Host "create $name [$color] - $description"
    if ($Apply) {
        gh label create $name --repo $Repo --color $color --description $description
    }
}

if (-not $Apply) {
    Write-Host ""
    Write-Host "Dry run only. Re-run with -Apply to create/update labels."
}
