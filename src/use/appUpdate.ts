import {Capacitor} from '@capacitor/core';
import {readonly, ref} from 'vue';
import {getApiErrorMessage} from '@/api/errors';
import {httpAppUpdateDriver} from '@/api/http/appUpdate';
import type {AppRelease} from '@/api/types/appUpdate';
import {AppUpdate, type InstalledAppVersion} from '@/native/appUpdate';
import useMessages from '@/use/messages';

const availableRelease = ref<AppRelease | null>(null);
const isChecking = ref(false);
const isDownloading = ref(false);
const checkedVersionCodes = new Set<number>();
const messageKey = 'app-update';

export const isNewerRelease = (
  release: AppRelease,
  installed: InstalledAppVersion,
): boolean => release.versionCode > installed.versionCode;

const install = async (release: AppRelease): Promise<void> => {
  if (isDownloading.value) {
    return;
  }

  const {addError, addWarning, readMessageByKey} = useMessages();
  isDownloading.value = true;
  addWarning(`Скачивается обновление ${release.versionName}…`, 0, {
    key: messageKey,
  });

  try {
    await AppUpdate.downloadAndInstall({
      url: release.apkUrl,
      sha256: release.sha256,
      ...(release.size ? {size: release.size} : {}),
    });
  } catch (error) {
    addError(getApiErrorMessage(error, 'Не удалось установить обновление'));
  } finally {
    readMessageByKey(messageKey);
    isDownloading.value = false;
  }
};

const check = async (): Promise<void> => {
  if (
    isChecking.value
    || !Capacitor.isNativePlatform()
    || Capacitor.getPlatform() !== 'android'
  ) {
    return;
  }

  const {addWarning} = useMessages();
  isChecking.value = true;

  try {
    const [release, installed] = await Promise.all([
      httpAppUpdateDriver.getLatest(),
      AppUpdate.getCurrentVersion(),
    ]);

    if (
      !release
      || checkedVersionCodes.has(release.versionCode)
      || !isNewerRelease(release, installed)
    ) {
      return;
    }

    checkedVersionCodes.add(release.versionCode);
    availableRelease.value = release;
    const notes = release.releaseNotes
      ? ` ${release.releaseNotes}`
      : '';

    addWarning(
      `Доступна версия ${release.versionName}.${notes}`,
      0,
      {
        key: messageKey,
        action: {
          title: 'Обновить',
          handler: () => install(release),
        },
      },
    );
  } catch {
    // Проверка обновлений не должна мешать входу и offline-синхронизации.
  } finally {
    isChecking.value = false;
  }
};

export const useAppUpdate = () => ({
  availableRelease: readonly(availableRelease),
  isChecking: readonly(isChecking),
  isDownloading: readonly(isDownloading),
  check,
  install,
});
