import {registerPlugin} from '@capacitor/core';

export type InstalledAppVersion = {
  versionCode: number
  versionName: string
}

export type DownloadAndInstallOptions = {
  url: string
  sha256: string
  size?: number
}

export interface AppUpdatePlugin {
  getCurrentVersion(): Promise<InstalledAppVersion>
  downloadAndInstall(options: DownloadAndInstallOptions): Promise<void>
}

export const AppUpdate = registerPlugin<AppUpdatePlugin>('AppUpdate');
