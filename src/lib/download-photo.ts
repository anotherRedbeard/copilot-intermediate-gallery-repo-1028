import type { Photo } from './mock-photo-data';

type DownloadPhoto = Pick<Photo, 'id' | 'url' | 'title'>;

const imageExtensions = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/gif', 'gif'],
  ['image/avif', 'avif'],
  ['image/svg+xml', 'svg'],
  ['image/bmp', 'bmp'],
  ['image/tiff', 'tiff'],
  ['image/x-icon', 'ico'],
]);

function safeName(value: string): string {
  return value.normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '');
}

export async function downloadPhoto(photo: DownloadPhoto): Promise<void> {
  let response: Response;
  try {
    response = await fetch(photo.url, { mode: 'cors', credentials: 'same-origin' });
  } catch {
    throw new Error('Check your connection and retry. For external images, the source must allow cross-origin downloads (CORS).');
  }

  if (!response.ok) {
    throw new Error(`The image is unavailable (HTTP ${response.status}). Retry or ask the gallery owner to check the source file.`);
  }

  let blob: Blob;
  try {
    blob = await response.blob();
  } catch {
    throw new Error('The image could not be read. Check your connection and retry.');
  }
  const extension = imageExtensions.get(blob.type.toLowerCase().split(';')[0].trim());
  if (!extension || blob.size === 0) {
    throw new Error('The source did not return a supported image. Ask the gallery owner to check the file and its Content-Type, then retry.');
  }

  let objectUrl: string | undefined;
  let link: HTMLAnchorElement | undefined;
  let initiated = false;
  try {
    objectUrl = URL.createObjectURL(blob);
    link = document.createElement('a');
    link.href = objectUrl;
    link.download = `${safeName(photo.title) || 'photo'}-${safeName(photo.id) || 'image'}.${extension}`;
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    initiated = true;
  } catch {
    throw new Error('The browser could not start the download. Please retry in a browser that allows file downloads.');
  } finally {
    link?.remove();
    if (objectUrl) {
      const url = objectUrl;
      // Give the browser time to consume the URL before releasing it.
      if (initiated) setTimeout(() => URL.revokeObjectURL(url), 1000);
      else URL.revokeObjectURL(url);
    }
  }
}
