import {createHash} from 'node:crypto';
import {readFile, stat, writeFile} from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const projectRoot = path.resolve(import.meta.dirname, '..');
const buildGradlePath = path.join(
  projectRoot,
  'android',
  'app',
  'build.gradle',
);

const readArgument = (name) => {
  const index = process.argv.indexOf(name);

  if (index < 0) {
    return null;
  }

  const value = process.argv[index + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`Argument ${name} requires a value.`);
  }

  return value;
};

const buildGradle = await readFile(buildGradlePath, 'utf8');
const versionCodeMatch = buildGradle.match(/\bversionCode\s+(\d+)/);
const versionNameMatch = buildGradle.match(/\bversionName\s+"([^"]+)"/);

if (!versionCodeMatch || !versionNameMatch) {
  throw new Error('Unable to read Android version from build.gradle.');
}

const versionCode = Number.parseInt(versionCodeMatch[1], 10);
const versionName = versionNameMatch[1];
const defaultAssetName = `en-learning-v${versionName}-debug.apk`;
const apkPath = path.resolve(
  projectRoot,
  readArgument('--apk') ?? defaultAssetName,
);
const outputPath = path.resolve(
  projectRoot,
  readArgument('--output') ?? 'update-manifest.json',
);
const apk = await readFile(apkPath);
const apkStat = await stat(apkPath);
const manifest = {
  schemaVersion: 1,
  versionCode,
  versionName,
  apkAsset: path.basename(apkPath),
  sha256: createHash('sha256').update(apk).digest('hex'),
  size: apkStat.size,
  mandatory: process.argv.includes('--mandatory'),
};

if (manifest.apkAsset !== defaultAssetName) {
  throw new Error(
    `APK asset must be named ${defaultAssetName}, received ${manifest.apkAsset}.`,
  );
}

await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

process.stdout.write(`${outputPath}\n`);
