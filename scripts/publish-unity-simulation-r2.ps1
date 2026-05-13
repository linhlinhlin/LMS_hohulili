param(
    [Parameter(Mandatory = $true)]
    [string] $BuildRoot,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z0-9][a-z0-9-]+$')]
    [string] $PackageId,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^v[0-9][A-Za-z0-9._-]*$')]
    [string] $Version,

    [string] $Bucket = $env:CLOUDFLARE_R2_SIMULATION_BUCKET,

    [string] $ObjectPrefix = $(if ($env:CLOUDFLARE_R2_SIMULATION_PREFIX) { $env:CLOUDFLARE_R2_SIMULATION_PREFIX } else { 'simulations' }),

    [string] $PublicPathPrefix = 'simulations',

    [switch] $Upload,

    [switch] $Local,

    [switch] $SkipManifestWrite
)

$ErrorActionPreference = 'Stop'

function Get-RelativeWebPath {
    param(
        [Parameter(Mandatory = $true)][string] $Root,
        [Parameter(Mandatory = $true)][string] $Path
    )

    $rootUri = [Uri] (($Root.TrimEnd('\') + '\'))
    $pathUri = [Uri] $Path
    return [Uri]::UnescapeDataString($rootUri.MakeRelativeUri($pathUri).ToString())
}

function Get-UnityContentEncoding {
    param([Parameter(Mandatory = $true)][string] $Path)

    $lower = $Path.ToLowerInvariant()
    if ($lower.EndsWith('.br')) { return 'br' }
    if ($lower.EndsWith('.gz')) { return 'gzip' }
    return $null
}

function Get-UnityContentType {
    param([Parameter(Mandatory = $true)][string] $Path)

    $lower = $Path.ToLowerInvariant()
    if ($lower.EndsWith('.wasm') -or $lower.EndsWith('.wasm.br') -or $lower.EndsWith('.wasm.gz')) { return 'application/wasm' }
    if ($lower.EndsWith('.js') -or $lower.EndsWith('.js.br') -or $lower.EndsWith('.js.gz')) { return 'application/javascript' }
    if ($lower.EndsWith('.html')) { return 'text/html; charset=utf-8' }
    if ($lower.EndsWith('.json')) { return 'application/json; charset=utf-8' }
    if ($lower.EndsWith('.css')) { return 'text/css; charset=utf-8' }
    if ($lower.EndsWith('.png')) { return 'image/png' }
    if ($lower.EndsWith('.jpg') -or $lower.EndsWith('.jpeg')) { return 'image/jpeg' }
    if ($lower.EndsWith('.webp')) { return 'image/webp' }
    return 'application/octet-stream'
}

function Get-CachePolicy {
    param([Parameter(Mandatory = $true)][string] $Path)

    $lower = $Path.ToLowerInvariant()
    if ($lower.EndsWith('/index.html') -or $lower -eq 'index.html' -or $lower.EndsWith('/holilihu-simulation.json') -or $lower -eq 'holilihu-simulation.json') {
        return 'public, max-age=60, must-revalidate'
    }
    return 'public, max-age=31536000, immutable'
}

function Get-WranglerCommand {
    $wrangler = Get-Command wrangler -ErrorAction SilentlyContinue
    if ($wrangler) {
        return [pscustomobject]@{
            FilePath = $wrangler.Source
            PrefixArgs = @()
            DisplayName = 'wrangler'
        }
    }

    $npx = Get-Command npx -ErrorAction SilentlyContinue
    if ($npx) {
        return [pscustomobject]@{
            FilePath = $npx.Source
            PrefixArgs = @('wrangler')
            DisplayName = 'npx wrangler'
        }
    }

    throw 'wrangler was not found. Install with `npm install -g wrangler` or use Node/npm so `npx wrangler` is available after authenticating.'
}

function Invoke-Wrangler {
    param(
        [Parameter(Mandatory = $true)] $Command,
        [Parameter(Mandatory = $true)] [string[]] $Arguments
    )

    & $Command.FilePath @($Command.PrefixArgs + $Arguments)
}

if ([string]::IsNullOrWhiteSpace($Bucket)) {
    throw 'Bucket is required. Set -Bucket or CLOUDFLARE_R2_SIMULATION_BUCKET.'
}

$resolvedRoot = (Resolve-Path -LiteralPath $BuildRoot).Path
$indexPath = Join-Path $resolvedRoot 'index.html'
if (-not (Test-Path -LiteralPath $indexPath)) {
    throw "Unity WebGL package must contain index.html at $resolvedRoot"
}

$normalizedPrefix = $ObjectPrefix.Trim('/').Trim()
if ([string]::IsNullOrWhiteSpace($normalizedPrefix)) {
    throw 'ObjectPrefix must not be blank.'
}

$normalizedPublicPathPrefix = $PublicPathPrefix.Trim('/').Trim()
if ([string]::IsNullOrWhiteSpace($normalizedPublicPathPrefix)) {
    throw 'PublicPathPrefix must not be blank.'
}

$packageBasePath = "/$normalizedPublicPathPrefix/$PackageId/$Version/"
$manifestPath = Join-Path $resolvedRoot 'holilihu-simulation.json'

$assetFiles = Get-ChildItem -LiteralPath $resolvedRoot -File -Recurse |
    Where-Object { $_.Name -ne 'holilihu-simulation.json' } |
    Sort-Object FullName

if ($assetFiles.Count -eq 0) {
    throw "No files found under $resolvedRoot"
}

$assets = @()
$totalBytes = 0L
foreach ($file in $assetFiles) {
    $relativePath = Get-RelativeWebPath -Root $resolvedRoot -Path $file.FullName
    $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    $totalBytes += $file.Length
    $assets += [ordered]@{
        url = $relativePath
        bytes = $file.Length
        sha256 = $hash
        contentType = Get-UnityContentType -Path $relativePath
        contentEncoding = Get-UnityContentEncoding -Path $relativePath
        cacheControl = Get-CachePolicy -Path $relativePath
    }
}

$manifest = [ordered]@{
    id = $PackageId
    version = $Version
    engine = 'unity-webgl'
    status = 'official-unity-export'
    officialBuildReady = $true
    placeholder = $false
    sourceUnityScene = 'MaritimeBridgeLMS.unity'
    entrypoint = 'index.html'
    publishedPath = $packageBasePath
    totalBytes = $totalBytes
    generatedAt = (Get-Date).ToUniversalTime().ToString('o')
    cache = [ordered]@{
        immutableAssets = 'public, max-age=31536000, immutable'
        entryAndManifest = 'public, max-age=60, must-revalidate'
    }
    offline = [ordered]@{
        supported = ($totalBytes -le 500MB)
        requiresPersistentStorage = $true
        maxRecommendedBytes = 500MB
    }
    supportedTargets = @('WEB_DESKTOP')
    unsupportedTargets = @('LOW_END_MOBILE', 'IN_APP_BROWSER', 'OLD_IOS_SAFARI')
    requirements = [ordered]@{
        browser = 'Latest Chrome, Edge, or Firefox'
        renderingBackend = 'WebGPU-first Unity 6 build'
        webgpu = $true
        webgl = 'WebGL 2 is still checked by the LMS as a conservative hardware-acceleration signal'
        wasm = $true
        hardwareAcceleration = $true
        minimumRamGb = 8
    }
    assets = $assets
}

if (-not $SkipManifestWrite) {
    $manifestJson = $manifest | ConvertTo-Json -Depth 8
    Set-Content -LiteralPath $manifestPath -Value $manifestJson -Encoding UTF8
    Write-Host "Wrote manifest: $manifestPath"
}

$uploadFiles = Get-ChildItem -LiteralPath $resolvedRoot -File -Recurse | Sort-Object FullName
Write-Host "Package: $PackageId $Version"
Write-Host "R2 bucket: $Bucket"
Write-Host "R2 prefix: $normalizedPrefix"
Write-Host "Public path: $packageBasePath"
Write-Host ("Files: {0}; package bytes: {1:N0}" -f $uploadFiles.Count, $totalBytes)

if (-not $Upload) {
    Write-Host 'Dry run only. Re-run with -Upload after `wrangler whoami` or `npx wrangler whoami` succeeds.'
    foreach ($file in $uploadFiles) {
        $relativePath = Get-RelativeWebPath -Root $resolvedRoot -Path $file.FullName
        $objectKey = "$normalizedPrefix/$PackageId/$Version/$relativePath"
        $remoteFlag = if ($Local) { '' } else { ' --remote' }
        Write-Host "wrangler r2 object put $Bucket/$objectKey --file `"$($file.FullName)`"$remoteFlag"
    }
    exit 0
}

$wrangler = Get-WranglerCommand
Write-Host "Using $($wrangler.DisplayName)"

foreach ($file in $uploadFiles) {
    $relativePath = Get-RelativeWebPath -Root $resolvedRoot -Path $file.FullName
    $objectKey = "$normalizedPrefix/$PackageId/$Version/$relativePath"
    Write-Host "Uploading $objectKey"
    $arguments = @('r2', 'object', 'put', "$Bucket/$objectKey", '--file', "$($file.FullName)")
    if (-not $Local) {
        $arguments += '--remote'
    }
    Invoke-Wrangler -Command $wrangler -Arguments $arguments
    if ($LASTEXITCODE -ne 0) {
        throw "wrangler upload failed for $objectKey"
    }
}

Write-Host "Upload complete: $packageBasePath"
