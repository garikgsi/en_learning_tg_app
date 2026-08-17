import {describe, expect, it} from 'vitest';
import type {AppRelease} from '@/api/types/appUpdate';
import {isNewerRelease} from '@/use/appUpdate';

const release = (versionCode: number): AppRelease => ({
  versionCode,
  versionName: `1.0.${versionCode}`,
  apkUrl: 'https://downloads.example.test/app.apk',
  sha256: 'a'.repeat(64),
  size: 100,
  releasedAt: null,
  releaseNotes: null,
  mandatory: false,
});

describe('app update version comparison', () => {
  it('uses monotonically increasing Android versionCode', () => {
    const installed = {versionCode: 7, versionName: '0.1.0-rc.7'};

    expect(isNewerRelease(release(8), installed)).toBe(true);
    expect(isNewerRelease(release(7), installed)).toBe(false);
    expect(isNewerRelease(release(6), installed)).toBe(false);
  });
});
