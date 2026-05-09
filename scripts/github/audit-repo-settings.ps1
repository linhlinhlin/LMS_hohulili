param(
    [string]$Repo = "linhlinhlin/LMS_hohulili"
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI (gh) is required."
}

Write-Host "Repository settings: $Repo"
gh repo view $Repo --json `
    nameWithOwner,description,homepageUrl,visibility,defaultBranchRef,repositoryTopics,hasIssuesEnabled,hasProjectsEnabled,hasWikiEnabled,hasDiscussionsEnabled,deleteBranchOnMerge,squashMergeAllowed,mergeCommitAllowed,rebaseMergeAllowed,viewerCanAdminister,viewerPermission,isSecurityPolicyEnabled,usesCustomOpenGraphImage `
    --jq '.'

Write-Host ""
Write-Host "Default branch protection:"
$previousErrorActionPreference = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$protection = gh api "repos/$Repo/branches/main/protection" --jq '.' 2>$null
$protectionExitCode = $LASTEXITCODE
$ErrorActionPreference = $previousErrorActionPreference
if ($protectionExitCode -eq 0) {
    $protection
} else {
    Write-Host "No readable branch protection or current token lacks admin/read-admin permission."
}

Write-Host ""
Write-Host "Open PR summary:"
gh pr list --repo $Repo --state open --limit 50 --json number,title,isDraft,mergeStateStatus,reviewDecision,statusCheckRollup --jq '.'

Write-Host ""
Write-Host "Label count:"
gh label list --repo $Repo --limit 500 --json name --jq 'length'
