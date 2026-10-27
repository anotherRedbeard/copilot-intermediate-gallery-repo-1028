'use client';

import { useCallback, useRef, useState } from 'react';
import { DownloadablePhoto, downloadPhoto } from '@/lib/download-photo';

export interface UsePhotoDownloadResult {
  download: (photo: DownloadablePhoto) => Promise<boolean>;
  isDownloading: (photoId: string) => boolean;
  getError: (photoId: string) => string | null;
  clearError: (photoId: string) => void;
}

export function usePhotoDownload(): UsePhotoDownloadResult {
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inFlight = useRef<Set<string>>(new Set());

  const clearError = useCallback((photoId: string) => {
    setErrors(prev => {
      if (!(photoId in prev)) return prev;
      const next = { ...prev };
      delete next[photoId];
      return next;
    });
  }, []);

  const download = useCallback(async (photo: DownloadablePhoto): Promise<boolean> => {
    if (inFlight.current.has(photo.id)) return false;
    inFlight.current.add(photo.id);
    setDownloading(prev => new Set(prev).add(photo.id));
    clearError(photo.id);

    try {
      await downloadPhoto(photo);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed. Please try again.';
      setErrors(prev => ({ ...prev, [photo.id]: message }));
      return false;
    } finally {
      inFlight.current.delete(photo.id);
      setDownloading(prev => {
        const next = new Set(prev);
        next.delete(photo.id);
        return next;
      });
    }
  }, [clearError]);

  const isDownloading = useCallback((photoId: string) => downloading.has(photoId), [downloading]);
  const getError = useCallback((photoId: string) => errors[photoId] ?? null, [errors]);

  return { download, isDownloading, getError, clearError };
}
