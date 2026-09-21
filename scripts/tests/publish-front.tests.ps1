$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Assert-PublicationTest {
    param([bool] $Condition, [string] $Message)
    if (-not $Condition) { throw $Message }
}

$projectPath = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$testWorkspaceRoot = Join-Path $projectPath '.tmp'
$testPath = Join-Path $testWorkspaceRoot ('front-publication-test-' + [Guid]::NewGuid().ToString('N'))
$fakeProjectPath = Join-Path $testPath 'project with spaces'
$externalPath = Join-Path $testPath 'external'
$testEnvironmentNames = @(
    'FRONT_PUBLISH_TEST_TOKEN', 'FRONT_PUBLISH_TEST_FAIL', 'FRONT_RELEASE_GITHUB_TOKEN',
    'JAVA_TOOL_OPTIONS', 'JAVA_HOME', 'ANDROID_HOME', 'ANDROID_SDK_ROOT'
)
$testEnvironmentBefore = @{}
foreach ($testEnvironmentName in $testEnvironmentNames) {
    $testEnvironmentBefore[$testEnvironmentName] = [Environment]::GetEnvironmentVariable(
        $testEnvironmentName, [EnvironmentVariableTarget]::Process
    )
}
$testLocationBefore = (Get-Location).Path

try {
    New-Item -ItemType Directory -Force -Path (Join-Path $fakeProjectPath 'scripts'), $externalPath | Out-Null
    Copy-Item -LiteralPath (Join-Path $projectPath 'scripts\publish-front.ps1') -Destination $externalPath
    $fakePublisher = @'
param(
    [int] $VersionCode, [string] $VersionName, [string] $Description,
    [string] $CommitMessage, [string] $Branch, [string] $Remote,
    [string] $GitHubRepository, [string] $GitHubTokenEnvironmentVariable,
    [string] $JavaHome, [string] $AndroidSdkRoot, [string] $ReleaseName,
    [string] $Prerelease, [string] $Mandatory
)
$result = @{
    versionCode = $VersionCode; versionName = $VersionName; description = $Description
    commitMessage = $CommitMessage; branch = $Branch; remote = $Remote
    repository = $GitHubRepository; releaseName = $ReleaseName
    prerelease = $Prerelease; mandatory = $Mandatory; sdk = $AndroidSdkRoot
    tokenMatches = ($env:FRONT_RELEASE_GITHUB_TOKEN -eq 'publication-test-credential')
    jvmOptions = $env:JAVA_TOOL_OPTIONS
    directory = (Get-Location).Path
}
$result | ConvertTo-Json | Set-Content -LiteralPath 'result.json' -Encoding UTF8
$env:JAVA_HOME = 'changed-by-fake-publisher'
$env:ANDROID_HOME = 'changed-by-fake-publisher'
$env:ANDROID_SDK_ROOT = 'changed-by-fake-publisher'
if ($env:FRONT_PUBLISH_TEST_FAIL -eq 'yes') { throw 'publication-test-failure' }
'Fake publication completed'
'@
    $fakePublisher | Set-Content -LiteralPath (Join-Path $fakeProjectPath 'scripts\publish-android-release.ps1') -Encoding UTF8
    $env:FRONT_PUBLISH_TEST_TOKEN = 'publication-test-credential'
    $env:JAVA_TOOL_OPTIONS = '-Dpublication.test=before'
    $publicationArguments = @{
        VersionCode = 17; VersionName = '0.1.0-rc.17'; Description = 'Test release'
        ProjectDirectory = $fakeProjectPath
        GitHubTokenEnvironmentVariable = 'FRONT_PUBLISH_TEST_TOKEN'
    }
    $externalPublisher = Join-Path $externalPath 'publish-front.ps1'

    & $externalPublisher @publicationArguments | Out-Null
    $result = Get-Content -LiteralPath (Join-Path $fakeProjectPath 'result.json') -Raw | ConvertFrom-Json
    Assert-PublicationTest ($result.versionCode -eq 17 -and $result.versionName -eq '0.1.0-rc.17') 'Incorrect release version'
    Assert-PublicationTest ($result.commitMessage -eq 'prepare v0.1.0-rc.17' -and $result.releaseName -eq 'v0.1.0-rc.17') 'Incorrect commit or tag'
    Assert-PublicationTest ($result.branch -eq 'master' -and $result.remote -eq 'origin') 'Incorrect Git settings'
    Assert-PublicationTest ($result.repository -eq 'garikgsi/en_learning_tg_app') 'Incorrect repository'
    Assert-PublicationTest ($result.prerelease -eq 'true' -and $result.mandatory -eq 'false') 'Incorrect default release mode'
    Assert-PublicationTest ($result.tokenMatches -and $result.directory -eq $fakeProjectPath) 'External launcher did not use the selected project and credential'
    Assert-PublicationTest ($result.sdk -eq (Join-Path $fakeProjectPath '.android-sdk')) 'Incorrect SDK default'
    $expectedJvmPath = Join-Path $fakeProjectPath '.tmp\jvm'
    Assert-PublicationTest ($result.jvmOptions.Contains(('-Djava.io.tmpdir="{0}"' -f $expectedJvmPath))) 'Missing quoted JDK temp path'
    Assert-PublicationTest ($env:JAVA_TOOL_OPTIONS -eq '-Dpublication.test=before') 'JVM environment not restored'
    Assert-PublicationTest ((Get-Location).Path -eq $testLocationBefore) 'Current directory not restored'

    & $externalPublisher @publicationArguments -Stable -Mandatory | Out-Null
    $result = Get-Content -LiteralPath (Join-Path $fakeProjectPath 'result.json') -Raw | ConvertFrom-Json
    Assert-PublicationTest ($result.prerelease -eq 'false' -and $result.mandatory -eq 'true') 'Incorrect stable or mandatory mode'

    $env:FRONT_PUBLISH_TEST_FAIL = 'yes'
    $publicationFailed = $false
    try { & $externalPublisher @publicationArguments | Out-Null }
    catch {
        Assert-PublicationTest ($_.Exception.Message -eq 'publication-test-failure') 'Unexpected failure'
        $publicationFailed = $true
    }
    Assert-PublicationTest $publicationFailed 'Publication error did not propagate'
    Assert-PublicationTest ($env:JAVA_TOOL_OPTIONS -eq '-Dpublication.test=before') 'JVM environment not restored after failure'
    foreach ($testEnvironmentName in @('FRONT_RELEASE_GITHUB_TOKEN', 'JAVA_HOME', 'ANDROID_HOME', 'ANDROID_SDK_ROOT')) {
        Assert-PublicationTest ([Environment]::GetEnvironmentVariable($testEnvironmentName, [EnvironmentVariableTarget]::Process) -eq $testEnvironmentBefore[$testEnvironmentName]) "Environment not restored: ${testEnvironmentName}"
    }
    Assert-PublicationTest ((Get-Location).Path -eq $testLocationBefore) 'Current directory not restored after failure'
    'Front publication launcher checks passed: external location, release modes, credentials, environment restoration and failure propagation.'
} finally {
    foreach ($testEnvironmentName in $testEnvironmentNames) {
        if ($null -eq $testEnvironmentBefore[$testEnvironmentName]) {
            Remove-Item -LiteralPath "Env:${testEnvironmentName}" -ErrorAction SilentlyContinue
        } else {
            [Environment]::SetEnvironmentVariable($testEnvironmentName, $testEnvironmentBefore[$testEnvironmentName], [EnvironmentVariableTarget]::Process)
        }
    }
    $resolvedTestPath = [IO.Path]::GetFullPath($testPath)
    $resolvedTestRoot = [IO.Path]::GetFullPath($testWorkspaceRoot).TrimEnd('\') + '\'
    if (-not $resolvedTestPath.StartsWith($resolvedTestRoot, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Test cleanup path is outside the workspace temporary directory'
    }
    if (Test-Path -LiteralPath $resolvedTestPath) { Remove-Item -LiteralPath $resolvedTestPath -Recurse -Force }
}
