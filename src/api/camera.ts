import {Camera, CameraDirection} from '@capacitor/camera';
import {Capacitor} from '@capacitor/core';

export const takeCameraPhoto = async (): Promise<File | null> => {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  const photo = await Camera.takePhoto({
    cameraDirection: CameraDirection.Front,
    correctOrientation: true,
    quality: 90,
    saveToGallery: false,
  });
  const photoUrl = photo.webPath
    ?? (photo.uri ? Capacitor.convertFileSrc(photo.uri) : null);

  if (!photoUrl) {
    throw new Error('Не удалось получить фотографию');
  }

  const response = await fetch(photoUrl);

  if (!response.ok) {
    throw new Error('Не удалось прочитать фотографию');
  }

  const blob = await response.blob();
  return new File([blob], 'camera-avatar.jpg', {
    type: blob.type || 'image/jpeg',
    lastModified: Date.now(),
  });
};
