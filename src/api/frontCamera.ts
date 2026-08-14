import {Capacitor, registerPlugin} from '@capacitor/core';

type FrontCameraPlugin = {
  takePhoto(): Promise<{path: string}>
}

const frontCamera = registerPlugin<FrontCameraPlugin>('FrontCamera');

export const takeFrontCameraPhoto = async (): Promise<File | null> => {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  const {path} = await frontCamera.takePhoto();
  const response = await fetch(Capacitor.convertFileSrc(path));

  if (!response.ok) {
    throw new Error('Не удалось прочитать фотографию');
  }

  const blob = await response.blob();
  return new File([blob], 'camera-avatar.jpg', {
    type: blob.type || 'image/jpeg',
    lastModified: Date.now(),
  });
};
