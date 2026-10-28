'use client';

import { useId, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import type { Photo } from '@/lib/mock-photo-data';
import { downloadPhoto } from '@/lib/download-photo';

interface PhotoDownloadButtonProps {
  photo: Pick<Photo, 'id' | 'url' | 'title'>;
}

export function PhotoDownloadButton({ photo }: PhotoDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const errorId = useId();

  const handleDownload = async () => {
    if (pending.current) return;
    pending.current = true;
    setIsDownloading(true);
    setError(null);
    try {
      await downloadPhoto(photo);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Download could not start. Please retry.');
    } finally {
      pending.current = false;
      setIsDownloading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        aria-label={`${isDownloading ? 'Downloading' : error ? 'Retry download for' : 'Download'} ${photo.title}`}
        aria-busy={isDownloading}
        aria-describedby={error ? errorId : undefined}
        className="p-3 rounded-full bg-white/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 backdrop-blur-sm transition-colors disabled:opacity-60 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {isDownloading
          ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          : <Download className="h-5 w-5" aria-hidden="true" />}
      </button>
      <span role="status" className="sr-only">
        {isDownloading ? `Preparing download for ${photo.title}` : ''}
      </span>
      {error && (
        <div
          id={errorId}
          role="alert"
          className="absolute top-full right-0 z-10 mt-2 w-64 max-w-[75vw] rounded-lg bg-white dark:bg-slate-800 p-3 text-sm text-red-700 dark:text-red-300 shadow-lg"
        >
          Download for {photo.title} could not start. {error}{' '}
          <button type="button" onClick={handleDownload} className="font-semibold underline rounded focus-visible:outline-2 focus-visible:outline-blue-600">
            Retry download
          </button>
        </div>
      )}
    </>
  );
}
