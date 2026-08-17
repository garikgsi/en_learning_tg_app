import {Capacitor} from '@capacitor/core';
import {readonly, ref} from 'vue';
import {getApiErrorMessage} from '@/api/errors';
import {httpAppUpdateDriver} from '@/api/http/appUpdate';
import type {AppRelease} from '@/api/types/appUpdate';
import {AppUpdate, type InstalledAppVersion} from '@/native/appUpdate';

const availableRelease = ref<AppRelease | null>(null);
const isChecking = ref(false);
const isDownloading = ref(false);
const installationError = ref<string | null>(null);

export const isNewerRelease = (
  release: AppRelease,
  installed: InstalledAppVersion,
): boolean => release.versionCode > installed.versionCode;

const install = async (release: AppRelease): Promise<void> => {
  if (isDownloading.value) {
    return;
  }

  installationError.value = null;
  isDownloading.value = true;

  try {
    await AppUpdate.downloadAndInstall({
      url: release.apkUrl,
      sha256: release.sha256,
      ...(release.size ? {size: release.size} : {}),
    });
  } catch (error) {
    installationError.value = getApiErrorMessage(
      error,
      'Не удалось установить обновление',
    );
  } finally {
    isDownloading.value = false;
  }
};

const check = async (): Promise<AppRelease | null> => {
  if (
    isChecking.value
    || !Capacitor.isNativePlatform()
    || Capacitor.getPlatform() !== 'android'
  ) {
    return null;
  }

  isChecking.value = true;

  try {
    const [release, installed] = await Promise.all([
      httpAppUpdateDriver.getLatest(),
      AppUpdate.getCurrentVersion(),
    ]);

    if (
      !release
      || !isNewerRelease(release, installed)
    ) {
      return null;
    }

    availableRelease.value = release;

    return release;
  } catch {
    // Проверка обновлений не должна мешать входу и offline-синхронизации.
    return null;
  } finally {
    isChecking.value = false;
  }
};

export const useAppUpdate = () => ({
  availableRelease: readonly(availableRelease),
  isChecking: readonly(isChecking),
  isDownloading: readonly(isDownloading),
  installationError: readonly(installationError),
  check,
  install,
});
