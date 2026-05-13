param(
    [Parameter(Mandatory = $true)]
    [string] $ManifestUrl,

    [int] $MaxAssets = 0
)

$ErrorActionPreference = 'Stop'

function Resolve-Url {
    param(
        [Parameter(Mandatory = $true)][string] $RawUrl,
        [Parameter(Mandatory = $true)][Uri] $BaseUrl
    )
    return ([Uri]::new($BaseUrl, $RawUrl)).ToString()
}

function Get-ExpectedContentEncoding {
    param([Parameter(Mandatory = $true)][string] $Path)
    $lower = $Path.ToLowerInvariant()
    if ($lower.EndsWith('.br')) { return 'br' }
    if ($lower.EndsWith('.gz')) { return 'gzip' }
    return $null
}

function Get-ExpectedContentTypePrefix {
    param([Parameter(Mandatory = $true)][string] $Path)
    $lower = $Path.ToLowerInvariant()
    if ($lower.EndsWith('.wasm') -or $lower.EndsWith('.wasm.br') -or $lower.EndsWith('.wasm.gz')) { return 'application/wasm' }
    if ($lower.EndsWith('.js') -or $lower.EndsWith('.js.br') -or $lower.EndsWith('.js.gz')) { return 'application/javascript' }
    if ($lower.EndsWith('.html')) { return 'text/html' }
    if ($lower.EndsWith('.json')) { return 'application/json' }
    if ($lower.EndsWith('.css')) { return 'text/css' }
    return $null
}

function Assert-Header {
    param(
        [Parameter(Mandatory = $true)][string] $Url,
        [Parameter(Mandatory = $true)] $Headers,
        [Parameter(Mandatory = $true)][string] $Path
    )

    $contentType = [string] $Headers['Content-Type']
    $contentEncoding = [string] $Headers['Content-Encoding']
    $cacheControl = [string] $Headers['Cache-Control']

    $expectedType = Get-ExpectedContentTypePrefix -Path $Path
    if ($expectedType -and -not $contentType.StartsWith($expectedType, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Unexpected Content-Type for ${Url}. Expected $expectedType, got $contentType"
    }

    $expectedEncoding = Get-ExpectedContentEncoding -Path $Path
    if ($expectedEncoding -and $contentEncoding -ne $expectedEncoding) {
        throw "Unexpected Content-Encoding for ${Url}. Expected $expectedEncoding, got $contentEncoding"
    }

    $lower = $Path.ToLowerInvariant()
    if ($lower.EndsWith('index.html') -or $lower.EndsWith('holilihu-simulation.json')) {
        if ($cacheControl -notmatch 'max-age=60|no-cache|must-revalidate') {
            throw "Entry/manifest cache policy is too sticky for ${Url}: $cacheControl"
        }
    } elseif ($cacheControl -notmatch 'immutable') {
        throw "Versioned asset should be immutable for ${Url}: $cacheControl"
    }
}

$manifestUri = [Uri] $ManifestUrl
$manifestResponse = Invoke-WebRequest -Uri $manifestUri -Method Get -Headers @{ Accept = 'application/json' }
if ($manifestResponse.StatusCode -lt 200 -or $manifestResponse.StatusCode -ge 300) {
    throw "Manifest request failed: HTTP $($manifestResponse.StatusCode)"
}

$manifest = $manifestResponse.Content | ConvertFrom-Json
$baseUrl = [Uri] $manifestUri.ToString().Substring(0, $manifestUri.ToString().LastIndexOf('/') + 1)

$targets = @()
if ($manifest.entrypoint) {
    $targets += [pscustomobject]@{ Url = Resolve-Url -RawUrl $manifest.entrypoint -BaseUrl $baseUrl; Path = $manifest.entrypoint }
}
$targets += [pscustomobject]@{ Url = $manifestUri.ToString(); Path = 'holilihu-simulation.json' }

$assetTargets = @($manifest.assets | ForEach-Object {
    [pscustomobject]@{ Url = Resolve-Url -RawUrl $_.url -BaseUrl $baseUrl; Path = [string] $_.url }
})
if ($MaxAssets -gt 0) {
    $assetTargets = @($assetTargets | Select-Object -First $MaxAssets)
}
$targets += $assetTargets

foreach ($target in $targets) {
    Write-Host "HEAD $($target.Url)"
    $response = Invoke-WebRequest -Uri $target.Url -Method Head
    if ($response.StatusCode -lt 200 -or $response.StatusCode -ge 300) {
        throw "Header probe failed for $($target.Url): HTTP $($response.StatusCode)"
    }
    Assert-Header -Url $target.Url -Headers $response.Headers -Path $target.Path
}

Write-Host "Simulation header smoke passed for $($targets.Count) URLs."
