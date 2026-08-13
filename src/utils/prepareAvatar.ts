const MAX_SOURCE_SIZE = 30 * 1024 * 1024;
const MAX_AVATAR_SIDE = 1920;
const JPEG_QUALITY = 0.85;

const loadImage = (file: File): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  const url = URL.createObjectURL(file);

  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('Не удалось прочитать изображение'));
  };
  image.src = url;
});

export const prepareAvatar = async (source: File): Promise<File> => {
  if (!source.type.startsWith('image/')) {
    throw new Error('Выберите изображение');
  }

  if (source.size > MAX_SOURCE_SIZE) {
    throw new Error('Размер исходного изображения не должен превышать 30 МБ');
  }

  const image = await loadImage(source);
  const scale = Math.min(1, MAX_AVATAR_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement('canvas');

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Не удалось обработать изображение');
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>(resolve => {
    canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY);
  });

  if (!blob) {
    throw new Error('Не удалось обработать изображение');
  }

  const baseName = source.name.replace(/\.[^.]+$/, '') || 'avatar';
  return new File([blob], `${baseName}.jpg`, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });
};
