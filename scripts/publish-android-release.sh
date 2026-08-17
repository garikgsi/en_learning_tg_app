#!/usr/bin/env bash

set -Eeuo pipefail

usage() {
  cat <<'EOF'
Usage:
  bash scripts/publish-android-release.sh \
    --version-code NUMBER \
    --version-name NAME \
    --description TEXT \
    --commit-message TEXT \
    --branch NAME \
    --remote NAME \
    --github-repository OWNER/REPOSITORY \
    --github-token-env VARIABLE_NAME \
    --java-home PATH \
    --android-sdk-root PATH \
    [--release-name TEXT] \
    [--prerelease true|false] \
    [--mandatory true|false]

The GitHub token is read from the environment variable named by
--github-token-env. The token requires permission to create releases and
upload release assets.
EOF
}

die() {
  printf 'Error: %s\n' "$*" >&2
  exit 1
}

require_value() {
  local option="$1"
  local value="${2:-}"

  [[ -n "$value" && "$value" != --* ]] \
    || die "${option} requires a value"
}

parse_boolean() {
  case "$2" in
    true|false)
      printf '%s' "$2"
      ;;
    *)
      die "$1 must be true or false"
      ;;
  esac
}

version_code=''
version_name=''
description=''
commit_message=''
branch=''
remote=''
github_repository=''
github_token_env=''
java_home=''
android_sdk_root=''
release_name=''
prerelease='true'
mandatory='false'

while (($#)); do
  case "$1" in
    --version-code|--version-name|--description|--commit-message|--branch|--remote|--github-repository|--github-token-env|--java-home|--android-sdk-root|--release-name|--prerelease|--mandatory)
      require_value "$1" "${2:-}"
      option="$1"
      value="$2"
      shift 2

      case "$option" in
        --version-code) version_code="$value" ;;
        --version-name) version_name="$value" ;;
        --description) description="$value" ;;
        --commit-message) commit_message="$value" ;;
        --branch) branch="$value" ;;
        --remote) remote="$value" ;;
        --github-repository) github_repository="$value" ;;
        --github-token-env) github_token_env="$value" ;;
        --java-home) java_home="$value" ;;
        --android-sdk-root) android_sdk_root="$value" ;;
        --release-name) release_name="$value" ;;
        --prerelease) prerelease="$(parse_boolean "$option" "$value")" ;;
        --mandatory) mandatory="$(parse_boolean "$option" "$value")" ;;
      esac
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

[[ "$version_code" =~ ^[1-9][0-9]*$ ]] \
  || die '--version-code must be a positive integer'
[[ "$version_name" =~ ^[0-9]+\.[0-9]+\.[0-9]+[-+._a-zA-Z0-9]*$ ]] \
  || die '--version-name has an invalid format'
[[ -n "$description" ]] || die '--description is required'
[[ -n "$commit_message" ]] || die '--commit-message is required'
[[ -n "$branch" ]] || die '--branch is required'
[[ -n "$remote" ]] || die '--remote is required'
[[ "$github_repository" =~ ^[^/[:space:]]+/[^/[:space:]]+$ ]] \
  || die '--github-repository must use OWNER/REPOSITORY format'
[[ "$github_token_env" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]] \
  || die '--github-token-env must contain a valid environment variable name'
[[ -n "$java_home" ]] || die '--java-home is required'
[[ -n "$android_sdk_root" ]] || die '--android-sdk-root is required'

github_token="${!github_token_env:-}"
[[ -n "$github_token" ]] \
  || die "environment variable ${github_token_env} is empty"

release_name="${release_name:-$version_name}"
tag="v${version_name}"
apk_asset="en-learning-v${version_name}-debug.apk"
rolling_apk='en-learning-debug.apk'
manifest_asset='update-manifest.json'
github_api_url="https://api.github.com/repos/${github_repository}"

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd -- "${script_dir}/.." && pwd)"
build_gradle="${project_dir}/android/app/build.gradle"
built_apk="${project_dir}/android/app/build/outputs/apk/debug/app-debug.apk"

export JAVA_HOME="$java_home"
export ANDROID_HOME="$android_sdk_root"
export ANDROID_SDK_ROOT="$android_sdk_root"

cd "$project_dir"

for command in git node npm npx curl; do
  command -v "$command" >/dev/null 2>&1 \
    || die "required command is unavailable: ${command}"
done

[[ -d "$JAVA_HOME" ]] || die "JAVA_HOME does not exist: ${JAVA_HOME}"
[[ -d "$ANDROID_SDK_ROOT" ]] \
  || die "Android SDK does not exist: ${ANDROID_SDK_ROOT}"
[[ -f "$build_gradle" ]] || die "build.gradle was not found"
[[ -f android/gradlew ]] || die 'Android Gradle wrapper was not found'

current_branch="$(git branch --show-current)"
[[ "$current_branch" == "$branch" ]] \
  || die "current branch is ${current_branch}; expected ${branch}"

git fetch "$remote" "$branch" --tags
git pull --ff-only "$remote" "$branch"

if git show-ref --verify --quiet "refs/tags/${tag}"; then
  die "local tag already exists: ${tag}"
fi

if git ls-remote --exit-code --tags "$remote" "refs/tags/${tag}" >/dev/null 2>&1; then
  die "remote tag already exists: ${tag}"
fi

release_status="$(curl \
  --silent \
  --output /dev/null \
  --write-out '%{http_code}' \
  --header 'Accept: application/vnd.github+json' \
  --header "Authorization: Bearer ${github_token}" \
  --header 'X-GitHub-Api-Version: 2022-11-28' \
  "${github_api_url}/releases/tags/${tag}" || true)"

[[ "$release_status" == '404' ]] \
  || die "GitHub release check returned HTTP ${release_status} for ${tag}"

node --input-type=module - "$build_gradle" "$version_code" "$version_name" <<'NODE'
import {readFile, writeFile} from 'node:fs/promises';

const [file, versionCode, versionName] = process.argv.slice(2);
const source = await readFile(file, 'utf8');
const withVersionCode = source.replace(
  /\bversionCode\s+\d+/,
  `versionCode ${versionCode}`,
);
const updated = withVersionCode.replace(
  /\bversionName\s+"[^"]+"/,
  `versionName "${versionName}"`,
);

if (updated === source) {
  throw new Error('Android version was not changed in build.gradle.');
}

await writeFile(file, updated, 'utf8');
NODE

npm run lint
npm test
npm run build
npx cap sync android

chmod +x android/gradlew
(
  cd android
  ./gradlew assembleDebug
)

[[ -f "$built_apk" ]] || die "built APK was not found: ${built_apk}"

cp -- "$built_apk" "$apk_asset"
cp -- "$built_apk" "$rolling_apk"

manifest_arguments=(
  scripts/create-update-manifest.mjs
  --apk "$apk_asset"
  --output "$manifest_asset"
)

if [[ "$mandatory" == 'true' ]]; then
  manifest_arguments+=(--mandatory)
fi

node "${manifest_arguments[@]}"

node --input-type=module - "$manifest_asset" "$version_code" "$version_name" "$apk_asset" <<'NODE'
import {readFile} from 'node:fs/promises';

const [file, expectedCode, expectedName, expectedApk] = process.argv.slice(2);
const manifest = JSON.parse(await readFile(file, 'utf8'));

if (
  manifest.versionCode !== Number(expectedCode)
  || manifest.versionName !== expectedName
  || manifest.apkAsset !== expectedApk
) {
  throw new Error('Generated update manifest does not match release arguments.');
}
NODE

git add -A
git diff --cached --check

if git diff --cached --quiet; then
  die 'there are no changes to commit'
fi

git commit -m "$commit_message"
git tag -a "$tag" -m "$release_name"
git push "$remote" "$branch"
git push "$remote" "$tag"

release_payload="$(node --input-type=module - "$tag" "$release_name" "$description" "$branch" "$prerelease" <<'NODE'
const [tag, name, body, target, prerelease] = process.argv.slice(2);

process.stdout.write(JSON.stringify({
  tag_name: tag,
  target_commitish: target,
  name,
  body,
  draft: false,
  prerelease: prerelease === 'true',
}));
NODE
)"

release_response="$(curl \
  --fail-with-body \
  --silent \
  --show-error \
  --request POST \
  --header 'Accept: application/vnd.github+json' \
  --header "Authorization: Bearer ${github_token}" \
  --header 'Content-Type: application/json' \
  --header 'X-GitHub-Api-Version: 2022-11-28' \
  --data "$release_payload" \
  "${github_api_url}/releases")"

readarray -t release_data < <(
  node --input-type=module - "$release_response" <<'NODE'
const release = JSON.parse(process.argv[2]);

if (!release.id || !release.html_url) {
  throw new Error('GitHub release response is incomplete.');
}

console.log(release.id);
console.log(release.html_url);
NODE
)

release_id="${release_data[0]}"
release_url="${release_data[1]}"
upload_url="https://uploads.github.com/repos/${github_repository}/releases/${release_id}/assets"

upload_asset() {
  local file="$1"
  local content_type="$2"
  local asset_name

  asset_name="$(basename -- "$file")"
  curl \
    --fail-with-body \
    --silent \
    --show-error \
    --request POST \
    --header 'Accept: application/vnd.github+json' \
    --header "Authorization: Bearer ${github_token}" \
    --header "Content-Type: ${content_type}" \
    --header 'X-GitHub-Api-Version: 2022-11-28' \
    --data-binary "@${file}" \
    "${upload_url}?name=${asset_name}" >/dev/null
}

upload_asset "$apk_asset" 'application/vnd.android.package-archive'
upload_asset "$manifest_asset" 'application/json'

printf 'Release published: %s\n' "$release_url"
printf 'Commit: %s\n' "$(git rev-parse HEAD)"
printf 'Tag: %s\n' "$tag"
