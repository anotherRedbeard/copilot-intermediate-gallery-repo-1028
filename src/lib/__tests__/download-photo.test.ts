import { buildFilename, downloadPhoto, DownloadError } from '../download-photo';

const photo = { id: '1', url: '/samples/sample-photo.svg', title: 'Sunset Landscape' };

describe('buildFilename', () => {
  it('slugifies the title and uses the MIME type extension', () => {
    expect(buildFilename(photo, 'image/png')).toBe('sunset-landscape.png');
  });

  it('falls back to the URL extension', () => {
    expect(buildFilename(photo)).toBe('sunset-landscape.svg');
  });

  it('strips unsafe characters and falls back to the id', () => {
    expect(buildFilename({ id: '9', url: '/x', title: '../../etc/passwd' })).toBe('etc-passwd.jpg');
    expect(buildFilename({ id: '9', url: '/x', title: '???' })).toBe('photo-9.jpg');
  });
});

describe('downloadPhoto', () => {
  const originalFetch = global.fetch;
  let createObjectURL: jest.Mock;
  let revokeObjectURL: jest.Mock;
  let clickSpy: jest.SpyInstance;

  beforeEach(() => {
    createObjectURL = jest.fn(() => 'blob:mock');
    revokeObjectURL = jest.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    clickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('downloads with a meaningful filename and cleans up', async () => {
    const blob = new Blob(['<svg/>'], { type: 'image/svg+xml' });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => blob, headers: new Headers() });
    let downloadName = '';
    clickSpy.mockImplementation(function (this: HTMLAnchorElement) {
      downloadName = this.download;
      expect(document.body.contains(this)).toBe(true);
    });

    await downloadPhoto(photo);

    expect(global.fetch).toHaveBeenCalledWith(photo.url);
    expect(downloadName).toBe('sunset-landscape.svg');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('rejects on missing url without fetching', async () => {
    global.fetch = jest.fn();
    await expect(downloadPhoto({ ...photo, url: '  ' })).rejects.toThrow(DownloadError);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects on 404 and other HTTP errors', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(downloadPhoto(photo)).rejects.toThrow(/could not be found/);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    await expect(downloadPhoto(photo)).rejects.toThrow(/HTTP 500/);
    expect(clickSpy).not.toHaveBeenCalled();
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  it('rejects on network failure', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(downloadPhoto(photo)).rejects.toThrow(/Network error/);
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('revokes the object URL and removes the anchor even if click throws', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => new Blob(['x'], { type: 'image/png' }), headers: new Headers() });
    clickSpy.mockImplementation(() => { throw new Error('boom'); });
    await expect(downloadPhoto(photo)).rejects.toThrow('boom');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
