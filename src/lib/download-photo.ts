export class DownloadError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'DownloadError';
    this.status = status;
  }
}

export interface DownloadablePhoto {
  id: string;
  url: string;
  title: string;
}

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};

export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extensionFromUrl(url: string): string | null {
  const path = url.split(/[?#]/)[0];
  const match = /\.([a-zA-Z0-9]{2,5})$/.exec(path);
  return match ? match[1].toLowerCase() : null;
}

export function buildFilename(photo: DownloadablePhoto, mimeType?: string): string {
  const base = slugify(photo.title) || `photo-${slugify(photo.id) || 'download'}`;
  const mime = mimeType?.split(';')[0].trim().toLowerCase();
  const extension = (mime && EXTENSION_BY_MIME[mime]) || extensionFromUrl(photo.url) || 'jpg';
  return `${base}.${extension}`;
}

export async function downloadPhoto(photo: DownloadablePhoto): Promise<void> {
  if (!photo.url || !photo.url.trim()) {
    throw new DownloadError('This photo has no downloadable file.');
  }

  let response: Response;
  try {
    response = await fetch(photo.url);
  } catch {
    throw new DownloadError('Network error. Check your connection and try again.');
  }

  if (!response.ok) {
    throw new DownloadError(
      response.status === 404
        ? 'The photo file could not be found.'
        : `Download failed (HTTP ${response.status}).`,
      response.status
    );
  }

  let blob: Blob;
  try {
    blob = await response.blob();
  } catch {
    throw new DownloadError('Network error while reading the photo. Please try again.');
  }

  if (blob.size === 0) {
    throw new DownloadError('The photo file is empty.');
  }

  const filename = buildFilename(photo, blob.type || response.headers.get('content-type') || undefined);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    if (anchor.parentNode) {
      anchor.parentNode.removeChild(anchor);
    }
    URL.revokeObjectURL(objectUrl);
  }
}
