param(
    [string]$BaseUrl = "https://holilihu.online",
    [string]$Email = "teacher@maritime.edu",
    [string]$Password = "teacher123",
    [string]$FilePath = "C:\Users\Admin\Downloads\YouTube\Videos\Download_20260317_131144\videothunghiem.mp4",
    [int]$InitialProcessingProbeSeconds = 35,
    [int]$PollIntervalSeconds = 30,
    [int]$ReadyTimeoutMinutes = 35
)

$ErrorActionPreference = "Stop"

function Split-FileChunk {
    param(
        [string]$SourcePath,
        [string]$TargetPath,
        [long]$Offset,
        [long]$Length
    )

    $source = [System.IO.File]::OpenRead($SourcePath)
    try {
        $source.Seek($Offset, [System.IO.SeekOrigin]::Begin) | Out-Null
        $target = [System.IO.File]::Create($TargetPath)
        try {
            $buffer = New-Object byte[] 1048576
            $remaining = $Length
            while ($remaining -gt 0) {
                $chunkSize = [Math]::Min($buffer.Length, [int]$remaining)
                $read = $source.Read($buffer, 0, $chunkSize)
                if ($read -le 0) {
                    break
                }
                $target.Write($buffer, 0, $read)
                $remaining -= $read
            }
        } finally {
            $target.Dispose()
        }
    } finally {
        $source.Dispose()
    }
}

function Invoke-CurlUpload {
    param(
        [string]$UploadUrl,
        [string]$FileToUpload
    )

    $headerFile = Join-Path $env:TEMP ("curl-headers-" + [guid]::NewGuid() + ".txt")
    try {
        $arguments = @(
            "-sS",
            "-D", $headerFile,
            "-o", "NUL",
            "-T", $FileToUpload,
            $UploadUrl
        )
        & curl.exe @arguments
        if ($LASTEXITCODE -ne 0) {
            throw "curl upload failed with exit code $LASTEXITCODE"
        }

        $headerLines = Get-Content $headerFile -ErrorAction SilentlyContinue
        $etagHeader = $headerLines | Where-Object { $_ -match '^ETag:' } | Select-Object -First 1
        if (-not $etagHeader) {
            return $null
        }
        return ($etagHeader -replace '^ETag:\s*', '').Trim()
    } finally {
        Remove-Item $headerFile -Force -ErrorAction SilentlyContinue
    }
}

function Get-CurlStatusLine {
    param(
        [string]$RequestUrl
    )

    $headerFile = Join-Path $env:TEMP ("curl-get-headers-" + [guid]::NewGuid() + ".txt")
    try {
        $arguments = @(
            "-sS",
            "-D", $headerFile,
            "-o", "NUL",
            $RequestUrl
        )
        & curl.exe @arguments
        if ($LASTEXITCODE -ne 0) {
            throw "curl GET failed with exit code $LASTEXITCODE"
        }
        return Get-Content $headerFile | Select-Object -First 1
    } finally {
        Remove-Item $headerFile -Force -ErrorAction SilentlyContinue
    }
}

$fileInfo = Get-Item $FilePath
$loginBody = @{ email = $Email; password = $Password } | ConvertTo-Json
$loginResp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v3/auth/login" -ContentType "application/json" -Body $loginBody
$token = $loginResp.data.accessToken
$headers = @{ Authorization = "Bearer $token" }

$initBody = @{
    contentType = "video/mp4"
    fileSize = $fileInfo.Length
    folder = "videos"
} | ConvertTo-Json

$uploadStart = Get-Date
$initResp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v3/files/upload/init" -Headers $headers -ContentType "application/json" -Body $initBody

if ($initResp.uploadStrategy -eq "MULTIPART") {
    $tempDir = Join-Path $env:TEMP ("lms-video-parts-" + [guid]::NewGuid())
    New-Item -ItemType Directory -Path $tempDir | Out-Null
    try {
        $partSize = [long]$initResp.multipartPartSizeBytes
        $partCount = [int][Math]::Ceiling($fileInfo.Length / [double]$partSize)
        $uploadedParts = @()

        for ($partNumber = 1; $partNumber -le $partCount; $partNumber++) {
            $offset = ($partNumber - 1) * $partSize
            $length = [Math]::Min($partSize, $fileInfo.Length - $offset)
            $partPath = Join-Path $tempDir ("part-$partNumber.bin")
            Split-FileChunk -SourcePath $FilePath -TargetPath $partPath -Offset $offset -Length $length

            $partUrlBody = @{
                storageKey = $initResp.storageKey
                uploadId = $initResp.multipartUploadId
                partNumber = $partNumber
            } | ConvertTo-Json
            $partUrlResp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v3/files/upload/multipart/part-url" -Headers $headers -ContentType "application/json" -Body $partUrlBody
            $etag = Invoke-CurlUpload -UploadUrl $partUrlResp.uploadUrl -FileToUpload $partPath
            if (-not $etag) {
                throw "Missing ETag for part $partNumber"
            }
            $uploadedParts += @{
                partNumber = $partNumber
                eTag = $etag
            }
            Remove-Item $partPath -Force
        }

        $completeBody = @{
            storageKey = $initResp.storageKey
            uploadId = $initResp.multipartUploadId
            parts = $uploadedParts
        } | ConvertTo-Json -Depth 5
        Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v3/files/upload/multipart/complete" -Headers $headers -ContentType "application/json" -Body $completeBody | Out-Null
    } finally {
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
} else {
    Invoke-CurlUpload -UploadUrl $initResp.uploadUrl -FileToUpload $FilePath | Out-Null
}

$uploadMillis = [int]((Get-Date) - $uploadStart).TotalMilliseconds

$confirmBody = @{
    storageKey = $initResp.storageKey
    originalName = $fileInfo.Name
} | ConvertTo-Json
$confirmResp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v3/files/upload/confirm" -Headers $headers -ContentType "application/json" -Body $confirmBody

$assetBody = @{
    attachmentId = $confirmResp.id
    displayName = "One-pass production smoke"
} | ConvertTo-Json
$assetResp = Invoke-RestMethod -Method Post -Uri "$BaseUrl/api/v3/video-assets/from-upload" -Headers $headers -ContentType "application/json" -Body $assetBody
$assetId = $assetResp.data.id

Start-Sleep -Seconds $InitialProcessingProbeSeconds
$processingProbe = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/v3/video-assets/$assetId" -Headers $headers

$deadline = (Get-Date).AddMinutes($ReadyTimeoutMinutes)
$final = $null
while ((Get-Date) -lt $deadline) {
    $current = Invoke-RestMethod -Method Get -Uri "$BaseUrl/api/v3/video-assets/$assetId" -Headers $headers
    if ($current.data.status -eq "READY" -and $current.data.adaptivePackagingStatus -eq "READY") {
        $final = $current
        break
    }
    if ($current.data.status -eq "FAILED" -or $current.data.adaptivePackagingStatus -eq "FAILED") {
        throw ($current | ConvertTo-Json -Depth 8)
    }
    Start-Sleep -Seconds $PollIntervalSeconds
}

if (-not $final) {
    throw "Timed out waiting for asset READY/READY"
}

$playbackUrl = [string]$final.data.playbackUrl
if ($playbackUrl.StartsWith("/")) {
    $playbackUrl = $BaseUrl.TrimEnd("/") + $playbackUrl
}
$manifestStatusLine = Get-CurlStatusLine -RequestUrl $playbackUrl

[pscustomobject]@{
    assetId = $assetId
    uploadMillis = $uploadMillis
    processingProbeStatus = $processingProbe.data.status
    processingProbeAdaptiveStatus = $processingProbe.data.adaptivePackagingStatus
    finalStatus = $final.data.status
    finalAdaptiveStatus = $final.data.adaptivePackagingStatus
    playbackStatusLine = $manifestStatusLine
    offlineProfiles = $final.data.availableOfflineProfiles
} | ConvertTo-Json -Depth 8
