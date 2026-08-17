import {Capacitor} from '@capacitor/core';
import {readonly, ref} from 'vue';
import {getApiErrorMessage} from '@/api/errors';
import {httpAppUpdateDriver} from '@/api/http/appUpdate';
import type {AppRelease} from '@/api/types/appUpdate';
import {AppUpdate, type InstalledAppVersion} from '@/native/appUpdate';

const availableRelease = ref<AppRelease | null>(null);
const installedVersion = ref<InstalledAppVersion | null>(null);
const isChecking = ref(false);
const isDownloading = ref(false);
const installationError = ref<string | null>(null);
const checkError = ref<string | null>(null);

export const isNewerRelease = (
  release: AppRelease,
  installed: InstalledAppVersion,
): boolean => release.versionCode > installed.versionCode;

const isNativeAndroid = (): boolean => {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
};

const loadInstalledVersion = async (): Promise<InstalledAppVersion | null> => {
  if (!isNativeAndroid()) {
    return null;
  }

  const version = await AppUpdate.getCurrentVersion();
  installedVersion.value = version;

  return version;
};

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

const check = async (
  options: {forceRefresh?: boolean} = {},
): Promise<AppRelease | null> => {
  if (
    isChecking.value
    || !isNativeAndroid()
  ) {
    return null;
  }

  checkError.value = null;
  isChecking.value = true;

  try {
    const [release, installed] = await Promise.all([
      httpAppUpdateDriver.getLatest(options.forceRefresh),
      loadInstalledVersion(),
    ]);

    if (
      !release
      || !installed
      || !isNewerRelease(release, installed)
    ) {
      availableRelease.value = null;
      return null;
    }

    availableRelease.value = release;

    return release;
  } catch (error) {
    // Проверка обновлений не должна мешать входу и offline-синхронизации.
    checkError.value = getApiErrorMessage(
      error,
      'Не удалось проверить наличие обновлений',
    );
    return null;
  } finally {
    isChecking.value = false;
  }
};

export const useAppUpdate = () => ({
  availableRelease: readonly(availableRelease),
  installedVersion: readonly(installedVersion),
  isChecking: readonly(isChecking),
  isDownloading: readonly(isDownloading),
  installationError: readonly(installationError),
  checkError: readonly(checkError),
  check,
  install,
  loadInstalledVersion,
});
