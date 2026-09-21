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

    [string] $ProjectDirectory = 'C:\projects\_\en_learning_tg_app',
    [string] $JavaHome = 'C:\Program Files\Android\Android Studio\jbr',
    [string] $AndroidSdkRoot,
    [ValidatePattern('^[a-zA-Z_][a-zA-Z0-9_]*$')]
    [string] $GitHubTokenEnvironmentVariable = 'GITHUB_TOKEN',
    [switch] $Stable,
    [switch] $Mandatory
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$projectPath = (Resolve-Path -LiteralPath $ProjectDirectory).Path
$publisherPath = Join-Path $projectPath 'scripts\publish-android-release.ps1'
if (-not (Test-Path -LiteralPath $publisherPath -PathType Leaf)) {
    throw "Android release script is missing: ${publisherPath}"
}
if ([string]::IsNullOrWhiteSpace($AndroidSdkRoot)) {
    $AndroidSdkRoot = Join-Path $projectPath '.android-sdk'
}

$releaseEnvironmentNames = @(
    'FRONT_RELEASE_GITHUB_TOKEN', 'JAVA_TOOL_OPTIONS',
    'JAVA_HOME', 'ANDROID_HOME', 'ANDROID_SDK_ROOT'
)
$releaseEnvironmentBefore = @{}
foreach ($releaseEnvironmentName in $releaseEnvironmentNames) {
    $releaseEnvironmentBefore[$releaseEnvironmentName] = [Environment]::GetEnvironmentVariable(
        $releaseEnvironmentName, [EnvironmentVariableTarget]::Process
    )
}

Push-Location $projectPath
try {
    $releaseToken = [Environment]::GetEnvironmentVariable(
        $GitHubTokenEnvironmentVariable, [EnvironmentVariableTarget]::Process
    )
    if ([string]::IsNullOrWhiteSpace($releaseToken)) {
        $releaseCredential = "protocol=https`nhost=github.com`n`n" | git.exe credential fill
        if ($LASTEXITCODE -ne 0) { throw 'Unable to obtain the GitHub release credential' }
        $releasePasswordLine = $releaseCredential | Where-Object { $_.StartsWith('password=') } | Select-Object -First 1
        if (-not $releasePasswordLine) { throw 'GitHub release credential is missing' }
        $releaseToken = $releasePasswordLine.Substring('password='.Length)
    }
    $env:FRONT_RELEASE_GITHUB_TOKEN = $releaseToken

    # Use a full workspace path for JDK sockets instead of Windows short TEMP paths.
    $releaseJvmDirectory = Join-Path $projectPath '.tmp\jvm'
    New-Item -ItemType Directory -Force -Path $releaseJvmDirectory | Out-Null
    $releaseJvmOptions = '-Djava.io.tmpdir="{0}" -Djdk.net.unixdomain.tmpdir="{0}"' -f $releaseJvmDirectory
    $env:JAVA_TOOL_OPTIONS = (@(
        $releaseEnvironmentBefore['JAVA_TOOL_OPTIONS'], $releaseJvmOptions
    ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }) -join ' '

    $releaseArguments = @{
        VersionCode = $VersionCode
        VersionName = $VersionName
        Description = $Description
        CommitMessage = "prepare v${VersionName}"
        Branch = 'master'
        Remote = 'origin'
        GitHubRepository = 'garikgsi/en_learning_tg_app'
        GitHubTokenEnvironmentVariable = 'FRONT_RELEASE_GITHUB_TOKEN'
        JavaHome = $JavaHome
        AndroidSdkRoot = $AndroidSdkRoot
        ReleaseName = "v${VersionName}"
        Prerelease = (-not $Stable.IsPresent).ToString().ToLowerInvariant()
        Mandatory = $Mandatory.IsPresent.ToString().ToLowerInvariant()
    }
    & $publisherPath @releaseArguments
} finally {
    foreach ($releaseEnvironmentName in $releaseEnvironmentNames) {
        if ($null -eq $releaseEnvironmentBefore[$releaseEnvironmentName]) {
            Remove-Item -LiteralPath "Env:${releaseEnvironmentName}" -ErrorAction SilentlyContinue
        } else {
            [Environment]::SetEnvironmentVariable(
                $releaseEnvironmentName, $releaseEnvironmentBefore[$releaseEnvironmentName],
                [EnvironmentVariableTarget]::Process
            )
        }
    }
    $releaseToken = $null
    $releaseCredential = $null
    $releasePasswordLine = $null
    Pop-Location
}
