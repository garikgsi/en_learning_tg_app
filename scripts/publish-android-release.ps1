[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateRange(1, 2147483647)]
    [int] $VersionCode,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9]+\.[0-9]+\.[0-9]+[-+._a-zA-Z0-9]*$')]
    [string] $VersionName,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $Description,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $CommitMessage,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $Branch,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $Remote,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[^/\s]+/[^/\s]+$')]
    [string] $GitHubRepository,

    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-zA-Z_][a-zA-Z0-9_]*$')]
    [string] $GitHubTokenEnvironmentVariable,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $JavaHome,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $AndroidSdkRoot,

    [Parameter(Mandatory = $true)]
    [ValidateNotNullOrEmpty()]
    [string] $ReleaseName,

    [Parameter(Mandatory = $true)]
    [ValidateSet('true', 'false')]
    [string] $Prerelease,

    [Parameter(Mandatory = $true)]
    [ValidateSet('true', 'false')]
    [string] $Mandatory
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-ExternalCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string] $FilePath,

        [Parameter()]
        [string[]] $Arguments = @()
    )

    & $FilePath @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: ${FilePath} $($Arguments -join ' ')"
    }
}

function Invoke-ExternalCapture {
    param(
        [Parameter(Mandatory = $true)]
        [string] $FilePath,

        [Parameter()]
        [string[]] $Arguments = @()
    )

    $commandOutput = & $FilePath @Arguments

    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code ${LASTEXITCODE}: ${FilePath} $($Arguments -join ' ')"
    }

    return ($commandOutput -join "`n").Trim()
}

function Test-LocalTagExists {
    param([string] $Tag)

    & git.exe show-ref --verify --quiet "refs/tags/${Tag}"
    $exitCode = $LASTEXITCODE

    if ($exitCode -notin @(0, 1)) {
        throw "Unable to check local tag ${Tag}"
    }

    return $exitCode -eq 0
}

function Test-RemoteTagExists {
    param(
        [string] $RemoteName,
        [string] $Tag
    )

    & git.exe ls-remote --exit-code --tags $RemoteName "refs/tags/${Tag}" *> $null
    $exitCode = $LASTEXITCODE

    if ($exitCode -notin @(0, 2)) {
        throw "Unable to check remote tag ${Tag}"
    }

    return $exitCode -eq 0
}

function Publish-GitHubAsset {
    param(
        [string] $UploadUrl,
        [hashtable] $Headers,
        [string] $File,
        [string] $ContentType
    )

    $resolvedFile = (Resolve-Path -LiteralPath $File).Path
    $assetName = [Uri]::EscapeDataString([IO.Path]::GetFileName($resolvedFile))

    Invoke-RestMethod `
        -Method Post `
        -Uri "${UploadUrl}?name=${assetName}" `
        -Headers $Headers `
        -ContentType $ContentType `
        -InFile $resolvedFile | Out-Null
}

$requiredCommands = @(
    'git.exe',
    'node.exe',
    'npm.cmd',
    'npx.cmd',
    'curl.exe'
)

foreach ($requiredCommand in $requiredCommands) {
    if (-not (Get-Command $requiredCommand -ErrorAction SilentlyContinue)) {
        throw "Required command is unavailable: ${requiredCommand}"
    }
}

$gitHubToken = [Environment]::GetEnvironmentVariable(
    $GitHubTokenEnvironmentVariable,
    [EnvironmentVariableTarget]::Process
)

if ([string]::IsNullOrWhiteSpace($gitHubToken)) {
    throw "Environment variable ${GitHubTokenEnvironmentVariable} is empty"
}

if (-not (Test-Path -LiteralPath $JavaHome -PathType Container)) {
    throw "JAVA_HOME does not exist: ${JavaHome}"
}

if (-not (Test-Path -LiteralPath $AndroidSdkRoot -PathType Container)) {
    throw "Android SDK does not exist: ${AndroidSdkRoot}"
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectDirectory = Split-Path -Parent $scriptDirectory
$buildGradle = Join-Path $projectDirectory 'android\app\build.gradle'
$builtApk = Join-Path $projectDirectory 'android\app\build\outputs\apk\debug\app-debug.apk'
$tag = "v${VersionName}"
$apkAsset = "en-learning-v${VersionName}-debug.apk"
$rollingApk = 'en-learning-debug.apk'
$manifestAsset = 'update-manifest.json'
$gitHubApiUrl = "https://api.github.com/repos/${GitHubRepository}"
$isPrerelease = $Prerelease -eq 'true'
$isMandatory = $Mandatory -eq 'true'

$env:JAVA_HOME = $JavaHome
$env:ANDROID_HOME = $AndroidSdkRoot
$env:ANDROID_SDK_ROOT = $AndroidSdkRoot

Push-Location $projectDirectory

try {
    $currentBranch = Invoke-ExternalCapture git.exe @(
        'branch',
        '--show-current'
    )

    if ($currentBranch -ne $Branch) {
        throw "Current branch is ${currentBranch}; expected ${Branch}"
    }

    Invoke-ExternalCommand git.exe @('fetch', $Remote, $Branch, '--tags')
    Invoke-ExternalCommand git.exe @('pull', '--ff-only', $Remote, $Branch)

    if (Test-LocalTagExists $tag) {
        throw "Local tag already exists: ${tag}"
    }

    if (Test-RemoteTagExists $Remote $tag) {
        throw "Remote tag already exists: ${tag}"
    }

    $releaseStatus = & curl.exe `
        --silent `
        --output NUL `
        --write-out '%{http_code}' `
        --header 'Accept: application/vnd.github+json' `
        --header "Authorization: Bearer ${gitHubToken}" `
        --header 'X-GitHub-Api-Version: 2022-11-28' `
        "${gitHubApiUrl}/releases/tags/${tag}"

    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to check whether the GitHub Release exists'
    }

    if ($releaseStatus -ne '404') {
        throw "GitHub release check returned HTTP ${releaseStatus} for ${tag}"
    }

    $gradleSource = [IO.File]::ReadAllText($buildGradle)
    $updatedGradle = [regex]::Replace(
        $gradleSource,
        '\bversionCode\s+\d+',
        "versionCode ${VersionCode}",
        1
    )
    $updatedGradle = [regex]::Replace(
        $updatedGradle,
        '\bversionName\s+"[^"]+"',
        "versionName `"${VersionName}`"",
        1
    )

    if ($updatedGradle -eq $gradleSource) {
        throw 'Android version was not changed in build.gradle'
    }

    [IO.File]::WriteAllText(
        $buildGradle,
        $updatedGradle,
        [Text.UTF8Encoding]::new($false)
    )

    Invoke-ExternalCommand npm.cmd @('run', 'lint')
    Invoke-ExternalCommand npm.cmd @('test')
    Invoke-ExternalCommand npm.cmd @('run', 'build')
    Invoke-ExternalCommand npx.cmd @('cap', 'sync', 'android')

    Push-Location (Join-Path $projectDirectory 'android')
    try {
        Invoke-ExternalCommand '.\gradlew.bat' @('assembleDebug')
    } finally {
        Pop-Location
    }

    if (-not (Test-Path -LiteralPath $builtApk -PathType Leaf)) {
        throw "Built APK was not found: ${builtApk}"
    }

    Copy-Item -LiteralPath $builtApk -Destination $apkAsset -Force
    Copy-Item -LiteralPath $builtApk -Destination $rollingApk -Force

    $manifestArguments = @(
        'scripts/create-update-manifest.mjs',
        '--apk',
        $apkAsset,
        '--output',
        $manifestAsset
    )

    if ($isMandatory) {
        $manifestArguments += '--mandatory'
    }

    Invoke-ExternalCommand node.exe $manifestArguments

    $manifest = Get-Content -LiteralPath $manifestAsset -Raw -Encoding UTF8 `
        | ConvertFrom-Json

    if (
        $manifest.versionCode -ne $VersionCode `
        -or $manifest.versionName -ne $VersionName `
        -or $manifest.apkAsset -ne $apkAsset
    ) {
        throw 'Generated update manifest does not match release parameters'
    }

    Invoke-ExternalCommand git.exe @('add', '-A')
    Invoke-ExternalCommand git.exe @('diff', '--cached', '--check')

    & git.exe diff --cached --quiet
    $diffExitCode = $LASTEXITCODE

    if ($diffExitCode -eq 0) {
        throw 'There are no changes to commit'
    }

    if ($diffExitCode -ne 1) {
        throw 'Unable to inspect staged changes'
    }

    Invoke-ExternalCommand git.exe @('commit', '-m', $CommitMessage)
    Invoke-ExternalCommand git.exe @('tag', '-a', $tag, '-m', $ReleaseName)
    Invoke-ExternalCommand git.exe @('push', $Remote, $Branch)
    Invoke-ExternalCommand git.exe @('push', $Remote, $tag)

    $headers = @{
        Authorization = "Bearer ${gitHubToken}"
        Accept = 'application/vnd.github+json'
        'X-GitHub-Api-Version' = '2022-11-28'
    }
    $releasePayload = @{
        tag_name = $tag
        target_commitish = $Branch
        name = $ReleaseName
        body = $Description
        draft = $false
        prerelease = $isPrerelease
    } | ConvertTo-Json
    $release = Invoke-RestMethod `
        -Method Post `
        -Uri "${gitHubApiUrl}/releases" `
        -Headers $headers `
        -ContentType 'application/json; charset=utf-8' `
        -Body ([Text.Encoding]::UTF8.GetBytes($releasePayload))

    if (-not $release.id -or -not $release.html_url) {
        throw 'GitHub release response is incomplete'
    }

    $uploadUrl = "https://uploads.github.com/repos/${GitHubRepository}/releases/$($release.id)/assets"
    Publish-GitHubAsset `
        -UploadUrl $uploadUrl `
        -Headers $headers `
        -File $apkAsset `
        -ContentType 'application/vnd.android.package-archive'
    Publish-GitHubAsset `
        -UploadUrl $uploadUrl `
        -Headers $headers `
        -File $manifestAsset `
        -ContentType 'application/json'

    Write-Output "Release published: $($release.html_url)"
    Write-Output "Commit: $(Invoke-ExternalCapture git.exe @('rev-parse', 'HEAD'))"
    Write-Output "Tag: ${tag}"
} finally {
    Pop-Location
}
