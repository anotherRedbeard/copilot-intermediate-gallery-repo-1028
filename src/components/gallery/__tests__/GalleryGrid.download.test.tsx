import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GalleryGrid } from '../GalleryGrid';
import { mockPhotos } from '@/lib/mock-photo-data';

jest.mock('framer-motion', () => {
  return {
    motion: new Proxy({}, {
      get: (_t, tag: string) =>
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        ({ initial, animate, transition, ...rest }: Record<string, unknown>) => React.createElement(tag, rest),
    }),
  };
});

const first = mockPhotos[0];
const second = mockPhotos[1];

function okResponse() {
  return { ok: true, status: 200, blob: async () => new Blob(['x'], { type: 'image/svg+xml' }), headers: new Headers() };
}

describe('GalleryGrid download', () => {
  const originalFetch = global.fetch;
  let revokeObjectURL: jest.Mock;

  beforeEach(() => {
    revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL: jest.fn(() => 'blob:mock'), revokeObjectURL });
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('has an accessible download button that downloads the photo', async () => {
    global.fetch = jest.fn().mockResolvedValue(okResponse());
    render(<GalleryGrid />);
    await userEvent.click(screen.getByRole('button', { name: `Download ${first.title}` }));
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalled());
    expect(global.fetch).toHaveBeenCalledWith(first.url);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows loading state per photo and ignores duplicate clicks', async () => {
    let resolve!: (v: unknown) => void;
    global.fetch = jest.fn().mockReturnValue(new Promise(r => { resolve = r; }));
    render(<GalleryGrid />);
    const button = screen.getByRole('button', { name: `Download ${first.title}` });
    await userEvent.click(button);

    const busy = screen.getByRole('button', { name: `Downloading ${first.title}` });
    expect(busy).toBeDisabled();
    expect(screen.getByRole('button', { name: `Download ${second.title}` })).toBeEnabled();
    await userEvent.click(busy);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    resolve(okResponse());
    await waitFor(() => expect(screen.getByRole('button', { name: `Download ${first.title}` })).toBeEnabled());
  });

  it('announces failures, clears loading, and allows retry', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 404 }).mockResolvedValueOnce(okResponse());
    render(<GalleryGrid />);
    await userEvent.click(screen.getByRole('button', { name: `Download ${first.title}` }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not be found/);
    const retry = screen.getByRole('button', { name: `Retry download of ${first.title}` });
    expect(retry).toBeEnabled();

    await userEvent.click(retry);
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('reports network failures', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('offline'));
    render(<GalleryGrid />);
    await userEvent.click(screen.getByRole('button', { name: `Download ${first.title}` }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Network error/);
  });
});
